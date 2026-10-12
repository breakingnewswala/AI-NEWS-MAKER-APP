import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
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
} from 'lucide-react';
import { NewsFeedPost } from '../data/newsFeedData';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin } from '../lib/userPlanManager';
import {
  getActiveRssNewsPosts,
  getSavedNewsChannels,
  getApprovedRssIds,
  approveRssPost,
  isRssPostApproved,
} from '../lib/rssSourceManager';
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

// Strip technical source tags (RSS, Web, RSS Feed, Web Source) universally from Home Feed
export function cleanViewerHeadline(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
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
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customDateFilter, setCustomDateFilter] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingPostId, setSpeakingPostId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Admin moderation states (Active only when authenticated Admin is in Continue as Admin mode)
  const canModerate = isEffectiveAdmin(currentUser);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<NewsFeedPost | null>(null);

  // Dynamic Unified Categories (Single Source of Truth from CategoryManager)
  const [feedCategories, setFeedCategories] = useState<CategoryItem[]>(() => getActiveCategories());

  // Admin Date, Channel & Pending News Filter State (Visible to Admin/SuperAdmin)
  const [adminFilterDate, setAdminFilterDate] = useState<string>('');
  const [adminFilterChannel, setAdminFilterChannel] = useState<string>('');
  const [adminPendingOnly, setAdminPendingOnly] = useState<boolean>(false);
  const [approvedRssIds, setApprovedRssIds] = useState<Set<string>>(() => getApprovedRssIds());
  const [savedChannels, setSavedChannels] = useState<string[]>(() => getSavedNewsChannels());

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
    const handleRssUpdate = () => {
      setActiveRssPosts(getActiveRssNewsPosts());
      setApprovedRssIds(getApprovedRssIds());
    };
    const handleFeedRefresh = () => {
      if (onRefreshLiveNews) onRefreshLiveNews();
      setApprovedRssIds(getApprovedRssIds());
    };
    const handleCategoriesUpdate = () => {
      setFeedCategories(getActiveCategories());
    };
    const handleChannelsUpdate = () => {
      setSavedChannels(getSavedNewsChannels());
    };
    const handleApprovedUpdate = () => {
      setApprovedRssIds(getApprovedRssIds());
    };

    window.addEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
    window.addEventListener('ai_news_feed_refresh_needed', handleFeedRefresh);
    window.addEventListener('ai_news_unified_categories_updated', handleCategoriesUpdate);
    window.addEventListener('ai_news_categories_updated', handleCategoriesUpdate);
    window.addEventListener('ai_news_channels_updated', handleChannelsUpdate);
    window.addEventListener('ai_news_approved_rss_updated', handleApprovedUpdate);

    return () => {
      window.removeEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
      window.removeEventListener('ai_news_feed_refresh_needed', handleFeedRefresh);
      window.removeEventListener('ai_news_unified_categories_updated', handleCategoriesUpdate);
      window.removeEventListener('ai_news_categories_updated', handleCategoriesUpdate);
      window.removeEventListener('ai_news_channels_updated', handleChannelsUpdate);
      window.removeEventListener('ai_news_approved_rss_updated', handleApprovedUpdate);
    };
  }, [onRefreshLiveNews]);

  // Merge active RSS/Web posts with database news posts seamlessly
  const getDeletedIds = (): Set<string> => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('app_deleted_news_ids_v1') : null;
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  };

  // Merge active RSS/Web posts with database news posts seamlessly & shuffle/interleave across categories
  const combinedPosts = useMemo(() => {
    const deletedIds = getDeletedIds();
    const existingIds = new Set(posts.map((p) => p.id));
    const newFromRss = activeRssPosts.filter((p) => !existingIds.has(p.id) && !deletedIds.has(p.id));
    const validPosts = posts.filter((p) => !deletedIds.has(p.id));

    const rawList = [...newFromRss, ...validPosts];

    // Interleave / shuffle by category for a balanced, dynamic feed
    const categoryBuckets: Record<string, NewsFeedPost[]> = {};
    for (const item of rawList) {
      const cat = item.category || 'general';
      if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
      categoryBuckets[cat].push(item);
    }

    const shuffled: NewsFeedPost[] = [];
    const keys = Object.keys(categoryBuckets);
    let maxLen = 0;
    for (const k of keys) {
      if (categoryBuckets[k].length > maxLen) maxLen = categoryBuckets[k].length;
    }

    for (let i = 0; i < maxLen; i++) {
      for (const k of keys) {
        if (i < categoryBuckets[k].length) {
          shuffled.push(categoryBuckets[k][i]);
        }
      }
    }

    return shuffled.length > 0 ? shuffled : rawList;
  }, [posts, activeRssPosts]);

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
    return combinedPosts.filter((p) => p.id && p.id.startsWith('rss-') && !isRssPostApproved(p, approvedRssIds)).length;
  }, [combinedPosts, approvedRssIds]);

  // Filter posts from combined feed (Admin Date, Channel, Pending News & Dynamic Category Filters)
  const filteredPosts = useMemo(() => {
    return combinedPosts.filter((p) => {
      // 1. Normal users cannot see unapproved RSS items (web- links & regular posts bypass directly)
      if (!canModerate && !isRssPostApproved(p, approvedRssIds)) {
        return false;
      }

      // 2. Admin Pending News Filter: show ONLY unapproved RSS items
      if (canModerate && adminPendingOnly) {
        if (!p.id || !p.id.startsWith('rss-') || isRssPostApproved(p, approvedRssIds)) {
          return false;
        }
      }

      // 3. Admin Date Filter (Strict India Timezone YYYY-MM-DD match)
      if (canModerate && adminFilterDate) {
        const pDate = new Date(p.timestamp || 0);
        let istDateStr = '';
        try {
          istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(pDate);
        } catch {
          istDateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
        }
        if (istDateStr !== adminFilterDate) return false;
      }

      // 4. Admin Channel Filter (Matches sourceChannel)
      if (canModerate && adminFilterChannel) {
        const cleanChan = cleanViewerChannel(p.sourceChannel).toLowerCase();
        const filterChan = adminFilterChannel.toLowerCase();
        if (!cleanChan.includes(filterChan) && !filterChan.includes(cleanChan)) {
          return false;
        }
      }

      // 5. Category Filter
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'breaking') return p.breaking;
      const catObj = feedCategories.find((c) => c.id === selectedCategory);
      const catName = catObj ? catObj.name.replace(/^[^a-zA-Z0-9\u0900-\u097F]+/, '').trim().toLowerCase() : selectedCategory.toLowerCase();
      const postCat = (p.category || '').toLowerCase();
      const postCatName = (p.categoryName || '').toLowerCase();
      return postCat === selectedCategory.toLowerCase() || postCatName.includes(catName) || catName.includes(postCatName);
    });
  }, [combinedPosts, canModerate, adminPendingOnly, adminFilterDate, adminFilterChannel, selectedCategory, feedCategories, approvedRssIds]);

  const breakingPosts = visiblePosts.filter((p) => p.breaking).length > 0
    ? visiblePosts.filter((p) => p.breaking)
    : visiblePosts.slice(0, 6);

  // Identify highlights (exclusive / breaking) for Notification Board Carousel (up to 9 items for multi-item view)
  const highlightPosts = filteredPosts.filter((p) => p.isExclusive || p.breaking).length > 0
    ? filteredPosts.filter((p) => p.isExclusive || p.breaking).slice(0, 9)
    : (filteredPosts.length > 0 ? filteredPosts.slice(0, 9) : visiblePosts.slice(0, 9));

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
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Admin 3-Way Filter Bar: 1. Date, 2. News Channels, 3. Pending News */}
      {canModerate && (
        <div className="sticky top-[56px] sm:top-[64px] z-30 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-6 lg:px-8 py-2.5 shadow-xl">
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  एडमिन फ़िल्टर (1. तारीख • 2. न्यूज़ चैनल • 3. लंबित RSS)
                </span>
                {pendingRssCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {pendingRssCount} लंबित RSS
                  </span>
                )}
              </div>
              {(adminFilterDate || adminFilterChannel || adminPendingOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminFilterDate('');
                    setAdminFilterChannel('');
                    setAdminPendingOnly(false);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>फ़िल्टर हटाएं (Clear)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* 1. Date Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 truncate">
                  📅 1. तारीख चुनें (Date Filter)
                </label>
                <input
                  type="date"
                  value={adminFilterDate}
                  onChange={(e) => setAdminFilterDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                />
              </div>

              {/* 2. Channel Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 truncate">
                  📰 2. चैनल चुनें (Channel Filter)
                </label>
                <select
                  value={adminFilterChannel}
                  onChange={(e) => setAdminFilterChannel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                >
                  <option value="">सभी चैनल (All Channels)</option>
                  {savedChannels.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              {/* 3. Pending News Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 truncate">
                  ⏳ 3. लंबित RSS (Pending News)
                </label>
                <button
                  type="button"
                  onClick={() => setAdminPendingOnly(!adminPendingOnly)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
                    adminPendingOnly
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-850'
                  }`}
                  title="लंबित RSS खबरों को फ़िल्टर करें और स्वीकृत करें"
                >
                  <span className="truncate">लंबित RSS खबरें</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    adminPendingOnly
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {pendingRssCount}
                  </span>
                </button>
              </div>
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
            className="w-full bg-slate-900 border border-red-700/50 rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg hover:border-red-600 transition-colors"
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
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-300 truncate animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:text-white"
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
            className="w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all"
          >
            {/* Header: Title + Tag (Single line, full size) + Navigation (Removed 1 2 3 counter) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide truncate">
                  विशेष नोटिफिकेशन बोर्ड (HIGHLIGHTS)
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
              {visibleHighlightPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 group shadow-md"
                >
                  <div>
                    {/* Media Image Banner: Perfect 16:9 Aspect Ratio thumbnail, no vertical stretching */}
                    <div
                      onClick={() => onOpenStudioWithNews(post)}
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
                      <div className="absolute top-2 right-2">
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

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white">
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-md font-bold text-amber-300 border border-amber-500/30 truncate max-w-[55%] text-[11px]">
                          {post.categoryName}
                        </span>
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-md text-[10px] text-slate-300">
                          {formatDynamicTime(post.timestamp, post.publishedTime)}
                        </span>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{formatDynamicTime(post.timestamp, post.publishedTime)}</span>
                      <span>•</span>
                      <span className="text-amber-300 font-semibold truncate max-w-[40%]">
                        {post.categoryName}
                      </span>
                      {canModerate && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 font-medium truncate max-w-[35%]">
                            [चैनल: {cleanViewerChannel(post.sourceChannel)}]
                          </span>
                          {post.id.startsWith('rss-') && !isRssPostApproved(post, approvedRssIds) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                approveRssPost(post.id);
                                setApprovedRssIds(getApprovedRssIds());
                              }}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer shrink-0 shadow animate-pulse"
                              title="इस RSS खबर को स्वीकृत करें"
                            >
                              <Check className="w-3 h-3" />
                              <span>स्वीकृत करें</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Headline */}
                    <h3
                      onClick={() => onOpenStudioWithNews(post)}
                      className="text-sm sm:text-base font-bold text-white hover:text-amber-300 cursor-pointer transition-colors leading-snug line-clamp-2 mb-1.5"
                      title="क्लिक करके स्टूडियो में कार्ड बनाएं"
                    >
                      {cleanViewerHeadline(post.title)}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
                      {post.summary}
                    </p>

                    {/* Inline Full Content Reader (toggled by 'विवरण पढ़ें / पूरी खबर पढ़ें') */}
                    {expandedCardId === `highlight-${post.id}` && (
                      <div className="mb-2.5 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 leading-relaxed whitespace-pre-line animate-in fade-in duration-200">
                        {post.fullContent || post.summary}
                      </div>
                    )}
                  </div>

                  {/* ONLY 2 Action Buttons (Share and Sound/TTS deleted as requested) */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-slate-800/80 mt-auto">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCardId(
                          expandedCardId === `highlight-${post.id}`
                            ? null
                            : `highlight-${post.id}`
                        )
                      }
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="truncate">
                        {expandedCardId === `highlight-${post.id}`
                          ? 'संक्षिप्त करें'
                          : 'पूरी खबर पढ़ें'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenStudioWithNews(post)}
                      className="flex-1 py-1.5 px-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                      <span>खबर से ग्राफिक बनाएं</span>
                    </button>
                  </div>
                </div>
              ))}
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
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black scale-105'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
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
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black scale-105'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
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
            <h3 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              प्रमुख खबरें एवं अपडेट्स ({filteredPosts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => {
              const isSelected = selectedNewsIds.includes(post.id);
              const isHighlighted = post.isExclusive;
              const catTheme = getCategoryVisualTheme(post.category, post.categoryName);
              const isDefaultThumbActive = defaultThumbnailIds.has(post.id);
              const displayThumbnail = getPostThumbnail(post);

              return (
                <div
                  key={post.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all hover:shadow-xl flex flex-col justify-between group relative ${
                    isHighlighted
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/10'
                      : `${catTheme.cardBorder} hover:shadow-lg`
                  }`}
                >
                  {/* Admin Moderation Bar (Visible strictly to authenticated Admin in Admin Mode) */}
                  {canModerate && (
                    <div className="bg-slate-950/95 border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between gap-2 z-10">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300 hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectNews(post.id)}
                          className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                        />
                        <span>Select</span>
                      </label>

                      <div className="flex items-center gap-1 flex-wrap">
                        {/* 0. RSS Approval Button if pending */}
                        {post.id.startsWith('rss-') && !isRssPostApproved(post, approvedRssIds) && (
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
                            <span>स्वीकृत करें (Approve)</span>
                          </button>
                        )}

                        {/* 1. Thumbnail Source Toggle (Source / Default / Manual) */}
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
                                setEditingPost(post);
                                return;
                              }
                            } else {
                              next = 'source';
                            }
                            if (onEditNews) {
                              onEditNews({ ...post, imageSource: next });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            post.imageSource === 'manual'
                              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/60'
                              : (post.imageSource === 'default' || defaultThumbnailIds.has(post.id))
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                          title="थंबनेल स्रोत बदलें (सोर्स / डिफ़ॉल्ट / मैन्युअल)"
                        >
                          <span>
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
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                            isHighlighted
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                          }`}
                          title="खबर को हाइलाइट करें"
                        >
                          <Star className={`w-3 h-3 ${isHighlighted ? 'fill-slate-950' : 'text-amber-400'}`} />
                          <span>{isHighlighted ? 'हाइलाइटेड' : 'हाइलाइट'}</span>
                        </button>

                        {/* 3. Edit Button */}
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-600 text-blue-200 text-[10px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                          title="खबर एडिट करें"
                        >
                          <Edit className="w-3 h-3" />
                          <span>एडिट</span>
                        </button>

                        {/* 4. Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('क्या आप इस खबर को हटाना चाहते हैं?')) {
                              onDeleteNews && onDeleteNews(post.id);
                            }
                          }}
                          className="px-1.5 py-0.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 text-[10px] font-bold rounded-lg flex items-center gap-0.5 transition cursor-pointer"
                          title="खबर हटाएं"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                      <img
                        src={displayThumbnail}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
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

                        {/* Pending RSS Badge */}
                        {canModerate && post.id.startsWith('rss-') && !isRssPostApproved(post, approvedRssIds) && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                            ⏳ लंबित RSS
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
                      <h4
                        onClick={() => onOpenStudioWithNews(post)}
                        className="text-base font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-3 leading-snug"
                        title="क्लिक करके स्टूडियो में कार्ड बनाएं"
                      >
                        {cleanViewerHeadline(post.title)}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {post.summary}
                      </p>

                      {/* Inline Content Expansion (No popup!) */}
                      {expandedCardId === post.id && (
                        <div className="pt-2 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 whitespace-pre-line animate-in fade-in duration-200">
                          {post.fullContent || post.summary}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dedicated Action Button for Pending RSS in Admin View */}
                  {canModerate && post.id.startsWith('rss-') && !isRssPostApproved(post, approvedRssIds) && (
                    <div className="px-4 pb-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveRssPost(post.id);
                          setApprovedRssIds(getApprovedRssIds());
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        title="इस RSS खबर को स्वीकृत कर होम फ़ीड पर प्रकाशित करें"
                      >
                        <Check className="w-4 h-4 text-white" />
                        <span>स्वीकृत करें व होम फ़ीड पर प्रकाशित करें (Approve)</span>
                      </button>
                    </div>
                  )}

                  <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenStudioWithNews(post)}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600/20 hover:from-red-600/40 to-amber-600/20 border border-red-500/30 hover:border-red-500/60 text-red-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>खबर से ग्राफिक बनाएं</span>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedCardId(expandedCardId === post.id ? null : post.id)
                      }
                      className={`py-2 px-3 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 border ${
                        expandedCardId === post.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                      }`}
                      title="पूरी खबर पढ़ें"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{expandedCardId === post.id ? 'बंद करें' : 'पूरी खबर पढ़ें'}</span>
                    </button>
                  </div>
                </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white">खबर संपादित करें (Edit News)</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onEditNews && editingPost) {
                  onEditNews(editingPost);
                }
                setEditingPost(null);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  खबर का मुख्य शीर्षक (Headline) *
                </label>
                <input
                  type="text"
                  required
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  संक्षिप्त विवरण (Summary)
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
                    स्रोत / चैनल (Channel)
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
                    कैटेगरी (Category)
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
                    {feedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. Image Source & Manual Thumbnail Management (Parts 11, 12, 13) */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">📷 थंबनेल इमेज स्रोत (Thumbnail Source)</span>
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
                    सोर्स (Source)
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
                  <span>ब्रेकिंग न्यूज़ (Breaking)</span>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
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
