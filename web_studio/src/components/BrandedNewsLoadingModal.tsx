import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  ListOrdered,
  Layout,
  CheckCircle2,
} from 'lucide-react';

export type BrandedLoaderMode = 'ai_generation' | 'graphic_preparation' | 'approved_presentation';

export interface BrandedNewsLoadingModalProps {
  isOpen: boolean;
  mode?: BrandedLoaderMode;
  title?: string;
  durationSeconds?: number;
  subtitles?: string[];
  subtitleIntervalMs?: number;
  onComplete?: () => void;
  onCancel?: () => void;
  error?: string | null;
  onRetry?: () => void;
}

// 4 distinct journalistic Hindi subtitles rotating every ~5 seconds per requirements
export const BRANDED_LOADER_SUBTITLES: string[] = [
  'पत्रकारिता मानकों के अनुसार निष्पक्ष तथ्यों की पुष्टि...',
  'समाचार के मुख्य तथ्य और संदर्भ व्यवस्थित किए जा रहे हैं...',
  'संतुलित हेडलाइन और उपयोगी कैप्शन तैयार किए जा रहे हैं...',
  'ग्राफिक लेआउट और फोटो की मैपिंग को अंतिम रूप दिया जा रहा है...',
];

// 4-step newsroom activity stages
const NEWSROOM_STAGES = [
  { id: 1, label: 'ड्राफ्ट समीक्षा', detail: 'संपादक द्वारा समीक्षा', icon: FileText },
  { id: 2, label: '5 हेडलाइन्स', detail: 'संतुलित विकल्प चयन', icon: ListOrdered },
  { id: 3, label: 'लेआउट मैपिंग', detail: 'फोटो व ब्रांडिंग व्यवस्था', icon: Layout },
  { id: 4, label: 'न्यूज़ कार्ड', detail: 'प्रकाशन-योग्य अंतिम कार्ड', icon: CheckCircle2 },
];

