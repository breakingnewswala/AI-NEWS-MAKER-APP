import React, { useState, useEffect } from 'react';
import {
  Tv,
  Bell,
  RefreshCw,
  Shield,
  Radio,
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

  const isAdminUser = isUserAdmin(currentUser);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentTier(getUserSubscription().tier);
      setAdminSystemModeState(getAdminSystemMode());
      setTestPlan(getAdminTestPlanTier());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ai_news_admin_view_mode_changed', handleUpdate);
    window.addEventListener('ai_news_admin_test_plan_changed', handleUpdate);
    window.addEventListener('ai_news_user_plan_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ai_news_admin_view_mode_changed', handleUpdate);
      window.removeEventListener('ai_news_admin_test_plan_changed', handleUpdate);
      window.removeEventListener('ai_news_user_plan_updated', handleUpdate);
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
    profile: isHindi ? 'कंट्रोल पैनल' : 'Control Panel',
  };

  const notifications = [
    {
      id: 1,
      title: 'संसद में डिजिटल मीडिया व AI बिल पास',
      time: '10 मिनट पहले',
      unread: true,
    },
    {
      id: 2,
      title: 'मौसम विभाग: दिल्ली-एनसीआर में बारिश का अलर्ट',
      time: '1 घंटा पहले',
      unread: true,
    },
    {
      id: 3,
      title: 'नया ई-पेपर राष्ट्रीय संस्करण उपलब्ध है',
      time: 'आज सुबह 6:00 बजे',
      unread: false,
    },
  ];

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <>
      {/* Admin Test as User Global Top Switcher Banner */}
      {isAdminUser && viewAsMode === 'user' && (
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
                setAdminViewAsMode('admin');
                setViewAsMode('admin');
              }}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-[11px] transition shadow-md cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span>वापस Continue as Admin</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <header className={`bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white ${isAdminUser && viewAsMode === 'user' ? 'relative' : 'sticky top-0'} z-40 shadow-md`}>
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
                {/* Header line: AI News Maker | [Plan] + LIVE Badge */}
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm md:text-base tracking-wide text-white whitespace-nowrap">
                    AI News Maker
                  </span>
                  <span className="text-slate-600 text-xs font-normal">|</span>
                  <span className="px-1.5 py-0.5 bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold rounded-md whitespace-nowrap shadow-xs">
                    {planDisplay}
                  </span>
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black rounded uppercase animate-pulse shadow-sm shadow-red-500/50 shrink-0">
                    LIVE
                  </span>
                </div>

                {/* Subtitle line: Smart Digital News Studio | [Plan] with clear partition separator */}
                <div className="text-[10px] text-slate-300 font-medium hidden sm:flex items-center gap-1.5">
                  <span>Smart Digital News Studio</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300/90 font-bold">{planDisplay}</span>
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
              ⚙️ कंट्रोल पैनल
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selector (हिंदी / English) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'hi'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="ऐप की भाषा हिंदी करें"
              >
                🇮🇳 हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch App Language to English"
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Refresh Button */}
            <button
            onClick={handleRefreshClick}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs transition-colors"
            title="फ़ीड रीफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl relative transition-colors"
              title="सूचनाएं"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950 animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950" />
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    लाइव नोटिफिकेशन्स
                  </h4>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 hover:border-slate-700 transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-200">{n.title}</div>
                      <div className="text-[10px] text-slate-400">{n.time}</div>
                    </div>
                  ))}
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
