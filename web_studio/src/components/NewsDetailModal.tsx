import React, { useState, useEffect } from 'react';
import { Sparkles, X, MapPin, Clock, Heart, Loader2 } from 'lucide-react';
import { NewsFeedPost } from '../data/newsFeedData';
import { cleanNewsDescription, decodeHtmlEntities } from '../lib/newsDescriptionCleaner';

export interface NewsDetailModalProps {
  post: NewsFeedPost | null;
  currentUser?: any;
  onClose: () => void;
  onOpenStudio?: (post: NewsFeedPost) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (postId: string) => void;
  onSetReminder?: (post: NewsFeedPost, minutes: number) => void;
}

function formatDynamicTime(timestamp?: any, publishedTime?: string): string {
  if (publishedTime && typeof publishedTime === 'string' && publishedTime.trim()) {
    return publishedTime.trim();
  }
  if (!timestamp) return 'हाल ही में';
  const t = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(t) || t <= 0) return 'हाल ही में';
  const diffSec = Math.floor((Date.now() - t) / 1000);
  if (diffSec < 60) return 'अभी-अभी';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} मिनट पहले`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} घंटे पहले`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} दिन पहले`;
}

function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function isValidThumbnailUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/assets/')) return false;
  if (
    clean.includes('photo-1585829365295-ab7cd400c167') ||
    clean.includes('placeholder_news_search_16x9') ||
    clean.includes('typewriter') ||
    clean.includes('olympia')
  ) {
    return false;
  }
  return true;
}

function getPostThumbnail(post: NewsFeedPost): string {
  const candidates = [
    post.imageUrl,
    post.manualThumbnailUrl,
    post.thumbnail,
    post.image,
    (post as any).mediaUrl,
    Array.isArray((post as any).approvedPhotos) ? (post as any).approvedPhotos[0] : null,
    Array.isArray(post.additionalPhotos) ? post.additionalPhotos[0] : null,
  ];

  for (const c of candidates) {
    if (isValidThumbnailUrl(c)) {
      return (c as string).trim();
    }
  }
  return '';
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  post,
  currentUser,
  onClose,
  onOpenStudio,
  isFavorite = false,
  onToggleFavorite,
  onSetReminder,
}) => {
  if (!post) return null;

  const [scrapedData, setScrapedData] = useState<{
    content?: string;
    description?: string;
    photos?: string[];
    loading: boolean;
  } | null>(null);
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  useEffect(() => {
    if (post.sourceUrl && /^https?:\/\//i.test(post.sourceUrl)) {
      setScrapedData({ loading: true });
      fetch('/api/scrape-news-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: post.sourceUrl }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && d.success) {
            setScrapedData({
              content: d.content,
              description: d.description,
              photos: d.photos,
              loading: false,
            });
          } else {
            setScrapedData(null);
          }
        })
        .catch(() => setScrapedData(null));
    } else {
      setScrapedData(null);
    }
  }, [post.id, post.sourceUrl]);

  const isAdmin = Boolean(
    currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.role === 'superadmin' ||
        currentUser.email === 'breakingnewswala.com@gmail.com')
  );

  const rawDescription = post.approvedCaptionDetailed || post.summary || post.description || '';
  const cleanDescription = decodeHtmlEntities(rawDescription);
  const headline = decodeHtmlEntities(post.title || 'ताज़ा समाचार');
  const thumbnailUrl = getPostThumbnail(post);
  const timeDisplay = formatDynamicTime(post.timestamp, post.publishedTime);

  const allPhotos = Array.from(
    new Set([...(post.additionalPhotos || []), ...(scrapedData?.photos || [])])
  ).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 text-left my-auto space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {post.categoryName || post.category || 'समाचार'}
            </span>
            {post.location && (
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {post.location}
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeDisplay}
            </span>
            {isAdmin && post.editorialStatus && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-950 text-blue-300 border border-blue-800">
                स्थिति: {post.editorialStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image (Rendered only when genuine news photo exists; rejects typewriter stock photo) */}
        {thumbnailUrl ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
            <img
              src={thumbnailUrl}
              alt={headline}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : null}

        {/* Headline - Preserving complete text, wrapping, line-height */}
        <h2 className="text-lg sm:text-2xl font-black text-white leading-relaxed break-words">
          {headline}
        </h2>

        {/* Full Story Description / Content with Scraper Integration */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
          {scrapedData?.loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>विस्तृत समाचार लेख लोड हो रहा है...</span>
            </div>
          ) : (
            cleanNewsDescription(
              scrapedData?.content ||
              scrapedData?.description ||
              rawDescription
            ) || 'इस समाचार के लिए कोई विस्तृत विवरण उपलब्ध नहीं है।'
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Actions: Close, Favorite, Reminder */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer transition border border-slate-700 active:scale-95"
            >
              बंद करें
            </button>

            {/* Favorite Toggle Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(post.id)}
                className={`px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition border active:scale-95 ${
                  isFavorite
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-rose-400'
                }`}
                title={isFavorite ? 'पसंदीदा से हटाएं' : 'पसंदीदा में जोड़ें'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>पसंदीदा</span>
              </button>
            )}

            {/* Reminder Dropdown Button */}
            {onSetReminder && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReminderMenu((prev) => !prev)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition border active:scale-95 ${
                    showReminderMenu
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-amber-300'
                  }`}
                  title="ग्राफिक बनाने के लिए रिमाइंडर सेट करें"
                >
                  <Clock className="w-4 h-4" />
                  <span>रिमाइंडर</span>
                </button>

                {showReminderMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-44 bg-slate-950 border border-amber-500/40 rounded-xl shadow-2xl py-1 z-30 font-sans text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-amber-400 border-b border-slate-800">
                      रिमाइंडर समय:
                    </div>
                    {[5, 10, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          onSetReminder(post, mins);
                          setShowReminderMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-amber-300 transition flex items-center justify-between"
                      >
                        <span>{mins} मिनट बाद</span>
                        <span className="text-[10px] text-amber-400">⏰</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action: Primary CTA */}
          {onOpenStudio && (
            <button
              type="button"
              onClick={() => onOpenStudio(post)}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ इस खबर से ग्राफिक बनाएं</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
