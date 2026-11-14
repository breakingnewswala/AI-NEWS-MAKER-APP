import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsCardData, AIAnalysisResult, ChannelProfile, FrameDesign } from './types';
import { INITIAL_PRESETS, PLACEHOLDER_NEWS_IMG } from './data/presets';
import { CardPreview } from './components/CardPreview';
import { CardEditor } from './components/CardEditor';
import { AIGenerateImageModal } from './components/AIGenerateImageModal';
import { NewsCommandModal } from './components/NewsCommandModal';
import { CaptionModal, buildHashtags } from './components/CaptionModal';
import { LoginModal, ReporterUser } from './components/LoginModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppGuideModal } from './components/AppGuideModal';
import { DraftsModal } from './components/DraftsModal';
import {
  saveOrUpdateDraft,
  getActiveDraftId,
  setActiveDraftId,
  SavedDraftRecord,
} from './lib/draftManager';
import { AppUpdateModal, AppVersionInfo, APP_CURRENT_VERSION } from './components/AppUpdateModal';
import { CloudSettingsModal } from './components/CloudSettingsModal';
import { GoogleSheetsUserSyncModal } from './components/GoogleSheetsUserSyncModal';
import { ChannelOnboardingModal } from './components/ChannelOnboardingModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { AuthWelcomeScreen } from './components/AuthWelcomeScreen';
import { BrandedNewsLoadingModal, BrandedLoaderMode } from './components/BrandedNewsLoadingModal';
import { getApiUrl, getApiBaseUrl, ensureAuthToken, getAuthHeaders } from './lib/apiConfig';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { StepNavigator, scrollToStepById, DEFAULT_STEPS } from './components/StepNavigator';
import { renderCardToCanvas, generateCardCanvas, downloadCanvas } from './lib/CanvasExporter';
import { validateCardBeforeDownload } from './lib/canonicalLayoutEngine';
import {
  extractLeaderFromHeadline,
  generate5BalancedHeadlineOptions,
  fitHeadlinesTo5TierRanges,
  cleanHeadlineText,
  formatCaptionVariants,
  stripAllUrlsAndHyperlinks,
} from './lib/speakerUtils';
import { calculateEditorProgress } from './lib/aiCoreRules';
import { generateGraphicDownloadFileName, getFormattedHindiDate } from './lib/dateUtils';
import { getProfileHeaderFooter, getPermanentUserLogo } from './lib/profileConfig';
import { formatCleanLocationText } from './lib/locationUtils';
import { getDynamicFrameById } from './lib/dynamicFramesManager';

