import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle, ArrowRight, Monitor, Share } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceShow?: boolean;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose, forceShow = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStep, setInstallStep] = useState<'prompt' | 'guide'>('prompt');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if already installed or standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Grab globally captured prompt if exists
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    const handlePromptReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('pwa_install_prompt_ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('pwa_install_prompt_ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          (window as any).deferredPwaPrompt = null;
          setDeferredPrompt(null);
          try {
            localStorage.setItem('pwa_app_installed', 'true');
          } catch {}
          onClose();
          return;
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
    // Fallback to visual step-by-step instructions
    setInstallStep('guide');
  };

  const handleDismiss = () => {
    try {
      // Dismiss for 24 hours
      localStorage.setItem('pwa_install_dismissed_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
    } catch {}
    onClose();
  };

  if (!isOpen || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-modal-title"
      >
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-all cursor-pointer z-10"
          aria-label="बंद करें"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3.5 group">
            <div className="absolute inset-0 bg-amber-400/30 rounded-2xl blur-lg group-hover:blur-xl transition-all" />
            <img
              src="/assets/ai_news_maker_logo.png"
              alt="AI News Maker"
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl ring-2 ring-amber-400/80 bg-slate-950"
              onError={(e) => {
                // Fallback to /logo.png
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-gradient-to-r from-red-600 to-amber-600 text-[10px] font-black rounded-full shadow-md text-white border border-white/20">
              APP
            </span>
          </div>

          <h3 id="pwa-modal-title" className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide mb-1">
            AI News Maker वेब ऐप
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mb-4">
            वेबसाइट को अपने फोन या कंप्यूटर की होम स्क्रीन पर जोड़ें और 1-क्लिक में मोबाइल ऐप की तरह इस्तेमाल करें।
          </p>
        </div>

        {installStep === 'prompt' ? (
          <>
            {/* Feature Highlights */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 mb-5 space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>सीधा होम स्क्रीन से एक क्लिक में खुलेगा</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>फुल-स्क्रीन डिजिटल न्यूज़ व वीडियो स्टूडियो</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Google Chrome से बिना प्ले स्टोर के तुरंत तैयार</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
              >
                <Smartphone className="w-4 h-4 shrink-0 text-slate-950" />
                <span>होम स्क्रीन पर जोड़ें (Web App बनाएं)</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                बाद में (Not Now)
              </button>
            </div>
          </>
        ) : (
          /* Step-by-Step Chrome / Browser Guide */
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-3">
              <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-400" />
                <span>Google Chrome में इंस्टॉल करने का तरीका:</span>
              </div>

              {isIOS ? (
                /* iOS Safari instructions */
                <ol className="list-decimal list-inside space-y-2 text-slate-200">
                  <li>Safari ब्राउज़र में नीचे <Share className="w-3.5 h-3.5 inline text-sky-400 mx-1" /> <strong>Share</strong> बटन दबाएं।</li>
                  <li>सूची में नीचे स्क्रॉल करें और <strong>'Add to Home Screen' (+ आइकन)</strong> चुनें।</li>
                  <li>ऊपर दाईं ओर <strong>'Add'</strong> पर टैप करें।</li>
                </ol>
              ) : (
                /* Android / Desktop Chrome instructions */
                <ol className="list-decimal list-inside space-y-2.5 text-slate-200">
                  <li className="leading-relaxed">
                    ब्राउज़र में ऊपर दाईं ओर <span className="px-1.5 py-0.5 bg-slate-700 rounded font-black text-amber-300">⋮ (3-डॉट्स)</span> मेनू पर टैप/क्लिक करें।
                  </li>
                  <li className="leading-relaxed">
                    मेनू में <span className="font-black text-emerald-300">"Add to Home screen"</span> या <span className="font-black text-emerald-300">"Install app"</span> विकल्प चुनें।
                  </li>
                  <li className="leading-relaxed">
                    स्क्रीन पर आए <span className="font-black text-amber-300">"Install"</span> बटन पर टैप करें।
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <span>समझ गया (Done)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
