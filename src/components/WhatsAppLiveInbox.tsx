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
  ExternalLink,
  ChevronRight,
  Filter,
  Info,
  Zap,
  Lock,
  RotateCcw,
  X,
  CreditCard,
} from 'lucide-react';

interface WhatsAppLiveInboxProps {
  currentUser?: any;
}

export const WhatsAppLiveInbox: React.FC<WhatsAppLiveInboxProps> = ({ currentUser }) => {
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const operatorEmail = currentUser?.email || 'admin@ainewsmaker.online';
  const operatorName = currentUser?.displayName || currentUser?.name || currentUser?.fullName || operatorEmail.split('@')[0];

  // Helper: Format timestamp in Indian Standard Time (IST)
  const formatTime = (ms?: number) => {
    if (!ms || isNaN(ms)) return '';
    try {
      const d = new Date(ms);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('hi-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
      return d.toLocaleDateString('hi-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  const formatFullDate = (ms?: number) => {
    if (!ms || isNaN(ms)) return '';
    try {
      return new Date(ms).toLocaleString('hi-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  // Fetch Conversation List
  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoadingList(true);
    try {
      const queryParams = new URLSearchParams();
      if (filter !== 'all') queryParams.append('filter', filter);
      if (search) queryParams.append('search', search);

      const res = await fetch(`/api/admin/whatsapp/conversations?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);

        // Calculate counts
        let unread = 0;
        let waiting = 0;
        let human = 0;
        let ai = 0;
        data.conversations.forEach((c: any) => {
          if (c.unreadCount > 0) unread++;
          if (c.handlingMode === 'waiting_human') waiting++;
          else if (c.handlingMode === 'human') human++;
          else ai++;
        });
        setStats({ total: data.conversations.length, unread, waitingHuman: waiting, human, ai });

        // Update selected conversation if open
        if (selectedConvId) {
          const updatedSelected = data.conversations.find((c: any) => c.conversationId === selectedConvId);
          if (updatedSelected) {
            setSelectedConv(updatedSelected);
          }
        }
      }
    } catch (err: any) {
      console.warn('[LiveInbox] Error fetching conversations:', err.message);
    } finally {
      if (!silent) setIsLoadingList(false);
    }
  };

  // Fetch Chronological Messages for Selected Conversation
  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${convId}/messages?limit=150`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err: any) {
      console.warn('[LiveInbox] Error fetching messages:', err.message);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // Select a conversation
  const handleSelectConversation = (conv: any) => {
    setSelectedConvId(conv.conversationId);
    setSelectedConv(conv);
    fetchMessages(conv.conversationId);

    // Mark as read on backend if unreadCount > 0
    if (conv.unreadCount > 0) {
      fetch(`/api/admin/whatsapp/conversations/${conv.conversationId}/mark-read`, {
        method: 'POST',
      }).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  // Change Handling Mode (AI <-> Human <-> Waiting)
  const handleChangeMode = async (newMode: 'ai' | 'human' | 'waiting_human') => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          text:
            newMode === 'human'
              ? 'ह्यूमन टेकओवर सक्रिय: AI स्वचालित उत्तर बंद कर दिए गए हैं।'
              : newMode === 'ai'
              ? 'AI नियंत्रण पुनः सक्रिय: बॉट स्वचालित सहायता प्रदान करेगा।'
              : 'वार्तालाप सहायता प्रतीक्षा सूची में स्थानांतरित।',
        });
        setSelectedConv((prev: any) => (prev ? { ...prev, handlingMode: newMode } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === selectedConvId ? { ...c, handlingMode: newMode } : c))
        );
      } else {
        setActionNotice({ type: 'error', text: data.error || 'मोड बदलने में विफल' });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'त्रुटि' });
    }
  };

  // Assign conversation to operator
  const handleAssignOperator = async (assignToMe = true) => {
    if (!selectedConvId) return;
    try {
      const endpoint = assignToMe
        ? `/api/admin/whatsapp/conversations/${selectedConvId}/assign`
        : `/api/admin/whatsapp/conversations/${selectedConvId}/unassign`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          assignToMe
            ? {
                operatorId: operatorEmail,
                operatorName,
                operatorEmail,
              }
            : {}
        ),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          text: assignToMe
            ? `वार्तालाप आपको (${operatorName}) असाइन हो गया है।`
            : 'वार्तालाप अनअसाइन कर दिया गया है।',
        });
        const updates: any = assignToMe
          ? {
              assignedOperatorId: operatorEmail,
              assignedOperatorName: operatorName,
              handlingMode: 'human',
            }
          : {
              assignedOperatorId: null,
              assignedOperatorName: null,
            };

        setSelectedConv((prev: any) => (prev ? { ...prev, ...updates } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === selectedConvId ? { ...c, ...updates } : c))
        );
      } else {
        setActionNotice({ type: 'error', text: data.error || 'असाइनमेंट में विफल' });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'त्रुटि' });
    }
  };

  // Close Conversation
  const handleCloseConversation = async () => {
    if (!selectedConvId) return;
    if (!window.confirm('क्या आप इस वार्तालाप को समाप्त (Close) करना चाहते हैं?')) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}/close`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', text: 'वार्तालाप सफलतापूर्वक समाप्त (Closed) कर दिया गया।' });
        setSelectedConv((prev: any) => (prev ? { ...prev, status: 'closed' } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === selectedConvId ? { ...c, status: 'closed' } : c))
        );
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'त्रुटि' });
    }
  };

  // Send Operator Reply
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = replyText.trim();
    if (!textToSend || !selectedConvId || isSending) return;

    setIsSending(true);
    setActionNotice(null);

    // Optimistic idempotency key
    const idempotencyKey = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        // Add message optimistically or refresh
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
        // Focus back on input
        if (replyInputRef.current) {
          replyInputRef.current.focus();
        }
      } else {
        setActionNotice({
          type: 'error',
          text: data.error || 'संदेश भेजने में त्रुटि हुई।',
        });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'नेटवर्क त्रुटि' });
    } finally {
      setIsSending(false);
    }
  };

  // Polling & mounting effects
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) {
        fetchMessages(selectedConvId, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [filter, search, selectedConvId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 24-Hour Window Calculation
  const lastInboundAt = Number(selectedConv?.lastInboundAt || 0);
  const hoursSinceLastInbound = lastInboundAt > 0 ? (Date.now() - lastInboundAt) / (1000 * 3600) : 999;
  const isWithin24hWindow = hoursSinceLastInbound <= 24;

  const quickReplies = [
    '🙏 नमस्कार! AI News Maker सहायता केंद्र में आपका स्वागत है। बताइए, हम आपकी क्या सहायता कर सकते हैं?',
    '✅ आपकी समस्या दर्ज कर ली गई है। हमारी तकनीकी टीम इसकी जाँच कर रही है।',
    '📊 आपका दैनिक डाउनलोड कोटा रीसेट कर दिया गया है। कृपया पुनः प्रयास करें।',
    '🔐 क्या आप अपनी पंजीकृत ईमेल आईडी साझा कर सकते हैं?',
    '🎉 बधाई! आपका प्लान सफलतापूर्वक अपडेट कर दिया गया है।',
  ];

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[780px] max-h-[85vh]">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md">
            <MessageSquare className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                WhatsApp AI कमांड सेंटर — लाइव सपोर्ट इनबॉक्स
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                Phase 1B Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              रीयल-टाइम सपोर्ट, ह्यूमन टेकओवर गार्ड व डिलीवरी ट्रैकिंग
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
            onClick={() => fetchConversations()}
            disabled={isLoadingList}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer"
            title="रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (2 Columns) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col shrink-0 bg-slate-900/60">
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
              प्रतीक्षारत ({stats.waitingHuman})
            </button>
            <button
              type="button"
              onClick={() => setFilter('human')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                filter === 'human'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              AI बॉट ({stats.ai})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unassigned')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                filter === 'unassigned'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              अनअसाइंड
            </button>
          </div>

          {/* Conversations List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {isLoadingList ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                    <span>वार्तालाप लोड हो रहे हैं...</span>
                  </div>
                ) : (
                  <span>कोई वार्तालाप नहीं मिला।</span>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.conversationId === selectedConvId;
                const mode = conv.handlingMode || 'ai';
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-850 border-l-4 border-amber-400'
                        : 'hover:bg-slate-850/60'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-xs shadow">
                        {conv.customer?.fullName ? (
                          conv.customer.fullName.slice(0, 2).toUpperCase()
                        ) : (
                          <User className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      {/* Handling Mode indicator badge */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          mode === 'human'
                            ? 'bg-emerald-500'
                            : mode === 'waiting_human'
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-blue-500'
                        }`}
                        title={
                          mode === 'human'
                            ? 'ह्यूमन हैंडलिंग'
                            : mode === 'waiting_human'
                            ? 'सहायता प्रतीक्षारत'
                            : 'AI बॉट'
                        }
                      />
                    </div>

                    {/* Conversation Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-black text-white truncate">
                          {conv.customerName || conv.customerPhone}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 truncate">
                        <span className="font-mono text-slate-400 shrink-0">
                          +{conv.customerPhone}
                        </span>
                        {conv.customer?.isLinked && (
                          <span className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/30">
                            लिंक्ड
                          </span>
                        )}
                        {conv.customer?.tier && (
                          <span className="px-1.5 py-0.2 bg-amber-950/80 text-amber-300 text-[9px] font-black rounded border border-amber-500/30 uppercase">
                            {conv.customer.tier}
                          </span>
                        )}
                      </div>

                      {/* Last Message Preview & Status checkmark */}
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-slate-300 truncate leading-snug">
                          {conv.lastMessageDirection === 'outbound' && (
                            <span className="text-slate-400 mr-1">आप:</span>
                          )}
                          {conv.lastMessagePreview || 'कोई संदेश नहीं'}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Outbound delivery status checkmark */}
                          {conv.lastMessageDirection === 'outbound' && (
                            <span title={`स्थिति: ${conv.lastMessageStatus || 'sent'}`}>
                              {conv.lastMessageStatus === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                              ) : conv.lastMessageStatus === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              ) : conv.lastMessageStatus === 'failed' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                          )}

                          {/* Unread badge */}
                          {conv.unreadCount > 0 && (
                            <span className="min-w-4 h-4 px-1 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Console */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {!selectedConvId || !selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-400 shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-300 mb-1">
                कोई वार्तालाप नहीं चुना गया
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                ग्राहक संदेश देखने, रीयल-टाइम उत्तर देने अथवा ह्यूमन टेकओवर करने के लिए बाएँ पैनल से किसी वार्तालाप पर क्लिक करें।
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Top Bar */}
              <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Customer Details Pill */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-sm shadow">
                    {selectedConv.customer?.fullName ? (
                      selectedConv.customer.fullName.slice(0, 2).toUpperCase()
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">
                        {selectedConv.customerName || selectedConv.customerPhone}
                      </span>
                      {selectedConv.customer?.isLinked ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          सत्यापित अकाउंट
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-slate-700">
                          अनलिक्ड फ़ोन
                        </span>
                      )}
                      {selectedConv.customer?.planName && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded border border-amber-500/30">
                          {selectedConv.customer.planName} PLAN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono">+{selectedConv.customerPhone}</span>
                      {selectedConv.customerEmail && (
                        <span>• {selectedConv.customerEmail}</span>
                      )}
                      {selectedConv.customer?.remainingToday !== undefined && (
                        <span className="text-amber-400">
                          • आज के शेष ग्राफिक: {selectedConv.customer.remainingToday}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mode Controller & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Badge & Switchers */}
                  {selectedConv.handlingMode === 'human' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ह्यूमन मोड (AI बंद)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChangeMode('ai')}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1"
                        title="वापस AI नियंत्रण में दें"
                      >
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                        <span>AI को सौंपें</span>
                      </button>
                    </div>
                  ) : selectedConv.handlingMode === 'waiting_human' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-red-950 border border-red-500 text-red-200 text-xs font-bold rounded-xl animate-pulse flex items-center gap-1.5 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span>सहायता प्रतीक्षारत</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignOperator(true);
                          handleChangeMode('human');
                        }}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>वार्तालाप स्वीकारें (Accept)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-blue-950 border border-blue-500 text-blue-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                        <span>AI बॉट सक्रिय</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignOperator(true);
                          handleChangeMode('human');
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1"
                        title="ह्यूमन टेकओवर: AI को रोकें और स्वयं चैट संभालें"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ह्यूमन टेकओवर</span>
                      </button>
                    </div>
                  )}

                  {/* Operator Assignment Status */}
                  {selectedConv.assignedOperatorName ? (
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedConv.assignedOperatorName}</span>
                      <button
                        type="button"
                        onClick={() => handleAssignOperator(false)}
                        className="ml-1 text-slate-400 hover:text-red-400"
                        title="अनअसाइन करें"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAssignOperator(true)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      मुझे असाइन करें
                    </button>
                  )}

                  {/* Close conversation button */}
                  {selectedConv.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={handleCloseConversation}
                      className="px-2.5 py-1 bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 text-slate-400 text-xs font-bold rounded-xl border border-slate-700/80 transition cursor-pointer"
                      title="वार्तालाप बंद करें"
                    >
                      समाप्त (Close)
                    </button>
                  )}
                </div>
              </div>

              {/* Action Banner Notice */}
              {actionNotice && (
                <div
                  className={`px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 border-b animate-in fade-in ${
                    actionNotice.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/80 border-red-500/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {actionNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{actionNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionNotice(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Messages Chat History Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-950/60">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center p-8 text-slate-500 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>संदेश लोड हो रहे हैं...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 text-xs">
                    इस वार्तालाप में अभी तक कोई संदेश रिकॉर्ड नहीं है।
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isOperator = msg.senderType === 'human_operator';
                    const isSystem = msg.senderType === 'system';

                    return (
                      <div
                        key={msg.messageId || idx}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-md whitespace-pre-wrap leading-relaxed ${
                            isOutbound
                              ? isOperator
                                ? 'bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-br-none border border-emerald-600/40'
                                : isSystem
                                ? 'bg-slate-800 text-slate-200 rounded-br-none border border-slate-700'
                                : 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-br-none border border-blue-700/40'
                              : 'bg-slate-850 text-slate-100 rounded-bl-none border border-slate-700/80'
                          }`}
                        >
                          {/* Sender label */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold mb-1 opacity-75">
                            {isOutbound ? (
                              isOperator ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>ऑपरेटर: {msg.senderName || 'सपोर्ट टीम'}</span>
                                </>
                              ) : isSystem ? (
                                <>
                                  <Info className="w-3 h-3" />
                                  <span>सिस्टम सूचना</span>
                                </>
                              ) : (
                                <>
                                  <Bot className="w-3 h-3" />
                                  <span>AI सपोर्ट बॉट</span>
                                </>
                              )
                            ) : (
                              <>
                                <Phone className="w-3 h-3" />
                                <span>ग्राहक (+{msg.waId || selectedConv.customerPhone})</span>
                              </>
                            )}
                          </div>

                          {/* Message Body */}
                          <div className="break-words">{msg.text}</div>

                          {/* Message Footer: Timestamp & Delivery checkmark */}
                          <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75">
                            <span>{formatTime(msg.timestamp)}</span>

                            {isOutbound && (
                              <span
                                title={`डिलीवरी स्थिति: ${msg.status || 'sent'}`}
                                className="inline-flex items-center"
                              >
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                ) : msg.status === 'failed' ? (
                                  <span className="text-red-300 flex items-center gap-0.5" title="डिलीवरी विफल">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>विफल</span>
                                  </span>
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Bar */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-slate-500 text-[10px] font-bold uppercase shrink-0">
                  त्वरित उत्तर:
                </span>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shrink-0 border border-slate-700 transition truncate max-w-[200px]"
                    title={qr}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* 24-Hour Policy Window Banner */}
              <div
                className={`px-4 py-2 text-[11px] font-bold flex items-center gap-2 border-t ${
                  isWithin24hWindow
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/70 border-amber-500/40 text-amber-200'
                }`}
              >
                {isWithin24hWindow ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      24-घंटे की ग्राहक सेवा विंडो सक्रिय है (फ्री-फॉर्म टेक्स्ट उत्तर भेजा जा सकता है)।
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      24-घंटे की ग्राहक सेवा विंडो समाप्त हो चुकी है (अंतिम ग्राहक संदेश:{' '}
                      {formatFullDate(lastInboundAt) || 'अज्ञात'})। Meta नीति के अनुसार केवल पूर्व-स्वीकृत टेम्पलेट संदेश ही भेजा जा सकता है।
                    </span>
                  </>
                )}
              </div>

              {/* Operator Reply Input Box */}
              <form onSubmit={handleSendReply} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-end gap-2 shrink-0">
                <div className="flex-1 relative">
                  <textarea
                    ref={replyInputRef}
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={
                      !isWithin24hWindow
                        ? '24 घंटे की समय सीमा समाप्त होने के कारण फ्री-फॉर्म संदेश अवरुद्ध है।'
                        : 'यहाँ अपना उत्तर लिखें... (Ctrl+Enter से भेजें)'
                    }
                    disabled={!isWithin24hWindow || isSending}
                    className="w-full p-2.5 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 transition resize-none disabled:opacity-50"
                  />
                  <div className="absolute right-2.5 bottom-2 text-[10px] text-slate-500">
                    {replyText.length}/4096
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isWithin24hWindow || !replyText.trim() || isSending}
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
    </div>
  );
};
