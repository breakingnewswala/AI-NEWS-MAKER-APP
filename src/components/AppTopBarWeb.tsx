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
  FileSpreadsheet,
  Smartphone,
  Coins,
  LogOut,
  Volume2,
  VolumeX,
  HelpCircle,
} from 'lucide-react';
import { AppGuideModal } from './AppGuideModal';
import { ReporterUser } from './LoginModal';
import { ThemeToggle } from './ThemeToggle';
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
  fetchNotificationsFromServer,
  AppNotification,
  getSoundSettings,
  saveSoundSettings,
  playNormalNotificationSound,
  playBreakingNewsAlertSound,
  AppSoundSettings,
} from '../lib/notificationManager';
import { getApiUrl } from '../lib/apiConfig';

interface AppTopBarWebProps {
  currentTab: string;
  currentUser: ReporterUser | null;
  onOpenAdminConsole?: () => void;
  onOpenGoogleSheets?: () => void;
  onOpenAppUpdate?: () => void;
  onRefresh: () => void;
  onNavigateToTab: (tab: any) => void;
  onLogout?: () => void;
}

export const AppTopBarWeb: React.FC<AppTopBarWebProps> = ({
  currentTab,
  currentUser,
  onOpenGoogleSheets,
  onOpenAppUpdate,
  onRefresh,
  onNavigateToTab,
  onLogout,
}) => {
  const { language, setLanguage, isHindi } = useLanguage();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [soundSettings, setSoundSettings] = useState<AppSoundSettings>(() => getSoundSettings());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string>(() => {
    return getUserSubscription().tier;
  });
  const [adminSystemMode, setAdminSystemModeState] = useState(() => getAdminSystemMode());
  const [testPlan, setTestPlan] = useState(() => getAdminTestPlanTier());
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>(() => getNotifications());
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermissionStatus());
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const isAdminUser = isUserAdmin(currentUser);

  const isHome = currentTab === 'home';
  const isVideos = currentTab === 'videos';
  const isStudio = currentTab === 'studio' || currentTab === 'generator';
  const isNewsroom = currentTab === 'newsroom' || currentTab === 'drafts';
  const isControlPanel = currentTab === 'profile' || currentTab === 'export';

  useEffect(() => {
    fetchNotificationsFromServer(currentUser?.email).then((list) => {
      setNotificationsList(list);
    });

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
    window.addEventListener('ai_news_notification_permission_changed', handleUpdate);
    (window as any).onNotificationPermissionResult = (status: string) => {
      setNotifPermission(status as NotificationPermission | 'unsupported');
      window.dispatchEvent(new Event('ai_news_notification_permission_changed'));
    };
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ai_news_admin_view_mode_changed', handleUpdate);
      window.removeEventListener('ai_news_admin_test_plan_changed', handleUpdate);
      window.removeEventListener('ai_news_user_plan_updated', handleUpdate);
      window.removeEventListener('ai_news_notifications_updated', handleUpdate);
      window.removeEventListener('ai_news_notification_permission_changed', handleUpdate);
    };
  }, [currentUser?.email]);

  // Wallet Coin Balance for Authenticated Users (Real-time sync)
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState<boolean>(true);

  useEffect(() => {
    const email = (currentUser?.email || '').toLowerCase().trim();
    const userId = (currentUser?.userId || (currentUser as any)?.uid || email).trim();
    if (!email && !userId) {
      setIsWalletLoading(false);
      return;
    }

    const fetchBalance = () => {
      fetch(getApiUrl(`/api/user/wallet?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`))
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.wallet) {
            setWalletBalance(data.wallet.coinBalance ?? 0);
            setIsWalletLoading(false);
          }
        })
        .catch(() => {
          setIsWalletLoading(false);
        });
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    const handleWalletEvent = () => fetchBalance();

    window.addEventListener('ai_news_wallet_updated', handleWalletEvent);
    window.addEventListener('wallet_balance_updated', handleWalletEvent);
    window.addEventListener('storage', handleWalletEvent);
    window.addEventListener('focus', handleWalletEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ai_news_wallet_updated', handleWalletEvent);
      window.removeEventListener('wallet_balance_updated', handleWalletEvent);
      window.removeEventListener('storage', handleWalletEvent);
      window.removeEventListener('focus', handleWalletEvent);
    };
  }, [currentUser?.email, (currentUser as any)?.userId, (currentUser as any)?.uid]);

  // Format plan name for display
  const planDisplay = React.useMemo(() => {
    if (isAdminUser && adminSystemMode === 'test') {
      return `Test: ${PLAN_KEY_MAP[testPlan]}`;
    }
    if (isAdminUser) {
      return 'Admin';
    }
    return (PLAN_KEY_MAP as Record<string, string>)[currentTier] || 'BASIC';
  }, [isAdminUser, adminSystemMode, testPlan, currentTier]);

  const tabLabels: Record<string, string> = {
    home: isHindi ? 'होम (ताज़ा समाचार)' : 'Home (Live News)',
    videos: isHindi ? 'वीडियो एंड रील्स' : 'Videos & Reels',
    studio: isHindi ? 'ग्राफिक फोटो स्टूडियो' : 'Graphic Photo Studio',
    epaper: isHindi ? 'दैनिक ई-पेपर' : 'E-Paper',
    profile: isAdminUser
      ? (isHindi ? 'कंट्रोल रूम' : 'Control Room')
      : (isHindi ? 'मेरी प्रोफाइल' : 'My Profile'),
  };

  const unreadCount = notificationsList.filter((n) => n.unread).length;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    setNotificationsList(getNotifications());
    try {
      if (onRefresh) {
        await onRefresh();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  return (
    <>
      <header
        className={`bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-white ${
          isAdminUser && adminSystemMode === 'test' ? 'relative' : 'sticky top-0'
        } z-40 shadow-sm dark:shadow-md transition-colors ${isStudio ? 'hidden md:block' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className={`h-14 flex items-center ${isStudio ? 'justify-center md:justify-between' : 'justify-between'} gap-2`}>
            {/* Brand & Logo */}
            <div
              onClick={() => onNavigateToTab('home')}
              className={`items-center gap-2.5 cursor-pointer select-none group shrink-0 ${isStudio ? 'hidden md:flex' : 'flex'}`}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-400 via-red-500 to-amber-400 p-[1.5px] shadow-md shadow-red-950/20 group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden ring-2 ring-amber-400/30">
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
                {/* Header line: AI News Maker + LIVE Badge + Guide Button */}
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm md:text-base tracking-wide text-slate-900 dark:text-white whitespace-nowrap">
                    AI News Maker
                  </span>
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black rounded uppercase animate-pulse shadow-sm shadow-red-500/50 shrink-0">
                    LIVE
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsGuideOpen(true);
                    }}
                    className="p-1 rounded-full bg-slate-100 hover:bg-amber-100 dark:bg-slate-800/90 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400/50 transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
                    title="ऐप कैसे उपयोग करें? (मार्गदर्शिका / User Guide)"
                    aria-label="ऐप कैसे उपयोग करें"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                  <span className="text-amber-600 dark:text-amber-300 font-bold truncate max-w-[170px] sm:max-w-none">
                    {isHindi ? 'स्मार्ट डिजिटल न्यूज़ स्टूडियो' : 'Smart Digital News Studio'}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Tab Links (md+) - Exact 5 Primary Options */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-1 shrink-0 shadow-xs">
              <button
                onClick={() => onNavigateToTab('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isHome
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                🏠 होम
              </button>
              <button
                onClick={() => onNavigateToTab('videos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isVideos
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                🎬 वीडियो एंड रील्स
              </button>
              <button
                onClick={() => onNavigateToTab('studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isStudio
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1 ring-amber-300/40'
                    : 'text-amber-700 dark:text-amber-300 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-slate-800'
                }`}
              >
                🎨 स्टूडियो
              </button>
              <button
                onClick={() => onNavigateToTab('newsroom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isNewsroom
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                📰 न्यूज़ रूम
              </button>
              <button
                onClick={() => onNavigateToTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isControlPanel
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {isAdminUser ? '⚙️ कंट्रोल रूम' : '👤 प्रोफाइल'}
              </button>
            </nav>

            {/* Right Action Icons - Full on Desktop, hidden in Mobile Studio */}
            <div className={`items-center gap-1.5 sm:gap-2 shrink-0 ${isStudio ? 'hidden md:flex' : 'flex'}`}>
              {/* Wallet Coin Balance Button - Hide unconditionally for admin */}
              {!isAdminUser && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToTab('profile');
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open_rewards_wallet'));
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink max-w-[85px] sm:max-w-none overflow-hidden"
                  title="रिवॉर्ड्स वॉलेट व कॉइन बैलेंस"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="font-mono font-black min-w-[16px] text-center truncate">
                    {walletBalance !== null ? walletBalance : (isWalletLoading ? '···' : '0')}
                  </span>
                  <span className="text-[10px] hidden sm:inline">कॉइन्स</span>
                </button>
              )}

              {/* Refresh Button - Hidden on Control Panel, Studio, and Newsroom */}
              {!isControlPanel && currentTab !== 'studio' && currentTab !== 'newsroom' && (
                <button
                  onClick={handleRefreshClick}
                  className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-bold shrink-0 shadow-xs"
                  title="फ़ीड रीफ्रेश करें"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
                  <span>रिफ्रेश</span>
                </button>
              )}

              {/* Theme Switcher Toggle (Light & Dark Mode) */}
              <ThemeToggle />

              {/* Admin Mode / Test Mode Switcher: EXCLUSIVELY on Mobile Header in Control Panel */}
              {isAdminUser && isControlPanel && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = adminSystemMode === 'admin' ? 'test' : 'admin';
                    setAdminSystemMode(nextMode);
                    setAdminSystemModeState(nextMode);
                  }}
                  className={`md:hidden px-2 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-xs ${
                    adminSystemMode === 'test'
                      ? 'bg-purple-600/90 hover:bg-purple-500 text-white border-purple-400'
                      : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 text-amber-600 dark:text-amber-400 border-slate-300 dark:border-slate-700/80 hover:border-amber-400/50'
                  }`}
                  title={adminSystemMode === 'test' ? 'टेस्ट मोड सक्रिय - एडमिन मोड में बदलें' : 'एडमिन मोड - टेस्ट मोड में बदलें'}
                >
                  {adminSystemMode === 'test' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span>🧪 टेस्ट</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ एडमिन</span>
                    </>
                  )}
                </button>
              )}

              {/* Mobile Header: Logout beside Admin Switcher when on Control Panel / Profile */}
              {isControlPanel && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="md:hidden px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/80 hover:bg-red-100 dark:hover:bg-red-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                  title="लॉगआउट"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>लॉगआउट</span>
                </button>
              )}

              {/* Real-time Notifications */}
              <div className={`relative ${isControlPanel && isAdminUser ? 'hidden md:block' : ''}`}>
                <button
                  onClick={() => {
                    const next = !showNotifications;
                    setShowNotifications(next);
                    if (next) {
                      fetchNotificationsFromServer(currentUser?.email).then((list) => {
                        setNotificationsList(list);
                      });
                    }
                  }}
                  className="p-2 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl relative transition-colors cursor-pointer shadow-xs"
                  title="सूचनाएं"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px]">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 pointer-events-none motion-reduce:hidden" />
                      <span className="relative min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-950 shadow-md">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {/* Real-time Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
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
                              const updated = markAllNotificationsAsRead(currentUser?.email);
                              setNotificationsList(updated);
                            }}
                            className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                          >
                            सब पढ़े
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Sound Settings & Controls */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          {soundSettings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                          <span>ध्वनि अलर्ट</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = saveSoundSettings({ soundEnabled: !soundSettings.soundEnabled });
                            setSoundSettings(updated);
                            if (updated.soundEnabled) playNormalNotificationSound();
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                            soundSettings.soundEnabled
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {soundSettings.soundEnabled ? 'चालू' : 'बंद'}
                        </button>
                      </div>

                      {soundSettings.soundEnabled && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80 text-[10px]">
                          <div>
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                              <span>सामान्य पिंग</span>
                              <button
                                type="button"
                                onClick={() => playNormalNotificationSound()}
                                className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                टेस्ट
                              </button>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={soundSettings.normalVolume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                const updated = saveSoundSettings({ normalVolume: v });
                                setSoundSettings(updated);
                              }}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                              <span>ब्रेकिंग अलर्ट चाइम</span>
                              <button
                                type="button"
                                onClick={() => playBreakingNewsAlertSound()}
                                className="text-red-500 hover:underline cursor-pointer font-bold"
                              >
                                टेस्ट
                              </button>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={soundSettings.breakingVolume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                const updated = saveSoundSettings({ breakingVolume: v });
                                setSoundSettings(updated);
                              }}
                              className="w-full accent-red-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Permission Request Prompt if not granted */}
                    {notifPermission !== 'granted' && (
                      <div className="p-2.5 bg-gradient-to-r from-amber-100 dark:from-amber-950/60 to-slate-100 dark:to-slate-900 border border-amber-300 dark:border-amber-600/40 rounded-xl flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-amber-900 dark:text-amber-200 font-medium">ताज़ा ब्रेकिंग अलर्ट्स हेतु नोटिफिकेशन चालू करें:</span>
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
                        <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">कोई नई सूचना नहीं है</div>
                      ) : (
                        notificationsList.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              setNotificationsList(getNotifications());
                              if ((n as any).newsId || (n as any).postId) {
                                const targetNewsId = (n as any).newsId || (n as any).postId;
                                window.dispatchEvent(new CustomEvent('ai_news_open_specific_post', { detail: { newsId: targetNewsId } }));
                              } else if ((n as any).videoId) {
                                window.dispatchEvent(new CustomEvent('ai_news_open_specific_video', { detail: { videoId: (n as any).videoId } }));
                              } else if (n.linkTab) {
                                onNavigateToTab(n.linkTab);
                              }
                              setShowNotifications(false);
                            }}
                            className={`p-2.5 rounded-xl border space-y-1 transition-colors cursor-pointer ${
                              n.unread
                                ? 'bg-amber-50/70 dark:bg-slate-950 border-amber-400/60 dark:border-amber-500/40 hover:border-amber-500'
                                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                                <span>{n.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{n.time}</span>
                            </div>
                            {n.message && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{n.message}</div>
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

        {/* User Guide Modal */}
        <AppGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
          onSelectStep={() => {
            setIsGuideOpen(false);
            onNavigateToTab('studio');
          }}
        />
      </header>
    </>
  );
};
