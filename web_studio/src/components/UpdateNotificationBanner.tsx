import React from 'react';
import { Sparkles, Download, X, ArrowRight } from 'lucide-react';
import { AppVersionInfo, APP_CURRENT_VERSION } from './AppUpdateModal';

interface UpdateNotificationBannerProps {
  versionInfo: AppVersionInfo | null;
  onOpenUpdateModal: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
}

export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  versionInfo,
  onOpenUpdateModal,
  onDismiss,
  isDismissed,
}) => {
  if (!versionInfo || isDismissed) return null;

  const latestVersion = versionInfo.version || APP_CURRENT_VERSION;
  const isNew = versionInfo.versionCode > 10200 || latestVersion !== APP_CURRENT_VERSION;

  if (!isNew) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 px-3 py-1.5 text-xs font-black flex items-center justify-between shadow-md sticky top-0 z-40 animate-fadeIn">
      <div className="flex items-center gap-2 truncate">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-700"></span>
        </span>
        <span className="truncate">
          🚀 <span className="underline">नया अपडेट v{latestVersion} उपलब्ध है</span>: मॉर्निंग AI व मोबाइल स्प्लिट-स्क्रीन
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenUpdateModal}
          className="px-2.5 py-0.5 bg-neutral-950 hover:bg-neutral-900 text-yellow-400 rounded-full text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow"
        >
          <Download className="w-3 h-3" />
          <span>APK डाउनलोड करें</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-neutral-900 hover:text-black p-0.5 cursor-pointer"
          title="हटाएं"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
