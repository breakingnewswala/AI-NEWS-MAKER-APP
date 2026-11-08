import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  User,
  Bot,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Check,
  CheckCheck,
  Phone,
  Sparkles,
  Shield,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Filter,
  Info,
  Zap,
  Lock,
  RotateCcw,
  X,
  CreditCard,
  GitFork,
  Layers,
  Plus,
  Trash2,
  Copy,
  Edit,
  Play,
  HelpCircle,
  Sliders,
  Eye,
  Tag,
  ChevronDown,
  BookOpen,
  Key,
  CheckCircle,
} from 'lucide-react';

interface WhatsAppLiveInboxProps {
  currentUser?: any;
}

type MainTab = 'inbox' | 'flows' | 'faqs' | 'quick_replies' | 'settings';

export const WhatsAppLiveInbox: React.FC<WhatsAppLiveInboxProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('inbox');

  // ==========================================
  // TAB 1: LIVE INBOX STATE
  // ==========================================
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'waiting_human' | 'human' | 'ai' | 'unassigned' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, unread: 0, waitingHuman: 0, human: 0, ai: 0 });
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const forceScrollNextRef = useRef<boolean>(false);

  const operatorEmail = currentUser?.email || 'admin@ainewsmaker.online';
  const operatorName = currentUser?.displayName || currentUser?.name || currentUser?.fullName || operatorEmail.split('@')[0];

  const isMasterOrAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.email === 'breakingnewswala.com@gmail.com' ||
    currentUser?.email === 'breakingnewsvala.com@gmail.com' ||
    currentUser?.email === 'admin.ainewsmaker@gmail.com' ||
    currentUser?.email === 'live.bnwtv@gmail.com';

  // ==========================================
  // TAB 2: FLOWS STATE
  // ==========================================
  const [flows, setFlows] = useState<any[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [flowFilter, setFlowFilter] = useState<'all' | 'published' | 'draft' | 'inactive'>('all');
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simFlowId, setSimFlowId] = useState<string>('');
  const [simSession, setSimSession] = useState<any | null>(null);
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([]);
  const [simInput, setSimInput] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);

  // ==========================================
  // TAB 3: FAQ MANAGER STATE
  // ==========================================
  const [faqs, setFaqs] = useState<any[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [isMatcherModalOpen, setIsMatcherModalOpen] = useState(false);
  const [matchQuery, setMatchQuery] = useState('');
  const [matchResult, setMatchResult] = useState<any | null>(null);
  const [isTestingMatch, setIsTestingMatch] = useState(false);

  // ==========================================
  // TAB 4: QUICK REPLIES STATE
  // ==========================================
  const [quickRepliesList, setQuickRepliesList] = useState<any[]>([]);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [editingQr, setEditingQr] = useState<any | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // ==========================================
  // TAB 5: AUTOMATION SETTINGS STATE
  // ==========================================
  const [settings, setSettings] = useState<any | null>(null);
  const [metaStatus, setMetaStatus] = useState<any | null>(null);
  const [vapidStatus, setVapidStatus] = useState<any | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Helper: Format timestamp in Indian Standard Time (IST)
  const formatIST = (timestamp?: number | string) => {
    if (!timestamp) return '';
    const date = new Date(typeof timestamp === 'string' ? Number(timestamp) || timestamp : timestamp);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline shrink-0" title="पढ़ा गया" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline shrink-0" title="डिलीवर हुआ" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-slate-400 inline shrink-0" title="भेजा गया" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400 inline shrink-0" title="विफल" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 inline shrink-0" title="प्रतीक्षारत" />;
    }
  };

  // Auto-dismiss action notifications after 4 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // ==========================================
  // LIVE INBOX API CALLS
  // ==========================================
  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoadingList(true);
    try {
      const q = new URLSearchParams();
      if (filter !== 'all') q.set('filter', filter);
      if (search.trim()) q.set('search', search.trim());

      const res = await fetch(`/api/admin/whatsapp/conversations?${q.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (data.stats) setStats(data.stats);
        if (selectedConvId) {
          const current = data.conversations.find((c: any) => c.conversationId === selectedConvId);
          if (current) setSelectedConv(current);
        }
      }
    } catch (err: any) {
      if (!silent) {
        setActionNotice({ type: 'error', text: 'वार्तालाप सूची लोड करने में विफल: ' + (err.message || 'नेटवर्क त्रुटि') });
      }
    } finally {
      if (!silent) setIsLoadingList(false);
    }
  };

  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${convId}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err: any) {
      if (!silent) {
        setActionNotice({ type: 'error', text: 'संदेश लोड करने में विफल: ' + (err.message || 'नेटवर्क त्रुटि') });
      }
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conv: any) => {
    setSelectedConvId(conv.conversationId);
    setSelectedConv(conv);
    fetchMessages(conv.conversationId);
    if (conv.unreadCount > 0) {
      fetch(`/api/admin/whatsapp/conversations/${conv.conversationId}/mark-read`, { method: 'POST' })
        .then(() => {
          setConversations((prev) =>
            prev.map((c) => (c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c))
          );
        })
        .catch(() => {});
    }
  };

  const handleModeChange = async (targetMode: 'human' | 'ai') => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          operatorId: operatorEmail,
          operatorName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          text: targetMode === 'human' ? 'मानव नियंत्रण सक्रिय: AI उत्तर रोक दिए गए हैं।' : 'AI नियंत्रण सक्रिय किया गया।',
        });
        setSelectedConv((prev: any) => (prev ? { ...prev, handlingMode: targetMode } : prev));
        fetchConversations(true);
      } else {
        setActionNotice({ type: 'error', text: data.error || 'मोड बदलने में विफल' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'नेटवर्क त्रुटि' });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !replyText.trim() || isSending) return;

    const textToSend = replyText.trim();
    setIsSending(true);
    const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyText('');
        forceScrollNextRef.current = true;
        const newMsg = {
          messageId: data.messageId,
          conversationId: selectedConvId,
          direction: 'outbound',
          senderType: 'human_operator',
          senderName: operatorName,
          text: textToSend,
          status: 'sent',
          timestamp: data.timestamp || Date.now(),
        };
        setMessages((prev) => [...prev, newMsg]);
        setSelectedConv((prev: any) =>
          prev
            ? {
                ...prev,
                lastMessagePreview: textToSend,
                lastMessageAt: Date.now(),
                lastMessageStatus: 'sent',
                handlingMode: 'human',
              }
            : prev
        );
        if (replyInputRef.current) replyInputRef.current.focus();
      } else {
        setActionNotice({ type: 'error', text: data.error || 'संदेश भेजने में त्रुटि हुई।' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'नेटवर्क त्रुटि' });
    } finally {
      setIsSending(false);
    }
  };

  // Polling for live inbox
  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchConversations();
      const interval = setInterval(() => {
        fetchConversations(true);
        if (selectedConvId) fetchMessages(selectedConvId, true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [filter, search, selectedConvId, activeTab]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (forceScrollNextRef.current || isNearBottomRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      forceScrollNextRef.current = false;
    }
  }, [messages]);

  const lastInboundAt = Number(selectedConv?.lastInboundAt || 0);
  const hoursSinceLastInbound = lastInboundAt > 0 ? (Date.now() - lastInboundAt) / (1000 * 3600) : 999;
  const isWithin24hWindow = hoursSinceLastInbound <= 24;

  // ==========================================
  // FLOW BUILDER API CALLS
  // ==========================================
  const fetchFlows = async () => {
    setIsLoadingFlows(true);
    try {
      const res = await fetch('/api/admin/whatsapp/flows');
      const data = await res.json();
      if (data.success && Array.isArray(data.flows)) {
        setFlows(data.flows);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: 'फ्लो लोड करने में विफल: ' + (err?.message || '') });
    } finally {
      setIsLoadingFlows(false);
    }
  };

  const handleSaveFlow = async (flowToSave: any) => {
    try {
      const isNew = !flows.some((f) => f.id === flowToSave.id);
      const url = isNew ? '/api/admin/whatsapp/flows' : `/api/admin/whatsapp/flows/${flowToSave.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowToSave),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: `फ्लो "${flowToSave.name}" सफलतापूर्वक सुरक्षित हुआ!` });
        setEditingFlow(null);
        fetchFlows();
      } else {
        setActionNotice({ type: 'error', text: data.error || 'फ्लो सेव करने में विफल' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'नेटवर्क त्रुटि' });
    }
  };

  const handleDuplicateFlow = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/flows/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'फ्लो की डुप्लीकेट कॉपी बन गई है!' });
        fetchFlows();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'डुप्लीकेट करने में विफल' });
    }
  };

  const handleDeleteFlow = async (id: string, name: string) => {
    if (!window.confirm(`क्या आप निश्चित रूप से फ्लो "${name}" को हटाना चाहते हैं?`)) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/flows/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'फ्लो हटा दिया गया है!' });
        fetchFlows();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'हटाने में विफल' });
    }
  };

  const handleToggleFlowStatus = async (flow: any) => {
    const nextStatus = flow.status === 'published' ? 'inactive' : 'published';
    try {
      const res = await fetch(`/api/admin/whatsapp/flows/${flow.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: `फ्लो अब ${nextStatus === 'published' ? 'सक्रिय (Published)' : 'निष्क्रिय (Inactive)'} है।` });
        fetchFlows();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'स्थिति बदलने में विफल' });
    }
  };

  const handleOpenSimulator = (flow: any) => {
    setSimFlowId(flow.id);
    setSimSession(null);
    setSimMessages([]);
    setSimInput('');
    setIsSimulatorOpen(true);
    // Auto-trigger start
    handleSendSimulatorMessage('नमस्ते', flow.id, null);
  };

  const handleSendSimulatorMessage = async (inputStr: string, flowIdOverride?: string, sessionOverride?: any) => {
    const fid = flowIdOverride || simFlowId;
    if (!fid || isSimLoading) return;
    const text = inputStr.trim();
    if (!text) return;

    const userEntry = { sender: 'user' as const, text };
    setSimMessages((prev) => [...prev, userEntry]);
    setSimInput('');
    setIsSimLoading(true);

    try {
      const curSession = sessionOverride !== undefined ? sessionOverride : simSession;
      const res = await fetch(`/api/admin/whatsapp/flows/${fid}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          sessionState: curSession,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimSession(data.nextSession);
        if (Array.isArray(data.outboundMessages)) {
          const botEntries = data.outboundMessages.map((m: string) => ({ sender: 'bot' as const, text: m }));
          setSimMessages((prev) => [...prev, ...botEntries]);
        }
        if (data.isHandoff) {
          setSimMessages((prev) => [...prev, { sender: 'bot' as const, text: `⚠️ [सिस्टम सूचना: ह्यूमन हैंडऑफ ट्रिगर हुआ — कारण: ${data.handoffReason}]` }]);
        }
        if (data.isCompleted) {
          setSimMessages((prev) => [...prev, { sender: 'bot' as const, text: '🏁 [फ्लो समाप्त हुआ]' }]);
        }
      }
    } catch (err: any) {
      setSimMessages((prev) => [...prev, { sender: 'bot' as const, text: 'सिमुलेटर त्रुटि: ' + err?.message }]);
    } finally {
      setIsSimLoading(false);
    }
  };

  // ==========================================
  // FAQ MANAGER API CALLS
  // ==========================================
  const fetchFaqs = async () => {
    setIsLoadingFaqs(true);
    try {
      const q = new URLSearchParams();
      if (faqSearch.trim()) q.set('search', faqSearch.trim());
      if (faqCategory !== 'all') q.set('category', faqCategory);

      const res = await fetch(`/api/admin/whatsapp/faqs?${q.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.faqs)) {
        setFaqs(data.faqs);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: 'FAQ लोड करने में विफल: ' + (err?.message || '') });
    } finally {
      setIsLoadingFaqs(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/faqs/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch {}
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    try {
      const isNew = !faqs.some((f) => f.id === editingFaq.id);
      const url = isNew ? '/api/admin/whatsapp/faqs' : `/api/admin/whatsapp/faqs/${editingFaq.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFaq),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'FAQ सफलतापूर्वक सुरक्षित हुआ!' });
        setIsFaqModalOpen(false);
        setEditingFaq(null);
        fetchFaqs();
        fetchCategories();
      } else {
        setActionNotice({ type: 'error', text: data.error || 'FAQ सेव करने में विफल' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'नेटवर्क त्रुटि' });
    }
  };

  const handleDeleteFaq = async (id: string, qHi: string) => {
    if (!window.confirm(`क्या आप निश्चित रूप से FAQ "${qHi}" को हटाना चाहते हैं?`)) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/faqs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'FAQ हटा दिया गया!' });
        fetchFaqs();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'हटाने में विफल' });
    }
  };

  const handleToggleFaqStatus = async (faq: any) => {
    const nextStatus = faq.status === 'published' ? 'inactive' : 'published';
    try {
      const res = await fetch(`/api/admin/whatsapp/faqs/${faq.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, isActive: nextStatus === 'published' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: `FAQ स्थिति: ${nextStatus === 'published' ? 'सक्रिय' : 'निष्क्रिय'}` });
        fetchFaqs();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'स्थिति बदलने में विफल' });
    }
  };

  const handleTestMatchQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchQuery.trim() || isTestingMatch) return;
    setIsTestingMatch(true);
    setMatchResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp/faqs/test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: matchQuery.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchResult(data.match);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: 'परीक्षण में त्रुटि: ' + err?.message });
    } finally {
      setIsTestingMatch(false);
    }
  };

  // ==========================================
  // QUICK REPLIES API CALLS
  // ==========================================
  const fetchQuickReplies = async () => {
    setIsLoadingQr(true);
    try {
      const res = await fetch('/api/admin/whatsapp/quick-replies');
      const data = await res.json();
      if (data.success && Array.isArray(data.quickReplies)) {
        setQuickRepliesList(data.quickReplies);
      }
    } catch {} finally {
      setIsLoadingQr(false);
    }
  };

  const handleSaveQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;
    try {
      const res = await fetch('/api/admin/whatsapp/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQr),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'क्विक रिप्लाई सुरक्षित हुआ!' });
        setIsQrModalOpen(false);
        setEditingQr(null);
        fetchQuickReplies();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'त्रुटि' });
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/quick-replies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'क्विक रिप्लाई हटाया गया!' });
        fetchQuickReplies();
      }
    } catch {}
  };

  // ==========================================
  // SETTINGS API CALLS
  // ==========================================
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/whatsapp/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMetaStatus(data.metaStatus);
        setVapidStatus(data.vapidStatus);
      }
    } catch {} finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'सेटिंग्स सफलतापूर्वक अपडेट हुईं!' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'सेव करने में विफल' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Switch tabs loader
  useEffect(() => {
    if (activeTab === 'flows') fetchFlows();
    if (activeTab === 'faqs') {
      fetchFaqs();
      fetchCategories();
    }
    if (activeTab === 'quick_replies') fetchQuickReplies();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, faqCategory, faqSearch]);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[820px] max-h-[88vh]">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md">
            <MessageSquare className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                WhatsApp AI Command Center
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                Phase 1B.2 Production Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ऑटोमेशन फ्लो बिल्डर, FAQ नॉलेज बेस, लाइव इनबॉक्स व वेब पुश
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2">
          {stats.waitingHuman > 0 && (
            <span className="px-2.5 py-1 bg-red-600/90 text-white text-xs font-black rounded-lg animate-pulse flex items-center gap-1.5 shadow-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.waitingHuman} सहायता प्रतीक्षारत</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'inbox') fetchConversations();
              if (activeTab === 'flows') fetchFlows();
              if (activeTab === 'faqs') fetchFaqs();
              if (activeTab === 'quick_replies') fetchQuickReplies();
              if (activeTab === 'settings') fetchSettings();
            }}
            disabled={isLoadingList || isLoadingFlows || isLoadingFaqs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer"
            title="रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoadingList || isLoadingFlows || isLoadingFaqs) ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS (5 MODULES) */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Live Support Inbox</span>
          {stats.unread > 0 && (
            <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${activeTab === 'inbox' ? 'bg-slate-950 text-amber-400' : 'bg-red-600 text-white'}`}>
              {stats.unread}
            </span>
          )}
        </button>

        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('flows')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'flows'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Automation & Flows</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800/60 rounded text-slate-300">
              {flows.length}
            </span>
          </button>
        )}

        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ Manager</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800/60 rounded text-slate-300">
              {faqs.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('quick_replies')}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'quick_replies'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Quick Responses</span>
        </button>

        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Automation Settings</span>
          </button>
        )}
      </div>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div
          className={`px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800'
              : 'bg-red-950/90 text-red-300 border-b border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LIVE SUPPORT INBOX                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'inbox' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col shrink-0 bg-slate-900/60 ${
              selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search Box */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="नाम या फ़ोन नंबर से खोजें..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Chips Bar */}
            <div className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                  filter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                सभी ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                  filter === 'unread'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                अनरीड
                {stats.unread > 0 && (
                  <span className="w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                    {stats.unread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilter('waiting_human')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                  filter === 'waiting_human'
                    ? 'bg-red-600 text-white shadow-sm'
                    : stats.waitingHuman > 0
                    ? 'bg-red-950/60 text-red-300 border border-red-500/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                सहायता प्रतीक्षारत
                {stats.waitingHuman > 0 && (
                  <span className="w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {stats.waitingHuman}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilter('human')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                  filter === 'human'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                ह्यूमन ({stats.human})
              </button>
              <button
                type="button"
                onClick={() => setFilter('ai')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                  filter === 'ai'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                AI ({stats.ai})
              </button>
            </div>

            {/* Conversation List Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {isLoadingList && conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500/60" />
                  लोड हो रहा है...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  कोई वार्तालाप नहीं मिला
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.conversationId === selectedConvId;
                  const isWaiting = conv.handlingMode === 'waiting_human';
                  const isHuman = conv.handlingMode === 'human';

                  return (
                    <button
                      key={conv.conversationId}
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left p-3 transition flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-l-4 border-amber-400'
                          : isWaiting
                          ? 'bg-red-950/20 hover:bg-slate-850/60 border-l-4 border-red-500'
                          : 'hover:bg-slate-850/60'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            isWaiting
                              ? 'bg-red-600/90 text-white'
                              : isHuman
                              ? 'bg-emerald-600/80 text-white'
                              : 'bg-slate-800 text-amber-400 border border-slate-700'
                          }`}
                        >
                          {isWaiting ? (
                            <Clock className="w-4 h-4" />
                          ) : isHuman ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {conv.customerName || conv.customerPhone || 'ग्राहक'}
                          </h4>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {formatIST(conv.lastMessageAt || conv.lastInboundAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 truncate mb-1.5">
                          {conv.lastMessageDirection === 'outbound' ? 'आप: ' : ''}
                          {conv.lastMessagePreview || 'कोई संदेश नहीं'}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isWaiting && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-[9px] font-bold rounded border border-red-500/30">
                              सपोर्ट अपेक्षित
                            </span>
                          )}
                          {isHuman && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded border border-emerald-500/30">
                              ह्यूमन: {conv.assignedOperatorName || 'ऑपरेटर'}
                            </span>
                          )}
                          {conv.handlingMode === 'ai' && (
                            <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 text-[9px] font-bold rounded border border-sky-500/30">
                              AI ऑटोमेशन
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Screen (Dedicated Full-Screen Experience on Mobile per Part 4) */}
          <div
            className={`flex-1 flex flex-col min-w-0 bg-slate-950 ${
              !selectedConvId
                ? 'hidden md:flex'
                : 'flex w-full max-md:fixed max-md:inset-0 max-md:z-50 max-md:h-[100dvh] max-md:max-h-none'
            }`}
          >
            {!selectedConvId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-300 mb-1">वार्तालाप चुनें</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  बाएँ कॉलम से किसी भी ग्राहक पर क्लिक करके रीयल-टाइम चैट देखें, AI/ह्यूमन स्विच करें और तुरंत जवाब दें।
                </p>
              </div>
            ) : (
              <>
                {/* Chat Top Bar */}
                <div className="p-3 sm:p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-md">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedConvId(null)}
                      className="p-1.5 sm:p-2 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                      title="वार्तालाप सूची पर वापस जाएँ"
                    >
                      <ArrowLeft className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-300 md:hidden">सूची</span>
                    </button>

                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-none">
                          {selectedConv?.customerName || selectedConv?.customerPhone || 'ग्राहक'}
                        </h3>
                        {selectedConv?.handlingMode === 'waiting_human' ? (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-bold rounded-full border border-red-500/30 animate-pulse whitespace-nowrap">
                            सहायता प्रतीक्षारत
                          </span>
                        ) : selectedConv?.handlingMode === 'human' ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 whitespace-nowrap">
                            ह्यूमन टेकओवर
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-bold rounded-full border border-sky-500/30 whitespace-nowrap">
                            AI ऑटो
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        फ़ोन: {selectedConv?.customerPhone || 'N/A'} {selectedConv?.customerEmail ? `• ${selectedConv.customerEmail}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Mode Switching Buttons (Part 4: मानव नियंत्रण लें / Take Over Chat & AI नियंत्रण दें) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {selectedConv?.handlingMode === 'human' ? (
                      <button
                        type="button"
                        onClick={() => handleModeChange('ai')}
                        className="px-2.5 sm:px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-[11px] sm:text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                        title="AI को नियंत्रण वापस दें"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI नियंत्रण दें</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleModeChange('human')}
                        className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-[11px] sm:text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 animate-pulse"
                        title="मानव नियंत्रण लें"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>मानव नियंत्रण लें (Take Over Chat)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Takeover Status Alert Bar (Part 4) */}
                <div
                  className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 border-b shrink-0 ${
                    selectedConv?.handlingMode === 'human'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : selectedConv?.handlingMode === 'waiting_human'
                      ? 'bg-red-950/60 border-red-500/40 text-red-300 animate-pulse'
                      : 'bg-sky-950/50 border-sky-500/30 text-sky-300'
                  }`}
                >
                  {selectedConv?.handlingMode === 'human' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>मानव नियंत्रण सक्रिय: आपके संदेश सीधे ग्राहक को जाएंगे और AI उत्तर नहीं देगा।</span>
                    </>
                  ) : selectedConv?.handlingMode === 'waiting_human' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-ping" />
                      <span>ग्राहक सहायता की प्रतीक्षा कर रहा है! कृपया ऊपर दिए बटन से मानव नियंत्रण लें।</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <span>AI ऑटो-पायलट सक्रिय है। किसी भी समय 'मानव नियंत्रण लें' दबाकर चैट अपने हाथ में लें।</span>
                    </>
                  )}
                </div>

                {/* 24-Hour WhatsApp Session Window Alert */}
                {!isWithin24hWindow && (
                  <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2 shrink-0">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      *24-घंटे की WhatsApp ग्राहक विंडो समाप्त हो चुकी है।* केवल तभी संदेश भेजें जब ग्राहक ने हाल ही में संपर्क किया हो।
                    </span>
                  </div>
                )}

                {/* Message Stream */}
                <div
                  ref={chatContainerRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/90"
                >
                  {isLoadingMessages && messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      संदेश लोड हो रहे हैं...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      इस वार्तालाप में अभी कोई संदेश नहीं है
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOutbound = msg.direction === 'outbound';
                      const isSystem = msg.senderType === 'system';
                      const isFlow = msg.senderType === 'flow_automation';
                      const isFaq = msg.senderType === 'faq_automation';

                      return (
                        <div
                          key={msg.messageId || idx}
                          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                              isOutbound
                                ? isFlow
                                  ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100 rounded-br-none'
                                  : isFaq
                                  ? 'bg-teal-900/40 border border-teal-500/30 text-teal-100 rounded-br-none'
                                  : isSystem
                                  ? 'bg-slate-800 border border-slate-700 text-slate-300 rounded-br-none'
                                  : 'bg-emerald-700/80 border border-emerald-600/40 text-white rounded-br-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                            }`}
                          >
                            {/* Sender Pill */}
                            <div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-75">
                              <span className="font-bold flex items-center gap-1">
                                {isOutbound ? (
                                  isFlow ? (
                                    <>
                                      <GitFork className="w-3 h-3 text-purple-300" />
                                      <span>Flow Automation</span>
                                    </>
                                  ) : isFaq ? (
                                    <>
                                      <HelpCircle className="w-3 h-3 text-teal-300" />
                                      <span>FAQ Assistant</span>
                                    </>
                                  ) : isSystem ? (
                                    <>
                                      <Bot className="w-3 h-3 text-sky-300" />
                                      <span>AI Assistant</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3 text-emerald-300" />
                                      <span>{msg.senderName || 'ऑपरेटर'}</span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>ग्राहक</span>
                                  </>
                                )}
                              </span>
                              <span>{formatIST(msg.timestamp)}</span>
                            </div>

                            {/* Message Body */}
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                              {msg.text}
                            </p>

                            {/* Status indicator for outbound */}
                            {isOutbound && (
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-slate-400 capitalize">{msg.status || 'sent'}</span>
                                {getStatusIcon(msg.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies Popup Bar */}
                {showQuickReplies && (
                  <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <span className="text-[11px] font-bold text-amber-400 shrink-0 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> क्विक:
                    </span>
                    {(quickRepliesList.length > 0 ? quickRepliesList : [
                      { text: '🙏 नमस्कार! AI News Maker में आपका स्वागत है। बताइए, हम आपकी क्या सहायता कर सकते हैं?' },
                      { text: '✅ आपकी समस्या दर्ज कर ली गई है। हमारी तकनीकी टीम इसकी जाँच कर रही है।' },
                      { text: '📊 आपका दैनिक डाउनलोड कोटा रीसेट कर दिया गया है। कृपया पुनः प्रयास करें।' },
                      { text: '🔐 क्या आप अपनी पंजीकृत ईमेल आईडी साझा कर सकते हैं?' },
                    ]).map((qr, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setReplyText(qr.text);
                          setShowQuickReplies(false);
                          if (replyInputRef.current) replyInputRef.current.focus();
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 truncate max-w-[220px] shrink-0 text-left cursor-pointer"
                      >
                        {qr.text}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowQuickReplies(false)}
                      className="p-1 text-slate-400 hover:text-white shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Reply Form (Sticky bottom with safe inset for mobile virtual keyboard) */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0 sticky bottom-0 z-10"
                >
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition cursor-pointer"
                    title="क्विक रिप्लाई चुनें"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      ref={replyInputRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isWithin24hWindow
                          ? 'ग्राहक को जवाब लिखें (Enter दबाकर भेजें)...'
                          : 'चेतावनी: 24h विंडो समाप्त हो चुकी है...'
                      }
                      rows={1}
                      maxLength={4096}
                      className="w-full pl-3 pr-16 py-2.5 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="absolute right-2.5 bottom-2 text-[10px] text-slate-500">
                      {replyText.length}/4096
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0 h-[42px]"
                  >
                    <Send className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                    <span>{isSending ? 'भेज रहे हैं...' : 'भेजें'}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATION & FLOWS (FLOW BUILDER)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'flows' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
          {!editingFlow ? (
            // FLOWS LIST VIEW
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Top Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">फ़िल्टर:</span>
                  {(['all', 'published', 'draft', 'inactive'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFlowFilter(st)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        flowFilter === st
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st === 'all' ? 'सभी' : st === 'published' ? 'सक्रिय (Published)' : st === 'draft' ? 'ड्राफ्ट' : 'निष्क्रिय'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newF = {
                        id: `flow_${Date.now().toString(36)}`,
                        name: 'नया ऑटोमेशन फ्लो',
                        description: 'ग्राहक पूछताछ के लिए नया फ्लो',
                        version: '1.0',
                        status: 'draft',
                        trigger: { type: 'keyword', keywords: ['मदद', 'सहायता'] },
                        nodes: [
                          {
                            id: 'node_1',
                            type: 'message',
                            title: 'शुरुआती संदेश',
                            config: { text: 'नमस्ते! AI News Maker में आपका स्वागत है।' },
                          },
                          {
                            id: 'node_2',
                            type: 'end',
                            title: 'समाप्ति',
                            config: { text: 'धन्यवाद!' },
                          },
                        ],
                      };
                      setEditingFlow(newF);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Flow</span>
                  </button>
                </div>
              </div>

              {/* Flows Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {flows
                  .filter((f) => (flowFilter === 'all' ? true : f.status === flowFilter))
                  .map((flow) => {
                    const isPub = flow.status === 'published';
                    const isDraft = flow.status === 'draft';

                    return (
                      <div
                        key={flow.id}
                        className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-black text-white">{flow.name}</h3>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                  v{flow.version || '1.0'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">{flow.description || 'कोई विवरण नहीं'}</p>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                isPub
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isDraft
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {isPub ? 'Published' : isDraft ? 'Draft' : 'Inactive'}
                            </span>
                          </div>

                          {/* Trigger summary */}
                          <div className="my-3 p-2.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-2 text-xs text-slate-300">
                            <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-bold text-amber-400">Trigger:</span>
                            <span className="truncate">
                              {flow.trigger?.type === 'first_message'
                                ? 'ग्राहक का पहला संदेश (First Inbound Message)'
                                : flow.trigger?.type === 'all_inbound'
                                ? 'सभी इनबाउंड संदेश'
                                : `कीवर्ड्स: ${(flow.trigger?.keywords || []).join(', ') || 'N/A'}`}
                            </span>
                          </div>

                          {/* Nodes count & types preview */}
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>{(flow.nodes || []).length} नोड्स कॉन्फ़िगर हैं</span>
                          </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingFlow(flow)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-400" />
                              <span>एडिट करें</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateFlow(flow.id)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                              title="डुप्लीकेट बनाएँ"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSimulator(flow)}
                              className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 text-purple-400" />
                              <span>सिम्युलेटर में टेस्ट करें</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleFlowStatus(flow)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                                isPub
                                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isPub ? 'Deactivate' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFlow(flow.id, flow.name)}
                              className="p-1.5 hover:bg-red-950/60 text-red-400 rounded-lg transition cursor-pointer"
                              title="डिलीट करें"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            // FLOW VISUAL BUILDER / EDITOR
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Editor Header Bar */}
              <div className="flex items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingFlow(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white">Flow Builder — {editingFlow.name}</h3>
                    <p className="text-xs text-slate-400">विजुअल नोड्स को कॉन्फ़िगर करें और ब्रांचिंग सेट करें</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSimulator(editingFlow)}
                    className="px-3 py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-500/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-400" />
                    <span>टेस्ट करें</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveFlow(editingFlow)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>फ्लो सुरक्षित करें</span>
                  </button>
                </div>
              </div>

              {/* Flow Metadata Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">फ्लो का नाम:</label>
                  <input
                    type="text"
                    value={editingFlow.name}
                    onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ट्रिगर प्रकार:</label>
                  <select
                    value={editingFlow.trigger?.type || 'keyword'}
                    onChange={(e) =>
                      setEditingFlow({
                        ...editingFlow,
                        trigger: { ...editingFlow.trigger, type: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400 cursor-pointer"
                  >
                    <option value="first_message">पहला इनबाउंड संदेश (First Message)</option>
                    <option value="keyword">कीवर्ड मैच (Keywords)</option>
                    <option value="faq_match">FAQ मैच (FAQ Query)</option>
                    <option value="all_inbound">सभी इनबाउंड संदेश (All Messages)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">स्थिति (Status):</label>
                  <select
                    value={editingFlow.status || 'draft'}
                    onChange={(e) => setEditingFlow({ ...editingFlow, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400 cursor-pointer"
                  >
                    <option value="draft">Draft (ड्राफ्ट - अभी केवल टेस्टिंग)</option>
                    <option value="published">Published (सक्रिय - लाइव ग्राहकों के लिए)</option>
                    <option value="inactive">Inactive (निष्क्रिय)</option>
                  </select>
                </div>

                {editingFlow.trigger?.type === 'keyword' && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ट्रिगर कीवर्ड्स (कॉमा से अलग करें):
                    </label>
                    <input
                      type="text"
                      value={(editingFlow.trigger?.keywords || []).join(', ')}
                      onChange={(e) =>
                        setEditingFlow({
                          ...editingFlow,
                          trigger: {
                            ...editingFlow.trigger,
                            keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        })
                      }
                      placeholder="e.g. hi, hello, start, menu, नमस्ते, शुरू"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Visual Nodes Pipeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitFork className="w-4 h-4" />
                    <span>Flow Execution Steps ({editingFlow.nodes?.length || 0} Nodes)</span>
                  </h4>

                  {/* Add Node Menu */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 mr-2">नया नोड जोड़ें:</span>
                    {(
                      [
                        { type: 'message', label: '💬 संदेश' },
                        { type: 'question', label: '❓ प्रश्न' },
                        { type: 'option', label: '🔘 विकल्प' },
                        { type: 'condition', label: '🔀 शर्त' },
                        { type: 'ai_response', label: '🤖 AI' },
                        { type: 'faq', label: '📚 FAQ' },
                        { type: 'human_handoff', label: '👤 हैंडऑफ' },
                        { type: 'end', label: '🏁 समाप्ति' },
                      ] as const
                    ).map((nt) => (
                      <button
                        key={nt.type}
                        type="button"
                        onClick={() => {
                          const newN = {
                            id: `node_${Date.now().toString(36)}`,
                            type: nt.type,
                            title: nt.label,
                            config: { text: nt.type === 'message' ? 'नया संदेश' : '' },
                          };
                          setEditingFlow({
                            ...editingFlow,
                            nodes: [...(editingFlow.nodes || []), newN],
                          });
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition cursor-pointer"
                      >
                        {nt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nodes List */}
                <div className="space-y-2">
                  {(editingFlow.nodes || []).map((node: any, idx: number) => (
                    <div
                      key={node.id}
                      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded uppercase">
                              {node.type}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{node.title || node.id}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {node.config?.text ||
                              (node.type === 'option' ? `${node.config?.options?.length || 0} ऑप्शन्स कॉन्फ़िगर` : 'कॉन्फ़िग सेट करें')}
                          </p>
                        </div>
                      </div>

                      {/* Node Config Drawer Trigger & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newText = window.prompt('नोड का संदेश (Text) दर्ज करें:', node.config?.text || '');
                            if (newText !== null) {
                              const updatedNodes = [...editingFlow.nodes];
                              updatedNodes[idx] = {
                                ...node,
                                config: { ...node.config, text: newText },
                              };
                              setEditingFlow({ ...editingFlow, nodes: updatedNodes });
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          एडिट करें
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedNodes = editingFlow.nodes.filter((_: any, i: number) => i !== idx);
                            setEditingFlow({ ...editingFlow, nodes: updatedNodes });
                          }}
                          className="p-1.5 hover:bg-red-950/60 text-red-400 rounded-lg cursor-pointer"
                          title="नोड डिलीट करें"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SIMULATOR MODAL */}
          {isSimulatorOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
                {/* Simulator Header */}
                <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Flow Live Test Simulator</h4>
                      <p className="text-[10px] text-slate-400">WhatsApp ग्राहक चैट सिमुलेशन</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Simulated Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-950">
                  {simMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-amber-500 text-slate-950 font-bold rounded-br-none'
                            : 'bg-slate-800 text-slate-100 rounded-bl-none whitespace-pre-wrap'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isSimLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-slate-400 px-3 py-1.5 rounded-2xl text-xs flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                        <span>फ्लो प्रोसेस हो रहा है...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulator Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendSimulatorMessage(simInput);
                  }}
                  className="p-3 bg-slate-850 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    placeholder="संदेश टाइप करें (e.g. 1, 2, हाँ)..."
                    className="flex-1 px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!simInput.trim() || isSimLoading}
                    className="px-3 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    भेजें
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimSession(null);
                      setSimMessages([]);
                      handleSendSimulatorMessage('नमस्ते', simFlowId, null);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                    title="रीसेट करें"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FAQ MANAGER                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'faqs' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="प्रश्न, उत्तर या कीवर्ड से खोजें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMatcherModalOpen(true)}
                className="px-3 py-2 bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 border border-purple-500/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Matcher Tool</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingFaq({
                    category: 'सामान्य',
                    questionHi: '',
                    questionEn: '',
                    answerHi: '',
                    answerEn: '',
                    keywords: [],
                    status: 'published',
                    isActive: true,
                  });
                  setKeywordInput('');
                  setIsFaqModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New FAQ</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFaqCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                faqCategory === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              सभी ({faqs.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFaqCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                  faqCategory === cat
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQs Cards List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {faqs.map((faq) => {
              const isPub = faq.status === 'published' && faq.isActive !== false;

              return (
                <div
                  key={faq.id}
                  className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-slate-800 text-amber-400 text-[10px] font-black rounded">
                        {faq.category || 'सामान्य'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPub
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isPub ? 'सक्रिय (Active)' : 'ड्राफ्ट / निष्क्रिय'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{faq.questionHi || faq.questionEn}</h3>
                    {faq.questionEn && faq.questionHi && (
                      <p className="text-xs text-slate-400 mb-2 italic">{faq.questionEn}</p>
                    )}

                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4 bg-slate-950 p-3 rounded-xl border border-slate-850 mb-3">
                      {faq.answerHi || faq.answerEn}
                    </p>

                    {/* Keywords tags */}
                    {Array.isArray(faq.keywords) && faq.keywords.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {faq.keywords.map((kw: string, ki: number) => (
                          <span
                            key={ki}
                            className="px-2 py-0.5 bg-slate-800/80 text-slate-300 text-[10px] rounded-md border border-slate-700"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FAQ Card Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      उपयोग: {faq.usageCount || 0} बार
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFaqStatus(faq)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        {isPub ? 'निष्क्रिय करें' : 'सक्रिय करें'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaq(faq);
                          setKeywordInput('');
                          setIsFaqModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-800 text-amber-400 rounded-lg cursor-pointer"
                        title="एडिट करें"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id, faq.questionHi || faq.id)}
                        className="p-1.5 hover:bg-red-950/60 text-red-400 rounded-lg cursor-pointer"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD / EDIT FAQ MODAL */}
          {isFaqModalOpen && editingFaq && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="bg-slate-850 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {editingFaq.id ? 'FAQ संपादित करें' : 'नया FAQ जोड़ें'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFaqModalOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveFaq} className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">श्रेणी (Category):</label>
                    <input
                      type="text"
                      value={editingFaq.category}
                      onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                      placeholder="e.g. अकाउंट व लॉगिन, प्लान, फीचर्स"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">प्रश्न (हिंदी):</label>
                    <input
                      type="text"
                      value={editingFaq.questionHi}
                      onChange={(e) => setEditingFaq({ ...editingFaq, questionHi: e.target.value })}
                      placeholder="e.g. पासवर्ड कैसे रीसेट करें?"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">प्रश्न (English - Optional):</label>
                    <input
                      type="text"
                      value={editingFaq.questionEn || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, questionEn: e.target.value })}
                      placeholder="e.g. How to reset password?"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">उत्तर (हिंदी):</label>
                    <textarea
                      value={editingFaq.answerHi}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answerHi: e.target.value })}
                      placeholder="विस्तृत उत्तर यहाँ लिखें..."
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      समानांतर कीवर्ड्स / प्रश्न प्रकार (Enter या कॉमा से जोड़ें):
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
                            e.preventDefault();
                            const kw = keywordInput.trim().replace(/^,/, '');
                            if (!editingFaq.keywords?.includes(kw)) {
                              setEditingFaq({
                                ...editingFaq,
                                keywords: [...(editingFaq.keywords || []), kw],
                              });
                            }
                            setKeywordInput('');
                          }
                        }}
                        placeholder="कीवर्ड टाइप करें और Enter दबाएँ..."
                        className="flex-1 px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(editingFaq.keywords || []).map((kw: string, ki: number) => (
                        <span
                          key={ki}
                          className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-lg flex items-center gap-1"
                        >
                          <span>#{kw}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingFaq.keywords.filter((_: any, i: number) => i !== ki);
                              setEditingFaq({ ...editingFaq, keywords: updated });
                            }}
                            className="hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsFaqModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                    >
                      सुरक्षित करें
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MATCHER TESTER MODAL */}
          {isMatcherModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>FAQ Matcher Simulator</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsMatcherModalOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  जाँचें कि ग्राहक द्वारा भेजा गया कोई भी सवाल कौन से FAQ से मैच होगा और उसका स्कोर क्या होगा।
                </p>

                <form onSubmit={handleTestMatchQuery} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={matchQuery}
                      onChange={(e) => setMatchQuery(e.target.value)}
                      placeholder="e.g. पासवर्ड भूल गया या प्लान क्या है..."
                      className="flex-1 px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800 focus:border-purple-400"
                    />
                    <button
                      type="submit"
                      disabled={isTestingMatch}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      {isTestingMatch ? 'परीक्षण...' : 'Test Match'}
                    </button>
                  </div>
                </form>

                {matchResult !== null && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    {matchResult ? (
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> मैच सफल (Match Found)
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded">
                            Score: {matchResult.score}/100
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">
                          प्रश्न: {matchResult.faq?.questionHi || matchResult.faq?.questionEn}
                        </h4>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mt-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          {matchResult.faq?.answerHi || matchResult.faq?.answerEn}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-slate-400 text-xs">
                        ⚠️ कोई सीधा FAQ मैच नहीं हुआ। यह सवाल स्वतः जेमिनी AI नॉलेज बेस में जाएगा।
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUICK RESPONSES                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'quick_replies' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950">
          <div className="flex items-center justify-between bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">कैंड रिस्पॉन्स व शॉर्टकट्स</h3>
              <p className="text-xs text-slate-400">ऑपरेटर एक क्लिक में सामान्य प्रश्नों के उत्तर भेज सकते हैं</p>
            </div>
            {isMasterOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingQr({ title: '', text: '', shortcut: '', category: 'सामान्य' });
                  setIsQrModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>नया रिस्पॉन्स जोड़ें</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickRepliesList.map((qr) => (
              <div
                key={qr.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-white">{qr.title}</h4>
                    {qr.shortcut && (
                      <span className="px-2 py-0.5 bg-slate-800 text-amber-400 text-[10px] font-mono rounded">
                        {qr.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">
                    {qr.text}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qr.text);
                      setActionNotice({ type: 'success', text: 'टेक्स्ट क्लिपबोर्ड में कॉपी हो गया!' });
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>कॉपी करें</span>
                  </button>

                  {isMasterOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuickReply(qr.id)}
                      className="p-1 hover:bg-red-950/60 text-red-400 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reply Modal */}
          {isQrModalOpen && editingQr && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md p-5">
                <h3 className="text-sm font-bold text-white mb-3">त्वरित उत्तर जोड़ें</h3>
                <form onSubmit={handleSaveQuickReply} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">शीर्षक (Title):</label>
                    <input
                      type="text"
                      value={editingQr.title}
                      onChange={(e) => setEditingQr({ ...editingQr, title: e.target.value })}
                      placeholder="e.g. स्वागत संदेश"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">शॉर्टकट (e.g. /welcome):</label>
                    <input
                      type="text"
                      value={editingQr.shortcut}
                      onChange={(e) => setEditingQr({ ...editingQr, shortcut: e.target.value })}
                      placeholder="/welcome"
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">संदेश टेक्स्ट:</label>
                    <textarea
                      value={editingQr.text}
                      onChange={(e) => setEditingQr({ ...editingQr, text: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-800"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
                    >
                      सुरक्षित करें
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUTOMATION SETTINGS & WEB PUSH VAPID CONFIG                        */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && isMasterOrAdmin && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950">
          {/* Meta Status Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Cloud API Connection</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Phone Number ID:</span>
                <span className="font-mono font-bold text-white truncate block">
                  {metaStatus?.phoneNumberId || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Official Number:</span>
                <span className="font-bold text-emerald-400 block">
                  {metaStatus?.displayNumber || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Connection Status:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live & Connected
                </span>
              </div>
            </div>
          </div>

          {/* Web Push VAPID Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Web Push Notifications (VAPID Configuration)</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  vapidStatus?.configured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {vapidStatus?.configured ? 'VAPID Active' : 'Setup Required'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              वेब पुश नोटिफिकेशन्स के लिए mathematically valid ECDSA P-256 VAPID Public और Private Keys आवश्यक हैं।
            </p>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">VAPID Public Key:</span>
                <span className="font-mono text-amber-400 truncate max-w-xs">
                  {vapidStatus?.publicKey || 'NOT_CONFIGURED'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-850">
                <span className="text-slate-400 block mb-1">कुंजी जनरेट करने का आदेश (Command):</span>
                <code className="block p-2 bg-slate-900 rounded text-emerald-300 font-mono text-[11px] select-all">
                  node scripts/generate_vapid_keys.cjs
                </code>
              </div>
            </div>
          </div>

          {/* Automation Engine Settings Form */}
          {settings && (
            <form onSubmit={handleSaveSettings} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Automation Engine Settings</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">AI Gemini Model:</label>
                  <select
                    value={settings.aiModel || 'gemini-3.5-flash'}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (अनुशंसित - तीव्र व सटीक)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (गहरा विश्लेषण)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">सेशन टाइमआउट (मिनट):</label>
                  <input
                    type="number"
                    value={settings.sessionTimeoutMinutes || 30}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">डिफ़ॉल्ट हैंडऑफ संदेश:</label>
                  <textarea
                    value={settings.defaultHandoffMessage || ''}
                    onChange={(e) => setSettings({ ...settings, defaultHandoffMessage: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  {isSavingSettings ? 'सुरक्षित हो रहा है...' : 'सेटिंग्स अपडेट करें'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
