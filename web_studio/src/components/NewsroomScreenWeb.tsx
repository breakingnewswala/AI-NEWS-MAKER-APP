import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  FolderOpen,
  Sparkles,
  Film,
  Sliders,
  Trash2,
  FileEdit,
  Clock,
  Radio,
  Search,
  Check,
  Share2,
  TrendingUp,
  Megaphone,
} from 'lucide-react';
import { NewsDraft } from '../types';
import { getSavedDrafts, deleteDraft } from '../lib/draftsManager';

interface NewsroomScreenWebProps {
  onOpenStudioWithDraft: (draft: NewsDraft) => void;
  onNavigateToStudio: () => void;
  onNavigateToVideos: () => void;
  onNavigateToControlPanel: () => void;
}

export const NewsroomScreenWeb: React.FC<NewsroomScreenWebProps> = ({
  onOpenStudioWithDraft,
  onNavigateToStudio,
  onNavigateToVideos,
  onNavigateToControlPanel,
}) => {
  const [drafts, setDrafts] = useState<NewsDraft[]>(() => getSavedDrafts());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setDrafts(getSavedDrafts());
    };
    window.addEventListener('ai_news_drafts_updated', handleUpdate);
    return () => window.removeEventListener('ai_news_drafts_updated', handleUpdate);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप वाकई इस न्यूज़ ड्राफ्ट को हटाना चाहते हैं?')) {
      deleteDraft(id);
      setDrafts(getSavedDrafts());
    }
  };

  const handleCopyScript = (script: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDrafts = drafts.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.headline && d.headline.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q)) ||
      (d.title && d.title.toLowerCase().includes(q))
    );
  });

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'अभी';
    if (mins < 60) return `${mins} मिनट पहले`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} घंटे पहले`;
    const days = Math.floor(hours / 24);
    return `${days} दिन पहले`;
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 pb-24 text-white">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-amber-950/40 border border-red-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg text-white shrink-0">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                न्यूज़ रूम (संपादकीय डेस्क)
              </h2>
              <span className="px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-black rounded uppercase animate-pulse">
                लाइव
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              संपादकीय डेस्क, सहेजे गए ड्राफ्ट प्रोजेक्ट्स, ब्रेकिंग अलर्ट्स व त्वरित प्रोडक्शन हब
            </p>
          </div>
        </div>

        {/* Quick Production Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>ग्राफिक स्टूडियो</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToVideos}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Film className="w-4 h-4 text-white" />
            <span>वीडियो न्यूज़</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToControlPanel}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>कंट्रोल पैनल</span>
          </button>
        </div>
      </div>

      {/* 2. Editorial Alert / Live Ticker Strip */}
      <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Megaphone className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <div className="truncate text-xs sm:text-sm">
            <span className="font-black text-amber-400 mr-2">ब्रेकिंग टिकर:</span>
            <span className="text-slate-200 font-medium">
              ताज़ा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल 'AI NEWS MAKER' पर... पल-पल की निष्पक्ष खबरें...
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToStudio}
          className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg shrink-0 cursor-pointer transition active:scale-95"
        >
          टिकर बदलें
        </button>
      </div>

      {/* 3. Drafts & Saved News Projects */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <span>सहेजे गए ड्राफ्ट्स एवं प्रोजेक्ट्स ({filteredDrafts.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              किसी भी प्रोजेक्ट पर क्लिक करके सीधे ग्राफिक स्टूडियो में एडिट व एक्सपोर्ट करें
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="प्रोजेक्ट या हेडलाइन खोजें..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        </div>

        {filteredDrafts.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-300">कोई ड्राफ्ट नहीं मिला</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              होम फ़ीड से "खबर से ग्राफिक बनाएं" या स्टूडियो में "ड्राफ्ट सेव" करके यहां सुरक्षित रखें।
            </p>
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer"
            >
              नया ग्राफिक बनाएं
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => onOpenStudioWithDraft(draft)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-400/60 rounded-2xl p-4 transition-all hover:shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                    <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-bold rounded-md text-[10px]">
                      {draft.category || 'ब्रेकिंग'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTime(draft.timestamp || (draft as any).savedAt || (draft as any).updatedAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {draft.headline || draft.title || 'शीर्षक रहित ड्राफ्ट'}
                  </h4>

                  {draft.cardData?.subHeadline && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {draft.cardData.subHeadline}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenStudioWithDraft(draft)}
                    className="flex-1 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-400/30 flex items-center justify-center gap-1 transition"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>एडिट करें</span>
                  </button>

                  {draft.cardData?.customScript && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyScript(draft.cardData.customScript!, draft.id, e)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="स्क्रिप्ट कॉपी करें"
                    >
                      {copiedId === draft.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(draft.id, e)}
                    className="p-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-400 rounded-lg transition"
                    title="हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
