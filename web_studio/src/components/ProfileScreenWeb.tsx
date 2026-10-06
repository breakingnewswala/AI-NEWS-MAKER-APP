import { Smartphone, Download } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  PlusCircle,
  Sliders,
  FolderTree,
  Upload,
  Check,
  Trash2,
  Tv,
  Key,
  Globe,
  Radio,
  Sparkles,
  LogOut,
  Save,
  Bot,
  Eye,
  EyeOff,
  Zap,
  Lock,
  Phone,
  Crown,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Star,
  ExternalLink,
  Rss,
  Link2,
  RefreshCw,
  Ticket,
  Package,
  AlertCircle,
  ChevronDown,
  Film,
  Layers,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { NewsFeedPost } from '../data/newsFeedData';
import { getApiUrl } from '../lib/apiConfig';
import {
  getUserSubscription,
  setUserPlanTier,
  savePrimaryMobileNumber,
  isUserAdmin,
  getAdminSystemMode,
  setAdminSystemMode,
  setAdminTestMode,
  getAdminTestPlanTier,
  setAdminTestPlanTier,
  activateFreeTrial,
  redeemPromoCode,
  RedeemResult,
  PLAN_DETAILS,
  getPlansCatalog,
  PLAN_KEY_MAP,
  UserPlanTier,
  UserSubscriptionInfo,
  AdminSystemMode,
  isChannelProfileLocked,
  registerOrUpdateUser,
  submitLogoChangeRequest,
  getUserLogoChangeRequestStatus,
  getLogoChangeRequests,
  checkAccountUniqueness,
} from '../lib/userPlanManager';
import { ChannelProfile } from '../types';
import { AdminTemplatePlanManager } from './AdminTemplatePlanManager';
import { AdminPlansAndPackagesManager } from './AdminPlansAndPackagesManager';
import { HelpAndPoliciesView } from './HelpAndPoliciesView';

interface ProfileScreenWebProps {
  currentUser: ReporterUser | null;
  onLogout: () => void;
  onAddNewPost: (post: Omit<NewsFeedPost, 'id' | 'timestamp'>) => void;
  onOpenStudio: () => void;
  onOpenOnboarding?: () => void;
  categories: { id: string; name: string }[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const ProfileScreenWeb: React.FC<ProfileScreenWebProps> = ({
  currentUser,
  onLogout,
  onAddNewPost,
  onOpenStudio,
  onOpenOnboarding,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  // Admin check & Channel Profile Lock check with robust fallback for Android WebView
  const effectiveUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('reporter_auth_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'मुख्य संपादक',
      email: 'editor@ainewsmaker.online',
      role: 'admin',
      district: 'सेंट्रल डेस्क'
    };
  })();
  const isAdmin = isUserAdmin(effectiveUser);
  // Channel Profile State (Directly synced to Graphic Studio footer)
  const [channelProfile, setChannelProfile] = useState<ChannelProfile>(() => {
    try {
      const saved = localStorage.getItem('user_channel_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: currentUser?.name || 'मुख्य संपादक',
      channelNameHi: localStorage.getItem('app_channel_name') || 'AI News Maker App',
      channelNameEn: localStorage.getItem('app_channel_name_en') || 'AI News Maker',
      channelLogoUrl: '/assets/ai_news_maker_logo.png',
      channelLogoType: 'png',
      socialIcons: {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: false,
        telegram: false,
        whatsapp: true,
      },
      username: 'ainewsmaker',
      mobileNumber: '96698-02408',
      showMobileNumber: true,
      websiteUrl: 'ainewsmaker.online',
    };
  });


  const [isLockedForUserState, setIsLockedForUserState] = useState(() => !isAdmin && isChannelProfileLocked(currentUser));
  const isLockedForUser = isLockedForUserState || (!isAdmin && Boolean(channelProfile.channelLogoUrl || channelProfile.channelLogoPngUrl || channelProfile.channelLogoGifUrl));
  const [isLogoReqModalOpen, setIsLogoReqModalOpen] = useState(false);
  const [logoReqReason, setLogoReqReason] = useState("नया आधिकारिक चैनल लोगो अपडेट करना है");
  const [logoReqStatus, setLogoReqStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(() =>
    getUserLogoChangeRequestStatus(currentUser?.email || '')
  );

  useEffect(() => {
    const handleLogoUpdates = () => {
      setIsLockedForUserState(!isAdmin && isChannelProfileLocked(currentUser));
      setLogoReqStatus(getUserLogoChangeRequestStatus(currentUser?.email || ''));
    };
    window.addEventListener('ai_news_logo_requests_updated', handleLogoUpdates);
    window.addEventListener('ai_news_channel_profile_unlocked', handleLogoUpdates);
    window.addEventListener('ai_news_plan_users_changed', handleLogoUpdates);
    return () => {
      window.removeEventListener('ai_news_logo_requests_updated', handleLogoUpdates);
      window.removeEventListener('ai_news_channel_profile_unlocked', handleLogoUpdates);
      window.removeEventListener('ai_news_plan_users_changed', handleLogoUpdates);
    };
  }, [currentUser?.email, isAdmin]);

  // Tabs: 'profile', 'plans_packages', 'templates', 'dashboard' (Admin only gets multi-tab access)
  const [normalUserTab, setNormalUserTab] = useState<'profile' | 'membership' | 'policies' | ''>('profile');
  const [activeTab, setActiveTab] = useState<'profile' | 'plans_packages' | 'templates' | 'dashboard'>(() => {
    if (isAdmin && typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo')) {
        return 'plans_packages';
      }
      if (h.includes('template')) {
        return 'templates';
      }
      if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        return 'dashboard';
      }
    }
    return 'profile';
  });

  useEffect(() => {
    if (!isAdmin) {
      if (activeTab !== 'profile') setActiveTab('profile');
      return;
    }
    const handleOpenRss = () => setActiveTab('dashboard');
    const handleOpenTemplates = () => setActiveTab('templates');
    const handleOpenPlans = () => setActiveTab('plans_packages');
    window.addEventListener('open_rss_dashboard', handleOpenRss);
    window.addEventListener('open_template_manager', handleOpenTemplates);
    window.addEventListener('open_plans_packages', handleOpenPlans);
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo')) {
        setActiveTab('plans_packages');
      } else if (h.includes('template')) {
        setActiveTab('templates');
      } else if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => {
      window.removeEventListener('open_rss_dashboard', handleOpenRss);
      window.removeEventListener('open_template_manager', handleOpenTemplates);
      window.removeEventListener('open_plans_packages', handleOpenPlans);
      window.removeEventListener('hashchange', handleHash);
    };
  }, [isAdmin]);

  // Subscription & User Tier State
  const [subscription, setSubscription] = useState<UserSubscriptionInfo>(() => getUserSubscription());
  const [mobileInput, setMobileInput] = useState<string>('');
  const [mobileError, setMobileError] = useState<string>('');
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string>('');

  // User Promo Code Redemption State
  const [userPromoInput, setUserPromoInput] = useState<string>('');
  const [isRedeemingPromo, setIsRedeemingPromo] = useState<boolean>(false);
  const [promoRedeemResult, setPromoRedeemResult] = useState<RedeemResult | null>(null);

