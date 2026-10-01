import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface StepItem {
  step: number;
  id: string;
  label: string;
  shortLabel?: string;
  icon: string;
}

export const DEFAULT_STEPS: StepItem[] = [
  { step: 1, id: 'step-frame', label: 'फ्रेम्स', shortLabel: 'फ्रेम्स', icon: '🖼️' },
  { step: 2, id: 'step-ai', label: 'एआई टूल्स', shortLabel: 'एआई टूल्स', icon: '🤖' },
  { step: 3, id: 'step-headline', label: 'हेडलाइन', shortLabel: 'हेडलाइन', icon: '✍️' },
  { step: 4, id: 'step-photo', label: 'फोटो', shortLabel: 'फोटो', icon: '📷' },
  { step: 5, id: 'step-location', label: 'लोकेशन', shortLabel: 'लोकेशन', icon: '📍' },
  { step: 6, id: 'step-date-watermark', label: 'तारीख व वॉटरमार्क', shortLabel: 'तारीख-वॉटरमार्क', icon: '📅' },
  { step: 7, id: 'step-header-footer', label: 'हैडर और फुटर', shortLabel: 'हैडर-फुटर', icon: '📜' },
  { step: 8, id: 'step-download', label: 'डाउनलोड', shortLabel: 'डाउनलोड', icon: '⬇️' },
];

interface StepNavigatorProps {
  activeStep: number;
  onStepChange: (step: number) => void;
  mobileViewMode?: 'steps' | 'all';
  onToggleMobileViewMode?: (mode: 'steps' | 'all') => void;
  className?: string;
  compact?: boolean;
  steps?: StepItem[];
  onOpenCloudSettings?: () => void;
}

export const scrollToStepById = (stepId: string) => {
  requestAnimationFrame(() => {
    setTimeout(() => {
      const el = document.getElementById(stepId);
      if (!el) return;

      const topBar = document.querySelector('header');
      const topBarHeight = topBar && topBar.offsetParent !== null ? topBar.offsetHeight : 0;

      let offset = topBarHeight + 16;
      const stickyEditorBar = document.getElementById('sticky-editor-steps-bar');
      if (stickyEditorBar && stickyEditorBar.offsetParent !== null) {
        offset += stickyEditorBar.offsetHeight;
      }

      const stickyHeader = document.getElementById('sticky-preview-header') || document.getElementById('preview-header-container');
      if (stickyHeader && stickyHeader.offsetParent !== null && window.innerWidth < 1024) {
        offset += stickyHeader.offsetHeight;
      }

      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const targetY = Math.max(0, elementPosition - offset);

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    }, 60);
  });
};

export const StepNavigator: React.FC<StepNavigatorProps> = ({
  activeStep,
  onStepChange,
  className = '',
  steps = DEFAULT_STEPS,
  onOpenCloudSettings,
}) => {
  const handleStepClick = (s: StepItem) => {
    onStepChange(s.step);
    scrollToStepById(s.id);
  };

  return (
    <div
      className={`w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-xl flex flex-col gap-1.5 ${className}`}
    >
      {/* Header with Title */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800/80 mb-0.5">
        <div
          className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 py-0.5"
        >
          <span>⚙️</span>
          <span>एडिटर स्टेप्स</span>
        </div>
      </div>

      {/* 1, 2, 3, 4, 5 ऊपर से नीचे तक (Vertical Stack) */}
      <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 justify-between">
        {steps.map((s) => {
          const isActive = activeStep === s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => handleStepClick(s)}
              className={`w-full text-left px-1.5 sm:px-2.5 py-1.5 sm:py-2 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 via-red-650 to-red-700 text-white font-black border border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black shrink-0 ${
                    isActive ? 'bg-amber-400 text-neutral-950 shadow-xs ring-1 ring-white/50' : 'bg-slate-700 text-amber-300'
                  }`}
                >
                  {s.step}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold truncate leading-tight">
                    {s.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isActive ? (
                  <span className="text-[8.5px] sm:text-[10px] font-black text-amber-300 bg-black/40 px-1 py-0.5 rounded border border-amber-400/40 hidden xs:inline-block">
                    सक्रिय ▼
                  </span>
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-400 hidden xs:inline-block" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
