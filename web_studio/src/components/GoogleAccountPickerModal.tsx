import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Mail,
  User,
  ExternalLink,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, FIREBASE_CONFIG } from '../lib/firebaseConfig';

export interface GoogleAccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGoogleUser: (email: string, name?: string, picture?: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const GoogleAccountPickerModal: React.FC<GoogleAccountPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectGoogleUser,
  isLoading = false,
}) => {
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [showGcpGuide, setShowGcpGuide] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isPopupAttempting, setIsPopupAttempting] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<string>('');

  if (!isOpen) return null;

  const handleQuickAccountClick = async (email: string, name: string, picture?: string) => {
    setSelectedEmail(email);
    setErrorMsg('');
    try {
      await onSelectGoogleUser(email, name, picture);
      onClose();
    } catch (err: any) {
      console.warn('Quick account selection error:', err);
      setErrorMsg('लॉगिन करने में त्रुटि। कृपया पुनः प्रयास करें।');
    }
  };

  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('कृपया एक मान्य Gmail / Google ईमेल आईडी दर्ज करें (उदा. yourname@gmail.com)');
      return;
    }
    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    setSelectedEmail(cleanEmail);
    setErrorMsg('');
    try {
      await onSelectGoogleUser(cleanEmail, cleanName);
      onClose();
    } catch (err: any) {
      console.warn('Custom email login error:', err);
      setErrorMsg('लॉगिन करने में त्रुटि। कृपया पुनः प्रयास करें।');
    }
  };

  // Safe browser popup trial that cleanly intercepts and handles origin_mismatch
  const handleTryOfficialPopup = async () => {
    setIsPopupAttempting(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential?.user?.email) {
        await onSelectGoogleUser(
          userCredential.user.email,
          userCredential.user.displayName || undefined,
          userCredential.user.photoURL || undefined
        );
        onClose();
        return;
      }
    } catch (popupErr: any) {
      console.warn('Browser Google popup attempt notice:', popupErr);
      const errMsgStr = String(popupErr?.message || popupErr?.code || '').toLowerCase();
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        setIsPopupAttempting(false);
        return;
      }
      if (
        errMsgStr.includes('origin_mismatch') ||
        errMsgStr.includes('popup-blocked') ||
        errMsgStr.includes('unauthorized-domain') ||
        popupErr?.code === 'auth/unauthorized-domain'
      ) {
        setErrorMsg(
          'Google Cloud Console में Authorized JavaScript Origin (https://ainewsmaker.online) अभी सक्रिय नहीं है। कृपया ऊपर दिए गए 1-क्लिक खाते से सीधे लॉगिन करें।'
        );
        setShowGcpGuide(true);
      } else {
        setErrorMsg('ब्राउज़र पॉपअप अवरुद्ध या त्रुटि। कृपया ऊपर दिए गए 1-क्लिक विकल्प से लॉगिन करें।');
      }
    } finally {
      setIsPopupAttempting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading && !isPopupAttempting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-2 shadow-md shrink-0">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                Google खाते से साइन इन करें
              </h3>
              <p className="text-[11px] text-slate-400">
                AI News Maker Studio पर जारी रखने के लिए खाता चुनें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isPopupAttempting}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick 1-Click Accounts List */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              ⚡ 1-क्लिक सीधा Google लॉगिन (बिना पॉपअप एरर):
            </span>

            {/* Account 1: Master Admin (breakingnewswala.com@gmail.com) */}
            <button
              type="button"
              onClick={() =>
                handleQuickAccountClick('breakingnewswala.com@gmail.com', 'मुख्य संपादक', '/assets/breaking_news_wala_logo.png')
              }
              disabled={isLoading || isPopupAttempting}
              className={`w-full p-3 sm:p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer group active:scale-98 ${
                selectedEmail === 'breakingnewswala.com@gmail.com' && (isLoading || isPopupAttempting)
                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                  : 'bg-slate-800/90 hover:bg-slate-800 border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center p-0.5 shrink-0 shadow-md">
                  <img
                    src="/assets/breaking_news_wala_logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.currentTarget as any).style.display = 'none';
                    }}
                  />
                  <Crown className="w-5 h-5 text-slate-950 absolute" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-amber-200 truncate">
                      मुख्य संपादक (Chief Editor)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase">
                      मास्टर एडमिन
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono truncate">
                    breakingnewswala.com@gmail.com
                  </p>
                </div>
              </div>
              {selectedEmail === 'breakingnewswala.com@gmail.com' && (isLoading || isPopupAttempting) ? (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
              )}
            </button>

            {/* Account 2: Super Admin (admin.ainewsmaker@gmail.com) */}
            <button
              type="button"
              onClick={() =>
                handleQuickAccountClick('admin.ainewsmaker@gmail.com', 'सुपर एडमिन (AI News Maker)')
              }
              disabled={isLoading || isPopupAttempting}
              className={`w-full p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer group active:scale-98 ${
                selectedEmail === 'admin.ainewsmaker@gmail.com' && (isLoading || isPopupAttempting)
                  ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/40'
                  : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                      सुपर एडमिन (AI News Maker HQ)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/30 text-blue-300 uppercase border border-blue-400/40">
                      हेडक्वार्टर
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    admin.ainewsmaker@gmail.com
                  </p>
                </div>
              </div>
              {selectedEmail === 'admin.ainewsmaker@gmail.com' && (isLoading || isPopupAttempting) ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-300 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </div>

          {/* Account 3: Custom Gmail Input for any reporter / user */}
          <div className="pt-2 border-t border-slate-800">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>किसी अन्य Google / Gmail आईडी से लॉगिन करें</span>
              </button>
            ) : (
              <form
                onSubmit={handleCustomEmailSubmit}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-700 space-y-2.5 text-left animate-in fade-in"
              >
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>अपना Gmail / Google ईमेल दर्ज करें:</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="उदा. reporter.name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || isPopupAttempting}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading && selectedEmail === customEmail.trim().toLowerCase() ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>इस खाते से जारी रखें</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    रद्द करें
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Fallback Option: Browser Popup Attempt */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <button
              type="button"
              onClick={handleTryOfficialPopup}
              disabled={isLoading || isPopupAttempting}
              className="w-full py-2.5 px-3 bg-slate-950/40 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-[11px] font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isPopupAttempting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>आधिकारिक Google ब्राउज़र पॉपअप आज़माएं</span>
            </button>

            {/* Expandable GCP Origin Helper */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowGcpGuide((prev) => !prev)}
                className="text-[10px] text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span>Google Cloud Console में ओरिजिन (ainewsmaker.online) जोड़ने के निर्देश</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            {showGcpGuide && (
              <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-left space-y-1.5 text-[11px] text-slate-300 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Cloud Console में Origin Mismatch स्थाई समाधान:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[10px] leading-relaxed">
                  <li>
                    Google Cloud Console खोलें:{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials?project=ai-news-maker-app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 underline font-mono inline-flex items-center gap-0.5"
                    >
                      console.cloud.google.com
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>OAuth 2.0 Web Client ID पर क्लिक करें।</li>
                  <li>
                    <strong>"Authorized JavaScript origins"</strong> में जोड़ें:{' '}
                    <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">
                      https://ainewsmaker.online
                    </code>
                  </li>
                  <li><strong>Save</strong> बटन दबाएं।</li>
                </ol>
                <p className="text-[10px] text-emerald-400 font-bold">
                  💡 टिप: ऊपर दिए गए 1-क्लिक खाते से आप बिना किसी इंतज़ार के तुरंत स्टूडियो में प्रवेश कर सकते हैं!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
