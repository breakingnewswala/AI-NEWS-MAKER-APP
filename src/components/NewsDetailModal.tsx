import React from 'react';
import { Sparkles, X, MapPin, Clock, ExternalLink } from 'lucide-react';
import { NewsFeedPost } from '../data/newsFeedData';

interface NewsDetailModalProps {
  post: NewsFeedPost | null;
  currentUser?: any;
  onClose: () => void;
  onOpenStudio?: (post: NewsFeedPost) => void;
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

function getPostThumbnail(post: NewsFeedPost): string {
  if (post.thumbnail && typeof post.thumbnail === 'string' && post.thumbnail.trim()) {
    return post.thumbnail.trim();
  }
  if (post.image && typeof post.image === 'string' && post.image.trim()) {
    return post.image.trim();
  }
  if (Array.isArray(post.additionalPhotos) && post.additionalPhotos.length > 0 && post.additionalPhotos[0]) {
    return post.additionalPhotos[0];
  }
  return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  post,
  currentUser,
  onClose,
  onOpenStudio,
}) => {
  if (!post) return null;

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
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Image */}
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
          <img
            src={thumbnailUrl}
            alt={headline}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
            }}
          />
        </div>

        {/* Headline */}
        <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
          {headline}
        </h2>

        {/* Reporter / Source metadata */}
        {(post.sourceChannel || post.reporterName) && (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>स्रोत: <strong className="text-slate-200">{post.sourceChannel || post.reporterName}</strong></span>
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 inline-flex"
              >
                <span>मूल स्रोत</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Full Story Description / Content */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
          {cleanDescription || 'इस समाचार के लिए कोई विस्तृत विवरण उपलब्ध नहीं है।'}
        </div>

        {/* Additional Photos Gallery (if available) */}
        {Array.isArray(post.additionalPhotos) && post.additionalPhotos.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">अतिरिक्त तस्वीरें:</span>
            <div className="grid grid-cols-3 gap-2">
              {post.additionalPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950"
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer transition"
          >
            बंद करें
          </button>
          {onOpenStudio && (
            <button
              type="button"
              onClick={() => onOpenStudio(post)}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>इस खबर से ग्राफिक बनाएं</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
