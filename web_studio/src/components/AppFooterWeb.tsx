import React from 'react';
import {
  Sparkles,
  ChevronRight,
  Headphones,
  Mail,
  Crown,
  ExternalLink,
} from 'lucide-react';
import { CANONICAL_12_FEATURES, CanonicalFeature } from '../data/canonicalFeatures';
import { APP_SUPPORT_CONFIG } from '../lib/supportConfig';

interface AppFooterWebProps {
  onNavigateToTab: (tab: any, meta?: any) => void;
  onOpenPlans?: () => void;
}

export const AppFooterWeb: React.FC<AppFooterWebProps> = ({
  onNavigateToTab,
}) => {
  const currentYear = new Date().getFullYear();

  const handleFeatureClick = (feat: CanonicalFeature) => {
    if (feat.status === 'coming_soon') {
      alert(`📌 ${feat.title}\n\nयह सुविधा जल्द ही उपलब्ध होगी! e-Paper स्टूडियो पर कार्य प्रगति पर है।`);
      return;
    }
    onNavigateToTab(feat.targetTab, { targetStep: feat.targetStep });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToFeatures = () => {
    const el = document.getElementById('footer-12-features-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-[#080d1a] border-t border-slate-800/90 text-slate-200 mt-12 pt-8 sm:pt-12 pb-32 sm:pb-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {/* ========================================================================= */}
        {/* SECTION A — TAGLINE HEADER + ALL 12 FEATURES SHOWCASE                     */}
        {/* ========================================================================= */}
        <section
          aria-label="AI News Maker 12 Features Showcase"
          className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-slate-700/80 p-4 sm:p-6 lg:p-8 shadow-2xl shadow-black/80 relative"
        >
          {/* Tagline Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-800/90 text-center sm:text-left">
            <div className="space-y-2 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
                </span>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight text-center sm:text-left">
                  खबर देखने से खबर बनाने तक,{' '}
                  <span className="text-amber-400 drop-shadow-sm font-black">
                    सिर्फ 2 मिनट में
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm md:text-base font-bold text-slate-300 text-center sm:text-left">
                डिजिटल न्यूज़ चैनलों का AI स्टूडियो —{' '}
                <span className="text-amber-300/90">12 शक्तिशाली सुविधाओं के साथ</span>
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 shrink-0 self-center lg:self-center">
              <button
                type="button"
                onClick={handleScrollToFeatures}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 hover:from-amber-400 hover:to-yellow-400 text-amber-300 hover:text-slate-950 border border-amber-400/50 hover:border-amber-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-amber-500/10 cursor-pointer active:scale-95"
              >
                <span>सभी फ़ीचर्स देखें</span>
                <span className="font-bold">→</span>
              </button>
            </div>
          </div>

          {/* 12 Features Grid: 4 columns on desktop, 2 on mobile */}
          <div
            id="footer-12-features-grid"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-6"
          >
            {CANONICAL_12_FEATURES.map((feat) => {
              const IconC = feat.icon;
              return (
                <div
                  key={feat.id}
                  onClick={() => handleFeatureClick(feat)}
                  className={`group rounded-xl p-3 sm:p-4 bg-slate-950/80 hover:bg-slate-900 border ${feat.borderColor} transition-all duration-200 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden`}
                  title={`${feat.title} - क्लिक कर फीचर खोलें`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Icon + Optional Pill Badge (Serial numbers removed per requirements) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center shrink-0 ${feat.iconBgColor}`}
                        >
                          <IconC className="w-4 h-4" />
                        </div>
                      </div>

                      {feat.badge && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 border truncate max-w-[100px] ${
                            feat.badge === '7 आसान चरण'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                              : feat.badge === 'HD क्वालिटी'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                              : feat.badge === 'जल्द आ रहा है'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                          }`}
                        >
                          {feat.badge}
                        </span>
                      )}
                    </div>

                    {/* Feature Title */}
                    <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {feat.title}
                    </h3>

                    {/* Feature Hindi Description */}
                    <p className="text-[10.5px] sm:text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed line-clamp-3">
                      {feat.desc}
                    </p>
                  </div>

                  {/* Bottom Chevron link */}
                  <div className="pt-2 flex items-center justify-end">
                    <span
                      className={`text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform ${feat.chevronColor}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION B — CONNECTED BRAND, OWNERSHIP & SUPPORT BOX                      */}
        {/* ========================================================================= */}
        <section
          aria-label="AI News Maker Brand and Support"
          className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-slate-700/80 p-5 sm:p-7 shadow-2xl shadow-black/80"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Area (Brand & Ownership) - 7 cols on desktop, centered on mobile */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5">
              {/* Circular Logo with Glowing Ring */}
              <div
                onClick={() => {
                  onNavigateToTab('home');
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 via-red-500 to-amber-300 p-[2px] shadow-xl shadow-red-900/40 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                <img
                  src="/assets/ai_news_maker_logo.png"
                  alt="AI News Maker Logo"
                  className="w-full h-full object-cover rounded-full bg-slate-950"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Brand Text & Ownership */}
              <div className="space-y-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                <h3
                  onClick={() => {
                    onNavigateToTab('home');
                    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xl sm:text-2xl font-black text-white tracking-wide cursor-pointer hover:text-amber-300 transition-colors"
                >
                  AI News Maker
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  डिजिटल न्यूज़ चैनलों, पत्रकारों और स्वतंत्र मीडिया हेतु भारत का आधुनिक AI न्यूज़ स्टूडियो
                </p>

                {/* Highlighted Ownership Badge */}
                <div className="pt-1 flex justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-yellow-500/15 border-2 border-amber-400/80 shadow-md shadow-amber-500/10">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide">
                      स्वामित्व: BREAKING NEWS WALA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Area (Support Inbox Panel) - 5 cols on desktop, centered on mobile */}
            <div className="lg:col-span-5 bg-slate-950/90 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Headphones className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-amber-400 leading-snug">
                      सपोर्ट इनबॉक्स खोलें
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400">
                      किसी भी समस्या, सुझाव या सहायता के लिए हमसे सीधे संपर्क करें
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToTab('support')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 w-full sm:w-auto"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>सपोर्ट इनबॉक्स खोलें →</span>
                </button>
              </div>

              {/* Direct email bar */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-300">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a
                  href={`mailto:${APP_SUPPORT_CONFIG.supportEmail}`}
                  className="font-semibold text-slate-200 hover:text-amber-300 underline underline-offset-2 transition-colors truncate"
                  title="सीधा ईमेल भेजें"
                >
                  {APP_SUPPORT_CONFIG.supportEmail}
                </a>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (ईमेल पर भी संपर्क कर सकते हैं)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C — BOTTOM DIVIDER AND LEGAL BAR                                  */}
        {/* ========================================================================= */}
        <section
          aria-label="Legal and Copyright"
          className="border-t border-slate-800/80 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400"
        >
          {/* Left Side: Copyright & Year */}
          <div className="text-center md:text-left text-slate-400">
            <span>© {currentYear} AI News Maker</span>
            <span className="mx-2 text-slate-600">|</span>
            <span>सर्वाधिकार सुरक्षित</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-slate-400">भारत के डिजिटल मीडिया समुदाय के लिए</span>
          </div>

          {/* Right Side: Legal Links */}
          <nav
            aria-label="Footer Legal Links"
            className="flex items-center gap-3 sm:gap-5 flex-wrap justify-center text-xs"
          >
            <a
              href={APP_SUPPORT_CONFIG.officialPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <span>{APP_SUPPORT_CONFIG.officialDomain}</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('terms')}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('privacy')}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('refunds')}
              className="text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              Refunds & Cancellations
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('support')}
              className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Contact Us
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('delete-account')}
              className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer text-[11px]"
            >
              Account Deletion
            </button>
          </nav>
        </section>
      </div>
    </footer>
  );
};
