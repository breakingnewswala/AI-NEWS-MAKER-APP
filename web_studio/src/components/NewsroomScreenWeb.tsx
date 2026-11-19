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
  ExternalLink,
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
  X,
  Eye,
  ChevronDown,
  History,
  PlusCircle,
  CheckCircle2,
  Video,
  Smartphone,
  Download,
  Lock,
  Copy,
  Bookmark,
  FileText,
  Settings,
} from 'lucide-react';
import { InstallPwaModal } from './InstallPwaModal';
import { WhatsAppLiveInbox } from './WhatsAppLiveInbox';
import { VoiceInputButton } from './VoiceInputButton';
import { NewsDraft } from '../types';
import { getSavedDrafts, deleteDraft, saveDraft } from '../lib/draftsManager';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin, unblockUserAuthoritative, getEffectiveUserTier, getUserSubscription } from '../lib/userPlanManager';
import { getAuthHeaders } from '../lib/apiConfig';
import {
  SupportInquiry,
  getSupportInquiries,
  fetchRemoteSupportInquiries,
  saveSupportInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from '../lib/supportInboxManager';

import {
  ProjectHistoryItem,
  getUserProjectHistory,
  deleteProjectHistoryItem,
  clearAllProjectHistory,
  getHistoryRetentionHours,
  setHistoryRetentionHours,
} from '../lib/projectHistoryManager';

export type { ProjectHistoryItem };

export function loadUserProjectHistory(userId?: string | null): ProjectHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const uid = userId || 'anonymous_user';
    const raw = localStorage.getItem(`ai_news_maker_projects_history_v2_${uid}`) || localStorage.getItem('ai_news_maker_projects_history_v1');
    const list: ProjectHistoryItem[] = raw ? JSON.parse(raw) : [];

    // Also include user saved drafts that are not sample defaults
    const drafts = getSavedDrafts().filter((d) => !d.id.startsWith('draft-sample-'));
    const draftItems: ProjectHistoryItem[] = drafts.map((d) => ({
      id: d.id,
      userId: uid,
      title: d.headline || d.title || 'समाचार प्रोजेक्ट',
      type: (d.draftType === 'video' || (d as any).videoData) ? 'video' : 'graphic',
      status: 'draft',
      thumbnailUrl: d.thumbnailUrl || (d.cardData as any)?.photoUrl || (d.cardData as any)?.images?.main,
      createdAt: d.updatedAt || d.createdAt || Date.now(),
      timestamp: d.updatedAt || d.createdAt || Date.now(),
      retentionHours: 48,
      expiresAt: (d.updatedAt || d.createdAt || Date.now()) + 48 * 3600 * 1000,
      data: d,
    }));

    const map = new Map<string, ProjectHistoryItem>();
    list.forEach((p) => map.set(p.id, p));
    draftItems.forEach((d) => {
      if (!map.has(d.id)) {
        map.set(d.id, d);
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));
  } catch {
    return [];
  }
}

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
  // Expandable Accordion sections: whatsapp (Master Admin only), support, history, drafts, epaper
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    whatsapp: boolean;
    support: boolean;
    history: boolean;
    drafts: boolean;
    epaper: boolean;
  }>({
    whatsapp: false,
    support: false,
    history: false,
    drafts: false,
    epaper: false,
  });

  const toggleSection = (section: 'whatsapp' | 'support' | 'history' | 'drafts' | 'epaper') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const handleOpenInbox = () => {
      setExpandedSections((prev) => ({ ...prev, whatsapp: true }));
      setTimeout(() => {
        const el = document.getElementById('section-whatsapp-live-inbox');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    };
    window.addEventListener('open_whatsapp_inbox', handleOpenInbox);
    window.addEventListener('ai_news_open_whatsapp_inbox', handleOpenInbox);
    window.addEventListener('ai_news_open_newsroom_whatsapp_inbox', handleOpenInbox);
    return () => {
      window.removeEventListener('open_whatsapp_inbox', handleOpenInbox);
      window.removeEventListener('ai_news_open_whatsapp_inbox', handleOpenInbox);
      window.removeEventListener('ai_news_open_newsroom_whatsapp_inbox', handleOpenInbox);
    };
  }, []);

  const currentUid = currentUser?.uid || currentUser?.email || currentUser?.username || 'anonymous_user';
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryItem[]>(() => loadUserProjectHistory(currentUid));
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'graphic' | 'video'>('all');
  const [historyRetention, setHistoryRetention] = useState<24 | 48>(() => getHistoryRetentionHours(currentUid));
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);

  // Drafts state
  const [drafts, setDrafts] = useState<NewsDraft[]>(() => getSavedDrafts());
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // Support Inbox state
  const [inquiries, setInquiries] = useState<SupportInquiry[]>(() => getSupportInquiries());
  const [supportFilterStatus, setSupportFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'review_blocked'>('all');
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
  // In-app Full Size Attachment Preview Modal (Prevents browser popup block / Android WebView issues)
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name?: string } | null>(null);

  const isAdmin = isEffectiveAdmin(currentUser);

  // Module 8: Master Admin configurable Play Store URL with fallback
  const [playStoreUrl, setPlayStoreUrl] = useState<string>('https://play.google.com/store/apps/details?id=com.aistudio.ainewsmaker.hzwptx');
  useEffect(() => {
    fetch('/api/branding')
      .then((r) => r.json())
      .then((d) => {
        if (d?.branding?.playStoreUrl) {
          setPlayStoreUrl(d.branding.playStoreUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Module 6: Pro / VIP Access check
  const userTier = getEffectiveUserTier(currentUser);
  const userSub = getUserSubscription();
  const isProOrVip =
    isAdmin ||
    userTier === 'professional' ||
    userTier === 'ultra' ||
    userSub.planName === 'PRO' ||
    userSub.planName === 'VIP DESK' ||
    (currentUser as any)?.plan === 'pro' ||
    (currentUser as any)?.plan === 'vip' ||
    (currentUser as any)?.role === 'admin' ||
    (currentUser as any)?.role === 'superadmin';

  // Module 4: AI Script Maker States & Handlers (Website vs Social Media Modes)
  const [scriptMode, setScriptMode] = useState<'website' | 'social'>('website');
  const [scriptInputType, setScriptInputType] = useState<'प्रेस नोट' | 'रॉ स्क्रिप्ट' | 'अन्य समाचार सामग्री'>('प्रेस नोट');
  const [rawScriptText, setRawScriptText] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<{
    mode: 'website' | 'social';
    headline: string;
    subHeadline?: string;
    fullStory: string;
    socialHeadlines?: string[];
    socialDescription?: string;
    hashtags?: string[];
  } | null>(null);
  const [scriptCopiedField, setScriptCopiedField] = useState<'headline' | 'subheadline' | 'story' | 'all' | 'social_caption' | 'social_hashtags' | 'social_all' | string | null>(null);
  const [scriptSavedDraftSuccess, setScriptSavedDraftSuccess] = useState(false);

  // Module 2: Local Project History Manager Handlers
  const refreshHistory = async () => {
    try {
      const items = await getUserProjectHistory(currentUid);
      const drafts = getSavedDrafts().filter((d) => !d.id.startsWith('draft-sample-'));
      const draftItems: ProjectHistoryItem[] = drafts.map((d) => ({
        id: d.id,
        userId: currentUid,
        title: d.headline || d.title || 'समाचार प्रोजेक्ट',
        type: (d.draftType === 'video' || (d as any).videoData) ? 'video' : 'graphic',
        status: 'draft',
        thumbnailUrl: d.thumbnailUrl || (d.cardData as any)?.photoUrl || (d.cardData as any)?.images?.main,
        createdAt: d.updatedAt || d.createdAt || Date.now(),
        timestamp: d.updatedAt || d.createdAt || Date.now(),
        retentionHours: historyRetention,
        expiresAt: (d.updatedAt || d.createdAt || Date.now()) + historyRetention * 3600 * 1000,
        data: d,
      }));
      const map = new Map<string, ProjectHistoryItem>();
      items.forEach((p) => map.set(p.id, p));
      draftItems.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, d);
      });
      setProjectHistory(Array.from(map.values()).sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0)));
    } catch {
      setProjectHistory(loadUserProjectHistory(currentUid));
    }
  };

  const handleRetentionChange = (hours: 24 | 48) => {
    setHistoryRetentionHours(hours, currentUid);
    setHistoryRetention(hours);
    refreshHistory();
  };

  const handleDeleteHistoryItem = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteProjectHistoryItem(currentUid, itemId);
      deleteDraft(itemId);
      await refreshHistory();
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await clearAllProjectHistory(currentUid);
      setIsClearHistoryModalOpen(false);
      await refreshHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // Module 8: Master Admin Play Store URL Management State
  const [isEditingPlayStoreUrl, setIsEditingPlayStoreUrl] = useState(false);
  const [playStoreInput, setPlayStoreInput] = useState<string>('');
  const [playStoreSaveMsg, setPlayStoreSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSavePlayStoreUrl = async () => {
    const trimmed = playStoreInput.trim();
    if (trimmed && !trimmed.startsWith('https://play.google.com/')) {
      setPlayStoreSaveMsg({
        type: 'error',
        text: 'Google Play Store का मान्य लिंक होना चाहिए (https://play.google.com/...)।',
      });
      return;
    }
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ playStoreUrl: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlayStoreUrl(trimmed);
        setIsEditingPlayStoreUrl(false);
        setPlayStoreSaveMsg({ type: 'success', text: '✅ Google Play Store App Link सुरक्षित हो गया!' });
        setTimeout(() => setPlayStoreSaveMsg(null), 3000);
      } else {
        setPlayStoreSaveMsg({ type: 'error', text: data.error || 'सुरक्षित करने में त्रुटि आई' });
      }
    } catch {
      setPlayStoreSaveMsg({ type: 'error', text: 'सर्वर से संपर्क नहीं हो सका' });
    }
  };

  const handleGenerateScript = async () => {
    if (!rawScriptText.trim() || rawScriptText.trim().length < 5) {
      setScriptError('कृपया उपयुक्त प्रेस नोट या सामग्री दर्ज करें (न्यूनतम 5 अक्षर)।');
      return;
    }
    setScriptError(null);
    setIsGeneratingScript(true);
    try {
      const res = await fetch('/api/newsroom/script-maker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          rawText: rawScriptText,
          inputType: scriptInputType,
          generationMode: scriptMode,
          username: currentUser?.username || currentUser?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setScriptError(data.error || 'न्यूज़ स्टोरी तैयार करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
      } else {
        if (data.generationMode === 'social') {
          setGeneratedScript({
            mode: 'social',
            headline: data.headline || data.socialHeadlines?.[0] || '',
            socialHeadlines: data.socialHeadlines || [],
            socialDescription: data.socialDescription || '',
            hashtags: data.hashtags || [],
            fullStory: data.fullStory || data.socialDescription || '',
          });
        } else {
          setGeneratedScript({
            mode: 'website',
            headline: data.headline || '',
            subHeadline: data.subHeadline || '',
            fullStory: data.fullStory || '',
          });
        }
        setScriptSavedDraftSuccess(false);
      }
    } catch (err: any) {
      setScriptError(err?.message || 'सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleCopyScriptField = (field: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setScriptCopiedField(field);
    setTimeout(() => setScriptCopiedField(null), 2000);
  };

  const handleSaveScriptAsDraft = () => {
    if (!generatedScript) return;
    try {
      const summaryText =
        generatedScript.mode === 'social'
          ? `${generatedScript.socialDescription || ''}\n\n${(generatedScript.hashtags || []).join(' ')}`
          : generatedScript.subHeadline
          ? `${generatedScript.subHeadline}\n\n${generatedScript.fullStory}`
          : generatedScript.fullStory;

      saveDraft(
        {
          templateId: 'graphic_001',
          frameDesign: 'classic_breaking',
          headline: generatedScript.headline,
          formattedHeadline: generatedScript.headline,
          highlightWords: [],
          category: 'संपादकीय',
          location: '',
          date: 'आज की ताज़ा ख़बर',
          summary: summaryText,
          photoUrl: '',
        } as any,
        {
          title: generatedScript.headline,
          anchorScript: generatedScript.fullStory || summaryText,
          tags: generatedScript.hashtags || ['#AIScriptMaker', '#NewsStory', '#AINewsMaker'],
        }
      );
      setDrafts(getSavedDrafts());
      refreshHistory();
      setScriptSavedDraftSuccess(true);
      setTimeout(() => setScriptSavedDraftSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save script as draft:', err);
    }
  };

  // Load and sync drafts & inquiries on mount
  useEffect(() => {
    const handleDraftsUpdate = () => {
      setDrafts(getSavedDrafts());
    };
    const handleInquiriesUpdate = () => {
      setInquiries(getSupportInquiries());
    };
    const handleHistoryUpdate = () => {
      refreshHistory();
    };

    refreshHistory();

    window.addEventListener('ai_news_drafts_updated', handleDraftsUpdate);
    window.addEventListener('ai_news_support_inquiry_added', handleInquiriesUpdate);
    window.addEventListener('ai_news_support_inquiry_updated', handleInquiriesUpdate);
    window.addEventListener('ai_news_project_history_updated', handleHistoryUpdate);

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
      window.removeEventListener('ai_news_project_history_updated', handleHistoryUpdate);
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

  const filteredHistory = projectHistory.filter((p) => {
    if (historyTypeFilter !== 'all' && p.type !== historyTypeFilter) return false;
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q);
    }
    return true;
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
    let resolvedMobile = currentUser?.mobileNumber || '';
    let resolvedEmail = currentUser?.email || '';
    let resolvedName = currentUser?.name || currentUser?.username || 'यूज़र';
    let resolvedUsername = currentUser?.username || '';

    // If mobile is not on currentUser, check stored user profile
    try {
      if (typeof window !== 'undefined') {
        const rawProf = localStorage.getItem('user_channel_profile') || 
                        (resolvedEmail ? localStorage.getItem(`user_profile_${resolvedEmail}`) : null);
        if (rawProf) {
          const parsed = JSON.parse(rawProf);
          if (!resolvedMobile && parsed.mobileNumber) resolvedMobile = parsed.mobileNumber;
          if ((!resolvedName || resolvedName === 'यूज़र') && parsed.fullName) resolvedName = parsed.fullName;
          if (!resolvedUsername && parsed.username) resolvedUsername = parsed.username;
        }
      }
    } catch {}

    const userEmail = resolvedEmail;
    const userName = resolvedName;
    const userId = userEmail || resolvedUsername || 'user';
    const userMobile = resolvedMobile;

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
    if (supportFilterStatus === 'review_blocked') {
      const isReview = inq.reportType === 'review_blocked' || inq.message?.includes('[ब्लॉक समीक्षा अनुरोध');
      if (!isReview) return false;
    } else if (supportFilterStatus !== 'all' && inq.status !== supportFilterStatus) {
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

  const formatTime = (ts?: number) => {
    if (!ts || isNaN(ts)) return 'अभी';
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
    <div className="w-full max-w-full lg:max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-24 text-white transition-colors overflow-x-hidden">
      {/* 1. Header Banner */}
      <div className="w-full bg-gradient-to-r from-red-950/70 via-slate-900 to-amber-950/50 border border-red-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg text-white shrink-0">
            <Newspaper className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-black text-white">
              न्यूज़रूम संपादकीय डेस्क
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              संपादकीय ड्राफ्ट प्रोजेक्ट्स, सहायता केंद्र व ई-पेपर प्रबंधन
            </p>
          </div>
        </div>
      </div>

      {/* Module 6: AI News Script Maker (Press Note to News Story) */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  AI न्यूज़ स्क्रिप्ट मेकर
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  प्रेस नोट से न्यूज़ स्टोरी
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  PRO & VIP DESK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                प्रेस विज्ञप्ति, बयान या कच्ची स्क्रिप्ट से AI द्वारा मुख्य हेडलाइन, सब-हेडलाइन और संपूर्ण न्यूज़ स्टोरी तैयार करें
              </p>
            </div>
          </div>
        </div>

        {!isProOrVip ? (
          /* Locked State for Basic / Free Users */
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h4 className="text-base font-black text-amber-300">
                यह सुविधा Pro और VIP Desk उपयोगकर्ताओं के लिए उपलब्ध है।
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                AI न्यूज़ स्क्रिप्ट मेकर किसी भी प्रेस नोट या रॉ रिपोर्ट को केवल 5 सेकंड में टीवी व सोशल मीडिया के लिए व्यावसायिक हेडलाइन, सब-हेडलाइन और संपूर्ण 3-पैराग्राफ हिंदी न्यूज़ स्टोरी में बदल देता है।
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  toggleSection('support');
                  setTimeout(() => {
                    const el = document.getElementById('new-support-ticket-form');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Pro या VIP में अपग्रेड करें ➔</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unlocked Editor for Pro / VIP / Master Admin */
          <div className="space-y-4">
            {/* Mode Selector Tabs (Website Mode vs Social Media Mode) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setScriptMode('website');
                  if (generatedScript && generatedScript.mode !== 'website') setGeneratedScript(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scriptMode === 'website'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>🌐 वेबसाइट के लिए न्यूज़ स्क्रिप्ट</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScriptMode('social');
                  if (generatedScript && generatedScript.mode !== 'social') setGeneratedScript(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scriptMode === 'social'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>📱 सोशल मीडिया के लिए न्यूज़ स्क्रिप्ट</span>
              </button>
            </div>

            {/* Input Type Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300">सामग्री प्रकार:</span>
              {(['प्रेस नोट', 'रॉ स्क्रिप्ट', 'अन्य समाचार सामग्री'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScriptInputType(type)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scriptInputType === type
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Raw Text Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>
                  {scriptMode === 'social'
                    ? 'प्रेस नोट या सोशल मीडिया पोस्ट हेतु कच्ची खबर दर्ज करें:'
                    : 'प्रेस नोट / रॉ टेक्स्ट / बयान दर्ज करें:'}
                </span>
                <div className="flex items-center gap-2">
                  <VoiceInputButton
                    onTranscript={(spoken) => {
                      setRawScriptText((prev) => (prev ? `${prev.trim()} ${spoken}` : spoken));
                    }}
                    buttonText="माइक से बोलें"
                    size="sm"
                  />
                  <span className="text-[11px] text-slate-500">{rawScriptText.length} वर्ण</span>
                </div>
              </label>
              <textarea
                value={rawScriptText}
                onChange={(e) => setRawScriptText(e.target.value)}
                placeholder={
                  scriptMode === 'social'
                    ? 'यहाँ प्रेस नोट या कच्ची खबर पेस्ट करें... AI सोशल मीडिया के लिए 3-4 आकर्षक हेडलाइंस, कैप्शन और सही हैशटैग्स बनाएगा।'
                    : 'यहाँ प्रेस नोट या अपनी रॉ न्यूज़ स्क्रिप्ट पेस्ट करें...'
                }
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none transition resize-y min-h-[100px]"
              />
            </div>

            {/* Error message */}
            {scriptError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{scriptError}</span>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isGeneratingScript || !rawScriptText.trim()}
                onClick={handleGenerateScript}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                {isGeneratingScript ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI {scriptMode === 'social' ? 'सोशल पोस्ट' : 'स्टोरी'} तैयार कर रहा है...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {scriptMode === 'social'
                        ? 'सोशल मीडिया न्यूज़ स्क्रिप्ट तैयार करें'
                        : 'न्यूज़ स्क्रिप्ट तैयार करें'}
                    </span>
                  </>
                )}
              </button>
              {rawScriptText.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setRawScriptText('');
                    setGeneratedScript(null);
                    setScriptError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  साफ़ करें
                </button>
              )}
            </div>

            {/* Generated Output Sections */}
            {generatedScript && generatedScript.mode === 'social' && (
              /* MODE B: SOCIAL MEDIA OUTPUT */
              <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    तैयार सोशल मीडिया पैकेज (संपादनीय)
                  </h4>
                  <span className="text-[11px] text-slate-400">शीर्षक पर क्लिक करके पसंदीदा हेडलाइन चुनें</span>
                </div>

                {/* 1. Distinct Social Headlines (3-4 Options) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center justify-between">
                    <span>1. सोशल मीडिया हेडलाइंस विकल्प (3-4 आकर्षक ऑप्शंस)</span>
                    <span className="text-[10px] text-slate-400 font-normal">क्लिक करके प्राथमिक शीर्षक चुनें</span>
                  </label>
                  <div className="space-y-2">
                    {(generatedScript.socialHeadlines || [generatedScript.headline]).map((hl, idx) => {
                      const isSelected = generatedScript.headline === hl;
                      return (
                        <div
                          key={idx}
                          onClick={() => setGeneratedScript({ ...generatedScript, headline: hl })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                              isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold leading-snug">{hl}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                चयनित
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyScriptField(`social_hl_${idx}`, hl);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="यह शीर्षक कॉपी करें"
                            >
                              {scriptCopiedField === `social_hl_${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Social Description / Caption */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      2. सोशल मीडिया विवरण / कैप्शन (Caption & Description)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyScriptField('social_caption', generatedScript.socialDescription || '')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'social_caption' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>कैप्शन कॉपी करें</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={generatedScript.socialDescription || ''}
                    onChange={(e) => setGeneratedScript({ ...generatedScript, socialDescription: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-slate-200 focus:outline-none transition resize-y"
                  />
                </div>

                {/* 3. Ordered Hashtags */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      3. हैशटैग सूची (प्रारूप: #यूज़रनेम #विषय #AINewsMaker)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyScriptField('social_hashtags', (generatedScript.hashtags || []).join(' '))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'social_hashtags' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>हैशटैग्स कॉपी करें</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(generatedScript.hashtags || []).map((ht, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          i === 0
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : i === (generatedScript.hashtags || []).length - 1
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-slate-900 text-sky-300 border-slate-800'
                        }`}
                      >
                        {ht}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyScriptField(
                          'social_all',
                          `${generatedScript.headline}\n\n${generatedScript.socialDescription || ''}\n\n${(generatedScript.hashtags || []).join(' ')}`
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'social_all' ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>पूरा सोशल पोस्ट कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-950" />
                          <span>पूरा सोशल पोस्ट कॉपी करें</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScriptAsDraft}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>ड्राफ्ट के रूप में सहेजें</span>
                    </button>
                  </div>

                  {scriptSavedDraftSuccess && (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ड्राफ्ट सफलतापूर्वक सहेजा गया! नीचे ड्राफ्ट्स में देखें।</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generated Output Sections */}
            {generatedScript && generatedScript.mode === 'website' && (
              /* MODE A: WEBSITE MODE OUTPUT */
              <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    तैयार वेबसाइट न्यूज़ पैकेज (संपादनीय)
                  </h4>
                  <span className="text-[11px] text-slate-400">सीधे बॉक्स में एडिट कर सकते हैं</span>
                </div>

                {/* 1. Main Headline */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      1. मुख्य हेडलाइन (Main Headline)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyScriptField('headline', generatedScript.headline)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'headline' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>कॉपी हेडलाइन</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={generatedScript.headline}
                    onChange={(e) => setGeneratedScript({ ...generatedScript, headline: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm sm:text-base font-bold text-white focus:outline-none transition"
                  />
                </div>

                {/* 2. Sub-Headline */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      2. सब-हेडलाइन (Sub-Headline)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyScriptField('subheadline', generatedScript.subHeadline || '')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'subheadline' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>कॉपी सब-हेडलाइन</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={generatedScript.subHeadline || ''}
                    onChange={(e) => setGeneratedScript({ ...generatedScript, subHeadline: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-slate-200 focus:outline-none transition resize-y"
                  />
                </div>

                {/* 3. Full Story */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      3. पूरी न्यूज़ स्टोरी (Full Story, 2-3 पैराग्राफ्स)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyScriptField('story', generatedScript.fullStory)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'story' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>पूरी स्टोरी कॉपी करें</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={generatedScript.fullStory}
                    onChange={(e) => setGeneratedScript({ ...generatedScript, fullStory: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm leading-relaxed text-slate-200 focus:outline-none transition resize-y"
                  />
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyScriptField(
                          'all',
                          `${generatedScript.headline}\n\n${generatedScript.subHeadline ? `${generatedScript.subHeadline}\n\n` : ''}${generatedScript.fullStory}`
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {scriptCopiedField === 'all' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">सभी कॉपी हो गया!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-amber-400" />
                          <span>सभी कॉपी करें</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScriptAsDraft}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>ड्राफ्ट के रूप में सहेजें</span>
                    </button>
                  </div>

                  {scriptSavedDraftSuccess && (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ड्राफ्ट सफलतापूर्वक सहेजा गया! नीचे ड्राफ्ट्स में देखें।</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. The Clean Accordion Sections: WhatsApp Live Inbox (Master Admin) -> Support -> History -> Drafts -> ePaper */}
      <div className="space-y-4">
        {/* Master Admin Only: WhatsApp AI Command Center — Live Inbox */}
        {isAdmin && (
          <div id="section-whatsapp-live-inbox" className="bg-white dark:bg-slate-900/90 border border-emerald-500/40 dark:border-emerald-500/40 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all">
            <button
              type="button"
              onClick={() => toggleSection('whatsapp')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      WhatsApp AI Command Center — Live Inbox
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold hidden sm:inline-block">
                      Master Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    रीयल-टाइम WhatsApp ग्राहक सहायता, AI / ह्यूमन टेकओवर एवं डिलीवरी स्टेटस
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSections.whatsapp ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {expandedSections.whatsapp && (
              <div className="p-2 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-950">
                <WhatsAppLiveInbox currentUser={currentUser} />
              </div>
            )}
          </div>
        )}

        {/* Section 1: Support Inbox (Theme-aware for Light & Dark mode) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('support')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-500 dark:text-blue-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">सपोर्ट इनबॉक्स</h3>
                  {pendingCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse">
                      {pendingCount} पेंडिंग
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">सपोर्ट टिकट, वॉइस नोट्स, पूछताछ एवं समाधान</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSections.support ? 'rotate-180 text-amber-400' : ''}`} />
          </button>

          {expandedSections.support && (
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 animate-in fade-in slide-in-from-top-1 duration-200 space-y-6">
              {/* Header Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block font-bold">कुल टिकट</span>
                  <span className="text-xl font-black text-white">{inquiries.length}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-1">
                  <span className="text-[11px] text-amber-300 block font-bold">लंबित</span>
                  <span className="text-xl font-black text-amber-400">{pendingCount}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-blue-500/30 rounded-xl space-y-1">
                  <span className="text-[11px] text-blue-300 block font-bold">प्रक्रियाधीन</span>
                  <span className="text-xl font-black text-blue-400">
                    {inquiries.filter((i) => i.status === 'in_progress').length}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-[11px] text-emerald-300 block font-bold">हल किया गया</span>
                  <span className="text-xl font-black text-emerald-400">
                    {inquiries.filter((i) => i.status === 'resolved').length}
                  </span>
                </div>
              </div>

              {/* User Inquiry Form (Only for non-admin users to submit assistance tickets; hidden for Admin) */}
              {!isAdmin && (
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
              )}

              {/* Search, Filter & Refresh Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {(['all', 'pending', 'in_progress', 'resolved', 'review_blocked'] as const).map((st) => (
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
                        : st === 'resolved'
                        ? 'हल किया गया'
                        : '🔒 ब्लॉक समीक्षा अनुरोध'}
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
                              inq.status === 'approved_for_unblock' || inq.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : inq.status === 'in_progress'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : inq.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : inq.status === 'closed'
                                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {inq.status === 'approved_for_unblock'
                                ? '🔓 अनब्लॉक स्वीकृत'
                                : inq.status === 'resolved'
                                ? 'हल किया गया'
                                : inq.status === 'in_progress'
                                ? 'प्रक्रियाधीन'
                                : inq.status === 'rejected'
                                ? '❌ अस्वीकृत'
                                : inq.status === 'closed'
                                ? '🔒 बंद'
                                : 'लंबित'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{inq.id.slice(-6)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              • {formatTime(inq.createdAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-black text-white flex items-center gap-1 px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
                              <User className="w-3.5 h-3.5 text-amber-400" />
                              <span>{inq.userName || 'यूज़र'}</span>
                            </span>
                            {inq.userEmail && (
                              <span className="text-amber-300/90 font-mono text-[11px] px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-1">
                                <span>📧 {inq.userEmail}</span>
                              </span>
                            )}
                            {inq.userMobile && (
                              <span className="text-emerald-400 font-mono font-bold text-[11px] px-2 py-0.5 bg-emerald-950/40 rounded-lg border border-emerald-800/40 flex items-center gap-1">
                                <span>📱 {inq.userMobile}</span>
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
                          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3 max-w-sm">
                            <img
                              src={inq.attachmentUrl}
                              alt="Attachment"
                              className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-400 transition"
                              onClick={() => setPreviewAttachment({ url: inq.attachmentUrl!, name: inq.attachmentName })}
                              title="क्लिक करके फ़ुल साइज़ फ़ोटो देखें"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate">
                                {inq.attachmentName || 'अटैचमेंट / स्क्रीनशॉट'}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment({ url: inq.attachmentUrl!, name: inq.attachmentName })}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>फ़ोटो खोलें</span>
                                </button>
                                <a
                                  href={inq.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-slate-300 flex items-center gap-1"
                                  title="नए टैब में खोलें"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Admin Response Box (Shown if response exists) */}
                        {inq.adminResponse && (
                          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                              <Shield className="w-3.5 h-3.5 text-emerald-400" />
                              <span>एडमिन रिप्लाई:</span>
                            </div>
                            <p className="text-xs text-emerald-100 leading-relaxed pl-5">
                              {inq.adminResponse}
                            </p>
                          </div>
                        )}

                        {/* Admin Moderation Actions (Only for Admin) */}
                        {isAdmin && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                            {/* If Block Review Request: Show Dedicated Action Bar */}
                            {(inq.reportType === 'review_blocked' || inq.message?.includes('[ब्लॉक समीक्षा अनुरोध')) && (
                              <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/40 space-y-2">
                                <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                                  <span>🛡️ ब्लॉक खाता समीक्षा कार्रवाइयाँ:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* 1. Unblock Button */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm(`क्या आप उपयोगकर्ता "${inq.userEmail}" का खाता अनब्लॉक करना चाहते हैं?`)) {
                                        try {
                                          const res = await unblockUserAuthoritative(inq.userId || inq.userEmail, currentUser?.email || 'Admin');
                                          if (res.success) {
                                            updateInquiryStatus(inq.id, 'approved_for_unblock', 'अनुरोध स्वीकृत: खाता अनब्लॉक कर दिया गया है।');
                                            setInquiries(getSupportInquiries());
                                            alert('खाता सफलतापूर्वक अनब्लॉक कर दिया गया है!');
                                          } else {
                                            alert(res.error || 'खाता अनब्लॉक करने में त्रुटि');
                                          }
                                        } catch (err: any) {
                                          alert('त्रुटि: ' + err.message);
                                        }
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                  >
                                    <span>🔓 खाता अनब्लॉक करें</span>
                                  </button>

                                  {/* 2. Reject Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reason = window.prompt('अस्वीकार करने का कारण दर्ज करें:', 'नियमों के उल्लंघन की पुष्टि के कारण खाता अनब्लॉक नहीं किया जा सकता।');
                                      if (reason !== null) {
                                        updateInquiryStatus(inq.id, 'rejected', reason.trim() || 'अस्वीकृत');
                                        setInquiries(getSupportInquiries());
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <span>❌ अस्वीकार करें</span>
                                  </button>

                                  {/* 3. Internal Note */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const note = window.prompt('आंतरिक नोट / समाधान दर्ज करें:', inq.adminResponse || '');
                                      if (note !== null) {
                                        updateInquiryStatus(inq.id, inq.status, note.trim());
                                        setInquiries(getSupportInquiries());
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <span>📝 आंतरिक नोट</span>
                                  </button>

                                  {/* 4. Close Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm('क्या आप इस अनुरोध को बंद (Close) करना चाहते हैं?')) {
                                        updateInquiryStatus(inq.id, 'closed');
                                        setInquiries(getSupportInquiries());
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <span>🔒 बंद करें</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400">स्थिति बदलें:</span>
                                <select
                                  value={inq.status}
                                  onChange={(e) =>
                                    handleAdminUpdateStatus(
                                      inq.id,
                                      e.target.value as any
                                    )
                                  }
                                  className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                                >
                                  <option value="pending">लंबित</option>
                                  <option value="in_progress">प्रक्रियाधीन</option>
                                  <option value="resolved">हल किया गया</option>
                                  <option value="approved_for_unblock">अनब्लॉक स्वीकृत</option>
                                  <option value="rejected">अस्वीकृत</option>
                                  <option value="closed">बंद</option>
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

        {/* Section 2: Project History (Theme-aware for Light & Dark mode) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('history')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">प्रोजेक्ट हिस्ट्री</h3>
                  {projectHistory.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                      {projectHistory.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">आपके द्वारा तैयार व एक्सपोर्ट किए गए सभी न्यूज़ ग्राफिक्स एवं वीडियो प्रोजेक्ट्स</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSections.history ? 'rotate-180 text-amber-400' : ''}`} />
          </button>

          {expandedSections.history && (
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-400" />
                    <span>प्रोजेक्ट हिस्ट्री</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      {filteredHistory.length} प्रोजेक्ट्स
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    आपके द्वारा तैयार व एक्सपोर्ट किए गए सभी न्यूज़ ग्राफिक्स एवं वीडियो प्रोजेक्ट्स का रिकॉर्ड
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Retention Selector (24h / 48h Default) */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold text-slate-300">ऑटो-क्लीनअप:</span>
                    <select
                      value={historyRetention}
                      onChange={(e) => handleRetentionChange(Number(e.target.value) as 24 | 48)}
                      className="bg-slate-900 border border-slate-700 text-amber-300 rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value={48}>48 घंटे (डिफ़ॉल्ट)</option>
                      <option value={24}>24 घंटे</option>
                    </select>
                  </div>

                  {/* Clear All History Button */}
                  {projectHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsClearHistoryModalOpen(true)}
                      className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="पूरी प्रोजेक्ट हिस्ट्री साफ़ करें"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>सभी साफ़ करें</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter('all')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                        historyTypeFilter === 'all' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      सभी
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter('graphic')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1 ${
                        historyTypeFilter === 'graphic' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>ग्राफिक्स</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter('video')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1 ${
                        historyTypeFilter === 'video' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3 h-3" />
                      <span>वीडियो</span>
                    </button>
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="प्रोजेक्ट खोजें..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-300">कोई प्रोजेक्ट हिस्ट्री नहीं मिली</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    जब आप ग्राफिक या वीडियो स्टूडियो से प्रोजेक्ट एक्सपोर्ट या तैयार करेंगे, तो उसका वास्तविक रिकॉर्ड यहाँ स्वतः उपलब्ध रहेगा।
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onNavigateToStudio}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow"
                    >
                      🎨 नया ग्राफिक बनाएं
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToVideos}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      🎬 वीडियो स्टूडियो
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-400/60 rounded-2xl p-3.5 transition-all hover:shadow-xl flex flex-col justify-between group space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="relative w-full h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1 bg-slate-900">
                              {item.type === 'video' ? <Video className="w-8 h-8 text-red-400" /> : <ImageIcon className="w-8 h-8 text-amber-400" />}
                              <span className="text-[10px] font-bold">नो थंबनेल</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase backdrop-blur-md ${
                              item.type === 'video' ? 'bg-red-600/90 text-white' : 'bg-amber-500/90 text-slate-950'
                            }`}>
                              {item.type === 'video' ? '🎬 वीडियो' : '📸 ग्राफिक'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-slate-200 backdrop-blur-md">
                              {item.status === 'exported' ? '✓ एक्सपोर्टेड' : item.status === 'generated' ? '⚡ जनरेटेड' : '📝 ड्राफ्ट'}
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-slate-300 backdrop-blur-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatTime(item.createdAt || item.timestamp)}</span>
                          </div>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-850">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.type === 'video') {
                              onNavigateToVideos();
                            } else if (item.data) {
                              onOpenStudioWithDraft(item.data);
                            } else {
                              onNavigateToStudio();
                            }
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/40 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>स्टूडियो में खोलें</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1.5 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 rounded-xl transition cursor-pointer shrink-0"
                          title="प्रोजेक्ट हिस्ट्री से हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmation Modal for Clearing All History */}
              {isClearHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-black text-white">सभी प्रोजेक्ट हिस्ट्री साफ़ करें?</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        यह क्रिया डिवाइस के लोकल डेटाबेस से आपके सभी <strong>{projectHistory.length}</strong> प्रोजेक्ट हिस्ट्री रिकॉर्ड और अस्थायी थंबनेल्स को हटा देगी। आपके मूल ड्राफ्ट्स, सेव की गई फ़ोटो और डाउनलोड्स सुरक्षित रहेंगे।
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsClearHistoryModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-black text-white shadow-lg transition cursor-pointer"
                      >
                        हाँ, सभी साफ़ करें
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Drafts & Projects (Theme-aware for Light & Dark mode) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('drafts')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">ड्राफ्ट्स एवं प्रोजेक्ट्स</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                    {drafts.length}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">सहेजे गए सभी समाचार ड्राफ्ट्स व प्रोडक्शन प्रोजेक्ट्स</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSections.drafts ? 'rotate-180 text-amber-400' : ''}`} />
          </button>

          {expandedSections.drafts && (
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
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
                          <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] flex items-center gap-1 ${
                            draft.draftType === 'video' 
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                              : 'bg-slate-800 text-amber-300'
                          }`}>
                            {draft.draftType === 'video' ? '🎬 वीडियो प्रोजेक्ट' : (draft.category || 'ब्रेकिंग')}
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
                            onClick={(e) => handleCopyScript(draft.cardData?.customScript || '', draft.id, e)}
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
        </div>

        {/* Section 4: ePaper (Theme-aware for Light & Dark mode) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('epaper')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-500 dark:text-purple-400">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">ई-पेपर</h3>
                  <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-black tracking-wider uppercase">
                    COMING SOON
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">दैनिक समाचार पत्र एवं डिजिटल ई-पेपर पब्लिशिंग सिस्टम</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSections.epaper ? 'rotate-180 text-amber-400' : ''}`} />
          </button>
          {expandedSections.epaper && (
            <div className="p-8 border-t border-slate-800 bg-slate-950/60 text-center space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Newspaper className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-white">ई-पेपर पब्लिशिंग डेस्क — जल्द आ रहा है</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                इस मॉड्यूल के माध्यम से आप अपने चैनल का मल्टी-पेज डिजिटल ई-पेपर (PDF & Web View) सीधे लेआउट जनरेटर से बना सकेंगे। यह सुविधा आगामी अपडेट में उपलब्ध होगी।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Module 8: AI News Maker Mobile App Section (Repositioned to bottom after E-Paper) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 hover:border-amber-400/50 rounded-2xl p-4 sm:p-6 shadow-xl transition-all space-y-4 text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-amber-400 tracking-wide uppercase">
                  AI NEWS MAKER APP
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Android & PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                अपने मोबाइल पर संपूर्ण डिजिटल न्यूज़ स्टूडियो इंस्टॉल करें और तुरंत न्यूज़ स्टोरी, कार्ड व वीडियो बनाएं।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end flex-wrap">
            {/* PWA Install Button */}
            <button
              type="button"
              onClick={() => setIsInstallModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>PWA इंस्टॉल करें</span>
            </button>

            {/* Google Play Store Button */}
            {playStoreUrl && playStoreUrl.startsWith('https://play.google.com/') && (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Google Play Store</span>
              </a>
            )}

            {/* Master Admin Manage Link Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setPlayStoreInput(playStoreUrl);
                  setIsEditingPlayStoreUrl(!isEditingPlayStoreUrl);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition"
                title="Google Play Store App Link प्रबंधित करें"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isEditingPlayStoreUrl ? 'बंद करें' : 'Play Store लिंक'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Admin Play Store URL Setting Panel */}
        {isAdmin && isEditingPlayStoreUrl && (
          <div className="pt-3 border-t border-slate-800/80 bg-slate-950/80 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-amber-300 flex items-center gap-2">
                <span>Google Play Store App Link</span>
                <span className="text-[10px] text-slate-400 font-normal">(केवल मास्टर एडमिन)</span>
              </label>
              {playStoreSaveMsg && (
                <span className={`text-xs font-bold ${playStoreSaveMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {playStoreSaveMsg.text}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                value={playStoreInput}
                onChange={(e) => setPlayStoreInput(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=com.aistudio.ainewsmaker.hzwptx"
                className="flex-1 w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={handleSavePlayStoreUrl}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition shrink-0"
              >
                सेव करें
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              नोट: केवल https://play.google.com/ से शुरू होने वाला आधिकारिक Google Play Store लिंक ही मान्य होगा।
            </p>
          </div>
        )}
      </div>

      {/* Full Size In-App Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {previewAttachment.name || 'यूज़र अटैचमेंट / स्क्रीनशॉट'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name || 'attachment.png'}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition"
                >
                  डाउनलोड
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name || 'Full preview'}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Part 9: Install PWA Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        forceShow={true}
      />
    </div>
  );
};
