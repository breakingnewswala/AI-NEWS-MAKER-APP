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
      {/* 1. Centered Notification Toast / Overlay */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4"
        >
          <div
            className={`pointer-events-auto max-w-md w-full rounded-2xl shadow-2xl border p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-md transform transition-all duration-300 animate-in fade-in zoom-in-95 ${
              notification.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/80 text-white shadow-emerald-950/50'
                : notification.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/80 text-white shadow-rose-950/50'
                : notification.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/80 text-white shadow-amber-950/50'
                : 'bg-slate-900/95 border-cyan-500/80 text-white shadow-cyan-950/50'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {notification.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : notification.type === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : notification.type === 'warning' ? (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Info className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {notification.title && (
                <h4 className="text-sm font-bold text-white mb-1">
                  {notification.title}
                </h4>
              )}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="बंद करें"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Centered Confirmation Dialog */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-1">
                  {confirmDialog.title || 'कार्रवाई की पुष्टि करें'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                {confirmDialog.cancelText || 'रद्द करें'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
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
