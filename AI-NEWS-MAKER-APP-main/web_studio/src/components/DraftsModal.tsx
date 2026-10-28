import React from 'react';
import { X, Clock, FileText, Trash2, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';
import { SavedDraftRecord, getSavedDrafts, deleteDraft } from '../lib/draftManager';

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreDraft: (draft: SavedDraftRecord) => void;
  currentDraftId?: string;
}

export const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  onRestoreDraft,
  currentDraftId,
}) => {
  const [drafts, setDrafts] = React.useState<SavedDraftRecord[]>(() => getSavedDrafts());
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setDrafts(getSavedDrafts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    const updated = deleteDraft(id);
    setDrafts(updated);
    setSuccessMsg('ड्राफ्ट सफलतापूर्वक हटा दिया गया');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                ड्राफ्ट्स प्रबंधक (Saved Drafts)
              </h3>
              <p className="text-xs text-slate-400">
                सुरक्षित किए गए और ऑटो-ड्राफ्ट प्रोजेक्ट्स की सूची
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast inside modal */}
        {successMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Drafts List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {drafts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-300">कोई सुरक्षित ड्राफ्ट उपलब्ध नहीं है</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                जब आप स्टूडियो में कार्ड बनाते हैं, तो वह स्वतः ड्राफ्ट में सुरक्षित होता है या आप नीचे 'ड्राफ्ट' बटन दबाकर सहेज सकते हैं।
              </p>
            </div>
          ) : (
            drafts.map((draft) => {
              const isCurrent = draft.id === currentDraftId;
              const hasPhoto = Boolean(draft.card.images?.main && draft.card.images.main.trim().length > 0);

              return (
                <div
                  key={draft.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                          {draft.card.frameDesign || '4:5 जैकेट'}
                        </span>
                        {draft.isAutoDraft && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            ऑटो-सेव
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            सक्रिय कार्ड
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                        {draft.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{draft.savedAt}</span>
                        </span>
                        {draft.card.location && (
                          <span className="text-slate-500">• {draft.card.location}</span>
                        )}
                        {hasPhoto && (
                          <span className="text-emerald-400 font-bold">• फोटो संलग्न</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreDraft(draft);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 shadow-sm transition active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>रीस्टोर करें</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(draft.id)}
                        title="ड्राफ्ट हटाएं"
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-amber-300/90 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ड्राफ्ट में सम्पूर्ण एडिटेबल स्थिति सुरक्षित रहती है</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
