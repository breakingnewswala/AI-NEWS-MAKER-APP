import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Share2,
  Volume2,
  Clock,
  Radio,
  PlusCircle,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  TrendingUp,
  Megaphone,
  VolumeX,
  Palette,
  Layers,
  Mic,
  Video,
  PenTool,
  Newspaper,
  Star,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  X,
  Save,
  RefreshCw,
  Lock,
  Sliders,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  Smartphone,
  Download,
  Flag,
  ExternalLink,
  Coins,
  Gift,
  Film,
  Unlock,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import { NewsFeedPost, filterActiveNews } from '../data/newsFeedData';
import {
  isEffectiveAdmin,
  getUserSubscription,
  fetchUserDailyDownloadStatus,
  getCachedUserDailyDownloadStatus,
  UserDailyDownloadStatus,
} from '../lib/userPlanManager';
import { isNewsGraphicCreated } from '../lib/newsGraphicTracker';
import { FeaturePromotionCard, PromoLayoutRatio } from './FeaturePromotionCard';

// Social Media Brand Icons for Story Feature (Part H)
export const FacebookIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="104" fill="#1877F2"/>
    <path d="M372 256h-66v196h-82V256h-42v-70h42v-46c0-56 34.5-86 84-86 23.8 0 44.5 1.8 50.5 2.6v58.5h-34.6c-27.2 0-32.5 12.9-32.5 31.9V186h65.8l-9.2 70z" fill="#FFFFFF"/>
  </svg>
);

export const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 512 512">
    <defs>
      <radialGradient id="ig-rad-home" cx="15%" cy="100%" r="105%">
        <stop offset="0%" stopColor="#FFDC80"/>
        <stop offset="10%" stopColor="#FCAF45"/>
        <stop offset="45%" stopColor="#F77737"/>
        <stop offset="60%" stopColor="#F56040"/>
        <stop offset="75%" stopColor="#FD1D1D"/>
        <stop offset="90%" stopColor="#E1306C"/>
      </radialGradient>
      <radialGradient id="ig-rad2-home" cx="0%" cy="100%" r="140%">
        <stop offset="35%" stopColor="#C13584" stopOpacity="0"/>
        <stop offset="70%" stopColor="#833AB4" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#405DE6" stopOpacity="1"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" rx="115" fill="url(#ig-rad-home)"/>
    <rect width="512" height="512" rx="115" fill="url(#ig-rad2-home)"/>
    <rect x="96" y="96" width="320" height="320" rx="80" fill="none" stroke="#FFFFFF" strokeWidth="32"/>
    <circle cx="256" cy="256" r="76" fill="none" stroke="#FFFFFF" strokeWidth="32"/>
    <circle cx="348" cy="164" r="20" fill="#FFFFFF"/>
  </svg>
);

export const WhatsAppIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 512 512">
    <circle cx="256" cy="256" r="256" fill="#25D366"/>
    <path d="M256.1 92C165.5 92 92 165.5 92 256.1c0 31.6 8.9 61.1 24.5 86.3L92 420l80.2-24.1c24.2 14.2 52.4 22.4 83.9 22.4 90.6 0 164.1-73.5 164.1-164.1S346.7 92 256.1 92zm95.4 233.1c-4 11.2-23.2 21.6-32.3 22.9-8.4 1.2-19.1 1.7-61.9-15.6-51.5-20.9-84.6-73.4-87.2-76.9-2.5-3.5-20.8-27.7-20.8-52.8 0-25.1 13.1-37.4 17.7-42.5 4.6-5.1 10-6.4 13.4-6.4s6.7.3 9.6.5c3.1.2 7.3-.8 11.4 9.1 4.2 10.2 14.4 35.1 15.6 37.6 1.3 2.5 2.1 5.5.5 8.7-1.7 3.3-2.5 5.3-5 8.3-2.5 2.9-5.3 6.6-7.6 8.8-2.5 2.5-5.1 5.3-2.2 10.3 2.9 5 13 21.4 27.9 34.6 19.2 17.1 35.4 22.4 40.4 24.9 5.1 2.5 8 2.1 11-1.3 2.9-3.4 12.6-14.7 16-19.8 3.4-5.1 6.7-4.2 11.3-2.5 4.6 1.7 29.1 13.7 34.1 16.2 5 2.5 8.4 3.8 9.6 5.9 1.3 2 1.3 11.8-2.7 23z" fill="#FFFFFF"/>
  </svg>
);
import { getApiUrl, getAuthHeaders } from '../lib/apiConfig';

// Central HTML entity decoder for RSS and feed content (resolves &#039;, &quot;, &amp;, etc.)
export function decodeHtmlEntities(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…');
}
import {
  getActiveRssNewsPosts,
  getSavedNewsChannels,
  getApprovedRssIds,
  approveRssPost,
  isRssPostApproved,
  fetchAdminRssSourcesFromBackend,
  syncAllSourcesLive,
} from '../lib/rssSourceManager';
import { fetchRemoteRestrictedChannels, RestrictedChannel } from '../lib/restrictedChannelsManager';
import { getActiveCategories, CategoryItem } from '../lib/categoryManager';

// Category visual differentiation helper: professional, subtle color coding per category
export function getCategoryVisualTheme(category?: string, categoryName?: string) {
  const cat = (category || categoryName || '').toLowerCase();

  if (cat.includes('देश') || cat.includes('nation') || cat.includes('india')) {
    return {
      cardBorder: 'border-blue-500/35 hover:border-blue-400/80',
      badgeBg: 'bg-blue-950/85 text-blue-300 border border-blue-500/40',
      accentDot: 'bg-blue-400',
    };
  }
  if (cat.includes('राज्य') || cat.includes('state') || cat.includes('regional')) {
    return {
      cardBorder: 'border-emerald-500/35 hover:border-emerald-400/80',
      badgeBg: 'bg-emerald-950/85 text-emerald-300 border border-emerald-500/40',
      accentDot: 'bg-emerald-400',
    };
  }
  if (cat.includes('अपराध') || cat.includes('crime') || cat.includes('police')) {
    return {
      cardBorder: 'border-rose-500/35 hover:border-rose-400/80',
      badgeBg: 'bg-rose-950/85 text-rose-300 border border-rose-500/40',
      accentDot: 'bg-rose-400',
    };
  }
  if (cat.includes('राजनीति') || cat.includes('politic') || cat.includes('election')) {
    return {
      cardBorder: 'border-purple-500/35 hover:border-purple-400/80',
      badgeBg: 'bg-purple-950/85 text-purple-300 border border-purple-500/40',
      accentDot: 'bg-purple-400',
    };
  }
  if (cat.includes('व्यापार') || cat.includes('business') || cat.includes('market') || cat.includes('economy')) {
    return {
      cardBorder: 'border-amber-500/35 hover:border-amber-400/80',
      badgeBg: 'bg-amber-950/85 text-amber-300 border border-amber-500/40',
      accentDot: 'bg-amber-400',
    };
  }
  if (cat.includes('खेल') || cat.includes('sport') || cat.includes('cricket')) {
    return {
      cardBorder: 'border-orange-500/35 hover:border-orange-400/80',
      badgeBg: 'bg-orange-950/85 text-orange-300 border border-orange-500/40',
      accentDot: 'bg-orange-400',
    };
  }
  if (cat.includes('मनोरंजन') || cat.includes('entertain') || cat.includes('cinema') || cat.includes('bollywood')) {
    return {
      cardBorder: 'border-fuchsia-500/35 hover:border-fuchsia-400/80',
      badgeBg: 'bg-fuchsia-950/85 text-fuchsia-300 border border-fuchsia-500/40',
      accentDot: 'bg-fuchsia-400',
    };
  }
  // Default (tech, weather, international, etc.)
  return {
    cardBorder: 'border-teal-500/35 hover:border-teal-400/80',
    badgeBg: 'bg-teal-950/85 text-teal-300 border border-teal-500/40',
    accentDot: 'bg-teal-400',
  };
}

// Strip technical source tags (RSS, Web, RSS Feed, Web Source) universally from Home Feed & decode HTML entities
export function cleanViewerHeadline(rawTitle: string): string {
  if (!rawTitle) return '';
  const decoded = decodeHtmlEntities(rawTitle);
  return decoded
    .replace(/^(RSS\s*\|\s*|Web\s*\|\s*|RSS\s*:\s*|Web\s*:\s*|\[RSS\]\s*|\[Web\]\s*|RSS Feed\s*\|\s*|Web Source\s*\|\s*)/i, '')
    .trim();
}

export function cleanViewerChannel(rawChannel: string): string {
  if (!rawChannel) return 'न्यूज़ डेस्क';
  return rawChannel
    .replace(/^(RSS\s*\|\s*|Web\s*\|\s*|RSS\s*:\s*|Web\s*:\s*|\[RSS\]\s*|\[Web\]\s*|RSS Feed\s*\|\s*|Web Source\s*\|\s*)/i, '')
    .replace(/\b(RSS Feed|Web Source|RSS|Web)\b/gi, '')
    .trim() || 'न्यूज़ डेस्क';
}

export function formatDynamicTime(timestamp?: number, fallback?: string): string {
  if (!timestamp || timestamp <= 0) return fallback || 'अभी';
  const diff = Date.now() - timestamp;
  if (diff < 0 || diff < 60000) return 'अभी';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} मिनट पहले`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} घंटे पहले`;
  const days = Math.floor(hours / 24);
  return `${days} दिन पहले`;
}

