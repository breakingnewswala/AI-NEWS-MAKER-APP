import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2 } from 'lucide-react';

export interface BrandedNewsLoadingModalProps {
  isOpen: boolean;
  mode?: 'headline' | 'graphic' | 'approved_loading';
  title?: string;
  durationSeconds?: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

// 5 exact rotating supporting taglines (rotating every 2 seconds during the 10-second minimum duration)
const DEFAULT_SUBTITLES: string[] = [
  'पत्रकारिता मानकों के अनुसार निष्पक्ष तथ्यों की पुष्टि...',
  'समाचार के मुख्य तथ्य और संदर्भ व्यवस्थित किए जा रहे हैं...',
  '5 संतुलित और प्रभावी हेडलाइन विकल्प तैयार हो रहे हैं...',
  'सोशल मीडिया के लिए विस्तृत और संक्षिप्त कैप्शन बनाए जा रहे हैं...',
  'ग्राफिक लेआउट और फोटो की मैपिंग को अंतिम रूप दिया जा रहा है...',
];

export const BrandedNewsLoadingModal: React.FC<BrandedNewsLoadingModalProps> = ({
  isOpen,
  mode = 'graphic',
  title,
  durationSeconds = 10,
  onComplete,
  onCancel,
}) => {
  const [subtitleIndex, setSubtitleIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const completeFiredRef = useRef<boolean>(false);

  // Subtitle rotation every 2 seconds across 10-second duration
  useEffect(() => {
    if (!isOpen) {
      setSubtitleIndex(0);
      setElapsedSeconds(0);
      completeFiredRef.current = false;
      return;
    }

    setSubtitleIndex(0);
    setElapsedSeconds(0);
    completeFiredRef.current = false;

    timerRef.current = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % DEFAULT_SUBTITLES.length);
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Duration countdown (10-second minimum requirement)
  useEffect(() => {
    if (!isOpen || !durationSeconds || durationSeconds <= 0) return;

    countdownRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = +(prev + 0.2).toFixed(2);
        if (next >= durationSeconds && !completeFiredRef.current) {
          completeFiredRef.current = true;
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (onComplete) {
            setTimeout(() => {
              onComplete();
            }, 50);
          }
          return durationSeconds;
        }
        return Math.min(durationSeconds, next);
      });
    }, 200);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, durationSeconds, onComplete]);

  if (!isOpen) return null;

  const defaultTitle =
    mode === 'graphic' || mode === 'approved_loading'
      ? 'कृपया प्रतीक्षा करें, समाचार सामग्री का विश्लेषण कर ग्राफिक और हेडलाइन तैयार की जा रही हैं...'
      : 'अभी खबर जनरेट हो रही है, कृपया प्रतीक्षा करें...';

  const displayTitle = title || defaultTitle;
  const currentSubtitle = DEFAULT_SUBTITLES[subtitleIndex] || DEFAULT_SUBTITLES[0];
  const progressPercent = durationSeconds && durationSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100))
    : Math.min(100, Math.round((elapsedSeconds / 10) * 100));

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branded-loading-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-neutral-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Authentic AI NEWS MAKER Brand Logo */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/90 border border-amber-500/50 p-2 shadow-lg flex items-center justify-center overflow-hidden">
            <img
              src="/assets/ai_news_maker_logo.png"
              alt="AI News Maker Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
            AI News Maker • संपादकीय डेस्क
          </span>
        </div>

        {/* Recognizable rotating animation & progress indicator */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping opacity-60" />
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-400 border-r-amber-500 border-b-transparent border-l-transparent animate-spin" />
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        </div>

        {/* Main prominent message (approx 2 lines on mobile) */}
        <div className="space-y-2">
          <h2
            id="branded-loading-title"
            className="text-base sm:text-lg font-black text-white leading-snug font-['Noto_Sans_Devanagari'] px-2"
          >
            {displayTitle}
          </h2>

          {/* Rotating yellow subtitle changing every 2 seconds with smooth transition */}
          <p
            key={subtitleIndex}
            className="text-xs sm:text-sm font-semibold text-amber-300 leading-relaxed font-['Noto_Sans_Devanagari'] min-h-[40px] flex items-center justify-center transition-all duration-300 animate-in fade-in"
          >
            {currentSubtitle}
          </p>
        </div>

        {/* Progress bar showing 10-second countdown */}
        <div className="space-y-1.5 px-4">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-300 font-bold">
            <span className="text-amber-300">तैयारी जारी है...</span>
            <span className="text-amber-400 font-mono">{Math.floor(elapsedSeconds)}s / {durationSeconds}s</span>
          </div>
        </div>

        {/* Brand supporting line near bottom */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>AI News Maker • डिजिटल पत्रकारिता का नया युग</span>
        </div>

        {/* Cancel button if provided */}
        {onCancel && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer underline"
            >
              रद्द करें
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
