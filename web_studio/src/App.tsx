import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsCardData, AIAnalysisResult, ChannelProfile, FrameDesign } from './types';
import { INITIAL_PRESETS, PLACEHOLDER_NEWS_IMG } from './data/presets';
import { CardPreview } from './components/CardPreview';
import { CardEditor } from './components/CardEditor';
import { AIGenerateImageModal } from './components/AIGenerateImageModal';
import { NewsCommandModal } from './components/NewsCommandModal';
import { CaptionModal } from './components/CaptionModal';
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
import { AuthWelcomeScreen } from './components/AuthWelcomeScreen';
import { getApiUrl, getApiBaseUrl } from './lib/apiConfig';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { StepNavigator, scrollToStepById, DEFAULT_STEPS } from './components/StepNavigator';
import { renderCardToCanvas, generateCardCanvas, downloadCanvas } from './lib/CanvasExporter';
import { validateCardBeforeDownload } from './lib/canonicalLayoutEngine';
import { extractLeaderFromHeadline } from './lib/speakerUtils';
import { generateGraphicDownloadFileName, getFormattedHindiDate } from './lib/dateUtils';
import { getProfileHeaderFooter, getPermanentUserLogo } from './lib/profileConfig';
import { syncAllSourcesLive, syncAndMigrateLocalApprovals } from './lib/rssSourceManager';
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
import { AppFooterWeb } from './components/AppFooterWeb';
import { triggerBreakingNewsAlert } from './lib/notificationManager';
import {
  isUserAdmin,
  setAdminSystemMode,
  getUserSubscription,
  fetchAuthoritativeSubscription,
  isUserActionAllowed,
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
  | 'delete-account'
  | 'support';

const STORAGE_KEY = 'breaking_news_card_state_v3';

export const STUDIO_STEPS = [
  { step: 1, id: 'step-frame', label: 'फ्रेम्स', name: 'फ्रेम्स', icon: '🖼️', title: 'फ्रेम टेम्पलेट्स (हेडर स्टाइल चुनें)' },
  { step: 2, id: 'step-ai', label: 'एआई टूल्स', name: 'एआई टूल्स', icon: '🤖', title: 'AI ऑटोमेशन टूल्स (Automated News & Photo)' },
  { step: 3, id: 'step-headline', label: 'हेडलाइन', name: 'हेडलाइन', icon: '✍️', title: 'मुख्य हेडलाइन व टेक्स्ट' },
  { step: 4, id: 'step-photo', label: 'फोटो व वॉटरमार्क', name: 'फोटो व वॉटरमार्क', icon: '📷', title: 'फोटो व वॉटरमार्क (फोटो चयन व वॉटरमार्क)' },
  { step: 5, id: 'step-location', label: 'स्थान व दिनांक', name: 'स्थान व दिनांक', icon: '📍', title: 'स्थान व दिनांक (लोकेशन व डेट स्टैम्प)' },
  { step: 6, id: 'step-header-footer', label: 'हैडर और फुटर', name: 'हैडर-फुटर', icon: '📜', title: 'लोगो, हेडर व फुटर PNG' },
  { step: 7, id: 'step-download', label: 'डाउनलोड व कैप्शन', name: 'डाउनलोड व कैप्शन', icon: '⬇️', title: 'डाउनलोड व कैप्शन (HD कार्ड डाउनलोड व सोशल कैप्शन)' },
];

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

  // Keep the browser tab title consistently "AI News Maker"
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'AI News Maker';
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
          const clean = parsed.filter((p: any) => p && p.id && !deletedSet.has(p.id) && !String(p.id).startsWith('live-post-'));
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
    return [];
  });

  const [isSyncingNews, setIsSyncingNews] = useState(false);

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
      const res = await fetch(`${baseUrl}/api/news-posts?_t=${Date.now()}${roleParam}`, { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const apiPosts = Array.isArray(data) ? data : (data?.posts || []);
        if (Array.isArray(apiPosts) && apiPosts.length > 0) {
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
            setPosts(cleanApi);
            try {
              localStorage.setItem('app_news_posts_v2', JSON.stringify(cleanApi));
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

  useEffect(() => {
    fetchLiveNews();
    const interval = setInterval(fetchLiveNews, 12000); // 12-second real-time polling for news
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPosts),
      }).catch((err) => console.warn('Sync to backend API failed:', err));
    } catch {}
  };

  const [videos, setVideos] = useState<VideoFeedItem[]>(() => {
    try {
      const isDummyVideo = (v: any) => {
        if (!v || !v.id) return true;
        if (['vid-1', 'vid-2', 'vid-3', 'vid-4', 'vid-5'].includes(v.id)) return true;
        if (v.videoUrl && typeof v.videoUrl === 'string' && v.videoUrl.includes('mov_bbb.mp4')) return true;
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
        if (['vid-1', 'vid-2', 'vid-3', 'vid-4', 'vid-5'].includes(v.id)) return true;
        if (v.videoUrl && typeof v.videoUrl === 'string' && v.videoUrl.includes('mov_bbb.mp4')) return true;
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
          setVideos((prev) => {
            const map = new Map<string, any>();
            cleanList.forEach((v: any) => map.set(v.id, v));
            prev.forEach((v: any) => {
              if (!map.has(v.id) && !deletedSet.has(v.id) && !isDummyVideo(v)) {
                map.set(v.id, v);
              }
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('app_admin_videos', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Real-time videos sync failed:', err);
    }
  };

  useEffect(() => {
    fetchLiveVideos();
    const interval = setInterval(fetchLiveVideos, 15000); // 15-second real-time polling
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
      // Default to Master Admin session (breakingnewswala.com@gmail.com) so preview screen opens Master Admin directly
      try {
        localStorage.setItem('reporter_auth_session', JSON.stringify(DEFAULT_REPORTER_USER));
        localStorage.setItem('user_channel_profile', JSON.stringify(DEFAULT_CHANNEL_PROFILE));
        localStorage.setItem('is_onboarding_completed', 'true');
        localStorage.setItem('ai_news_maker_admin_system_mode', 'admin');
      } catch {}
      return DEFAULT_REPORTER_USER;
    } catch {
      return DEFAULT_REPORTER_USER;
    }
  });

  useEffect(() => {
    fetchLiveNews();
  }, [currentUser?.role]);

  // Onboarding completion status (Login -> Details setup -> App)
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    try {
      const explicitLogout = localStorage.getItem('user_explicitly_logged_out');
      if (explicitLogout === 'true') return false;
      const flag = localStorage.getItem('is_onboarding_completed');
      if (flag === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  // Welcome flow - show primary AuthWelcomeScreen with Google Login only if explicitly logged out or unauthenticated
  const [showAuthWelcomeScreen, setShowAuthWelcomeScreen] = useState<boolean>(() => {
    try {
      const explicitLogout = localStorage.getItem('user_explicitly_logged_out');
      if (explicitLogout === 'true') return true;
      const flag = localStorage.getItem('show_auth_welcome_screen');
      if (flag === 'true') return true;
      return false;
    } catch {
      return false;
    }
  });

  // Guest bypass mode - allows unauthenticated users to explore home screen without authentication barrier
  const [bypassAuthForGuest, setBypassAuthForGuest] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('guest_mode_active') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOpenWelcome = () => setShowAuthWelcomeScreen(true);
    window.addEventListener('open_auth_welcome_screen', handleOpenWelcome);
    return () => window.removeEventListener('open_auth_welcome_screen', handleOpenWelcome);
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
  const [mobileViewMode, setMobileViewMode] = useState<'steps' | 'all'>('steps');

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
        whatsappNumber: (savedProfile.whatsappNumber || savedProfile.mobileNumber || '').trim(),
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
      whatsappNumber: (profile.whatsappNumber || profile.mobileNumber || '').trim(),
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
    try {
      sessionStorage.removeItem('guest_mode_active');
    } catch {}
    setBypassAuthForGuest(false);
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
          whatsappNumber: (savedProfile.whatsappNumber || savedProfile.mobileNumber || '').trim(),
          websiteUrl: (savedProfile.websiteUrl !== undefined ? savedProfile.websiteUrl : prev.websiteUrl || '').trim(),
          showWebsite: savedProfile.showWebsite !== false,
          showMobileNumber: savedProfile.showMobileNumber !== false,
          activeSocialIcons: activeSocialKeys.length > 0 ? activeSocialKeys : prev.activeSocialIcons,
        }));
      }
    }
  }, [currentTab]);

  // Automatically apply profile-configured Header/Footer settings for the active template
  useEffect(() => {
    const profileConfig = getProfileHeaderFooter(card.frameDesign || 'graphic_001');
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
  const [commandModalInitialTab, setCommandModalInitialTab] = useState<'link' | 'command' | 'manual'>('link');
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(() => getActiveDraftId() || undefined);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  const isAdminUser = isUserAdmin(currentUser);
  const actionAllowance = isUserActionAllowed(currentUser, userSubscription);
  const isActionLocked = !isAdminUser && !actionAllowance.allowed;
  const isCurrentCardBonus = Boolean(card?.isBonus);
  const isExpiredUser = !isAdminUser && !userSubscription?.isBlocked && Boolean(
    userSubscription?.isPlanExpired ||
    userSubscription?.isTrialExpired ||
    (userSubscription?.daysRemaining !== undefined && userSubscription.daysRemaining <= 0)
  );
  const isUserBlocked = !isAdminUser && Boolean(
    userSubscription?.isBlocked ||
    (currentUser?.email && localStorage.getItem(`user_blocked_${currentUser.email.toLowerCase().trim()}`) === 'true')
  );
  const [blockReviewMessage, setBlockReviewMessage] = useState('');
  const [blockReviewMobile, setBlockReviewMobile] = useState('');
  const [isSubmittingBlockReview, setIsSubmittingBlockReview] = useState(false);
  const [blockReviewSubmitted, setBlockReviewSubmitted] = useState(false);

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

  // Full reset / clean card to default template matching user specification (Part C)
  const handleResetCard = () => {
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
      headline: '',
      formattedHeadline: '',
      highlightWords: [],
      headlineAlign: 'center',
      headlineFontSize: 20,
      location: savedProfile?.district || 'लोकेशन',
      summary: '',
      category: 'ताज़ा खबर',
      images: {
        main: '',
        second: '',
        third: '',
        fourth: '',
      },
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
      whatsappNumber: (savedProfile?.whatsappNumber || savedProfile?.mobileNumber || '').trim(),
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
      showSuperBreakingWatermark: false,
      showTextWatermark: false,
      showAiPhotoBadge: false,
      showSymbolicPhotoBadge: false,
      customTextOverlays: [],
      showLocation: true,
      showCallout: false,
      calloutTag: '',
      layout: 'single',
      aspectRatio: '4:5',
      highlightColor: '#FFE600',
      showMasterBranding: true,
      extractedArticlePhotos: [],
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

    // Dispatch studio reset event so InlineAiNewsTools clears its internal state & URL
    window.dispatchEvent(new CustomEvent('ai_news_studio_reset'));

    setActiveStep(1);
    showToast('🔄 ग्राफ़िक स्टूडियो सफलतापूर्वक रीसेट हो गया!');
  };

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
    const isBonusCard = Boolean(card?.isBonus);
    if (isActionLocked && !isBonusCard) {
      showToast('⚠️ आपका 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कार्ड डाउनलोड करने के लिए कृपया मेंबरशिप प्लान चुनें।');
      setCurrentTab('profile');
      return;
    }
    // Verify entitlement with server
    try {
      const verifyRes = await fetch(getApiUrl('/api/verify-download-entitlement'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser?.email, isBonus: isBonusCard }),
      });
      if (verifyRes.status === 403) {
        const data = await verifyRes.json();
        showToast(`⚠️ ${data.error || 'ट्रायल समाप्त हो चुका है। कृपया प्लान चुनें।'}`);
        setCurrentTab('profile');
        return;
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
      } catch (renderErr) {
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
      showToast('❌ इमेज डाउनलोड करने में त्रुटि हुई, कृपया पुनः प्रयास करें');
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
      } catch (e) {
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

  const handleOpenStudioWithNews = (post: NewsFeedPost) => {
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
    if (post.manualThumbnailUrl && post.manualThumbnailUrl.trim()) {
      targetImageForStudio = post.manualThumbnailUrl.trim();
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
    const secondPhoto = articlePhotos[1] || primaryPhoto;
    const thirdPhoto = articlePhotos[2] || primaryPhoto;
    const fourthPhoto = articlePhotos[3] || secondPhoto || primaryPhoto;

    setCard((prev) => ({
      ...prev,
      sourceNewsId: post.id,
      isBonus: Boolean(post.isBonus),
      originalHeadline: post.title,
      frameDesign: 'graphic_001',
      layout: 'single',
      showDate: false,
      showWatermark: false,
      showLocation: Boolean(effectiveLoc && effectiveLoc.trim()),
      headline: '',
      location: effectiveLoc,
      category: post.categoryName,
      summary: '',
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
    setActiveStep(2); // Redirect straight to Step 2 (Graphic Photo Studio AI Tools)
    setToastMessage('✅ AI टूल्स में खबर लोड हुई — संतुलित हेडलाइन व कैप्शन तैयार हो रहे हैं!');
    setTimeout(() => {
      scrollToStepById('step-ai');
    }, 150);

    // Instantly copy social media caption to clipboard
    const savedProf = getSavedChannelProfile();
    const userTag = savedProf?.username ? `#${savedProf.username.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')}` : '';
    const locLine = effectiveLoc ? `\n\n📍 स्थान: ${effectiveLoc}` : '';
    const cleanEffectiveLoc = effectiveLoc ? effectiveLoc.split(',')[0].trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '') : '';
    const locTag = cleanEffectiveLoc ? `#${cleanEffectiveLoc}` : '';
    const allTags = [userTag, locTag, '#BreakingNews', '#HindiNews', '#AINewsMaker'].filter(Boolean).join(' ');
    const captionText = `${post.title}${locLine}\n\n${post.summary || ''}\n\n${allTags}`.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(captionText).catch(() => {});
    }
  };

  const handleOpenStudioWithVideo = (vid: VideoFeedItem) => {
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
      const raw = localStorage.getItem('app_deleted_news_ids_v1');
      const set = new Set(raw ? JSON.parse(raw) : []);
      set.add(postId);
      localStorage.setItem('app_deleted_news_ids_v1', JSON.stringify(Array.from(set)));
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
    currentTab === 'delete-account' ||
    currentTab === 'support';

  // Primary Screen with Google Login Steps is enforced for all unauthenticated visitors
  if (!isPublicLegalPage && !bypassAuthForGuest && (showAuthWelcomeScreen || !currentUser || !isOnboardingCompleted)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{toastMessage}</span>
          </div>
        )}
        <AuthWelcomeScreen
          initialStep={currentUser && !isOnboardingCompleted ? 2 : 1}
          currentUser={currentUser}
          onSkipToHome={() => {
            try {
              sessionStorage.setItem('guest_mode_active', 'true');
            } catch {}
            setBypassAuthForGuest(true);
            setShowAuthWelcomeScreen(false);
            navigateToTab('home');
            showToast('होम स्क्रीन पर आपका स्वागत है!');
          }}
          onLoginSuccess={(user) => {
            try {
              sessionStorage.removeItem('guest_mode_active');
            } catch {}
            setBypassAuthForGuest(false);
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
            try {
              const cleanEmail = user.email?.toLowerCase().trim() || '';
              const userSpecificStr = cleanEmail ? localStorage.getItem(`user_profile_${cleanEmail}`) : null;
              const profileStr = userSpecificStr || localStorage.getItem('user_channel_profile');
              if (profileStr) {
                const parsed = JSON.parse(profileStr);
                if (parsed?.channelNameHi) {
                  localStorage.setItem('user_channel_profile', JSON.stringify(parsed));
                }
              }
            } catch {
              // proceed
            }
            // Ensure onboarding is marked completed so the user enters the homepage immediately
            setIsOnboardingCompleted(true);
            localStorage.setItem('is_onboarding_completed', 'true');
            navigateToTab('home');
            showToast(`स्वागत है, ${user.name || 'यूज़र'}!`);
          }}
          onCompleteDetails={(profile, updatedUser) => {
            try {
              sessionStorage.removeItem('guest_mode_active');
            } catch {}
            setBypassAuthForGuest(false);
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-neutral-950 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-neutral-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation - Always visible in Home, Video, Newsroom, Control Room. In Studio: visible ONLY on Desktop (hidden md:block), preserving mobile & APK layout unchanged */}
      <div className={`sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md shadow-md ${(currentTab === 'studio' || currentTab === 'generator') ? 'hidden md:block' : ''}`}>
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
                  <span className="text-rose-400 font-black">अस्थाई रूप से निलंबित (Blocked)</span>
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

      {/* Plan / Trial Expired Warning Banner (Part 7: Centered & Constrained to max-w-5xl) */}
      {!userSubscription?.isBlocked && (userSubscription?.isPlanExpired || userSubscription?.isTrialExpired || (userSubscription?.daysRemaining !== undefined && userSubscription.daysRemaining <= 0)) && (
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
                <h3 className="text-base font-black text-white">सदस्यता समाप्त (Plan Expired)</h3>
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
      )}

      {/* 2. News Generator / Studio Tab */}
      {(currentTab === 'generator' || currentTab === 'studio') && (
        <ErrorBoundary fallbackTitle="ग्राफिक स्टूडियो लोड करने में समस्या आई">
          <main className="flex-1 max-w-[1600px] w-full mx-auto p-1.5 sm:p-4 pb-24 text-slate-900">
          {/* Studio Type Selector: On desktop shows both Graphic & Video; on mobile only shows Graphic unless opened via 'इस वीडियो को बनाएँ' */}
          <div className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${
            isStudioSelectorVisible && (!studioInitialItem ? 'max-h-20 opacity-100 mb-3' : 'max-h-20 opacity-100 mb-3')
          }`}>
            <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-lg max-w-lg mx-auto">
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
                <span>ग्राफिक फोटो स्टूडियो</span>
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

          {studioMode === 'video' ? (
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
          ) : (
            <>
              {/* ============================================================== */}
              {/* 1. MOBILE & TABLET RESPONSIVE WORKSPACE (lg:hidden) */}
              {/* ============================================================== */}
              <div className="lg:hidden w-full flex flex-col min-h-screen">
                <div
                  id="mobile-studio-workspace"
                  className="w-full bg-slate-950/95 p-2 shadow-2xl transition-all flex flex-col items-center max-w-lg mx-auto"
                >
                  {/* 2. Preview canvas (4:5 or selected ratio) near top */}
                  <div className="w-full max-w-[340px] sm:max-w-[400px] aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-neutral-800 shadow-2xl bg-black flex items-center justify-center relative my-1">
                    <CardPreview
                      card={card}
                      className="w-full h-full"
                      showSafeZone={showSafeZone}
                      onChange={handleUpdateCard}
                    />
                  </div>

                  {/* 3. Compact Refresh and Draft controls */}
                  <div className="flex items-center justify-between w-full max-w-[340px] sm:max-w-[400px] py-1.5 px-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm" />
                      <span className="text-red-400 font-black">लाइव कैनवास (4:5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-600/50 flex items-center gap-1 cursor-pointer transition active:scale-95"
                        title="ड्राफ्ट सेव करें"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ड्राफ्ट</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCard}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
                        title="नया सत्र / रीसेट"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                        <span>रिफ्रेश</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. Horizontal left-to-right editor steps with sticky positioning & swipe guidance */}
                  <div className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xl my-1">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 px-1 gap-2">
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>स्टेप {activeStep}/7</span>
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-400/10 text-amber-300 border-amber-400/30 flex items-center gap-1 shrink-0">
                        <span>👉</span>
                        <span>और चरण देखने के लिए दाईं ओर स्वाइप करें</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                      {STUDIO_STEPS.map((s) => {
                        const isActive = activeStep === s.step;
                        return (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => {
                              setActiveStep(s.step);
                              const el = document.getElementById('mobile-active-step-commands');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                              isActive
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isActive
                                  ? 'bg-slate-950 text-amber-300'
                                  : 'bg-amber-400 text-slate-950'
                              }`}
                            >
                              {s.step}
                            </span>
                            <span className="text-sm shrink-0">{s.icon}</span>
                            <span className="whitespace-nowrap font-bold">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Distinct Horizontal Partition / Divider Line */}
                  <div className="w-[100vw] relative left-[calc(-50vw+50%)] border-b-2 border-slate-800 shadow-sm" />
                </div>

                {/* 🎛️ EXPANDED EDITOR PANEL: Opens DIRECTLY below the horizontal border/divider */}
                <div
                  id="mobile-active-step-commands"
                  className="w-full flex-1 bg-slate-900/95 p-3 sm:p-4 border-t border-slate-800 overflow-y-auto"
                >
                  {/* Step Title Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {STUDIO_STEPS.find((s) => s.step === activeStep)?.icon}
                      </span>
                      <span className="text-xs font-black text-amber-400">
                        {STUDIO_STEPS.find((s) => s.step === activeStep)?.title || `स्टेप ${activeStep} कंट्रोल्स`}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold shrink-0">
                      स्टेप {activeStep} सक्रिय
                    </span>
                  </div>

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

              {/* ==================================================
                  2. DESKTOP / PC FULL-SCREEN WEB LAYOUT (>= 1024px)
                  ================================================== */}
<div className="hidden lg:flex w-full flex-row items-start gap-4 xl:gap-6">
                {/* ==================================================
                    LEFT COLUMN: LOCKED / FREEZE (Larger Live Preview + 3 Action Buttons below)
                    ================================================== */}
                <div className="w-full lg:w-[420px] xl:w-[460px] 2xl:w-[490px] shrink-0 lg:sticky lg:top-[100px] z-20 flex flex-col gap-3 self-start">
                  {/* 1. LARGE LIVE 4:5 GRAPHIC PREVIEW CARD */}
                  <div className="w-full bg-neutral-950 p-3 sm:p-4 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col">
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

                    {/* Action Bar below Preview: 3 Responsive Buttons Row (1. JPG डाउनलोड, 2. कैप्शन, 3. ड्राफ्ट) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full mt-1.5 pt-1.5 border-t border-neutral-800/80 shrink-0">
                      {/* 1. JPG डाउनलोड - Priority Action */}
                      <button
                        type="button"
                        onClick={() => handleDownload('jpeg')}
                        disabled={downloading || (isActionLocked && !isCurrentCardBonus)}
                        className={`flex-[1.5] min-w-[120px] py-2 sm:py-2.5 px-2.5 sm:px-3 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                          isActionLocked && !isCurrentCardBonus
                            ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 opacity-60 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 cursor-pointer disabled:opacity-50'
                        }`}
                        title={isActionLocked && !isCurrentCardBonus ? 'ट्रायल समाप्त — डाउनलोड लॉक' : 'कार्ड को HD JPG इमेज में डाउनलोड करें'}
                      >
                        {isActionLocked && !isCurrentCardBonus ? <Lock className="w-3.5 h-3.5 shrink-0 text-neutral-400" /> : <Download className="w-3.5 h-3.5 shrink-0 text-slate-950" />}
                        <span className="whitespace-nowrap font-bold text-xs">{downloading ? (downloadProgressText || 'डाउनलोड...') : 'JPG डाउनलोड'}</span>
                      </button>

                      {/* 2. कैप्शन */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isActionLocked && !isCurrentCardBonus) {
                            showToast('⚠️ 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कैप्शन हेतु प्लान अपग्रेड करें।');
                            setCurrentTab('profile');
                          } else {
                            setIsCaptionModalOpen(true);
                          }
                        }}
                        disabled={isActionLocked && !isCurrentCardBonus}
                        className={`flex-1 min-w-[80px] py-2 sm:py-2.5 px-2 sm:px-3 font-semibold text-[11px] sm:text-xs rounded-xl border shadow flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                          isActionLocked && !isCurrentCardBonus
                            ? 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-60 cursor-not-allowed'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700 cursor-pointer'
                        }`}
                        title={isActionLocked && !isCurrentCardBonus ? 'ट्रायल समाप्त — कैप्शन लॉक' : 'कैप्शन और शेयर'}
                      >
                        {isActionLocked && !isCurrentCardBonus ? <Lock className="w-3.5 h-3.5 shrink-0 text-neutral-400" /> : <Share2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
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
                        onClick={handleResetCard}
                        className="flex-1 min-w-[70px] py-2 sm:py-2.5 px-2 sm:px-2.5 bg-neutral-800 hover:bg-neutral-700 text-sky-300 font-semibold text-[11px] sm:text-xs rounded-xl border border-neutral-700 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                        title="नया ग्राफिक / रीसेट सेशन"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                        <span className="whitespace-nowrap">रिफ्रेश</span>
                      </button>
                    </div>

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
                  <div className="sticky top-[60px] z-20 w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
                    {/* Top Bar Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
                          <span>🎛️</span>
                          <span>एडिटर स्टेप्स (स्टेप {activeStep} / {STUDIO_STEPS.length})</span>
                        </span>
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

                    {/* Horizontal Scrollable Tabs: Step 1 to 8 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                      {STUDIO_STEPS.map((s) => {
                        const isActive = activeStep === s.step;
                        return (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => {
                              setActiveStep(s.step);
                              setMobileViewMode('steps');
                              scrollToStepById(s.id);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                              isActive
                                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 scale-102 font-black'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white'
                            }`}
                          >
                            <span>{s.label}</span>
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
          )}
        </main>
      </ErrorBoundary>
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
            onOpenStudio={() => {
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

      {/* 8. Account Deletion */}
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
    </div>
  );
}