  // Admin Mode & Test Mode state
  const [adminSystemMode, setAdminSystemModeState] = useState<AdminSystemMode>(() => getAdminSystemMode());
  const [testPlanTier, setTestPlanTierState] = useState<UserPlanTier>(() => getAdminTestPlanTier());
  const [testModeMsg, setTestModeMsg] = useState<string>('');
  const testModeEnabled = adminSystemMode === 'test';
  const setTestModeEnabled = (enabled: boolean) => handleSwitchAdminMode(enabled ? 'test' : 'admin');

  // Switch Admin Mode: Admin Mode vs Test Mode
  const handleSwitchAdminMode = (newMode: AdminSystemMode) => {
    setAdminSystemMode(newMode);
    setAdminSystemModeState(newMode);
    setTestModeMsg(
      newMode === 'test'
        ? `🧪 टेस्ट मोड सक्रिय: अब आप "${PLAN_KEY_MAP[testPlanTier]}" प्लान का वास्तविक यूज़र अनुभव देख रहे हैं।`
        : '⚡ एडमिन मोड सक्रिय: सभी एडमिन कंट्रोल्स अनलॉक हैं।'
    );
    setTimeout(() => setTestModeMsg(''), 4500);
  };

  // Select which plan to preview in Test Mode
  const handleSelectTestPlan = (plan: UserPlanTier) => {
    setAdminTestPlanTier(plan);
    setTestPlanTierState(plan);
    setTestModeMsg(`🧪 अब आप "${PLAN_KEY_MAP[plan]}" प्लान का यूज़र अनुभव टेस्ट कर रहे हैं।`);
    setTimeout(() => setTestModeMsg(''), 4500);
  };

