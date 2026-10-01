import React, { useState, useEffect } from 'react';
import {
  Tv,
  Bell,
  RefreshCw,
  Shield,
  ExternalLink,
  Sliders,
  Check,
  Flame,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import {
  getUserSubscription,
  isUserAdmin,
  getAdminSystemMode,
  setAdminSystemMode,
  getAdminTestPlanTier,
  PLAN_KEY_MAP,
} from '../lib/userPlanManager';
import { useLanguage } from '../lib/languageContext';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  AppNotification,
} from '../lib/notificationManager';

interface AppTopBarWebProps {
  currentTab: 'home' | 'videos' | 'studio' | 'epaper' | 'profile';
  currentUser: ReporterUser | null;
  onOpenAdminConsole?: () => void;
  onRefresh: () => void;
  onNavigateToTab: (tab: 'home' | 'videos' | 'studio' | 'epaper' | 'profile') => void;
}

export const AppTopBarWeb: React.FC<AppTopBarWebProps> = ({
  currentTab,
  currentUser,
  onRefresh,
  onNavigateToTab,
}) => {
  const { language, setLanguage, isHindi } = useLanguage();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string>(() => {
    return getUserSubscription().tier;
  });
  const [adminSystemMode, setAdminSystemModeState] = useState(() => getAdminSystemMode());
  const [testPlan, setTestPlan] = useState(() => getAdminTestPlanTier());
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>(() => getNotifications());
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermissionStatus());

  const isAdminUser = isUserAdmin(currentUser);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentTier(getUserSubscription().tier);
      setAdminSystemModeState(getAdminSystemMode());
      setTestPlan(getAdminTestPlanTier());
      setNotificationsList(getNotifications());
      setNotifPermission(getNotificationPermissionStatus());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ai_news_admin_view_mode_changed', handleUpdate);
    window.addEventListener('ai_news_admin_test_plan_changed', handleUpdate);
    window.addEventListener('ai_news_user_plan_updated', handleUpdate);
    window.addEventListener('ai_news_notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ai_news_admin_view_mode_changed', handleUpdate);
      window.removeEventListener('ai_news_admin_test_plan_changed', handleUpdate);
      window.removeEventListener('ai_news_user_plan_updated', handleUpdate);
      window.removeEventListener('ai_news_notifications_updated', handleUpdate);
    };
  }, []);

  // Format plan name for display
  const planDisplay = React.useMemo(() => {
    if (isAdminUser && adminSystemMode === 'test') {
      return `Test: ${PLAN_KEY_MAP[testPlan]}`;
    }
    if (isAdminUser) {
      return 'Admin';
    }
    return PLAN_KEY_MAP[currentTier as any] || 'BASIC';
  }, [isAdminUser, adminSystemMode, testPlan, currentTier]);

  const tabLabels: Record<string, string> = {
    home: isHindi ? 'होम (ताज़ा समाचार)' : 'Home (Live News)',
    videos: isHindi ? 'वीडियो फ़ीड' : 'Video Feed',
    studio: isHindi ? 'ग्राफिक स्टूडियो' : 'Graphic Studio',
    epaper: isHindi ? 'दैनिक ई-पेपर' : 'E-Paper',
    profile: isAdminUser
      ? (isHindi ? 'कंट्रोल पैनल' : 'Control Panel')
      : (isHindi ? 'मेरी प्रोफाइल' : 'My Profile'),
  };

  const unreadCount = notificationsList.filter((n) => n.unread).length;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setNotificationsList(getNotifications());
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <>
      {/* Admin Test as User Global Top Switcher Banner */}
      {isAdminUser && adminSystemMode === 'test' && (
        <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 text-white text-xs px-3 py-1.5 shadow-lg border-b border-purple-500/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-2 py-0.5 bg-purple-500/30 rounded-md text-[10px] font-black uppercase tracking-wider text-purple-200 border border-purple-400/60 shrink-0">
                🧪 Test Mode
              </span>
              <span className="font-medium text-[11px] sm:text-xs text-purple-100 truncate">
                वर्तमान में आप <strong>Test as User</strong> मोड में सामान्य यूज़र अनुभव टेस्ट कर रहे हैं।
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdminSystemMode('admin');
                setAdminSystemModeState('admin');
              }}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-[11px] transition shadow-md cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span>वापस Continue as Admin</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <header className={`bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white ${isAdminUser && adminSystemMode === 'test' ? 'relative' : 'sticky top-0'} z-40 shadow-md`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-2">
            {/* Brand & Logo with Dynamic Plan and Partition Separators */}
            <div
              onClick={() => onNavigateToTab('home')}
              className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-400 via-red-500 to-amber-400 p-[1.5px] shadow-lg shadow-red-950/50 group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/ai_news_maker_logo.png"
                  alt="AI NEWS MAKER Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                {/* Header line: AI News Maker + LIVE Badge (NO duplicate plan name here!) */}
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm md:text-base tracking-wide text-white whitespace-nowrap">
                    AI News Maker
                  </span>
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black rounded uppercase animate-pulse shadow-sm shadow-red-500/50 shrink-0">
                    LIVE
                  </span>
                </div>

                {/* Subtitle line: Smart Digital News Studio | Plan Name (Shown only once) */}
                <div className="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                  <span className="text-amber-300 font-bold truncate max-w-[170px] sm:max-w-none">
                    {isHindi ? 'स्मार्ट डिजिटल न्यूज़ स्टूडियो' : 'Smart Digital News Studio'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded whitespace-nowrap shadow-xs">
                    {planDisplay === 'Admin' ? 'एडमिन' : planDisplay}
                  </span>
                </div>
              </div>
            </div>

          {/* Desktop Tab Links (md+) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => onNavigateToTab('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'home'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🏠 होम
            </button>
            <button
              onClick={() => onNavigateToTab('videos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'videos'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🎥 वीडियो फ़ीड
            </button>
            <button
              onClick={() => onNavigateToTab('studio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'studio'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 font-black shadow-md'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🎬 स्टूडियो
            </button>
            <button
              onClick={() => onNavigateToTab('epaper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'epaper'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              📰 ई-पेपर
            </button>
            <button
              onClick={() => onNavigateToTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'profile'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isAdminUser ? '⚙️ कंट्रोल पैनल' : '👤 प्रोफाइल'}
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Refresh Button */}
            <button
            onClick={handleRefreshClick}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs transition-colors"
            title="फ़ीड रीफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Real-time Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl relative transition-colors cursor-pointer"
              title="सूचनाएं"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950 animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950" />
                </>
              )}
            </button>

            {/* Real-time Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    लाइव नोटिफिकेशन्स
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] rounded-full font-black">
                        {unreadCount}
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          const updated = markAllNotificationsAsRead();
                          setNotificationsList(updated);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                      >
                        सब पढ़े
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Permission Request Prompt if not granted */}
                {notifPermission !== 'granted' && (
                  <div className="p-2.5 bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-600/40 rounded-xl flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-amber-200">ताज़ा ब्रेकिंग अलर्ट्स हेतु नोटिफिकेशन चालू करें:</span>
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black rounded-lg cursor-pointer shrink-0 shadow"
                    >
                      अनुमति दें
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notificationsList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">कोई नई सूचना नहीं है</div>
                  ) : (
                    notificationsList.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          setNotificationsList(getNotifications());
                          if (n.linkTab) onNavigateToTab(n.linkTab);
                        }}
                        className={`p-2.5 rounded-xl border space-y-1 transition-colors cursor-pointer ${
                          n.unread
                            ? 'bg-slate-950 border-amber-500/40 hover:border-amber-400'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                            <span>{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                        </div>
                        {n.message && (
                          <div className="text-[11px] text-slate-400 leading-snug">{n.message}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </header>
    </>
  );
};
