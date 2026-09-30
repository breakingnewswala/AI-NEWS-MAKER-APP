import React, { useState, useEffect } from 'react';
import { NewsCardData, AIAnalysisResult, ChannelProfile, FrameDesign } from './types';
import { INITIAL_PRESETS, PLACEHOLDER_NEWS_IMG } from './data/presets';
import { CardPreview } from './components/CardPreview';
import { CardEditor } from './components/CardEditor';
import { AIGenerateImageModal } from './components/AIGenerateImageModal';
import { NewsCommandModal } from './components/NewsCommandModal';
import { CaptionModal } from './components/CaptionModal';
import { LoginModal, ReporterUser } from './components/LoginModal';
import { AppGuideModal } from './components/AppGuideModal';
import { AppUpdateModal, AppVersionInfo, APP_CURRENT_VERSION } from './components/AppUpdateModal';
import { CloudSettingsModal } from './components/CloudSettingsModal';
import { ChannelOnboardingModal } from './components/ChannelOnboardingModal';
import { AuthWelcomeScreen } from './components/AuthWelcomeScreen';
import { getApiUrl, getApiBaseUrl } from './lib/apiConfig';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { StepNavigator, scrollToStepById, DEFAULT_STEPS } from './components/StepNavigator';
import { renderCardToCanvas, generateCardCanvas, downloadCanvas } from './lib/CanvasExporter';
import { extractLeaderFromHeadline } from './lib/speakerUtils';
import { generateGraphicDownloadFileName, getFormattedHindiDate } from './lib/dateUtils';
import { getProfileHeaderFooter } from './lib/profileConfig';
import {
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Share2,
  FileImage,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  LogOut,
  Sliders,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  Youtube,
  Cloud,
  Globe,
  Tv,
  Film,
  Palette,
  Newspaper,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VideoStudioWeb } from './components/VideoStudioWeb';
import { FRAME_OPTIONS } from './lib/HeaderDesigns';
import { AutoFillNewsData } from './components/InlineAiNewsTools';
import { AppTopBarWeb } from './components/AppTopBarWeb';
import { AppBottomBarWeb } from './components/AppBottomBarWeb';
import { HomeScreenWeb } from './components/HomeScreenWeb';
import { VideosScreenWeb } from './components/VideosScreenWeb';
import { EPaperScreenWeb } from './components/EPaperScreenWeb';
import { ProfileScreenWeb } from './components/ProfileScreenWeb';
import {
  NewsFeedPost,
  VideoFeedItem,
  INITIAL_NEWS_POSTS,
  INITIAL_VIDEOS,
  INITIAL_CATEGORIES,
} from './data/newsFeedData';

type AppTab = 'home' | 'videos' | 'studio' | 'epaper' | 'profile';

const STORAGE_KEY = 'breaking_news_card_state_v3';

export const STUDIO_STEPS = [
  { step: 1, id: 'step-frame', label: 'फ्रेम्स', name: 'फ्रेम्स', icon: '🖼️', title: 'फ्रेम्स' },
  { step: 2, id: 'step-ai', label: 'एआई टूल्स', name: 'एआई टूल्स', icon: '🤖', title: 'एआई टूल्स' },
  { step: 3, id: 'step-headline', label: 'हेडलाइन', name: 'हेडलाइन', icon: '✍️', title: 'हेडलाइन' },
  { step: 4, id: 'step-photo', label: 'फोटो', name: 'फोटो', icon: '📷', title: 'फोटो' },
  { step: 5, id: 'step-location', label: 'लोकेशन', name: 'लोकेशन', icon: '📍', title: 'लोकेशन' },
  { step: 6, id: 'step-date-watermark', label: 'तारीख और वॉटरमार्क', name: 'तारीख और वॉटरमार्क', icon: '📅', title: 'तारीख और वॉटरमार्क' },
  { step: 7, id: 'step-header-footer', label: 'हैडर और फुटर', name: 'हैडर और फुटर', icon: '📜', title: 'हैडर और फुटर' },
  { step: 8, id: 'step-download', label: 'डाउनलोड', name: 'डाउनलोड', icon: '⬇️', title: 'डाउनलोड' },
];

const DEFAULT_REPORTER_USER: ReporterUser = {
  username: 'admin',
  name: 'मुख्य संपादक (Chief Editor)',
  role: 'admin',
  district: 'सेंट्रल डेस्क',
};

