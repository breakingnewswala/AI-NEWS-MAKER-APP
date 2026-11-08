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
  Film,
  Search,
  Layers,
} from 'lucide-react';

export type BrandedLoaderMode = 'ai_generation' | 'graphic_preparation' | 'approved_presentation' | 'video_render';

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

// 6-step video newsroom activity stages (Part 10)
const VIDEO_NEWSROOM_STAGES = [
  { id: 1, label: 'वीडियो स्रोत जाँच', detail: 'वीडियो लिंक व मीडिया विश्लेषण', icon: Film },
  { id: 2, label: 'कंटेंट विश्लेषण', detail: 'AI द्वारा मुख्य तथ्यों की पहचान', icon: Search },
  { id: 3, label: 'न्यूज़ हेडलाइंस', detail: '5 संतुलित विकल्प तैयार हो रहे हैं', icon: ListOrdered },
  { id: 4, label: 'कट व सेगमेंट मैपिंग', detail: 'टाइमलाइन व कट का निर्धारण', icon: Layers },
  { id: 5, label: 'कार्ड लेआउट', detail: 'ओवरले, रिबन व ब्रांडिंग सेटिंग', icon: Layout },
  { id: 6, label: 'वीडियो स्टूडियो', detail: 'अंतिम स्टूडियो लोड हो रहा है', icon: CheckCircle2 },
];

export const HOME_CARD_GRAPHIC_SUBTITLES: string[] = [
  'चुनी गई खबर के तथ्यों के आधार पर हेडलाइन, कैप्शन और ग्राफिक सामग्री तैयार की जा रही है।',
  'पत्रकारिता मानकों के अनुसार निष्पक्ष तथ्यों की पुष्टि...',
  'संतुलित हेडलाइन और उपयोगी कैप्शन तैयार किए जा रहे हैं...',
  'ग्राफिक लेआउट और फोटो की मैपिंग को अंतिम रूप दिया जा रहा है...',
];

