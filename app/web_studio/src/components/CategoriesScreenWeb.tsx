import React, { useState } from 'react';
import {
  LayoutGrid,
  Filter,
  Sparkles,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Newspaper,
  Film,
  ExternalLink,
} from 'lucide-react';
import { NewsFeedPost, VideoFeedItem } from '../data/newsFeedData';
import { EPaperScreenWeb } from './EPaperScreenWeb';
import { VideosScreenWeb } from './VideosScreenWeb';

interface CategoriesScreenWebProps {
  posts: NewsFeedPost[];
  videos: VideoFeedItem[];
  onOpenStudioWithNews: (post: NewsFeedPost) => void;
  onOpenStudioWithVideo?: (video: VideoFeedItem) => void;
  onOpenStudioWithEPaper?: (edition: any) => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'सभी श्रेणियां', icon: '🌐' },
  { id: 'accident', label: 'हादसा व दुर्घटना', icon: '🚨' },
  { id: 'admin', label: 'प्रशासन व आदेश', icon: '🏛️' },
  { id: 'politics', label: 'राजनीति व चुनाव', icon: '🗳️' },
  { id: 'development', label: 'विकास व योजनाएं', icon: '🏗️' },
  { id: 'crime', label: 'अपराध व पुलिस', icon: '⚖️' },
  { id: 'movement', label: 'जनआंदोलन व मांगें', icon: '📢' },
  { id: 'epaper', label: 'दैनिक ई-पेपर', icon: '📰' },
  { id: 'videos', label: 'वीडियो बुलेटिन', icon: '🎬' },
];

export const CategoriesScreenWeb: React.FC<CategoriesScreenWebProps> = ({
  posts,
  videos,
  onOpenStudioWithNews,
  onOpenStudioWithVideo,
  onOpenStudioWithEPaper,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle special views: EPaper or Videos
  if (activeTab === 'epaper') {
    return (
      <div className="w-full">
        {/* Category Header Switcher */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
          <CategoryPillSwitcher activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
        <EPaperScreenWeb onOpenStudioWithEPaper={onOpenStudioWithEPaper || (() => {})} />
      </div>
    );
  }

  if (activeTab === 'videos') {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
          <CategoryPillSwitcher activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
        <VideosScreenWeb
          videos={videos}
          onOpenStudioWithVideo={onOpenStudioWithVideo || (() => {})}
        />
      </div>
    );
  }

  // Filter posts based on category and search query
  const filteredPosts = posts.filter((post) => {
    // Category match
    if (activeTab === 'accident' && !/(हादसा|दुर्घटना|टक्कर|पलट)/i.test(post.category + post.title + post.summary)) return false;
    if (activeTab === 'admin' && !/(प्रशासन|आदेश|कलेक्टर|कार्रवाई|नगर निगम|राजस्व)/i.test(post.category + post.title + post.summary)) return false;
    if (activeTab === 'politics' && !/(राजनीति|चुनाव|बीजेपी|कांग्रेस|नेता|मंत्री|विधानसभा)/i.test(post.category + post.title + post.summary)) return false;
    if (activeTab === 'development' && !/(विकास|योजना|सड़क|पुल|स्वीकृति|अनुदान|भूमिपूजन)/i.test(post.category + post.title + post.summary)) return false;
    if (activeTab === 'crime' && !/(अपराध|क्राइम|गिरफ्तार|पुलिस|हत्या|चोरी|वारदात)/i.test(post.category + post.title + post.summary)) return false;
    if (activeTab === 'movement' && !/(आंदोलन|धरना|ज्ञापन|विरोध|मांग|प्रदर्शन)/i.test(post.category + post.title + post.summary)) return false;

    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        (post.location && post.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24 text-slate-100">
      {/* Category Pills Switcher */}
      <div className="mb-5">
        <CategoryPillSwitcher activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>

      {/* Search Bar & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="इस श्रेणी में समाचार खोजें..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>
            उपलब्ध समाचार: <strong className="text-white">{filteredPosts.length}</strong>
          </span>
        </div>
      </div>

      {/* News Cards Grid */}
      {filteredPosts.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">इस श्रेणी में कोई खबर नहीं मिली</h3>
          <p className="text-xs text-slate-400">कृपया दूसरी श्रेणी चुनें या सर्च क्वेरी बदलें।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-900/85 hover:bg-slate-850/95 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between group"
            >
              <div>
                {/* Image */}
                {post.imageUrl && (
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-slate-950 border border-slate-800 relative">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-bold rounded shadow">
                        {post.categoryName || post.category || 'ताज़ा'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Meta details */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{post.location || post.district || 'मध्य प्रदेश'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{post.publishedTime}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-2 leading-snug">
                  {post.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {post.summary}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onOpenStudioWithNews(post)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-red-950/40 transition active:scale-95 cursor-pointer mt-auto"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>इस खबर से न्यूज़ कार्ड बनाएं</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Sub-component: Category Horizontal Scrollable Pill Switcher
const CategoryPillSwitcher: React.FC<{
  activeTab: string;
  onSelectTab: (id: string) => void;
}> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {CATEGORY_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 shadow-md shadow-red-950/50 scale-102 font-black'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