function getSavedChannelProfile(): ChannelProfile | null {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.getChannelProfile) {
      const nativeJson = (window as any).AndroidBridge.getChannelProfile();
      if (nativeJson && nativeJson !== '{}') {
        const parsed = JSON.parse(nativeJson);
        if (parsed && (parsed.channelLogoUrl || parsed.channelNameHi)) {
          return {
            channelNameHi: parsed.channelNameHi || 'एआई न्यूज़ मेकर',
            channelNameEn: parsed.channelNameEn || 'AI News Maker',
            channelLogoUrl: parsed.channelLogoUrl || '',
            channelLogoType: parsed.channelLogoType || 'png',
            username: parsed.username || '@BreakingNewsWala',
            mobileNumber: parsed.mobileNumber || '',
            websiteUrl: parsed.websiteUrl || 'ainewsmaker.online',
            showMobileNumber: true,
            socialIcons: {
              youtube: parsed.socialYoutube !== false,
              facebook: parsed.socialFacebook !== false,
              instagram: parsed.socialInstagram !== false,
              whatsapp: parsed.socialWhatsapp !== false,
            },
          };
        }
      }
    }
    const saved = localStorage.getItem('user_channel_profile');
    if (saved) return JSON.parse(saved);
    const userStr = localStorage.getItem('reporter_current_user') || localStorage.getItem('user_profile_data');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u) {
        return {
          channelNameHi: u.channelNameHi || u.channelName || '',
          channelNameEn: u.channelNameEn || '',
          channelLogoUrl: u.channelLogoUrl || u.logoUrl || '',
          channelLogoType: u.channelLogoType || 'png',
          username: u.username || '',
          mobileNumber: u.mobileNumber || u.mobile || '',
          websiteUrl: u.websiteUrl || 'ainewsmaker.online',
          showMobileNumber: true,
          socialIcons: { youtube: true, facebook: true, instagram: true, whatsapp: true },
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  // Only true in native Android APK WebView (via AndroidBridge, file:///android_asset or appassets domain)
  const isAndroidEnvironment = typeof window !== 'undefined' && (
    Boolean((window as any).AndroidBridge) ||
    window.location.protocol === 'file:' ||
    window.location.href.includes('android_asset') ||
    window.location.hostname === 'appassets.androidplatform.net'
  );

  // Active App Tab: In Android WebView it is always 'studio' (Graphic Studio). In browser: check hash or default to 'home'
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      if (isAndroidEnvironment) {
        return 'studio';
      }
      const hash = window.location.hash.replace('#', '');
      if (['home', 'videos', 'studio', 'epaper', 'profile'].includes(hash)) {
        return hash as AppTab;
      }
    }
    return 'home';
  });

  // Listen to browser hash changes (e.g. back/forward or link clicks) to switch tabs reliably
  useEffect(() => {
    if (typeof window === 'undefined' || isAndroidEnvironment) return;
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'videos', 'studio', 'epaper', 'profile'].includes(hash)) {
        setCurrentTab(hash as AppTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAndroidEnvironment]);

  // News feed posts state - auto-migrates from v1 and validates live format
  const [posts, setPosts] = useState<NewsFeedPost[]>(() => {
    try {
      // Remove old legacy v1 cache if present
      localStorage.removeItem('app_news_posts_v1');
      const saved = localStorage.getItem('app_news_posts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify it has fresh data (e.g. contains live-post-1)
          const hasFreshPosts = parsed.some((p: any) => p.id && String(p.id).startsWith('live-post-'));
          if (hasFreshPosts) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_NEWS_POSTS;
  });

  const [isSyncingNews, setIsSyncingNews] = useState(false);

  // Cloud Live Data URLs (Firebase Storage for ai-news-maker-app)
  const CLOUD_STORAGE_NEWS_URL = 'https://firebasestorage.googleapis.com/v0/b/ai-news-maker-app.firebasestorage.app/o/news_database.json?alt=media';
  const CLOUD_STORAGE_UPLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/ai-news-maker-app.firebasestorage.app/o?name=news_database.json';

  // Sync news posts with cloud database (Firebase Storage + Backend API + Static fallback)
  const fetchLiveNews = async () => {
    setIsSyncingNews(true);
    let loaded = false;

    // 1. Try Firebase Storage cloud live database (works 100% on ainewsmaker.online, PWA, mobile)
    try {
      const fbRes = await fetch(`${CLOUD_STORAGE_NEWS_URL}&_t=${Date.now()}`, { cache: 'no-cache' });
      if (fbRes.ok) {
        const data = await fbRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
          try {
            localStorage.setItem('app_news_posts_v2', JSON.stringify(data));
          } catch {}
          loaded = true;
        }
      }
    } catch (err) {
      console.warn('Cloud storage news fetch failed:', err);
    }

    // 2. Try backend API (/api/news-posts)
    if (!loaded) {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/news-posts?_t=${Date.now()}`, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
            setPosts(data.posts);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(data.posts));
            } catch {}
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('API news fetch failed:', err);
      }
    }

    // 3. Try local static /news_database.json fallback
    if (!loaded) {
      try {
        const staticRes = await fetch(`/news_database.json?_t=${Date.now()}`, { cache: 'no-cache' });
        if (staticRes.ok) {
          const data = await staticRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setPosts(data);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(data));
            } catch {}
          }
        }
      } catch {
        // ignore
      }
    }

    setIsSyncingNews(false);
  };

  useEffect(() => {
    fetchLiveNews();
  }, []);

  const syncPostsToServer = (updatedPosts: NewsFeedPost[]) => {
    // 1. Sync to Cloud Storage (Firebase) for ainewsmaker.online
    try {
      fetch(CLOUD_STORAGE_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPosts),
      }).catch((err) => console.warn('Sync to Firebase Storage failed:', err));
    } catch {}

    // 2. Sync to local backend API
    try {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/api/news-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPosts),
      }).catch((err) => console.warn('Sync to backend API failed:', err));
    } catch {}
  };

  const [videos, setVideos] = useState<VideoFeedItem[]>(INITIAL_VIDEOS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  // Authentication session - loads from localStorage or Android native bridge, defaults to Chief Editor
  const [currentUser, setCurrentUser] = useState<ReporterUser>(() => {
    try {
      const saved = localStorage.getItem('reporter_auth_session');
      if (saved) return JSON.parse(saved);
      if ((window as any).AndroidBridge?.getUserSession) {
        const raw = (window as any).AndroidBridge.getUserSession();
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return DEFAULT_REPORTER_USER;
  });

  // Onboarding completion status (Login -> Details setup -> App)
  // In Android app and web, initialized to true so visitors immediately see the Home News Feed
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && isAndroidEnvironment) {
        return true;
      }
      const saved = localStorage.getItem('is_onboarding_completed');
      if (saved === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // Login modal remains closed by default
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalMode, setLoginModalMode] = useState<'user' | 'admin' | 'signup'>('user');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');

  // Studio mode: Graphic Design vs Video Design (Web parity with Android)
  const [studioMode, setStudioMode] = useState<'graphic' | 'video'>('graphic');
  const [studioInitialVideo, setStudioInitialVideo] = useState<string | null>(null);
  const [studioInitialHeadline, setStudioInitialHeadline] = useState<string | null>(null);

  // Mobile editor active step state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [mobileViewMode, setMobileViewMode] = useState<'steps' | 'all'>('steps');

  // Header visibility on scroll for maximum editing space on mobile
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true);

  const scrollToStepControls = () => {
    requestAnimationFrame(() => {
      const workspace = document.getElementById('studio-top-workspace');
      const ctrlArea = document.getElementById('editor-control-area-100w');
      const selectorBar = document.getElementById('studio-type-selector-bar');
      if (!workspace || !ctrlArea) return;

      const topBarHeight = selectorBar && selectorBar.offsetParent !== null ? selectorBar.offsetHeight : 42;
      const currentScrollY = window.scrollY || window.pageYOffset;
      const workspaceRect = workspace.getBoundingClientRect();
      const workspaceAbsoluteTop = workspaceRect.top + currentScrollY;

      // Smoothly scroll so workspace freezes right at header and step controls begin immediately below preview
      const targetScrollY = Math.max(0, Math.round(workspaceAbsoluteTop - topBarHeight));

      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth',
      });
    });
  };

  const handleStepChange = (step: number) => {
    setActiveStep(step);
    setMobileViewMode('steps');
    scrollToStepControls();
  };

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastY;

          if (delta > 8 && currentY > 30) {
            // Scrolling down -> hide navbar & report to Android
            setIsHeaderVisible(false);
            if ((window as any).AndroidBridge?.reportScroll) {
              (window as any).AndroidBridge.reportScroll(currentY, true);
            }
          } else if (delta < -8 || currentY <= 15) {
            // Scrolling up or at the top -> show navbar
            setIsHeaderVisible(true);
            if ((window as any).AndroidBridge?.reportScroll) {
              (window as any).AndroidBridge.reportScroll(currentY, false);
            }
          }

          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize with persisted state or default preset with fixed 33px font & locked theme
  const [card, setCard] = useState<NewsCardData>(() => {
    const savedProfile = getSavedChannelProfile();
    let initial: NewsCardData = {
      ...INITIAL_PRESETS[0],
      headlineFontSize: 20,
      showDate: true,
      dateStr: getFormattedHindiDate(),
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        initial = {
          ...initial,
          ...parsed,
          headlineFontSize: parsed.headlineFontSize || 20,
          showDate: parsed.showDate !== undefined ? parsed.showDate : true,
          dateStr: parsed.dateStr || getFormattedHindiDate(),
        };
      }
    } catch (e) {
      console.warn('Could not read saved state from localStorage', e);
    }

    if (savedProfile) {
      const activeSocialKeys = Object.entries(savedProfile.socialIcons || {})
        .filter(([_, active]) => active)
        .map(([key]) => key);

      initial = {
        ...initial,
        brandName: savedProfile.channelNameHi || initial.brandName,
        brandTagline: savedProfile.channelNameEn || initial.brandTagline,
        channelNameHi: savedProfile.channelNameHi,
        channelNameEn: savedProfile.channelNameEn,
        customLogoUrl: savedProfile.channelLogoUrl || initial.customLogoUrl,
        customHeaderPng: (savedProfile as any).customHeaderPng || initial.customHeaderPng,
        customFooterPng: (savedProfile as any).customFooterPng || initial.customFooterPng,
        channelLogoType: savedProfile.channelLogoType,
        socialHandle: savedProfile.username
          ? savedProfile.username.startsWith('@')
            ? savedProfile.username
            : `@${savedProfile.username}`
          : initial.socialHandle,
        whatsappNumber: savedProfile.mobileNumber || initial.whatsappNumber,
        websiteUrl: savedProfile.websiteUrl || initial.websiteUrl,
        showMobileNumber: savedProfile.showMobileNumber,
        activeSocialIcons: activeSocialKeys,
        highlightColor: savedProfile.highlightColor || initial.highlightColor || '#FFE600',
        showMasterBranding: savedProfile.showMasterBranding !== false,
        footerBgColor: savedProfile.footerBgColor || initial.footerBgColor || '#FFFFFF',
        footerTextColor: savedProfile.footerTextColor || initial.footerTextColor,
        footerIconStyle: savedProfile.footerIconStyle || initial.footerIconStyle || 'color',
        headlineFontFamily: savedProfile.headlineFontFamily || initial.headlineFontFamily || 'Baloo 2',
      };
    }

    return initial;
  });

  // Listen to profile updates from Profile / Control Panel tab in real-time
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      if (e.detail) {
        setCard((prev) => ({
          ...prev,
          brandName: e.detail.channelNameHi || prev.brandName,
          brandTagline: e.detail.channelNameEn || prev.brandTagline,
          customLogoUrl: e.detail.channelLogoUrl || prev.customLogoUrl,
          customHeaderPng: e.detail.customHeaderPng !== undefined ? e.detail.customHeaderPng : prev.customHeaderPng,
          customFooterPng: e.detail.customFooterPng !== undefined ? e.detail.customFooterPng : prev.customFooterPng,
          socialHandle: e.detail.username ? (e.detail.username.startsWith('@') ? e.detail.username : `@${e.detail.username}`) : prev.socialHandle,
          websiteUrl: e.detail.websiteUrl || prev.websiteUrl,
          whatsappNumber: e.detail.mobileNumber || prev.whatsappNumber,
        }));
      }
    };
    window.addEventListener('channel_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('channel_profile_updated', handleProfileUpdated);
  }, []);

  // Handle saving channel profile
  const handleSaveProfile = (profile: ChannelProfile) => {
    localStorage.setItem('user_channel_profile', JSON.stringify(profile));
    const activeSocialKeys = Object.entries(profile.socialIcons || {})
      .filter(([_, active]) => active)
      .map(([key]) => key);

    setCard((prev) => ({
      ...prev,
      brandName: profile.channelNameHi || prev.brandName,
      brandTagline: profile.channelNameEn || prev.brandTagline,
      channelNameHi: profile.channelNameHi,
      channelNameEn: profile.channelNameEn,
      customLogoUrl: profile.channelLogoUrl || prev.customLogoUrl,
      customHeaderPng: (profile as any).customHeaderPng !== undefined ? (profile as any).customHeaderPng : prev.customHeaderPng,
      customFooterPng: (profile as any).customFooterPng !== undefined ? (profile as any).customFooterPng : prev.customFooterPng,
      channelLogoType: profile.channelLogoType,
      socialHandle: profile.username
        ? profile.username.startsWith('@')
          ? profile.username
          : `@${profile.username}`
        : prev.socialHandle,
      whatsappNumber: profile.mobileNumber || prev.whatsappNumber,
      websiteUrl: profile.websiteUrl || prev.websiteUrl,
      showMobileNumber: profile.showMobileNumber,
      activeSocialIcons: activeSocialKeys,
      highlightColor: profile.highlightColor || prev.highlightColor || '#FFE600',
      showMasterBranding: profile.showMasterBranding !== false,
      footerBgColor: profile.footerBgColor || prev.footerBgColor || '#FFFFFF',
      footerTextColor: profile.footerTextColor || prev.footerTextColor,
      footerIconStyle: profile.footerIconStyle || prev.footerIconStyle || 'color',
      headlineFontFamily: profile.headlineFontFamily || prev.headlineFontFamily || 'Baloo 2',
    }));

    setIsOnboardingOpen(false);
    showToast('✅ चैनल प्रोफ़ाइल व ब्रांडिंग सफलतापूर्वक लागू की गई!');
  };

  const handleLogout = () => {
    localStorage.removeItem('reporter_auth_session');
    localStorage.removeItem('is_onboarding_completed');
    setCurrentUser(null);
    setIsOnboardingCompleted(false);
    setIsUserMenuOpen(false);
    showToast('लॉगआउट सफल! कृपया पुनः लॉगिन करें');
  };

  // Save to localStorage whenever card changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
    } catch (e) {
      // localStorage may fail if large data-urls exceed quota
    }
  }, [card]);

  // Synchronize card with saved channel profile whenever opening studio tab
  useEffect(() => {
    if (currentTab === 'studio') {
      const savedProfile = getSavedChannelProfile();
      if (savedProfile) {
        const activeSocialKeys = Object.entries(savedProfile.socialIcons || {})
          .filter(([_, active]) => active)
          .map(([key]) => key);
        setCard((prev) => ({
          ...prev,
          brandName: savedProfile.channelNameHi || prev.brandName,
          brandTagline: savedProfile.channelNameEn || prev.brandTagline,
          channelNameHi: savedProfile.channelNameHi,
          channelNameEn: savedProfile.channelNameEn,
          customLogoUrl: savedProfile.channelLogoUrl || prev.customLogoUrl,
          channelLogoType: savedProfile.channelLogoType || prev.channelLogoType,
          socialHandle: savedProfile.username
            ? savedProfile.username.startsWith('@')
              ? savedProfile.username
              : `@${savedProfile.username}`
            : prev.socialHandle,
          whatsappNumber: savedProfile.mobileNumber || prev.whatsappNumber,
          websiteUrl: savedProfile.websiteUrl || prev.websiteUrl,
          showMobileNumber: savedProfile.showMobileNumber !== undefined ? savedProfile.showMobileNumber : prev.showMobileNumber,
          activeSocialIcons: activeSocialKeys.length > 0 ? activeSocialKeys : prev.activeSocialIcons,
        }));
      }
    }
  }, [currentTab]);

  // Automatically apply profile-configured Header/Footer settings for the active template
  useEffect(() => {
    const profileConfig = getProfileHeaderFooter(card.frameDesign);
    if (profileConfig && profileConfig.isConfigured) {
      setCard((prev) => ({
        ...prev,
        brandName: profileConfig.brandName !== undefined && profileConfig.brandName !== '' ? profileConfig.brandName : prev.brandName,
        brandTagline: profileConfig.brandTagline !== undefined && profileConfig.brandTagline !== '' ? profileConfig.brandTagline : prev.brandTagline,
        customLogoUrl: profileConfig.customLogoUrl !== undefined && profileConfig.customLogoUrl !== '' ? profileConfig.customLogoUrl : prev.customLogoUrl,
        customHeaderPng: profileConfig.customHeaderPng !== undefined && profileConfig.customHeaderPng !== '' ? profileConfig.customHeaderPng : prev.customHeaderPng,
        whatsappNumber: profileConfig.whatsappNumber !== undefined && profileConfig.whatsappNumber !== '' ? profileConfig.whatsappNumber : prev.whatsappNumber,
        socialHandle: profileConfig.socialHandle !== undefined && profileConfig.socialHandle !== '' ? profileConfig.socialHandle : prev.socialHandle,
        newsUpdateBadge: profileConfig.newsUpdateBadge !== undefined && profileConfig.newsUpdateBadge !== '' ? profileConfig.newsUpdateBadge : prev.newsUpdateBadge,
        customFooterPng: profileConfig.customFooterPng !== undefined && profileConfig.customFooterPng !== '' ? profileConfig.customFooterPng : prev.customFooterPng,
      }));
    }
  }, [card.frameDesign]);

  const [isAIAnalyzeOpen, setIsAIAnalyzeOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [commandModalInitialTab, setCommandModalInitialTab] = useState<'link' | 'command'>('link');
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(false);

  // App Version & Update Notification states
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [autoFillNews, setAutoFillNews] = useState<AutoFillNewsData | null>(null);

  // Proactive check on mount for Android Bridge ready and queued news data
  useEffect(() => {
    if ((window as any).AndroidBridge?.onStudioReady) {
      try {
        (window as any).AndroidBridge.onStudioReady();
      } catch (e) {
        console.warn('onStudioReady error:', e);
      }
    }
    try {
      if ((window as any).AndroidBridge?.getPendingNewsData) {
        const raw = (window as any).AndroidBridge.getPendingNewsData();
        if (raw && raw.trim() !== '') {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.url || parsed.title || parsed.summary)) {
            (window as any).onAutoFillNewsLink?.(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading pending news data on mount:', e);
    }
  }, []);

  // Expose bridge functions for Android Native communication
  useEffect(() => {
    (window as any).setStudioTemplate = (templateId: string) => {
      setCard((prev) => ({ ...prev, frameDesign: templateId as any }));
      showToast(`टेम्पलेट लागू किया: ${templateId}`);
    };
    (window as any).selectTemplate = (templateId: string) => {
      setCard((prev) => ({ ...prev, frameDesign: templateId as any }));
      showToast(`टेम्पलेट चुना गया: ${templateId}`);
    };
    (window as any).applyTemplate = (templateId: string) => {
      setCard((prev) => ({ ...prev, frameDesign: templateId as any }));
      showToast(`टेम्पलेट लागू: ${templateId}`);
    };
    (window as any).setStudioJacket = (jacketId: FrameDesign) => {
      setCard((prev) => ({ ...prev, frameDesign: jacketId }));
      showToast(`जैकेट बदला: ${jacketId}`);
    };
    (window as any).updateStudioCard = (data: Partial<NewsCardData>) => {
      setCard((prev) => ({ ...prev, ...data }));
    };
    (window as any).triggerDownload = () => {
      handleDownload();
    };
    (window as any).showStudioGuide = () => {
      setIsGuideModalOpen(true);
    };
    (window as any).resetStudioCard = () => {
      handleResetCard();
    };
    (window as any).setTab = (tab: AppTab) => {
      setCurrentTab(tab);
    };
    (window as any).applyAndroidChannelProfile = (profile: any) => {
      if (profile) {
        handleSaveProfile(profile);
      }
    };
    (window as any).onAutoFillNewsLink = (newsData: AutoFillNewsData) => {
      if (newsData) {
        const effectiveLink = newsData.url || (newsData.title ? `https://breakingnewswala.com/news/${encodeURIComponent(newsData.title.slice(0, 30))}` : 'https://breakingnewswala.com');
        const effectiveLoc = newsData.location || 'मध्य प्रदेश';

        setStudioMode('graphic');

        setCard((prev) => ({
          ...prev,
          headline: newsData.title || prev.headline,
          location: effectiveLoc,
          category: newsData.category || prev.category,
          summary: newsData.summary || prev.summary,
          images: {
            ...prev.images,
            main: newsData.imageUrl || prev.images.main,
          },
        }));

        setAutoFillNews({
          url: effectiveLink,
          title: newsData.title,
          summary: newsData.summary,
          imageUrl: newsData.imageUrl,
          location: effectiveLoc,
          category: newsData.category,
          autoTrigger: true,
          timestamp: Date.now(),
        });

        setCurrentTab('studio');
        setActiveStep(2);
        setTimeout(() => {
          scrollToStepById('step-ai');
        }, 150);

        const captionText = `🚨 ${newsData.title || ''}\n\n📍 स्थान: ${effectiveLoc}\n\n📝 मुख्य विवरण:\n${newsData.summary || ''}\n\n🔗 पूरा समाचार देखें: ${effectiveLink}\n\n#BreakingNews #NewsCard #LiveUpdate @BreakingNewsWala`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(captionText).catch(() => {});
        }

        setToastMessage('✅ खबर AI स्टेप में लोड हुई और हेडलाइन तैयार!');
      }
    };

    // Check if Android Bridge has pending news data already queued
    try {
      if ((window as any).AndroidBridge?.getPendingNewsData) {
        const raw = (window as any).AndroidBridge.getPendingNewsData();
        if (raw && raw.trim() !== '') {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.url || parsed.title || parsed.summary)) {
            const effectiveLink = parsed.url || (parsed.title ? `https://breakingnewswala.com/news/${encodeURIComponent(parsed.title.slice(0, 30))}` : 'https://breakingnewswala.com');
            const effectiveLoc = parsed.location || 'मध्य प्रदेश';

            setCard((prev) => ({
              ...prev,
              headline: parsed.title || prev.headline,
              location: effectiveLoc,
              category: parsed.category || prev.category,
              summary: parsed.summary || prev.summary,
              images: {
                ...prev.images,
                main: parsed.imageUrl || prev.images.main,
              },
            }));

            setAutoFillNews({
              url: effectiveLink,
              title: parsed.title,
              summary: parsed.summary,
              imageUrl: parsed.imageUrl,
              location: effectiveLoc,
              category: parsed.category,
              autoTrigger: true,
              timestamp: Date.now(),
            });

            setCurrentTab('studio');
            setActiveStep(2);
            (window as any).AndroidBridge.clearPendingNewsData?.();
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Screen size detection: strictly distinguish Mobile (<1024px) vs Desktop (>=1024px)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [aiResetKey, setAiResetKey] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchVersionInfo = async () => {
    try {
      const res = await fetch(getApiUrl('/api/app-version'));
      if (res.ok) {
        const data = await res.json();
        if (data.versionInfo) {
          setVersionInfo(data.versionInfo);
          return;
        }
      }
      const staticRes = await fetch(getApiUrl('/version.json'));
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        setVersionInfo(staticData);
      }
    } catch (e) {
      console.warn('Could not fetch version info', e);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
    const interval = setInterval(fetchVersionInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Full reset / clean card to default template matching user specification
  const handleResetCard = () => {
    const freshDate = getFormattedHindiDate();
    setCard((prev) => ({
      ...prev,
      frameDesign: 'jacket-default',
      headline: 'आपकी चुनी गयी खबर को यहां\nपर २-३ लाइन में लिखा जाएगा\nटेम्पलेट्स से पसंदीदा फ्रेम चुनें',
      formattedHeadline: 'आपकी चुनी गयी खबर को यहां\nपर २-३ लाइन में लिखा जाएगा\nटेम्पलेट्स से पसंदीदा फ्रेम चुनें',
      highlightWords: [],
      headlineAlign: 'center',
      location: 'खबर की लोकेशन',
      summary: '',
      images: {
        main: '',
        second: '',
      },
      imagePositions: undefined,
      customFrameOverlayPng: undefined,
      customLogoUrl: '',
      brandName: '',
      brandTagline: '',
      socialHandle: '',
      whatsappNumber: '',
      speakerName: '',
      speakerTitle: '',
      dateStr: freshDate,
      showDate: false,
      showLocation: true,
      showCallout: false,
      calloutTag: '',
      layout: 'single',
    }));

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }

    // Fully reset AI Prompt & Link inputs
    setAiResetKey((prev) => prev + 1);

    showToast('✨ डिफ़ॉल्ट टेम्पलेट रिफ्रेश हो गया!');
  };

  const handleLoginSuccess = (user: ReporterUser) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    showToast(`👋 स्वागत है, ${user.name}!`);

    // Auto-open guide modal on login if not opted out
    try {
      const dontShow = localStorage.getItem('dont_show_app_guide_v1');
      if (!dontShow) {
        setTimeout(() => {
          setIsGuideModalOpen(true);
        }, 500);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleUpdateCard = (updates: Partial<NewsCardData>) => {
    setCard((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Apply AI result from link or command
  const handleApplyAIResult = (result: AIAnalysisResult, photoData?: string) => {
    setCard((prev) => {
      const pickedMain = photoData || result.pickedImages?.main;
      const pickedSecond = result.pickedImages?.second;
      return {
        ...prev,
        headline: result.headline,
        formattedHeadline: result.formattedHeadline || result.headline,
        highlightWords: result.highlightWords || [],
        location: result.location || prev.location,
        summary: result.summary || prev.summary,
        category: result.category || prev.category,
        images: pickedMain
          ? {
              ...prev.images,
              main: pickedMain,
              second: pickedSecond || prev.images.second,
            }
          : prev.images,
        // Always default to single full image for news as explicitly requested by editor
        layout: 'single',
        showAiGenerated:
          result.isAiGeneratedPhoto !== undefined
            ? result.isAiGeneratedPhoto
            : prev.showAiGenerated,
        speakerName:
          result.speakerName ||
          (prev.frameDesign === 'jacket-quote'
            ? extractLeaderFromHeadline(result.headline).name || prev.speakerName
            : prev.speakerName),
        speakerTitle:
          result.speakerTitle ||
          (prev.frameDesign === 'jacket-quote'
            ? extractLeaderFromHeadline(result.headline).title || prev.speakerTitle
            : prev.speakerTitle),
      };
    });
    showToast('✨ Gemini AI द्वारा न्यूज़ हेडलाइन व विवरण लागू किए गए!');
  };

  // Apply AI Generated Image from Headline
  const handleApplyAiGeneratedImage = (imageUrl: string) => {
    setCard((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        main: imageUrl,
      },
      showAiGenerated: true,
    }));
    showToast('✨ AI जनरेटेड फोटो कार्ड के बैकग्राउंड में सेट हो गई!');
  };

  // Export card to High-Res PNG or JPG (with full status, progress & robust blob downloading)
  const handleDownload = async (formatOverride?: 'png' | 'jpeg') => {
    if (downloading) return;
    const fmt: 'png' | 'jpeg' =
      typeof formatOverride === 'string' && (formatOverride === 'png' || formatOverride === 'jpeg')
        ? formatOverride
        : (downloadFormat === 'jpeg' ? 'jpeg' : 'png');
    try {
      setDownloading(true);
      setDownloadProgressText('कैनवास तैयार हो रहा है...');
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = await renderCardToCanvas(card);
      } catch (renderErr) {
        console.warn('renderCardToCanvas fallback to html2canvas:', renderErr);
      }

      if (!canvas) {
        canvas = await generateCardCanvas('news-card-container');
      }

      if (!canvas) {
        throw new Error('Canvas rendering produced an empty result');
      }

      setDownloadProgressText('इमेज एक्सपोर्ट हो रही है...');
      const ext = fmt === 'jpeg' ? '.jpg' : '.png';
      const baseFilename = generateGraphicDownloadFileName().replace(/\.[^/.]+$/, '');
      const filename = `${baseFilename}${ext}`;

      await downloadCanvas(canvas, filename, fmt);

      showToast(`✅ ${fmt === 'jpeg' ? 'JPG' : 'PNG'} 1080x1350 न्यूज़ कार्ड सफलतापूर्वक डाउनलोड हो गया!`);
    } catch (err: any) {
      console.error('Download error:', err);
      showToast('❌ इमेज डाउनलोड करने में त्रुटि हुई, कृपया पुनः प्रयास करें');
    } finally {
      setDownloading(false);
      setDownloadProgressText('');
    }
  };

  // Copy card image to clipboard
  const handleCopyToClipboard = async () => {
    try {
      setDownloading(true);
      const canvas = await renderCardToCanvas(card);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          showToast('📋 इमेज क्लिपबोर्ड में कॉपी हो गई! कहीं भी पेस्ट (Ctrl+V) करें');
          setTimeout(() => setCopied(false), 2500);
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr);
          // Fallback download if clipboard is restricted
          handleDownload();
        } finally {
          setDownloading(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setDownloading(false);
    }
  };

  const updateStudioMode = (mode: 'graphic' | 'video') => {
    setStudioMode(mode);
    try {
      (window as any).AndroidBridge?.onStudioModeChanged?.(mode);
    } catch {}
  };

  // Expose global reset and mode functions so Android native can trigger them
  React.useEffect(() => {
    (window as any).resetNewsStudioCard = () => {
      handleResetCard();
    };
    (window as any).setStudioMode = (mode: 'graphic' | 'video') => {
      setStudioMode(mode);
    };
    (window as any).loadVideoInStudio = (url: string, title?: string) => {
      if (url) setStudioInitialVideo(url);
      if (title) setStudioInitialHeadline(title);
      setStudioMode('video');
    };
    (window as any).setTab = (tab: AppTab) => {
      setCurrentTab(tab);
    };
    (window as any).applyAndroidChannelProfile = (profile: ChannelProfile) => {
      if (profile) {
        handleSaveProfile(profile);
      }
    };
    try {
      if ((window as any).AndroidBridge?.getChannelProfile) {
        const raw = (window as any).AndroidBridge.getChannelProfile();
        if (raw) {
          const parsed = JSON.parse(raw);
          handleSaveProfile(parsed);
        }
      }
    } catch {
      // ignore
    }
    return () => {
      delete (window as any).resetNewsStudioCard;
      delete (window as any).setStudioMode;
      delete (window as any).loadVideoInStudio;
      delete (window as any).setTab;
      delete (window as any).applyAndroidChannelProfile;
    };
  }, []);

  const handleOpenStudioWithNews = (post: NewsFeedPost) => {
    const effectiveLink = post.sourceUrl || (post.id ? `https://breakingnewswala.com/news/${post.id}` : 'https://breakingnewswala.com');
    const effectiveLoc = post.district || post.location || 'मध्य प्रदेश';

    setStudioMode('graphic');

    setCard((prev) => ({
      ...prev,
      headline: post.title,
      location: effectiveLoc,
      category: post.categoryName,
      summary: post.summary,
      images: {
        ...prev.images,
        main: post.imageUrl || prev.images.main,
      },
    }));

    setAutoFillNews({
      url: effectiveLink,
      title: post.title,
      summary: post.summary,
      imageUrl: post.imageUrl,
      location: effectiveLoc,
      category: post.categoryName,
      autoTrigger: true,
      timestamp: Date.now(),
    });

    setCurrentTab('studio');
    setActiveStep(2); // Redirect straight to Step 2 (Step 2A AI Link tool)
    setToastMessage('✅ खबर AI स्टेप में लोड हुई और हेडलाइन तैयार!');
    window.location.hash = 'studio';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      scrollToStepById('step-ai');
    }, 150);

    // Instantly copy social media caption to clipboard
    const captionText = `🚨 ${post.title}\n\n📍 स्थान: ${effectiveLoc}\n\n📝 मुख्य विवरण:\n${post.summary || ''}\n\n🔗 पूरा समाचार देखें: ${effectiveLink}\n\n#BreakingNews #NewsCard #LiveUpdate @BreakingNewsWala`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(captionText).catch(() => {});
    }
  };

  const handleOpenStudioWithVideo = (vid: VideoFeedItem) => {
    setStudioMode('video');
    setStudioInitialVideo(vid.videoUrl || null);
    setStudioInitialHeadline(vid.title);
    setCard((prev) => ({
      ...prev,
      headline: vid.title,
      location: 'लाइव वीडियो डेस्क',
      images: {
        ...prev.images,
        main: vid.thumbnailUrl || prev.images.main,
      },
    }));
    setCurrentTab('studio');
    setActiveStep(1);
    setToastMessage('वीडियो स्टूडियो में लोड हो गया है!');
    window.location.hash = 'studio';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStudioWithEPaper = () => {
    setCard((prev) => ({
      ...prev,
      frameDesign: 'jacket-epaper',
    }));
    setCurrentTab('studio');
    setActiveStep(1);
    setToastMessage('ई-पेपर 2-कॉलम जैकेट एक्टिवेटेड!');
    window.location.hash = 'studio';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNewPost = (newPostData: Omit<NewsFeedPost, 'id' | 'timestamp'>) => {
    const newPost: NewsFeedPost = {
      ...newPostData,
      id: `post-${Date.now()}`,
      timestamp: Date.now(),
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    setToastMessage('खबर सफलतापूर्वक पब्लिश हुई!');
  };

  const handleToggleHighlightNews = (postId: string) => {
    const updated = posts.map((p) => (p.id === postId ? { ...p, breaking: !p.breaking } : p));
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    setToastMessage('खबर का स्टेटस अपडेट हुआ!');
  };

  const handleEditNews = (editedPost: NewsFeedPost) => {
    const updated = posts.map((p) => (p.id === editedPost.id ? editedPost : p));
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    setToastMessage('खबर सफलतापूर्वक अपडेट हुई!');
  };

  const handleDeleteNews = (postId: string) => {
    const updated = posts.filter((p) => p.id !== postId);
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    setToastMessage('खबर सफलतापूर्वक हटाई गई!');
  };

  const handleAddCategory = (name: string) => {
    const newCat = { id: `cat-${Date.now()}`, name };
    setCategories((prev) => [...prev, newCat]);
    setToastMessage('नई कैटेगरी जोड़ी गई!');
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Step 1 (Login/Signup) & Step 2 (Channel Details Setup) Gate
  if (!currentUser || !isOnboardingCompleted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{toastMessage}</span>
          </div>
        )}
        <AuthWelcomeScreen
          initialStep={!currentUser ? 1 : 2}
          currentUser={currentUser}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            try {
              const profileStr = localStorage.getItem('user_channel_profile');
              const isDone = localStorage.getItem('is_onboarding_completed') === 'true';
              if (profileStr && isDone) {
                const parsed = JSON.parse(profileStr);
                if (parsed?.channelNameHi) {
                  setIsOnboardingCompleted(true);
                  showToast(`स्वागत है, ${user.name}!`);
                  return;
                }
              }
            } catch {
              // proceed to step 2
            }
            showToast('लॉगिन सफल! अब कृपया चैनल डिटेल्स सेट करें');
          }}
          onCompleteDetails={(profile, updatedUser) => {
            handleSaveProfile(profile);
            if (updatedUser) {
              setCurrentUser(updatedUser);
            }
            localStorage.setItem('is_onboarding_completed', 'true');
            setIsOnboardingCompleted(true);
            showToast('✅ चैनल सेटअप पूरा हुआ! स्टूडियो में आपका स्वागत है');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-neutral-950 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-neutral-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation - hidden in Studio tab or when running inside native Android WebView */}
      {!isAndroidEnvironment && currentTab !== 'studio' && (
        <div className="sticky top-0 z-50 transition-all duration-300 translate-y-0 opacity-100">
          <AppTopBarWeb
            currentTab={currentTab}
            currentUser={currentUser}
            onRefresh={() => setToastMessage('फ़ीड रीफ्रेश हो गई है!')}
            onNavigateToTab={(tab) => {
              setCurrentTab(tab);
              window.location.hash = tab;
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* 1. Home Feed Tab */}
      {currentTab === 'home' && (
        <HomeScreenWeb
          posts={posts}
          currentUser={currentUser}
          onOpenStudioWithNews={handleOpenStudioWithNews}
          onOpenAddPostModal={() => {
            setCommandModalInitialTab('manual');
            setIsCommandModalOpen(true);
          }}
          onToggleHighlightNews={handleToggleHighlightNews}
          onEditNews={handleEditNews}
          onDeleteNews={handleDeleteNews}
          onRefreshLiveNews={async () => {
            await fetchLiveNews();
            setToastMessage('लाइव खबरें क्लाउड से सिंक हो गईं!');
          }}
          isSyncingNews={isSyncingNews}
          onOpenAdminLogin={() => {
            setLoginModalMode('admin');
            setIsLoginModalOpen(true);
          }}
        />
      )}

      {/* 2. Videos Feed Tab */}
      {currentTab === 'videos' && (
        <VideosScreenWeb
          videos={videos}
          onOpenStudioWithVideo={handleOpenStudioWithVideo}
        />
      )}

      {/* 3. Studio Tab */}
      {currentTab === 'studio' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-1.5 sm:p-4 pb-48 text-slate-900">
          {/* Studio Type Selector: Compact permanent top navigation */}
          <div id="studio-type-selector-bar" className="w-full sticky top-0 z-40 bg-slate-950 pt-1 pb-1.5 border-b border-neutral-800/80">
            <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-lg max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => updateStudioMode('graphic')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'graphic'
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>ग्राफिक फोटो न्यूज़</span>
              </button>
              <button
                type="button"
                onClick={() => updateStudioMode('video')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'video'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>वीडियो न्यूज़</span>
              </button>
            </div>
          </div>

          {studioMode === 'video' ? (
            <div className="w-full">
              <VideoStudioWeb
                initialVideoUrl={studioInitialVideo || undefined}
                initialHeadline={studioInitialHeadline || undefined}
                onBackToGraphic={() => updateStudioMode('graphic')}
              />
            </div>
          ) : (
            <div className="w-full space-y-3">
              {/* ==================================================
                  1. TOP EDITOR WORKSPACE (100% WIDTH):
                  FIXED LAYOUT: LEFT (LIVE PREVIEW) + RIGHT (VERTICAL STEPS 1-7) SIDE-BY-SIDE
                  SHIFTS RIGHT TO TOP OF SCREEN AND FREEZES THERE
                  ================================================== */}
              <div
                id="studio-top-workspace"
                className="w-full flex flex-row items-stretch gap-2.5 sm:gap-4 min-w-0 sticky top-[42px] z-30 bg-slate-950 pt-1 pb-2 shadow-xl border-b border-neutral-800/80"
              >
                {/* 2. LEFT 65% — LIVE 4:5 GRAPHIC PREVIEW */}
                <div
                  className="w-[65%] shrink-0 flex flex-col bg-neutral-950 p-2 sm:p-4 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden"
                  style={{ minHeight: '380px' }}
                >
                  {/* Top Status Bar with Preview Hide/Show Toggle */}
                  <div className="flex items-center justify-between px-1 mb-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-300 font-bold truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="truncate">लाइव प्रीव्यू</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Hide / Show Preview Button */}
                      <button
                        type="button"
                        onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                        title={isPreviewVisible ? 'प्रीव्यू छुपाएं (नीचे टूल्स के लिए जगह बढ़ाएं)' : 'प्रीव्यू दिखाएं'}
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          isPreviewVisible
                            ? 'bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-emerald-500/30 border border-emerald-400 text-emerald-200 hover:bg-emerald-500/40'
                        }`}
                      >
                        {isPreviewVisible ? (
                          <>
                            <EyeOff className="w-3 h-3 text-amber-300" />
                            <span>प्रीव्यू छुपाएँ</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-emerald-300" />
                            <span>प्रीव्यू दिखाएँ</span>
                          </>
                        )}
                      </button>

                      {isPreviewVisible && (
                        <button
                          type="button"
                          onClick={() => setIsGuideModalOpen(true)}
                          title="ग्राफिक गाइड"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span className="hidden sm:inline">गाइड</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* The Live 4:5 Graphic Preview (Collapsible) */}
                  {isPreviewVisible && (
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden py-1 min-h-[300px] sm:min-h-[440px] transition-all">
                      <div className="w-full h-full max-w-[460px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl ring-1 ring-neutral-800 flex items-center justify-center bg-black">
                        <CardPreview
                          card={card}
                          className="w-full h-full shadow-2xl object-contain"
                          showSafeZone={false}
                          onChange={handleUpdateCard}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar on Preview */}
                  <div className="flex items-center gap-1.5 sm:gap-2 w-full mt-2 pt-2 border-t border-neutral-800/80 shrink-0">
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleDownload('jpeg')}
                        disabled={downloading}
                        className="flex-1 py-2 px-2 sm:px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 min-w-0"
                        title="कार्ड को HD JPG इमेज में डाउनलोड करें"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span className="truncate">{downloading ? (downloadProgressText || 'डाउनलोड...') : 'HD JPG डाउनलोड'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCaptionModalOpen(true)}
                      className="py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="कैप्शन कॉपी करें"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Caption</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetCard}
                      className="py-2 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs rounded-xl border border-neutral-700 shadow flex items-center justify-center cursor-pointer transition-all active:scale-95"
                      title="रीसेट"
                    >
                      <RefreshCw className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* 3. RIGHT 35% — VERTICAL EDITOR STEP NAVIGATION (1 to 7) */}
                <div className="w-[35%] shrink-0 flex flex-col bg-slate-950 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-2xl">
                  {/* Top Bar of Steps */}
                  <div className="flex items-center justify-end pb-2 mb-2 border-b border-slate-800/80">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black">
                      {activeStep} / 8
                    </span>
                  </div>

                  {/* Vertical arrangement of 8 steps */}
                  <div className="flex-1 flex flex-col justify-between gap-1.5 sm:gap-2">
                    {STUDIO_STEPS.map((s) => {
                      const isActive = activeStep === s.step;
                      return (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => handleStepChange(s.step)}
                          className={`w-full py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl font-bold transition-all flex items-center justify-between text-left cursor-pointer active:scale-98 shadow-sm ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 ring-2 ring-amber-300 shadow-lg font-black scale-[1.02]'
                              : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/90 hover:text-white'
                          }`}
                          title={s.label}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                            {/* Step Number Circle */}
                            <span
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-neutral-950 text-amber-400 shadow-sm' : 'bg-neutral-800 text-neutral-300'
                              }`}
                            >
                              {s.step}
                            </span>
                            {/* Label Only (no duplicate numbering) */}
                            <span className="text-xs sm:text-sm truncate font-black">
                              {s.label}
                            </span>
                          </div>

                          {/* Active Indicator Arrow/Dot */}
                          <div className="shrink-0 ml-1">
                            {isActive ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 animate-pulse block" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ==================================================
                  4. BELOW THE TOP WORKSPACE: 100% WIDTH EDITOR CONTROL AREA
                  Spans full screen width. Selected step controls open here!
                  ================================================== */}
              <div id="editor-control-area-100w" className="w-full mt-4 space-y-2">
                {/* Active Step Header Banner */}
                <div className="w-full bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-900 border border-slate-800 rounded-t-2xl px-4 py-3 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-400 text-neutral-950 font-black text-sm flex items-center justify-center shadow">
                      {activeStep}
                    </span>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                        <span>{STUDIO_STEPS.find((s) => s.step === activeStep)?.title || `स्टेप ${activeStep}`}</span>
                      </h2>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        प्रीव्यू स्क्रीन पर तुरंत लाइव अपडेट देखें
                      </p>
                    </div>
                  </div>
                </div>

                {/* 100% WIDTH CONTROLS AREA */}
                <div className="w-full bg-slate-900/80 p-3 sm:p-5 rounded-b-2xl border-x border-b border-slate-800 shadow-2xl">
                  <CardEditor
                    card={card}
                    onChange={handleUpdateCard}
                    onOpenAIAnalyze={() => setIsAIAnalyzeOpen(true)}
                    onOpenCommandModal={(tab = 'link') => {
                      setCommandModalInitialTab(tab);
                      setIsCommandModalOpen(true);
                    }}
                    onOpenCaptionModal={() => setIsCaptionModalOpen(true)}
                    onResetAI={handleResetCard}
                    onDownload={() => handleDownload()}
                    downloading={downloading}
                    activeStep={activeStep}
                    onStepChange={handleStepChange}
                    currentUser={currentUser}
                    mobileViewMode="steps"
                    onToggleMobileViewMode={setMobileViewMode}
                    onOpenCloudSettings={() => setIsCloudModalOpen(true)}
                    onLogout={handleLogout}
                    autoFillNews={autoFillNews}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* 4. E-Paper Tab */}
      {currentTab === 'epaper' && (
        <EPaperScreenWeb
          onOpenStudioWithEPaper={handleOpenStudioWithEPaper}
        />
      )}

      {/* 5. Profile & Control Panel Tab */}
      {currentTab === 'profile' && (
        <ProfileScreenWeb
          currentUser={currentUser}
          onLogout={handleLogout}
          onAddNewPost={handleAddNewPost}
          onOpenStudio={() => {
            setCurrentTab('studio');
            window.location.hash = 'studio';
          }}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Persistent Bottom Bar - hidden when running inside native Android WebView */}
      {!isAndroidEnvironment && (
        <AppBottomBarWeb
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            window.location.hash = tab;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Channel Profile Setup & Branding Modal */}
      <ChannelOnboardingModal
        isOpen={isOnboardingOpen}
        initialProfile={getSavedChannelProfile() || undefined}
        userName={currentUser?.name}
        onSaveProfile={handleSaveProfile}
        onClose={() => setIsOnboardingOpen(false)}
        isClosable={Boolean(getSavedChannelProfile())}
      />

      {/* Cloud, OpenAI & Custom Domain Setup Modal */}
      <CloudSettingsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />

      {/* Manual Reporter Login & Sign Up Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        initialMode={loginModalMode}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenProfileSetup={(user) => {
          setIsOnboardingOpen(true);
        }}
      />

      {/* AI Generate Image from Headline Modal */}
      <AIGenerateImageModal
        isOpen={isAIAnalyzeOpen}
        onClose={() => setIsAIAnalyzeOpen(false)}
        currentHeadline={card.headline}
        aspectRatio={card.aspectRatio}
        onApplyImage={handleApplyAiGeneratedImage}
      />

      {/* News Command & Link Modal */}
      <NewsCommandModal
        key={aiResetKey}
        isOpen={isCommandModalOpen}
        initialTab={commandModalInitialTab}
        templateId={card.frameDesign || 'graphic_001'}
        onClose={() => {
          setIsCommandModalOpen(false);
          setAutoFillNews(null);
        }}
        onApplyResult={handleApplyAIResult}
        autoFillNews={autoFillNews}
      />

      {/* Caption Copy Modal */}
      <CaptionModal
        isOpen={isCaptionModalOpen}
        onClose={() => setIsCaptionModalOpen(false)}
        card={card}
      />

      {/* Step-by-Step Reporter Guide Modal */}
      <AppGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onSelectStep={(step) => {
          setActiveStep(step);
          const stepObj = DEFAULT_STEPS.find((s) => s.step === step);
          if (stepObj) {
            scrollToStepById(stepObj.id);
          }
        }}
      />
    </div>
  );
}