export const BrandedNewsLoadingModal: React.FC<BrandedNewsLoadingModalProps> = ({
  isOpen,
  mode = 'graphic_preparation',
  title,
  durationSeconds,
  subtitles,
  subtitleIntervalMs = 5000,
  onComplete,
  onCancel,
  error = null,
  onRetry,
}) => {
  const effectiveSubtitles =
    subtitles && subtitles.length > 0
      ? subtitles
      : mode === 'graphic_preparation' || mode === 'approved_presentation'
      ? HOME_CARD_GRAPHIC_SUBTITLES
      : BRANDED_LOADER_SUBTITLES;

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
        setSubtitleIndex((prev) => (prev + 1) % effectiveSubtitles.length);
      } else {
        setIsSubtitleFading(true);
        setTimeout(() => {
          setSubtitleIndex((prev) => (prev + 1) % effectiveSubtitles.length);
          setIsSubtitleFading(false);
        }, 250);
      }
    }, subtitleIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, error, effectiveSubtitles, subtitleIntervalMs, prefersReducedMotion]);

  // Duration countdown for fixed presentation intervals or dynamic elapsed time tracking
  useEffect(() => {
    if (!isOpen || error) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setElapsedSeconds(0);
      completeFiredRef.current = false;
      return;
    }

    setElapsedSeconds(0);
    completeFiredRef.current = false;

    if (durationSeconds && durationSeconds > 0) {
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
            } else if (onCancel) {
              setTimeout(() => {
                onCancel();
              }, 60);
            }
            return durationSeconds;
          }
          return Math.min(durationSeconds, next);
        });
      }, 200);
    } else {
      // Dynamic AI generation - track elapsed seconds continuously
      countdownRef.current = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.5).toFixed(1));
      }, 500);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, error, durationSeconds, onComplete, onCancel]);

  if (!isOpen) return null;

  const activeStages = mode === 'video_render' ? VIDEO_NEWSROOM_STAGES : NEWSROOM_STAGES;

  // Part 5.1 & 5.2 Operation-Specific Main Loading Messages:
  // - URL-based news generation (ai_generation): "खबर जनरेट हो रही है, कृपया प्रतीक्षा करें..."
  // - Home Screen News Card -> Graphic workflow (graphic_preparation / approved_presentation):
  //   "संपादकीय डेस्क आपकी चुनी गई खबर की हेडलाइन्स और कैप्शन को ग्राफिक के लिए तैयार कर रहा है..."
  const defaultTitle =
    mode === 'video_render'
      ? 'आपका वीडियो स्टूडियो तैयार किया जा रहा है...'
      : mode === 'ai_generation'
      ? 'खबर जनरेट हो रही है, कृपया प्रतीक्षा करें...'
      : 'संपादकीय डेस्क आपकी चुनी गई खबर की हेडलाइन्स और कैप्शन को ग्राफिक के लिए तैयार कर रहा है...';

  const displayTitle = title || defaultTitle;
  const currentSubtitle = effectiveSubtitles[subtitleIndex] || effectiveSubtitles[0];

  // Calculated progress for presentation timer or indeterminate animation
  const progressPercent = durationSeconds && durationSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100))
    : null;

  // Determine current active newsroom step based on elapsed time or loop
  const activeStepIndex = durationSeconds && durationSeconds > 0
    ? Math.min(activeStages.length - 1, Math.floor((elapsedSeconds / durationSeconds) * activeStages.length))
    : Math.floor((Date.now() / 2500) % activeStages.length);

  const CurrentStageIcon = activeStages[activeStepIndex]?.icon || (mode === 'video_render' ? Film : FileText);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branded-loading-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-neutral-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-indigo-950/50 space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Subtle decorative multicolor top glow */}
        <div className="absolute -top-12 left-1/4 w-36 h-20 bg-blue-500/20 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -top-12 right-1/4 w-36 h-20 bg-violet-500/20 blur-2xl rounded-full pointer-events-none" />

        {/* Optional top close / cancel button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/70 hover:bg-slate-700 transition-colors cursor-pointer"
            title="रद्द करें"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Part 6.1 & 6.2: Prominent Original Transparent PNG Logo & Single Subtitle "संपादकीय न्यूज़रूम डेस्क" */}
        <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/90 border border-indigo-400/30 p-2 shadow-lg shadow-indigo-950/40 flex items-center justify-center overflow-hidden">
            <img
              src="/assets/ai_news_maker_logo.png"
              alt="AI News Maker Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <span className="text-xs sm:text-sm px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 via-violet-500/15 to-amber-500/15 text-sky-200 border border-indigo-400/30 font-extrabold tracking-wide shadow-sm">
            संपादकीय न्यूज़रूम डेस्क
          </span>
        </div>

        {/* Part 6.3: Multicolor Newsroom Process Animation Area */}
        <div className="relative py-1.5 px-1">
          {/* Central Newsroom Activity Graphic */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center mb-3">
            {/* Subtle outer pulse */}
            <div className={`absolute inset-0 rounded-full border-2 border-violet-500/25 ${prefersReducedMotion ? '' : 'animate-ping'} opacity-30 pointer-events-none`} />

            {/* Rotating multicolor circle */}
            <div className={`absolute inset-1 rounded-full border-2 border-slate-700/50 border-t-sky-400 border-r-violet-400 border-b-amber-400 ${prefersReducedMotion ? '' : 'animate-spin'}`} />

            {/* Upper-right AI accent sparkle */}
            <div className="absolute -top-1 -right-1 p-1 bg-violet-500/20 rounded-full border border-violet-400/40">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            </div>

            {/* Dynamic Center Stage Icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-sky-400/40 flex items-center justify-center shadow-inner text-sky-300 transition-all duration-300">
              <CurrentStageIcon className="w-5 h-5 animate-in zoom-in-75 duration-200" />
            </div>
          </div>

          {/* Newsroom Activity Steps Tracker (Green completed, Blue active processing, Slate pending) */}
          <div className={`grid gap-1.5 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 ${mode === 'video_render' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4'}`}>
            {activeStages.map((stg, idx) => {
              const isActive = idx === activeStepIndex;
              const isPassed = idx < activeStepIndex;
              const IconComp = stg.icon;
              return (
                <div
                  key={stg.id}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-b from-blue-500/25 to-violet-500/20 border border-sky-400/60 shadow-sm text-sky-200'
                      : isPassed
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/40 border border-slate-800/60 text-slate-400'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 mb-1 ${isActive ? 'text-sky-300 scale-110' : isPassed ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-[10px] font-black leading-tight truncate w-full ${isActive ? 'text-white' : isPassed ? 'text-emerald-300' : 'text-slate-400'}`}>
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
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
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

              {/* Supporting description in balanced sky/indigo tone */}
              <p
                className={`text-xs sm:text-sm font-semibold text-sky-200/95 leading-relaxed font-['Noto_Sans_Devanagari'] min-h-[42px] flex items-center justify-center px-1 transition-opacity duration-300 ${
                  isSubtitleFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
                }`}
              >
                {currentSubtitle}
              </p>
            </div>

            {/* Smooth animated multicolor progress bar */}
            <div className="space-y-1.5 px-3">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
                {progressPercent !== null ? (
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400 transition-all duration-200 rounded-full shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                ) : (
                  <div className="h-full w-3/5 bg-gradient-to-r from-blue-500 via-violet-500 to-amber-400 rounded-full animate-pulse transition-all duration-300" />
                )}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span className="text-sky-300">
                  {mode === 'ai_generation' ? 'AI विश्लेषण जारी है...' : 'ग्राफिक सामग्री तैयार हो रही है...'}
                </span>
                {progressPercent !== null ? (
                  <span className="text-violet-300 font-mono">
                    {Math.floor(elapsedSeconds)}s / {durationSeconds}s ({progressPercent}%)
                  </span>
                ) : (
                  <span className="text-violet-300 font-mono">
                    समय: {Math.floor(elapsedSeconds)}s (अनुमानित 10-20s)
                  </span>
                )}
              </div>
            </div>

            {/* Brand supporting line at bottom */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {mode === 'ai_generation'
                  ? '⚡ AI कुछ ही क्षणों में 5 संतुलित हेडलाइन विकल्प व सोशल मीडिया कैप्शन प्रस्तुत करेगा'
                  : '⚡ चुनी गई खबर के तथ्यों के आधार पर हेडलाइन, कैप्शन और ग्राफिक सामग्री तैयार की जा रही है'}
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