export const BrandedNewsLoadingModal: React.FC<BrandedNewsLoadingModalProps> = ({
  isOpen,
  mode = 'graphic_preparation',
  title,
  durationSeconds,
  subtitles = BRANDED_LOADER_SUBTITLES,
  subtitleIntervalMs = 5000,
  onComplete,
  onCancel,
  error = null,
  onRetry,
}) => {
  const [subtitleIndex, setSubtitleIndex] = useState<number>(0);
  const [isSubtitleFading, setIsSubtitleFading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const completeFiredRef = useRef<boolean>(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Subtitle rotation approximately every 5 seconds (5000ms) with smooth fade transition
  useEffect(() => {
    if (!isOpen || error) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSubtitleIndex(0);
      setIsSubtitleFading(false);
      return;
    }

    setSubtitleIndex(0);
    setIsSubtitleFading(false);

    timerRef.current = setInterval(() => {
      if (prefersReducedMotion) {
        setSubtitleIndex((prev) => (prev + 1) % subtitles.length);
      } else {
        setIsSubtitleFading(true);
        setTimeout(() => {
          setSubtitleIndex((prev) => (prev + 1) % subtitles.length);
          setIsSubtitleFading(false);
        }, 250);
      }
    }, subtitleIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, error, subtitles, subtitleIntervalMs, prefersReducedMotion]);

  // Duration countdown for fixed presentation intervals (e.g. 10-second approved news presentation)
  useEffect(() => {
    if (!isOpen || error || !durationSeconds || durationSeconds <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setElapsedSeconds(0);
      completeFiredRef.current = false;
      return;
    }

    setElapsedSeconds(0);
    completeFiredRef.current = false;

    countdownRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = +(prev + 0.2).toFixed(2);
        if (next >= durationSeconds && !completeFiredRef.current) {
          completeFiredRef.current = true;
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (onComplete) {
            setTimeout(() => {
              onComplete();
            }, 60);
          }
          return durationSeconds;
        }
        return Math.min(durationSeconds, next);
      });
    }, 200);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, error, durationSeconds, onComplete]);

  if (!isOpen) return null;

  // Operation-Specific Main Loading Message:
  // For actual AI headline generation: “अभी खबर जनरेट हो रही है, कृपया प्रतीक्षा करें...”
  // For pre-approved editorial presentation: “संपादकीय डेस्क आपकी स्वीकृत हेडलाइन और कैप्शन को ग्राफिक के लिए तैयार कर रहा है...”
  // For graphic preparation: “ग्राफिक लेआउट और फोटो की मैपिंग को अंतिम रूप दिया जा रहा है...”
  const defaultTitle =
    mode === 'ai_generation'
      ? 'अभी खबर जनरेट हो रही है, कृपया प्रतीक्षा करें...'
      : mode === 'approved_presentation'
      ? 'संपादकीय डेस्क आपकी स्वीकृत हेडलाइन और कैप्शन को ग्राफिक के लिए तैयार कर रहा है...'
      : 'ग्राफिक लेआउट और फोटो की मैपिंग को अंतिम रूप दिया जा रहा है...';

  const displayTitle = title || defaultTitle;
  const currentSubtitle = subtitles[subtitleIndex] || subtitles[0];

  // Calculated progress for presentation timer or indeterminate animation
  const progressPercent = durationSeconds && durationSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100))
    : null;

  // Determine current active newsroom step (0 to 3) based on elapsed time or loop
  const activeStepIndex = durationSeconds && durationSeconds > 0
    ? Math.min(3, Math.floor((elapsedSeconds / durationSeconds) * 4))
    : Math.floor((Date.now() / 2500) % 4);

  const CurrentStageIcon = NEWSROOM_STAGES[activeStepIndex]?.icon || FileText;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branded-loading-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/25 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Subtle decorative gold top glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />

        {/* Optional top close / cancel button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="रद्द करें"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Authentic AI NEWS MAKER Brand Logo & Editorial Desk Badge */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-900 border border-amber-500/60 p-2 shadow-lg flex items-center justify-center overflow-hidden">
            <img
              src="/assets/ai_news_maker_logo.png"
              alt="AI News Maker Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase drop-shadow-sm">
              AI NEWS MAKER
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {mode === 'ai_generation' ? '🤖 AI जनरेशन इंजन' : '✍️ संपादकीय न्यूज़रूम डेस्क'}
            </span>
          </div>
        </div>

        {/* 4-Step Newsroom Process Animation Area per Section 2.4 */}
        <div className="relative py-2 px-1">
          {/* Central Newsroom Activity Graphic */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center mb-3">
            {/* Subtle outer pulse */}
            <div className={`absolute inset-0 rounded-full border-2 border-amber-500/20 ${prefersReducedMotion ? '' : 'animate-ping'} opacity-30 pointer-events-none`} />

            {/* Rotating golden circle */}
            <div className={`absolute inset-1 rounded-full border-2 border-amber-500/30 border-t-amber-400 border-r-amber-500 ${prefersReducedMotion ? '' : 'animate-spin'}`} />

            {/* Upper-right sparkle */}
            <div className="absolute -top-1 -right-1 p-1 bg-amber-500/20 rounded-full border border-amber-400/40">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>

            {/* Dynamic Center Stage Icon */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shadow-inner text-amber-400 transition-all duration-300">
              <CurrentStageIcon className="w-6 h-6 animate-in zoom-in-75 duration-200" />
            </div>
          </div>

          {/* 4 Newsroom Activity Steps Tracker */}
          <div className="grid grid-cols-4 gap-1.5 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800">
            {NEWSROOM_STAGES.map((stg, idx) => {
              const isActive = idx === activeStepIndex;
              const isPassed = idx < activeStepIndex;
              const IconComp = stg.icon;
              return (
                <div
                  key={stg.id}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all duration-300 ${
                    isActive
                      ? 'bg-amber-500/20 border border-amber-500/60 shadow-sm text-amber-300'
                      : isPassed
                      ? 'bg-neutral-800/60 border border-neutral-700/60 text-emerald-400'
                      : 'bg-transparent text-neutral-500'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 mb-1 ${isActive ? 'text-amber-400 scale-110' : isPassed ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <span className={`text-[10px] font-black leading-tight truncate w-full ${isActive ? 'text-amber-300' : isPassed ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {stg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error state alert if an error occurred */}
        {error ? (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs sm:text-sm space-y-3 shadow-lg">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>प्रक्रिया पूरी नहीं हो सकी</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>पुनः प्रयास करें</span>
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  बंद करें
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Main prominent message in white Hindi typography */}
            <div className="space-y-2 px-2">
              <h2
                id="branded-loading-title"
                className="text-base sm:text-lg font-black text-white leading-snug font-['Noto_Sans_Devanagari'] drop-shadow-sm"
              >
                {displayTitle}
              </h2>

              {/* Rotating yellow subtitle changing every ~5 seconds with smooth fade transition */}
              <p
                className={`text-xs sm:text-sm font-semibold text-amber-300 leading-relaxed font-['Noto_Sans_Devanagari'] min-h-[42px] flex items-center justify-center px-1 transition-opacity duration-300 ${
                  isSubtitleFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
                }`}
              >
                {currentSubtitle}
              </p>
            </div>

            {/* Smooth animated progress bar */}
            <div className="space-y-1.5 px-3">
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/80">
                {progressPercent !== null ? (
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-200 rounded-full shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                ) : (
                  <div className="h-full w-2/5 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full animate-pulse transition-all duration-300" />
                )}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-neutral-400">
                <span className="text-amber-400">
                  {mode === 'approved_presentation' ? 'स्वीकृत सामग्री प्रस्तुतीकरण...' : 'तैयारी जारी है...'}
                </span>
                {progressPercent !== null && (
                  <span className="text-amber-300 font-mono">
                    {Math.floor(elapsedSeconds)}s / {durationSeconds}s
                  </span>
                )}
              </div>
            </div>

            {/* Brand supporting line at bottom */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {mode === 'ai_generation'
                  ? '⚡ AI कुछ ही क्षणों में 5 संतुलित हेडलाइन विकल्प व सोशल मीडिया कैप्शन प्रस्तुत करेगा'
                  : '⚡ पत्रकारिता मानकों के अनुसार सटीक लेआउट तैयार किया जा रहा है'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

