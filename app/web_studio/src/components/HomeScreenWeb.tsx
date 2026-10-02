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
  Shield,
  CreditCard,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { LegalPagesModal, LegalPage } from './LegalPagesModal';
import { NewsFeedPost, INITIAL_CATEGORIES } from '../data/newsFeedData';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin } from '../lib/userPlanManager';
import { getActiveRssNewsPosts } from '../lib/rssSourceManager';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingPostId, setSpeakingPostId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Admin moderation states (Active only when authenticated Admin is in Continue as Admin mode)
  const canModerate = isEffectiveAdmin(currentUser);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<NewsFeedPost | null>(null);

  // Legal Pages Modal state
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalInitialPage, setLegalInitialPage] = useState<LegalPage>('terms');

  // Active Admin RSS & Web Link Sources News Integration
  const [activeRssPosts, setActiveRssPosts] = useState<NewsFeedPost[]>(() => getActiveRssNewsPosts());

  useEffect(() => {
    const handleRssUpdate = () => {
      setActiveRssPosts(getActiveRssNewsPosts());
    };
    window.addEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
    return () => window.removeEventListener('ai_news_admin_rss_sources_updated', handleRssUpdate);
  }, []);

  // Merge active RSS/Web posts with database news posts seamlessly
  const combinedPosts = useMemo(() => {
    const existingIds = new Set(posts.map((p) => p.id));
    const newFromRss = activeRssPosts.filter((p) => !existingIds.has(p.id));
    return [...newFromRss, ...posts];
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

  // Filter posts from combined feed (including active RSS/Web sources)
  const filteredPosts = combinedPosts.filter((p) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'breaking') return p.breaking;
    return p.category === selectedCategory || p.categoryName.includes(selectedCategory);
  });

  const breakingPosts = combinedPosts.filter((p) => p.breaking).length > 0
    ? combinedPosts.filter((p) => p.breaking)
    : combinedPosts.slice(0, 6);

  // Identify highlights (exclusive / breaking) for Notification Board Carousel
  const highlightPosts = combinedPosts.filter((p) => p.isExclusive || p.breaking).length > 0
    ? combinedPosts.filter((p) => p.isExclusive || p.breaking).slice(0, 6)
    : combinedPosts.slice(0, 5);

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

  // 2. Highlights Notification Board: Single News visible, auto-changes every 5 seconds
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState<number>(0);
  const [isHighlightHovered, setIsHighlightHovered] = useState<boolean>(false);

  useEffect(() => {
    if (highlightPosts.length <= 1 || isHighlightHovered) return;
    const interval = setInterval(() => {
      setCurrentHighlightIndex((prev) => (prev + 1) % highlightPosts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [highlightPosts.length, isHighlightHovered]);

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
  const currentHighlightPost = highlightPosts[currentHighlightIndex] || highlightPosts[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
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

        {/* 3. Highlights Notification Board (विशेष नोटिफिकेशन बोर्ड - Centered box, 1 news at a time, auto-sliding like mobile app) */}
        {highlightPosts.length > 0 && currentHighlightPost && (
          <div
            onMouseEnter={() => setIsHighlightHovered(true)}
            onMouseLeave={() => setIsHighlightHovered(false)}
            className="w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all"
          >
            {/* Header: Title + Tag + Counter */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide">
                  विशेष सूचना बोर्ड
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white ${
                    currentHighlightPost.isExclusive
                      ? 'bg-amber-600'
                      : currentHighlightPost.breaking
                      ? 'bg-red-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {currentHighlightPost.isExclusive
                    ? 'एक्सक्लूसिव'
                    : currentHighlightPost.breaking
                    ? 'सुपर ब्रेकिंग'
                    : 'खास खबर'}
                </span>

                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  {currentHighlightIndex + 1} / {highlightPosts.length}
                </span>
              </div>
            </div>

            {/* Content: ONE Single News Item with Animated Transition */}
            <div
              key={currentHighlightPost.id}
              className="space-y-2 animate-in fade-in duration-300"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentHighlightPost.publishedTime}</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">
                  {cleanViewerChannel(currentHighlightPost.sourceChannel)}
                </span>
                <span>•</span>
                <span className="text-slate-400 font-medium">
                  {currentHighlightPost.categoryName}
                </span>
              </div>

              <h2
                onClick={() => onOpenStudioWithNews(currentHighlightPost)}
                className="text-base sm:text-xl font-black text-white hover:text-amber-300 cursor-pointer transition-colors leading-snug"
                title="क्लिक करके स्टूडियो में कार्ड बनाएं"
              >
                {cleanViewerHeadline(currentHighlightPost.title)}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                {currentHighlightPost.summary}
              </p>

              {/* Inline Full Content Reader (No modal popup!) */}
              {expandedCardId === `highlight-${currentHighlightPost.id}` && (
                <div className="mt-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line animate-in fade-in duration-200">
                  {currentHighlightPost.fullContent || currentHighlightPost.summary}
                </div>
              )}
            </div>

            {/* Bottom Actions & Pagination Dots */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-800/80">
              {/* Interactive Dots */}
              <div className="flex items-center gap-1.5">
                {highlightPosts.map((hp, idx) => (
                  <button
                    key={hp.id}
                    onClick={() => setCurrentHighlightIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentHighlightIndex
                        ? 'w-6 bg-amber-400 shadow-md shadow-amber-400/30'
                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    title={`खबर ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setExpandedCardId(
                      expandedCardId === `highlight-${currentHighlightPost.id}`
                        ? null
                        : `highlight-${currentHighlightPost.id}`
                    )
                  }
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-300" />
                  <span>
                    {expandedCardId === `highlight-${currentHighlightPost.id}`
                      ? 'संक्षिप्त करें'
                      : 'विवरण पढ़ें'}
                  </span>
                </button>

                <button
                  onClick={() =>
                    handleSpeak(
                      `${currentHighlightPost.title}. ${currentHighlightPost.summary}`,
                      currentHighlightPost.id
                    )
                  }
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border ${
                    isSpeaking && speakingPostId === currentHighlightPost.id
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
                  }`}
                  title="ऑडियो सुनें"
                >
                  {isSpeaking && speakingPostId === currentHighlightPost.id ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleShare(currentHighlightPost)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="शेयर करें"
                >
                  {copiedId === currentHighlightPost.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => onOpenStudioWithNews(currentHighlightPost)}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>खबर से ग्राफिक बनाएं</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {INITIAL_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-105'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {cat.name}
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

                      <div className="flex items-center gap-1">
                        {/* 1. Highlight Button */}
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

                        {/* 2. Edit Button */}
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-600 text-blue-200 text-[10px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                          title="खबर एडिट करें"
                        >
                          <Edit className="w-3 h-3" />
                          <span>एडिट</span>
                        </button>

                        {/* 3. Delete Button */}
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
                        src={post.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop'}
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
                      </div>

                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-slate-300">
                        {post.publishedTime}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="text-xs text-amber-400/90 font-medium">
                        {cleanViewerChannel(post.sourceChannel)}
                      </div>
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

                  <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenStudioWithNews(post)}
                      className="flex-1 py-2 bg-gradient-to-r from-red-600/20 hover:from-red-600/40 to-amber-600/20 border border-red-500/30 hover:border-red-500/60 text-red-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      खबर से ग्राफिक बनाएं
                    </button>

                    <button
                      onClick={() =>
                        setExpandedCardId(expandedCardId === post.id ? null : post.id)
                      }
                      className={`p-2 rounded-xl transition-colors ${
                        expandedCardId === post.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="पूरी खबर पढ़ें (विस्तार)"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleShare(post)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                      title="शेयर करें"
                    >
                      {copiedId === post.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subtle Discreet Admin Login / Footer Note */}
        <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 border-t border-slate-800/60">
          <span>AI News Maker • डिजिटल न्यूज़ स्टूडियो</span>
          {onOpenAdminLogin && (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="text-slate-500 hover:text-amber-400/90 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
              title="एडमिन लॉग इन करें"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Admin Login</span>
            </button>
          )}
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
                      const catObj = INITIAL_CATEGORIES.find((c) => c.id === e.target.value);
                      setEditingPost({
                        ...editingPost,
                        category: e.target.value,
                        categoryName: catObj ? catObj.name.replace(/^[^a-zA-Z0-9\u0900-\u097F]+/, '').trim() : editingPost.categoryName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {INITIAL_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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

      {/* ===== WEBSITE FOOTER (Home Page) ===== */}
      <footer className="mt-12 pb-28 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">

          {/* Legal Pages Preview Cards (Screenshot-style) */}
          <div className="text-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Legal & Policies</h3>
            <p className="text-[11px] text-slate-600 mt-1">ainewsmaker.online — Transparency & Trust</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Terms Card */}
            <button
              type="button"
              onClick={() => { setLegalInitialPage('terms'); setLegalModalOpen(true); }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-blue-950/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* Mini preview lines */}
              <div className="mb-4 space-y-1.5 opacity-40">
                {[100, 80, 95, 70, 85, 60].map((w, i) => (
                  <div key={i} className={`h-1.5 bg-blue-400 rounded-full`} style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-black text-white">Terms & Conditions</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-9 leading-relaxed">
                Usage rules, IP rights, user responsibilities & governing law.
              </p>
              <div className="mt-3 pl-9 flex items-center gap-1 text-[11px] text-blue-400 font-bold group-hover:gap-2 transition-all">
                <span>Read Terms</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>

            {/* Privacy Card */}
            <button
              type="button"
              onClick={() => { setLegalInitialPage('privacy'); setLegalModalOpen(true); }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 via-green-950/30 to-slate-900 border border-slate-800 hover:border-green-500/60 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-green-950/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-4 space-y-1.5 opacity-40">
                {[90, 100, 75, 85, 65, 90].map((w, i) => (
                  <div key={i} className="h-1.5 bg-green-400 rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-green-600/20 border border-green-500/40 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-xs font-black text-white">Privacy Policy</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-9 leading-relaxed">
                Data collection, storage, security & your rights under GDPR & IT Act.
              </p>
              <div className="mt-3 pl-9 flex items-center gap-1 text-[11px] text-green-400 font-bold group-hover:gap-2 transition-all">
                <span>Read Policy</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>

            {/* Payments Card */}
            <button
              type="button"
              onClick={() => { setLegalInitialPage('payments'); setLegalModalOpen(true); }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-amber-950/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-4 space-y-1.5 opacity-40">
                {[85, 70, 100, 80, 90, 75].map((w, i) => (
                  <div key={i} className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xs font-black text-white">Payments & Billing</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-9 leading-relaxed">
                Subscription plans, pricing, refund policy & payment methods.
              </p>
              <div className="mt-3 pl-9 flex items-center gap-1 text-[11px] text-amber-400 font-bold group-hover:gap-2 transition-all">
                <span>View Plans</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          </div>

          {/* Bottom copyright bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-red-500 p-[1.5px] shadow">
                <img src="/assets/ai_news_maker_logo.png" alt="AI News Maker" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
              </div>
              <span className="text-[11px] font-black text-slate-400">AI News Maker</span>
              <span className="text-slate-700">•</span>
              <a href="https://ainewsmaker.online" target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                <Globe className="w-3 h-3" /> ainewsmaker.online
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => { setLegalInitialPage('terms'); setLegalModalOpen(true); }} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                Terms
              </button>
              <span className="text-slate-700">|</span>
              <button type="button" onClick={() => { setLegalInitialPage('privacy'); setLegalModalOpen(true); }} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                Privacy
              </button>
              <span className="text-slate-700">|</span>
              <button type="button" onClick={() => { setLegalInitialPage('payments'); setLegalModalOpen(true); }} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                Payments
              </button>
            </div>
            <p className="text-[11px] text-slate-600">&copy; 2026 Breaking News Wala. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Legal Pages Modal */}
      <LegalPagesModal
        isOpen={legalModalOpen}
        initialPage={legalInitialPage}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};
