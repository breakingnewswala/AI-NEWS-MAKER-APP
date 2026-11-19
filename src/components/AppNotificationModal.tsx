import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import {
  AppNotificationOptions,
  AppConfirmOptions,
  installGlobalAlertInterceptor,
} from '../lib/notificationService';

export const AppNotificationModal: React.FC = () => {
  const [notification, setNotification] = useState<AppNotificationOptions | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmOptions | null>(null);

  useEffect(() => {
    installGlobalAlertInterceptor();

    const handleNotification = (e: any) => {
      const detail: AppNotificationOptions = e.detail;
      if (!detail || !detail.message) return;
      setNotification(detail);
    };

    const handleConfirm = (e: any) => {
      const detail: AppConfirmOptions = e.detail;
      if (!detail || !detail.message) return;
      setConfirmDialog(detail);
    };

    window.addEventListener('app_central_notification', handleNotification);
    window.addEventListener('app_central_confirm', handleConfirm);

    return () => {
      window.removeEventListener('app_central_notification', handleNotification);
      window.removeEventListener('app_central_confirm', handleConfirm);
    };
  }, []);

  // Auto-dismiss for notification
  useEffect(() => {
    if (!notification) return;
    const duration = notification.duration !== undefined ? notification.duration : 3500;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <>
      {/* 1. Centered Notification Toast / Overlay (Enlarged & 100% Center-Aligned) */}
      {notification && (() => {
        const isNewsPublished = notification.type === 'warning' ||
          Boolean(notification.title?.includes('प्रकाशित') ||
          notification.title?.includes('समाचार') ||
          notification.message?.includes('प्रकाशित') ||
          notification.message?.includes('नई न्यूज') ||
          notification.message?.includes('ताज़ा खबर'));

        return (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div
              className={`pointer-events-auto max-w-lg sm:max-w-xl w-full rounded-3xl shadow-2xl border p-6 sm:p-8 flex flex-col items-center text-center gap-4 backdrop-blur-md transform transition-all duration-300 animate-in zoom-in-95 relative ${
                isNewsPublished
                  ? 'bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border-amber-400 text-white shadow-amber-500/30 ring-1 ring-amber-400/50'
                  : notification.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/80 text-white shadow-emerald-950/50'
                  : notification.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/80 text-white shadow-rose-950/50'
                  : notification.type === 'warning'
                  ? 'bg-slate-900/95 border-amber-500/80 text-white shadow-amber-950/50'
                  : 'bg-slate-900/95 border-cyan-500/80 text-white shadow-cyan-950/50'
              }`}
            >
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="shrink-0 mx-auto">
                {isNewsPublished ? (
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-300 relative shadow-lg">
                    <span className="absolute w-3 h-3 -top-1 -right-1 rounded-full bg-amber-400 animate-ping" />
                    <AlertCircle className="w-7 h-7 text-amber-400" />
                  </div>
                ) : notification.type === 'success' ? (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                ) : notification.type === 'error' ? (
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                ) : notification.type === 'warning' ? (
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                    <Info className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                {notification.title && (
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-2">
                    {isNewsPublished && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-400 text-slate-950 rounded font-black uppercase">
                        नया अपडेट
                      </span>
                    )}
                    <span>{notification.title}</span>
                  </h4>
                )}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold whitespace-pre-line max-w-md mx-auto">
                  {notification.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotification(null)}
                className="mt-1 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
              >
                ठीक है (OK)
              </button>
            </div>
          </div>
        );
      })()}

      {/* 2. Centered Confirmation Dialog - 100% Center Aligned (Logo, Info & Buttons) */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl max-w-sm sm:max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-center flex flex-col items-center">
            {/* Top Centered Logo */}
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-500/50 p-2 flex items-center justify-center shrink-0 shadow-xl mx-auto">
              {confirmDialog.channelLogo ? (
                <img
                  src={confirmDialog.channelLogo}
                  alt="Channel Logo"
                  className="w-full h-full object-contain rounded"
                  onError={(e: any) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className={`w-full h-full rounded-xl flex items-center justify-center ${
                    confirmDialog.isDestructive
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {confirmDialog.isDestructive ? (
                    <AlertTriangle className="w-8 h-8" />
                  ) : (
                    <HelpCircle className="w-8 h-8" />
                  )}
                </div>
              )}
            </div>

            {/* Centered Title and Message */}
            <div className="space-y-2 text-center w-full">
              <h3 className="text-base sm:text-lg font-black text-white text-center">
                {confirmDialog.title || 'कार्रवाई की पुष्टि करें'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-center font-medium max-w-xs mx-auto">
                {confirmDialog.message}
              </p>
            </div>

            {/* Bottom Centered Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2 w-full">
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
              >
                {confirmDialog.cancelText || 'रद्द करें'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-black rounded-xl shadow-lg transition cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
                }`}
              >
                {confirmDialog.confirmText || 'हाँ, पुष्टि करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
