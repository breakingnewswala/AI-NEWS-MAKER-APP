import React, { useState, useEffect } from 'react';
import { Bell, Volume2, ShieldCheck, Zap, X, CheckCircle2 } from 'lucide-react';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  unlockAudioPlayback,
  playNormalNotificationSound,
} from '../lib/notificationManager';

interface NotificationPermissionModalProps {
  onPermissionGranted?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  onPermissionGranted,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user already enabled or dismissed in this session
    const isAlreadyEnabled = localStorage.getItem('ai_news_sound_permission_enabled_v1') === 'true';
    const isDismissedThisSession = sessionStorage.getItem('ai_news_notif_modal_dismissed') === 'true';
    const currentStatus = getNotificationPermissionStatus();

    // If notification is already granted AND audio enabled, don't show
    if (isAlreadyEnabled && currentStatus === 'granted') {
      return;
    }

    if (isDismissedThisSession) {
      return;
    }

    // Show after a gentle 1.5s delay after page load so user sees the interface first
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleEnableAlerts = async () => {
    setIsActivating(true);
    try {
      // 1. Request Browser System Notification Permission
      const perm = await requestNotificationPermission();

      // 2. Unlock AudioContext & play test chime on user click (Crucial for Mobile Chrome & Safari)
      unlockAudioPlayback(true);

      // 3. Trigger tactile mobile vibration if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      // 4. Persist user choice in localStorage
      localStorage.setItem('ai_news_sound_permission_enabled_v1', 'true');
      localStorage.setItem('ai_news_sound_notice_dismissed_v1', 'true');

      setIsSuccess(true);

      if (onPermissionGranted) {
        onPermissionGranted();
      }

      window.dispatchEvent(new Event('ai_news_notification_permission_changed'));
      window.dispatchEvent(new Event('ai_news_sound_settings_updated'));

      setTimeout(() => {
        setIsOpen(false);
      }, 1400);
    } catch (err) {
      console.warn('Error enabling notifications/sound:', err);
      // Fallback: still unlock audio
      unlockAudioPlayback(true);
      setIsOpen(false);
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('ai_news_notif_modal_dismissed', 'true');
    } catch {}
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 ring-1 ring-amber-400/20">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">अलर्ट्स व ध्वनि सक्रिय!</h3>
            <p className="text-xs text-emerald-300 font-bold">
              जैसे ही एडमिन कोई खबर स्वीकृत या प्रकाशित करेगा, आपको तुरंत बीप और नोटिफिकेशन मिलेगा।
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
                <Bell className="w-6 h-6 text-slate-950 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  लाइव न्यूज़ और साउंड अलर्ट्स
                </h3>
                <span className="text-[11px] text-amber-300 font-bold">
                  नई स्वीकृत खबर आते ही तुरंत ध्वनि बीप
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              एडमिन द्वारा नई खबर या ब्रेकिंग न्यूज़ को अप्रूव और पब्लिश करते ही आपके फ़ोन में तुरंत ऑडियो अलर्ट और नोटिफिकेशन बजेगा:
            </p>

            <div className="space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="text-amber-400 font-black">🔔</span>
                <span><strong>सामान्य खबर बीप:</strong> नई खबर होम फ़ीड में जुड़ते ही</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="text-red-400 font-black">🚨</span>
                <span><strong>ब्रेकिंग न्यूज़ अलर्ट:</strong> हाई-पिच सायरन चाइम व वाइब्रेशन</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="text-blue-400 font-black">📱</span>
                <span><strong>मोबाइल नोटिफिकेशन:</strong> अन्य ऐप या स्क्रीन पर भी अलर्ट</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleEnableAlerts}
                disabled={isActivating}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4 text-slate-950" />
                <span>{isActivating ? 'सक्रिय हो रहा है...' : '🔔 हाँ, साउंड व अलर्ट्स चालू करें'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer font-bold"
              >
                बाद में याद दिलाएं (Later)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