  // Handle Promo Code Redeem
  const handleRedeemPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPromoInput.trim()) return;
    setIsRedeemingPromo(true);
    setPromoRedeemResult(null);

    setTimeout(() => {
      const res = redeemPromoCode(userPromoInput, currentUser);
      setPromoRedeemResult(res);
      setIsRedeemingPromo(false);

      if (res.success) {
        setSubscription(getUserSubscription());
        setPlanSuccessMsg(`🎉 ${res.message}`);
        setUserPromoInput('');
        setTimeout(() => setPlanSuccessMsg(''), 8000);
      }
    }, 250);
  };

  // Form State for Add Feed / News (inside Dashboard tab)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSummary, setNewSummary] = useState<string>('');
  const [newChannel, setNewChannel] = useState<string>('दैनिक भास्कर (Dainik Bhaskar)');
  const [newCategory, setNewCategory] = useState<string>('breaking');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isBreaking, setIsBreaking] = useState<boolean>(true);
  const [isExclusive, setIsExclusive] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // RSS & Web Link Feed Sources (Channel -> Category -> URL)
  interface RssFeedSource {
    id: string;
    channelName: string;
    category: string;
    categoryName: string;
    url: string;
    isActive: boolean;
    lastSync: string;
  }

  const [rssSources, setRssSources] = useState<RssFeedSource[]>(() => {
    try {
      const saved = localStorage.getItem('admin_rss_sources');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rss-1',
        channelName: 'आज तक (Aaj Tak)',
        category: 'breaking',
        categoryName: 'ब्रेकिंग न्यूज़',
        url: 'https://aajtak.in/rssfeeds/?id=home',
        isActive: true,
        lastSync: 'अभी सक्रिय',
      },
      {
        id: 'rss-2',
        channelName: 'दैनिक भास्कर (Dainik Bhaskar)',
        category: 'national',
        categoryName: 'देश-प्रदेश',
        url: 'https://bhaskar.com/rss-v1--all.xml',
        isActive: true,
        lastSync: '10 मिनट पूर्व',
      },
      {
        id: 'rss-3',
        channelName: 'एनडीटीवी इंडिया (NDTV India)',
        category: 'politics',
        categoryName: 'राजनीति',
        url: 'https://feeds.feedburner.com/ndtvkhabar',
        isActive: true,
        lastSync: '30 मिनट पूर्व',
      },
      {
        id: 'rss-4',
        channelName: 'द लल्लनटॉप (The Lallantop)',
        category: 'tech',
        categoryName: 'टेक्नोलॉजी',
        url: 'https://thelallantop.com/feed',
        isActive: true,
        lastSync: '1 घंटा पूर्व',
      },
    ];
  });

  const [rssChannelInput, setRssChannelInput] = useState<string>('');
  const [rssCategoryInput, setRssCategoryInput] = useState<string>('breaking');
  const [rssUrlInput, setRssUrlInput] = useState<string>('');
  const [rssSuccessMsg, setRssSuccessMsg] = useState<string>('');

  const handleAddRssSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rssChannelInput.trim() || !rssUrlInput.trim()) return;

    const catObj = categories.find((c) => c.id === rssCategoryInput);
    const newSource: RssFeedSource = {
      id: `rss-${Date.now()}`,
      channelName: rssChannelInput.trim(),
      category: rssCategoryInput,
      categoryName: catObj?.name || 'ताज़ा खबर',
      url: rssUrlInput.trim(),
      isActive: true,
      lastSync: 'अभी जोड़ा गया',
    };

    const updated = [newSource, ...rssSources];
    setRssSources(updated);
    localStorage.setItem('admin_rss_sources', JSON.stringify(updated));

    // Automatically make available in Home Feed
    onAddNewPost({
      title: `🔴 [${newSource.channelName}] लाइव अपडेट: ${newSource.categoryName} पर बड़ी खबर`,
      summary: `यह समाचार ${newSource.channelName} के वेब/RSS स्रोत (${newSource.url}) से होम फ़ीड में स्वचालित रूप से सक्रिय किया गया है।`,
      sourceChannel: newSource.channelName,
      sourceUrl: newSource.url,
      category: newSource.category,
      categoryName: newSource.categoryName,
      publishedTime: 'अभी-अभी (Admin Source)',
      imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
      breaking: true,
      isExclusive: false,
    });

    setRssChannelInput('');
    setRssUrlInput('');
    setRssSuccessMsg('नया RSS / वेब लिंक स्रोत सफलतापूर्वक जोड़ा गया और होम फ़ीड में लाइव हो गया!');
    setTimeout(() => setRssSuccessMsg(''), 3500);
  };

  const handleToggleRssSource = (id: string) => {
    const updated = rssSources.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    setRssSources(updated);
    localStorage.setItem('admin_rss_sources', JSON.stringify(updated));
  };

  const handleDeleteRssSource = (id: string) => {
    const updated = rssSources.filter((s) => s.id !== id);
    setRssSources(updated);
    localStorage.setItem('admin_rss_sources', JSON.stringify(updated));
  };

  const handleSyncRssSource = (source: RssFeedSource) => {
    onAddNewPost({
      title: `🔴 [${source.channelName}] लाइव अपडेट: ${source.categoryName} पर बड़ी खबर`,
      summary: `यह समाचार ${source.channelName} के लाइव फीड ${source.url} से स्वचालित रूप से आयात किया गया है।`,
      sourceChannel: source.channelName,
      sourceUrl: source.url,
      category: source.category,
      categoryName: source.categoryName,
      publishedTime: 'अभी-अभी (RSS सिंक)',
      imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
      breaking: true,
      isExclusive: false,
    });

    const updated = rssSources.map((s) => (s.id === source.id ? { ...s, lastSync: 'अभी सिंक हुआ' } : s));
    setRssSources(updated);
    localStorage.setItem('admin_rss_sources', JSON.stringify(updated));
    setRssSuccessMsg(`${source.channelName} का RSS सिंक हो गया और ताज़ा खबर लाइव फ़ीड में पोस्ट हो गई!`);
    setTimeout(() => setRssSuccessMsg(''), 4000);
  };

  const [reporterDistrict, setReporterDistrict] = useState<string>(() => currentUser?.district || 'भोपाल / सेंट्रल डेस्क');
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState<boolean>(false);

  // Sync profile when updated externally (e.g. from ChannelOnboardingModal)
  useEffect(() => {
    const handleProfileSync = () => {
      const saved = localStorage.getItem('user_channel_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setChannelProfile(parsed);
          if (parsed.customHeaderPng !== undefined) setCustomHeaderPng(parsed.customHeaderPng);
          if (parsed.customFooterPng !== undefined) setCustomFooterPng(parsed.customFooterPng);
        } catch {}
      }
    };
    window.addEventListener('channel_profile_updated', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);
    return () => {
      window.removeEventListener('channel_profile_updated', handleProfileSync);
      window.removeEventListener('storage', handleProfileSync);
    };
  }, []);

  // Custom Header & Custom Footer PNG states (PRO & VIP DESK exclusive)
  const [customHeaderPng, setCustomHeaderPng] = useState<string>(() => {
    try {
      const confStr = localStorage.getItem('profile_header_footer_json');
      if (confStr) {
        const c = JSON.parse(confStr);
        return c.customHeaderPng || c.templates?.graphic_001?.customHeaderPng || '';
      }
    } catch {}
    return (channelProfile as any).customHeaderPng || '';
  });

  const [customFooterPng, setCustomFooterPng] = useState<string>(() => {
    try {
      const confStr = localStorage.getItem('profile_header_footer_json');
      if (confStr) {
        const c = JSON.parse(confStr);
        return c.customFooterPng || c.templates?.graphic_001?.customFooterPng || '';
      }
    } catch {}
    return (channelProfile as any).customFooterPng || '';
  });

  // Header PNG file upload handler
  const handleCustomHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) setCustomHeaderPng(result);
    };
    reader.readAsDataURL(file);
  };

  // Footer PNG file upload handler
  const handleCustomFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) setCustomFooterPng(result);
    };
    reader.readAsDataURL(file);
  };

  // Modal state for JPG to Transparent PNG conversion
  const [isJpgModalOpen, setIsJpgModalOpen] = useState(false);
  const [jpgRawImage, setJpgRawImage] = useState('');
  const [jpgConvertedPng, setJpgConvertedPng] = useState('');
  const [jpgProcessing, setJpgProcessing] = useState(false);
  const [logoResetSuccess, setLogoResetSuccess] = useState('');

  // 1. PNG Channel Logo Upload Handler
  const handlePngLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setChannelProfile((prev) => ({
          ...prev,
          channelLogoPngUrl: result,
          channelLogoUrl: result,
          channelLogoType: 'png',
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. GIF Channel Logo Upload Handler (Preserves existing PNG!)
  const handleGifLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setChannelProfile((prev) => ({
          ...prev,
          channelLogoGifUrl: result,
          channelLogoUrl: result,
          channelLogoType: 'gif',
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Switch between PNG and GIF logo
  const handleSwitchLogoType = (type: 'png' | 'gif') => {
    setChannelProfile((prev) => {
      const targetUrl = type === 'gif' ? (prev.channelLogoGifUrl || prev.channelLogoUrl) : (prev.channelLogoPngUrl || prev.channelLogoUrl);
      return {
        ...prev,
        channelLogoType: type,
        channelLogoUrl: targetUrl,
      };
    });
  };

  // 3. Admin: JPG to Transparent PNG Converter
  const handleJpgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      if (raw) {
        setJpgRawImage(raw);
        processJpgToTransparentPng(raw);
      }
    };
    reader.readAsDataURL(file);
  };

  const processJpgToTransparentPng = (srcUrl: string) => {
    setJpgProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = srcUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 512;
      canvas.height = img.naturalHeight || 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setJpgProcessing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      // Sample 4 corner pixels to detect background color
      const corners = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1],
      ];
      let bgR = 255, bgG = 255, bgB = 255;
      for (const [cx, cy] of corners) {
        const idx = (cy * canvas.width + cx) * 4;
        bgR = d[idx];
        bgG = d[idx + 1];
        bgB = d[idx + 2];
      }

      // Smooth background removal with threshold
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
        if (dist < 40) {
          d[i + 3] = 0; // Fully transparent
        } else if (dist < 75) {
          const alpha = ((dist - 40) / 35) * 255;
          d[i + 3] = Math.round(alpha);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      setJpgConvertedPng(pngUrl);
      setJpgProcessing(false);
    };
    img.onerror = () => {
      setJpgProcessing(false);
    };
  };

  const handleConfirmSaveConvertedPng = () => {
    if (!jpgConvertedPng) return;
    setChannelProfile((prev) => ({
      ...prev,
      channelLogoPngUrl: jpgConvertedPng,
      channelLogoUrl: jpgConvertedPng,
      channelLogoType: 'png',
    }));
    setIsJpgModalOpen(false);
  };

  // 4. Admin: Per-user Logo Upload Reset
  const handleAdminResetLogo = async () => {
    const confirmed = window.confirm('क्या आप चैनल लोगो को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?');
    if (!confirmed) return;
    const defaultLogo = '/assets/ai_news_maker_logo.png';
    setChannelProfile((prev) => ({
      ...prev,
      channelLogoUrl: defaultLogo,
      channelLogoPngUrl: undefined,
      channelLogoGifUrl: undefined,
      channelLogoType: 'png',
    }));
    try {
      await fetch('/api/admin/reset-user-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: channelProfile.username || currentUser?.username || 'admin' }),
      });
    } catch {}
    setLogoResetSuccess('लोगो सफलतापूर्वक रीसेट कर दिया गया!');
    setTimeout(() => setLogoResetSuccess(''), 3000);
  };

  // Legacy Logo file upload handler
  const handleLogoUpload = handlePngLogoUpload;

  // 1-Click Transparent PNG Generator (Removes solid/white background)
  const handleMakeLogoTransparent = () => {
    if (!channelProfile.channelLogoUrl) return;
    processJpgToTransparentPng(channelProfile.channelLogoUrl);
    setIsJpgModalOpen(true);
  };

  const handleSaveChannelBranding = () => {
    // Check account uniqueness and restricted brands
    const uniqCheck = checkAccountUniqueness({
      username: channelProfile.username,
      websiteUrl: channelProfile.websiteUrl,
      channelName: channelProfile.channelNameHi,
      currentEmail: currentUser?.email,
    });
    if (!uniqCheck.valid) {
      alert(uniqCheck.error || 'यह यूज़रनेम, वेबसाइट या चैनल नाम उपयोग नहीं किया जा सकता!');
      return;
    }

    const isProOrVipUser = subscription.tier === 'professional' || subscription.tier === 'ultra' || isAdmin;
    const effectiveHeaderPng = isProOrVipUser ? customHeaderPng : '';
    const effectiveFooterPng = isProOrVipUser ? customFooterPng : '';

    const updatedProfile = {
      ...channelProfile,
      customHeaderPng: effectiveHeaderPng,
      customFooterPng: effectiveFooterPng,
    };

    localStorage.setItem('user_channel_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('app_channel_name', channelProfile.channelNameHi);
    localStorage.setItem('app_channel_name_en', channelProfile.channelNameEn);

    // Save into centralized profile_header_footer_json
    const headerFooterConfig = {
      applyToAll: true,
      customHeaderPng: effectiveHeaderPng,
      customFooterPng: effectiveFooterPng,
      templates: {
        graphic_001: {
          templateId: 'graphic_001',
          brandName: channelProfile.channelNameHi,
          brandTagline: channelProfile.channelNameEn,
          customLogoUrl: channelProfile.channelLogoUrl,
          customHeaderPng: effectiveHeaderPng,
          customFooterPng: effectiveFooterPng,
          socialHandle: channelProfile.username ? (channelProfile.username.startsWith('@') ? channelProfile.username : `@${channelProfile.username}`) : '',
          whatsappNumber: channelProfile.mobileNumber,
          isConfigured: true,
        },
      },
    };
    localStorage.setItem('profile_header_footer_json', JSON.stringify(headerFooterConfig));

    // For non-admin users, permanently lock profile & record in admin database
    if (!isAdmin) {
      localStorage.setItem('is_channel_profile_locked', 'true');
      registerOrUpdateUser({
        name: currentUser?.name || channelProfile.fullName || 'संपादक',
        email: currentUser?.email || 'user@breakingnewswala.com',
        channelName: channelProfile.channelNameHi,
        channelLogoUrl: channelProfile.channelLogoGifUrl || channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl,
        mobile: channelProfile.mobileNumber,
        isLocked: true,
      });
    }

    // Dispatch update event for active studio card
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_profile_updated', {
          detail: {
            ...updatedProfile,
            customHeaderPng: effectiveHeaderPng,
            customFooterPng: effectiveFooterPng,
          },
        })
      );
    }

    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  // New Category input (inside Dashboard tab)
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Refresh subscription when tab loads
  useEffect(() => {
    setSubscription(getUserSubscription());
  }, [activeTab]);

  // Handle saving Primary Mobile Number permanently
  const handleSavePrimaryMobile = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileError('');
    const cleanNumber = mobileInput.trim().replace(/[^0-9]/g, '');
    if (cleanNumber.length !== 10) {
      setMobileError('कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9876543210)');
      return;
    }
    const success = savePrimaryMobileNumber(cleanNumber);
    if (success) {
      setSubscription(getUserSubscription());
      setMobileInput('');
      alert('✅ आपका प्राइमरी मोबाइल नंबर स्थायी रूप से सुरक्षित कर लिया गया है। अब इसे बदला नहीं जा सकेगा।');
    } else {
      setMobileError('प्राइमरी मोबाइल नंबर पहले से लॉक है अथवा अमान्य है।');
    }
  };

  // Handle Plan Upgrade
  const handleUpgradePlan = (tier: UserPlanTier) => {
    setUserPlanTier(tier);
    const updated = getUserSubscription();
    setSubscription(updated);
    const planDetail = PLAN_DETAILS.find((p) => p.id === tier);
    setPlanSuccessMsg(`🎉 बधाई! आपका "${planDetail?.nameHi}" सफलतापूर्वक सक्रिय हो गया है। ${tier !== 'basic' ? 'सभी ग्राफिक अब वॉटरमार्क रहित (No Watermark) एक्सपोर्ट होंगे।' : ''}`);
    setTimeout(() => setPlanSuccessMsg(''), 6000);
  };

  // Toggle Admin Test Mode
  const handleToggleTestMode = () => {
    const newState = !testModeEnabled;
    setTestModeEnabled(newState);
    setAdminTestMode(newState);
    setTestModeMsg(newState ? '🧪 एडमिन टेस्ट मोड सक्रिय (Test Sandbox Enabled)' : '🔴 लाइव प्रोडक्शन मोड सक्रिय');
    setTimeout(() => setTestModeMsg(''), 4000);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddNewPost({
      title: newTitle.trim(),
      summary: newSummary.trim() || newTitle.trim(),
      sourceChannel: newChannel,
      sourceUrl: 'https://ainewsmaker.online',
      category: newCategory,
      categoryName: categories.find((c) => c.id === newCategory)?.name || 'ताज़ा खबर',
      publishedTime: 'अभी-अभी',
      imageUrl: newImageUrl.trim() || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
      breaking: isBreaking,
      isExclusive: isExclusive,
    });

    setSubmitSuccess(true);
    setNewTitle('');
    setNewSummary('');
    setNewImageUrl('');
    setTimeout(() => setSubmitSuccess(false), 3000);
  };



  // Get active tier badge details
  const activePlanDetail = PLAN_DETAILS.find((p) => p.id === subscription.tier) || PLAN_DETAILS[0];

  const renderMembershipUpgradeSection = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PROMO CODE REDEMPTION BOX (USER ONLY - HIDDEN IN ADMIN MODE) */}
            {!isAdmin && (
              <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>🎁 प्रोमो कोड रिडीम करें (Redeem Promo Code)</span>
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded uppercase">
                          Instant Activation
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300">
                        यदि आपने ऑफ़लाइन/UPI पेमेंट किया है या आपके पास प्रोमो कोड है, तो यहाँ दर्ज करके तुरंत अपना प्लान एक्टिवेट करें।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleRedeemPromoCode} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <input
                    type="text"
                    value={userPromoInput}
                    onChange={(e) => setUserPromoInput(e.target.value.toUpperCase())}
                    placeholder="उदा. PRO2026 या PRO-RIT2026-001"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-black text-amber-300 uppercase tracking-widest focus:outline-hidden focus:border-amber-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isRedeemingPromo || !userPromoInput.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isRedeemingPromo ? 'वेरीफाई हो रहा है...' : 'प्रोमो कोड अप्लाई करें'}</span>
                  </button>
                </form>

                {promoRedeemResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                      promoRedeemResult.success
                        ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300'
                        : 'bg-red-950/90 border border-red-500 text-red-300'
                    }`}
                  >
                    {promoRedeemResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{promoRedeemResult.message}</span>
                  </div>
                )}
              </div>
            )}



            {/* SECTION 2: 4-TIER PLANS & UPGRADE (Basic, Advanced, Professional, Ultra) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg text-slate-950">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <span>मेंबरशिप प्लान व अपग्रेड (Subscription Plans)</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded">
                          4 यूज़र स्तर
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        बेसिक में 7 दिन फ्री ट्रायल व वॉटरमार्क, एडवांस/प्रो में वॉटरमार्क रहित फुल एचडी
                      </p>
                    </div>
                  </div>

                  {/* Active Plan Pill */}
                  <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>वर्तमान प्लान:</span>
                    <span className="text-amber-400 font-black">{activePlanDetail.nameHi}</span>
                  </div>
                </div>
              </div>

              {/* Watermark Status Alert Banner (User Only) */}
              {!isAdmin && (
                subscription.tier === 'basic' ? (
                  <div className="p-4 bg-amber-950/60 border border-amber-600/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-300 uppercase">
                          बेसिक यूजर: 7 दिन का फ्री ट्रायल सक्रिय ({subscription.daysRemaining} दिन शेष)
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          बेसिक प्लान में आपके द्वारा बनाए गए सभी ग्राफिक पर <b>"AI News Maker App" वॉटरमार्क</b> रहेगा। वॉटरमार्क हटाने व 1080p Full HD के लिए कृपया नीचे दिए गए किसी भी प्लान में अपग्रेड करें।
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgradePlan('advanced')}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shrink-0 shadow-lg cursor-pointer transition"
                    >
                      वॉटरमार्क हटाएं (अपग्रेड)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-600/70 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-300 uppercase">
                        ✅ प्रीमियम सक्रिय ({activePlanDetail.nameHi})
                      </div>
                      <div className="text-xs text-emerald-100/90 mt-0.5">
                        आपके सभी कार्ड्स और वीडियो <b>100% वॉटरमार्क रहित (No Watermark)</b> व अल्ट्रा-शार्प क्वालिटी में रेंडर हो रहे हैं।
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* 4 Plan Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {PLAN_DETAILS.map((plan) => {
                  const isCurrent = subscription.tier === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/40'
                          : plan.popular
                          ? 'bg-slate-950/90 border-blue-500/50 hover:border-blue-400'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isCurrent
                            ? 'bg-amber-400 text-slate-950'
                            : plan.popular
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {isCurrent ? 'सक्रिय (Active)' : plan.badge}
                        </span>

                        {plan.hasWatermark ? (
                          <span className="text-[9px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                            वॉटरमार्क रहेगा
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                            वॉटरमार्क रहित
                          </span>
                        )}
                      </div>

                      {/* Plan Name & Pricing */}
                      <div>
                        <h4 className="text-sm font-black text-white">{plan.nameHi}</h4>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-400">{plan.priceDisplay}</span>
                          <span className="text-[11px] text-slate-400">/{plan.period}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 min-h-[32px] leading-tight">
                          {plan.tagline}
                        </p>

                        {/* Feature List */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-800/80 my-3 text-[11px] text-slate-300">
                          {plan.features.map((feat, idx) => (
                            <div key={idx} className="leading-snug">
                              {feat}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plan Action Button */}
                      <div className="pt-2">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('plans_packages')}
                            className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition"
                            title="एडमिन मोड: प्लान सेटिंग्स प्रबंधित करें"
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                            <span>⚙️ प्लान सेटिंग्स (Admin Managed)</span>
                          </button>
                        ) : isCurrent ? (
                          <div className="w-full py-2 bg-slate-800 text-amber-300 text-center font-black text-xs rounded-xl border border-amber-400/40">
                            ✓ वर्तमान सक्रिय प्लान
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgradePlan(plan.id)}
                            className={`w-full py-2 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              plan.id === 'basic'
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : plan.id === 'advanced'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                                : plan.id === 'professional'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                : 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{plan.id === 'basic' ? 'बेसिक पर स्विच करें' : 'अपग्रेड व सक्रिय करें'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );

  const renderProfileOnlyContent = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION: CHANNEL & LOGO BRANDING */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      चैनल व लोगो विवरण (Channel & Logo Branding)
                    </h3>
                    <p className="text-xs text-slate-400">
                      यह विवरण सीधे ग्राफिक डिजाइनिंग स्टूडियो के फुटर और कार्ड्स में सिंक होगा
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Preview & Dual Upload Section (PNG & GIF) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>चैनल लोगो (PNG व GIF दोनों वास्तविक अपलोड विकल्प)</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    सक्रिय: {channelProfile.channelLogoType === 'gif' ? '🎬 GIF लोगो' : '📦 PNG लोगो'}
                  </span>
                </div>

                {logoResetSuccess && (
                  <div className="p-2 bg-emerald-950/80 border border-emerald-500/80 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{logoResetSuccess}</span>
                  </div>
                )}

                {/* If user profile is locked, show locked display card. Otherwise, show upload options */}
                {isLockedForUser ? (
                  <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border-2 border-amber-500/50 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>चैनल लोगो (स्थायी रूप से सुरक्षित)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700">
                              One-Time Set ✓
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            सुरक्षा व कॉपीराइट नियमों के तहत चैनल लोगो केवल एक बार सेट किया जा सकता है।
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 font-mono border border-slate-700">
                        🔒 One-Time Locked
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        <img
                          src={channelProfile.channelLogoGifUrl || channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl}
                          alt="Channel Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{channelProfile.channelNameHi || 'आपका चैनल'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono">
                            {channelProfile.channelLogoType === 'gif' ? '🎬 GIF' : '📦 PNG'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {channelProfile.channelNameEn || 'AI News Maker'}
                        </div>
                        <p className="text-[10px] text-amber-200/80">
                          लोगो में बदलाव कराने हेतु एडमिन से अनुरोध करें।
                        </p>

                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                          {logoReqStatus === 'pending' ? (
                            <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span>लोगो बदलने का अनुरोध एडमिन के पास लंबित है</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsLogoReqModalOpen(true)}
                              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center gap-2 active:scale-95 border border-amber-300 ring-2 ring-amber-400/30"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
                              <span>लोगो बदलने हेतु एडमिन से अनुरोध करें (Request to Admin)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 2 Distinct Upload Options: PNG CHANNEL LOGO & GIF CHANNEL LOGO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* OPTION 1: PNG CHANNEL LOGO */}
                      <div className={`p-3.5 rounded-xl border transition-all ${
                        channelProfile.channelLogoType === 'png'
                          ? 'bg-amber-500/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <span>📦</span>
                            <span>PNG CHANNEL LOGO</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSwitchLogoType('png')}
                            className={`text-[10px] font-black px-2 py-0.5 rounded transition ${
                              channelProfile.channelLogoType === 'png'
                                ? 'bg-amber-400 text-black font-extrabold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {channelProfile.channelLogoType === 'png' ? '✓ सक्रिय' : 'चुनें'}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            <img
                              src={channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl}
                              alt="PNG Logo"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>PNG लोगो अपलोड</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={handlePngLogoUpload}
                                className="hidden"
                              />
                            </label>
                            <p className="text-[10px] text-slate-400">
                              पारदर्शी / स्टैंडर्ड चैनल लोगो
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* OPTION 2: GIF CHANNEL LOGO */}
                      <div className={`p-3.5 rounded-xl border transition-all ${
                        channelProfile.channelLogoType === 'gif'
                          ? 'bg-red-500/10 border-red-500/80 shadow-md ring-1 ring-red-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                            <span>🎬</span>
                            <span>GIF CHANNEL LOGO</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSwitchLogoType('gif')}
                            className={`text-[10px] font-black px-2 py-0.5 rounded transition ${
                              channelProfile.channelLogoType === 'gif'
                                ? 'bg-red-500 text-white font-extrabold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {channelProfile.channelLogoType === 'gif' ? '✓ सक्रिय' : 'चुनें'}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            {channelProfile.channelLogoGifUrl ? (
                              <img
                                src={channelProfile.channelLogoGifUrl}
                                alt="GIF Logo"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Film className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>GIF लोगो अपलोड</span>
                              <input
                                type="file"
                                accept="image/gif"
                                onChange={handleGifLogoUpload}
                                className="hidden"
                              />
                            </label>
                            <p className="text-[10px] text-slate-400">
                              एनिमेटेड घूमने वाला लाइव लोगो
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Save Logo Button for Admin */}
                    <div className="pt-3 pb-1 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {channelProfile.channelLogoType === 'gif'
                            ? (channelProfile.channelLogoGifUrl ? '✅ सक्रिय: 🎬 GIF लोगो चयनित' : '⚠️ कृपया 🎬 GIF लोगो चुनें')
                            : (channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl ? '✅ सक्रिय: 📦 PNG लोगो चयनित' : '⚠️ कृपया 📦 PNG लोगो चुनें')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveChannelBranding}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition active:scale-95 border border-amber-300 ring-2 ring-amber-400/20"
                      >
                        <Save className="w-4 h-4 text-slate-950 shrink-0" />
                        <span>
                          {saveSettingsSuccess
                            ? '✅ लोगो सुरक्षित! स्टूडियो में लागू हो गया'
                            : '💾 चैनल लोगो सेव करें (Save Logo)'}
                        </span>
                      </button>
                    </div>

                    {/* Admin Logo Management Tools */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsJpgModalOpen(true)}
                          className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                          title="JPG लोगो से बैकग्राउंड हटाकर पारदर्शी PNG बनाएं"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>JPG को PNG में बदलें</span>
                        </button>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleAdminResetLogo}
                          className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                          title="लोगो को मूल डिफ़ॉल्ट पर रीसेट करें"
                        >
                          <span>🔄 Logo Upload Reset</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Request Logo Change to Admin Modal for Normal Users */}
              {isLogoReqModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm sm:text-base font-['Baloo_2']">
                            लोगो बदलने हेतु एडमिन से अनुरोध
                          </h3>
                          <p className="text-[11px] text-slate-400">Request Logo Change to Admin</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLogoReqModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={channelProfile.channelLogoGifUrl || channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl || '/assets/breaking_news_wala_logo.png'}
                            alt="Current Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {channelProfile.channelNameHi || 'वर्तमान चैनल'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {currentUser?.email || 'यूज़र'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          लोगो बदलने का कारण (Reason for Logo Change) *
                        </label>
                        <textarea
                          rows={3}
                          value={logoReqReason}
                          onChange={(e) => setLogoReqReason(e.target.value)}
                          placeholder="यहाँ लोगो बदलने का आधिकारिक कारण लिखें (उदा. चैनल का नया लोगो जारी हुआ है)"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500"
                        />
                      </div>

                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
                        ℹ️ अनुरोध सबमिट करने के बाद एडमिन द्वारा स्वीकृति मिलते ही आपका लोगो अनलॉक कर दिया जाएगा और आप नया लोगो अपलोड कर सकेंगे।
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsLogoReqModalOpen(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!logoReqReason.trim()) {
                            alert('कृपया कारण दर्ज करें।');
                            return;
                          }
                          submitLogoChangeRequest(
                            currentUser?.email || '',
                            channelProfile.channelNameHi || '',
                            channelProfile.channelLogoUrl,
                            logoReqReason.trim()
                          );
                          setLogoReqStatus('pending');
                          setIsLogoReqModalOpen(false);
                          alert('✅ आपका अनुरोध एडमिन को सफलतापूर्वक भेज दिया गया है। एडमिन द्वारा स्वीकृति मिलते ही आप नया लोगो अपलोड कर सकेंगे।');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition active:scale-95"
                      >
                        अनुरोध सबमिट करें (Submit Request)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* JPG to Transparent PNG Modal */}
              {isJpgModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h3 className="text-white font-bold text-base font-['Baloo_2']">
                          JPG को पारदर्शी PNG में बदलें
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsJpgModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">
                      किसी भी JPG इमेज से सॉलिड बैकग्राउंड हटाकर वास्तविक पारदर्शी (Transparent) PNG में कनवर्ट करें:
                    </p>

                    <div>
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 cursor-pointer">
                        <Upload className="w-4 h-4 text-purple-400" />
                        <span>JPG फ़ाइल चुनें</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg"
                          onChange={handleJpgFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Side-by-Side Comparison Preview */}
                    {(jpgRawImage || jpgConvertedPng) && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-bold block">1. मूल JPG इमेज:</span>
                          <div className="w-full h-36 bg-black rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            {jpgRawImage && <img src={jpgRawImage} alt="Raw JPG" className="max-w-full max-h-full object-contain" />}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-emerald-400 font-bold block">2. पारदर्शी PNG प्रिव्यू:</span>
                          <div
                            className="w-full h-36 rounded-xl border border-emerald-500/60 p-2 flex items-center justify-center overflow-hidden"
                            style={{
                              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                              backgroundSize: '12px 12px',
                              backgroundColor: '#0F172A',
                            }}
                          >
                            {jpgProcessing ? (
                              <span className="text-xs text-purple-300 font-bold animate-pulse">कनवर्ट हो रहा है...</span>
                            ) : jpgConvertedPng ? (
                              <img src={jpgConvertedPng} alt="Transparent PNG" className="max-w-full max-h-full object-contain" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsJpgModalOpen(false)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveConvertedPng}
                        disabled={!jpgConvertedPng || jpgProcessing}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow disabled:opacity-40"
                      >
                        ✓ सत्यापित करें व PNG सेव करें
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Channel Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>चैनल का नाम (हिन्दी में) *</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.channelNameHi}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({ ...p, channelNameHi: e.target.value }))
                    }
                    placeholder="AI News Maker App"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>चैनल का नाम (English में) *</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.channelNameEn}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({ ...p, channelNameEn: e.target.value }))
                    }
                    placeholder="AI News Maker"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>
              </div>

              {/* District & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    संपादक / रिपोर्टर का जिला / शहर
                  </label>
                  <input
                    type="text"
                    value={reporterDistrict}
                    onChange={(e) => setReporterDistrict(e.target.value)}
                    placeholder="भोपाल / सेंट्रल डेस्क"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>सोशल यूज़रनेम (@username)</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.username}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({
                        ...p,
                        username: e.target.value.replace(/[^a-zA-Z0-9._]/g, ''),
                      }))
                    }
                    placeholder="ainewsmaker"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>
              </div>

              {/* Contact Number & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      संपर्क नंबर (फुटर में प्रदर्शन हेतु)
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelProfile.showMobileNumber}
                        onChange={(e) =>
                          setChannelProfile((p) => ({
                            ...p,
                            showMobileNumber: e.target.checked,
                          }))
                        }
                        className="rounded accent-amber-500"
                      />
                      <span>ग्राफ़िक में नंबर दिखाएं</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={channelProfile.mobileNumber}
                    onChange={(e) =>
                      setChannelProfile((p) => ({ ...p, mobileNumber: e.target.value }))
                    }
                    placeholder="96698-02408"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    वेबसाइट का पता (Website Address)
                  </label>
                  <input
                    type="text"
                    value={channelProfile.websiteUrl}
                    onChange={(e) =>
                      setChannelProfile((p) => ({ ...p, websiteUrl: e.target.value }))
                    }
                    placeholder="ainewsmaker.online"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Social Media Icons Toggles */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  फुटर में प्रदर्शित सोशल मीडिया आइकन्स
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'youtube', label: 'YouTube' },
                    { id: 'facebook', label: 'Facebook' },
                    { id: 'instagram', label: 'Instagram' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'telegram', label: 'Telegram' },
                    { id: 'twitter', label: 'X / Twitter' },
                  ].map((soc) => {
                    const isChecked = Boolean((channelProfile.socialIcons as any)[soc.id]);
                    return (
                      <button
                        key={soc.id}
                        type="button"
                        onClick={() =>
                          setChannelProfile((p) => ({
                            ...p,
                            socialIcons: {
                              ...p.socialIcons,
                              [soc.id]: !isChecked,
                            },
                          }))
                        }
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{soc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveChannelBranding}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {saveSettingsSuccess
                      ? '✅ चैनल व लोगो विवरण सुरक्षित! स्टूडियो में लागू हो गया।'
                      : 'चैनल ब्रांडिंग सेव करें व स्टूडियो में लागू करें'}
                  </span>
                </button>
              </div>
            </div>

            {/* SECTION 4: HEADER & FOOTER SETTINGS (PRO & VIP DESK ONLY GATING) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>कस्टम हेडर व फुटर सेटिंग्स (Header & Footer Settings)</span>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-amber-500 text-slate-950 text-[10px] font-black rounded-md uppercase">
                        PRO & VIP DESK ONLY
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      अपना कस्टम हेडर बैनर PNG व फुटर स्ट्रिप PNG अपलोड करें
                    </p>
                  </div>
                </div>
              </div>

              {subscription.tier === 'professional' || subscription.tier === 'ultra' || isAdmin ? (
                /* Unlocked for PRO & VIP DESK */
                <div className="space-y-4">
                  {/* Custom Header PNG */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-white">
                          1. कस्टम हेडर बैनर PNG (Custom Header PNG)
                        </label>
                        <p className="text-[11px] text-slate-400">
                          अपलोड होने पर डिफ़ॉल्ट लोकेशन व लोगो बॉक्स स्वतः हाइड हो जाएंगे।
                        </p>
                      </div>
                      {customHeaderPng && (
                        <button
                          type="button"
                          onClick={() => setCustomHeaderPng('')}
                          className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>हटाएं</span>
                        </button>
                      )}
                    </div>

                    {customHeaderPng && (
                      <div className="w-full max-h-24 bg-slate-900 border border-slate-700 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={customHeaderPng}
                          alt="Custom Header Preview"
                          className="max-h-20 w-auto object-contain"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3.5 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>{customHeaderPng ? 'हेडर बदलें' : '📁 हेडर PNG अपलोड करें'}</span>
                        <input
                          type="file"
                          accept="image/png,image/*"
                          onChange={handleCustomHeaderUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={customHeaderPng}
                        onChange={(e) => setCustomHeaderPng(e.target.value)}
                        placeholder="या हेडर PNG इमेज URL पेस्ट करें (https://...)"
                        className="flex-1 min-w-[200px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Custom Footer PNG */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-white">
                          2. कस्टम फुटर स्ट्रिप PNG (Custom Footer PNG)
                        </label>
                        <p className="text-[11px] text-slate-400">
                          अपलोड होने पर डिफ़ॉल्ट फिक्स्ड फुटर स्वतः हाइड हो जाएगा।
                        </p>
                      </div>
                      {customFooterPng && (
                        <button
                          type="button"
                          onClick={() => setCustomFooterPng('')}
                          className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>हटाएं</span>
                        </button>
                      )}
                    </div>

                    {customFooterPng && (
                      <div className="w-full max-h-24 bg-slate-900 border border-slate-700 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={customFooterPng}
                          alt="Custom Footer Preview"
                          className="max-h-20 w-auto object-contain"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3.5 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>{customFooterPng ? 'फुटर बदलें' : '📁 फुटर PNG अपलोड करें'}</span>
                        <input
                          type="file"
                          accept="image/png,image/*"
                          onChange={handleCustomFooterUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={customFooterPng}
                        onChange={(e) => setCustomFooterPng(e.target.value)}
                        placeholder="या फुटर PNG इमेज URL पेस्ट करें (https://...)"
                        className="flex-1 min-w-[200px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveChannelBranding}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>कस्टम हेडर व फुटर सेव करें</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Locked for BASIC and ADVANCE - Informational Section (View benefits only, no edit/upload/activate) */
                <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-purple-950/40 border-2 border-purple-500/40 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl shrink-0">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-purple-300">
                          Custom Header/Footer क्या है?
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-600 font-bold">
                          PRO व VIP DESK हेतु विशेष सुविधा
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        कस्टम हेडर व फुटर आपके न्यूज़ चैनल की एक मुकम्मल, प्रीमियम विजुअल पहचान है जो आपके हर ग्राफिक और वीडियो कार्ड पर डिफ़ॉल्ट ब्रांडिंग की जगह स्वतः लग जाती है।
                      </p>
                    </div>
                  </div>

                  {/* Benefits of Custom Header / Footer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>कस्टम हेडर (Header PNG):</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        कार्ड के शीर्ष पर आपका कस्टमाइज़्ड लोगो, चैनल का आधिकारिक नाम और स्पेशल ग्राफिक स्ट्रिप बिना किसी डिफ़ॉल्ट टेक्स्ट के प्रदर्शित होती है।
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <span>🏷️</span>
                        <span>कस्टम फुटर (Footer PNG):</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        निचली पट्टी में आपके सोशल मीडिया हैंडल्स, वेबसाइट व कॉन्टैक्ट का मुकम्मल डिज़ाइन किया हुआ आर्टवर्क स्वतः लग जाता है।
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-sky-300 flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>ऑटोमैटिक 1-क्लिक एप्लीकेशन:</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        एक बार सेट या असाइन होने पर स्टूडियो के सभी उपलब्ध पैकेज फ्रेम्स में यह स्वतः लागू रहता है।
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-red-400 flex items-center gap-1.5">
                        <span>🔒</span>
                        <span>सेटिंग लॉक्ड (Locked Access):</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        वर्तमान में आपके {PLAN_KEY_MAP[subscription.tier]} प्लान में यह लॉक है। इसे सक्रिय करने हेतु कृपया PRO या VIP DESK में अपग्रेड करें।
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">
                      * बेसिक व एडवांस यूज़र्स इसे एडिट, अपलोड या एक्टिवेट नहीं कर सकते।
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const plansSec = document.getElementById('plans-upgrade-grid');
                        if (plansSec) {
                          plansSec.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>PRO / VIP DESK में अपग्रेड करें</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
  );

return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 sticky top-14 z-20 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl text-slate-950 font-black shadow-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <span>{isAdmin ? 'एडमिन कंट्रोल पैनल' : 'मेरी प्रोफाइल व सेटिंग्स'}</span>
                {testModeEnabled && isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-900/80 border border-purple-500 text-purple-200 text-[10px] font-black rounded-full uppercase flex items-center gap-1">
                    <FlaskConical className="w-3 h-3 text-purple-400" />
                    टेस्ट मोड
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'एडमिन डैशबोर्ड, प्लान्स व पैकेज मैनेजर, टेम्पलेट कंट्रोल व RSS फीड्स'
                  : 'प्रोफाइल विवरण, 7-Day Free Trial Basic व प्रोमो कोड रिडीम'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            लॉगआउट
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* User Identity & Active Plan Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg">
              {isAdmin ? '👑' : '📰'}
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{currentUser?.name || 'मुख्य संपादक'}</h2>
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-black rounded uppercase">
                  {isAdmin ? 'चीफ एडमिन' : 'संवाददाता'}
                </span>
                {/* Active Plan Tier Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border shadow-sm ${
                  subscription.tier === 'basic'
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : subscription.tier === 'advanced'
                    ? 'bg-blue-950/80 border-blue-500/60 text-blue-300'
                    : subscription.tier === 'professional'
                    ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
                    : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                }`}>
                  <Crown className="w-3 h-3" />
                  <span>{activePlanDetail.nameHi}</span>
                </span>
              </div>

              {/* Gmail Tracking ID */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-xs text-slate-300 font-medium">
                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-amber-300 font-mono">
                  Gmail:
                </span>
                <span className="text-amber-200 font-mono">
                  {currentUser?.email || 'breakingnewswala.com@gmail.com'}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                  सत्यापित ID
                </span>
              </div>

              {/* Primary Mobile Status */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-xs text-slate-400">
                {subscription.isMobileLocked ? (
                  <span className="flex items-center gap-1 text-emerald-300 font-mono text-xs">
                    <Lock className="w-3 h-3" />
                    <span>प्राइमरी नंबर: {subscription.primaryMobile}</span>
                  </span>
                ) : (
                  <span className="text-amber-400 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>प्राइमरी मोबाइल नंबर अभी दर्ज नहीं है</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Primary Mobile Number Badge - Shown when locked via OTP */}
            {subscription.isMobileLocked && (
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-bold">
                  <span>+91 {subscription.primaryMobile}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>स्थायी लॉक</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Plan Success Notice */}
        {planSuccessMsg && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500 text-emerald-200 rounded-2xl flex items-center gap-3 shadow-xl animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-sm font-bold">{planSuccessMsg}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SYSTEM MODES CONTROLLER (ADMIN ONLY): ADMIN MODE vs TEST MODE             */}
        {/* Modes != Plans != Promo Codes                                            */}
        {/* ========================================================================= */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-2 border-purple-500/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300 shadow-inner shrink-0">
                  <FlaskConical className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      सिस्टम मोड
                    </h3>
                    <span className="px-2 py-0.5 bg-purple-900 text-purple-200 text-[10px] font-black rounded uppercase border border-purple-500">
                      {adminSystemMode === 'admin' ? '⚡ एडमिन मोड' : '🧪 टेस्ट मोड'}
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    सिस्टम मोड प्लान्स से अलग हैं। टेस्ट मोड में आप किसी भी प्लान का यूज़र अनुभव सीधे टेस्ट कर सकते हैं।
                  </p>
                </div>
              </div>

              {/* Mode Toggle Switch: Admin Mode | Test Mode */}
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-purple-500/50 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchAdminMode('admin')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    adminSystemMode === 'admin'
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ एडमिन मोड
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAdminMode('test')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminSystemMode === 'test'
                      ? 'bg-purple-500 text-slate-950 shadow-md ring-2 ring-purple-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${adminSystemMode === 'test' ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
                  <span>🧪 टेस्ट मोड</span>
                </button>
              </div>
            </div>

            {/* If Test Mode is Active: Plan Selector (BASIC, ADVANCE, PRO, VIP DESK) */}
            {adminSystemMode === 'test' && (
              <div className="bg-slate-950/90 border border-purple-400/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>टेस्ट हेतु प्लान चुनें:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    वर्तमान टेस्ट अनुभव:{' '}
                    <strong className="text-amber-400 font-mono text-xs">{PLAN_KEY_MAP[testPlanTier]}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['basic', 'advanced', 'professional', 'ultra'] as UserPlanTier[]).map((tier) => {
                    const isSelected = testPlanTier === tier;
                    const keyName = PLAN_KEY_MAP[tier];

                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleSelectTestPlan(tier)}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/60 shadow-lg'
                            : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span>{keyName}</span>
                        <span className="text-[9.5px] opacity-80 font-normal">
                          {tier === 'basic'
                            ? 'वॉटरमार्क सहित'
                            : tier === 'advanced'
                            ? 'फुल एचडी'
                            : tier === 'professional'
                            ? 'वीडियो स्टूडियो'
                            : 'वीआईपी फ्रेम्स (4K)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {testModeMsg && (
              <div className="text-xs text-purple-200 bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/80 font-bold animate-pulse">
                {testModeMsg}
              </div>
            )}
          </div>
        )}

        {/* ADMIN vs NORMAL USER RENDER */}
        {isAdmin ? (
          <AdminPlansAndPackagesManager
            currentUser={currentUser}
            onPlanChanged={() => setSubscription(getUserSubscription())}
            onOpenStudio={onOpenStudio}
            renderProfileContent={renderProfileOnlyContent}
            categories={categories}
            onAddCategory={onAddCategory}
            onDeleteCategory={onDeleteCategory}
          />
        ) : (
          <div className="space-y-3.5">
            {/* OPTION 1: प्रोफाइल व चैनल विवरण */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'profile' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'profile' ? '' : 'profile')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'profile' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                    <span>1</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      1. प्रोफाइल व चैनल विवरण
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      चैनल लोगो, नाम, प्राइमरी नंबर, सोशल लिंक्स व ब्रांडिंग विवरण
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'profile' ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              {normalUserTab === 'profile' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  {renderProfileOnlyContent()}
                </div>
              )}
            </div>

            {/* OPTION 2: मेंबरशिप प्लान व अपग्रेड */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'membership' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'membership' ? '' : 'membership')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'membership' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                    <span>2</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      2. मेंबरशिप प्लान व अपग्रेड
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      वर्तमान प्लान, 7-डे फ्री ट्रायल, प्रोमो कोड रिडीम व अपग्रेड
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                    {activePlanDetail.nameHi}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'membership' ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'membership' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  {renderMembershipUpgradeSection()}

      {/* MOBILE APK DOWNLOAD PROMINENT CARD */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl flex items-center justify-between flex-wrap gap-3 my-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>📲 एंड्रॉइड मोबाइल ऐप (Android APK) डाउनलोड करें</span>
              <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded uppercase">
                Official Mobile App
              </span>
            </h4>
            <p className="text-xs text-emerald-200/90">
              AI News Maker का आधिकारिक Android App अपने मोबाइल में इंस्टॉल करें और हाई-स्पीड न्यूज़ ग्राफिक व वीडियो बनाएं!
            </p>
          </div>
        </div>
        <a
          href="/ainewsmaker-app.apk"
          download="ainewsmaker-app.apk"
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95 shrink-0"
        >
          <Download className="w-4 h-4 text-slate-950" />
          <span>APK डाउनलोड करें (Direct Download)</span>
        </a>
      </div>

                </div>
              )}
            </div>

            {/* OPTION 3: सहायता एवं नीतियाँ */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'policies' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'policies' ? '' : 'policies')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'policies' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    <span>3</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      3. सहायता एवं नीतियाँ
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      प्राइवेसी पॉलिसी, नियम एवं शर्तें, पेमेंट्स व प्लान्स नीतियाँ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                    3 नीतियां
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'policies' ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'policies' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  <HelpAndPoliciesView />
                </div>
              )}
            </div>

            {/* OPTION 4: लॉगआउट */}
            <div className="rounded-2xl border border-red-900/60 bg-red-950/20 overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={onLogout}
                className="w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 hover:bg-red-950/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    <span>4</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-red-200 block truncate">
                      4. लॉगआउट
                    </span>
                    <p className="text-xs text-red-400/80 truncate mt-0.5">
                      सुरक्षित रूप से अपने खाते से बाहर निकलें
                    </p>
                  </div>
                </div>
                <LogOut className="w-5 h-5 text-red-400 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