export const CANONICAL_DEFAULT_HEADLINE = 'कृपया स्टेप 3 (हेडलाइन) में जाकर अपनी मुख्य खबर का शीर्षक दर्ज करें...';
import { syncAllSourcesLive, syncAndMigrateLocalApprovals, getApprovedRssIds } from './lib/rssSourceManager';
import { trackSpaPageView, trackEvent } from './lib/analyticsTracker';
import { FolderClockIcon } from './icons/FolderClockIcon';
import {
  FolderOpen,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Share2,
  FileImage,
  Layers,
  Info,
  Lock,
  Loader2,
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
  X,
  Palette,
  Newspaper,
  Eye,
  EyeOff,
  Bookmark,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { VideoStudioWeb } from './components/VideoStudioWeb'; 
import { RemotionTestStudio } from './components/RemotionTestStudio'; 
import { FRAME_OPTIONS } from './lib/HeaderDesigns';
import { AutoFillNewsData } from './components/InlineAiNewsTools';
import { AppTopBarWeb } from './components/AppTopBarWeb';
import { AppBottomBarWeb } from './components/AppBottomBarWeb';
import { HomeScreenWeb } from './components/HomeScreenWeb';
import { VideosScreenWeb } from './components/VideosScreenWeb';
import { EPaperScreenWeb } from './components/EPaperScreenWeb';
import { ProfileScreenWeb } from './components/ProfileScreenWeb';
import { NewsroomScreenWeb } from './components/NewsroomScreenWeb';
import { DraftsScreenWeb } from './components/DraftsScreenWeb';
import { CategoriesScreenWeb } from './components/CategoriesScreenWeb';
import { ExportScreenWeb } from './components/ExportScreenWeb';
import { TermsPage } from './components/TermsPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { AccountDeletionPage } from './components/AccountDeletionPage';
import { SupportContactPage } from './components/SupportContactPage';
import { RefundCancellationPolicyPage } from './components/RefundCancellationPolicyPage';
import { AppFooterWeb } from './components/AppFooterWeb';
import { GraphicStudioGuideModal } from './components/GraphicStudioGuideModal';
import {
  triggerBreakingNewsAlert,
  addNotification,
  playNormalNotificationSound,
  playBreakingNewsAlertSound,
  playVideoFeedNotificationSound,
  unlockAudioPlayback,
  isSoundNoticeDismissed,
  dismissSoundNotice,
} from './lib/notificationManager';
import {
  isUserAdmin,
  setAdminSystemMode,
  getAdminSystemMode,
  getAdminTestPlanTier,
  getUserSubscription,
  fetchAuthoritativeSubscription,
  isUserActionAllowed,
  fetchUserDailyDownloadStatus,
} from './lib/userPlanManager';
import { markNewsGraphicCreated } from './lib/newsGraphicTracker';
import {
  NewsFeedPost,
  VideoFeedItem,
  INITIAL_NEWS_POSTS,
  INITIAL_VIDEOS,
  INITIAL_CATEGORIES,
} from './data/newsFeedData';

type AppTab =
  | 'home'
  | 'videos'
  | 'studio'
  | 'newsroom'
  | 'epaper'
  | 'profile'
  | 'generator'
  | 'drafts'
  | 'export'
  | 'terms'
  | 'privacy'
  | 'refunds'
  | 'delete-account'
  | 'support';

const STORAGE_KEY = 'breaking_news_card_state_v3';

export const STUDIO_STEP_THEMES: Record<number, {
  name: string;
  activeBtn: string;
  badge: string;
  borderActive: string;
  ringActive: string;
  accentText: string;
  indicator: string;
}> = {
  1: { // Purple
    name: 'purple',
    activeBtn: 'bg-purple-600 text-white font-black shadow-lg shadow-purple-900/40 border-purple-400 ring-2 ring-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderActive: 'border-purple-500',
    ringActive: 'ring-purple-400',
    accentText: 'text-purple-400',
    indicator: 'bg-purple-500',
  },
  2: { // Cyan/Blue
    name: 'cyan',
    activeBtn: 'bg-cyan-600 text-white font-black shadow-lg shadow-cyan-900/40 border-cyan-400 ring-2 ring-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderActive: 'border-cyan-500',
    ringActive: 'ring-cyan-400',
    accentText: 'text-cyan-400',
    indicator: 'bg-cyan-500',
  },
  3: { // Orange/Amber
    name: 'amber',
    activeBtn: 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-900/40 border-amber-300 ring-2 ring-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderActive: 'border-amber-500',
    ringActive: 'ring-amber-300',
    accentText: 'text-amber-400',
    indicator: 'bg-amber-500',
  },
  4: { // Pink/Rose
    name: 'rose',
    activeBtn: 'bg-rose-600 text-white font-black shadow-lg shadow-rose-900/40 border-rose-400 ring-2 ring-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    borderActive: 'border-rose-500',
    ringActive: 'ring-rose-400',
    accentText: 'text-rose-400',
    indicator: 'bg-rose-500',
  },
  5: { // Green/Emerald
    name: 'emerald',
    activeBtn: 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-900/40 border-emerald-400 ring-2 ring-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderActive: 'border-emerald-500',
    ringActive: 'ring-emerald-400',
    accentText: 'text-emerald-400',
    indicator: 'bg-emerald-500',
  },
  6: { // Indigo/Violet
    name: 'indigo',
    activeBtn: 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-900/40 border-indigo-400 ring-2 ring-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    borderActive: 'border-indigo-500',
    ringActive: 'ring-indigo-400',
    accentText: 'text-indigo-400',
    indicator: 'bg-indigo-500',
  },
  7: { // Teal
    name: 'teal',
    activeBtn: 'bg-teal-600 text-white font-black shadow-lg shadow-teal-900/40 border-teal-400 ring-2 ring-teal-400',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    borderActive: 'border-teal-500',
    ringActive: 'ring-teal-400',
    accentText: 'text-teal-400',
    indicator: 'bg-teal-500',
  },
};

export const STUDIO_STEPS = [
  { step: 1, id: 'step-frame', label: 'टेम्पलेट्स', name: 'टेम्पलेट्स', icon: '🖼️', title: 'टेम्पलेट्स' },
  { step: 2, id: 'step-ai', label: 'AI टूल्स', name: 'AI टूल्स', icon: '🤖', title: 'AI टूल्स' },
  { step: 3, id: 'step-headline', label: 'हेडलाइन', name: 'हेडलाइन', icon: '✍️', title: 'हेडलाइन' },
  { step: 4, id: 'step-photo', label: 'फोटो एवं वॉटरमार्क', name: 'फोटो एवं वॉटरमार्क', icon: '📷', title: 'फोटो एवं वॉटरमार्क' },
  { step: 5, id: 'step-location', label: 'स्थान एवं दिनांक', name: 'स्थान एवं दिनांक', icon: '📍', title: 'स्थान एवं दिनांक' },
  { step: 6, id: 'step-header-footer', label: 'हेडर एवं फुटर', name: 'हेडर एवं फुटर', icon: '📜', title: 'हेडर एवं फुटर' },
  { step: 7, id: 'step-download', label: 'डाउनलोड एवं कैप्शन', name: 'डाउनलोड एवं कैप्शन', icon: '⬇️', title: 'डाउनलोड एवं कैप्शन' },
];

export const MOBILE_STUDIO_STEPS = [
  { mobileStep: 1, internalStep: 1, id: 'step-frame', label: 'टेम्पलेट्स', key: 'step1' },
  { mobileStep: 2, internalStep: 2, id: 'step-ai', label: 'AI टूल्स', key: 'step2' },
  { mobileStep: 3, internalStep: 3, id: 'step-headline', label: 'हेडलाइन', key: 'step3' },
  { mobileStep: 4, internalStep: 4, id: 'step-photo', label: 'फोटो एवं वॉटरमार्क', key: 'step4' },
  { mobileStep: 5, internalStep: 5, id: 'step-location', label: 'स्थान एवं दिनांक', key: 'step5' },
  { mobileStep: 6, internalStep: 6, id: 'step-header-footer', label: 'हेडर एवं फुटर', key: 'step6' },
  { mobileStep: 7, internalStep: 7, id: 'step-download', label: 'डाउनलोड एवं कैप्शन', key: 'step7' },
] as const;

export const DEFAULT_CHANNEL_PROFILE: ChannelProfile = {
  fullName: 'मुख्य संपादक (Master Admin)',
  channelNameHi: 'ब्रेकिंग न्यूज़ वाला',
  channelNameEn: 'BREAKING NEWS WALA',
  channelLogoUrl: '/assets/breaking_news_wala_logo.png',
  channelLogoPngUrl: '/assets/breaking_news_wala_logo.png',
  channelLogoType: 'png',
  username: 'breakingnewswala',
  mobileNumber: '9669802408',
  whatsappNumber: '9669802408',
  websiteUrl: 'breakingnewswala.com',
  showMobileNumber: true,
  showWebsite: true,
  district: 'सेंट्रल डेस्क / भोपाल',
  socialIcons: {
    youtube: true,
    facebook: true,
    instagram: true,
    twitter: false,
    linkedin: false,
  },
};

export const DEFAULT_REPORTER_USER: ReporterUser = {
  userId: 'usr_627265616b69',
  uid: 'usr_627265616b69',
  id: 'usr_627265616b69',
  username: 'breakingnewswala',
  name: 'मुख्य संपादक',
  role: 'superadmin',
  district: 'सेंट्रल डेस्क / भोपाल',
  email: 'breakingnewswala.com@gmail.com',
  channelName: 'ब्रेकिंग न्यूज़ वाला',
  channelLogoUrl: '/assets/breaking_news_wala_logo.png',
  channelWebsite: 'breakingnewswala.com',
  mobileNumber: '9669802408',
  tier: 'ultra',
  planTier: 'ultra',
};

function getSavedChannelProfile(): ChannelProfile | null {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).AndroidBridge?.getChannelProfile) {
        const nativeJson = (window as any).AndroidBridge.getChannelProfile();
        if (nativeJson && nativeJson !== '{}') {
          const parsed = JSON.parse(nativeJson);
          if (parsed && (parsed.channelLogoUrl || parsed.channelNameHi)) {
            const ph = (parsed.whatsappNumber || parsed.mobileNumber || '').trim();
            return {
              channelNameHi: parsed.channelNameHi || '',
              channelNameEn: parsed.channelNameEn || '',
              channelLogoUrl: parsed.channelLogoUrl || '',
              channelLogoType: parsed.channelLogoType || 'png',
              username: parsed.username || '',
              mobileNumber: ph,
              whatsappNumber: ph,
              websiteUrl: (parsed.websiteUrl || '').trim(),
              showMobileNumber: parsed.showMobileNumber !== false,
              showWebsite: parsed.showWebsite !== false,
              socialIcons: {
                youtube: parsed.socialYoutube !== false,
                facebook: true,
                instagram: true,
                twitter: parsed.socialTwitter === true,
                linkedin: parsed.socialLinkedin === true,
              },
            };
          }
        }
      }

      // 1. Signed-in User Profile by UID / Email (Permanent and Per-User Data Isolation)
      const userStr =
        localStorage.getItem('reporter_auth_session') ||
        localStorage.getItem('reporter_current_user') ||
        localStorage.getItem('user_profile_data') ||
        localStorage.getItem('ai_news_user');
      let userEmail = '';
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          userEmail = (u?.email || '').toLowerCase().trim();
        } catch {}
      }
      if (userEmail) {
        const specific = localStorage.getItem(`user_profile_${userEmail}`);
        if (specific) {
          const parsed = JSON.parse(specific);
          if (parsed) {
            const ph = (parsed.whatsappNumber || parsed.mobileNumber || '').trim();
            return {
              ...parsed,
              whatsappNumber: ph,
              mobileNumber: ph || parsed.mobileNumber,
              showMobileNumber: parsed.showMobileNumber !== false,
              showWebsite: parsed.showWebsite !== false,
              socialIcons: {
                youtube: parsed.socialIcons?.youtube ?? true,
                facebook: true,
                instagram: true,
                twitter: parsed.socialIcons?.twitter ?? false,
                linkedin: parsed.socialIcons?.linkedin ?? false,
              },
            };
          }
        }
      }

      // 2. Global Channel Profile
      const saved = localStorage.getItem('user_channel_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const ph = (parsed.whatsappNumber || parsed.mobileNumber || '').trim();
          return {
            ...parsed,
            whatsappNumber: ph,
            mobileNumber: ph || parsed.mobileNumber,
            showMobileNumber: parsed.showMobileNumber !== false,
            showWebsite: parsed.showWebsite !== false,
            socialIcons: {
              youtube: parsed.socialIcons?.youtube ?? true,
              facebook: true,
              instagram: true,
              twitter: parsed.socialIcons?.twitter ?? false,
              linkedin: parsed.socialIcons?.linkedin ?? false,
            },
          };
        }
      }

      // 3. Current User JSON object fallback
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u) {
          const ph = (u.whatsappNumber || u.mobileNumber || u.mobile || '').trim();
          return {
            channelNameHi: u.channelNameHi || u.channelName || '',
            channelNameEn: u.channelNameEn || '',
            channelLogoUrl: u.channelLogoUrl || u.logoUrl || '',
            channelLogoType: u.channelLogoType || 'png',
            username: u.username || '',
            mobileNumber: ph,
            whatsappNumber: ph,
            websiteUrl: (u.websiteUrl || '').trim(),
            showMobileNumber: u.showMobileNumber !== false,
            showWebsite: u.showWebsite !== false,
            socialIcons: { youtube: true, facebook: true, instagram: true, twitter: false, linkedin: false },
          };
        }
      }
    }
    return DEFAULT_CHANNEL_PROFILE;
  } catch {
    return DEFAULT_CHANNEL_PROFILE;
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

  // Active App Tab: Clean URL routing without hashtags across Web and Android APK
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const fullUrl = (window.location.href || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0].toLowerCase();

      // 1. Legal, compliance & support pages
      if (path.includes('terms') || hash.includes('terms') || fullUrl.includes('tab=terms')) return 'terms';
      if (path.includes('privacy') || hash.includes('privacy') || fullUrl.includes('tab=privacy')) return 'privacy';
      if (
        path.includes('refund') ||
        path.includes('cancellation') ||
        hash.includes('refund') ||
        hash.includes('cancellation') ||
        fullUrl.includes('tab=refund')
      ) {
        return 'refunds';
      }
      if (
        path.includes('delete-account') ||
        path.includes('account-deletion') ||
        hash.includes('delete-account') ||
        hash.includes('account-deletion') ||
        fullUrl.includes('tab=delete-account')
      ) {
        return 'delete-account';
      }
      if (path.includes('support') || path.includes('contact') || hash.includes('support') || hash.includes('contact') || fullUrl.includes('tab=support')) {
        return 'support';
      }

      // 2. Standard application tabs
      if (hash === 'profile' || path === '/profile' || fullUrl.includes('tab=profile')) {
        return 'profile';
      }
      if (hash === 'videos' || path === '/videos' || fullUrl.includes('tab=videos')) {
        return 'videos';
      }
      if (hash === 'studio' || hash === 'generator' || path === '/studio' || path === '/generator' || fullUrl.includes('tab=studio')) {
        return 'studio';
      }
      if (hash === 'newsroom' || hash === 'epaper' || hash === 'drafts' || path === '/newsroom' || fullUrl.includes('tab=newsroom')) {
        return 'newsroom';
      }

      // 3. Primary domain directly lands on Home without any hashtag or fragment
      return 'home';
    }
    return 'home';
  });

  const isStudio = currentTab === 'studio' || currentTab === 'generator';

  // Navigate to tab cleanly using HTML5 history without visible hashtags
  const navigateToTab = useCallback((tab: AppTab) => {
    const isCurrentlyBlocked = typeof window !== 'undefined' && (() => {
      try {
        const sess = localStorage.getItem('reporter_auth_session');
        if (sess) {
          const u = JSON.parse(sess);
          const email = (u?.email || '').toLowerCase().trim();
          if (email === 'breakingnewswala.com@gmail.com' || email === 'admin.ainewsmaker@gmail.com') return false;
          return localStorage.getItem(`user_blocked_${email}`) === 'true';
        }
      } catch {}
      return false;
    })();
    if (isCurrentlyBlocked && tab !== 'support' && tab !== 'home' && tab !== 'profile') {
      return;
    }
    const target = tab === ('epaper' as any) ? 'newsroom' : tab;
    setCurrentTab(target);
    if (typeof window !== 'undefined') {
      const cleanPath = target === 'home' ? '/' : `/${target}`;
      if (window.history && window.history.pushState) {
        if (window.location.pathname !== cleanPath) {
          window.history.pushState({ tab: target }, '', cleanPath);
        }
      }
      // Strip any lingering hashtag from the browser address bar
      if (window.location.hash) {
        window.history.replaceState({ tab: target }, '', cleanPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Listen to popstate (browser back/forward) & clean initial URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Sanitize any legacy #home or # on initial visit so primary domain stays completely clean
    if (window.location.hash === '#home' || window.location.hash === '#' || window.location.hash === '#/') {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname || '/');
      }
    }

    const handlePopState = () => {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0].toLowerCase();
      if (path.includes('terms') || hash.includes('terms')) { setCurrentTab('terms'); return; }
      if (path.includes('privacy') || hash.includes('privacy')) { setCurrentTab('privacy'); return; }
      if (path.includes('refund') || path.includes('cancellation') || hash.includes('refund') || hash.includes('cancellation')) { setCurrentTab('refunds'); return; }
      if (path.includes('delete-account') || path.includes('account-deletion') || hash.includes('delete-account')) { setCurrentTab('delete-account'); return; }
      if (path.includes('support') || path.includes('contact') || hash.includes('support')) { setCurrentTab('support'); return; }
      if (path.includes('profile') || hash === 'profile' || path.includes('plans')) { setCurrentTab('profile'); return; }
      if (path.includes('video') || hash === 'videos') { setCurrentTab('videos'); return; }
      if (path.includes('studio') || hash === 'studio') { setCurrentTab('studio'); return; }
      if (path.includes('newsroom') || hash === 'newsroom') { setCurrentTab('newsroom'); return; }
      setCurrentTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    (window as any).setAppTab = (tab: AppTab) => {
      navigateToTab(tab);
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigateToTab]);

  const initialPageViewTrackedRef = useRef(false);
  const lastTrackedPathRef = useRef<string>(typeof window !== 'undefined' ? (window.location.pathname || '/') : '/');

  const getTabMeta = (tab: AppTab): { title: string; description: string; canonical: string } => {
    const base = 'https://www.ainewsmaker.online';
    switch (tab) {
      case 'studio':
      case 'generator':
        return {
          title: 'फोटो न्यूज़ स्टूडियो — AI News Maker',
          description: 'एआई फोटो फ्रेम जनरेटर — 4:5 व 9:16 पोर्ट्रेट फ्रेम, कस्टमाइज़ेबल हेडलाइन, लोगो और स्मार्ट लोकेशन बैज।',
          canonical: `${base}/studio`,
        };
      case 'videos':
        return {
          title: 'वीडियो न्यूज़ स्टूडियो व रील्स — AI News Maker',
          description: 'एआई वीडियो न्यूज़ स्टूडियो — प्रोफेशनल वीडियो हेडलाइंस, लोअर-थर्ड्स, ब्रेकिंग न्यूज़ वीडियो रील्स और ऑडियो मिक्सर।',
          canonical: `${base}/videos`,
        };
      case 'newsroom':
      case 'epaper':
        return {
          title: 'लाइव डिजिटल न्यूज़ रूम — AI News Maker',
          description: 'लाइव डिजिटल न्यूज़ रूम — प्रमाणित संपादकीय समाचार, ताज़ा सुर्खियाँ और मल्टी-सोर्स आरएसएस फ़ीड।',
          canonical: `${base}/newsroom`,
        };
      case 'profile':
        return {
          title: 'प्रोफ़ाइल एवं पैकेज प्लांस — AI News Maker',
          description: 'एआई न्यूज़ मेकर सब्सक्रिप्शन प्लांस, कॉइन्स वॉलेट और रिपोर्टर प्रोफ़ाइल सेटिंग्स।',
          canonical: `${base}/profile`,
        };
      case 'terms':
        return {
          title: 'नियम एवं शर्तें (Terms & Conditions) — AI News Maker',
          description: 'एआई न्यूज़ मेकर नियम और शर्तें — आधिकारिक सेवा दिशा-निर्देश और उपयोग नीति।',
          canonical: `${base}/terms`,
        };
      case 'privacy':
        return {
          title: 'गोपनीयता नीति (Privacy Policy) — AI News Maker',
          description: 'एआई न्यूज़ मेकर गोपनीयता नीति — यूज़र डेटा सुरक्षा व गोपनीयता संरक्षण मानक।',
          canonical: `${base}/privacy`,
        };
      case 'refunds':
        return {
          title: 'रिफंड एवं रद्दीकरण नीति (Refund Policy) — AI News Maker',
          description: 'रिफंड व रद्दीकरण नीति — डिजिटल कॉइन्स व पैकेज खरीद रद्दीकरण दिशा-निर्देश।',
          canonical: `${base}/refunds`,
        };
      case 'support':
        return {
          title: 'सहायता एवं संपर्क (Support) — AI News Maker',
          description: 'ग्राहक सहायता व संपर्क — एआई न्यूज़ मेकर हेल्पडेस्क, व्हाट्सएप सपोर्ट +91 9669802408।',
          canonical: `${base}/support`,
        };
      case 'delete-account':
        return {
          title: 'खाता हटाने का अनुरोध — AI News Maker',
          description: 'खाता हटाने का अनुरोध — एआई न्यूज़ मेकर डेटा सुरक्षा व अकाउंट डिलीशन प्रक्रिया।',
          canonical: `${base}/delete-account`,
        };
      case 'home':
      default:
        return {
          title: 'AI News Maker — स्मार्ट डिजिटल न्यूज़ स्टूडियो',
          description: 'भारत का नंबर 1 स्मार्ट एआई न्यूज़ स्टूडियो। ब्रेकिंग न्यूज़ ग्राफ़िक्स, वीडियो रील्स और ई-पेपर बनाएं सेकंडों में।',
          canonical: `${base}/`,
        };
    }
  };

  const applyPageMeta = (tab: AppTab) => {
    if (typeof document === 'undefined') return;
    const meta = getTabMeta(tab);
    document.title = meta.title;

    // Update meta description
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    // Update canonical link
    let canLink = document.querySelector('link[rel="canonical"]');
    if (!canLink) {
      canLink = document.createElement('link');
      canLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canLink);
    }
    canLink.setAttribute('href', meta.canonical);

    // Update OpenGraph tags
    const updateOg = (prop: string, val: string) => {
      let og = document.querySelector(`meta[property="${prop}"]`);
      if (!og) {
        og = document.createElement('meta');
        og.setAttribute('property', prop);
        document.head.appendChild(og);
      }
      og.setAttribute('content', val);
    };
    updateOg('og:title', meta.title);
    updateOg('og:description', meta.description);
    updateOg('og:url', meta.canonical);
    updateOg('og:image:width', '1200');
    updateOg('og:image:height', '630');
    updateOg('og:image:alt', meta.title);

    // Update Twitter card tags
    const updateTw = (name: string, val: string) => {
      let tw = document.querySelector(`meta[name="${name}"]`);
      if (!tw) {
        tw = document.createElement('meta');
        tw.setAttribute('name', name);
        document.head.appendChild(tw);
      }
      tw.setAttribute('content', val);
    };
    updateTw('twitter:title', meta.title);
    updateTw('twitter:description', meta.description);
    updateTw('twitter:image:alt', meta.title);

    // Update BreadcrumbList structured data for non-home routes
    let breadcrumbScript = document.getElementById('route-breadcrumb-schema');
    if (tab !== 'home') {
      if (!breadcrumbScript) {
        breadcrumbScript = document.createElement('script');
        breadcrumbScript.id = 'route-breadcrumb-schema';
        breadcrumbScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(breadcrumbScript);
      }
      breadcrumbScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'होम (Home)',
            item: 'https://www.ainewsmaker.online/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: meta.title.split('—')[0].trim(),
            item: meta.canonical,
          },
        ],
      });
    } else if (breadcrumbScript) {
      breadcrumbScript.remove();
    }
  };

  // Dynamic document title, meta tags & SPA Google Analytics 4 / GTM tracking without duplicates
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    applyPageMeta(currentTab);

    const currentPath = window.location.pathname || '/';
    const currentMeta = getTabMeta(currentTab);

    // Skip the initial mount to prevent duplicate page views, as gtag('config') and GTM container handle initial load
    if (!initialPageViewTrackedRef.current) {
      initialPageViewTrackedRef.current = true;
      lastTrackedPathRef.current = currentPath;
      return;
    }

    // Only fire page_view event on actual internal SPA route changes (strictly zero PII)
    if (currentPath !== lastTrackedPathRef.current) {
      lastTrackedPathRef.current = currentPath;
      trackSpaPageView(currentMeta.title, currentPath);
    }
  }, [currentTab]);

  // News feed posts state - auto-migrates from v1 and validates live format (no dummy seeds)
  // Part N: Filter deleted items on initial mount to prevent deleted news from flashing after refresh
  // Part M: Sort newest first
  const [posts, setPosts] = useState<NewsFeedPost[]>(() => {
    try {
      localStorage.removeItem('app_news_posts_v1');
      const rawDel = typeof localStorage !== 'undefined' ? localStorage.getItem('app_deleted_news_ids_v1') : null;
      const deletedSet = new Set<string>(rawDel ? JSON.parse(rawDel) : []);
      const saved = localStorage.getItem('app_news_posts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly purge any deleted or obsolete dummy live-post seed records
          const clean = parsed.filter((p: any) => {
            if (!p || !p.id) return false;
            if (deletedSet.has(p.id)) return false;
            if (String(p.id).startsWith('live-post-') || String(p.id).startsWith('editorial-seed-')) return false;
            return true;
          });
          clean.sort((a: NewsFeedPost, b: NewsFeedPost) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
            if ((timeB || 0) !== (timeA || 0)) {
              return (timeB || 0) - (timeA || 0);
            }
            return String(b.id).localeCompare(String(a.id));
          });
          if (clean.length > 0) return clean;
        }
      }
    } catch {
      // ignore
    }
    return (INITIAL_NEWS_POSTS && INITIAL_NEWS_POSTS.length > 0) ? INITIAL_NEWS_POSTS : [];
  });

  const [isSyncingNews, setIsSyncingNews] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Live Data URLs (Firebase Storage for ai-news-maker-app)
  const CLOUD_STORAGE_NEWS_URL = 'https://firebasestorage.googleapis.com/v0/b/ai-news-maker-app.firebasestorage.app/o/news_database.json?alt=media';
  const CLOUD_STORAGE_UPLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/ai-news-maker-app.firebasestorage.app/o?name=news_database.json';

  // Sync news posts with cloud database (Firebase Storage + Backend API + Static fallback)
  const fetchLiveNews = async () => {
    setIsSyncingNews(true);
    let loaded = false;

    // Migrate any legacy local approvals safely to the server
    syncAndMigrateLocalApprovals().catch(() => {});

    const getDeletedIds = (): Set<string> => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_deleted_news_ids_v1') : null;
        if (raw) return new Set(JSON.parse(raw));
      } catch {}
      return new Set();
    };
    const deletedIds = getDeletedIds();

    // 1. Fetch backend API (/api/news-posts) to sync live RSS, Web Links & Raw News posts
    try {
      const baseUrl = getApiBaseUrl();
      let isAdmin = false;
      try {
        const rawUser = typeof localStorage !== 'undefined' ? localStorage.getItem('reporter_auth_session') : null;
        if (rawUser) {
          const u = JSON.parse(rawUser);
          isAdmin = u.role === 'admin' || u.role === 'superadmin';
        }
      } catch {}
      const roleParam = isAdmin ? '&role=admin&includePending=true' : '';
      const res = await fetch(`${baseUrl}/api/news-posts?_t=${Date.now()}${roleParam}`, {
        headers: getAuthHeaders(),
        cache: 'no-cache',
      });
      if (res.ok) {
        const data = await res.json();
        const apiPosts = Array.isArray(data) ? data : (data?.posts || []);
        if (Array.isArray(apiPosts)) {
          const cleanApi = apiPosts.filter((p: NewsFeedPost) => p && !deletedIds.has(p.id) && !String(p.id).startsWith('live-post-'));
          if (cleanApi.length > 0) {
            cleanApi.sort((a: NewsFeedPost, b: NewsFeedPost) => {
              const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
              const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
              if ((timeB || 0) !== (timeA || 0)) {
                return (timeB || 0) - (timeA || 0);
              }
              return String(b.id).localeCompare(String(a.id));
            });
            if (isInitialNewsLoadRef.current) {
              seenNewsIdsRef.current = new Set(cleanApi.map((p: any) => String(p.id)));
              isInitialNewsLoadRef.current = false;
            } else {
              const newItems = cleanApi.filter((p: any) => !seenNewsIdsRef.current.has(String(p.id)));
              if (newItems.length > 0) {
                newItems.forEach((p: any) => {
                  seenNewsIdsRef.current.add(String(p.id));
                  addNotification({
                    id: `approved_news_${p.id}`,
                    title: p.breaking ? `🚨 ब्रेकिंग न्यूज़: ${p.title}` : `📰 ताज़ा खबर: ${p.title}`,
                    message: p.summary || p.title,
                    time: 'अभी-अभी',
                    type: 'news',
                    linkTab: 'home',
                  });
                });
                const hasBreaking = newItems.some((p: any) => Boolean(p.breaking || p.isBreaking || p.type === 'breaking' || p.category === 'ब्रेकिंग न्यूज़'));
                if (hasBreaking) {
                  playBreakingNewsAlertSound();
                } else {
                  playNormalNotificationSound();
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate([120, 60, 120]); } catch {}
                }
                setToastMessage(hasBreaking ? '🚨 नई ब्रेकिंग न्यूज़ प्रकाशित हुई!' : '📰 नई खबर स्वीकृत और होम फ़ीड में जोड़ी गई!');
              }
            }
            setPosts(cleanApi);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(cleanApi));
            } catch {}
            loaded = true;
          } else {
            // AUTHORITATIVE RESET: Server explicitly returned 0 posts. Clear local stale posts!
            setPosts([]);
            seenNewsIdsRef.current = new Set();
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify([]));
            } catch {}
            loaded = true;
          }
        }
      }
    } catch (err) {
      console.warn('API news fetch failed:', err);
    }

    // 2. Try Firebase Storage cloud live database fallback if API didn't load
    if (!loaded) {
      try {
        const fbRes = await fetch(`${CLOUD_STORAGE_NEWS_URL}&_t=${Date.now()}`, { cache: 'no-cache' });
        if (fbRes.ok) {
          const data = await fbRes.json();
          if (Array.isArray(data)) {
            const clean = data.filter((p: NewsFeedPost) => p && !deletedIds.has(p.id) && !String(p.id).startsWith('live-post-'));
            clean.sort((a: NewsFeedPost, b: NewsFeedPost) => {
              const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
              const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
              if ((timeB || 0) !== (timeA || 0)) {
                return (timeB || 0) - (timeA || 0);
              }
              return String(b.id).localeCompare(String(a.id));
            });
            if (isInitialNewsLoadRef.current) {
              seenNewsIdsRef.current = new Set(clean.map((p: any) => String(p.id)));
              isInitialNewsLoadRef.current = false;
            } else {
              const newItems = clean.filter((p: any) => !seenNewsIdsRef.current.has(String(p.id)));
              if (newItems.length > 0) {
                newItems.forEach((p: any) => {
                  seenNewsIdsRef.current.add(String(p.id));
                  addNotification({
                    id: `approved_news_${p.id}`,
                    title: p.breaking ? `🚨 ब्रेकिंग न्यूज़: ${p.title}` : `📰 ताज़ा खबर: ${p.title}`,
                    message: p.summary || p.title,
                    time: 'अभी-अभी',
                    type: 'news',
                    linkTab: 'home',
                  });
                });
                const hasBreaking = newItems.some((p: any) => Boolean(p.breaking || p.isBreaking || p.type === 'breaking' || p.category === 'ब्रेकिंग न्यूज़'));
                if (hasBreaking) playBreakingNewsAlertSound();
                else playNormalNotificationSound();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate([120, 60, 120]); } catch {}
                }
                setToastMessage(hasBreaking ? '🚨 नई ब्रेकिंग न्यूज़ प्रकाशित हुई!' : '📰 नई खबर स्वीकृत और होम फ़ीड में जोड़ी गई!');
              }
            }
            setPosts(clean);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(clean));
            } catch {}
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('Cloud storage news fetch failed:', err);
      }
    }

    // 3. Try local static /news_database.json fallback if still not loaded
    if (!loaded) {
      try {
        const staticRes = await fetch(`/news_database.json?_t=${Date.now()}`, { cache: 'no-cache' });
        if (staticRes.ok) {
          const data = await staticRes.json();
          if (Array.isArray(data)) {
            const clean = data.filter((p: NewsFeedPost) => p && !deletedIds.has(p.id) && !String(p.id).startsWith('live-post-'));
            clean.sort((a: NewsFeedPost, b: NewsFeedPost) => {
              const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
              const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
              if ((timeB || 0) !== (timeA || 0)) {
                return (timeB || 0) - (timeA || 0);
              }
              return String(b.id).localeCompare(String(a.id));
            });
            setPosts(clean);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(clean));
            } catch {}
          }
        }
      } catch {
        // ignore
      }
    }

    setIsSyncingNews(false);
  };

  const isFetchingNewsRef = useRef(false);
  const seenNewsIdsRef = useRef<Set<string>>(new Set());
  const isInitialNewsLoadRef = useRef(true);

  useEffect(() => {
    fetchLiveNews();
    // Silent background auto-refresh every 15 seconds (15,000ms) without disrupting editor or scroll
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (isFetchingNewsRef.current) return;
      isFetchingNewsRef.current = true;
      fetchLiveNews().finally(() => {
        isFetchingNewsRef.current = false;
      });
    }, 15000);
    const handleNewsApproved = () => {
      fetchLiveNews();
    };
    window.addEventListener('ai_news_approved', handleNewsApproved);
    window.addEventListener('ai_news_feed_refresh_needed', handleNewsApproved);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ai_news_approved', handleNewsApproved);
      window.removeEventListener('ai_news_feed_refresh_needed', handleNewsApproved);
    };
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedPosts),
      }).catch((err) => console.warn('Sync to backend API failed:', err));
    } catch {}
  };

  const [videos, setVideos] = useState<VideoFeedItem[]>(() => {
    try {
      const isDummyVideo = (v: any) => {
        if (!v || !v.id) return true;
        const id = String(v.id);
        if (['vid-1', 'vid-2', 'vid-3', 'vid-4', 'vid-5'].includes(id)) return true;
        if (id.startsWith('demo-') || id.startsWith('sample-') || id.startsWith('dummy-')) return true;
        if (v.videoUrl && typeof v.videoUrl === 'string' && (v.videoUrl.includes('mov_bbb.mp4') || v.videoUrl.includes('sample-videos') || v.videoUrl.includes('commondatastorage.googleapis.com/gtv-videos-bucket'))) return true;
        if (v.title && (v.title.includes('विशेष ग्राउंड रिपोर्ट') || v.title.includes('राहुल गांधी') || v.title.includes('सामान्य User को यह Button') || v.title.includes('दिवाली से पहले HERO'))) return true;
        return false;
      };

      const saved = localStorage.getItem('app_admin_videos');
      const deletedRaw = localStorage.getItem('app_deleted_video_ids');
      const deletedSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter((v: any) => !deletedSet.has(v.id) && !isDummyVideo(v));
          return clean;
        }
      }
    } catch {}
    return INITIAL_VIDEOS;
  });

  // Real-time video sync with server + 4-day auto-purge filter
  const fetchLiveVideos = async () => {
    try {
      const isDummyVideo = (v: any) => {
        if (!v || !v.id) return true;
        const id = String(v.id);
        if (['vid-1', 'vid-2', 'vid-3', 'vid-4', 'vid-5'].includes(id)) return true;
        if (id.startsWith('demo-') || id.startsWith('sample-') || id.startsWith('dummy-')) return true;
        if (v.videoUrl && typeof v.videoUrl === 'string' && (v.videoUrl.includes('mov_bbb.mp4') || v.videoUrl.includes('sample-videos') || v.videoUrl.includes('commondatastorage.googleapis.com/gtv-videos-bucket'))) return true;
        if (v.title && (v.title.includes('विशेष ग्राउंड रिपोर्ट') || v.title.includes('राहुल गांधी') || v.title.includes('सामान्य User को यह Button') || v.title.includes('दिवाली से पहले HERO'))) return true;
        return false;
      };

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/videos`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.videos)) {
          const deletedRaw = localStorage.getItem('app_deleted_video_ids');
          const deletedSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          const cleanList = data.videos.filter((v: any) => !deletedSet.has(v.id) && !isDummyVideo(v));
          if (isInitialVideosLoadRef.current) {
            seenVideoIdsRef.current = new Set(cleanList.map((v: any) => String(v.id)));
            isInitialVideosLoadRef.current = false;
          } else {
            const newVids = cleanList.filter((v: any) => !seenVideoIdsRef.current.has(String(v.id)));
            if (newVids.length > 0) {
              newVids.forEach((v: any) => {
                seenVideoIdsRef.current.add(String(v.id));
                addNotification({
                  id: `video_${v.id}`,
                  title: `🎬 नया वीडियो: ${v.title}`,
                  message: v.caption || v.title,
                  time: 'अभी-अभी',
                  type: 'video',
                  linkTab: 'videos',
                });
              });
              playVideoFeedNotificationSound();
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(80); } catch {}
              }
              setToastMessage('🎬 नया वीडियो फ़ीड में जारी हुआ!');
            }
          }
          setVideos(cleanList);
          try {
            localStorage.setItem('app_admin_videos', JSON.stringify(cleanList));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Real-time videos sync failed:', err);
    }
  };

  const isFetchingVideosRef = useRef(false);
  const seenVideoIdsRef = useRef<Set<string>>(new Set());
  const isInitialVideosLoadRef = useRef(true);

  useEffect(() => {
    fetchLiveVideos();
    // Silent background auto-refresh every 15 seconds (15,000ms)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (isFetchingVideosRef.current) return;
      isFetchingVideosRef.current = true;
      fetchLiveVideos().finally(() => {
        isFetchingVideosRef.current = false;
      });
    }, 15000);
    const handleVideoEvent = () => {
      fetchLiveVideos();
    };
    window.addEventListener('ai_video_uploaded', handleVideoEvent);
    window.addEventListener('ai_video_feed_refresh_needed', handleVideoEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ai_video_uploaded', handleVideoEvent);
      window.removeEventListener('ai_video_feed_refresh_needed', handleVideoEvent);
    };
  }, []);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  // Mobile AudioContext unlock listener on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudioPlayback();
    };
    window.addEventListener('click', handleUserInteraction, { passive: true, once: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true, once: true });
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true, once: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
    };
  }, []);

  const [showSoundNoticeBanner, setShowSoundNoticeBanner] = useState<boolean>(() => !isSoundNoticeDismissed());

  const handleEnableSound = () => {
    unlockAudioPlayback();
    playNormalNotificationSound();
    dismissSoundNotice();
    setShowSoundNoticeBanner(false);
  };

  const handleDismissSoundNotice = () => {
    dismissSoundNotice();
    setShowSoundNoticeBanner(false);
  };

  // Authentication session - loads from localStorage, Android native bridge, or defaults to Master Admin (breakingnewswala.com@gmail.com)
  const [currentUser, setCurrentUser] = useState<ReporterUser | null>(() => {
    try {
      const explicitLogout = localStorage.getItem('user_explicitly_logged_out');
      if (explicitLogout === 'true') {
        const saved = localStorage.getItem('reporter_auth_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.email || parsed.username || parsed.userId)) {
            return parsed;
          }
        }
        return null;
      }
      const saved = localStorage.getItem('reporter_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.email || parsed.username || parsed.userId)) {
          return parsed;
        }
      }
      if ((window as any).AndroidBridge?.getUserSession) {
        const raw = (window as any).AndroidBridge.getUserSession();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.email || parsed.username)) return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    fetchLiveNews();
    ensureAuthToken().catch(() => {});
  }, [currentUser?.role, currentUser?.email]);

  // Onboarding completion status (Login -> Details setup -> App) - Strict Profile + Logo + WhatsApp OTP Gate (Part 10)
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    try {
      const explicitLogout = localStorage.getItem('user_explicitly_logged_out');
      if (explicitLogout === 'true') return false;
      const rawUser = localStorage.getItem('reporter_auth_session');
      if (!rawUser) return false;
      const parsedUser = JSON.parse(rawUser);
      const cleanEmail = (parsedUser?.email || '').toLowerCase().trim();
      const isAdmin = cleanEmail === 'admin.ainewsmaker@gmail.com' || cleanEmail === 'breakingnewswala.com@gmail.com' || parsedUser?.role === 'admin' || parsedUser?.role === 'superadmin';
      if (isAdmin) return true;
      if (!cleanEmail) return false;

      // Check user-specific onboarding completion flag
      const userOnboarding = localStorage.getItem(`onboarding_completed_${cleanEmail}`);
      const generalOnboarding = localStorage.getItem('is_onboarding_completed');
      if (userOnboarding === 'true' || generalOnboarding === 'true') return true;

      // Check actual profile data completeness & WhatsApp verification
      const userProfileStr = localStorage.getItem(`user_profile_${cleanEmail}`) || localStorage.getItem('user_channel_profile');
      if (!userProfileStr) return false;
      const profile = JSON.parse(userProfileStr);
      const hasValidChannelName = Boolean(
        profile.channelNameHi &&
        profile.channelNameHi.trim() &&
        profile.channelNameHi.trim() !== 'सेटअप अधूरा (Incomplete)'
      );
      const rawPhone = (profile.whatsappNumber || profile.mobileNumber || profile.mobile || getUserSubscription().primaryMobile || '').replace(/\D/g, '').slice(-10);
      const isPhoneVerified = Boolean(
        rawPhone.length === 10 &&
        (profile.whatsappVerified === true || getUserSubscription().isMobileLocked === true)
      );
      if (!hasValidChannelName || !profile.username) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });
  const [isMobileFocusedEditing, setIsMobileFocusedEditing] = useState<boolean>(false);

  // Welcome flow - show primary AuthWelcomeScreen with Google Login for unauthenticated visitors
  const [showAuthWelcomeScreen, setShowAuthWelcomeScreen] = useState<boolean>(() => {
    try {
      const explicitLogout = localStorage.getItem('user_explicitly_logged_out');
      if (explicitLogout === 'true') return true;
      const rawUser = localStorage.getItem('reporter_auth_session');
      if (!rawUser) return true;
      const flag = localStorage.getItem('show_auth_welcome_screen');
      if (flag === 'true') return true;
      return false;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleOpenWelcome = () => setShowAuthWelcomeScreen(true);
    const handleOpenInstall = () => setIsInstallModalOpen(true);
    window.addEventListener('open_auth_welcome_screen', handleOpenWelcome);
    window.addEventListener('open_install_pwa_modal', handleOpenInstall);
    return () => {
      window.removeEventListener('open_auth_welcome_screen', handleOpenWelcome);
      window.removeEventListener('open_install_pwa_modal', handleOpenInstall);
    };
  }, []);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // Login modal remains closed by default
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalMode, setLoginModalMode] = useState<'user' | 'admin' | 'signup'>('user');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Trigger PWA "Add to Home Screen / Web App" popup when user is on Home screen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAndroidEnvironment) return;

    // Check if already in standalone app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const handleOpenModal = () => setIsInstallModalOpen(true);
    window.addEventListener('open_pwa_install_modal', handleOpenModal);

    // Only prompt when user is on Home screen
    let timer: any = null;
    if (currentTab === 'home') {
      const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until');
      const alreadyInstalled = localStorage.getItem('pwa_app_installed') === 'true';
      if (!alreadyInstalled && (!dismissedUntil || Number(dismissedUntil) <= Date.now())) {
        timer = setTimeout(() => {
          setIsInstallModalOpen(true);
        }, 1800);
      }
    }

    return () => {
      window.removeEventListener('open_pwa_install_modal', handleOpenModal);
      if (timer) clearTimeout(timer);
    };
  }, [currentTab, isAndroidEnvironment]);


  // Mobile detection & Screen Hide/Show state for Graphic Studio
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [isMobilePreviewHidden, setIsMobilePreviewHidden] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Studio mode: Graphic Design vs Video Design (Web parity with Android)
  const [studioMode, setStudioMode] = useState<'graphic' | 'video'>('graphic');
  const [studioInitialItem, setStudioInitialItem] = useState<VideoFeedItem | null>(null);
  const [studioInitialVideo, setStudioInitialVideo] = useState<string | null>(null);
  const [studioInitialHeadline, setStudioInitialHeadline] = useState<string | null>(null);

  // Mobile editor active step state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeMobileStep, setActiveMobileStep] = useState<number>(1);
  const [mobileCaptionCopied, setMobileCaptionCopied] = useState<boolean>(false);
  const [mobileViewMode, setMobileViewMode] = useState<'steps' | 'all'>('steps');

  // Mobile Editor Scroll Reset: on step switch, reset editor workspace scroll offset to 0 so new step opens fresh directly below sticky header
  const resetMobileEditorScroll = useCallback(() => {
    try {
      const stickyHeader = document.getElementById('mobile-studio-sticky-header');
      const editorTarget = document.getElementById('mobile-active-step-commands');
      if (editorTarget) {
        if (stickyHeader) {
          const headerRect = stickyHeader.getBoundingClientRect();
          const editorRect = editorTarget.getBoundingClientRect();
          const scrollNeeded = editorRect.top - headerRect.bottom;
          window.scrollBy({ top: scrollNeeded, behavior: 'instant' });
        } else {
          editorTarget.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }
    } catch {}
  }, []);

  // Synchronize mobile active step with internal activeStep
  useEffect(() => {
    const match = MOBILE_STUDIO_STEPS.find((s) => s.internalStep === activeStep);
    if (match) {
      setActiveMobileStep(match.mobileStep);
    }
  }, [activeStep]);

  // Direct completed caption copy for mobile quick action toolbar
  const handleCopyCompletedCaption = async () => {
    try {
      const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();
      let newsStory = '';
      if (card.summary && card.summary.trim()) {
        let rawSummary = stripAllUrlsAndHyperlinks(card.summary.trim());
        const tagMatch = rawSummary.match(/(#[a-zA-Z0-9_\u0900-\u097F]+\s*)+$/);
        if (tagMatch) {
          rawSummary = rawSummary.substring(0, tagMatch.index).trim();
        }
        newsStory = rawSummary;
      } else {
        newsStory = cleanHeadline;
      }
      const tagsToUse = buildHashtags(card.location, '', card);
      const fullCaption = `${cleanHeadline}\n\n${newsStory}\n\n${tagsToUse}`.trim();

      await navigator.clipboard.writeText(fullCaption);
      setMobileCaptionCopied(true);
      showToast('सोशल मीडिया कैप्शन क्लिपबोर्ड में कॉपी हो गया! ✓');
      setTimeout(() => setMobileCaptionCopied(false), 2500);
    } catch (err) {
      console.error('Caption copy failed:', err);
      showToast('कैप्शन कॉपी करने में त्रुटि');
    }
  };

  // Header visibility on scroll for maximum editing space on mobile
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let lastHeaderVisible = true;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastY;

          if (delta > 8 && currentY > 30) {
            // Scrolling down -> hide navbar & report to Android only on state transition
            if (lastHeaderVisible) {
              lastHeaderVisible = false;
              setIsHeaderVisible(false);
              if ((window as any).AndroidBridge?.reportScroll) {
                (window as any).AndroidBridge.reportScroll(currentY, true);
              }
            }
          } else if (delta < -8 || currentY <= 15) {
            // Scrolling up or at the top -> show navbar only on state transition
            if (!lastHeaderVisible) {
              lastHeaderVisible = true;
              setIsHeaderVisible(true);
              if ((window as any).AndroidBridge?.reportScroll) {
                (window as any).AndroidBridge.reportScroll(currentY, false);
              }
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

    let hasExplicitNewsContext = false;
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        hasExplicitNewsContext = Boolean(urlParams.get('newsId') || urlParams.get('draftId') || sessionStorage.getItem('active_news_edit_id'));
      }
    } catch {}

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && hasExplicitNewsContext) {
        const parsed = JSON.parse(saved);
        initial = {
          ...initial,
          ...parsed,
          headlineFontSize: parsed.headlineFontSize || 20,
          showDate: parsed.showDate !== undefined ? parsed.showDate : false,
          dateStr: parsed.dateStr || getFormattedHindiDate(),
        };
      } else {
        // Default clean neutral slate for fresh studio session (Phase 2 & 3 specification)
        initial = {
          ...initial,
          headline: CANONICAL_DEFAULT_HEADLINE,
          formattedHeadline: CANONICAL_DEFAULT_HEADLINE,
          highlightWords: [],
          images: { main: '', second: '', third: '', fourth: '' },
          photoUrl: '',
          showDate: false,
          showWatermark: false,
          watermarkType: 'OFF',
          photoDisclaimerType: 'none',
          isSymbolicPhoto: false,
          showAiPhotoBadge: false,
          showSymbolicPhotoBadge: false,
          showLocationBadge: false,
          showCallout: false,
          calloutTag: '',
          customFooterPng: undefined,
          customDynamicFrame: undefined,
          frameDesign: 'graphic_001',
          templateId: 'graphic_001',
        };
      }
    } catch (e) {
      console.warn('Could not read saved state from localStorage', e);
    }

    if (savedProfile) {
      const ALLOWED_FOOTER_SOCIALS = ['youtube', 'facebook', 'instagram', 'twitter', 'linkedin'];
      const activeSocialKeys = Object.entries(savedProfile?.socialIcons || {})
        .filter(([key, active]) => active && ALLOWED_FOOTER_SOCIALS.includes(key))
        .map(([key]) => key);

      const primaryPngLogo = savedProfile.channelLogoPngUrl || (savedProfile.channelLogoUrl?.endsWith('.gif') ? '' : savedProfile.channelLogoUrl) || initial.customLogoUrl;

      initial = {
        ...initial,
        brandName: savedProfile.channelNameHi || initial.brandName,
        brandTagline: savedProfile.channelNameEn || initial.brandTagline,
        channelNameHi: savedProfile.channelNameHi,
        channelNameEn: savedProfile.channelNameEn,
        customLogoUrl: primaryPngLogo,
        customHeaderPng: (savedProfile as any).customHeaderPng || initial.customHeaderPng,
        customFooterPng: (savedProfile as any).customFooterPng || initial.customFooterPng,
        channelLogoType: 'png',
        socialHandle: savedProfile.username
          ? (savedProfile.username.startsWith('@') ? savedProfile.username : `@${savedProfile.username}`)
          : '',
        whatsappNumber: (savedProfile.whatsappDisplayNumber || savedProfile.whatsappNumber || savedProfile.mobileNumber || '').trim(),
        websiteUrl: (savedProfile.websiteUrl || '').trim(),
        showWebsite: savedProfile.showWebsite !== false,
        showMobileNumber: savedProfile.showMobileNumber !== false,
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

  const cardRef = useRef<NewsCardData>(card);
  useEffect(() => {
    cardRef.current = card;
  }, [card]);

  // Listen to profile updates from Profile / Control Panel tab in real-time
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
        const detail = e?.detail || getSavedChannelProfile() || {};
        const ALLOWED_FOOTER_SOCIALS = ['youtube', 'facebook', 'instagram', 'twitter', 'linkedin'];
        const activeSocialKeys = detail?.socialIcons
          ? Object.entries(detail.socialIcons)
              .filter(([key, active]) => active && ALLOWED_FOOTER_SOCIALS.includes(key))
              .map(([key]) => key)
          : undefined;

        const primaryPngLogo = detail?.channelLogoPngUrl || (detail?.channelLogoUrl?.endsWith?.('.gif') ? '' : detail?.channelLogoUrl);

        setCard((prev) => ({
          ...prev,
          brandName: detail?.channelNameHi || prev.brandName,
          brandTagline: detail?.channelNameEn || prev.brandTagline,
          channelNameHi: detail?.channelNameHi || prev.channelNameHi,
          channelNameEn: detail?.channelNameEn || prev.channelNameEn,
          customLogoUrl: primaryPngLogo || prev.customLogoUrl,
          customHeaderPng: detail?.customHeaderPng !== undefined ? detail.customHeaderPng : prev.customHeaderPng,
          customFooterPng: detail?.customFooterPng !== undefined ? detail.customFooterPng : prev.customFooterPng,
          channelLogoType: 'png',
          socialHandle: detail?.username ? (detail.username.startsWith('@') ? detail.username : `@${detail.username}`) : prev.socialHandle,
          websiteUrl: detail?.websiteUrl !== undefined ? (detail.websiteUrl || '').trim() : (prev.websiteUrl || '').trim(),
          showWebsite: detail?.showWebsite !== undefined ? detail.showWebsite : prev.showWebsite,
          whatsappNumber: detail?.whatsappNumber !== undefined ? (detail.whatsappNumber || detail.mobileNumber || '').trim() : (prev.whatsappNumber || '').trim(),
          showMobileNumber: detail?.showMobileNumber !== undefined ? detail.showMobileNumber : prev.showMobileNumber,
          activeSocialIcons: activeSocialKeys !== undefined ? activeSocialKeys : prev.activeSocialIcons,
        }));
    };
    window.addEventListener('channel_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('channel_profile_updated', handleProfileUpdated);
  }, []);

  // User profile photo/logo and channel name synchronization with Graphic Photo Studio (Part 4)
  useEffect(() => {
    if (!currentUser?.email) return;
    const activeEmail = currentUser.email.toLowerCase().trim();
    let savedProfile: any = null;
    try {
      const perUserRaw = localStorage.getItem(`user_profile_${activeEmail}`);
      if (perUserRaw) savedProfile = JSON.parse(perUserRaw);
    } catch {}
    if (!savedProfile) {
      try {
        const raw = localStorage.getItem('user_channel_profile');
        if (raw) savedProfile = JSON.parse(raw);
      } catch {}
    }
    if (savedProfile) {
      const primaryLogo = savedProfile.channelLogoPngUrl || (savedProfile.channelLogoUrl?.endsWith('.gif') ? '' : savedProfile.channelLogoUrl);
      if (primaryLogo) {
        setCard((prev) => ({
          ...prev,
          customLogoUrl: primaryLogo,
          brandName: savedProfile.channelNameHi || prev.brandName,
          channelNameHi: savedProfile.channelNameHi || prev.channelNameHi,
        }));
      }
    }
  }, [currentUser?.email]);

  // Handle saving channel profile
  const handleSaveProfile = (profile: ChannelProfile, redirectAfterSave: boolean = false) => {
    if (!profile) return;
    localStorage.setItem('user_channel_profile', JSON.stringify(profile));
    localStorage.setItem('app_channel_name', profile.channelNameHi || '');
    localStorage.setItem('app_channel_name_en', profile.channelNameEn || '');
    localStorage.setItem('is_onboarding_completed', 'true');
    setIsOnboardingCompleted(true);

    const activeEmail = (currentUser?.email || profile.email || '').toLowerCase().trim();
    if (activeEmail) {
      localStorage.setItem(`user_profile_${activeEmail}`, JSON.stringify(profile));
      localStorage.setItem(`onboarding_completed_${activeEmail}`, 'true');
    }

    // Persist to Cloud backend /api/user-profile
    try {
      fetch(getApiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          email: activeEmail,
          userId: currentUser?.username || profile.username || activeEmail,
          uid: currentUser?.username || profile.username || activeEmail,
          onboardingCompleted: true,
        }),
      }).catch(() => {});
    } catch {}

    const ALLOWED_FOOTER_SOCIALS = ['youtube', 'facebook', 'instagram', 'twitter', 'linkedin'];
    const activeSocialKeys = Object.entries(profile?.socialIcons || {})
      .filter(([key, active]) => active && ALLOWED_FOOTER_SOCIALS.includes(key))
      .map(([key]) => key);

    const primaryPngLogo = profile.channelLogoPngUrl || (profile.channelLogoUrl?.endsWith('.gif') ? '' : profile.channelLogoUrl);

    setCard((prev) => ({
      ...prev,
      brandName: profile.channelNameHi || prev.brandName,
      brandTagline: profile.channelNameEn || prev.brandTagline,
      channelNameHi: profile.channelNameHi,
      channelNameEn: profile.channelNameEn,
      customLogoUrl: primaryPngLogo || prev.customLogoUrl,
      customHeaderPng: (profile as any).customHeaderPng !== undefined ? (profile as any).customHeaderPng : prev.customHeaderPng,
      customFooterPng: (profile as any).customFooterPng !== undefined ? (profile as any).customFooterPng : prev.customFooterPng,
      channelLogoType: 'png',
      socialHandle: profile.username
        ? profile.username.startsWith('@')
          ? profile.username
          : `@${profile.username}`
        : prev.socialHandle,
      whatsappNumber: (profile.whatsappDisplayNumber || profile.whatsappNumber || profile.mobileNumber || '').trim(),
      websiteUrl: (profile.websiteUrl || '').trim(),
      showWebsite: profile.showWebsite !== false,
      showMobileNumber: profile.showMobileNumber !== false,
      activeSocialIcons: activeSocialKeys,
      highlightColor: profile.highlightColor || prev.highlightColor || '#FFE600',
      showMasterBranding: profile.showMasterBranding !== false,
      footerBgColor: profile.footerBgColor || prev.footerBgColor || '#FFFFFF',
      footerTextColor: profile.footerTextColor || prev.footerTextColor,
      footerIconStyle: profile.footerIconStyle || prev.footerIconStyle || 'color',
      headlineFontFamily: profile.headlineFontFamily || prev.headlineFontFamily || 'Baloo 2',
    }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_profile_updated', {
          detail: profile,
        })
      );
    }

    if (redirectAfterSave) {
      setIsOnboardingOpen(false);
      navigateToTab('studio');
      showToast('✅ चैनल प्रोफ़ाइल सुरक्षित! ग्राफिक स्टूडियो में स्वागत है');
    }
  };

  const handleLogout = () => {
    localStorage.setItem('user_explicitly_logged_out', 'true');
    localStorage.removeItem('reporter_auth_session');
    localStorage.removeItem('reporter_current_user');
    localStorage.removeItem('user_channel_profile');
    localStorage.removeItem('is_onboarding_completed');
    localStorage.removeItem('ai_news_user');
    localStorage.removeItem('user_profile_data');
    setCurrentUser(null);
    setIsOnboardingCompleted(false);
    setIsUserMenuOpen(false);
    showToast('लॉगआउट सफल!');
    setShowAuthWelcomeScreen(true);
    setIsLoginModalOpen(false);
    navigateToTab('home');
  };

  // Save to localStorage whenever card changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
    } catch (e) {
      // localStorage may fail if large data-urls exceed quota
    }
  }, [card]);

  // Synchronize card with saved channel profile whenever opening generator/studio tab
  useEffect(() => {
    if (currentTab === 'studio' || currentTab === 'generator') {
      const savedProfile = getSavedChannelProfile();
      if (savedProfile) {
        const activeSocialKeys = Object.entries(savedProfile?.socialIcons || {})
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
            ? (savedProfile.username.startsWith('@') ? savedProfile.username : `@${savedProfile.username}`)
            : '',
          whatsappNumber: (savedProfile.whatsappDisplayNumber || savedProfile.whatsappNumber || savedProfile.mobileNumber || '').trim(),
          websiteUrl: (savedProfile.websiteUrl !== undefined ? savedProfile.websiteUrl : prev.websiteUrl || '').trim(),
          showWebsite: savedProfile.showWebsite !== false,
          showMobileNumber: savedProfile.showMobileNumber !== false,
          activeSocialIcons: activeSocialKeys.length > 0 ? activeSocialKeys : prev.activeSocialIcons,
        }));
      }
    }
  }, [currentTab]);

  // Automatically apply profile-configured Header/Footer settings & authoritative dynamic frame defaults
  useEffect(() => {
    const profileConfig = getProfileHeaderFooter(card.frameDesign || 'graphic_001');
    const df = getDynamicFrameById(card.frameDesign || '');

    setCard((prev) => {
      let updated = { ...prev };
      if (profileConfig && profileConfig.isConfigured) {
        updated = {
          ...updated,
          brandName: profileConfig.brandName !== undefined && profileConfig.brandName !== '' ? profileConfig.brandName : prev.brandName,
          brandTagline: profileConfig.brandTagline !== undefined && profileConfig.brandTagline !== '' ? profileConfig.brandTagline : prev.brandTagline,
          customLogoUrl: profileConfig.customLogoUrl !== undefined && profileConfig.customLogoUrl !== '' ? profileConfig.customLogoUrl : prev.customLogoUrl,
          customHeaderPng: profileConfig.customHeaderPng !== undefined && profileConfig.customHeaderPng !== '' ? profileConfig.customHeaderPng : prev.customHeaderPng,
          whatsappNumber: profileConfig.whatsappNumber !== undefined && profileConfig.whatsappNumber !== '' ? profileConfig.whatsappNumber : prev.whatsappNumber,
          socialHandle: profileConfig.socialHandle !== undefined && profileConfig.socialHandle !== '' ? profileConfig.socialHandle : prev.socialHandle,
          newsUpdateBadge: profileConfig.newsUpdateBadge !== undefined && profileConfig.newsUpdateBadge !== '' ? profileConfig.newsUpdateBadge : prev.newsUpdateBadge,
          customFooterPng: profileConfig.customFooterPng !== undefined && profileConfig.customFooterPng !== '' ? profileConfig.customFooterPng : prev.customFooterPng,
        };
      }
      if (df) {
        const dfFooterBg = df.footerConfig?.footerBgColor || (df.footerConfig as any)?.primaryFooterBg || (df.footerConfig as any)?.primaryFooterColor;
        const dfFooterText = df.footerConfig?.footerTextColor;
        const bannedColor = df.footerConfig?.bannedFooterColor || (df as any)?.bannedFooterColor;
        if (dfFooterBg) {
          if (bannedColor && dfFooterBg.toUpperCase() === bannedColor.toUpperCase()) {
            updated.footerBgColor = df.footerConfig?.primaryFooterColor || '#FACC15';
          } else {
            updated.footerBgColor = dfFooterBg;
          }
        } else if (bannedColor && (updated.footerBgColor || '#FFFFFF').toUpperCase() === bannedColor.toUpperCase()) {
          updated.footerBgColor = df.footerConfig?.primaryFooterColor || '#FACC15';
        }
        if (dfFooterText) {
          updated.footerTextColor = dfFooterText;
        }
        if (df.fullStoryCalloutConfig?.enabled) {
          updated.showCallout = true;
          if (df.fullStoryCalloutConfig.manualCalloutAsset || (df.fullStoryCalloutConfig as any).calloutAssetUrl) {
            updated.customCalloutAssetUrl = df.fullStoryCalloutConfig.manualCalloutAsset || (df.fullStoryCalloutConfig as any).calloutAssetUrl;
          }
          if (df.fullStoryCalloutConfig.text) {
            updated.calloutTag = df.fullStoryCalloutConfig.text;
          }
        }
      }
      return updated;
    });
  }, [card.frameDesign]);

  const [isAIAnalyzeOpen, setIsAIAnalyzeOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [commandModalInitialTab, setCommandModalInitialTab] = useState<'link' | 'command' | 'manual'>('link');
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGraphicStudioGuideOpen, setIsGraphicStudioGuideOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(() => getActiveDraftId() || undefined);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Authoritative Subscription & Trial Lock Management
  const [userSubscription, setUserSubscription] = useState(() => getUserSubscription(currentUser?.email));

  useEffect(() => {
    fetchAuthoritativeSubscription(currentUser?.email).then((sub) => {
      setUserSubscription(sub);
    });

    const handleSubUpdate = () => {
      setUserSubscription(getUserSubscription(currentUser?.email));
    };
    const handleBlocked = () => {
      setUserSubscription((prev) => ({ ...prev, isBlocked: true }));
      showToast('⚠️ आपका खाता ब्लॉक कर दिया गया है');
    };
    const handleExpired = () => {
      setUserSubscription((prev) => ({ ...prev, isTrialExpired: true, daysRemaining: 0 }));
      showToast('🔒 7-दिवसीय फ्री ट्रायल समाप्त हो गया है');
    };

    window.addEventListener('ai_news_user_plan_updated', handleSubUpdate);
    window.addEventListener('user_account_blocked', handleBlocked);
    window.addEventListener('user_trial_expired', handleExpired);

    return () => {
      window.removeEventListener('ai_news_user_plan_updated', handleSubUpdate);
      window.removeEventListener('user_account_blocked', handleBlocked);
      window.removeEventListener('user_trial_expired', handleExpired);
    };
  }, [currentUser?.email]);

  // Deep linking listeners for notifications & external triggers
  useEffect(() => {
    const handleDeepLinkPost = (e: any) => {
      const postId = e.detail?.postId || e.detail?.newsId;
      if (!postId) return;
      const targetPost = posts.find((p) => String(p.id) === String(postId));
      if (targetPost) {
        handleOpenStudioWithNews(targetPost);
      } else {
        navigateToTab('home');
        showToast('📢 सूचना से संबंधित खबर लोड की जा रही है...');
      }
    };

    const handleDeepLinkVideo = (e: any) => {
      const videoId = e.detail?.videoId;
      const targetVideo = videos.find((v) => String(v.id) === String(videoId));
      if (targetVideo) {
        setStudioInitialItem(targetVideo);
        if (targetVideo.videoUrl) setStudioInitialVideo(targetVideo.videoUrl);
        if (targetVideo.title) setStudioInitialHeadline(targetVideo.title);
        updateStudioMode('video');
        navigateToTab('studio');
      } else {
        navigateToTab('video_feed');
        showToast('🎬 वीडियो सेक्शन खोला गया');
      }
    };

    const handleInAppNotification = (e: any) => {
      const title = e.detail?.title || 'नई सूचना';
      const body = e.detail?.body || e.detail?.message || '';
      showToast(`🔔 ${title}${body ? ': ' + body.slice(0, 45) : ''}`);
    };

    window.addEventListener('ai_news_open_specific_post', handleDeepLinkPost);
    window.addEventListener('ai_news_open_specific_video', handleDeepLinkVideo);
    window.addEventListener('ai_news_notification_received', handleInAppNotification);
    return () => {
      window.removeEventListener('ai_news_open_specific_post', handleDeepLinkPost);
      window.removeEventListener('ai_news_open_specific_video', handleDeepLinkVideo);
      window.removeEventListener('ai_news_notification_received', handleInAppNotification);
    };
  }, [posts, videos]);

  const isTestModeActive = isUserAdmin(currentUser) && getAdminSystemMode() === 'test';
  const isAdminUser = isUserAdmin(currentUser) && !isTestModeActive;
  const actionAllowance = isUserActionAllowed(currentUser, userSubscription);
  const isActionLocked = !isAdminUser && !actionAllowance.allowed;
  const isCurrentCardBonus = Boolean(card?.isBonus);
  const isExpiredUser = !isAdminUser && !userSubscription?.isBlocked && !userSubscription?.isTrialActive && !userSubscription?.hasActivePaidPlan && Boolean(
    userSubscription?.isPlanExpired ||
    userSubscription?.isTrialExpired ||
    (typeof userSubscription?.daysRemaining === 'number' && userSubscription.daysRemaining <= 0)
  );
  const isUserBlocked = !isAdminUser && Boolean(
    userSubscription?.isBlocked ||
    currentUser?.isBlocked ||
    (currentUser as any)?.isAccountBlocked ||
    (currentUser?.email && localStorage.getItem(`user_blocked_${currentUser.email.toLowerCase().trim()}`) === 'true')
  );
  const [blockReviewMessage, setBlockReviewMessage] = useState('');
  const [blockReviewMobile, setBlockReviewMobile] = useState('');
  const [isSubmittingBlockReview, setIsSubmittingBlockReview] = useState(false);
  const [blockReviewSubmitted, setBlockReviewSubmitted] = useState(false);
  const [blockRequestId, setBlockRequestId] = useState('');

  const [isExpiredModalDismissed, setIsExpiredModalDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('expired_plan_modal_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Auto-dismiss all toast notifications after exactly 2 seconds (2000 ms)
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(false);

  // App Version & Update Notification states
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [autoFillNews, setAutoFillNews] = useState<AutoFillNewsData | null>(null);
  const [isStudioSelectorVisible] = useState<boolean>(true);

  // Global Branded Loader State
  const [brandedLoader, setBrandedLoader] = useState<{
    isOpen: boolean;
    mode: BrandedLoaderMode;
    title?: string;
    subtitles?: string[];
    durationSeconds?: number;
    error?: string | null;
    onRetry?: () => void;
  }>({
    isOpen: false,
    mode: 'graphic_preparation',
  });

  useEffect(() => {
    const handleShow = (e: any) => {
      const detail = e.detail || {};
      setBrandedLoader({
        isOpen: true,
        mode: detail.mode || 'ai_generation',
        title: detail.title,
        subtitles: detail.subtitles,
        durationSeconds: detail.durationSeconds,
        error: null,
      });
    };
    const handleHide = () => {
      setBrandedLoader((prev) => ({ ...prev, isOpen: false, error: null }));
    };
    window.addEventListener('ai_news_show_branded_loader', handleShow);
    window.addEventListener('ai_news_hide_branded_loader', handleHide);
    return () => {
      window.removeEventListener('ai_news_show_branded_loader', handleShow);
      window.removeEventListener('ai_news_hide_branded_loader', handleHide);
    };
  }, []);

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
    (window as any).showAppToast = (msg: string) => {
      showToast(msg);
    };
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
    (window as any).getStudioCard = () => cardRef.current;
    (window as any).updateStudioCard = (data: Partial<NewsCardData>) => {
      setCard((prev) => {
        const next = { ...prev, ...data };
        if (data.headline && (!data.formattedHeadline || data.formattedHeadline.includes('कृपया स्टेप 3'))) {
          next.formattedHeadline = data.headline;
        }
        cardRef.current = next;
        return next;
      });
    };
    (window as any).setStudioStep = (step: number) => {
      setActiveStep(step);
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
    (window as any).openStudioDraftsModal = () => {
      setIsDraftsModalOpen(true);
    };
    (window as any).setTab = (tab: AppTab) => {
      setCurrentTab(tab);
    };
    (window as any).applyAndroidChannelProfile = (profile: any) => {
      if (profile) {
        handleSaveProfile(profile, false);
      }
    };
    (window as any).onAutoFillNewsLink = (newsData: AutoFillNewsData) => {
      if (newsData && (newsData.title || newsData.summary || newsData.url)) {
        const isExternalUrl = (u?: string) => {
          if (!u || !u.startsWith('http')) return false;
          const lower = u.toLowerCase();
          return !lower.includes('ainewsmaker.online') &&
                 !lower.includes('breakingnewswala.com') &&
                 !lower.includes('localhost') &&
                 !lower.includes('127.0.0.1');
        };
        const effectiveLink = isExternalUrl(newsData.url) ? newsData.url : undefined;
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
          fullNews: (newsData as any).fullNews || newsData.summary,
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

        const savedProf = getSavedChannelProfile();
        const userTag = savedProf?.username ? `#${savedProf.username.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')}` : '';
        const linkPart = effectiveLink ? `\n\n🔗 पूरा समाचार देखें: ${effectiveLink}` : '';
        const locClean = effectiveLoc && effectiveLoc !== 'विशेष कवरेज' ? effectiveLoc.split(',')[0].trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '') : '';
        const locTag = locClean ? `#${locClean}` : '';
        const tags = [userTag, '#BreakingNews', '#HindiNews', locTag].filter(Boolean).join(' ');
        const captionText = `🚨 ${newsData.title || ''}\n\n📍 स्थान: ${effectiveLoc}\n\n📝 मुख्य विवरण:\n${newsData.summary || ''}${linkPart}\n\n${tags}`;
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
            const effectiveLink = parsed.url || (parsed.title ? `https://www.ainewsmaker.online/news/${encodeURIComponent(parsed.title.slice(0, 30))}` : 'https://www.ainewsmaker.online');
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
  };

  // Comprehensive Photo News Studio Reset & Refresh Workspace (Issue E Remediation)
  const resetPhotoNewsStudioWorkspace = (options: { skipConfirm?: boolean } = {}) => {
    if (!options.skipConfirm) {
      const hasUnsavedContent = Boolean(
        (card.headline && card.headline.trim().length > 0 && !card.headline.includes('यहाँ आपकी हेडलाइन आएगी')) ||
        (card.images?.main && card.images.main.trim().length > 0)
      );
      if (hasUnsavedContent) {
        const confirmReset = window.confirm('क्या आप स्टूडियो को रिफ्रेश करके नया ग्राफिक शुरू करना चाहते हैं? वर्तमान अनसेव्ड बदलाव हट जाएंगे।');
        if (!confirmReset) return;
      }
    }

    // Trigger dynamic frame and catalog refresh without altering permanent database
    try {
      window.dispatchEvent(new CustomEvent('template_plans_updated'));
      window.dispatchEvent(new CustomEvent('dynamic_frames_updated'));
      window.dispatchEvent(new CustomEvent('ai_news_dynamic_frames_updated'));
    } catch {}

    // Clear active draft ID reference & direct news session context
    setCurrentDraftId(undefined);
    setAutoFillNews(null);
    setAiResetKey((k) => k + 1);

    const savedProfile = getSavedChannelProfile();
    const activeSocialKeys = savedProfile?.socialIcons
      ? Object.entries(savedProfile.socialIcons).filter(([_, active]) => active).map(([key]) => key)
      : ['instagram', 'facebook', 'twitter', 'youtube', 'whatsapp'];

    setCard((prev) => ({
      ...prev,
      sourceNewsId: undefined,
      frameDesign: 'graphic_001',
      aspectRatio: '4:5',
      customDynamicFrame: undefined,
      headline: CANONICAL_DEFAULT_HEADLINE,
      formattedHeadline: CANONICAL_DEFAULT_HEADLINE,
      highlightWords: [],
      headlineAlign: 'center',
      headlineFontSize: 20,
      location: formatCleanLocationText(savedProfile?.district || savedProfile?.city || savedProfile?.location || 'भोपाल'),
      summary: '',
      category: 'ताज़ा खबर',
      images: {
        main: '',
        second: '',
        third: '',
        fourth: '',
      },
      photoUrl: '',
      testSamplePhotoUrl: '',
      watermarkImage: undefined,
      customWatermarkUrl: undefined,
      imagePositions: undefined,
      customFrameOverlayPng: undefined,
      customLogoUrl: savedProfile?.channelLogoUrl || getPermanentUserLogo() || '',
      logoScale: 1.25,
      logoX: 5.5,
      logoY: undefined,
      brandName: savedProfile?.channelNameHi || '',
      brandTagline: savedProfile?.channelNameEn || '',
      channelNameHi: savedProfile?.channelNameHi || '',
      channelNameEn: savedProfile?.channelNameEn || '',
      socialHandle: savedProfile?.username
        ? (savedProfile.username.startsWith('@') ? savedProfile.username : `@${savedProfile.username}`)
        : '',
      whatsappNumber: (savedProfile?.whatsappDisplayNumber || savedProfile?.whatsappNumber || savedProfile?.mobileNumber || '').trim(),
      websiteUrl: (savedProfile?.websiteUrl || '').trim(),
      showMobileNumber: savedProfile?.showMobileNumber !== false,
      showWebsite: savedProfile?.showWebsite !== false,
      activeSocialIcons: activeSocialKeys,
      customHeaderPng: (savedProfile as any)?.customHeaderPng !== undefined ? (savedProfile as any).customHeaderPng : undefined,
      customFooterPng: (savedProfile as any)?.customFooterPng !== undefined ? (savedProfile as any).customFooterPng : undefined,
      speakerName: '',
      speakerTitle: '',
      dateStr: '',
      showDate: false,
      showWatermark: false,
      watermarkType: 'OFF',
      photoDisclaimerType: 'none',
      isSymbolicPhoto: false,
      showSuperBreakingWatermark: false,
      showTextWatermark: false,
      showAiPhotoBadge: false,
      showSymbolicPhotoBadge: false,
      customTextOverlays: [],
      showLocation: true,
      showLocationBadge: false,
      showCallout: false,
      calloutTag: '',
      customCalloutAssetUrl: undefined,
      layout: 'single',
      highlightColor: '#FFE600',
      showMasterBranding: true,
      extractedArticlePhotos: [],
      templateId: 'graphic_001',
    }));

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('caption_draft');
      localStorage.removeItem('studio_active_news_photos');
      localStorage.removeItem('ai_tools_raw_url');
      localStorage.removeItem('ai_tools_raw_news');
      localStorage.removeItem('selected_raw_news_id');
      localStorage.removeItem('ai_tools_generated_headlines');
      localStorage.removeItem('studio_autofill_news_item');
    } catch (e) {
      // ignore
    }

    setAutoFillNews(null);

    // Dispatch studio reset events so InlineAiNewsTools clears its internal state, options 1-5, result & URL
    window.dispatchEvent(new CustomEvent('ai_news_studio_reset'));
    window.dispatchEvent(new CustomEvent('ai_news_studio_reset_preview'));

    setActiveStep(1);
    showToast('🔄 ग्राफ़िक स्टूडियो सफलतापूर्वक रीसेट हो गया!');
  };

  const handleResetCard = () => resetPhotoNewsStudioWorkspace();
  const handleRefreshPreview = () => resetPhotoNewsStudioWorkspace({ skipConfirm: true });

  useEffect(() => {
    const handleResetRequest = () => {
      handleResetCard();
    };
    window.addEventListener('ai_news_studio_reset_request', handleResetRequest);
    return () => window.removeEventListener('ai_news_studio_reset_request', handleResetRequest);
  }, []);

  const handleSaveDraft = () => {
    try {
      const { draft } = saveOrUpdateDraft(card, activeStep, currentDraftId, false);
      setCurrentDraftId(draft.id);
      showToast('💾 ड्राफ्ट सफलतापूर्वक सुरक्षित किया गया!');
      setIsDraftsModalOpen(true);
    } catch (e) {
      showToast('⚠️ ड्राफ्ट सहेजने में त्रुटि हुई');
    }
  };

  const handleRestoreDraft = (draft: SavedDraftRecord) => {
    setCard(draft.card);
    setActiveStep(draft.activeStep || 1);
    setCurrentDraftId(draft.id);
    setActiveDraftId(draft.id);
    showToast(`📂 ड्राफ्ट रीस्टोर हुआ: ${draft.name}`);
  };

  // 8. AUTO-DRAFT: Debounced auto-save so user's ongoing work is never lost
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent = Boolean(
        (card.headline && card.headline.trim().length > 0 && !card.headline.includes('यहाँ आपकी हेडलाइन आएगी')) ||
        (card.images?.main && card.images.main.trim().length > 0) ||
        (card.location && card.location.trim().length > 0)
      );
      if (hasContent) {
        const { draft } = saveOrUpdateDraft(card, activeStep, currentDraftId, true);
        if (!currentDraftId) {
          setCurrentDraftId(draft.id);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [card, activeStep, currentDraftId]);

  // Auto-save on page hide / beforeunload / navigation
  useEffect(() => {
    const handleExitSave = () => {
      const hasContent = Boolean(
        (card.headline && card.headline.trim().length > 0) ||
        (card.images?.main && card.images.main.trim().length > 0)
      );
      if (hasContent) {
        saveOrUpdateDraft(card, activeStep, currentDraftId, true);
      }
    };
    window.addEventListener('beforeunload', handleExitSave);
    window.addEventListener('pagehide', handleExitSave);
    return () => {
      window.removeEventListener('beforeunload', handleExitSave);
      window.removeEventListener('pagehide', handleExitSave);
    };
  }, [card, activeStep, currentDraftId]);

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
      const galleryList = result.pickedImages?.gallery || [];
      const extractedList = (result.extractedArticlePhotos && result.extractedArticlePhotos.length > 0)
        ? result.extractedArticlePhotos
        : (galleryList.length > 0 ? galleryList : (pickedMain ? [pickedMain] : []));
      const pickedSecond = result.pickedImages?.second || (extractedList[1] && extractedList[1] !== pickedMain ? extractedList[1] : undefined);
      const pickedThird = result.pickedImages?.third || (extractedList[2] && extractedList[2] !== pickedMain && extractedList[2] !== pickedSecond ? extractedList[2] : undefined);
      const pickedFourth = result.pickedImages?.fourth || (extractedList[3] && extractedList[3] !== pickedMain ? extractedList[3] : undefined);

      return {
        ...prev,
        headline: result.headline,
        formattedHeadline: result.formattedHeadline || result.headline,
        highlightWords: result.highlightWords || [],
        location: result.location || prev.location,
        summary: result.summary || prev.summary,
        category: result.category || prev.category,
        extractedArticlePhotos: extractedList.length > 0 ? extractedList : prev.extractedArticlePhotos,
        images: pickedMain
          ? {
              ...prev.images,
              main: pickedMain,
              second: pickedSecond || prev.images.second,
              third: pickedThird || prev.images.third,
              fourth: pickedFourth || prev.images.fourth,
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

  // Save current card into Drafts manager
  const handleSaveCurrentCardAsDraft = () => {
    handleSaveDraft();
  };

  // Export card to High-Res PNG or JPG (with full status, progress & robust blob downloading)
  
  const handleOpenDraftInStudio = (draft: any) => {
    if (draft.draftType === 'video' || draft.videoData) {
      if (draft.videoData?.videoUrl) {
        setStudioInitialVideo(draft.videoData.videoUrl);
      }
      if (draft.videoData?.headline1 || draft.headline) {
        setStudioInitialHeadline(draft.videoData?.headline1 || draft.headline);
      }
      const draftVideoItem: VideoFeedItem = {
        id: draft.id || `draft-vid-${Date.now()}`,
        title: draft.videoData?.headline1 || draft.title || draft.headline || 'ड्राफ्ट वीडियो',
        caption: draft.videoData?.videoCaption || draft.summary || '',
        videoUrl: draft.videoData?.videoUrl || '',
        aspectRatio: draft.videoData?.aspect || '9:16',
        cropRegion: draft.videoData?.cropRegion || undefined,
        headlineVariants: draft.videoData?.headlineVariants || (draft.videoData?.headline1 ? [draft.videoData.headline1] : []),
        location: draft.videoData?.location || draft.location || '',
        compatibleFrameIds: draft.videoData?.selectedFrameId ? [draft.videoData.selectedFrameId] : undefined,
        channel: draft.videoData?.channelName || '',
        duration: '00:30',
        views: '1',
        createdAt: draft.createdAt || Date.now(),
        category: draft.category || 'वीडियो',
        isBonus: false,
      };
      setStudioInitialItem(draftVideoItem);
      updateStudioMode('video');
      navigateToTab('studio');
      return;
    }
    if (draft.card) {
      setCard(draft.card);
    } else if (draft.cardData) {
      setCard(draft.cardData);
    }
    setActiveDraftId(draft.id);
    updateStudioMode('graphic');
    navigateToTab('studio');
  };

  const handleDownload = async (formatOverride?: 'png' | 'jpeg') => {
    if (downloading) return;
    const progress = calculateEditorProgress(card, activeStep);
    if (!progress.is100Percent) {
      showToast(`⚠️ JPG डाउनलोड के लिए कृपया सभी 7 स्टेप पूरे करें (वर्तमान: ${progress.percentage}% पूर्ण)।`);
      return;
    }
    const isBonusCard = Boolean(card?.isBonus);
    if (isActionLocked && !isBonusCard) {
      showToast('⚠️ आपका 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कार्ड डाउनलोड करने के लिए कृपया मेंबरशिप प्लान चुनें।');
      setCurrentTab('profile');
      return;
    }
    // Verify entitlement with server (pre-flight check, checkOnly: true)
    let preflightToken = '';
    const downloadRequestId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const verifyRes = await fetch(getApiUrl('/api/verify-download-entitlement'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser?.email,
          isBonus: isBonusCard,
          card,
          checkOnly: true,
          downloadRequestId,
        }),
      });
      if (verifyRes.status === 403 || verifyRes.status === 400) {
        const data = await verifyRes.json();
        showToast(`⚠️ ${data.error || 'ट्रायल समाप्त हो चुका है। कृपया प्लान चुनें।'}`);
        if (verifyRes.status === 403) setCurrentTab('profile');
        return;
      }
      const verifyData = await verifyRes.json();
      if (verifyData && verifyData.downloadToken) {
        preflightToken = verifyData.downloadToken;
      }
    } catch {}

    // Validate card against safe-zone layout before download
    try {
      const validation = validateCardBeforeDownload(card);
      if (!validation.isValid && validation.errors.length > 0) {
        console.warn('Card pre-download validation warning:', validation.errors);
        showToast(`⚠️ सेफ-ज़ोन चेतावनी: ${validation.errors[0]}`);
      }
    } catch (valErr) {
      console.warn('Pre-download validation check:', valErr);
    }

    const fmt: 'png' | 'jpeg' =
      typeof formatOverride === 'string' && (formatOverride === 'png' || formatOverride === 'jpeg')
        ? formatOverride
        : (downloadFormat === 'jpeg' ? 'jpeg' : 'png');
    try {
      setDownloading(true);
      setDownloadProgressText('कैनवास तैयार हो रहा है...');
      let canvas: HTMLCanvasElement | null = null;
      // Primary: High-fidelity canonical 1080x1350 canvas renderer
      try {
        canvas = await renderCardToCanvas(card);
      } catch (renderErr: any) {
        if (renderErr?.message && renderErr.message.includes('अनिवार्य')) {
          throw renderErr;
        }
        console.warn('renderCardToCanvas failed, attempting DOM capture fallback:', renderErr);
        try {
          canvas = await generateCardCanvas('news-card-container');
        } catch (domErr) {
          console.error('generateCardCanvas DOM capture also failed:', domErr);
        }
      }

      if (!canvas) {
        throw new Error('Canvas rendering produced an empty result');
      }

      setDownloadProgressText('इमेज एक्सपोर्ट हो रही है...');
      const ext = fmt === 'jpeg' ? '.jpg' : '.png';
      const baseFilename = generateGraphicDownloadFileName().replace(/\.[^/.]+$/, '');
      const filename = `${baseFilename}${ext}`;

      await downloadCanvas(canvas, filename, fmt);
      try {
        fetch(getApiUrl('/api/analytics/track'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: card?.sourceNewsId || card?.id || 'graphic',
            type: 'graphic',
            event: 'graphic_download',
          }),
        }).catch(() => {});
      } catch {}

      // Confirm actual completion of download export to decrement quota atomically (Phase 3.0B-S)
      try {
        await fetch(getApiUrl('/api/complete-download-export'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser?.email,
            downloadToken: preflightToken,
            downloadRequestId,
            exportSuccess: true,
            cardId: card?.id,
            isBonus: isBonusCard,
          }),
        });
      } catch (completeErr) {
        console.warn('Could not report download export completion:', completeErr);
      }

      // Automatically record in Project History
      try {
        const historyItem = {
          id: 'proj_' + Date.now(),
          title: card.headline || card.category || 'समाचार ग्राफिक',
          type: 'graphic' as const,
          category: card.category || 'ताज़ा खबर',
          thumbnail: card.image || '',
          timestamp: Date.now(),
          status: 'exported' as const,
          data: {
            ...card,
            exportedAt: new Date().toISOString(),
            filename,
          },
        };
        const rawHistory = localStorage.getItem('ai_news_maker_projects_history_v1');
        const list = rawHistory ? JSON.parse(rawHistory) : [];
        list.unshift(historyItem);
        localStorage.setItem('ai_news_maker_projects_history_v1', JSON.stringify(list.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('ai_news_project_history_updated'));
      } catch (histErr) {
        console.warn('Saving to project history failed:', histErr);
      }

      // Refresh daily download quota status across app
      fetchUserDailyDownloadStatus(currentUser?.email).catch(() => {});

      if (card.sourceNewsId) {
        markNewsGraphicCreated(currentUser?.email, card.sourceNewsId);
        window.dispatchEvent(
          new CustomEvent('ai_news_bonus_graphic_downloaded', {
            detail: { newsId: card.sourceNewsId },
          })
        );
      }

      showToast(`✅ ${fmt === 'jpeg' ? 'JPG' : 'PNG'} 1080x1350 न्यूज़ कार्ड सफलतापूर्वक डाउनलोड हो गया!`);
    } catch (err: any) {
      console.error('Download error:', err);
      const msg = (err?.message && err.message.includes('अनिवार्य'))
        ? `❌ ${err.message}`
        : '❌ इमेज डाउनलोड करने में त्रुटि हुई, कृपया पुनः प्रयास करें';
      showToast(msg);
    } finally {
      setDownloading(false);
      setDownloadProgressText('');
    }
  };

  // Copy card image to clipboard
  const handleCopyToClipboard = async () => {
    if (isActionLocked) {
      showToast('⚠️ आपका 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कृपया मेंबरशिप प्लान चुनें।');
      setCurrentTab('profile');
      return;
    }
    try {
      setDownloading(true);
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = await renderCardToCanvas(card);
      } catch (renderErr: any) {
        if (renderErr?.message && renderErr.message.includes('अनिवार्य')) {
          throw renderErr;
        }
        canvas = await generateCardCanvas('news-card-container');
      }
      if (!canvas) throw new Error('Canvas rendering failed');
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
    } catch (err: any) {
      console.error(err);
      const msg = (err?.message && err.message.includes('अनिवार्य'))
        ? `❌ ${err.message}`
        : '❌ इमेज कॉपी करने में त्रुटि हुई, कृपया पुनः प्रयास करें';
      showToast(msg);
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
        handleSaveProfile(profile, false);
      }
    };
    try {
      if ((window as any).AndroidBridge?.getChannelProfile) {
        const raw = (window as any).AndroidBridge.getChannelProfile();
        if (raw) {
          const parsed = JSON.parse(raw);
          handleSaveProfile(parsed, false);
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

  const handleOpenStudioWithNews = async (post: NewsFeedPost) => {
    // Part 12: Enforce and consume 1 daily graphic generation unit when initiating "खबर से ग्राफिक बनाएँ"
    const isCurrentBonus = Boolean(post.isBonus === true || (post as any).bonusNews === true);
    if (currentUser?.email && !isUserAdmin(currentUser) && !isCurrentBonus) {
      try {
        const requestId = `req_gfx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const quotaRes = await fetch(getApiUrl('/api/user/consume-graphic-creation-quota'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            userId: currentUser.userId || currentUser.email,
            requestId,
            postId: post.id,
            newsId: post.id,
          }),
        });
        const quotaData = await quotaRes.json().catch(() => ({}));
        if (quotaRes.status === 403 || quotaData.exhausted) {
          showToast(
            quotaData.error ||
              'आज की ग्राफिक निर्माण दैनिक सीमा समाप्त हो चुकी है। कृपया कल पुनः प्रयास करें या अपना प्लान अपग्रेड करें।'
          );
          return;
        }
        if (quotaData && typeof quotaData.remainingToday === 'number') {
          window.dispatchEvent(
            new CustomEvent('ai_news_download_status_updated', {
              detail: {
                limit: quotaData.limit,
                usedToday: quotaData.usedToday,
                remainingToday: quotaData.remainingToday,
                unlimited: Boolean(quotaData.unlimited),
              },
            })
          );
        }
      } catch (qErr) {
        console.warn('Daily graphic quota check notice:', qErr);
      }
    }

    try {
      fetch(getApiUrl('/api/analytics/track'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          itemId: post.id,
          userEmail: currentUser?.email,
          userId: currentUser?.userId,
          type: 'news',
          event: 'click_create',
        }),
      }).catch(() => {});
    } catch {}
    const rawUrl = (post.sourceUrl || (post as any).url || (post as any).link || '').trim();
    const hasExternalSource = Boolean(
      rawUrl &&
      rawUrl.startsWith('http') &&
      !rawUrl.includes('localhost') &&
      !rawUrl.includes('127.0.0.1')
    );
    const effectiveLink = hasExternalSource ? rawUrl : '';
    const effectiveLoc = post.district || post.location || '';

    setStudioMode('graphic');

    // Check if this specific card has the default photo toggled or missing image
    const getDefaultThumbnailIds = (): Set<string> => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_default_thumbnail_news_ids_v1') : null;
        if (raw) return new Set(JSON.parse(raw));
      } catch {}
      return new Set();
    };

    let targetImageForStudio = '';
    // Manual thumbnail is strictly for Home Screen News Card, NOT graphic studio background
    if (post.additionalImages && post.additionalImages.length > 0) {
      const feat = post.additionalImages.find((img) => img.isFeatured);
      targetImageForStudio = (feat ? feat.imageUrl : post.additionalImages[0].imageUrl).trim();
    } else if (post.featuredPhotoUrl && post.featuredPhotoUrl.trim()) {
      targetImageForStudio = post.featuredPhotoUrl.trim();
    } else if (post.additionalPhotos && post.additionalPhotos.length > 0) {
      targetImageForStudio = post.additionalPhotos[0].trim();
    } else if (post.imageUrl && post.imageUrl.trim() && !post.imageUrl.includes('placeholder')) {
      targetImageForStudio = post.imageUrl.trim();
    } else if ((post as any).thumbnailUrl && (post as any).thumbnailUrl.trim() && !(post as any).thumbnailUrl.includes('placeholder')) {
      targetImageForStudio = (post as any).thumbnailUrl.trim();
    } else if (post.imageUrl && post.imageUrl.trim()) {
      targetImageForStudio = post.imageUrl.trim();
    }

    const safeProxy = (u: string) => {
      if (!u || !u.trim()) return '';
      const trimmed = u.trim();
      if (trimmed.startsWith('/api/proxy-image')) {
        return getApiUrl(trimmed);
      }
      if (
        (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
        typeof window !== 'undefined' &&
        !trimmed.startsWith(window.location.origin) &&
        !trimmed.includes('/api/proxy-image')
      ) {
        return getApiUrl(`/api/proxy-image?url=${encodeURIComponent(trimmed)}`);
      }
      return trimmed;
    };

    const safeTargetImage = safeProxy(targetImageForStudio);

    // Collect all available photos for this article: primary + up to 3 additional photos
    const articlePhotos: string[] = [];
    if (safeTargetImage) articlePhotos.push(safeTargetImage);
    else if (targetImageForStudio) articlePhotos.push(targetImageForStudio);

    const isValidArticlePhoto = (url: string) => {
      if (!url || typeof url !== 'string') return false;
      const lower = url.toLowerCase();
      if (
        lower.includes('placeholder') ||
        lower.includes('logo') ||
        lower.includes('icon') ||
        lower.includes('avatar') ||
        lower.includes('favicon')
      ) {
        return false;
      }
      return true;
    };

    if (post.additionalImages && Array.isArray(post.additionalImages)) {
      post.additionalImages.forEach((img) => {
        if (isValidArticlePhoto(img.imageUrl)) {
          const safeP = safeProxy(img.imageUrl);
          if (safeP && !articlePhotos.includes(safeP)) {
            if (img.isFeatured) {
              articlePhotos.unshift(safeP);
            } else {
              articlePhotos.push(safeP);
            }
          }
        }
      });
    }
    if (post.additionalPhotos && Array.isArray(post.additionalPhotos)) {
      post.additionalPhotos.forEach((p) => {
        if (isValidArticlePhoto(p)) {
          const safeP = safeProxy(p);
          if (safeP && !articlePhotos.includes(safeP)) articlePhotos.push(safeP);
        }
      });
    }
    if ((post as any).extractedArticlePhotos && Array.isArray((post as any).extractedArticlePhotos)) {
      (post as any).extractedArticlePhotos.forEach((p: string) => {
        if (isValidArticlePhoto(p)) {
          const safeP = safeProxy(p);
          if (safeP && !articlePhotos.includes(safeP)) articlePhotos.push(safeP);
        }
      });
    }

    try {
      localStorage.setItem('studio_active_news_photos', JSON.stringify(articlePhotos));
    } catch {}

    const primaryPhoto = articlePhotos[0] || safeTargetImage || '';
    const secondPhoto = articlePhotos[1] || '';
    const thirdPhoto = articlePhotos[2] || '';
    const fourthPhoto = articlePhotos[3] || '';

    const prePublishedHeadlines = Array.isArray((post as any).approvedHeadlines) && (post as any).approvedHeadlines.length >= 5
      ? (post as any).approvedHeadlines
      : [];
    const isApprovedNews = Boolean(
      (post as any).isPrePublished === true &&
      prePublishedHeadlines.length >= 5 &&
      prePublishedHeadlines.every((h: string) =>
        typeof h === 'string' &&
        h.trim().length > 0 &&
        h.trim().length <= 200 &&
        !/शासन स्तर|प्रशासनिक व विभागीय|मामले में नया घटनाक्रम|संबंधित पक्षों को निर्देश|पूरे मामले को लेकर कार्रवाई|इस घटना के बाद प्रशासन अलर्ट|विशेष डेस्क|विशेष डैश/.test(h)
      )
    );

    if (isApprovedNews) {
      // Pre-published editorial presentation with Part 5.2 waiting popup message
      setBrandedLoader({
        isOpen: true,
        mode: 'graphic_preparation',
        title: 'संपादकीय डेस्क आपकी चुनी हुई खबर के लिए पाँच प्रभावी हेडलाइन विकल्प तैयार कर रहा है।',
        subtitles: [
          'खबर के तथ्यों, संदर्भ और प्रमुख बिंदुओं का विश्लेषण करके ग्राफिक के लिए सामग्री व्यवस्थित की जा रही है।',
        ],
        durationSeconds: 4,
        error: null,
      });

      // Prepare UI state
      navigateToTab('studio');
      setActiveStep(2);

      const startTime = Date.now();
      let approvedData: any = null;

      const retrieveApprovedData = async () => {
        try {
          const res = await fetch(getApiUrl(`/api/editorial/approved/${encodeURIComponent(post.id)}`));
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.isApproved && json.data) {
              approvedData = json.data;
            }
          }
        } catch (e: any) {
          console.warn('Could not fetch approved editorial from server:', e);
        }

        if (!approvedData) {
          const headlineOpts = prePublishedHeadlines.length >= 5 ? prePublishedHeadlines : [post.title];
          approvedData = {
            newsId: post.id,
            title: post.title,
            headlines: headlineOpts,
            headlineOptions: headlineOpts,
            captionDetailed: post.summary || post.title,
            location: effectiveLoc,
            category: post.categoryName,
          };
        }

        const rawHeadlines = Array.isArray(approvedData.headlines) && approvedData.headlines.length > 0
          ? approvedData.headlines.map((h: string) => cleanHeadlineText(h)).filter(Boolean)
          : [cleanHeadlineText(post.title)];

        const baseTitle = cleanHeadlineText(rawHeadlines[0] || post.title || 'ताज़ा समाचार');
        const factSentences = (post.summary || (post as any).fullContent || baseTitle)
          .split(/[।\n]+|\.\s+/)
          .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
          .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));

        const approvedHeadlines = fitHeadlinesTo5TierRanges(rawHeadlines, factSentences, baseTitle, effectiveLoc);
        const initialHeadline = approvedHeadlines[0] || post.title;

        const savedProf = getSavedChannelProfile();
        const userTag = savedProf?.username ? `#${savedProf.username.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')}` : '';

        let finalDetailed = approvedData.captionDetailed || post.summary || post.title;
        let finalBullets = approvedData.captionBullets || '';
        let finalShort = approvedData.captionShort || '';

        if (!finalDetailed || !finalBullets || !finalShort) {
          const variants = formatCaptionVariants(
            initialHeadline,
            effectiveLoc || 'मध्य प्रदेश',
            finalDetailed || post.title,
            savedProf?.username
          );
          if (!finalDetailed) finalDetailed = variants.captionDetailed;
          if (!finalBullets) finalBullets = variants.captionBullets;
          if (!finalShort) finalShort = variants.captionShort;
        }

        let formattedCaption = finalDetailed;
        if (userTag && formattedCaption.includes('#')) {
          if (!formattedCaption.toLowerCase().includes(userTag.toLowerCase())) {
            formattedCaption = formattedCaption.replace(/(#[^\s#]+)/, `${userTag} $1`);
          }
        }

        setCard((prev) => ({
          ...prev,
          sourceNewsId: post.id,
          sourceUrl: effectiveLink || post.sourceUrl || (post as any).url || (post as any).originalUrl || '',
          isBonus: Boolean(post.isBonus === true),
          originalHeadline: post.title,
          frameDesign: 'graphic_001',
          layout: 'single',
          showDate: false,
          showWatermark: false,
          showLocation: true,
          headline: initialHeadline,
          formattedHeadline: initialHeadline,
          headlineOptions: approvedHeadlines,
          regenerationUsed: approvedHeadlines.length >= 10,
          regeneratedHeadlines: undefined,
          location: effectiveLoc || prev.location || '',
          category: post.categoryName,
          summary: formattedCaption,
          images: {
            ...prev.images,
            main: primaryPhoto,
            second: secondPhoto,
            third: thirdPhoto,
            fourth: fourthPhoto,
          },
          extractedArticlePhotos: articlePhotos,
        }));

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(formattedCaption).catch(() => {});
        }

        const elapsed = Date.now() - startTime;
        const remainingMs = Math.max(0, 1200 - elapsed);

        setTimeout(() => {
          setAutoFillNews({
            newsId: post.id,
            url: effectiveLink,
            title: post.title,
            summary: post.summary,
            fullNews: (post as any).fullContent || (post as any).fullNews || post.summary || post.title,
            imageUrl: targetImageForStudio,
            location: effectiveLoc,
            category: post.categoryName,
            autoTrigger: false,
            timestamp: Date.now(),
            additionalPhotos: articlePhotos,
            isApproved: true,
            approvedHeadlines,
            headlineOptions: approvedHeadlines,
            captionDetailed: formattedCaption,
            captionBullets: finalBullets,
            captionShort: finalShort,
            tags: approvedData.tags || ['#BreakingNews', '#HindiNews', '#AINewsMaker'],
          });

          setBrandedLoader((prev) => ({ ...prev, isOpen: false }));
          setToastMessage('✅ संपादकीय हेडलाइन व लेआउट लोड हो गए हैं!');
          setTimeout(() => {
            scrollToStepById('step-ai');
          }, 150);
        }, remainingMs);
      };

      retrieveApprovedData().catch(() => {
        setBrandedLoader((prev) => ({
          ...prev,
          error: 'संपादकीय रिकॉर्ड लोड करने में समस्या आई।',
          onRetry: () => handleOpenStudioWithNews(post),
        }));
      });

    } else {
      // Home Screen News Card -> Graphic Workflow: Live AI generation path with Part 5.2 Waiting Popup
      setBrandedLoader({
        isOpen: true,
        mode: 'graphic_preparation',
        title: 'संपादकीय डेस्क आपकी चुनी हुई खबर के लिए पाँच प्रभावी हेडलाइन विकल्प तैयार कर रहा है।',
        subtitles: [
          'खबर के तथ्यों, संदर्भ और प्रमुख बिंदुओं का विश्लेषण करके ग्राफिक के लिए सामग्री व्यवस्थित की जा रही है।',
        ],
        error: null,
      });

      const baseTitle = cleanHeadlineText(post.title || 'ताज़ा समाचार');

      setCard((prev) => ({
        ...prev,
        sourceNewsId: post.id,
        sourceUrl: effectiveLink || post.sourceUrl || (post as any).url || (post as any).originalUrl || '',
        isBonus: Boolean(post.isBonus === true),
        originalHeadline: post.title,
        frameDesign: 'graphic_001',
        layout: 'single',
        showDate: false,
        showWatermark: false,
        showLocation: true,
        headline: baseTitle,
        formattedHeadline: baseTitle,
        headlineOptions: [],
        regenerationUsed: false,
        regeneratedHeadlines: undefined,
        location: effectiveLoc || prev.location || '',
        category: post.categoryName,
        summary: post.summary || '',
        images: {
          ...prev.images,
          main: primaryPhoto,
          second: secondPhoto,
          third: thirdPhoto,
          fourth: fourthPhoto,
        },
        extractedArticlePhotos: articlePhotos,
      }));

      setAutoFillNews({
        newsId: post.id,
        url: effectiveLink,
        title: post.title,
        summary: post.summary,
        fullNews: (post as any).fullContent || (post as any).fullNews || post.summary || post.title,
        imageUrl: targetImageForStudio,
        location: effectiveLoc,
        category: post.categoryName,
        autoTrigger: true,
        timestamp: Date.now(),
        additionalPhotos: articlePhotos,
      });

      navigateToTab('studio');
      setActiveStep(2);
      setTimeout(() => {
        scrollToStepById('step-ai');
      }, 150);
    }
  };

  // Deep-link news resolution from WhatsApp CTA or shared URL (?newsId=... or ?articleId=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetNewsId = urlParams.get('newsId') || urlParams.get('articleId') || sessionStorage.getItem('pending_news_deep_link');
      if (!targetNewsId) return;

      sessionStorage.setItem('pending_news_deep_link', targetNewsId);

      if (posts && posts.length > 0) {
        const found = posts.find((p) => String(p.id) === String(targetNewsId));
        if (found) {
          handleOpenStudioWithNews(found);
          sessionStorage.removeItem('pending_news_deep_link');
        }
      }
    } catch {}
  }, [posts]);

  const handleOpenStudioWithVideo = async (vid: VideoFeedItem) => {
    if (currentUser?.email && !isUserAdmin(currentUser)) {
      try {
        const requestId = `req_vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const res = await fetch(getApiBaseUrl() + '/api/user/consume-video-creation-quota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            userId: currentUser.userId,
            requestId,
            videoId: vid.id,
          }),
        });
        const data = await res.json();
        if (res.status === 403 || data.exhausted) {
          alert(data.error || 'आज की वीडियो निर्माण दैनिक सीमा समाप्त हो चुकी है। कृपया कल पुनः प्रयास करें या प्लान अपग्रेड करें।');
          return;
        }
      } catch (e) {
        console.warn('Video quota consumption check error:', e);
      }
    }
    setStudioMode('video');
    setStudioInitialItem(vid);
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
    setBrandedLoader({
      isOpen: true,
      mode: 'video_render',
      title: 'आपकी चुनी हुई वीडियो को AI द्वारा तैयार किया जा रहा है।',
      durationSeconds: 10,
      error: null,
    });
    navigateToTab('studio');
    setActiveStep(1);
    setToastMessage('वीडियो न्यूज़ स्टूडियो में लोड हो गया है!');
  };

  const handleOpenStudioWithEPaper = (edition?: any) => {
    setCard((prev) => ({
      ...prev,
      frameDesign: 'jacket-epaper',
    }));
    navigateToTab('studio');
    setActiveStep(1);
    setToastMessage('ई-पेपर 2-कॉलम जैकेट एक्टिवेटेड!');
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
    addNotification({
      id: `published_${newPost.id}`,
      title: `📰 नई खबर प्रकाशित: ${newPost.title}`,
      message: (newPost.summary || newPost.content || '').slice(0, 100) || 'मुख्य होम फ़ीड में नई खबर प्रकाशित हो गई है।',
      time: 'अभी',
      type: 'news',
      linkTab: 'home',
      unread: true,
    });
    setToastMessage('खबर सफलतापूर्वक पब्लिश हुई!');
  };

  const handleToggleHighlightNews = (postId: string) => {
    let triggeredStory: NewsFeedPost | undefined;
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const nextBreaking = !p.breaking;
        if (nextBreaking) {
          triggeredStory = { ...p, breaking: true };
        }
        return { ...p, breaking: nextBreaking };
      }
      return p;
    });
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    if (triggeredStory) {
      triggerBreakingNewsAlert({
        id: triggeredStory.id,
        title: triggeredStory.title,
        summary: (triggeredStory.summary || triggeredStory.content || triggeredStory.fullContent || '').slice(0, 100),
      });
      setToastMessage('🚨 ब्रेकिंग न्यूज़ अलर्ट जारी किया गया!');
    } else {
      setToastMessage('खबर का स्टेटस अपडेट हुआ!');
    }
  };

  const handleEditNews = (editedPost: NewsFeedPost) => {
    const exists = posts.some((p) => p.id === editedPost.id);
    const updated = exists
      ? posts.map((p) => (p.id === editedPost.id ? editedPost : p))
      : [editedPost, ...posts];
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncPostsToServer(updated);
    setToastMessage('खबर सफलतापूर्वक अपडेट हुई!');
  };

  const handleDeleteNews = async (postId: string) => {
    const updated = posts.filter((p) => p.id !== postId);
    setPosts(updated);
    try {
      localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
      const raw = localStorage.getItem('app_deleted_news_ids_v1');
      const set = new Set(raw ? JSON.parse(raw) : []);
      set.add(postId);
      localStorage.setItem('app_deleted_news_ids_v1', JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
    try {
      await fetch(getApiUrl(`/api/news-posts/${encodeURIComponent(postId)}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('Backend news delete warning:', err);
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

  // Remotion POC Standalone Test Harness Route (Isolated from normal user flow)
  const isRemotionPoc = typeof window !== 'undefined' && (
    window.location.search.includes('poc=remotion') ||
    window.location.hash.includes('remotion-poc')
  );

  if (isRemotionPoc) {
    return <RemotionTestStudio />;
  }

  // Public legal and compliance pages are accessible without login
  const isPublicLegalPage =
    currentTab === 'terms' ||
    currentTab === 'privacy' ||
    currentTab === 'refunds' ||
    currentTab === 'delete-account' ||
    currentTab === 'support';

  // Studio tabs are accessible so users can freely create graphics & videos on Desktop, Mobile, and Tablet
  const isStudioTab = currentTab === 'studio' || currentTab === 'generator';

  // Primary Screen with Google Login Steps is enforced for unauthenticated visitors unless on legal pages or studio
  if (!isPublicLegalPage && !isStudioTab && (showAuthWelcomeScreen || !currentUser || !isOnboardingCompleted)) {
    return (
      <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans transition-colors w-full max-w-full overflow-x-clip">
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{toastMessage}</span>
          </div>
        )}
        <AuthWelcomeScreen
          initialStep={currentUser && !isOnboardingCompleted ? 2 : 1}
          currentUser={currentUser}
          onLoginSuccess={(user) => {
            localStorage.removeItem('user_explicitly_logged_out');
            const isAdmin = isUserAdmin(user);
            setCurrentUser(user);
            setShowAuthWelcomeScreen(false);
            if (isAdmin) {
              setAdminSystemMode('admin');
              navigateToTab('profile');
              setIsOnboardingCompleted(true);
              localStorage.setItem('is_onboarding_completed', 'true');
              showToast('👑 एडमिन कंट्रोल पैनल में आपका स्वागत है!');
              return;
            }
            let isVerifiedAndComplete = false;
            try {
              const cleanEmail = user.email?.toLowerCase().trim() || '';
              const userSpecificStr = cleanEmail ? localStorage.getItem(`user_profile_${cleanEmail}`) : null;
              const profileStr = userSpecificStr || localStorage.getItem('user_channel_profile');
              if (profileStr) {
                const parsed = JSON.parse(profileStr);
                const isAdminAcc = Boolean(user.email && (user.email.toLowerCase() === 'admin.ainewsmaker@gmail.com' || user.email.toLowerCase() === 'breakingnewswala.com@gmail.com'));
                const hasValidChannelName = Boolean(
                  parsed?.channelNameHi &&
                  parsed.channelNameHi.trim() &&
                  parsed.channelNameHi.trim() !== 'सेटअप अधूरा (Incomplete)' &&
                  (isAdminAcc || (parsed.channelNameHi.trim() !== 'एआई न्यूज़ मेकर' && parsed.channelNameHi.trim().toLowerCase() !== 'ai news maker'))
                );
                const logoCandidate = (parsed?.channelLogoUrl || parsed?.channelLogoPngUrl || parsed?.channelLogoGifUrl || '').trim();
                const hasValidLogo = Boolean(
                  logoCandidate &&
                  (isAdminAcc || logoCandidate !== '/assets/ai_news_maker_logo.png') &&
                  !logoCandidate.includes('googleusercontent.com')
                );
                const rawPhone = (parsed?.whatsappNumber || parsed?.mobileNumber || parsed?.mobile || getUserSubscription().primaryMobile || '').replace(/\D/g, '').slice(-10);
                const isPhoneVerified = Boolean(
                  rawPhone.length === 10 &&
                  (parsed?.whatsappVerified === true || getUserSubscription().isMobileLocked === true)
                );
                if (hasValidChannelName && hasValidLogo && parsed?.username && isPhoneVerified) {
                  localStorage.setItem('user_channel_profile', JSON.stringify(parsed));
                  isVerifiedAndComplete = true;
                }
              }
            } catch {
              // proceed
            }
            if (!isVerifiedAndComplete) {
              setIsOnboardingCompleted(false);
              localStorage.removeItem('is_onboarding_completed');
              setShowAuthWelcomeScreen(true);
              showToast('⚠️ आगे बढ़ने के लिए कृपया चैनल नाम, लोगो और WhatsApp OTP सत्यापन पूरा करें।');
              return;
            }
            setIsOnboardingCompleted(true);
            localStorage.setItem('is_onboarding_completed', 'true');
            navigateToTab('home');
            showToast(`स्वागत है, ${user.name || 'यूज़र'}!`);
          }}
          onCompleteDetails={(profile, updatedUser) => {
            handleSaveProfile(profile);
            const userToSet = updatedUser || currentUser;
            localStorage.removeItem('user_explicitly_logged_out');
            if (updatedUser) {
              setCurrentUser(userToSet);
            }
            setShowAuthWelcomeScreen(false);
            const isAdmin = isUserAdmin(userToSet);
            if (isAdmin) {
              setAdminSystemMode('admin');
              navigateToTab('profile');
              localStorage.setItem('is_onboarding_completed', 'true');
              setIsOnboardingCompleted(true);
              showToast('👑 मुख्य एडमिन कंट्रोल पैनल में आपका स्वागत है!');
            } else {
              localStorage.setItem('is_onboarding_completed', 'true');
              setIsOnboardingCompleted(true);
              navigateToTab('home');
              showToast('✅ लॉगिन व चैनल सेटअप सफल! दैनिक लाइव न्यूज़ फ़ीड में आपका स्वागत है');
            }
          }}
        />
      </div>
    );
  }

  // Permanent Full-Screen Lock for Blocked Accounts (Part 3)
  if (isUserBlocked) {
    return (
      <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-400 mx-auto flex items-center justify-center text-4xl shadow-xl">
            🚫
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              आपकी प्रोफ़ाइल अस्थायी रूप से ब्लॉक की गई है
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              आपका अकाउंट Admin द्वारा प्रतिबंधित किया गया है। अधिक जानकारी या पुनः सक्रिय करने के लिए Admin को Request भेजें।
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-left">
            <div className="flex justify-between items-center text-slate-400">
              <span>ईमेल आईडी:</span>
              <span className="font-mono text-white font-bold">{currentUser?.email || 'अनाम यूज़र'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>स्थिति:</span>
              <span className="text-rose-400 font-black">अस्थाई रूप से निलंबित (Blocked)</span>
            </div>
          </div>

          {blockReviewSubmitted ? (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-200 text-xs sm:text-sm font-bold text-center space-y-2">
              <div className="text-2xl">✅</div>
              <div>आपकी समीक्षा रिक्वेस्ट Admin को सफलतापूर्वक भेज दी गई है!</div>
              <div className="text-xs text-emerald-300 font-mono">अनुरोध आईडी: {blockRequestId || `REQ-${Date.now()}`}</div>
              <div className="text-xs text-amber-300 bg-amber-950/50 p-2 rounded-xl border border-amber-500/30">
                वर्तमान स्थिति: <strong>लंबित (Pending Review)</strong>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!blockReviewMessage.trim()) {
                  alert('कृपया समीक्षा अनुरोध का विवरण दर्ज करें!');
                  return;
                }
                setIsSubmittingBlockReview(true);
                const generatedReqId = `REQ-${Date.now()}`;
                try {
                  await fetch(getApiUrl('/api/support/requests'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: currentUser?.userId || '',
                      userName: currentUser?.name || 'संपादक',
                      userEmail: currentUser?.email || '',
                      userMobile: blockReviewMobile || '',
                      message: `[ब्लॉक समीक्षा अनुरोध ${generatedReqId}]: ${blockReviewMessage}`,
                      reportType: 'review_blocked',
                      requestId: generatedReqId,
                    }),
                  });
                  setBlockRequestId(generatedReqId);
                  setBlockReviewSubmitted(true);
                } catch (err) {
                  alert('अनुरोध भेजने में समस्या आई। कृपया पुनः प्रयास करें।');
                } finally {
                  setIsSubmittingBlockReview(false);
                }
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ब्लॉक समीक्षा अनुरोध विवरण / स्पष्टीकरण *
                </label>
                <textarea
                  rows={3}
                  value={blockReviewMessage}
                  onChange={(e) => setBlockReviewMessage(e.target.value)}
                  placeholder="कृपया अपने चैनल का विवरण या अनुरोध लिखें..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-400 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  संपर्क मोबाइल / व्हाट्सएप नंबर
                </label>
                <input
                  type="tel"
                  value={blockReviewMobile}
                  onChange={(e) => setBlockReviewMobile(e.target.value)}
                  placeholder="10 अंकों का मोबाइल नंबर"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-rose-400 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingBlockReview}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-xl cursor-pointer"
              >
                {isSubmittingBlockReview ? 'अनुरोध भेजा जा रहा है...' : 'Admin को Request भेजें'}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-center">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('reporter_auth_session');
                  sessionStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              लॉगआउट करें
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans transition-colors w-full max-w-full overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-neutral-950 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-neutral-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Persistent Admin Test Mode Banner (Part 6) */}
      {isTestModeActive && (
        <div className="w-full bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white border-b-2 border-purple-500 px-3 sm:px-6 py-2 shadow-2xl sticky top-0 z-50 flex items-center justify-between gap-2.5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-black text-purple-200 truncate">
              🧪 टेस्ट मोड सक्रिय: [{(getAdminTestPlanTier() || 'BASIC').toUpperCase()}] का वास्तविक अनुभव
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAdminSystemMode('admin');
                window.dispatchEvent(new Event('ai_news_admin_view_mode_changed'));
                window.location.reload();
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>एडमिन मोड में लौटें</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Navigation - Always visible in Home, Video, Newsroom, Control Room. In Studio: visible ONLY on Desktop (hidden md:block), preserving mobile & APK layout unchanged */}
      <div className={`sticky top-0 z-50 bg-[#0B132B]/95 backdrop-blur-md shadow-md transition-colors ${(currentTab === 'studio' || currentTab === 'generator') ? 'hidden md:block' : ''}`}>
        <AppTopBarWeb
          currentTab={currentTab}
          currentUser={currentUser}
          onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
          onOpenAppUpdate={() => setIsUpdateModalOpen(true)}
          onRefresh={async () => {
            await syncAllSourcesLive().catch(() => {});
            await fetchLiveNews();
            window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
            setToastMessage('होम फ़ीड और लाइव खबरें रीफ्रेश हो गईं!');
          }}
          onNavigateToTab={navigateToTab}
        />
      </div>

      {/* Blocked Account Warning Banner & Lock Screen Modal (Module I) */}
      {isUserBlocked && (
        <>
          <div className="w-full bg-rose-950/95 text-white border-b-2 border-rose-500 py-3 px-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-bold z-40 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 max-w-4xl mx-auto sm:mx-0">
              <span className="text-xl">🚫</span>
              <div>
                <span className="font-black text-rose-300">खाता ब्लॉक है: </span>
                <span>आपका खाता व्यवस्थापक (Admin) द्वारा ब्लॉक कर दिया गया है। आपकी सभी सेवाएं व टूल्स अस्थाई रूप से रोक दिए गए हैं।</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigateToTab('support');
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-xs shrink-0 cursor-pointer shadow-md transition"
            >
              सहायता / सपोर्ट डेस्क
            </button>
          </div>

          {/* Blocked User Lock Screen Modal (Module I) */}
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-400 mx-auto flex items-center justify-center text-3xl shadow-lg">
                  🚫
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  खाता लॉक / ब्लॉक किया गया है
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  आपकी प्रोफ़ाइल एडमिन द्वारा लॉक की गई है। कारण जानने या समीक्षा का अनुरोध करने के लिए नीचे दिए गए विकल्प का उपयोग करें।
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>ईमेल आईडी:</span>
                  <span className="font-mono text-white font-bold">{currentUser?.email || 'अनाम यूज़र'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>स्थिति:</span>
                  <span className="text-rose-400 font-black">अस्थाई रूप से निलंबित</span>
                </div>
              </div>

              {blockReviewSubmitted ? (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-200 text-xs sm:text-sm font-bold text-center space-y-2">
                  <div className="text-2xl">✅</div>
                  <div>आपका समीक्षा अनुरोध एडमिन को भेज दिया गया है।</div>
                  <div className="text-xs text-emerald-400 font-normal">एडमिन द्वारा समीक्षा के उपरांत आपका खाता सक्रिय किया जाएगा।</div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!blockReviewMessage.trim()) {
                      alert('कृपया समीक्षा अनुरोध का विवरण दर्ज करें!');
                      return;
                    }
                    setIsSubmittingBlockReview(true);
                    try {
                      await fetch(getApiUrl('/api/support/requests'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: currentUser?.userId || '',
                          userName: currentUser?.name || 'संपादक',
                          userEmail: currentUser?.email || '',
                          userMobile: blockReviewMobile || '',
                          message: `[ब्लॉक समीक्षा अनुरोध]: ${blockReviewMessage}`,
                          reportType: 'review_blocked',
                        }),
                      });
                      setBlockReviewSubmitted(true);
                    } catch (err) {
                      alert('अनुरोध भेजने में समस्या आई। कृपया पुनः प्रयास करें।');
                    } finally {
                      setIsSubmittingBlockReview(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ब्लॉक समीक्षा अनुरोध विवरण / स्पष्टीकरण *
                    </label>
                    <textarea
                      rows={3}
                      value={blockReviewMessage}
                      onChange={(e) => setBlockReviewMessage(e.target.value)}
                      placeholder="कृपया अपने चैनल का विवरण या अनुरोध लिखें..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-400 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      संपर्क मोबाइल / व्हाट्सएप नंबर
                    </label>
                    <input
                      type="tel"
                      value={blockReviewMobile}
                      onChange={(e) => setBlockReviewMobile(e.target.value)}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-rose-400 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingBlockReview}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer"
                  >
                    {isSubmittingBlockReview ? 'अनुरोध भेजा जा रहा है...' : 'ब्लॉक समीक्षा अनुरोध सबमिट करें'}
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('reporter_auth_session');
                      sessionStorage.clear();
                    } catch {}
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  लॉगआउट करें
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Plan / Trial Expired Warning Banner (Part 2: Suppressed for Active Plans, Direct Membership Activation) */}
      {isExpiredUser && !userSubscription?.isBlocked && (
        <div className="w-full px-3 sm:px-4 py-2 flex justify-center z-40">
          <div className="w-full max-w-5xl bg-slate-900/95 text-white border border-red-500/50 rounded-xl py-2 px-3 sm:px-4 shadow-xl flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🔒</span>
              <div className="truncate">
                <span className="font-black text-amber-300">
                  {userSubscription?.tier === 'basic' ? 'ट्रायल समाप्त: ' : 'प्लान समाप्त (Expired): '}
                </span>
                <span className="text-slate-300 text-[11px] sm:text-xs">
                  डाउनलोड व वीडियो टूल्स लॉक हैं। जारी रखने के लिए प्लान सक्रिय करें।
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigateToTab('profile');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open_plans_packages'));
                  window.location.hash = '#membership';
                }
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs shrink-0 cursor-pointer shadow-md transition animate-pulse flex items-center gap-1"
            >
              <span>⚡</span>
              <span>प्लान सक्रिय करें</span>
            </button>
          </div>
        </div>
      )}

      {/* Expired Plan Users Modal Pop-up (Part 8.1) */}
      {isExpiredUser && !isExpiredModalDismissed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => {
                setIsExpiredModalDismissed(true);
                try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="बंद करें"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl shrink-0">
                🔒
              </div>
              <div>
                <h3 className="text-base font-black text-white">सदस्यता समाप्त</h3>
                <span className="text-xs text-amber-400 font-bold">
                  {userSubscription?.tier === 'basic' ? '7-दिवसीय फ्री ट्रायल समाप्त' : 'आपका वर्तमान प्लान समाप्त हो गया है'}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              आपका प्लान समाप्त हो गया है। अपनी सुविधाएँ जारी रखने के लिए प्लान सक्रिय करें। जब तक आप अपना प्लान सक्रिय नहीं करते, तब तक आप अपने लिए उपलब्ध बोनस खबरों और बोनस वीडियो का उपयोग कर सकते हैं।
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsExpiredModalDismissed(true);
                  try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
                  navigateToTab('profile');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open_plans_packages'));
                    window.location.hash = '#membership';
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>⚡</span>
                <span>प्लान सक्रिय करें</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpiredModalDismissed(true);
                  try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
                  navigateToTab('home');
                  showToast('🎁 बोनस खबरें सूची से बनाएं');
                }}
                className="flex-1 py-2.5 px-4 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <span>🎁</span>
                <span>बोनस खबरें बनाएँ</span>
              </button>
            </div>
            
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsExpiredModalDismissed(true);
                  try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                बाद में देखें / ऐप एक्सप्लोर करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Home Feed Tab */}
      {currentTab === 'home' && (
        <div className="w-full">
          {showSoundNoticeBanner && (
            <div className="max-w-4xl mx-auto my-3 px-3">
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border border-amber-400/40 text-slate-900 dark:text-slate-100 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-500 shrink-0 mt-0.5">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                      नई खबर आने पर आपको मोबाइल पर साउंड नोटिफिकेशन सुनाई देगा। ब्रेकिंग न्यूज़ और सामान्य खबरों के लिए अलग-अलग साउंड हो सकती हैं। साउंड सुनने के लिए आवश्यक अनुमति दें।
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      हर 15 सेकंड में लाइव फ़ीड स्वतः अपडेट होता है।
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={handleEnableSound}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>साउंड चालू करें / अनुमति दें</span>
                  </button>
                  <button
                    onClick={handleDismissSoundNotice}
                    className="px-2 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition cursor-pointer"
                    title="बंद करें"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
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
            await syncAllSourcesLive().catch(() => {});
            await fetchLiveNews();
          }}
          isSyncingNews={isSyncingNews}
          onOpenAdminLogin={() => {
            setLoginModalMode('admin');
            setIsLoginModalOpen(true);
          }}
          onNavigateToTab={navigateToTab}
        />
        </div>
      )}

      {/* 2. News Generator / Studio Tab */}
      {(currentTab === 'generator' || currentTab === 'studio') && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-1.5 sm:p-4 pb-24 text-slate-900 dark:text-slate-100 transition-colors">
          {/* Studio Type Selector: On desktop shows both Graphic & Video; on mobile it is integrated into the sticky header */}
          <div className={`hidden lg:block w-full transition-all duration-300 ease-in-out overflow-hidden ${
            isStudioSelectorVisible && (!studioInitialItem ? 'max-h-20 opacity-100 mb-3' : 'max-h-20 opacity-100 mb-3')
          }`}>
            <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-1 shadow-sm dark:shadow-lg max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => updateStudioMode('graphic')}
                className={`flex-1 py-2 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'graphic'
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 shadow-md font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Palette className="w-4 h-4 text-neutral-950" />
                <span>फोटो न्यूज़ स्टूडियो</span>
              </button>
              {/* Video News Studio is fully accessible on both mobile and desktop per Master Prompt Part D & E */}
              <button
                type="button"
                onClick={() => updateStudioMode('video')}
                className={`flex-1 py-2 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'video'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Film className="w-4 h-4 text-white" />
                <span>वीडियो न्यूज़ स्टूडियो</span>
              </button>
            </div>
          </div>

          {/* Universal Mobile Studio Mode Switcher (hidden when focused step editing is active in Graphic Photo Studio per Part 3.1) */}
          <div className={`lg:hidden w-full bg-slate-950 px-2.5 pt-2 pb-1 transition-all ${
            studioMode === 'graphic' && isMobileFocusedEditing ? 'hidden' : 'block'
          }`}>
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => updateStudioMode('graphic')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'graphic'
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-slate-950" />
                <span>फोटो न्यूज़ स्टूडियो</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileFocusedEditing(false);
                  updateStudioMode('video');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  studioMode === 'video'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-white" />
                <span>वीडियो न्यूज़ स्टूडियो</span>
              </button>
            </div>
          </div>

          {studioMode === 'video' ? (
            <ErrorBoundary fallbackTitle="वीडियो स्टूडियो लोड करने में समस्या आई">
              <div className="w-full">
                <VideoStudioWeb
                  currentUser={currentUser}
                  initialVideo={studioInitialItem}
                  initialVideoUrl={studioInitialVideo || undefined}
                  initialHeadline={studioInitialHeadline || undefined}
                  onBackToGraphic={() => updateStudioMode('graphic')}
                  onNavigateHome={() => setCurrentTab('home')}
                />
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary fallbackTitle="ग्राफिक स्टूडियो लोड करने में समस्या आई">
              <>
              {/* ============================================================== */}
              {/* 1. MOBILE & TABLET RESPONSIVE WORKSPACE (xl:hidden) */}
              {/* ============================================================== */}
              <div className="xl:hidden w-full flex flex-col min-h-screen">
                {/* 🔒 STICKY / FROZEN STUDIO HEADER (Row 1: Split Preview + Steps | Row 2: 4 Quick Actions) */}
                <div
                  id="mobile-studio-sticky-header"
                  className="sticky top-0 z-30 w-full bg-slate-950/98 backdrop-blur-md border-b border-slate-800 shadow-xl px-2 sm:px-4 pt-1.5 pb-1.5 transition-all"
                >
                  {/* Row 1: Split Live Preview & Vertical Step Menu (Mobile: 72-75% / 25-28% | Tablet: 70:30) */}
                  <div className="flex flex-row items-stretch gap-1.5 sm:gap-2.5 md:gap-4 w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto">
                    {/* Left Column: 67%–69% (Mobile) / 70% (Tablet) Actual Proportional Miniature Live Preview */}
                    <div className="w-[67%] sm:w-[69%] md:w-[70%] min-w-0 flex flex-col justify-start">
                      <div className="flex items-center justify-between px-1 mb-1">
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-black text-amber-400 uppercase tracking-wider truncate">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none shrink-0" />
                          <span>लाइव प्रीव्यू</span>
                          <span className="text-slate-400 font-normal">({card.aspectRatio || '4:5'})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMobileFocusedEditing && (
                            <button
                              type="button"
                              onClick={() => setIsMobileFocusedEditing(false)}
                              title="स्टूडियो मोड स्विचर दिखाएं"
                              className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/40 text-[9px] font-bold cursor-pointer"
                            >
                              ⇄ स्टूडियो
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSafeZone(!showSafeZone)}
                            title="सेफ-ज़ोन ऑन/ऑफ"
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                              showSafeZone
                                ? 'bg-sky-500/30 border border-sky-400 text-sky-200'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <Layers className="w-2.5 h-2.5 text-sky-400" />
                            <span>{showSafeZone ? 'Safe: On' : 'Safe'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsGraphicStudioGuideOpen(true)}
                            title="ग्राफ़िक स्टूडियो यूज़र गाइड"
                            className="w-5 h-5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-[10px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                          >
                            ?
                          </button>
                        </div>
                      </div>

                      <div className="w-full flex items-center justify-center p-1 sm:p-1.5 bg-slate-950/90 rounded-xl sm:rounded-2xl border border-slate-800 shadow-2xl">
                        <div className={`w-full max-w-[235px] xs:max-w-[255px] sm:max-w-[295px] md:max-w-[360px] lg:max-w-[400px] ${
                          card.aspectRatio === '9:16' ? 'aspect-[9/16]' : card.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'
                        } rounded-lg sm:rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 flex items-center justify-center bg-black relative mx-auto`}>
                          <CardPreview
                            card={card}
                            className="w-full h-full"
                            showSafeZone={showSafeZone}
                            onChange={handleUpdateCard}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: 33%–31% (Mobile) / 30% (Tablet) Vertical Step Menu */}
                    <div className="w-[33%] sm:w-[31%] md:w-[30%] min-w-0 flex flex-col justify-between py-0.5">
                      <div className="flex items-center justify-between px-0.5 mb-1">
                        <span className="text-[9.5px] sm:text-xs font-black text-amber-400 tracking-tight truncate">
                          एडिटर स्टेप्स
                        </span>
                        <span className={`text-[8.5px] sm:text-[10px] px-1 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                          calculateEditorProgress(card, activeStep).is100Percent
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {calculateEditorProgress(card, activeStep).percentage}%
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-1 sm:gap-1.5">
                        {MOBILE_STUDIO_STEPS.map((s) => {
                          const isCurrentActive = activeMobileStep === s.mobileStep;
                          const stepProgressKey = s.key as keyof ReturnType<typeof calculateEditorProgress>;
                          const isDone = Boolean(calculateEditorProgress(card, activeStep)[stepProgressKey]);
                          const theme = STUDIO_STEP_THEMES[s.mobileStep] || STUDIO_STEP_THEMES[1];

                          return (
                            <button
                              key={s.mobileStep}
                              type="button"
                              onClick={() => {
                                setIsMobileFocusedEditing(true);
                                setActiveMobileStep(s.mobileStep);
                                setActiveStep(s.internalStep);
                                resetMobileEditorScroll();
                              }}
                              className={`w-full py-1 sm:py-1.5 md:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[9.5px] sm:text-xs font-bold transition-all flex items-center justify-between cursor-pointer select-none border ${
                                isCurrentActive
                                  ? theme.activeBtn
                                  : 'bg-slate-900/90 text-slate-200 hover:bg-slate-800 border-slate-800/90 hover:text-white'
                              }`}
                            >
                              <span className="truncate pr-0.5 text-left flex items-center gap-1">
                                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] sm:text-[9.5px] font-mono font-black border ${
                                  isCurrentActive ? 'bg-black/30 text-white border-white/30' : theme.badge
                                }`}>
                                  {s.mobileStep}
                                </span>
                                <span className="truncate">{s.label}</span>
                              </span>
                              <span className="shrink-0 ml-0.5">
                                {isDone ? (
                                  <span className={`inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${
                                    isCurrentActive ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                                  }`}>
                                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                                  </span>
                                ) : isCurrentActive ? (
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Four-Button Quick Action Toolbar (JPG डाउनलोड | कैप्शन | ड्राफ्ट | रिफ्रेश) */}
                  <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto pt-1.5 pb-0.5 border-t border-slate-800/80 mt-1.5">
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {/* 1. JPG डाउनलोड (Download JPG) - Gated until 100% completion (Part 6) */}
                      {(() => {
                        const editorProgress = calculateEditorProgress(card, activeStep);
                        const isEnabled = editorProgress.is100Percent;
                        return (
                          <button
                            type="button"
                            disabled={!isEnabled || downloading || (isActionLocked && !isCurrentCardBonus)}
                            onClick={() => {
                              if (!isEnabled) {
                                showToast(`⚠️ डाउनलोड के लिए कृपया सभी 7 स्टेप 100% पूरे करें (${editorProgress.percentage}% पूर्ण)`);
                                return;
                              }
                              if (isActionLocked && !isCurrentCardBonus) {
                                showToast('⚠️ 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कृपया प्लान अपग्रेड करें।');
                                setCurrentTab('profile');
                                return;
                              }
                              handleDownload('jpeg');
                            }}
                            title={
                              !isEnabled
                                ? `डाउनलोड लॉक है — कृपया सभी 7 स्टेप्स 100% पूरे करें (${editorProgress.missingSteps.join(', ')})`
                                : isActionLocked && !isCurrentCardBonus
                                ? 'ट्रायल समाप्त — डाउनलोड लॉक'
                                : 'फाइनल JPG ग्राफिक डाउनलोड करें'
                            }
                            className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all ${
                              downloading
                                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 cursor-wait'
                                : isEnabled && (!isActionLocked || isCurrentCardBonus)
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300 active:scale-95 cursor-pointer'
                                : 'bg-slate-900/60 text-slate-500 border border-slate-800/60 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {downloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                            ) : !isEnabled ? (
                              <Lock className="w-3 h-3 text-slate-500" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-slate-950" />
                            )}
                            <span className="truncate">
                              {downloading ? (downloadProgressText || 'डाउनलोड...') : 'JPG डाउनलोड'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* 2. कैप्शन (Copy completed caption) - Strictly gated until 100% completion (Part 6) */}
                      {(() => {
                        const editorProgress = calculateEditorProgress(card, activeStep);
                        const isCaptionUnlocked = editorProgress.is100Percent;
                        return (
                          <button
                            type="button"
                            disabled={!isCaptionUnlocked}
                            onClick={() => {
                              if (!isCaptionUnlocked) {
                                showToast(`⚠️ कैप्शन कॉपी करने के लिए कृपया सभी 7 स्टेप 100% पूरे करें (${editorProgress.percentage}% पूर्ण)`);
                                return;
                              }
                              handleCopyCompletedCaption();
                            }}
                            title={
                              isCaptionUnlocked
                                ? 'सोशल मीडिया कैप्शन कॉपी करें'
                                : `कैप्शन लॉक है — कृपया सभी 7 स्टेप्स 100% पूरे करें (${editorProgress.missingSteps.join(', ')})`
                            }
                            className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              mobileCaptionCopied
                                ? 'bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300'
                                : isCaptionUnlocked
                                ? 'bg-slate-900 hover:bg-slate-850 text-sky-300 hover:text-white border border-sky-500/40 hover:border-sky-400 active:scale-95 cursor-pointer'
                                : 'bg-slate-900/60 text-slate-500 border border-slate-800/60 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {!isCaptionUnlocked ? (
                              <Lock className="w-3 h-3 text-slate-500" />
                            ) : mobileCaptionCopied ? (
                              <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-sky-400" />
                            )}
                            <span className="truncate">
                              {mobileCaptionCopied ? 'कॉपी हुआ!' : 'कैप्शन'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* 3. ड्राफ्ट (Open Drafts Modal) */}
                      <button
                        type="button"
                        onClick={() => setIsDraftsModalOpen(true)}
                        title="ड्राफ्ट सेव / रिस्टोर करें"
                        className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-850 text-amber-300 hover:text-white border border-slate-700/80 flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all"
                      >
                        <FolderClockIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate">ड्राफ्ट</span>
                      </button>

                      {/* 4. रिफ्रेश */}
                      <button
                        type="button"
                        onClick={handleRefreshPreview}
                        title="प्रीव्यू रिफ्रेश करें"
                        className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="truncate">रिफ्रेश</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 3: Full Active Step Editor Panel (Directly below frozen workspace, never hidden behind preview) */}
                <div
                  id="mobile-active-step-commands"
                  className="w-full flex-1 bg-slate-900/95 p-3 sm:p-4 md:p-6 pb-48 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto"
                >
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
                    onDownload={() => handleDownload('jpeg')}
                    downloading={downloading}
                    activeStep={activeStep}
                    onStepChange={(newStep) => {
                      setIsMobileFocusedEditing(true);
                      const found = MOBILE_STUDIO_STEPS.find((s) => s.internalStep === newStep);
                      if (found) {
                        setActiveMobileStep(found.mobileStep);
                      }
                      setActiveStep(newStep);
                      resetMobileEditorScroll();
                    }}
                    currentUser={currentUser}
                    mobileViewMode="steps"
                    onToggleMobileViewMode={setMobileViewMode}
                    onOpenCloudSettings={() => setIsCloudModalOpen(true)}
                    onLogout={handleLogout}
                    autoFillNews={autoFillNews}
                    isMobileLayout={true}
                  />
                </div>

                {/* Single Fixed Bottom Step Navigation Strip (Directly above AppBottomBarWeb, Part 3.11-3.12 & Part 4) */}
                <div className="fixed bottom-16 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-md border-t border-slate-800 shadow-2xl px-3 py-2.5 sm:py-3">
                  <div className="flex items-center justify-between gap-2 max-w-md sm:max-w-xl md:max-w-3xl mx-auto">
                    {/* 1. पिछला चरण (Neutral dark/grey button) */}
                    <button
                      type="button"
                      disabled={activeMobileStep <= 1}
                      onClick={() => {
                        if (activeMobileStep > 1) {
                          setIsMobileFocusedEditing(true);
                          const prev = activeMobileStep - 1;
                          setActiveMobileStep(prev);
                          const stepObj = MOBILE_STUDIO_STEPS.find((s) => s.mobileStep === prev);
                          if (stepObj) setActiveStep(stepObj.internalStep);
                          resetMobileEditorScroll();
                        }
                      }}
                      className="flex-1 py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-95 shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                      <span>पिछला चरण</span>
                    </button>

                    {/* 2. प्रीव्यू देखें (Secondary outlined accent button -> Opens Full-Screen Watermarked Preview Modal) */}
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('ai_news_open_graphic_preview'));
                      }}
                      className="flex-[1.15] py-2.5 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/60 active:scale-95 shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-sky-400" />
                      <span>प्रीव्यू देखें</span>
                    </button>

                    {/* 3. अगला चरण (Primary yellow/amber gradient button) */}
                    <button
                      type="button"
                      disabled={activeMobileStep >= MOBILE_STUDIO_STEPS.length}
                      onClick={() => {
                        if (activeMobileStep < MOBILE_STUDIO_STEPS.length) {
                          setIsMobileFocusedEditing(true);
                          const next = activeMobileStep + 1;
                          setActiveMobileStep(next);
                          const stepObj = MOBILE_STUDIO_STEPS.find((s) => s.mobileStep === next);
                          if (stepObj) setActiveStep(stepObj.internalStep);
                          resetMobileEditorScroll();
                        }
                      }}
                      className="flex-1 py-2.5 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 active:scale-95 shadow-md"
                    >
                      <span>अगला चरण</span>
                      <ChevronRight className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  2. DESKTOP / PC FULL-SCREEN WEB LAYOUT (>= 1280px)
                  ================================================== */}
              <div className="hidden xl:flex w-full flex-row items-start gap-4 xl:gap-6">
                {/* ==================================================
                    LEFT COLUMN: LOCKED / FREEZE (Larger Live Preview + 3 Action Buttons below)
                    ================================================== */}
                <div className="w-full lg:w-[420px] xl:w-[460px] 2xl:w-[490px] shrink-0 lg:sticky lg:top-[100px] z-20 flex flex-col gap-3 self-start">
                  {/* 1. LARGE LIVE 4:5 GRAPHIC PREVIEW CARD */}
                  <div className="w-full bg-white dark:bg-neutral-950 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm dark:shadow-2xl flex flex-col">
                    {/* Top Status Bar on Preview */}
                    <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-black">
                        <span className="text-amber-400">✳️</span>
                        <span>लाइव कार्ड प्रीव्यू (1080X1350)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400 font-bold">
                          4:5 Portrait HD
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSafeZone(!showSafeZone)}
                          title="सेफ-ज़ोन गाइड"
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            showSafeZone
                              ? 'bg-sky-500/30 border border-sky-400 text-sky-200'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          <Layers className="w-3 h-3 text-sky-400" />
                          <span>{showSafeZone ? 'सेफ-ज़ोन: ऑन' : 'सेफ-ज़ोन'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Neatly Scaled 4:5 Preview Box */}
                    <div className="w-full flex items-center justify-center py-1">
                      <div className="w-full max-w-[420px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl ring-1 ring-neutral-800 flex items-center justify-center bg-black">
                        <CardPreview
                          card={card}
                          className="w-full h-full object-contain"
                          showSafeZone={showSafeZone}
                          onChange={handleUpdateCard}
                        />
                      </div>
                    </div>

                    {/* Action Bar below Preview: 3 Responsive Buttons Row (1. JPG डाउनलोड, 2. कैप्शन, 3. ड्राफ्ट, 4. रिफ्रेश) */}
                    {(() => {
                      const editorProgress = calculateEditorProgress(card, activeStep);
                      const isExportReady = editorProgress.is100Percent;

                      return (
                        <>
                          <div className="flex items-center gap-1.5 sm:gap-2 w-full mt-1.5 pt-1.5 border-t border-neutral-800/80 shrink-0">
                            {/* 1. JPG डाउनलोड - Locked until 100% completion */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!isExportReady) {
                                  showToast(`⚠️ JPG डाउनलोड के लिए कृपया सभी 7 स्टेप पूरे करें (वर्तमान: ${editorProgress.percentage}% पूर्ण)।`);
                                  return;
                                }
                                handleDownload('jpeg');
                              }}
                              disabled={downloading || !isExportReady || (isActionLocked && !isCurrentCardBonus)}
                              className={`flex-[1.5] min-w-[120px] py-2 sm:py-2.5 px-2.5 sm:px-3 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                                !isExportReady
                                  ? 'bg-neutral-850 text-neutral-500 border border-neutral-800 opacity-65 cursor-not-allowed'
                                  : isActionLocked && !isCurrentCardBonus
                                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 opacity-60 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 cursor-pointer disabled:opacity-50'
                              }`}
                              title={
                                !isExportReady
                                  ? `डाउनलोड लॉक: कृपया सभी 7 स्टेप पूरे करें (${editorProgress.percentage}% पूर्ण)`
                                  : isActionLocked && !isCurrentCardBonus
                                  ? 'ट्रायल समाप्त — डाउनलोड लॉक'
                                  : 'कार्ड को HD JPG इमेज में डाउनलोड करें'
                              }
                            >
                              {!isExportReady ? (
                                <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
                              ) : isActionLocked && !isCurrentCardBonus ? (
                                <Lock className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                              ) : (
                                <Download className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                              )}
                              <span className="whitespace-nowrap font-bold text-xs">{downloading ? (downloadProgressText || 'डाउनलोड...') : 'JPG डाउनलोड'}</span>
                            </button>

                            {/* 2. कैप्शन - Locked until 100% completion */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!isExportReady) {
                                  showToast(`⚠️ कैप्शन के लिए कृपया सभी 7 स्टेप पूरे करें (वर्तमान: ${editorProgress.percentage}% पूर्ण)।`);
                                  return;
                                }
                                if (isActionLocked && !isCurrentCardBonus) {
                                  showToast('⚠️ 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कैप्शन हेतु प्लान अपग्रेड करें।');
                                  setCurrentTab('profile');
                                } else {
                                  setIsCaptionModalOpen(true);
                                }
                              }}
                              disabled={!isExportReady || (isActionLocked && !isCurrentCardBonus)}
                              className={`flex-1 min-w-[80px] py-2 sm:py-2.5 px-2 sm:px-3 font-semibold text-[11px] sm:text-xs rounded-xl border shadow flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                                !isExportReady
                                  ? 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-60 cursor-not-allowed'
                                  : isActionLocked && !isCurrentCardBonus
                                  ? 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-60 cursor-not-allowed'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700 cursor-pointer'
                              }`}
                              title={!isExportReady ? 'कैप्शन लॉक: सभी 7 स्टेप पूरे करें' : 'कैप्शन और शेयर'}
                            >
                              {!isExportReady ? <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400/80" /> : <Share2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                              <span className="whitespace-nowrap">कैप्शन</span>
                            </button>

                            {/* 3. ड्राफ्ट */}
                            <button
                              type="button"
                              onClick={handleSaveCurrentCardAsDraft}
                              className="flex-1 min-w-[70px] py-2 sm:py-2.5 px-2 sm:px-2.5 bg-slate-800 hover:bg-slate-750 text-amber-300 font-semibold text-[11px] sm:text-xs rounded-xl border border-amber-500/30 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                              title="प्रोजेक्ट को ड्राफ्ट्स में सुरक्षित करें"
                            >
                              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span className="whitespace-nowrap">ड्राफ्ट</span>
                            </button>

                            {/* 4. रिफ्रेश */}
                            <button
                              type="button"
                              onClick={handleRefreshPreview}
                              className="flex-1 min-w-[70px] py-2 sm:py-2.5 px-2 sm:px-2.5 bg-neutral-800 hover:bg-neutral-700 text-sky-300 font-semibold text-[11px] sm:text-xs rounded-xl border border-neutral-700 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                              title="प्रीव्यू रिफ्रेश करें"
                            >
                              <RefreshCw className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                              <span className="whitespace-nowrap">रिफ्रेश</span>
                            </button>
                          </div>

                          {/* Progress Warning Banner if Steps < 100% (Part 11 Lock Requirement) */}
                          {!isExportReady && (
                            <div className="w-full mt-2 p-2 bg-amber-950/70 border border-amber-600/50 rounded-xl flex items-center justify-between text-[11px] text-amber-300 shadow-sm animate-in fade-in">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>JPG डाउनलोड और कैप्शन के लिए कृपया सभी 7 स्टेप पूरे करें।</span>
                              </div>
                              <span className="font-mono font-black text-amber-400 bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-500/40 shrink-0">
                                {editorProgress.percentage}% पूर्ण
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Informative Note Card below Buttons */}
                    <div className="mt-3 p-3 bg-neutral-900/70 border border-neutral-800/80 rounded-xl flex items-start gap-2">
                      <span className="text-amber-400 text-sm mt-0.5">ℹ️</span>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        यह कार्ड विशुद्ध आपकी "{card.channelNameHi || 'एआई न्यूज़ मेकर'}" थीम के अनुसार डिज़ाइन किया गया है। बैकग्राउंड फोटो, पोस्टर ओवरले, हेडलाइन का स्मार्ट रिज़म मोड, और फुटर बार पूरी तरह कस्टमाइज़ेबल हैं।
                      </p>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    RIGHT COLUMN: TOP STEP TABS BAR + COMMANDS AREA FOR ACTIVE STEP
                    ================================================== */}
                <div className="flex-1 w-full min-w-0 flex flex-col space-y-3">
                  {/* 🎛️ Top Steps Selector: All 8 Steps Horizontal Scroll Bar (Sticky on Scroll) */}
                  <div className="sticky top-[60px] z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm dark:shadow-xl space-y-3 text-slate-900 dark:text-white">
                    {/* Top Bar Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
                          <span>🎛️</span>
                          <span>एडिटर स्टेप्स (स्टेप {activeStep} / {STUDIO_STEPS.length})</span>
                        </span>
                        {(() => {
                          const progress = calculateEditorProgress(card, activeStep);
                          return (
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-black shadow-sm flex items-center gap-1 ${
                              progress.is100Percent
                                ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300'
                                : 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                            }`}>
                              <span>📊</span>
                              <span>{progress.percentage}% पूर्ण</span>
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black shadow-sm flex items-center gap-1">
                          <span>⚡</span> लाइव मोड
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1">
                          <span>📱</span> 4:5 पोर्ट्रेट
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (0 to 100%) */}
                    {(() => {
                      const progress = calculateEditorProgress(card, activeStep);
                      return (
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progress.is100Percent
                                ? 'bg-emerald-400'
                                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      );
                    })()}

                    {/* Horizontal Scrollable Tabs: Step 1 to 7 with Multicolor Themes */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                      {STUDIO_STEPS.map((s) => {
                        const isActive = activeStep === s.step;
                        const theme = STUDIO_STEP_THEMES[s.step] || STUDIO_STEP_THEMES[1];
                        const stepProgressKey = `step${s.step}` as keyof ReturnType<typeof calculateEditorProgress>;
                        const isDone = Boolean(calculateEditorProgress(card, activeStep)[stepProgressKey]);

                        return (
                          <button
                            key={s.step}
                            data-testid={`studio-step-${s.step}`}
                            type="button"
                            onClick={() => {
                              setActiveStep(s.step);
                              setActiveMobileStep(s.step);
                              setMobileViewMode('steps');
                              scrollToStepById(s.id);
                            }}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                              isActive
                                ? theme.activeBtn
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9.5px] font-mono font-black border ${
                              isActive ? 'bg-black/30 text-white border-white/30' : theme.badge
                            }`}>
                              {s.step}
                            </span>
                            <span>{s.label}</span>
                            {isDone && (
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commands Area (Scrollable internally right beneath selector) */}
                  <div className="w-full bg-slate-900/90 p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-2xl max-h-[calc(100vh-180px)] overflow-y-auto">
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
                      onStepChange={setActiveStep}
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
              </>
            </ErrorBoundary>
          )}
        </main>
      )}

      {/* 2. Videos Tab (Rich Video News Feed) */}
      {currentTab === 'videos' && (
        <VideosScreenWeb
          videos={videos}
          currentUser={currentUser}
          onOpenStudioWithVideo={(video) => {
            handleOpenStudioWithVideo(video);
            navigateToTab('studio');
          }}
          onAdminAddVideo={(newVid) => {
            setVideos((prev) => [newVid, ...prev.filter((v) => v.id !== newVid.id)]);
            try {
              const saved = JSON.parse(localStorage.getItem('app_admin_videos') || '[]');
              localStorage.setItem('app_admin_videos', JSON.stringify([newVid, ...saved.filter((v: any) => v.id !== newVid.id)]));
              const adminEmail = currentUser?.email || 'breakingnewswala.com@gmail.com';
              fetch(`${getApiBaseUrl()}/api/admin/videos/upload`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-key': 'master-admin',
                  'x-user-role': 'admin',
                  'x-admin-email': adminEmail,
                  'x-user-email': adminEmail,
                },
                body: JSON.stringify(newVid),
              }).catch(() => {});
            } catch {}
          }}
          onAdminUpdateVideo={(updatedVid) => {
            setVideos((prev) => prev.map((v) => (v.id === updatedVid.id ? updatedVid : v)));
            try {
              const adminEmail = currentUser?.email || 'breakingnewswala.com@gmail.com';
              fetch(`${getApiBaseUrl()}/api/admin/videos/${encodeURIComponent(updatedVid.id)}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-key': 'master-admin',
                  'x-user-role': 'admin',
                  'x-admin-email': adminEmail,
                  'x-user-email': adminEmail,
                },
                body: JSON.stringify(updatedVid),
              }).catch(() => {});
            } catch {}
          }}
          onAdminDeleteVideo={(videoId) => {
            // Permanently delete video - will NEVER reappear
            setVideos((prev) => prev.filter((v) => v.id !== videoId));
            try {
              const deletedRaw = localStorage.getItem('app_deleted_video_ids');
              const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
              if (!deletedList.includes(videoId)) {
                deletedList.push(videoId);
                localStorage.setItem('app_deleted_video_ids', JSON.stringify(deletedList));
              }
              const currentSaved = JSON.parse(localStorage.getItem('app_admin_videos') || '[]');
              localStorage.setItem('app_admin_videos', JSON.stringify(currentSaved.filter((v: any) => v.id !== videoId)));

              const adminEmail = currentUser?.email || 'breakingnewswala.com@gmail.com';
              fetch(`${getApiBaseUrl()}/api/admin/videos/${encodeURIComponent(videoId)}`, {
                method: 'DELETE',
                headers: {
                  'x-admin-key': 'master-admin',
                  'x-user-role': 'admin',
                  'x-admin-email': adminEmail,
                  'x-user-email': adminEmail,
                },
              }).catch(() => {});
            } catch {}
          }}
          onNavigateToTab={navigateToTab}
        />
      )}

      {/* 4. Newsroom Tab (Drafts & Saved Projects Workspace) */}
      {(currentTab === 'newsroom' || currentTab === 'drafts') && (
        <NewsroomScreenWeb
          currentUser={currentUser}
          onOpenStudioWithDraft={handleOpenDraftInStudio}
          onNavigateToStudio={() => {
            navigateToTab('studio');
          }}
          onNavigateToVideos={() => {
            navigateToTab('videos');
          }}
          onNavigateToControlPanel={() => {
            navigateToTab('profile');
          }}
        />
      )}

      {/* 5. Profile & Control Panel Tab (10 Options + Channel Branding + Plans + APK Download) */}
      {(currentTab === 'profile' || currentTab === 'export') && (
        <ErrorBoundary fallbackTitle="कंट्रोल रूम लोड करने में समस्या आई">
          <ProfileScreenWeb
            currentUser={currentUser}
            onLogout={handleLogout}
            onAddNewPost={handleAddNewPost}
            onOpenStudio={(templateId?: string) => {
              if (templateId) {
                const df = getDynamicFrameById(templateId);
                if (df) {
                  setCard((prev) => ({
                    ...prev,
                    frameDesign: df.id,
                    templateId: df.id,
                    aspectRatio: df.aspectRatio || '4:5',
                    customDynamicFrame: df,
                    isTestMode: true,
                  }));
                } else {
                  setCard((prev) => ({
                    ...prev,
                    frameDesign: templateId,
                    templateId: templateId,
                    isTestMode: true,
                  }));
                }
              }
              navigateToTab('studio');
            }}
            onNavigateToGenerator={() => {
              navigateToTab('studio');
            }}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </ErrorBoundary>
      )}

      {/* 6. Terms & Conditions */}
      {currentTab === 'terms' && (
        <TermsPage
          onBack={() => navigateToTab('home')}
          onNavigateToSupport={() => navigateToTab('support')}
        />
      )}

      {/* 7. Privacy Policy */}
      {currentTab === 'privacy' && (
        <PrivacyPolicyPage
          onBack={() => navigateToTab('home')}
          onNavigateToDeleteAccount={() => navigateToTab('delete-account')}
          onNavigateToSupport={() => navigateToTab('support')}
        />
      )}

      {/* 8. Refunds & Cancellations Policy */}
      {currentTab === 'refunds' && (
        <RefundCancellationPolicyPage
          onBack={() => navigateToTab('home')}
          onNavigateToTab={navigateToTab}
          onNavigateToSupport={() => navigateToTab('support')}
        />
      )}

      {/* 9. Account Deletion */}
      {currentTab === 'delete-account' && (
        <AccountDeletionPage
          onBack={() => navigateToTab('home')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 9. Support & Contact Us */}
      {currentTab === 'support' && (
        <SupportContactPage
          onBack={() => navigateToTab('home')}
          currentUser={currentUser}
        />
      )}

      {/* Website Footer — Shared on Home, Video & Reels, and Newsroom */}
      {(currentTab === 'home' || currentTab === 'videos' || currentTab === 'newsroom' || currentTab === 'drafts') && (
        <AppFooterWeb
          onNavigateToTab={navigateToTab}
          onOpenPlans={() => navigateToTab('profile')}
        />
      )}

      {/* Persistent Bottom Bar - 1:1 identical across web browser and Android APK */}
      <AppBottomBarWeb
        currentTab={currentTab}
        currentUser={currentUser}
        isGraphicStudioActive={currentTab === 'studio' && studioMode === 'graphic'}
        onSelectTab={(tab) => {
          navigateToTab(tab);
        }}
      />

      {/* Channel Profile Setup & Branding Modal - Mandatory for new signups */}
      <ChannelOnboardingModal
        isOpen={isOnboardingOpen}
        initialProfile={getSavedChannelProfile() || undefined}
        userName={currentUser?.name}
        onSaveProfile={(p) => {
          handleSaveProfile(p);
          localStorage.setItem('is_onboarding_completed', 'true');
          setIsOnboardingCompleted(true);
          setIsOnboardingOpen(false);
          showToast('🎉 चैनल व प्रोफाइल सेटअप सफलतापूर्वक पूर्ण हुआ!');
          if (!isAndroidEnvironment) {
            setTimeout(() => {
              setIsInstallModalOpen(true);
            }, 1200);
          }
        }}
        onClose={() => {
          if (localStorage.getItem('is_onboarding_completed') === 'true') {
            setIsOnboardingOpen(false);
          }
        }}
        isClosable={localStorage.getItem('is_onboarding_completed') === 'true'}
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

      {/* Dedicated Graphic Photo Studio Workflow Guide Modal */}
      <GraphicStudioGuideModal
        isOpen={isGraphicStudioGuideOpen}
        onClose={() => setIsGraphicStudioGuideOpen(false)}
      />

      {/* 9. DRAFT RESTORE & MANAGER MODAL */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        onRestoreDraft={handleRestoreDraft}
        currentDraftId={currentDraftId}
      />

      {/* 10. GOOGLE SHEETS USER DATABASE AUTO-SYNC MODAL */}
      <GoogleSheetsUserSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      {/* 11. PWA ADD TO HOME SCREEN / WEB APP PROMPT MODAL */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* 12. SHARED BRANDED NEWS LOADING MODAL */}
      <BrandedNewsLoadingModal
        isOpen={brandedLoader.isOpen}
        mode={brandedLoader.mode}
        title={brandedLoader.title}
        subtitles={brandedLoader.subtitles}
        durationSeconds={brandedLoader.durationSeconds}
        error={brandedLoader.error}
        onRetry={brandedLoader.onRetry}
        onComplete={() => setBrandedLoader((prev) => ({ ...prev, isOpen: false, error: null }))}
        onCancel={() => setBrandedLoader((prev) => ({ ...prev, isOpen: false, error: null }))}
      />

      {/* 13. Mobile Audio & Live News Notification Permission Modal */}
      <NotificationPermissionModal />
    </div>
  );
}
