import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bell,
  Send,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Radio,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { getApiUrl, getAuthHeaders } from '../lib/apiConfig';
import { getPlanUsers, PlanUserRecord } from '../lib/userPlanManager';
import { addNotification, playNormalNotificationSound } from '../lib/notificationManager';
import { NewsFeedPost } from '../data/newsFeedData';

interface WebNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: NewsFeedPost | null;
  currentUserEmail?: string;
  onNotificationSent?: (postId: string, status: 'sent' | 'failed' | 'partial') => void;
}

export const WebNotificationModal: React.FC<WebNotificationModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUserEmail = '',
  onNotificationSent,
}) => {
  const [targetAudience, setTargetAudience] = useState<'all' | 'basic' | 'advance' | 'pro' | 'vip' | 'selected'>('all');
  const [notificationTitle, setNotificationTitle] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [isBreakingAlert, setIsBreakingAlert] = useState<boolean>(true);
  const [playChime, setPlayChime] = useState<boolean>(true);

  // User Selection
  const [allUsers, setAllUsers] = useState<PlanUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Dispatch States
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    totalRecipients: number;
    message?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pre-fill from post
  useEffect(() => {
    if (post) {
      setNotificationTitle(post.title ? `🚨 ब्रेकिंग न्यूज़: ${post.title.slice(0, 60)}` : '🚨 ब्रेकिंग न्यूज़ अलर्ट');
      setNotificationMessage(post.summary ? post.summary.slice(0, 160) : (post.content || '').slice(0, 160));
      setIsBreakingAlert(Boolean(post.breaking));
    }
  }, [post]);

  // Load users for targeting
  useEffect(() => {
    if (!isOpen) return;
    try {
      const users = getPlanUsers();
      if (Array.isArray(users) && users.length > 0) {
        setAllUsers(users);
      }
    } catch {}

    fetch(getApiUrl('/api/users'), {
      headers: { ...getAuthHeaders() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllUsers(data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Filtered users for selection list
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const q = searchQuery.toLowerCase().trim();
    return allUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.channelName && u.channelName.toLowerCase().includes(q))
    );
  }, [allUsers, searchQuery]);

  // Calculate estimated recipients
  const estimatedRecipientsCount = useMemo(() => {
    if (targetAudience === 'selected') {
      return selectedEmails.size;
    }
    if (targetAudience === 'all') {
      return allUsers.length > 0 ? allUsers.length : 1;
    }
    const filtered = allUsers.filter((u) => {
      const t = (u.plan || (u as any).tier || 'basic').toLowerCase().trim();
      if (targetAudience === 'vip') return t === 'vip' || t === 'ultra';
      if (targetAudience === 'advance') return t === 'advance' || t === 'advanced';
      return t === targetAudience;
    });
    return filtered.length;
  }, [allUsers, targetAudience, selectedEmails]);

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedEmails);
    filteredUsers.forEach((u) => {
      if (u.email) next.add(u.email.toLowerCase().trim());
    });
    setSelectedEmails(next);
  };

  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };

  const toggleSelectUser = (email: string) => {
    const clean = email.toLowerCase().trim();
    const next = new Set(selectedEmails);
    if (next.has(clean)) {
      next.delete(clean);
    } else {
      next.add(clean);
    }
    setSelectedEmails(next);
  };

  const handleDispatchNotification = async () => {
    if (!notificationTitle.trim()) {
      setErrorMsg('कृपया नोटिफिकेशन का शीर्षक दर्ज करें।');
      return;
    }
    setErrorMsg('');
    setIsSending(true);
    setConfirmSendOpen(false);

    try {
      const payload = {
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        newsId: post?.id || `news_${Date.now()}`,
        postId: post?.id || `news_${Date.now()}`,
        category: post?.category || 'breaking',
        imageUrl: post?.manualThumbnailUrl || post?.imageUrl || (post as any)?.image || '',
        linkTab: 'home',
        targetAudience,
        targetUserEmail: targetAudience === 'selected' ? Array.from(selectedEmails).join(',') : targetAudience,
        createdAt: Date.now(),
      };

      const res = await fetch(getApiUrl('/api/notifications/broadcast'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-admin-email': currentUserEmail || 'admin.ainewsmaker@gmail.com',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Broadcast in client notification manager
        addNotification({
          title: payload.title,
          message: payload.message,
          newsId: payload.newsId,
          postId: payload.postId,
          linkTab: 'home',
          time: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
        });

        if (playChime) {
          playNormalNotificationSound();
        }

        setDispatchResult({
          success: true,
          totalRecipients: estimatedRecipientsCount,
          message: `वेब नोटिफिकेशन सफलतापूर्वक प्रेषित किया गया (${estimatedRecipientsCount} पात्र यूज़र्स को डिलीवर हुआ)`,
        });

        if (onNotificationSent && post?.id) {
          onNotificationSent(post.id, 'sent');
        }
      } else {
        setErrorMsg(data.error || 'वेब नोटिफिकेशन भेजने में विफलता');
        setDispatchResult({
          success: false,
          totalRecipients: 0,
          message: data.error || 'विफलता',
        });
        if (onNotificationSent && post?.id) {
          onNotificationSent(post.id, 'failed');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'नेटवर्क त्रुटि: वेब नोटिफिकेशन सर्वर तक नहीं पहुँचा');
      if (onNotificationSent && post?.id) {
        onNotificationSent(post.id, 'failed');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Bell className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">वेब ब्रेकिंग न्यूज़ नोटिफिकेशन</h3>
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded uppercase">
                  Web Push
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">वेबसाइट व PWA उपयोगकर्ताओं को तुरंत इन-ऐप व ब्रेकिंग अलर्ट भेजें</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {dispatchResult && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{dispatchResult.message}</span>
              </div>
              <p className="text-xs text-slate-300">
                यह नोटिफिकेशन तुरंत लाइव एक्टिव यूज़र्स के नोटिफिकेशन सेंटर और अलर्ट्स में सुरक्षित कर दिया गया है।
              </p>
            </div>
          )}

          {/* Attached News Article Preview */}
          {post && (
            <div className="p-3.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  चयनित खबर विवरण (News ID: {post.id})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {post.publishedTime || 'अभी'}
                </span>
              </div>
              <div className="flex gap-3 items-center">
                {(post.manualThumbnailUrl || post.imageUrl || (post as any).image) && (
                  <img
                    src={post.manualThumbnailUrl || post.imageUrl || (post as any).image}
                    alt="Article"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{post.title}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{post.summary || post.content}</div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Title & Body */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                नोटिफिकेशन शीर्षक (Title) *
              </label>
              <input
                type="text"
                required
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="उदा. 🚨 ब्रेकिंग न्यूज़: बड़ी खबर अभी-अभी..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-400 focus:outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                नोटिफिकेशन संदेश / सारांश (Message)
              </label>
              <textarea
                rows={3}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="संक्षिप्त विवरण दर्ज करें जो यूज़र्स के डिवाइस पर दिखेगा..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-indigo-400 focus:outline-hidden leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-indigo-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBreakingAlert}
                  onChange={(e) => setIsBreakingAlert(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span>🚨 हाई-प्रायोरिटी ब्रेकिंग अलर्ट बनाएं</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="checkbox"
                  checked={playChime}
                  onChange={(e) => setPlayChime(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span>ऑडियो नोटिफिकेशन चाइम बजाएं</span>
              </label>
            </div>
          </div>

          {/* Target Audience Selector */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>लक्षित ऑडियंस (Target Audience)</span>
              </label>
              <span className="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                अनुमानित प्राप्तकर्ता: {estimatedRecipientsCount}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'all', label: 'सभी यूज़र्स (All)' },
                { id: 'basic', label: 'बेसिक प्लान (Basic)' },
                { id: 'advance', label: 'एडवांस प्लान (Advance)' },
                { id: 'pro', label: 'प्रो प्लान (Pro)' },
                { id: 'vip', label: 'वीआईपी / अल्ट्रा (VIP)' },
                { id: 'selected', label: 'विशिष्ट यूज़र्स चुनें' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetAudience(opt.id as any)}
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer text-left ${
                    targetAudience === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 shrink-0 ${targetAudience === opt.id ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[11px] truncate">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Individual Users Selector if targetAudience === 'selected' */}
            {targetAudience === 'selected' && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="नाम, ईमेल या मोबाइल से खोजें..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] shrink-0 font-bold">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded cursor-pointer"
                    >
                      सभी चुनें
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded cursor-pointer"
                    >
                      हटाएं
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">कोई यूज़र नहीं मिला</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const email = (u.email || '').toLowerCase().trim();
                      const isChecked = selectedEmails.has(email);
                      return (
                        <div
                          key={u.id || email}
                          onClick={() => toggleSelectUser(email)}
                          className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-950/50 border-indigo-500/60 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold truncate text-[11px]">{u.name || 'User'}</div>
                              <div className="text-[10px] text-slate-400 truncate">{email}</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                            {u.plan || (u as any).tier || 'basic'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            रद्द करें
          </button>

          <button
            type="button"
            disabled={isSending || !notificationTitle.trim()}
            onClick={() => setConfirmSendOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>प्रेषित हो रहा है...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>वेब नोटिफिकेशन भेजें ({estimatedRecipientsCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-slate-900 border border-indigo-500 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 text-indigo-400">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              <h4 className="text-sm font-black text-white">पुष्टि करें: वेब नोटिफिकेशन अभियान</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              क्या आप वाकई यह वेब नोटिफिकेशन <strong className="text-white font-bold">{estimatedRecipientsCount} लक्षित यूज़र्स</strong> को भेजना चाहते हैं?
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-indigo-300 font-bold">{notificationTitle}</div>
              <div className="text-slate-400 text-[11px] line-clamp-2">{notificationMessage}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleDispatchNotification}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg shadow cursor-pointer transition flex items-center gap-1.5"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>हाँ, नोटिफिकेशन भेजें</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
