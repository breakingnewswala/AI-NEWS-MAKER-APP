import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  FileEdit,
  Download,
  Search,
  Clock,
  MapPin,
  Tag,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { NewsDraft } from '../types';
import { getSavedDrafts, deleteDraft } from '../lib/draftsManager';

interface DraftsScreenWebProps {
  onOpenStudioWithDraft: (draft: NewsDraft) => void;
  onOpenExportWithDraft: (draft: NewsDraft) => void;
  onNavigateToGenerator: () => void;
}

export const DraftsScreenWeb: React.FC<DraftsScreenWebProps> = ({
  onOpenStudioWithDraft,
  onOpenExportWithDraft,
  onNavigateToGenerator,
}) => {
  const [drafts, setDrafts] = useState<NewsDraft[]>(() => getSavedDrafts());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setDrafts(getSavedDrafts());
    };
    window.addEventListener('ai_news_drafts_updated', handleUpdate);
    return () => window.removeEventListener('ai_news_drafts_updated', handleUpdate);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप वाकई इस ड्राफ्ट को हटाना चाहते हैं?')) {
      deleteDraft(id);
      setDrafts(getSavedDrafts());
    }
  };

  const handleCopyScript = (script: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
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
    if (mins < 1) return 'अभी-अभी';
    if (mins < 60) return `${mins} मिनट पहले`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} घंटे पहले`;
    const days = Math.floor(hours / 24);
    return `${days} दिन पहले`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24 text-slate-100">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
              ड्राफ्ट्स व सहेजे गए प्रोजेक्ट्स
            </h1>
            <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-xs font-bold rounded-full border border-slate-700">
              {drafts.length} ड्राफ्ट
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            अपने सभी ड्राफ्ट्स, एंकर स्क्रिप्ट और अधूरी खबरों को कभी भी दोबारा जनरेटर में खोलें या एक्सपोर्ट करें।
          </p>
        </div>

        <button
          onClick={onNavigateToGenerator}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-red-950/40 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>नया न्यूज़ ड्राफ्ट बनाएं</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="हेडलाइन, स्थान या श्रेणी से ड्राफ्ट खोजें..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            साफ करें
          </button>
        )}
      </div>

      {/* Drafts Grid */}
      {filteredDrafts.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[260px]">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {searchQuery ? 'कोई ड्राफ्ट नहीं मिला' : 'अभी कोई सहेजा गया ड्राफ्ट नहीं है'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {searchQuery
              ? 'कृपया दूसरा शब्द खोजें या फ़िल्टर हटाएँ।'
              : 'न्यूज़ जनरेटर में खबर बनाते समय "ड्राफ्ट में सहेजें" बटन दबाकर आप अपने प्रोजेक्ट को यहाँ सुरक्षित रख सकते हैं।'}
          </p>
          <button
            onClick={onNavigateToGenerator}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>न्यूज़ जनरेटर खोलें</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => onOpenStudioWithDraft(draft)}
              className="bg-slate-900/80 hover:bg-slate-850/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition shadow-lg hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Card Header info */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-red-950/80 text-red-300 text-[10px] font-bold rounded border border-red-800/60">
                      {draft.category || 'ताज़ा'}
                    </span>
                    {draft.location && (
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{draft.location}</span>
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(draft.updatedAt || draft.createdAt)}</span>
                  </span>
                </div>

                {/* Thumbnail Preview if present */}
                {draft.thumbnailUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-950 border border-slate-800 relative">
                    <img
                      src={draft.thumbnailUrl}
                      alt={draft.headline}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  </div>
                )}

                {/* Headline */}
                <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-2 leading-snug">
                  {draft.headline}
                </h3>

                {/* Summary / Description */}
                {draft.summary && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {draft.summary}
                  </p>
                )}

                {/* Anchor Script Section if present */}
                {draft.anchorScript && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 mb-3 text-[11px] text-slate-300 relative group/script">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 mb-1">
                      <span>🎙️ एंकर स्क्रिप्ट</span>
                      <button
                        onClick={(e) => handleCopyScript(draft.anchorScript!, draft.id, e)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[9px] flex items-center gap-1 transition"
                      >
                        {copiedScriptId === draft.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-green-400" />
                            <span className="text-green-400">कॉपी हुआ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>कॉपी</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="line-clamp-2 italic text-slate-400">"{draft.anchorScript}"</p>
                  </div>
                )}
              </div>

              {/* Card Actions Bottom Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2 mt-auto">
                <button
                  onClick={() => onOpenStudioWithDraft(draft)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>जनरेटर में खोलें</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExportWithDraft(draft);
                  }}
                  title="एक्सपोर्ट व डाउनलोड"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">एक्सपोर्ट</span>
                </button>

                <button
                  onClick={(e) => handleDelete(draft.id, e)}
                  title="ड्राफ्ट हटाएं"
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