export function cleanUserFacingFullContent(text?: string): string {
  if (!text) return '';
  return text
    .replace(/(?:^|\n)\s*(?:स्रोतः?|स्रोत|Source\s*:?|Courtesy\s*:?|साभार\s*:?)[^\n]*/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .trim();
}

interface HomeScreenWebProps {
  posts: NewsFeedPost[];
  currentUser?: ReporterUser | null;
  onOpenStudioWithNews: (post: NewsFeedPost) => void;
  onOpenAddPostModal: () => void;
  onToggleHighlightNews?: (postId: string) => void;
  onEditNews?: (post: NewsFeedPost) => void;
  onDeleteNews?: (postId: string) => void;
  onRefreshLiveNews?: () => void;
  isSyncingNews?: boolean;
  onOpenAdminLogin?: () => void;
  onNavigateToTab?: (tab: any, meta?: any) => void;
}

export const HomeScreenWeb: React.FC<HomeScreenWebProps> = ({
  posts,
  currentUser,
  onOpenStudioWithNews,
  onOpenAddPostModal,
  onToggleHighlightNews,
  onEditNews,
  onDeleteNews,
  onRefreshLiveNews,
  isSyncingNews = false,
  onOpenAdminLogin,
  onNavigateToTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingPostId, setSpeakingPostId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [dailyQuotaStatus, setDailyQuotaStatus] = useState<UserDailyDownloadStatus | null>(() => getCachedUserDailyDownloadStatus());

  useEffect(() => {
    fetchUserDailyDownloadStatus(currentUser?.email).then(setDailyQuotaStatus).catch(() => {});
    const handleQuotaUpdate = (e: any) => {
      if (e?.detail) setDailyQuotaStatus(e.detail);
    };
    window.addEventListener('ai_news_download_status_updated', handleQuotaUpdate);
    return () => window.removeEventListener('ai_news_download_status_updated', handleQuotaUpdate);
  }, [currentUser?.email]);

  // User Report Modal State (Part M)
  const [reportingPost, setReportingPost] = useState<NewsFeedPost | null>(null);
  const [reportReason, setReportReason] = useState<string>('खबर गलत है');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportFeedback, setReportFeedback] = useState<string>('');

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPost || isSubmittingReport) return;
    if (reportReason === 'अन्य समस्या' && !reportDetails.trim()) {
      setReportFeedback('⚠️ कृपया "अन्य समस्या" के लिए विवरण दर्ज करें।');
      return;
    }
    setIsSubmittingReport(true);
    try {
      const payload = {
        reportType: 'news',
        targetId: reportingPost.id,
        targetTitle: reportingPost.title,
        reportReason,
        message: reportReason === 'अन्य समस्या' ? reportDetails.trim() : (reportDetails.trim() ? `${reportReason}: ${reportDetails.trim()}` : reportReason),
        userId: currentUser?.email || 'guest',
        userName: currentUser?.name || 'न्यूज़ पाठक',
        userEmail: currentUser?.email || '',
      };
      const res = await fetch(getApiUrl('/api/support/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setReportFeedback('✅ आपकी रिपोर्ट दर्ज हो गई है। धन्यवाद!');
        setTimeout(() => {
          setReportingPost(null);
          setReportFeedback('');
          setReportDetails('');
        }, 1800);
      } else {
        setReportFeedback('❌ रिपोर्ट सबमिट करने में विफल। पुनः प्रयास करें।');
      }
    } catch {
      setReportFeedback('❌ नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Admin moderation states (Active only when authenticated Admin is in Continue as Admin mode)
  const canModerate = isEffectiveAdmin(currentUser);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<NewsFeedPost | null>(null);
  const [isGeneratingEditorial, setIsGeneratingEditorial] = useState<boolean>(false);
  const [editorialError, setEditorialError] = useState<string | null>(null);
  const [editorialSuccess, setEditorialSuccess] = useState<string | null>(null);

  const handleGenerateEditorialData = async () => {
    if (!editingPost) return;
    setIsGeneratingEditorial(true);
    setEditorialError(null);
    setEditorialSuccess(null);
    try {
      const res = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          input: editingPost.sourceUrl || editingPost.summary || editingPost.title,
          linkUrl: editingPost.sourceUrl || undefined,
          customPrompt: undefined,
          aiProvider: 'gemini',
          userTier: 'ultra',
          email: currentUser?.email,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error || 'AI से हेडलाइन व कैप्शन तैयार करने में त्रुटि');
      }
      const aiData = data.data || {};
      const rawHeadlines: string[] = Array.isArray(aiData.headlineOptions) && aiData.headlineOptions.length >= 5
        ? aiData.headlineOptions.slice(0, 5)
        : (aiData.headline ? [aiData.headline] : [editingPost.title]);
      while (rawHeadlines.length < 5) {
        rawHeadlines.push(`अपडेट ${rawHeadlines.length + 1}: ${aiData.headline || editingPost.title}`);
      }
      const generatedHeadlines = rawHeadlines.map((h) => decodeHtmlEntities(h));
      const primaryH = decodeHtmlEntities(aiData.headline || generatedHeadlines[0] || editingPost.title);
      const detailedCap = decodeHtmlEntities(aiData.captionDetailed || aiData.summary || editingPost.summary || '');
      const bulletsCap = decodeHtmlEntities(aiData.captionBullets || '');
      const shortCap = decodeHtmlEntities(aiData.captionShort || '');
      const photos: string[] = [];
      if (aiData.pickedImages?.main) photos.push(aiData.pickedImages.main);
      if (aiData.pickedImages?.second) photos.push(aiData.pickedImages.second);
      if (aiData.pickedImages?.third) photos.push(aiData.pickedImages.third);
      if (photos.length === 0 && editingPost.imageUrl) photos.push(editingPost.imageUrl);
      if (Array.isArray(editingPost.additionalPhotos)) {
        editingPost.additionalPhotos.forEach((p) => {
          if (!photos.includes(p) && photos.length < 3) photos.push(p);
        });
      }
      setEditingPost({
        ...editingPost,
        approvedHeadlines: generatedHeadlines,
        approvedHeadline: primaryH,
        approvedCaptionDetailed: detailedCap,
        approvedCaptionBullets: bulletsCap,
        approvedCaptionShort: shortCap,
        approvedPhotos: photos,
        approvedPhotoLayout: photos.length >= 2 ? 'two_vertical' : 'single',
      });
      setEditorialSuccess('AI हेडलाइन (5 विकल्प), 3 कैप्शन और फ़ोटो तैयार हो गए! समीक्षा कर स्वीकृति दें।');
    } catch (err: any) {
      setEditorialError(err?.message || 'हेडलाइन व कैप्शन जनरेट करने में त्रुटि');
    } finally {
      setIsGeneratingEditorial(false);
    }
  };

  const handleApproveEditorialData = () => {
    if (!editingPost) return;
    const finalHeadlines = (editingPost.approvedHeadlines && editingPost.approvedHeadlines.length > 0)
      ? editingPost.approvedHeadlines
      : [editingPost.approvedHeadline || editingPost.title];
    while (finalHeadlines.length < 5) {
      finalHeadlines.push(`अपडेट ${finalHeadlines.length + 1}: ${editingPost.approvedHeadline || editingPost.title}`);
    }
    const approvedPost: NewsFeedPost = {
      ...editingPost,
      editorialApproved: true,
      approvedHeadline: editingPost.approvedHeadline || finalHeadlines[0] || editingPost.title,
      approvedHeadlines: finalHeadlines,
      approvedCaptionDetailed: editingPost.approvedCaptionDetailed || editingPost.summary || '',
      approvedCaptionBullets: editingPost.approvedCaptionBullets || '',
      approvedCaptionShort: editingPost.approvedCaptionShort || '',
      approvedPhotos: editingPost.approvedPhotos || (editingPost.imageUrl ? [editingPost.imageUrl] : []),
      approvedPhotoLayout: editingPost.approvedPhotoLayout || 'single',
      approvedBy: currentUser?.name || currentUser?.email || 'Master Admin',
      approvedAt: new Date().toISOString(),
    };
    setEditingPost(approvedPost);
    if (onEditNews) {
      onEditNews(approvedPost);
    }
    setEditorialSuccess('✅ संपादकीय हेडलाइन व कैप्शन स्वीकृत हो गए और सुरक्षित कर दिए गए!');
  };

  // Bonus News Intro Popup state (Part P - persisted dismissal)
  const [bonusIntroPost, setBonusIntroPost] = useState<NewsFeedPost | null>(null);

  // Dynamic Unified Categories (Single Source of Truth from CategoryManager)
  const [feedCategories, setFeedCategories] = useState<CategoryItem[]>(() => getActiveCategories());

  // Admin Channel & Filter States (Visible to Admin/SuperAdmin)
  const [adminFilterChannel, setAdminFilterChannel] = useState<string>('');
  const [adminPendingOnly, setAdminPendingOnly] = useState<boolean>(false);
  const [adminPublishedOnly, setAdminPublishedOnly] = useState<boolean>(false);
  const [adminBonusOnly, setAdminBonusOnly] = useState<boolean>(false);
  const [confirmRemoveHighlightPost, setConfirmRemoveHighlightPost] = useState<NewsFeedPost | null>(null);
  const [removedHighlightIds, setRemovedHighlightIds] = useState<Set<string>>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_removed_highlight_news_ids_v1') : null;
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  // Bonus Claim Modal State (1 to 3 screenshots)
  const [bonusClaimPost, setBonusClaimPost] = useState<NewsFeedPost | null>(null);
  const [bonusClaimScreenshots, setBonusClaimScreenshots] = useState<string[]>([]);
  const [bonusClaimSubmitting, setBonusClaimSubmitting] = useState<boolean>(false);
  const [bonusClaimError, setBonusClaimError] = useState<string>('');
  const [bonusClaimSuccess, setBonusClaimSuccess] = useState<string>('');

  // Persisted claimed bonus news IDs (button turns RED and says "बोनस क्लेम किया जा चुका")
  const [claimedBonusNewsIds, setClaimedBonusNewsIds] = useState<Set<string>>(() => {
    try {
      const email = currentUser?.email || 'guest';
      const saved = localStorage.getItem(`app_claimed_bonus_news_ids_${email}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  // Unlocked monetized news posts via coins
  const [unlockedNewsIds, setUnlockedNewsIds] = useState<Set<string>>(() => {
    try {
      const email = currentUser?.email || 'guest';
      const saved = localStorage.getItem(`app_unlocked_news_ids_${email}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const [isUnlockingPostId, setIsUnlockingPostId] = useState<string | null>(null);

  // Admin Coin Value Configuration state
  const [coinConfigPost, setCoinConfigPost] = useState<NewsFeedPost | null>(null);
  const [coinConfigCost, setCoinConfigCost] = useState<number>(50);
  const [coinConfigPlans, setCoinConfigPlans] = useState<string[]>(['Basic']);
  const [coinConfigSaving, setCoinConfigSaving] = useState<boolean>(false);

  // Daily graphic download status & exhaustion modal state
  const [downloadStatus, setDownloadStatus] = useState<{
    isExhausted: boolean;
    remainingDownloads: number;
    dailyQuota: number;
    todayCount: number;
    planTier: string;
  } | null>(null);
  const [showLimitExhaustedModal, setShowLimitExhaustedModal] = useState<boolean>(false);
  const [isRequestingLimitIncrease, setIsRequestingLimitIncrease] = useState<boolean>(false);
  const [limitIncreaseRequested, setLimitIncreaseRequested] = useState<boolean>(false);

  const fetchDownloadStatus = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(getApiUrl(`/api/user-download-status?email=${encodeURIComponent(currentUser.email)}`));
      if (res.ok) {
        const data = await res.json();
        setDownloadStatus(data);
      }
    } catch {}
  };

  const handleOpenStudioSafe = (post: NewsFeedPost) => {
    if (downloadStatus?.isExhausted && !post.isBonus && !isEffectiveAdmin(currentUser)) {
      setShowLimitExhaustedModal(true);
      return;
    }
    onOpenStudioWithNews(post);
  };

  useEffect(() => {
    if (!currentUser?.email) return;
    fetchDownloadStatus();
    const fetchWalletAndUnlocks = async () => {
      try {
        const wRes = await fetch(getApiUrl(`/api/user/wallet?email=${encodeURIComponent(currentUser.email || '')}`));
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.claims && Array.isArray(wData.claims)) {
            const activeClaims = wData.claims
              .filter((c: any) => c.status === 'pending' || c.status === 'approved')
              .map((c: any) => c.newsItemId || c.postId)
              .filter(Boolean);
            setClaimedBonusNewsIds((prev) => {
              const updated = new Set([...Array.from(prev), ...activeClaims]);
              try {
                localStorage.setItem(`app_claimed_bonus_news_ids_${currentUser.email}`, JSON.stringify(Array.from(updated)));
              } catch {}
              return updated;
            });
          }
        }
      } catch {}

      try {
        const uRes = await fetch(getApiUrl(`/api/wallet/unlocked-items?email=${encodeURIComponent(currentUser.email || '')}`));
        if (uRes.ok) {
          const uData = await uRes.json();
          const rawItems = uData.unlockedItems || uData.unlockedList || (Array.isArray(uData.items) ? uData.items.map((it: any) => typeof it === 'string' ? it : it.itemId) : []);
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const newsUnlocked = rawItems.filter((id: string) => typeof id === 'string' && !id.startsWith('vid'));
            setUnlockedNewsIds((prev) => {
              const updated = new Set([...Array.from(prev), ...newsUnlocked]);
              try {
                localStorage.setItem(`app_unlocked_news_ids_${currentUser.email}`, JSON.stringify(Array.from(updated)));
              } catch {}
              return updated;
            });
          }
        }
      } catch {}
    };
    fetchWalletAndUnlocks();

    const handleWalletUpdated = () => fetchWalletAndUnlocks();
    window.addEventListener('wallet_balance_updated', handleWalletUpdated);
    window.addEventListener('ai_news_wallet_updated', handleWalletUpdated);
    window.addEventListener('focus', handleWalletUpdated);

    return () => {
      window.removeEventListener('wallet_balance_updated', handleWalletUpdated);
      window.removeEventListener('ai_news_wallet_updated', handleWalletUpdated);
      window.removeEventListener('focus', handleWalletUpdated);
    };
  }, [currentUser?.email]);

  const markBonusNewsClaimed = (newsId: string) => {
    setClaimedBonusNewsIds((prev) => {
      const updated = new Set(prev);
      updated.add(newsId);
      try {
        const email = currentUser?.email || 'guest';
        localStorage.setItem(`app_claimed_bonus_news_ids_${email}`, JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  };

  const isPostRestricted = (post: NewsFeedPost) => {
    if (canModerate) return false;
    if (!post.coinCost || post.coinCost <= 0) return false;
    if (!Array.isArray(post.restrictedPlans) || post.restrictedPlans.length === 0) return false;
    const sub = getUserSubscription(currentUser?.email);
    const userPlan = (sub?.tier || 'basic').toLowerCase();
    const userPlanName = (sub?.planName || 'BASIC').toLowerCase();
    const isRestricted = post.restrictedPlans.some((p: string) => {
      const cleanP = p.toLowerCase();
      return cleanP === userPlan || cleanP === userPlanName ||
        (cleanP === 'basic' && userPlan === 'basic') ||
        (cleanP === 'advance' && (userPlan === 'advanced' || userPlan === 'advance')) ||
        (cleanP === 'pro' && (userPlan === 'professional' || userPlan === 'pro')) ||
        (cleanP === 'vip desk' && (userPlan === 'ultra' || userPlan === 'vip' || userPlan === 'vip desk'));
    });
    if (!isRestricted) return false;
    return !unlockedNewsIds.has(post.id);
  };

  const handleUnlockNewsPost = async (post: NewsFeedPost) => {
    if (!currentUser?.email) {
      alert('कृपया पहले लॉगिन करें।');
      return;
    }
    const cost = post.coinCost || 0;
    if (cost <= 0) {
      onOpenStudioWithNews(post);
      return;
    }
    const confirmUnlock = window.confirm(`क्या आप ${cost} कॉइन खर्च करके इस खबर से ग्राफिक बनाना चाहते हैं?`);
    if (!confirmUnlock) return;

    setIsUnlockingPostId(post.id);
    try {
      const res = await fetch(getApiUrl('/api/wallet/unlock-item'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          itemId: post.id,
          itemType: 'news',
          coinCost: cost,
          title: post.title,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnlockedNewsIds((prev) => {
          const updated = new Set(prev);
          updated.add(post.id);
          try {
            localStorage.setItem(`app_unlocked_news_ids_${currentUser.email}`, JSON.stringify(Array.from(updated)));
          } catch {}
          return updated;
        });
        window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
        alert(`🎉 बधाई! ${cost} कॉइन में यह खबर अनलॉक हो गई।`);
        onOpenStudioWithNews(post);
      } else {
        alert(data.error || 'अनलॉक विफल रहा। कृपया पर्याप्त कॉइन बैलेंस सुनिश्चित करें।');
      }
    } catch {
      alert('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setIsUnlockingPostId(null);
    }
  };

  const handleSaveCoinConfig = async () => {
    if (!coinConfigPost) return;
    const cost = Math.max(0, Math.floor(Number(coinConfigCost) || 0));
    setCoinConfigSaving(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/news-posts/${encodeURIComponent(coinConfigPost.id)}/coin-value`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinCost: cost,
          restrictedPlans: coinConfigPlans,
        }),
      });
      if (res.ok) {
        if (onEditNews) {
          onEditNews({
            ...coinConfigPost,
            coinCost: cost,
            restrictedPlans: coinConfigPlans,
          });
        }
        setCoinConfigPost(null);
      } else {
        alert('कॉइन वैल्यू सेव करने में विफल।');
      }
    } catch {
      alert('नेटवर्क त्रुटि।');
    } finally {
      setCoinConfigSaving(false);
    }
  };

  const [approvedRssIds, setApprovedRssIds] = useState<Set<string>>(() => getApprovedRssIds());
  const [savedChannels, setSavedChannels] = useState<string[]>(() => getSavedNewsChannels());

  const [localPosts, setLocalPosts] = useState<NewsFeedPost[]>(() => posts);
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('bonus_news_intro_dismissed');
      if (!dismissed) {
        const bonusItem = localPosts.find((p) => p.isBonus);
        if (bonusItem) {
          setBonusIntroPost(bonusItem);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, [localPosts]);

  // Admin Raw News modal state
  const [isRawNewsModalOpen, setIsRawNewsModalOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rawHeadline, setRawHeadline] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [rawLocation, setRawLocation] = useState('सेंट्रल डेस्क');
  const [rawSourceUrl, setRawSourceUrl] = useState('');
  const [rawImageUrl, setRawImageUrl] = useState('');
  const [rawAdditionalImageUrl, setRawAdditionalImageUrl] = useState('');
  const [rawStatus, setRawStatus] = useState<'Draft' | 'Pending' | 'Published'>('Published');
  const [rawSaving, setRawSaving] = useState(false);
  const [rawPreviewMode, setRawPreviewMode] = useState(false);

  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      if (!rawHeadline) setRawHeadline(lines[0].slice(0, 120));
      if (!rawDescription) setRawDescription(lines.slice(1).join('\n') || lines[0]);
    }
  };

  const handleRawImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setRawImageUrl(loadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRawAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setRawAdditionalImageUrl(loadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRawNews = async () => {
    if (!rawHeadline.trim() && !rawText.trim()) {
      alert('कृपया कम से कम हेडलाइन या रॉ टेक्स्ट दर्ज करें।');
      return;
    }
    setRawSaving(true);
    try {
      const finalTitle = rawHeadline.trim() || rawText.slice(0, 120);
      const finalSummary = rawDescription.trim() || rawText;

      const newRawPost: NewsFeedPost = {
        id: `raw-${Date.now()}`,
        title: finalTitle,
        summary: finalSummary,
        sourceChannel: currentUser?.channelName || 'एडमिन डेस्क',
        sourceUrl: rawSourceUrl || '',
        category: 'breaking',
        categoryName: 'रॉ न्यूज़',
        publishedTime: 'अभी-अभी',
        imageUrl: rawImageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80',
        additionalPhotos: rawAdditionalImageUrl ? [rawAdditionalImageUrl] : [],
        breaking: true,
        isExclusive: true,
        timestamp: Date.now(),
        location: rawLocation || 'सेंट्रल डेस्क',
        fullContent: finalSummary,
      };

      // 1. Prepend to local state & localStorage for zero-latency home feed publishing
      setLocalPosts((prev) => {
        const updated = [newRawPost, ...prev];
        try {
          localStorage.setItem('app_news_posts_v2', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 2. Also send to backend
      fetch('/api/admin/raw-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          headline: finalTitle,
          description: finalSummary,
          location: rawLocation,
          sourceUrl: rawSourceUrl,
          imageUrl: rawImageUrl,
          additionalImageUrl: rawAdditionalImageUrl,
          status: rawStatus,
          author: currentUser?.name || currentUser?.username || 'एडमिन',
        }),
      }).catch(() => {});

      setIsRawNewsModalOpen(false);
      setRawText('');
      setRawHeadline('');
      setRawDescription('');
      setRawImageUrl('');
      setRawAdditionalImageUrl('');

      if (onRefreshLiveNews) onRefreshLiveNews();
      window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));

      alert(
        rawStatus === 'Published'
          ? 'रॉ न्यूज़ सफलतापूर्वक होम फ़ीड पर प्रकाशित की गई!'
          : 'रॉ न्यूज़ सुरक्षित कर ली गई!'
      );
    } catch (err) {
      console.error('Error saving raw news:', err);
      alert('रॉ न्यूज़ सहेजने में त्रुटि हुई।');
    } finally {
      setRawSaving(false);
    }
  };

  // Back to Top button state & listener
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowBackToTop(window.scrollY > 300);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = 3 - bonusClaimScreenshots.length;
    if (remainingSlots <= 0) {
      setBonusClaimError('अधिकतम 3 स्क्रीनशॉट ही अपलोड किए जा सकते हैं।');
      return;
    }
    const toProcess = (Array.from(files) as File[]).slice(0, remainingSlots);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        if (result) {
          setBonusClaimScreenshots((prev) => {
            if (prev.length >= 3) return prev;
            return [...prev, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveScreenshot = (index: number) => {
    setBonusClaimScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitBonusClaim = async () => {
    if (!bonusClaimPost) return;
    if (bonusClaimScreenshots.length === 0) {
      setBonusClaimError('कम से कम 1 और अधिकतम 3 स्क्रीनशॉट अपलोड करना अनिवार्य है (0 स्क्रीनशॉट की अनुमति नहीं है)।');
      return;
    }
    if (!currentUser?.email) {
      setBonusClaimError('कृपया क्लेम करने से पहले लॉगिन करें।');
      return;
    }
    setBonusClaimSubmitting(true);
    setBonusClaimError('');
    setBonusClaimSuccess('');
    try {
      const payload = {
        userId: currentUser.email,
        userEmail: currentUser.email,
        userName: currentUser.name || currentUser.username || 'यूज़र',
        newsItemId: bonusClaimPost.id,
        newsTitle: bonusClaimPost.title,
        rewardCoins: bonusClaimPost.rewardCoins || 100,
        screenshotUrls: bonusClaimScreenshots,
        screenshotUrl: bonusClaimScreenshots[0],
        graphicDownloadedAt: Date.now(),
      };
      const res = await fetch(getApiUrl('/api/rewards/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setBonusClaimSuccess('✅ आपका बोनस क्लेम सफलतापूर्वक सबमिट हो गया! एडमिन अनुमोदन के पश्चात कॉइन्स जुड़ेंगे।');
        markBonusNewsClaimed(bonusClaimPost.id);
        setTimeout(() => {
          setBonusClaimPost(null);
          setBonusClaimScreenshots([]);
          setBonusClaimSuccess('');
        }, 2000);
      } else {
        setBonusClaimError(data.error || 'क्लेम सबमिट करने में विफल। पुनः प्रयास करें।');
      }
    } catch {
      setBonusClaimError('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setBonusClaimSubmitting(false);
    }
  };

  const handleConfirmRemoveHighlight = () => {
    if (!confirmRemoveHighlightPost) return;
    const postId = confirmRemoveHighlightPost.id;
    setRemovedHighlightIds((prev) => {
      const updated = new Set(prev);
      updated.add(postId);
      try {
        localStorage.setItem('app_removed_highlight_news_ids_v1', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
    if (onToggleHighlightNews) {
      onToggleHighlightNews(postId);
    }
    setConfirmRemoveHighlightPost(null);
  };

  const [defaultThumbnailIds, setDefaultThumbnailIds] = useState<Set<string>>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_default_thumbnail_news_ids_v1') : null;
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  const toggleDefaultThumbnail = (postId: string) => {
    setDefaultThumbnailIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(postId)) {
        updated.delete(postId);
      } else {
        updated.add(postId);
      }
      try {
        localStorage.setItem('app_default_thumbnail_news_ids_v1', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  };

  // Active Admin RSS & Web Link Sources News Integration
  const [activeRssPosts, setActiveRssPosts] = useState<NewsFeedPost[]>(() => getActiveRssNewsPosts());

  useEffect(() => {
    // Automatically load backend RSS & Web link sources and perform live sync on mount
    fetchAdminRssSourcesFromBackend().then(() => {
      syncAllSourcesLive().catch(() => {});
    }).catch(() => {});

    const handleRssUpdate = () => {
      setActiveRssPosts(getActiveRssNewsPosts());
      setApprovedRssIds(getApprovedRssIds());
    };
    const handleFeedRefresh = () => {
      setActiveRssPosts(getActiveRssNewsPosts());
      setApprovedRssIds(getApprovedRssIds());
    };
    const handleCategoriesUpdate = () => {
      setFeedCategories(getActiveCategories());
    };
    const loadChannels = () => {
      fetchRemoteRestrictedChannels().then((remote) => {
        if (Array.isArray(remote) && remote.length > 0) {
          const names = remote.map((r) => r.channelName || (r as any).name).filter(Boolean);
          const presets = getSavedNewsChannels();
          const merged = Array.from(new Set([...names, ...presets]));
          setSavedChannels(merged);
        } else {
          setSavedChannels(getSavedNewsChannels());
        }
      }).catch(() => {
        setSavedChannels(getSavedNewsChannels());
      });
    };
    loadChannels();
    const handleChannelsUpdate = () => {
      loadChannels();
    };
    const handleApprovedUpdate = () => {
      setApprovedRssIds(getApprovedRssIds());
    };

    window.addEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
    window.addEventListener('ai_news_feed_refresh_needed', handleFeedRefresh);
    window.addEventListener('ai_news_unified_categories_updated', handleCategoriesUpdate);
    window.addEventListener('ai_news_categories_updated', handleCategoriesUpdate);
    window.addEventListener('ai_news_channels_updated', handleChannelsUpdate);
    window.addEventListener('ai_news_saved_channels_updated', handleChannelsUpdate);
    window.addEventListener('ai_news_restricted_channels_updated', handleChannelsUpdate);
    window.addEventListener('ai_news_approved_rss_updated', handleApprovedUpdate);

    return () => {
      window.removeEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
      window.removeEventListener('ai_news_feed_refresh_needed', handleFeedRefresh);
      window.removeEventListener('ai_news_unified_categories_updated', handleCategoriesUpdate);
      window.removeEventListener('ai_news_categories_updated', handleCategoriesUpdate);
      window.removeEventListener('ai_news_channels_updated', handleChannelsUpdate);
      window.removeEventListener('ai_news_saved_channels_updated', handleChannelsUpdate);
      window.removeEventListener('ai_news_restricted_channels_updated', handleChannelsUpdate);
      window.removeEventListener('ai_news_approved_rss_updated', handleApprovedUpdate);
    };
  }, []);

  // Merge active RSS/Web posts with database news posts seamlessly
  const getDeletedIds = (): Set<string> => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_deleted_news_ids_v1') : null;
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  };

  // Merge active RSS/Web posts with database news posts seamlessly & filter out items older than 7 days
  const combinedPosts = useMemo(() => {
    const deletedIds = getDeletedIds();
    const existingIds = new Set(localPosts.map((p) => p.id));
    const normalizeUrl = (u?: string) => (u || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').split('?')[0];
    const existingUrls = new Set(localPosts.map((p) => normalizeUrl(p.sourceUrl)).filter((u) => u.length > 8));
    const activeRssFiltered = filterActiveNews(activeRssPosts);
    const localPostsFiltered = filterActiveNews(localPosts);
    const newFromRss = activeRssFiltered.filter((p) => {
      if (existingIds.has(p.id) || deletedIds.has(p.id)) return false;
      const norm = normalizeUrl(p.sourceUrl);
      if (norm.length > 8 && existingUrls.has(norm)) return false;
      return true;
    });
    const validPosts = localPostsFiltered.filter((p) => !deletedIds.has(p.id));

    const rawList = [...newFromRss, ...validPosts];

    // Part M: Both Home Feed and Video Feed must show the newest eligible content first and older content below
    rawList.sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
      if ((timeB || 0) !== (timeA || 0)) {
        return (timeB || 0) - (timeA || 0);
      }
      return String(b.id).localeCompare(String(a.id));
    });

    return rawList;
  }, [posts, activeRssPosts]);

  // Bonus News Graphic Download Listener: triggers bonus claim popup
  useEffect(() => {
    const handleBonusGraphicDownloaded = (e: any) => {
      const newsId = e.detail?.newsId;
      if (!newsId) return;
      const target = combinedPosts.find((p) => p.id === newsId);
      if (target && target.isBonus) {
        setBonusClaimPost(target);
        setBonusClaimScreenshots([]);
        setBonusClaimError('');
        setBonusClaimSuccess('');
      }
    };
    window.addEventListener('ai_news_bonus_graphic_downloaded', handleBonusGraphicDownloaded);
    return () => window.removeEventListener('ai_news_bonus_graphic_downloaded', handleBonusGraphicDownloaded);
  }, [combinedPosts]);

  const toggleSelectNews = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkHighlight = () => {
    if (!onToggleHighlightNews) return;
    selectedNewsIds.forEach((id) => onToggleHighlightNews(id));
    setSelectedNewsIds([]);
  };

  const handleBulkDelete = () => {
    if (!onDeleteNews) return;
    if (window.confirm(`क्या आप चुनी गई ${selectedNewsIds.length} खबरों को हटाना चाहते हैं?`)) {
      selectedNewsIds.forEach((id) => onDeleteNews(id));
      setSelectedNewsIds([]);
    }
  };

  // Thumbnail resolver supporting Source, Default, and Manual
  const getPostThumbnail = (post: NewsFeedPost) => {
    if (post.imageSource === 'manual' && post.manualThumbnailUrl) {
      return post.manualThumbnailUrl;
    }
    if (post.imageSource === 'default' || defaultThumbnailIds.has(post.id)) {
      return '/assets/placeholder_news_search_16x9.jpg';
    }
    return post.imageUrl || '/assets/placeholder_news_search_16x9.jpg';
  };

  // Derive visiblePosts for non-admin readers (unapproved RSS items excluded; web links bypass directly)
  const visiblePosts = useMemo(() => {
    if (canModerate) return combinedPosts;
    return combinedPosts.filter((p) => isRssPostApproved(p, approvedRssIds));
  }, [combinedPosts, canModerate, approvedRssIds]);

  const pendingRssCount = useMemo(() => {
    return combinedPosts.filter((p) => p.id && (p.id.startsWith('rss-') || p.id.startsWith('web-')) && !isRssPostApproved(p, approvedRssIds)).length;
  }, [combinedPosts, approvedRssIds]);

  const publishedCount = useMemo(() => {
    return combinedPosts.filter((p) => isRssPostApproved(p, approvedRssIds)).length;
  }, [combinedPosts, approvedRssIds]);

  const bonusCount = useMemo(() => {
    return combinedPosts.filter((p) => p.isBonus && (canModerate || isRssPostApproved(p, approvedRssIds))).length;
  }, [combinedPosts, canModerate, approvedRssIds]);

  // Filter posts from combined feed (Admin Date, Channel, Pending News, Published News, Bonus News & Dynamic Category Filters)
  const filteredPosts = useMemo(() => {
    return combinedPosts.filter((p) => {
      // 1. Normal users cannot see unapproved RSS/Web feed items
      if (!canModerate && !isRssPostApproved(p, approvedRssIds)) {
        return false;
      }

      // 2. Admin Pending News Filter: show ONLY unapproved RSS/Web items
      if (canModerate && adminPendingOnly) {
        if (!p.id || (!p.id.startsWith('rss-') && !p.id.startsWith('web-')) || isRssPostApproved(p, approvedRssIds)) {
          return false;
        }
      }

      // 2b. Admin Published News Filter: show ONLY published/approved items
      if (canModerate && adminPublishedOnly) {
        if (p.id && (p.id.startsWith('rss-') || p.id.startsWith('web-')) && !isRssPostApproved(p, approvedRssIds)) {
          return false;
        }
      }

      // 2c. Admin Bonus News Filter: show ONLY bonus news
      if (canModerate && adminBonusOnly) {
        if (!p.isBonus) {
          return false;
        }
      }

      // 3. Admin Channel Filter (Matches sourceChannel)
      if (canModerate && adminFilterChannel) {
        const cleanChan = cleanViewerChannel(p.sourceChannel).toLowerCase();
        const filterChan = adminFilterChannel.toLowerCase();
        if (!cleanChan.includes(filterChan) && !filterChan.includes(cleanChan)) {
          return false;
        }
      }

      // 4. Category Filter
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'breaking') return p.breaking;
      const catObj = feedCategories.find((c) => c.id === selectedCategory);
      const catName = catObj ? catObj.name.replace(/^[^a-zA-Z0-9\u0900-\u097F]+/, '').trim().toLowerCase() : selectedCategory.toLowerCase();
      const postCat = (p.category || '').toLowerCase();
      const postCatName = (p.categoryName || '').toLowerCase();
      return postCat === selectedCategory.toLowerCase() || postCatName.includes(catName) || catName.includes(postCatName);
    });
  }, [combinedPosts, canModerate, adminPendingOnly, adminPublishedOnly, adminBonusOnly, adminFilterChannel, selectedCategory, feedCategories, approvedRssIds]);

  const breakingPosts = visiblePosts.filter((p) => p.breaking).length > 0
    ? visiblePosts.filter((p) => p.breaking)
    : visiblePosts.slice(0, 6);

  // Identify highlights (exclusive / breaking) for Notification Board Carousel (up to 9 items for multi-item view, excluding admin removed highlights)
  const highlightPosts = useMemo(() => {
    const unremovedFiltered = filteredPosts.filter((p) => !removedHighlightIds.has(p.id));
    const exclusiveOrBreaking = unremovedFiltered.filter((p) => p.isExclusive || p.breaking);
    if (exclusiveOrBreaking.length > 0) return exclusiveOrBreaking.slice(0, 9);
    if (unremovedFiltered.length > 0) return unremovedFiltered.slice(0, 9);
    return visiblePosts.filter((p) => !removedHighlightIds.has(p.id)).slice(0, 9);
  }, [filteredPosts, visiblePosts, removedHighlightIds]);

  // 1. Ticker State: Single News visible, auto-changes every 4 seconds
  const [currentTickerIndex, setCurrentTickerIndex] = useState<number>(0);
  const [isTickerHovered, setIsTickerHovered] = useState<boolean>(false);

  useEffect(() => {
    if (breakingPosts.length <= 1 || isTickerHovered) return;
    const interval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % breakingPosts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [breakingPosts.length, isTickerHovered]);

  // Track mobile vs desktop screen for Highlights Board (1 card on mobile, 3 cards on desktop/web)
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const highlightItemsPerPage = isMobileScreen ? 1 : 3;
  const totalHighlightPages = Math.max(1, Math.ceil(highlightPosts.length / highlightItemsPerPage));
  const [highlightPageIndex, setHighlightPageIndex] = useState<number>(0);
  const [isHighlightHovered, setIsHighlightHovered] = useState<boolean>(false);

  // Auto-slide Highlights pages every 5 seconds
  useEffect(() => {
    if (totalHighlightPages <= 1 || isHighlightHovered) return;
    const interval = setInterval(() => {
      setHighlightPageIndex((prev) => (prev + 1) % totalHighlightPages);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalHighlightPages, isHighlightHovered]);

  const safeHighlightPageIndex = highlightPageIndex % totalHighlightPages;
  const visibleHighlightPosts = highlightPosts.slice(
    safeHighlightPageIndex * highlightItemsPerPage,
    safeHighlightPageIndex * highlightItemsPerPage + highlightItemsPerPage
  );

  // Text-to-speech for Hindi full article
  const handleSpeak = (text: string, postId: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking && speakingPostId === postId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingPostId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingPostId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingPostId(null);
    };
    setIsSpeaking(true);
    setSpeakingPostId(postId);
    window.speechSynthesis.speak(utterance);
  };

  const handleShare = (post: NewsFeedPost) => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${post.title}\n\n${post.summary}\n\n- AI News Maker`);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const currentTickerPost = breakingPosts[currentTickerIndex] || breakingPosts[0];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D1E] text-slate-900 dark:text-slate-100 pb-24 transition-colors">
      {/* Admin Filter Bar (Unfreezed - Scrolls naturally with content) */}
      {canModerate && (
        <div className="relative z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-amber-500/30 text-slate-800 dark:text-white px-3 sm:px-6 lg:px-8 py-2.5 shadow-sm dark:shadow-xl backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-300">
                एडमिन फ़िल्टर (होम फ़ीड)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">

              {/* 2. Channel Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">चैनल:</span>
                <select
                  value={adminFilterChannel}
                  onChange={(e) => setAdminFilterChannel(e.target.value)}
                  className="bg-transparent text-amber-700 dark:text-amber-300 text-xs font-bold outline-none cursor-pointer max-w-[130px]"
                >
                  <option value="" className="bg-slate-900 text-white">सभी चैनल</option>
                  {savedChannels.map((c: any, idx) => {
                    const chanName = typeof c === 'string' ? c : (c.channelName || c.name || '');
                    if (!chanName) return null;
                    return (
                      <option key={`${c.id || chanName}-${idx}`} value={chanName} className="bg-slate-900 text-white">
                        {chanName}
                      </option>
                    );
                  })}
                </select>
                {adminFilterChannel && (
                  <button
                    type="button"
                    onClick={() => setAdminFilterChannel('')}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 3. Published News Toggle */}
              <button
                type="button"
                onClick={() => {
                  setAdminPublishedOnly(!adminPublishedOnly);
                  if (!adminPublishedOnly) setAdminPendingOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminPublishedOnly
                    ? 'bg-emerald-600 text-white font-black shadow-md'
                    : 'bg-slate-100 dark:bg-slate-950 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>✅ प्रकाशित खबरें ({publishedCount})</span>
              </button>

              {/* 4. Bonus News Toggle */}
              <button
                type="button"
                onClick={() => setAdminBonusOnly(!adminBonusOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminBonusOnly
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-100 dark:bg-slate-950 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>बोनस खबरें ({bonusCount})</span>
              </button>

              {/* 5. RSS Pending Approval Toggle */}
              <button
                type="button"
                onClick={() => {
                  setAdminPendingOnly(!adminPendingOnly);
                  if (!adminPendingOnly) setAdminPublishedOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminPendingOnly
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-950 text-amber-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>⏳ पेंडिंग RSS ({pendingRssCount})</span>
              </button>

              {/* Raw News Button */}
              <button
                type="button"
                onClick={() => setIsRawNewsModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="रॉ न्यूज़ जोड़ें"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>+ रॉ न्यूज़</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Centered Container: All boxes share the exact same width and alignment */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">

        {/* 1. Live Breaking News Ticker (Centered Box, 1 news at a time, auto-changes every 4 seconds) */}
        {breakingPosts.length > 0 && currentTickerPost && (
          <div
            onMouseEnter={() => setIsTickerHovered(true)}
            onMouseLeave={() => setIsTickerHovered(false)}
            className="w-full bg-white dark:bg-slate-900 border border-red-400/40 dark:border-red-700/50 rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm dark:shadow-lg hover:border-red-500 dark:hover:border-red-600 transition-colors"
          >
            {/* Left: LIVE Badge with Pulsing Ping Dot */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>लेटेस्ट न्यूज़</span>
              </div>
            </div>

            {/* Center: ONE News at a time with smooth transition */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-3 overflow-hidden">
              <div
                key={currentTickerPost.id}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-amber-300 truncate animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:text-red-600 dark:hover:text-white"
                onClick={() => onOpenStudioWithNews(currentTickerPost)}
                title="क्लिक करके स्टूडियो में कार्ड बनाएं"
              >
                <span className="text-red-400 font-bold shrink-0">
                  [#{currentTickerIndex + 1}]
                </span>
                <span className="truncate">{cleanViewerHeadline(currentTickerPost.title)}</span>
              </div>

              {/* Progress counter e.g. 1/6 */}
              <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs font-bold text-slate-400">
                <span className="text-amber-400">{currentTickerIndex + 1}</span>
                <span>/</span>
                <span>{breakingPosts.length}</span>
              </div>
            </div>

            {/* Right: Studio Quick Action & Prev/Next navigation */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onOpenStudioWithNews(currentTickerPost)}
                className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1 transition-transform active:scale-95"
                title="इस खबर से ग्राफिक बनाएं"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span className="hidden md:inline">खबर से ग्राफिक बनाएं</span>
              </button>

              <div className="flex items-center">
                <button
                  onClick={() =>
                    setCurrentTickerIndex(
                      (prev) => (prev - 1 + breakingPosts.length) % breakingPosts.length
                    )
                  }
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="पिछली खबर"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentTickerIndex((prev) => (prev + 1) % breakingPosts.length)
                  }
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="अगली खबर"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Admin Bulk Moderation Action Bar (Visible only when Admin selects items) */}
        {canModerate && selectedNewsIds.length > 0 && (
          <div className="w-full bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-2 border-purple-500 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping" />
              <span className="text-xs sm:text-sm font-black text-purple-200">
                ☑ {selectedNewsIds.length} खबर चुनी गई
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkHighlight}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <Star className="w-3.5 h-3.5 fill-slate-950" />
                <span>हाइलाइट टॉगल करें</span>
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>डिलीट करें</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNewsIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
              >
                रद्द करें
              </button>
            </div>
          </div>
        )}

        {/* 3. Highlights Notification Board (विशेष नोटिफिकेशन बोर्ड - 3 items on desktop, 1 on mobile, auto-scrolling) */}
        {highlightPosts.length > 0 && visibleHighlightPosts.length > 0 && (
          <div
            onMouseEnter={() => setIsHighlightHovered(true)}
            onMouseLeave={() => setIsHighlightHovered(false)}
            className="w-full bg-white dark:bg-slate-900 border-2 border-amber-400/80 dark:border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all"
          >
            {/* Header: Title + Tag (Single line, full size) + Navigation (Removed 1 2 3 counter) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide truncate">
                  विशेष नोटिफिकेशन बोर्ड (प्रमुख खबरें)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Full-size single line badge - never breaks to 2 lines */}
                <span
                  className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-white whitespace-nowrap shrink-0 shadow ${
                    visibleHighlightPosts[0]?.isExclusive
                      ? 'bg-amber-600'
                      : visibleHighlightPosts[0]?.breaking
                      ? 'bg-red-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {visibleHighlightPosts[0]?.isExclusive
                    ? 'एक्सक्लूसिव'
                    : visibleHighlightPosts[0]?.breaking
                    ? 'सुपर ब्रेकिंग'
                    : 'खास खबरें'}
                </span>

                {/* Arrow pagination (replaces the removed 1 2 3 / counter numbers) */}
                {totalHighlightPages > 1 && (
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setHighlightPageIndex(
                          (prev) => (prev - 1 + totalHighlightPages) % totalHighlightPages
                        )
                      }
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="पिछली खबरें"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHighlightPageIndex((prev) => (prev + 1) % totalHighlightPages)
                      }
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="अगली खबरें"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Grid of Highlight Cards: 3 on desktop, 2 on tablet, 1 on mobile (Proper 16:9 Thumbnail preview) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleHighlightPosts.map((post) => {
                const isPaid = !!(post.coinCost && post.coinCost > 0);
                const isBonus = !!post.isBonus;
                const isUnlocked = unlockedNewsIds.has(post.id);
                const isRestricted = isPostRestricted(post);
                const isBonusClaimed = claimedBonusNewsIds.has(post.id);

                const cardBorderClass = (isPaid && isBonus)
                  ? 'border-2 border-amber-500/90 ring-2 ring-emerald-500/60 shadow-lg shadow-amber-500/10'
                  : isPaid
                  ? 'border-2 border-amber-500/90 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                  : isBonus
                  ? 'border-2 border-emerald-500/90 ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-500/10'
                  : 'border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-400/80 dark:hover:border-slate-600/80 shadow-sm hover:shadow-xl';

                return (
                <div
                  key={post.id}
                  className={`bg-slate-50 dark:bg-slate-950/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 group border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/60 shadow-sm hover:shadow-md ${cardBorderClass}`}
                >
                  <div>
                    {/* Media Image Banner: Perfect 16:9 Aspect Ratio thumbnail, no vertical stretching */}
                    <div
                      onClick={() => handleOpenStudioSafe(post)}
                      className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-950 mb-2.5 cursor-pointer group/img shadow-inner border border-slate-800/80"
                      title="क्लिक करके स्टूडियो में कार्ड बनाएं"
                    >
                      <img
                        src={getPostThumbnail(post)}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                      {/* Top Tag on Image */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                        {isPaid && (
                          isUnlocked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 shadow flex items-center gap-1 backdrop-blur-sm">
                              <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                              <span>🔓 अनलॉक की गई</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-950/90 text-amber-300 border border-amber-500/80 shadow flex items-center gap-1 backdrop-blur-sm">
                              <Coins className="w-2.5 h-2.5 text-amber-400" />
                              <span>🪙 पेड खबर • {post.coinCost} कॉइन</span>
                            </span>
                          )
                        )}
                        {isBonus && (
                          isBonusClaimed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 shadow flex items-center gap-1 backdrop-blur-sm">
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span>✓ बोनस क्लेम किया गया</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-900/90 text-emerald-200 border border-emerald-400/80 shadow flex items-center gap-1 backdrop-blur-sm animate-pulse">
                              <Gift className="w-2.5 h-2.5 text-emerald-400" />
                              <span>🎁 बोनस खबर</span>
                            </span>
                          )
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shadow whitespace-nowrap ${
                            post.isExclusive
                              ? 'bg-amber-600'
                              : post.breaking
                              ? 'bg-red-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {post.isExclusive ? 'एक्सक्लूसिव' : post.breaking ? 'सुपर ब्रेकिंग' : 'खास खबर'}
                        </span>
                      </div>

                      {/* Admin Remove from Highlights Button */}
                      {canModerate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRemoveHighlightPost(post);
                          }}
                          className="absolute top-2 left-2 p-1 bg-black/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-md transition-colors border border-slate-700 shadow z-10 cursor-pointer"
                          title="प्रमुख खबरों से हटाएं"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Bottom Info on Image */}
                      {/* Bottom Info on Image: Location & Time */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white">
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-md font-bold text-amber-300 border border-amber-500/30 truncate max-w-[55%] text-[11px]">
                          {post.location ? `📍 ${post.location}` : post.categoryName}
                        </span>
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-md text-[10px] text-slate-300">
                          {formatDynamicTime(post.timestamp, post.publishedTime)}
                        </span>
                      </div>
                    </div>

                    {/* Meta info (duplicate time & location removed beneath highlighted card per Module L) */}
                    {(canModerate || post.sourceUrl) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 flex-wrap">
                        {canModerate && (
                          <span className="text-slate-400 font-medium truncate max-w-[45%]">
                            [चैनल: {cleanViewerChannel(post.sourceChannel)}]
                          </span>
                        )}
                        {canModerate && post.sourceUrl && <span>•</span>}
                        {post.sourceUrl && (
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer shrink-0 border border-slate-700"
                            title="मूल वेबसाइट पर खबर देखें"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>वेबसाइट पर जाएँ</span>
                          </a>
                        )}
                        {canModerate && (post.id.startsWith('rss-') || post.id.startsWith('web-')) && !isRssPostApproved(post, approvedRssIds) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              approveRssPost(post.id, post);
                              setApprovedRssIds(getApprovedRssIds());
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer shrink-0 shadow animate-pulse"
                            title="इस RSS खबर को स्वीकृत करें"
                          >
                            <Check className="w-3 h-3" />
                            <span>स्वीकृत करें</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Headline */}
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <h3
                        onClick={() => {
                          if (isPostRestricted(post)) {
                            handleUnlockNewsPost(post);
                          } else {
                            onOpenStudioWithNews(post);
                          }
                        }}
                        className="text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-300 cursor-pointer transition-colors leading-snug line-clamp-2"
                        title="क्लिक करके स्टूडियो में कार्ड बनाएं"
                      >
                        {cleanViewerHeadline(post.title)}
                      </h3>
                      {isPaid && (
                        isUnlocked ? (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-black flex items-center gap-1 shrink-0 ml-1.5">
                            <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                            <span>अनलॉक</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-black flex items-center gap-1 shrink-0 ml-1.5">
                            <Coins className="w-2.5 h-2.5 text-amber-400" />
                            <span>{post.coinCost} कॉइन</span>
                          </span>
                        )
                      )}
                    </div>

                    {/* Summary - In-place expansion per Part F */}
                    <p
                      className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5 transition-all ${
                        expandedCardId === `highlight-${post.id}`
                          ? 'whitespace-pre-line text-slate-200'
                          : 'line-clamp-2'
                      }`}
                    >
                      {decodeHtmlEntities(post.summary)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1.5 pt-2.5 border-t border-slate-800/80 mt-auto">
                    {post.isBonus && (
                      <div className="text-[10px] text-amber-300 font-bold bg-amber-950/70 border border-amber-500/40 rounded py-1 px-2 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>रिवॉर्ड पात्रता: <strong>{post.rewardCoins || 100} Coins</strong></span>
                        </span>
                        <span className="text-[9px] text-amber-200">ग्राफिक बनाकर क्लेम करें</span>
                      </div>
                    )}
                    {post.isBonus && isNewsGraphicCreated(currentUser?.email, post.id) && (
                      claimedBonusNewsIds.has(post.id) ? (
                        <button
                          disabled
                          type="button"
                          className="w-full py-1.5 px-3 bg-red-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>बोनस क्लेम किया जा चुका</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBonusClaimPost(post);
                            setBonusClaimScreenshots([]);
                            setBonusClaimError('');
                            setBonusClaimSuccess('');
                          }}
                          className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-300" />
                          <span>अपना बोनस क्लेम करें ({post.rewardCoins || 100} Coins)</span>
                        </button>
                      )
                    )}
                    {isNewsGraphicCreated(currentUser?.email, post.id) && !post.isBonus && (
                      <span className="text-[10px] text-emerald-400 font-bold text-center bg-emerald-950/60 border border-emerald-500/30 rounded py-0.5 px-1">
                        ✓ इस खबर का ग्राफिक बनाया जा चुका है
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {/* खबर से ग्राफिक बनाएं / कॉइन अनलॉक */}
                      {isPostRestricted(post) ? (
                        <button
                          type="button"
                          disabled={isUnlockingPostId === post.id}
                          onClick={() => handleUnlockNewsPost(post)}
                          className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                          <span>{isUnlockingPostId === post.id ? 'अनलॉक हो रहा है...' : `${post.coinCost} कॉइन में इस खबर से ग्राफिक बनाएँ`}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenStudioSafe(post)}
                          className={`flex-1 py-1.5 px-3 ${
                            isNewsGraphicCreated(currentUser?.email, post.id)
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
                          } text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer whitespace-nowrap`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                          <span>
                            {isNewsGraphicCreated(currentUser?.email, post.id)
                              ? `ग्राफिक्स फिर से बनाएँ${dailyQuotaStatus && !dailyQuotaStatus.unlimited && !canModerate ? ` · शेष ${dailyQuotaStatus.remainingToday}` : ''}`
                              : `खबर से ग्राफिक बनाएं${dailyQuotaStatus && !dailyQuotaStatus.unlimited && !canModerate ? ` · शेष ${dailyQuotaStatus.remainingToday}` : ''}`}
                          </span>
                        </button>
                      )}

                      {/* Admin View: वेबसाइट पर जाएँ */}
                      {canModerate && (
                        post.sourceUrl ? (
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700 cursor-pointer shrink-0"
                            title="मूल वेबसाइट पर खबर देखें"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>वेबसाइट</span>
                          </a>
                        ) : null
                      )}

                      {/* Ordinary User: प्रमुख रिपोर्ट करें बटन */}
                      {!canModerate && (
                        <button
                          type="button"
                          onClick={() => setReportingPost(post)}
                          className="py-1.5 px-2.5 bg-slate-800/80 hover:bg-rose-950/70 hover:text-rose-300 text-slate-300 rounded-xl border border-slate-700/60 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="इस खबर की रिपोर्ट करें"
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>रिपोर्ट करें</span>
                        </button>
                      )}
                    </div>

                    {/* 4. Social Media Story Section (Part H: UI Only, Full Width) */}
                    <div className="w-full mt-1.5 pt-1.5 border-t border-slate-800/70 flex items-center justify-between gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20" title="Facebook Story">
                          <FacebookIcon />
                        </span>
                        <span className="p-1 rounded-md bg-pink-500/10 border border-pink-500/20" title="Instagram Story">
                          <InstagramIcon />
                        </span>
                        <span className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20" title="WhatsApp Status">
                          <WhatsAppIcon />
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-1 px-1.5 bg-slate-800/80 text-slate-400 font-bold text-[10.5px] rounded-lg border border-slate-700/60 flex items-center justify-center gap-1 cursor-not-allowed opacity-80"
                        title="सोशल मीडिया स्टोरी फीचर जल्द आ रहा है (Coming Soon)"
                      >
                        <Film className="w-3 h-3 text-amber-400/70" />
                        <span className="truncate">सोशल मीडिया स्टोरी बनाएँ</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">जल्द</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Bottom: Page Indicator Dots */}
            {totalHighlightPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-3.5 mt-3 border-t border-slate-800/60">
                {Array.from({ length: totalHighlightPages }).map((_, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setHighlightPageIndex(pIdx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      pIdx === safeHighlightPageIndex
                        ? 'w-6 bg-amber-400 shadow-md shadow-amber-400/30'
                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    title={`पेज ${pIdx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}



        {/* 4. Category Filter Chips (Single Source of Truth from Category Manager) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-400/25 font-black scale-105'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs'
            }`}
          >
            <span>सभी</span>
          </button>

          {feedCategories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-400/25 font-black scale-105'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* 5. Main News Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              प्रमुख खबरें एवं अपडेट्स ({filteredPosts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post, postIndex) => {
              const promoConfig = (() => {
                if (postIndex === 5) return { layoutRatio: '16:9' as PromoLayoutRatio, startFeatureIndex: 0 };
                if (postIndex === 12) return { layoutRatio: 'carousel' as PromoLayoutRatio, startFeatureIndex: 5 };
                if (postIndex === 19) return { layoutRatio: '4:5' as PromoLayoutRatio, startFeatureIndex: 4 };
                if (postIndex === 26) return { layoutRatio: '1:1' as PromoLayoutRatio, startFeatureIndex: 8 };
                if (postIndex === 33) return { layoutRatio: 'carousel' as PromoLayoutRatio, startFeatureIndex: 11 };
                if ((postIndex + 1) % 7 === 0 && postIndex > 33) {
                  const ratios: PromoLayoutRatio[] = ['16:9', 'carousel', '4:5', '1:1'];
                  const slot = Math.floor(postIndex / 7);
                  return {
                    layoutRatio: ratios[slot % ratios.length],
                    startFeatureIndex: (slot * 3) % 12,
                  };
                }
                return null;
              })();

              const isSelected = selectedNewsIds.includes(post.id);
              const isHighlighted = post.isExclusive;
              const catTheme = getCategoryVisualTheme(post.category, post.categoryName);
              const isDefaultThumbActive = defaultThumbnailIds.has(post.id);
              const displayThumbnail = getPostThumbnail(post);
              const isPaid = !!(post.coinCost && post.coinCost > 0);
              const isBonus = !!post.isBonus;
              const isUnlocked = unlockedNewsIds.has(post.id);
              const isRestricted = isPostRestricted(post);
              const isBonusClaimed = claimedBonusNewsIds.has(post.id);

              const cardBorderClass = (isPaid && isBonus)
                ? 'border-2 border-amber-500/90 ring-2 ring-emerald-500/60 shadow-lg shadow-amber-500/10'
                : isPaid
                ? 'border-2 border-amber-500/90 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                : isBonus
                ? 'border-2 border-emerald-500/90 ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-500/10'
                : isHighlighted
                ? 'border-2 border-indigo-400/80 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-500/10'
                : 'border border-slate-700/90 hover:border-slate-500/80 shadow-md';

              const isCardExhausted = Boolean(downloadStatus?.isExhausted && !isBonus && !canModerate);

              return (
                <React.Fragment key={post.id}>
                  <div
                    className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between group relative ${cardBorderClass} ${
                      isCardExhausted ? 'opacity-40 hover:opacity-70' : ''
                    }`}
                  >
                  {isCardExhausted && (
                    <div
                      onClick={() => setShowLimitExhaustedModal(true)}
                      className="bg-amber-950/90 border-b border-amber-600/50 px-3 py-1.5 text-[11px] text-amber-300 font-bold flex items-center justify-between cursor-pointer hover:bg-amber-900/90 select-none z-10"
                    >
                      <span className="flex items-center gap-1">
                        <span>⚠️</span>
                        <span>दैनिक लिमिट समाप्त</span>
                      </span>
                      <span className="text-[10px] underline">लिमिट बढ़ाएं</span>
                    </div>
                  )}
                  {/* Admin Moderation Bar (Visible strictly to authenticated Admin in Admin Mode) */}
                  {canModerate && (
                    <div className="bg-slate-50 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800/80 px-3 py-1.5 flex items-center justify-between gap-2 z-10">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectNews(post.id)}
                          className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                        />
                        <span>Select</span>
                      </label>

                      {/* RSS/Web Approval Button if pending */}
                      {(post.id.startsWith('rss-') || post.id.startsWith('web-')) && !isRssPostApproved(post, approvedRssIds) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveRssPost(post.id);
                            setApprovedRssIds(getApprovedRssIds());
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg flex items-center gap-1 transition cursor-pointer shadow animate-pulse"
                          title="इस RSS खबर को स्वीकृत करें और पाठकों के होम फ़ीड पर प्रकाशित करें"
                        >
                          <Check className="w-3 h-3 text-white" />
                          <span>स्वीकृत करें</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="relative w-full aspect-video rounded-t-xl overflow-hidden bg-slate-950">
                      <img
                        src={displayThumbnail}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                        {isPaid && (
                          isUnlocked ? (
                            <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10px] font-black rounded-md flex items-center gap-1 shadow-md backdrop-blur-sm">
                              <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                              <span>🔓 अनलॉक की गई</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-950/90 text-amber-300 border border-amber-500/80 text-[10px] font-black rounded-md flex items-center gap-1 shadow-md backdrop-blur-sm">
                              <Coins className="w-2.5 h-2.5 text-amber-400" />
                              <span>🪙 पेड खबर • {post.coinCost} कॉइन</span>
                            </span>
                          )
                        )}
                        {isBonus && (
                          isBonusClaimed ? (
                            <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10px] font-black rounded-md flex items-center gap-1 shadow-md backdrop-blur-sm">
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span>✓ बोनस क्लेम किया गया</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-900/90 text-emerald-200 border border-emerald-400/80 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md backdrop-blur-sm animate-pulse">
                              <Gift className="w-2.5 h-2.5 text-emerald-400" />
                              <span>🎁 बोनस खबर ({post.rewardCoins || 100} Coins)</span>
                            </span>
                          )
                        )}
                        {isHighlighted && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                            हाइलाइटेड
                          </span>
                        )}
                        {post.breaking && (
                          <span className="px-2.5 py-0.5 bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-black rounded-md uppercase tracking-wider">
                            ब्रेकिंग
                          </span>
                        )}
                        {/* Category Badge with distinct visual style */}
                        <span className={`px-2.5 py-0.5 backdrop-blur-sm ${catTheme.badgeBg} text-[11px] font-bold rounded-md flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catTheme.accentDot}`} />
                          {post.categoryName}
                        </span>

                        {/* Pre-Published Approved Editorial Badge */}
                        {Boolean((post as any).isPrePublished || (post as any).isApproved) && (
                          <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10px] font-black rounded-md flex items-center gap-1 shadow-md backdrop-blur-sm">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>प्री-पब्लिश</span>
                          </span>
                        )}

                        {/* Pending RSS/Web Badge */}
                        {canModerate && (post.id.startsWith('rss-') || post.id.startsWith('web-')) && !isRssPostApproved(post, approvedRssIds) && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                            ⏳ लंबित फ़ीड/RSS
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-slate-300">
                        {formatDynamicTime(post.timestamp, post.publishedTime)}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {canModerate && (
                        <div className="text-xs text-amber-400/90 font-medium">
                          चैनल: {cleanViewerChannel(post.sourceChannel)}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          onClick={() => {
                            if (isPostRestricted(post)) {
                              handleUnlockNewsPost(post);
                            } else {
                              handleOpenStudioSafe(post);
                            }
                          }}
                          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-3 leading-snug"
                          title="क्लिक करके स्टूडियो में कार्ड बनाएं"
                        >
                          {cleanViewerHeadline(post.title)}
                        </h4>
                        {isPaid && (
                          isUnlocked ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-black flex items-center gap-1 shrink-0 ml-1.5">
                              <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                              <span>अनलॉक</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-black flex items-center gap-1 shrink-0 ml-1.5">
                              <Coins className="w-2.5 h-2.5 text-amber-400" />
                              <span>{post.coinCost} कॉइन</span>
                            </span>
                          )
                        )}
                      </div>

                      {/* Summary - In-place expansion per Part F */}
                      <p
                        className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-all ${
                          expandedCardId === post.id
                            ? 'whitespace-pre-line text-slate-200'
                            : 'line-clamp-3'
                        }`}
                      >
                        {decodeHtmlEntities(post.summary)}
                      </p>

                      {/* Additional Photos Mini Preview */}
                      {post.additionalPhotos && post.additionalPhotos.length > 0 && (
                        <div className="pt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          <span className="text-[10px] text-amber-400 font-bold shrink-0 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>अन्य फोटो ({post.additionalPhotos.length}):</span>
                          </span>
                          {post.additionalPhotos.map((photoUrl, pIdx) => (
                            <img
                              key={pIdx}
                              src={photoUrl}
                              alt={`अतिरिक्त फोटो ${pIdx + 1}`}
                              className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0 hover:scale-110 transition cursor-pointer"
                              title={`अतिरिक्त फोटो ${pIdx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dedicated Action Button for Pending RSS in Admin View */}
                  {canModerate && post.id.startsWith('rss-') && !isRssPostApproved(post, approvedRssIds) && (
                    <div className="px-4 pb-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveRssPost(post.id, post);
                          setApprovedRssIds(getApprovedRssIds());
                        }}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        title="इस RSS खबर को स्वीकृत कर होम फ़ीड पर प्रकाशित करें"
                      >
                        <Check className="w-4 h-4 text-white" />
                        <span>स्वीकृत करें व प्रकाशित करें</span>
                      </button>
                    </div>
                  )}

                  <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex flex-col gap-2">
                    {post.isBonus && (
                      <div className="text-[10px] text-amber-300 font-bold bg-amber-950/70 border border-amber-500/40 rounded py-1 px-2 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>रिवॉर्ड पात्रता: <strong>{post.rewardCoins || 100} Coins</strong></span>
                        </span>
                        <span className="text-[9px] text-amber-200">ग्राफिक बनाकर क्लेम करें</span>
                      </div>
                    )}
                    {post.isBonus && isNewsGraphicCreated(currentUser?.email, post.id) && (
                      claimedBonusNewsIds.has(post.id) ? (
                        <button
                          disabled
                          type="button"
                          className="w-full py-2 px-3 bg-red-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                        >
                          <Check className="w-4 h-4 text-white" />
                          <span>बोनस क्लेम किया जा चुका</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBonusClaimPost(post);
                            setBonusClaimScreenshots([]);
                            setBonusClaimError('');
                            setBonusClaimSuccess('');
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Coins className="w-4 h-4 text-amber-300" />
                          <span>अपना बोनस क्लेम करें ({post.rewardCoins || 100} Coins)</span>
                        </button>
                      )
                    )}
                    {isNewsGraphicCreated(currentUser?.email, post.id) && !post.isBonus && (
                      <span className="text-[10px] text-emerald-400 font-bold text-center bg-emerald-950/60 border border-emerald-500/30 rounded py-0.5 px-1">
                        ✓ इस खबर का ग्राफिक बनाया जा चुका है
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {isPostRestricted(post) ? (
                        <button
                          type="button"
                          disabled={isUnlockingPostId === post.id}
                          onClick={() => handleUnlockNewsPost(post)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                          <span>{isUnlockingPostId === post.id ? 'अनलॉक हो रहा है...' : `${post.coinCost} कॉइन में इस खबर से ग्राफिक बनाएँ`}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenStudioSafe(post)}
                          className={`flex-1 py-2 px-3 ${
                            isNewsGraphicCreated(currentUser?.email, post.id)
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
                          } font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                          <span>
                            {isNewsGraphicCreated(currentUser?.email, post.id)
                              ? `ग्राफिक्स फिर से बनाएँ${dailyQuotaStatus && !dailyQuotaStatus.unlimited && !canModerate ? ` · शेष ${dailyQuotaStatus.remainingToday}` : ''}`
                              : `खबर से ग्राफिक बनाएं${dailyQuotaStatus && !dailyQuotaStatus.unlimited && !canModerate ? ` · शेष ${dailyQuotaStatus.remainingToday}` : ''}`}
                          </span>
                        </button>
                      )}

                      {/* Admin: 'वेबसाइट पर जाएँ' moved to position previously occupied by 'पूरी खबर पढ़ें' */}
                      {canModerate && (
                        post.sourceUrl ? (
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition-colors font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                            title="मूल वेबसाइट पर खबर देखें"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>वेबसाइट पर जाएँ</span>
                          </a>
                        ) : (
                          <span
                            className="py-2 px-2.5 rounded-xl bg-slate-800/50 text-slate-500 border border-slate-800 font-bold text-xs flex items-center justify-center gap-1 shrink-0 cursor-not-allowed"
                            title="वेबसाइट लिंक उपलब्ध नहीं है"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>वेबसाइट</span>
                          </span>
                        )
                      )}

                      {/* Ordinary User: Prominent, clearly visible 'रिपोर्ट करें' button with icon and readable label */}
                      {!canModerate && (
                        <button
                          type="button"
                          onClick={() => setReportingPost(post)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/90 dark:hover:bg-rose-950/80 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/80 transition-colors font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                          title="इस खबर की रिपोर्ट करें"
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>रिपोर्ट करें</span>
                        </button>
                      )}
                    </div>

                    {/* Social Media Story Section (Part H: UI Only, Full Width) */}
                    <div className="w-full mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20" title="Facebook Story">
                          <FacebookIcon />
                        </span>
                        <span className="p-1 rounded-md bg-pink-500/10 border border-pink-500/20" title="Instagram Story">
                          <InstagramIcon />
                        </span>
                        <span className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20" title="WhatsApp Status">
                          <WhatsAppIcon />
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-1 px-2 bg-slate-200/70 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-not-allowed opacity-90"
                        title="सोशल मीडिया स्टोरी बनाएँ (शीघ्र आ रहा है)"
                      >
                        <Film className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>सोशल मीडिया स्टोरी बनाएँ</span>
                        <span className="text-[9px] bg-slate-700 text-amber-300 px-1 py-0.2 rounded">शीघ्र</span>
                      </button>
                    </div>

                    {/* Administrator-only controls: Arranged in two neat rows of three below Social Media Story action */}
                    {canModerate && (
                      <div className="w-full mt-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        {/* First Row: 3 controls (Source, Highlight, Bonus) */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* 1. Thumbnail Source Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              const cur = post.imageSource || (defaultThumbnailIds.has(post.id) ? 'default' : 'source');
                              let next: 'source' | 'default' | 'manual' = 'source';
                              if (cur === 'source') {
                                next = 'default';
                                toggleDefaultThumbnail(post.id);
                              } else if (cur === 'default') {
                                if (post.manualThumbnailUrl) {
                                  next = 'manual';
                                } else {
                                  setEditingPost({
                                    ...post,
                                    title: decodeHtmlEntities(post.title),
                                    summary: decodeHtmlEntities(post.summary),
                                  });
                                  setEditorialError(null);
                                  setEditorialSuccess(null);
                                  return;
                                }
                              } else {
                                next = 'source';
                              }
                              if (onEditNews) {
                                onEditNews({ ...post, imageSource: next });
                              }
                            }}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer truncate ${
                              post.imageSource === 'manual'
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/60'
                                : (post.imageSource === 'default' || defaultThumbnailIds.has(post.id))
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                            title="थंबनेल स्रोत बदलें (सोर्स / डिफ़ॉल्ट / मैन्युअल)"
                          >
                            <span className="truncate">
                              {post.imageSource === 'manual'
                                ? '📷 मैन्युअल'
                                : (post.imageSource === 'default' || defaultThumbnailIds.has(post.id))
                                ? '📷 डिफ़ॉल्ट'
                                : '📷 सोर्स'}
                            </span>
                          </button>

                          {/* 2. Highlight Button */}
                          <button
                            type="button"
                            onClick={() => onToggleHighlightNews && onToggleHighlightNews(post.id)}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer truncate ${
                              isHighlighted
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700'
                            }`}
                            title="खबर को हाइलाइट करें"
                          >
                            <Star className={`w-3 h-3 shrink-0 ${isHighlighted ? 'fill-slate-950' : 'text-amber-400'}`} />
                            <span className="truncate">{isHighlighted ? 'हाइलाइटेड' : 'हाइलाइट'}</span>
                          </button>

                          {/* 3. Bonus Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onEditNews) {
                                onEditNews({
                                  ...post,
                                  isBonus: !post.isBonus,
                                  rewardCoins: post.rewardCoins || 100,
                                });
                              }
                            }}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer truncate ${
                              post.isBonus
                                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-yellow-700 dark:text-yellow-300 border border-slate-200 dark:border-slate-700'
                            }`}
                            title="बोनस खबर टॉगल करें"
                          >
                            <Coins className={`w-3 h-3 shrink-0 ${post.isBonus ? 'fill-slate-950' : 'text-yellow-400'}`} />
                            <span className="truncate">{post.isBonus ? 'बोनस सक्रिय' : 'बोनस'}</span>
                          </button>
                        </div>

                        {/* Second Row: 3 controls (Coin settings, Edit, Delete) */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* 4. Coin Value Config Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCoinConfigPost(post);
                              setCoinConfigCost(post.coinCost || 50);
                              setCoinConfigPlans(post.restrictedPlans || ['Basic']);
                            }}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer truncate ${
                              post.coinCost && post.coinCost > 0
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                            }`}
                            title="कॉइन वैल्यू और रिस्ट्रिक्टेड प्लान्स कॉन्फ़िगर करें"
                          >
                            <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{post.coinCost && post.coinCost > 0 ? `${post.coinCost} कॉइन` : 'कॉइन सेट'}</span>
                          </button>

                          {/* 5. Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPost({
                                ...post,
                                title: decodeHtmlEntities(post.title),
                                summary: decodeHtmlEntities(post.summary),
                              });
                              setEditorialError(null);
                              setEditorialSuccess(null);
                            }}
                            className="py-1.5 px-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/60 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-200 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer truncate"
                            title="खबर एडिट करें"
                          >
                            <Edit className="w-3 h-3 shrink-0" />
                            <span className="truncate">एडिट</span>
                          </button>

                          {/* 6. Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('क्या आप इस खबर को हटाना चाहते हैं?')) {
                                onDeleteNews && onDeleteNews(post.id);
                              }
                            }}
                            className="py-1.5 px-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer truncate"
                            title="खबर हटाएं"
                          >
                            <Trash2 className="w-3 h-3 shrink-0 text-red-400" />
                            <span className="truncate">हटाएं</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {promoConfig && (
                  <FeaturePromotionCard
                    layoutRatio={promoConfig.layoutRatio}
                    startFeatureIndex={promoConfig.startFeatureIndex}
                    onNavigateToTab={(tab, meta) => {
                      if (onNavigateToTab) onNavigateToTab(tab, meta);
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-8 pb-4 flex items-center justify-center text-[11px] text-slate-500 border-t border-slate-800/60">
          <span>AI News Maker • डिजिटल न्यूज़ स्टूडियो</span>
        </div>
      </div>

      {/* Admin Edit News Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">खबर संपादित करें</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (editingPost) {
                  try {
                    fetch(getApiUrl(`/api/admin/approve-news/${encodeURIComponent(editingPost.id)}`), {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify(editingPost),
                    }).catch(() => {});
                  } catch {}
                  if (onEditNews) {
                    onEditNews(editingPost);
                  }
                }
                setEditingPost(null);
              }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    खबर का मुख्य शीर्षक *
                </label>
                <input
                  type="text"
                  required
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* News Article URL with website navigation button per Part E */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    न्यूज़ आर्टिकल लिंक
                  </label>
                  {editingPost.sourceUrl && (
                    <a
                      href={editingPost.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
                      title="वेबसाइट पर मूल खबर खोलें"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>वेबसाइट पर जाएँ</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/news-article.html"
                  value={editingPost.sourceUrl || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, sourceUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  RSS से आए URL में यदि अतिरिक्त ट्रैकिंग पैरामीटर हों तो उन्हें यहां सही किया जा सकता है।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  संक्षिप्त विवरण
                </label>
                <textarea
                  rows={3}
                  value={editingPost.summary}
                  onChange={(e) => setEditingPost({ ...editingPost, summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    स्रोत / चैनल
                  </label>
                  <input
                    type="text"
                    value={editingPost.sourceChannel}
                    onChange={(e) => setEditingPost({ ...editingPost, sourceChannel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    कैटेगरी
                  </label>
                  <select
                    value={editingPost.category}
                    onChange={(e) => {
                      const catObj = feedCategories.find((c) => c.id === e.target.value);
                      setEditingPost({
                        ...editingPost,
                        category: e.target.value,
                        categoryName: catObj ? catObj.name.replace(/^[^a-zA-Z0-9\u0900-\u097F]+/, '').trim() : editingPost.categoryName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {feedCategories.map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. Image Source & Manual Thumbnail Management (Parts 11, 12, 13) */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">📷 थंबनेल इमेज स्रोत</span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {editingPost.imageSource === 'manual'
                      ? 'मैन्युअल अपलोड'
                      : editingPost.imageSource === 'default'
                      ? 'डिफ़ॉल्ट ग्राफिक'
                      : 'मूल सोर्स इमेज'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPost({ ...editingPost, imageSource: 'source' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      (!editingPost.imageSource || editingPost.imageSource === 'source')
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    सोर्स
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPost({ ...editingPost, imageSource: 'default' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editingPost.imageSource === 'default'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    डिफ़ॉल्ट (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPost({ ...editingPost, imageSource: 'manual' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editingPost.imageSource === 'manual'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    मैन्युअल (Manual)
                  </button>
                </div>

                {/* If Manual is chosen, upload custom thumbnail */}
                {editingPost.imageSource === 'manual' && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-amber-500/50 hover:border-amber-400 rounded-xl cursor-pointer text-xs text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 transition">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{editingPost.manualThumbnailUrl ? 'थंबनेल बदलें' : 'मैन्युअल थंबनेल अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setEditingPost({
                                  ...editingPost,
                                  imageSource: 'manual',
                                  manualThumbnailUrl: String(ev.target.result),
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {editingPost.manualThumbnailUrl && (
                      <div className="relative w-28 h-18 rounded-lg overflow-hidden border border-amber-400/60 shadow">
                        <img src={editingPost.manualThumbnailUrl} alt="Manual thumbnail preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Additional Photos Section (Parts 14, 15 - Maximum 3) */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">📸 अतिरिक्त फ़ोटो (अतिरिक्त 3 फ़ोटो तक)</span>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {(editingPost.additionalPhotos || []).length} / 3 अपलोड
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(editingPost.additionalPhotos || []).map((imgUrl, idx) => (
                    <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                      <img src={imgUrl} alt={`Additional ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingPost.additionalPhotos || []).filter((_, i) => i !== idx);
                          setEditingPost({ ...editingPost, additionalPhotos: updated });
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md opacity-80 hover:opacity-100 transition cursor-pointer"
                        title="फोटो हटाएं"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-bold">
                        फोटो {idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Upload button if less than 3 photos */}
                  {(editingPost.additionalPhotos || []).length < 3 && (
                    <label className="h-20 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/15 transition text-cyan-300">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-bold">+ फोटो जोड़ें</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                const currentList = editingPost.additionalPhotos || [];
                                if (currentList.length < 3) {
                                  setEditingPost({
                                    ...editingPost,
                                    additionalPhotos: [...currentList, String(ev.target.result)],
                                  });
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingPost.breaking}
                    onChange={(e) => setEditingPost({ ...editingPost, breaking: e.target.checked })}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span>ब्रेकिंग न्यूज़</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                  <input
                    type="checkbox"
                    checked={!!editingPost.isExclusive}
                    onChange={(e) => setEditingPost({ ...editingPost, isExclusive: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded"
                  />
                  <span>हाइलाइटेड / एक्सक्लूसिव</span>
                </label>
              </div>

              {/* Bonus News Configuration per Part O */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-300">
                    <input
                      type="checkbox"
                      checked={!!editingPost.isBonus}
                      onChange={(e) => setEditingPost({ ...editingPost, isBonus: e.target.checked, rewardCoins: editingPost.rewardCoins || 100 })}
                      className="w-4 h-4 accent-amber-400 rounded"
                    />
                    <span>🪙 बोनस खबर बनाएं</span>
                  </label>
                  {editingPost.isBonus && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md">सक्रिय</span>
                  )}
                </div>

                {editingPost.isBonus && (
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs text-slate-300 font-bold shrink-0">
                      रिवॉर्ड कॉइन्स (Default: 100):
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={editingPost.rewardCoins || 100}
                      onChange={(e) => setEditingPost({ ...editingPost, rewardCoins: Math.max(1, parseInt(e.target.value) || 100) })}
                      className="w-28 px-2.5 py-1.5 bg-slate-950 border border-amber-500/50 rounded-lg text-amber-300 font-black text-xs focus:border-amber-400 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Coins प्रति स्वीकृत क्लेम</span>
                  </div>
                )}
              </div>

              {/* Editorial Pre-Approval & AI Generation Section */}
              <div className="p-4 bg-slate-950/80 border border-amber-500/40 rounded-xl space-y-3.5 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      संपादकीय प्री-अप्रूवल
                    </span>
                  </div>
                  {editingPost.editorialApproved ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>स्वीकृत ({editingPost.approvedBy || 'Admin'})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingPost({ ...editingPost, editorialApproved: false })}
                        className="text-[10px] text-red-400 hover:text-red-300 underline font-bold cursor-pointer"
                        title="संपादकीय स्वीकृति हटाएं"
                      >
                        स्वीकृति हटाएं
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      अस्वीकृत / नया (AI से तैयार करें)
                    </span>
                  )}
                </div>

                {editorialError && (
                  <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-700 text-red-200 text-xs">
                    {editorialError}
                  </div>
                )}

                {editorialSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs">
                    {editorialSuccess}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingEditorial}
                    onClick={handleGenerateEditorialData}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingEditorial ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        <span>AI से विश्लेषण हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>एआई संपादकीय प्री-अप्रूवल (5 हेडलाइन व 3 कैप्शन)</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isGeneratingEditorial}
                    onClick={handleGenerateEditorialData}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-white" />
                    <span>AI हेडलाइन व कैप्शन तैयार करें</span>
                  </button>
                </div>

                {/* 5 Headline Options Inputs */}
                {editingPost.approvedHeadlines && editingPost.approvedHeadlines.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-black text-yellow-300">
                      5 संतुलित हेडलाइन विकल्प (प्राथमिक हेडलाइन चुनने के लिए रेडियो बटन दबाएं):
                    </label>
                    <div className="space-y-1.5">
                      {editingPost.approvedHeadlines.map((h, hIdx) => {
                        const isSelected = (editingPost.approvedHeadline || editingPost.approvedHeadlines?.[0]) === h;
                        return (
                          <div key={hIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="admin_approved_headline_radio"
                              checked={isSelected}
                              onChange={() => setEditingPost({ ...editingPost, approvedHeadline: h })}
                              className="w-4 h-4 accent-amber-400 cursor-pointer shrink-0"
                              title="इस हेडलाइन को प्राथमिक चुनें"
                            />
                            <span className="text-[11px] font-bold text-amber-400 shrink-0 w-14">
                              विकल्प {hIdx + 1}:
                            </span>
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => {
                                const updated = [...(editingPost.approvedHeadlines || [])];
                                updated[hIdx] = e.target.value;
                                setEditingPost({
                                  ...editingPost,
                                  approvedHeadlines: updated,
                                  approvedHeadline: isSelected ? e.target.value : editingPost.approvedHeadline,
                                });
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3 Caption Textareas (Detailed, Bullets, Short) */}
                {(editingPost.approvedCaptionDetailed || editingPost.approvedCaptionBullets || editingPost.approvedCaptionShort) && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        1. विस्तृत सोशल मीडिया कैप्शन:
                      </label>
                      <textarea
                        rows={3}
                        value={editingPost.approvedCaptionDetailed || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, approvedCaptionDetailed: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        2. मुख्य बुलेट पॉइंट्स कैप्शन:
                      </label>
                      <textarea
                        rows={2}
                        value={editingPost.approvedCaptionBullets || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, approvedCaptionBullets: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        3. संक्षिप्त कैप्शन:
                      </label>
                      <textarea
                        rows={2}
                        value={editingPost.approvedCaptionShort || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, approvedCaptionShort: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {/* Photos & Layout Selection */}
                {editingPost.approvedPhotos && editingPost.approvedPhotos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300">
                        स्वीकृत फोटो ({editingPost.approvedPhotos.length}):
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-400">लेआउट:</label>
                        <select
                          value={editingPost.approvedPhotoLayout || 'single'}
                          onChange={(e) => setEditingPost({ ...editingPost, approvedPhotoLayout: e.target.value as any })}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-300 text-[11px] font-bold focus:outline-hidden"
                        >
                          <option value="single">1 फोटो</option>
                          <option value="two_vertical">2 फोटो (लंबवत)</option>
                          <option value="three_grid">3 फोटो (ग्रिड)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {editingPost.approvedPhotos.map((pUrl, pIdx) => (
                        <div key={pIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                          <img src={pUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 right-0 px-1 bg-black/70 text-[9px] text-amber-400 font-bold">
                            #{pIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              </div>

              {/* Sticky Fixed Action Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 shrink-0 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  रद्द करें
                </button>

                {/* Explicit Admin Pre-Publish Action per Section 1.1 */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingPost) return;
                    try {
                      const headlineList = (editingPost as any).headlineOptions || (editingPost as any).approvedHeadlines || [editingPost.title];
                      const res = await fetch(getApiUrl(`/api/editorial/approved/${encodeURIComponent(editingPost.id)}`), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-email': currentUser?.email || 'admin@ainewsmaker.online',
                        },
                        body: JSON.stringify({
                          title: editingPost.title,
                          headlines: headlineList.slice(0, 5),
                          captionDetailed: editingPost.summary,
                          sourceUrl: editingPost.sourceUrl || '',
                          sourceChannel: editingPost.sourceChannel || '',
                          location: editingPost.location || '',
                          category: editingPost.categoryName || editingPost.category || '',
                          imageUrl: editingPost.imageSource === 'manual' ? (editingPost.manualThumbnailUrl || editingPost.image) : editingPost.image,
                          additionalPhotos: editingPost.additionalPhotos || [],
                          isPrePublished: true,
                        }),
                      });
                      if (res.ok) {
                        alert('✅ यह खबर सफलतापूर्वक "प्री-पब्लिश" कर दी गई है!\nअब सभी यूज़र्स बिना अतिरिक्त AI कॉल के स्वीकृत हेडलाइन से तुरंत ग्राफिक बना सकेंगे।');
                        if (onRefreshLiveNews) onRefreshLiveNews();
                        setEditingPost(null);
                      } else {
                        alert('प्री-पब्लिश करने में विफल रहा।');
                      }
                    } catch (err) {
                      console.error('Pre-publish error:', err);
                      alert('सर्वर से संपर्क नहीं हो सका।');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                  title="इस खबर को 5 स्वीकृत हेडलाइन व फोटो के साथ प्री-पब्लिश करें"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>प्री-पब्लिश करें</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>बदलाव सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Raw News Modal */}
      {isRawNewsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-full sm:max-w-2xl p-4 sm:p-6 shadow-2xl space-y-4 my-2 sm:my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  रॉ न्यूज़ जोड़ें
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRawNewsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Raw Text Input with Auto-Parse */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    रॉ न्यूज़ टेक्स्ट (कच्चा समाचार):
                  </label>
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    title="टेक्स्ट से हेडलाइन व विवरण ऑटो-भरें"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>ऑटो-भरें</span>
                  </button>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="यहाँ कच्चा समाचार टेक्स्ट पेस्ट करें (जैसे व्हाट्सएप संदेश, प्रेस नोट, ग्राउंड रिपोर्ट)..."
                  rows={4}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  हेडलाइन (Headline):
                </label>
                <input
                  type="text"
                  value={rawHeadline}
                  onChange={(e) => setRawHeadline(e.target.value)}
                  placeholder="समाचार की मुख्य हेडलाइन..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  विवरण / मुख्य समाचार (Description):
                </label>
                <textarea
                  value={rawDescription}
                  onChange={(e) => setRawDescription(e.target.value)}
                  placeholder="समाचार का पूर्ण विवरण..."
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Location & Source URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    स्थान / ब्यूरो (Location):
                  </label>
                  <input
                    type="text"
                    value={rawLocation}
                    onChange={(e) => setRawLocation(e.target.value)}
                    placeholder="उदा. नई दिल्ली, मुंबई, जयपुर..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    स्रोत लिंक (Source URL - वैकल्पिक):
                  </label>
                  <input
                    type="url"
                    value={rawSourceUrl}
                    onChange={(e) => setRawSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Photo Uploads: Primary Photo & Additional Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Primary Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    प्राइमरी फोटो (Primary Photo / Thumbnail):
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>{rawImageUrl ? 'फोटो बदलें' : 'मुख्य फोटो चुनें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRawImageUpload}
                      />
                    </label>
                    {rawImageUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={rawImageUrl}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => setRawImageUrl('')}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    अतिरिक्त फोटो (Additional Photo):
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>{rawAdditionalImageUrl ? 'फोटो बदलें' : 'दूसरी फोटो जोड़ें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRawAdditionalImageUpload}
                      />
                    </label>
                    {rawAdditionalImageUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={rawAdditionalImageUrl}
                          alt="Secondary Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => setRawAdditionalImageUrl('')}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  स्थिति (Publishing Status):
                </label>
                <div className="flex items-center gap-3">
                  {(['Draft', 'Pending', 'Published'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                      <input
                        type="radio"
                        name="rawStatus"
                        value={st}
                        checked={rawStatus === st}
                        onChange={() => setRawStatus(st)}
                        className="accent-amber-400"
                      />
                      <span className={st === 'Published' ? 'text-emerald-400' : st === 'Pending' ? 'text-amber-400' : 'text-slate-400'}>
                        {st === 'Published' ? 'सीधे प्रकाशित करें (Published)' : st === 'Pending' ? 'लंबित समीक्षा (Pending)' : 'ड्राफ्ट (Draft)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview Toggle */}
              {rawPreviewMode && (
                <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">लाइव प्रीव्यू</span>
                  {rawImageUrl && (
                    <img src={rawImageUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  )}
                  <h4 className="text-sm font-bold text-white">{rawHeadline || 'हेडलाइन यहाँ दिखेगी'}</h4>
                  <p className="text-xs text-slate-300 line-clamp-3">{rawDescription || rawText || 'विवरण यहाँ दिखेगा'}</p>
                  <div className="text-[10px] text-slate-500 flex gap-2">
                    <span>📍 {rawLocation}</span>
                    <span>•</span>
                    <span>स्थिति: {rawStatus}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRawPreviewMode(!rawPreviewMode)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{rawPreviewMode ? 'प्रीव्यू बंद करें' : 'प्रीव्यू देखें'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRawNewsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSaveRawNews}
                  disabled={rawSaving}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{rawSaving ? 'सहेज रहे हैं...' : rawStatus === 'Published' ? 'होम फ़ीड पर प्रकाशित करें' : 'रॉ न्यूज़ सुरक्षित करें'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Report News Modal (Part M) */}
      {reportingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black text-white">खबर की रिपोर्ट करें</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportingPost(null);
                  setReportFeedback('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
              <span className="font-bold text-amber-300">शीर्षक: </span>
              {reportingPost.title}
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  रिपोर्ट का कारण चुनें:
                </label>
                <div className="space-y-1.5 text-xs">
                  {[
                    'खबर गलत है',
                    'खबर में फोटो गलत है',
                    'अन्य समस्या',
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer text-slate-200 border border-slate-700/60"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={option}
                        checked={reportReason === option}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="accent-rose-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {reportReason === 'अन्य समस्या' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    समस्या का विवरण दर्ज करें <span className="text-rose-400">*</span>:
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="कृपया समस्या का विवरण दें (अनिवार्य)..."
                    rows={3}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {reportFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                  reportFeedback.startsWith('✅') ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                }`}>
                  {reportFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReportingPost(null);
                    setReportFeedback('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{isSubmittingReport ? 'सबमिट हो रहा है...' : 'रिपोर्ट भेजें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonus News Info Popup Modal (Part P) */}
      {bonusIntroPost && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl shadow-amber-500/20 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Coins className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-base font-black text-amber-300">बोनस खबर रिवॉर्ड ऑफर!</h3>
                  <p className="text-[11px] text-slate-400">ग्राफिक बनाएं, शेयर करें और कॉइन्स कमाएं</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('bonus_news_intro_dismissed', 'true');
                  } catch {}
                  setBonusIntroPost(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  चयनित बोनस खबर:
                </span>
                <p className="text-xs font-bold text-white line-clamp-2">
                  {bonusIntroPost.title}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">इनाम राशि:</span>
                  <span className="text-sm font-black text-yellow-400 flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {bonusIntroPost.rewardCoins || 100} Coins
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-bold text-amber-300">रिवॉर्ड प्राप्त करने के 3 आसान चरण:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li><strong>ग्राफिक बनाएं:</strong> इस खबर से सुंदर न्यूज़ ग्राफिक तैयार करें और JPG डाउनलोड करें।</li>
                  <li><strong>सोशल मीडिया पर शेयर करें:</strong> अपने Facebook, Instagram या WhatsApp पर पोस्ट करें।</li>
                  <li><strong>स्क्रीनशॉट सबमिट करें:</strong> रिवॉर्ड्स सेक्शन में जाकर पोस्ट का स्क्रीनशॉट अपलोड करें। एडमिन अप्रूवल के बाद {bonusIntroPost.rewardCoins || 100} Coins आपके वॉलेट में जुड़ जाएंगे!</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('bonus_news_intro_dismissed', 'true');
                  } catch {}
                  setBonusIntroPost(null);
                  onOpenStudioWithNews(bonusIntroPost);
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>अभी ग्राफिक बनाएं</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('bonus_news_intro_dismissed', 'true');
                  } catch {}
                  setBonusIntroPost(null);
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                समझ गया
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Remove from Highlights */}
      {confirmRemoveHighlightPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">प्रमुख खबरों (Highlights) से हटाएं</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRemoveHighlightPost(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              क्या आप वाकई इस खबर को विशेष नोटिफिकेशन बोर्ड (प्रमुख खबरें) से हटाना चाहते हैं?
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-semibold text-amber-300">
              {confirmRemoveHighlightPost.title}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveHighlightPost(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveHighlight}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                हाँ, हटाएं
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Reward Claim Modal (1 to 3 screenshots) */}
      {bonusClaimPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  बोनस रिवॉर्ड क्लेम करें
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBonusClaimPost(null);
                  setBonusClaimScreenshots([]);
                  setBonusClaimError('');
                  setBonusClaimSuccess('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Bonus Post Summary */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                चयनित बोनस खबर:
              </span>
              <p className="text-xs font-bold text-white line-clamp-2">
                {bonusClaimPost.title}
              </p>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">रिवॉर्ड राशि:</span>
                <span className="font-black text-yellow-400 flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {bonusClaimPost.rewardCoins || 100} Coins
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>📸 स्क्रीनशॉट अपलोड करें (1 से 3 फ़ाइलें अनिवार्य)</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                कम से कम 1 और अधिकतम 3 स्क्रीनशॉट अपलोड करना अनिवार्य है (0 स्क्रीनशॉट की अनुमति नहीं है)। सोशल मीडिया (Facebook, Instagram, WhatsApp, आदि) पर अपनी पोस्ट का स्क्रीनशॉट जोड़ें।
              </p>
            </div>

            {/* Screenshot Grid & Upload Button */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                {bonusClaimScreenshots.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950 group"
                  >
                    <img
                      src={url}
                      alt={`स्क्रीनशॉट ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-bold text-emerald-300">
                      #{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md transition shadow cursor-pointer"
                      title="स्क्रीनशॉट हटाएं"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {bonusClaimScreenshots.length < 3 && (
                  <label className="relative aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-slate-950/60 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition mb-1" />
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">
                      + फोटो जोड़ें
                    </span>
                    <span className="text-[9px] text-slate-500">
                      ({bonusClaimScreenshots.length}/3)
                    </span>
                  </label>
                )}
              </div>

              {bonusClaimScreenshots.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>चयनित स्क्रीनशॉट: <strong className="text-white">{bonusClaimScreenshots.length} / 3</strong></span>
                  <button
                    type="button"
                    onClick={() => setBonusClaimScreenshots([])}
                    className="text-rose-400 hover:text-rose-300 text-[10px] font-bold underline cursor-pointer"
                  >
                    सभी हटाएं
                  </button>
                </div>
              )}
            </div>

            {/* Error & Success Messages */}
            {bonusClaimError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-bold">
                ⚠️ {bonusClaimError}
              </div>
            )}
            {bonusClaimSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold">
                {bonusClaimSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setBonusClaimPost(null);
                  setBonusClaimScreenshots([]);
                  setBonusClaimError('');
                  setBonusClaimSuccess('');
                }}
                disabled={bonusClaimSubmitting}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSubmitBonusClaim}
                disabled={bonusClaimSubmitting || bonusClaimScreenshots.length === 0}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bonusClaimSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>सबमिट हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span>रिवॉर्ड क्लेम सबमिट करें ({bonusClaimScreenshots.length} स्क्रीनशॉट)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Coin Value & Restricted Plans Modal */}
      {coinConfigPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  खबर के लिए कॉइन वैल्यू सेट करें
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCoinConfigPost(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">चयनित खबर:</span>
              <p className="text-xs font-bold text-white line-clamp-2">{coinConfigPost.title}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  आवश्यक कॉइन्स (Coin Value):
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={coinConfigCost}
                  onChange={(e) => setCoinConfigCost(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-bold"
                  placeholder="जैसे: 50 या 100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  0 दर्ज करने पर यह खबर सभी के लिए निःशुल्क रहेगी।
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  किन प्लान्स के यूज़र्स से कॉइन लिए जाएँ (Restricted Plans):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Basic', 'Advance', 'Pro', 'VIP Desk'] as const).map((plan) => {
                    const isChecked = coinConfigPlans.includes(plan);
                    return (
                      <label
                        key={plan}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCoinConfigPlans((prev) => [...prev, plan]);
                            } else {
                              setCoinConfigPlans((prev) => prev.filter((p) => p !== plan));
                            }
                          }}
                          className="accent-amber-500 w-3.5 h-3.5 rounded"
                        />
                        <span>{plan}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  चयनित प्लान के यूज़र्स को ग्राफिक बनाने से पहले कॉइन देने होंगे।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCoinConfigPost(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={coinConfigSaving}
                onClick={handleSaveCoinConfig}
                className="py-2 px-5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>{coinConfigSaving ? 'सेव हो रहा है...' : 'सेव करें'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Download Limit Exhaustion Hindi Modal */}
      {showLimitExhaustedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center relative">
            <button
              type="button"
              onClick={() => setShowLimitExhaustedModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl border border-amber-500/40">
              ⏳
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">
                आज की ग्राफिक डाउनलोड लिमिट समाप्त हो गई है
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                आपने आज के अपने <strong>{downloadStatus?.planTier || 'पैकेज'}</strong> की सभी दैनिक डाउनलोड सीमा ({downloadStatus?.todayCount || 0}/{downloadStatus?.dailyQuota || 0}) पूरी कर ली है। आप बोनस खबरें अभी भी निःशुल्क बना सकते हैं।
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowLimitExhaustedModal(false);
                  setAdminBonusOnly(true);
                  const bonusSection = document.getElementById('bonus-news-section');
                  if (bonusSection) {
                    bonusSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎁</span>
                <span>बोनस खबरें देखें</span>
              </button>

              <button
                type="button"
                disabled={isRequestingLimitIncrease || limitIncreaseRequested}
                onClick={async () => {
                  if (!currentUser?.email) return;
                  try {
                    setIsRequestingLimitIncrease(true);
                    const res = await fetch(getApiUrl('/api/request-limit-increase'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: currentUser.email, requestedLimit: 10 }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setLimitIncreaseRequested(true);
                      alert('लिमिट बढ़ाने का अनुरोध सफलतापूर्वक एडमिन को भेज दिया गया है!');
                    } else {
                      alert(data.error || 'अनुरोध भेजने में समस्या आई।');
                    }
                  } catch (err: any) {
                    alert(err.message || 'नेटवर्क समस्या।');
                  } finally {
                    setIsRequestingLimitIncrease(false);
                  }
                }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🚀</span>
                <span>{limitIncreaseRequested ? '✓ अनुरोध भेजा गया' : isRequestingLimitIncrease ? 'भेज रहे हैं...' : 'लिमिट बढ़ाने का अनुरोध'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLimitExhaustedModal(false)}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer pt-1"
            >
              बंद करें
            </button>
          </div>
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-400/40 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs font-black transition-all transform hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
          title="शीर्ष पर वापस जाएं"
        >
          <ArrowUp className="w-4 h-4 text-amber-400" />
          <span>ऊपर जाएँ</span>
        </button>
      )}
    </div>
  );
};
