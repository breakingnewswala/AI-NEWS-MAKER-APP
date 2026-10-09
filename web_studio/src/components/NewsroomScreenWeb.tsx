import React, { useState, useEffect, useRef } from 'react';
import {
  Newspaper,
  FolderOpen,
  Sparkles,
  Film,
  Trash2,
  FileEdit,
  Clock,
  Search,
  Check,
  Share2,
  MessageSquare,
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  AlertCircle,
  HelpCircle,
  Filter,
  RefreshCw,
  User,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { NewsDraft } from '../types';
import { getSavedDrafts, deleteDraft } from '../lib/draftsManager';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin } from '../lib/userPlanManager';
import {
  SupportInquiry,
  getSupportInquiries,
  fetchRemoteSupportInquiries,
  saveSupportInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from '../lib/supportInboxManager';

interface NewsroomScreenWebProps {
  onOpenStudioWithDraft: (draft: NewsDraft) => void;
  onNavigateToStudio: () => void;
  onNavigateToVideos: () => void;
  onNavigateToControlPanel: () => void;
  currentUser?: ReporterUser | null;
}

export const NewsroomScreenWeb: React.FC<NewsroomScreenWebProps> = ({
  onOpenStudioWithDraft,
  onNavigateToStudio,
  onNavigateToVideos,
  currentUser,
}) => {
  // Navigation & Sub-Tabs: 'drafts' or 'support'
  const [activeTab, setActiveTab] = useState<'drafts' | 'support'>('drafts');

  // Drafts state
  const [drafts, setDrafts] = useState<NewsDraft[]>(() => getSavedDrafts());
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // Support Inbox state
  const [inquiries, setInquiries] = useState<SupportInquiry[]>(() => getSupportInquiries());
  const [supportFilterStatus, setSupportFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const [isRefreshingInquiries, setIsRefreshingInquiries] = useState(false);

  // New Inquiry form state (for user)
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryVoiceTranscript, setInquiryVoiceTranscript] = useState('');
  const [inquiryAttachmentUrl, setInquiryAttachmentUrl] = useState('');
  const [inquiryAttachmentName, setInquiryAttachmentName] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccessAlert, setInquirySuccessAlert] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Admin reply states
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = isEffectiveAdmin(currentUser);

  // Load and sync drafts & inquiries on mount
  useEffect(() => {
    const handleDraftsUpdate = () => {
      setDrafts(getSavedDrafts());
    };
    const handleInquiriesUpdate = () => {
      setInquiries(getSupportInquiries());
    };

    window.addEventListener('ai_news_drafts_updated', handleDraftsUpdate);
    window.addEventListener('ai_news_support_inquiry_added', handleInquiriesUpdate);
    window.addEventListener('ai_news_support_inquiry_updated', handleInquiriesUpdate);

    // Sync remote support inquiries from Cloud
    const userId = currentUser?.email || currentUser?.username;
    const role = isAdmin ? 'admin' : 'user';
    fetchRemoteSupportInquiries(userId, role).then((remote) => {
      if (Array.isArray(remote)) setInquiries(remote);
    });

    return () => {
      window.removeEventListener('ai_news_drafts_updated', handleDraftsUpdate);
      window.removeEventListener('ai_news_support_inquiry_added', handleInquiriesUpdate);
      window.removeEventListener('ai_news_support_inquiry_updated', handleInquiriesUpdate);
    };
  }, [currentUser, isAdmin]);

  const handleRefreshInquiries = async () => {
    setIsRefreshingInquiries(true);
    const userId = currentUser?.email || currentUser?.username;
    const role = isAdmin ? 'admin' : 'user';
    const remote = await fetchRemoteSupportInquiries(userId, role);
    if (Array.isArray(remote)) setInquiries(remote);
    setIsRefreshingInquiries(false);
  };

  // Draft Actions
  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप वाकई इस न्यूज़ ड्राफ्ट को हटाना चाहते हैं?')) {
      deleteDraft(id);
      setDrafts(getSavedDrafts());
    }
  };

  const handleCopyScript = (script: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const filteredDrafts = drafts.filter((d) => {
    if (!draftSearchQuery) return true;
    const q = draftSearchQuery.toLowerCase();
    return (
      (d.headline && d.headline.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q)) ||
      (d.title && d.title.toLowerCase().includes(q))
    );
  });

  // Speech Recognition Setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('आपके ब्राउज़र में वॉइस-टू-टेक्स्ट सपोर्ट उपलब्ध नहीं है। कृपया गूगल क्रोम का उपयोग करें।');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInquiryVoiceTranscript((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          setInquiryMessage((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Could not start recognition:', e);
      setIsListening(false);
    }
  };

  // Handle Photo/Screenshot Upload
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInquiryAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setInquiryAttachmentUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Submit Support Request
  const handleSubmitSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim() && !inquiryVoiceTranscript.trim() && !inquiryAttachmentUrl) {
      alert('कृपया अपनी समस्या का विवरण, वॉइस मेमो या स्क्रीनशॉट जोड़ें।');
      return;
    }

    setInquirySubmitting(true);
    const userEmail = currentUser?.email || '';
    const userName = currentUser?.name || currentUser?.username || 'यूज़र';
    const userId = currentUser?.email || currentUser?.username || 'user';
    const userMobile = currentUser?.mobileNumber || '';

    saveSupportInquiry({
      userId,
      userName,
      userEmail,
      userMobile,
      message: inquiryMessage.trim(),
      voiceTranscript: inquiryVoiceTranscript.trim() || undefined,
      attachmentUrl: inquiryAttachmentUrl || undefined,
      attachmentName: inquiryAttachmentName || undefined,
    });

    setInquiryMessage('');
    setInquiryVoiceTranscript('');
    setInquiryAttachmentUrl('');
    setInquiryAttachmentName('');
    setInquirySubmitting(false);
    setInquirySuccessAlert(true);
    setTimeout(() => setInquirySuccessAlert(false), 4000);

    // Refresh list
    setTimeout(() => {
      setInquiries(getSupportInquiries());
    }, 200);
  };

  // Admin Reply & Status Update
  const handleAdminUpdateStatus = (inquiryId: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    updateInquiryStatus(inquiryId, newStatus);
    setInquiries(getSupportInquiries());
  };

  const handleAdminSendReply = (inquiryId: string) => {
    const replyText = replyTextMap[inquiryId]?.trim();
    if (!replyText) return;

    setUpdatingId(inquiryId);
    updateInquiryStatus(inquiryId, 'resolved', replyText);
    setInquiries(getSupportInquiries());
    setReplyTextMap((prev) => ({ ...prev, [inquiryId]: '' }));
    setUpdatingId(null);
  };

  const handleDeleteInquiry = (inquiryId: string) => {
    if (window.confirm('क्या आप वाकई इस सपोर्ट टिकट को हटाना चाहते हैं?')) {
      deleteInquiry(inquiryId);
      setInquiries(getSupportInquiries());
    }
  };

  // Inquiries filter
  const filteredInquiries = inquiries.filter((inq) => {
    if (supportFilterStatus !== 'all' && inq.status !== supportFilterStatus) {
      return false;
    }
    if (supportSearchQuery) {
      const q = supportSearchQuery.toLowerCase();
      const matchMsg = inq.message?.toLowerCase().includes(q);
      const matchUser = inq.userName?.toLowerCase().includes(q);
      const matchEmail = inq.userEmail?.toLowerCase().includes(q);
      const matchId = inq.id?.toLowerCase().includes(q);
      if (!matchMsg && !matchUser && !matchEmail && !matchId) return false;
    }
    // Regular users see only their own tickets
    if (!isAdmin) {
      const myEmail = (currentUser?.email || '').toLowerCase().trim();
      const myUser = (currentUser?.username || '').toLowerCase().trim();
      const inqEmail = (inq.userEmail || '').toLowerCase().trim();
      const inqUser = (inq.userId || '').toLowerCase().trim();
      if (myEmail && inqEmail !== myEmail && inqUser !== myUser) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;

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
    <div className="w-full max-w-full lg:max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-24 text-white overflow-x-hidden">
      {/* 1. Header Banner */}
      <div className="w-full bg-gradient-to-r from-red-950/70 via-slate-900 to-amber-950/50 border border-red-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg text-white shrink-0">
            <Newspaper className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-black text-white truncate">
                न्यूज़ रूम (संपादकीय डेस्क)
              </h2>
              <span className="px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-black rounded uppercase animate-pulse shrink-0">
                लाइव
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black rounded shrink-0">
                  एडमिन डेस्क
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-2 sm:line-clamp-1">
              संपादकीय डेस्क, सहेजे गए ड्राफ्ट प्रोजेक्ट्स, सपोर्ट इनबॉक्स व त्वरित प्रोडक्शन हब
            </p>
          </div>
        </div>

        {/* Quick Production Actions */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="px-3.5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
            <span>ग्राफिक स्टूडियो</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToVideos}
            className="px-3.5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Film className="w-4 h-4 text-white shrink-0" />
            <span>वीडियो न्यूज़</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Drafts Workspace VS Support Inbox */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('drafts')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'drafts'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span>ड्राफ्ट्स एवं प्रोजेक्ट्स</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'drafts' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {drafts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'support'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>सपोर्ट इनबॉक्स</span>
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* 3A. TAB 1: Drafts & Saved News Projects */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <FolderOpen className="w-5 h-5 text-amber-400 shrink-0" />
                <span>सहेजे गए ड्राफ्ट्स एवं प्रोजेक्ट्स ({filteredDrafts.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                किसी भी प्रोजेक्ट पर क्लिक करके सीधे ग्राफिक स्टूडियो में एडिट व एक्सपोर्ट करें
              </p>
            </div>

            <div className="relative w-full sm:w-auto sm:min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={draftSearchQuery}
                onChange={(e) => setDraftSearchQuery(e.target.value)}
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
                        {copiedDraftId === draft.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
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
      )}

      {/* 3B. TAB 2: Support & Help Inbox */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          {/* Header Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block font-bold">कुल टिकट (Total)</span>
              <span className="text-xl font-black text-white">{inquiries.length}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-1">
              <span className="text-[11px] text-amber-300 block font-bold">लंबित (Pending)</span>
              <span className="text-xl font-black text-amber-400">{pendingCount}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-blue-500/30 rounded-xl space-y-1">
              <span className="text-[11px] text-blue-300 block font-bold">प्रक्रियाधीन (In Progress)</span>
              <span className="text-xl font-black text-blue-400">
                {inquiries.filter((i) => i.status === 'in_progress').length}
              </span>
            </div>
            <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-1">
              <span className="text-[11px] text-emerald-300 block font-bold">हल किया गया (Resolved)</span>
              <span className="text-xl font-black text-emerald-400">
                {inquiries.filter((i) => i.status === 'resolved').length}
              </span>
            </div>
          </div>

          {/* User Inquiry Form (Always accessible to submit assistance tickets) */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  सहायता या समस्या रिपोर्ट भेजें (Support Inquiry)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                सीधे संपादकीय एवं एडमिन टीम से कनेक्ट हों
              </span>
            </div>

            {inquirySuccessAlert && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>आपकी सहायता रिक्वेस्ट सफलतापूर्वक दर्ज हो गई है! एडमिन द्वारा जल्द रिप्लाई दिया जाएगा।</span>
              </div>
            )}

            <form onSubmit={handleSubmitSupportRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  समस्या या संदेश विवरण (Text Request):
                </label>
                <textarea
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="कृपया अपनी समस्या या पूछताछ का विवरण विस्तार से लिखें..."
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
                />
              </div>

              {/* Voice-to-Text & Attachment Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {/* Voice-to-Text Button */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse shadow-lg'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title="बोलकर टाइप करें"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-amber-400" />}
                    <span>{isListening ? 'सुन रहे हैं... (रोकें)' : 'बोलकर लिखें (वॉइस-टू-टेक्स्ट)'}</span>
                  </button>

                  {/* Photo/Screenshot Attachment Button */}
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    <span>{inquiryAttachmentUrl ? 'फोटो बदली' : 'फोटो/स्क्रीनशॉट जोड़ें'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={inquirySubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50 ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inquirySubmitting ? 'भेज रहे हैं...' : 'सपोर्ट टिकट सबमिट करें'}</span>
                </button>
              </div>

              {/* Attachment Preview thumbnail */}
              {inquiryAttachmentUrl && (
                <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 mt-2">
                  <div className="w-14 h-14 bg-black rounded-lg overflow-hidden border border-slate-700 shrink-0">
                    <img src={inquiryAttachmentUrl} alt="Screenshot" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">{inquiryAttachmentName || 'स्क्रीनशॉट'}</span>
                    <span className="text-[10px] text-slate-400">क्लाउड में सेव होने के लिए तैयार</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInquiryAttachmentUrl('');
                      setInquiryAttachmentName('');
                    }}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Search, Filter & Refresh Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {(['all', 'pending', 'in_progress', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSupportFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    supportFilterStatus === st
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {st === 'all'
                    ? 'सभी टिकट'
                    : st === 'pending'
                    ? 'लंबित'
                    : st === 'in_progress'
                    ? 'प्रक्रियाधीन'
                    : 'हल किया गया'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={supportSearchQuery}
                  onChange={(e) => setSupportSearchQuery(e.target.value)}
                  placeholder="संदेश या यूज़र खोजें..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <button
                type="button"
                onClick={handleRefreshInquiries}
                disabled={isRefreshingInquiries}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition cursor-pointer"
                title="क्लाउड से रिफ्रेश करें"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingInquiries ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Support Tickets List */}
          {filteredInquiries.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">कोई सपोर्ट टिकट नहीं मिला</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAdmin
                  ? 'वर्तमान में कोई लंबित समस्या या हेल्प टिकट नहीं है।'
                  : 'ऊपर दिए गए फॉर्म से अपनी समस्या या प्रश्न सबमिट करें।'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInquiries.map((inq) => {
                const isResolved = inq.status === 'resolved';
                const isInProgress = inq.status === 'in_progress';

                return (
                  <div
                    key={inq.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5 transition"
                  >
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isInProgress
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {inq.status === 'resolved'
                            ? 'हल किया गया'
                            : inq.status === 'in_progress'
                            ? 'प्रक्रियाधीन'
                            : 'लंबित'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          #{inq.id.slice(-6)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          • {formatTime(inq.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span>{inq.userName || 'यूज़र'}</span>
                        </span>
                        {inq.userEmail && (
                          <span className="text-slate-400 text-[11px] hidden sm:inline">
                            ({inq.userEmail})
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInquiry(inq.id)}
                            className="p-1 text-red-400 hover:text-red-300 cursor-pointer ml-1"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inquiry Message */}
                    <div className="space-y-1.5">
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                        {inq.message}
                      </p>

                      {inq.voiceTranscript && inq.voiceTranscript !== inq.message && (
                        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-amber-300 flex items-start gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>वॉइस ट्रांसक्रिप्ट:</strong> {inq.voiceTranscript}</span>
                        </div>
                      )}
                    </div>

                    {/* Attachment preview if any */}
                    {inq.attachmentUrl && (
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3 max-w-sm">
                        <img
                          src={inq.attachmentUrl}
                          alt="Attachment"
                          className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => window.open(inq.attachmentUrl, '_blank')}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block truncate">
                            {inq.attachmentName || 'अटैचमेंट / स्क्रीनशॉट'}
                          </span>
                          <a
                            href={inq.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>फुल साइज़ देखें</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Admin Response Box (Shown if response exists) */}
                    {inq.adminResponse && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>एडमिन रिप्लाई (Official Response):</span>
                        </div>
                        <p className="text-xs text-emerald-100 leading-relaxed pl-5">
                          {inq.adminResponse}
                        </p>
                      </div>
                    )}

                    {/* Admin Moderation Actions (Only for Admin) */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">स्थिति बदलें:</span>
                            <select
                              value={inq.status}
                              onChange={(e) =>
                                handleAdminUpdateStatus(
                                  inq.id,
                                  e.target.value as 'pending' | 'in_progress' | 'resolved'
                                )
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                            >
                              <option value="pending">लंबित (Pending)</option>
                              <option value="in_progress">प्रक्रियाधीन (In Progress)</option>
                              <option value="resolved">हल किया गया (Resolved)</option>
                            </select>
                          </div>
                        </div>

                        {/* Admin quick reply input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={replyTextMap[inq.id] || ''}
                            onChange={(e) =>
                              setReplyTextMap((prev) => ({ ...prev, [inq.id]: e.target.value }))
                            }
                            placeholder="यूज़र को रिप्लाई लिखें व हल करें..."
                            className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdminSendReply(inq.id)}
                            disabled={updatingId === inq.id || !replyTextMap[inq.id]?.trim()}
                            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer disabled:opacity-40 shrink-0"
                          >
                            जवाब भेजें
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
