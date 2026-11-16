/**
 * Centralized Application Notification & Confirmation Service
 * Replaces browser-native alert() and confirm() dialogs with a clean,
 * viewport-centered, dark-themed UI matching AI News Maker design system.
 */

export type AppNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotificationOptions {
  type?: AppNotificationType;
  title?: string;
  message: string;
  duration?: number; // ms, defaults to 3500ms for success/info, 0 for sticky
}

export interface AppConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showAppNotification(options: AppNotificationOptions | string) {
  if (typeof window === 'undefined') return;
  const payload: AppNotificationOptions = typeof options === 'string'
    ? { message: options, type: 'info' }
    : options;

  window.dispatchEvent(new CustomEvent('app_central_notification', { detail: payload }));
}

export function showAppSuccess(message: string, title?: string, duration = 3500) {
  showAppNotification({ type: 'success', title, message, duration });
}

export function showAppError(message: string, title?: string, duration = 5000) {
  showAppNotification({ type: 'error', title, message, duration });
}

export function showAppWarning(message: string, title?: string, duration = 4500) {
  showAppNotification({ type: 'warning', title, message, duration });
}

export function showAppConfirm(options: AppConfirmOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app_central_confirm', { detail: options }));
}

/**
 * Installs seamless global interception for any un-migrated window.alert calls
 * so that third-party or legacy alerts automatically render as centered modals.
 */
let isInterceptInstalled = false;
export function installGlobalAlertInterceptor() {
  if (typeof window === 'undefined' || isInterceptInstalled) return;
  isInterceptInstalled = true;

  const originalAlert = window.alert;
  window.alert = function (msg?: any) {
    const text = String(msg ?? '');
    // Determine type from message contents
    const isSuccess = text.includes('सफलतापूर्वक') || text.includes('✓') || text.includes('✅') || text.includes('बधाई');
    const isError = text.includes('त्रुटि') || text.includes('विफल') || text.includes('समस्या') || text.includes('अमान्य') || text.includes('❌');
    const isWarning = text.includes('कृपया') || text.includes('अनिवार्य') || text.includes('चेतावनी') || text.includes('⚠️');

    showAppNotification({
      type: isSuccess ? 'success' : isError ? 'error' : isWarning ? 'warning' : 'info',
      message: text,
      duration: isSuccess ? 3500 : 5000,
    });
  };
}
