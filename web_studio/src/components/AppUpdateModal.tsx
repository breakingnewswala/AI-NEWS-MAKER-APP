import React, { useState, useEffect } from 'react';
import {
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  X,
  ArrowRight,
  Radio,
  FileCheck,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const APP_CURRENT_VERSION = '1.2.0';
export const APP_BUILD_CODE = 10200;

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  releaseDate: string;
  downloadUrl: string;
  apkAvailable: boolean;
  releaseTitle?: string;
  releaseNotes: string[];
  minRequiredVersion?: string;
  forceUpdate?: boolean;
}

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ReporterUser | null;
  versionInfo: AppVersionInfo | null;
  onRefreshVersion: () => Promise<void>;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  versionInfo,
  onRefreshVersion,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { isInstallable, isInstalled, install: triggerInstall } = usePWAInstall();

  // Admin edit form state
  const [isAdminTab, setIsAdminTab] = useState(false);
  const [adminVersion, setAdminVersion] = useState('');
  const [adminTitle, setAdminTitle] = useState('');
  const [adminDownloadUrl, setAdminDownloadUrl] = useState('');
  const [adminNotesRaw, setAdminNotesRaw] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (versionInfo) {
      setAdminVersion(versionInfo.version || APP_CURRENT_VERSION);
      setAdminTitle(versionInfo.releaseTitle || 'न्यू अपडेट');
      setAdminDownloadUrl(versionInfo.downloadUrl || '/app-release.apk');
      setAdminNotesRaw((versionInfo.releaseNotes || []).join('\n'));
    }
  }, [versionInfo]);

  if (!isOpen) return null;

  const latestVersion = versionInfo?.version || APP_CURRENT_VERSION;
  const latestCode = versionInfo?.versionCode || APP_BUILD_CODE;
  const hasNewUpdate = latestCode > APP_BUILD_CODE || latestVersion !== APP_CURRENT_VERSION;

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await onRefreshVersion();
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = versionInfo?.downloadUrl || '/app-release.apk';
    link.download = `BreakingNewsWala-v${latestVersion}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadStarted(false), 3000);
  };

  const handleCopyApkLink = () => {
    const fullUrl = `${window.location.origin}${versionInfo?.downloadUrl || '/app-release.apk'}`;
    const textToShare = `📲 *ब्रेकिंग न्यूज़ वाला स्टूडियो मोबाइल ऐप*\n\nनया वर्जन v${latestVersion} उपलब्ध है!\n\nडाउनलोड लिंक:\n${fullUrl}\n\nसुविधाएं:\n- 🌅 मॉर्निंग जैकेट 1-क्लिक AI सुविचार\n- 📱 मोबाइल स्प्लिट-स्क्रीन लाइव प्रीव्यू\n- ⚡ 4 मुख्य जैकेट्स व फास्ट डाउनलोड`;
    
    navigator.clipboard.writeText(textToShare);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveAdminVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaving(true);
    setAdminMsg(null);

    try {
      const notes = adminNotesRaw
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/update-version-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: adminVersion.trim(),
          versionCode: APP_BUILD_CODE + 1,
          releaseTitle: adminTitle.trim(),
          downloadUrl: adminDownloadUrl.trim(),
          releaseNotes: notes,
        }),
      });

      if (!res.ok) throw new Error('अपडेट सुरक्षित नहीं हो सका');
      await onRefreshVersion();
      setAdminMsg('✅ नया वर्जन व रिलीज नोट्स सफलतापूर्वक लाइव कर दिए गए हैं!');
    } catch (err: any) {
      setAdminMsg(`❌ त्रुटि: ${err.message}`);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleInstantRefresh = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="लोगो"
              className="w-10 h-10 rounded-xl object-contain border border-yellow-400/40 bg-neutral-900 p-0.5 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5 font-['Baloo_2']">
                <span>ब्रेकिंग न्यूज़वाला ऐप सेंटर</span>
                <span className="text-[10px] font-bold bg-yellow-400 text-neutral-950 px-1.5 py-0.5 rounded">
                  v{APP_CURRENT_VERSION}
                </span>
              </h3>
              <p className="text-[11px] text-yellow-300/80">
                भारत के जिलों से, आपके दिलों तक
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 p-1.5 bg-neutral-900 border-b border-neutral-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setIsAdminTab(false)}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                !isAdminTab ? 'bg-yellow-400 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              📲 डाउनलोड व अपडेट
            </button>
            <button
              type="button"
              onClick={() => setIsAdminTab(true)}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isAdminTab ? 'bg-yellow-400 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>👑 एडमिन रिलीज कंट्रोल</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isAdminTab ? (
            /* Admin Release Panel */
            <form onSubmit={handleSaveAdminVersion} className="space-y-3.5">
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                <span className="font-bold">मुख्य संपादक कंट्रोल:</span> यहाँ से आप ऐप का नया वर्जन, APK डाउनलोड लिंक और नए फीचर्स के नोट्स जारी कर सकते हैं। यह जानकारी सभी रिपोर्टरों के पास तुरंत दिखाई देगी।
              </div>

              {adminMsg && (
                <div className="p-2.5 bg-neutral-900 border border-neutral-700 text-xs rounded-lg text-white">
                  {adminMsg}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  नया वर्जन नंबर (उदा. 1.2.1):
                </label>
                <input
                  type="text"
                  value={adminVersion}
                  onChange={(e) => setAdminVersion(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  अपडेट शीर्षक:
                </label>
                <input
                  type="text"
                  value={adminTitle}
                  onChange={(e) => setAdminTitle(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  APK फाइल डाउनलोड पाथ / URL:
                </label>
                <input
                  type="text"
                  value={adminDownloadUrl}
                  onChange={(e) => setAdminDownloadUrl(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  क्या नया है (प्रत्येक पंक्ति में एक फीचर):
                </label>
                <textarea
                  value={adminNotesRaw}
                  onChange={(e) => setAdminNotesRaw(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adminSaving}
                className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {adminSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>नया वर्जन पब्लिश करें</span>
              </button>
            </form>
          ) : (
            /* User Download & Status View */
            <div className="space-y-4">
              {/* Status Box */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  hasNewUpdate
                    ? 'bg-yellow-500/15 border-yellow-400/60 text-yellow-200'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hasNewUpdate
                        ? 'bg-yellow-400 text-neutral-950'
                        : 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40'
                    }`}
                  >
                    {hasNewUpdate ? <Sparkles className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {hasNewUpdate ? '🚀 नया वर्जन उपलब्ध है!' : '✅ आपकी ऐप पूर्णतः अपडेटेड है'}
                    </h4>
                    <p className="text-[11px] text-neutral-300">
                      इंस्टॉल्ड वर्जन: <span className="font-bold text-yellow-400">v{APP_CURRENT_VERSION}</span>
                      {hasNewUpdate && (
                        <span> • उपलब्ध: <span className="font-bold text-green-400">v{latestVersion}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="ताजा अपडेट जांचें"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-yellow-400' : ''}`} />
                  <span>चेक</span>
                </button>
              </div>

              {/* Action Buttons: 1-Click Install PWA & Share */}
              <div className="space-y-2.5 pt-1">
                {/* 1-Click PWA Install Button */}
                <button
                  type="button"
                  onClick={async () => {
                    if (isInstallable) {
                      await triggerInstall();
                    } else {
                      setShowInstallGuide((prev) => !prev);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-98"
                >
                  <Smartphone className="w-5 h-5 text-neutral-950" />
                  <span>
                    {isInstalled ? '✅ ऐप पहले से स्थापित है' : '📲 फोन में ऐप इंस्टॉल करें (Add to Home screen)'}
                  </span>
                </button>

                {showInstallGuide && (
                  <div className="p-3 bg-yellow-500/15 border border-yellow-400/50 rounded-xl text-xs text-yellow-200 animate-fadeIn">
                    <p className="font-bold mb-1">💡 फोन में ऐप आइकन जोड़ने का सीधा तरीका:</p>
                    <p className="text-[11px] text-neutral-300 mb-1">
                      1. क्रोम (Chrome) में ऊपर दाईं ओर <strong>तीन डॉट्स (⋮)</strong> पर टैप करें।
                    </p>
                    <p className="text-[11px] text-neutral-300">
                      2. <strong>"Install app"</strong> या <strong>"Add to Home screen"</strong> चुनें। ऐप आपके होम स्क्रीन पर ओरिजिनल लोगो के साथ जुड़ जाएगी!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyApkLink}
                    className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-400 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-yellow-400" />}
                    <span>{copiedLink ? 'लिंक कॉपी हो गया!' : '📋 ऐप लिंक कॉपी करें'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadApk}
                    className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-400 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{downloadStarted ? 'डाउनलोड...' : '📥 APK पैकेज'}</span>
                  </button>
                </div>
              </div>

              {/* Helper tip for PWA install on Android Chrome */}
              <div className="p-3 bg-neutral-900/70 border border-yellow-500/20 rounded-xl text-[11px] text-neutral-300 space-y-1.5">
                <span className="font-bold text-yellow-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>एंड्रॉयड फोन पर 'Add to Home Screen' कैसे करें:</span>
                </span>
                <p className="text-neutral-300 leading-relaxed">
                  1. क्रोम (Chrome) ब्राउज़र में ऊपर दाईं ओर <strong>तीन डॉट्स (⋮)</strong> पर टैप करें।
                </p>
                <p className="text-neutral-300 leading-relaxed">
                  2. <strong>"Install app"</strong> (ऐप इंस्टॉल करें) या <strong>"Add to Home screen"</strong> चुनें।
                </p>
                <p className="text-emerald-400 font-medium">
                  ✨ अब आपके फोन पर 'ब्रेकिंग न्यूजवाला' का असली लोगो और आइकन दिखेगा और बिना किसी पैकेज एरर के तुरंत खुलेगा!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
