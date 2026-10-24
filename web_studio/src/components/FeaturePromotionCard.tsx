import React, { useRef } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Layers,
  Wand2,
} from 'lucide-react';
import { CANONICAL_12_FEATURES, CanonicalFeature } from '../data/canonicalFeatures';

export type PromoLayoutRatio = '4:5' | '1:1' | '16:9' | 'carousel';

interface FeaturePromotionCardProps {
  layoutRatio?: PromoLayoutRatio;
  startFeatureIndex?: number;
  promoTitle?: string;
  onNavigateToTab: (tab: any, meta?: any) => void;
  className?: string;
}

export const FeaturePromotionCard: React.FC<FeaturePromotionCardProps> = ({
  layoutRatio = '16:9',
  startFeatureIndex = 0,
  promoTitle,
  onNavigateToTab,
  className = '',
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Rotate features based on startFeatureIndex so all 12 are discoverable
  const rotatedFeatures = React.useMemo(() => {
    const total = CANONICAL_12_FEATURES.length;
    const offset = ((startFeatureIndex % total) + total) % total;
    return [
      ...CANONICAL_12_FEATURES.slice(offset),
      ...CANONICAL_12_FEATURES.slice(0, offset),
    ];
  }, [startFeatureIndex]);

  const handleAction = (feat: CanonicalFeature) => {
    if (feat.status === 'coming_soon') {
      alert(`📌 ${feat.title}\n\nयह सुविधा जल्द ही उपलब्ध होगी! e-Paper स्टूडियो पर कार्य प्रगति पर है।`);
      return;
    }
    onNavigateToTab(feat.targetTab, { targetStep: feat.targetStep });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.75;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 1. CAROUSEL VARIANT (Horizontal Left-to-Right Carousel)
  if (layoutRatio === 'carousel') {
    return (
      <div
        className={`col-span-1 md:col-span-2 lg:col-span-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 p-4 sm:p-5 shadow-2xl space-y-3.5 relative overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                  AI न्यूज़ मेकर फ़ीचर शोकेस
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">• 12 शक्तिशाली टूल्स</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {promoTitle || 'खबर देखने से खबर बनाने तक, सिर्फ 2 मिनट में'}
              </h3>
            </div>
          </div>

          {/* Desktop Arrow Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition active:scale-90"
              title="पीछे स्क्रॉल करें"
              aria-label="Previous Features"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition active:scale-90"
              title="आगे स्क्रॉल करें"
              aria-label="Next Features"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Track */}
        <div
          ref={carouselRef}
          tabIndex={0}
          aria-label="Horizontal Feature Carousel"
          className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-700 overscroll-x-contain focus:outline-hidden"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {rotatedFeatures.map((feat) => {
            const IconC = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => handleAction(feat)}
                style={{ scrollSnapAlign: 'start' }}
                className={`w-[240px] sm:w-[270px] shrink-0 p-3.5 rounded-xl bg-slate-900/95 border ${feat.borderColor} hover:border-amber-400 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-md hover:shadow-xl`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${feat.iconBgColor}`}>
                        <IconC className="w-4 h-4" />
                      </div>
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                        {feat.number}
                      </span>
                    </div>
                    {feat.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {feat.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {feat.desc}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px] font-bold text-amber-400 mt-2 border-t border-slate-800/80">
                  <span>उपयोग करें</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span>← बाएं / दाएं स्वाइप करें • सभी 12 फीचर्स उपलब्ध</span>
          <span className="text-amber-400 font-bold">100% निशुल्क स्टूडियो अनुभव</span>
        </div>
      </div>
    );
  }

  // 2. 16:9 LANDSCAPE VARIANT (Wide Banner with 2-3 Featured items)
  if (layoutRatio === '16:9') {
    const primaryFeat = rotatedFeatures[0];
    const secondaryFeat = rotatedFeatures[1];
    const PrimaryIcon = primaryFeat.icon;
    const SecondaryIcon = secondaryFeat.icon;

    return (
      <div
        className={`col-span-1 md:col-span-2 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden group ${className}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[9px] sm:text-[10px] rounded uppercase shadow-xs">
              AI स्टूडियो फ़ीचर
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white">
              खबर देखने से खबर बनाने तक, <span className="text-amber-400">सिर्फ 2 मिनट में</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('studio')}
            className="text-[11px] text-amber-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>स्टूडियो खोलें</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Feature 1 */}
          <div
            onClick={() => handleAction(primaryFeat)}
            className={`p-3 rounded-xl bg-slate-900/90 border ${primaryFeat.borderColor} hover:border-amber-400 transition cursor-pointer flex flex-col justify-between`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${primaryFeat.iconBgColor}`}>
                    <PrimaryIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-amber-400">#{primaryFeat.number}</span>
                </div>
                {primaryFeat.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    {primaryFeat.badge}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">{primaryFeat.title}</h4>
              <p className="text-[11px] text-slate-300 line-clamp-2">{primaryFeat.desc}</p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1 justify-end">
              <span>शुरू करें →</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div
            onClick={() => handleAction(secondaryFeat)}
            className={`p-3 rounded-xl bg-slate-900/90 border ${secondaryFeat.borderColor} hover:border-amber-400 transition cursor-pointer flex flex-col justify-between`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${secondaryFeat.iconBgColor}`}>
                    <SecondaryIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-amber-400">#{secondaryFeat.number}</span>
                </div>
                {secondaryFeat.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                    {secondaryFeat.badge}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">{secondaryFeat.title}</h4>
              <p className="text-[11px] text-slate-300 line-clamp-2">{secondaryFeat.desc}</p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1 justify-end">
              <span>शुरू करें →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. 1:1 SQUARE VARIANT (Balanced Spotlight on 1 or 2 features)
  if (layoutRatio === '1:1') {
    const feat = rotatedFeatures[0];
    const FeatIcon = feat.icon;

    return (
      <div
        onClick={() => handleAction(feat)}
        className={`col-span-1 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 ${feat.borderColor} p-4 sm:p-5 shadow-xl flex flex-col justify-between aspect-square group cursor-pointer relative overflow-hidden ${className}`}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30">
              फ़ीचर #{feat.number}
            </span>
            {feat.badge && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {feat.badge}
              </span>
            )}
          </div>

          <div className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform ${feat.iconBgColor}">
            <FeatIcon className="w-6 h-6 text-amber-400" />
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white group-hover:text-amber-300 transition-colors leading-snug">
              {feat.title}
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
              {feat.desc}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="text-[11px] text-slate-400">सिर्फ 2 मिनट में बनाएं</span>
          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>ओपन करें</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    );
  }

  // 4. 4:5 PORTRAIT VARIANT (Tall Card matching feed card dimensions)
  const feat = rotatedFeatures[0];
  const nextFeat = rotatedFeatures[1];
  const FeatIcon = feat.icon;
  const NextFeatIcon = nextFeat.icon;

  return (
    <div
      className={`col-span-1 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 p-4 sm:p-5 shadow-xl flex flex-col justify-between min-h-[380px] group relative overflow-hidden ${className}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              AI स्टूडियो फ़ीचर #{feat.number}
            </span>
          </div>
          {feat.badge && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
              {feat.badge}
            </span>
          )}
        </div>

        <div
          onClick={() => handleAction(feat)}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-400 transition cursor-pointer space-y-2 group/card"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${feat.iconBgColor}`}>
              <FeatIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white group-hover/card:text-amber-300 transition-colors">
                {feat.title}
              </h4>
              <span className="text-[10px] text-amber-400 font-bold">सुविधा #{feat.number}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
            {feat.desc}
          </p>
        </div>

        {/* Secondary mini feature */}
        <div
          onClick={() => handleAction(nextFeat)}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-400 transition cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${nextFeat.iconBgColor}`}>
              <NextFeatIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-slate-400 block">अगला फ़ीचर:</span>
              <span className="text-xs font-bold text-white truncate block">{nextFeat.title}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/90 space-y-2">
        <p className="text-[11px] text-slate-400 leading-tight">
          “खबर देखने से खबर बनाने तक, सिर्फ 2 मिनट में”
        </p>
        <button
          type="button"
          onClick={() => handleAction(feat)}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
        >
          <span>अभी आज़माएं</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
