import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Phone,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { getApiUrl, getAuthHeaders } from '../lib/apiConfig';
import { getPlanUsers, PlanUserRecord } from '../lib/userPlanManager';

export interface WhatsAppNotificationArticle {
  id?: string;
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  url?: string;
  imageUrl?: string;
}

interface WhatsAppNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedArticle?: WhatsAppNotificationArticle | null;
  currentUserEmail?: string;
}

export const WhatsAppNotificationCenterModal: React.FC<WhatsAppNotificationCenterModalProps> = ({
  isOpen,
  onClose,
  attachedArticle,
  currentUserEmail = '',
}) => {
  const [targetAudience, setTargetAudience] = useState<'all' | 'basic' | 'advance' | 'pro' | 'vip' | 'selected' | 'custom'>('all');
  const [category, setCategory] = useState<string>('Breaking News');
  const [headline, setHeadline] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [articleUrl, setArticleUrl] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [testPhone, setTestPhone] = useState<string>('');
  const [customNumbersText, setCustomNumbersText] = useState<string>('');
  
  // User Selection
  const [allUsers, setAllUsers] = useState<PlanUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Campaign State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState<boolean>(false);
  const [campaignResult, setCampaignResult] = useState<{
    success: boolean;
    totalRecipients: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    message?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pre-fill from attached article
  useEffect(() => {
    if (attachedArticle) {
      setHeadline(attachedArticle.title || '');
      setSummary(attachedArticle.summary || attachedArticle.content?.slice(0, 180) || '');
      setCategory(attachedArticle.breaking ? 'Breaking News' : attachedArticle.category || 'Breaking News');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ainewsmaker.online';
      setArticleUrl(attachedArticle.id ? `${baseUrl}/studio?newsId=${encodeURIComponent(attachedArticle.id)}` : `${baseUrl}/studio`);
    }
  }, [attachedArticle]);

  // Load registered users
  useEffect(() => {
    if (!isOpen) return;
    try {
      const users = getPlanUsers();
      setAllUsers(users);
    } catch {}

    fetch(getApiUrl('/api/users'), {
      headers: { ...getAuthHeaders() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllUsers(data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Filtered users for selection list
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allUsers.filter((u) => {
      const name = (u.fullName || u.name || '').toLowerCase();
      const em = (u.email || '').toLowerCase();
      const ph = (u.whatsappNumber || u.mobileNumber || u.mobile || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || em.includes(q) || ph.includes(q);

      if (targetAudience === 'all' || targetAudience === 'selected') return matchesSearch;
      const tier = (u.tier || 'basic').toLowerCase();
      if (targetAudience === 'vip') return matchesSearch && (tier === 'ultra' || tier === 'vip');
      return matchesSearch && tier === targetAudience;
    });
  }, [allUsers, searchQuery, targetAudience]);

  // Recipient count calculation
  const calculatedRecipientCount = useMemo(() => {
    if (targetAudience === 'custom') {
      return customNumbersText
        .split(/[,\n\s]+/)
        .map((s) => s.replace(/\D/g, '').slice(-10))
        .filter((s) => s.length === 10).length;
    }
    if (targetAudience === 'selected') {
      return selectedEmails.size;
    }
    return filteredUsers.filter((u) => {
      const ph = (u.whatsappNumber || u.mobileNumber || u.mobile || '').replace(/\D/g, '').slice(-10);
      return ph.length === 10;
    }).length;
  }, [targetAudience, customNumbersText, selectedEmails, filteredUsers]);

  const handleSelectAll = () => {
    const next = new Set<string>();
    filteredUsers.forEach((u) => {
      if (u.email) next.add(u.email.toLowerCase().trim());
    });
    setSelectedEmails(next);
  };

  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };

  const toggleUserEmail = (email: string) => {
    const clean = email.toLowerCase().trim();
    const next = new Set(selectedEmails);
    if (next.has(clean)) next.delete(clean);
    else next.add(clean);
    setSelectedEmails(next);
  };

  // Live Message Preview
  const previewText = useMemo(() => {
    let p = '';
    const isBreaking = attachedArticle?.breaking || category === 'Breaking News';
    if (isBreaking) {
      p += `🔴 *ब्रेकिंग न्यूज़ — तुरंत ग्राफिक बनाएं*\n\n`;
    }
    if (headline.trim()) p += `🚨 *${headline.trim()}*\n\n`;
    if (summary.trim()) p += `${summary.trim()}\n\n`;
    if (customMessage.trim()) p += `${customMessage.trim()}\n\n`;
    if (articleUrl.trim()) p += `✨ *इस खबर से ग्राफिक बनाएं:*\n${articleUrl.trim()}\n\n`;
    p += `_AI News Maker (ब्रेकिंग न्यूज़ वाला) - आधिकारिक समाचार सेवा_\n_नोटिफिकेशन रोकने के लिए STOP लिखें_`;
    return p;
  }, [headline, summary, customMessage, articleUrl, attachedArticle, category]);

  // Send Test Message
  const handleSendTestMessage = async () => {
    const cleanTest = testPhone.replace(/\D/g, '').slice(-10);
    if (cleanTest.length !== 10) {
      alert('कृपया वैध 10-अंकों का टेस्ट WhatsApp नंबर दर्ज करें।');
      return;
    }
    setIsSendingTest(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/whatsapp/campaign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-admin-email': currentUserEmail,
          'x-user-role': 'superadmin',
        },
        body: JSON.stringify({
          testPhone: cleanTest,
          headline,
          summary,
          customMessage,
          articleUrl,
          category,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ टेस्ट मैसेज +91 ${cleanTest} पर सफलतापूर्वक भेज दिया गया है!`);
      } else {
        alert(data.error || 'टेस्ट मैसेज भेजने में समस्या आई');
      }
    } catch (err: any) {
      alert('टेस्ट मैसेज भेजने में विफलता: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Launch Campaign
  const handleLaunchCampaign = async () => {
    setConfirmSendOpen(false);
    setIsSending(true);
    setErrorMsg('');
    setCampaignResult(null);

    const customList = targetAudience === 'custom'
      ? customNumbersText.split(/[,\n\s]+/).map((s) => s.replace(/\D/g, '').slice(-10)).filter((s) => s.length === 10)
      : [];

    try {
      const res = await fetch(getApiUrl('/api/admin/whatsapp/campaign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-admin-email': currentUserEmail,
          'x-user-role': 'superadmin',
        },
        body: JSON.stringify({
          targetAudience,
          targetUserEmails: Array.from(selectedEmails),
          customNumbers: customList,
          category,
          headline,
          summary,
          customMessage,
          articleUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCampaignResult({
          success: true,
          totalRecipients: data.totalRecipients || 0,
          successfulDeliveries: data.successfulDeliveries || 0,
          failedDeliveries: data.failedDeliveries || 0,
          message: 'व्हाट्सएप नोटिफिकेशन कैंपेन सफलतापूर्वक पूरा हुआ!',
        });
      } else {
        setErrorMsg(data.error || 'कैंपेन भेजने में विफलता आई');
      }
    } catch (err: any) {
      setErrorMsg('नेटवर्क त्रुटि: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  WhatsApp Notification Center
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Admin Panel</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                आधिकारिक WhatsApp (+1 555-706-1955) से सत्यापित पाठकों व पत्रकारों को समाचार अलर्ट भेजें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Result Alert */}
          {campaignResult && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>कैंपेन सफलतापूर्वक निष्पादित हुआ!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">कुल प्राप्तकर्ता</span>
                  <span className="font-bold text-white text-base">{campaignResult.totalRecipients}</span>
                </div>
                <div className="p-2 bg-emerald-900/40 border border-emerald-700/50 rounded-lg">
                  <span className="text-emerald-300 block text-[10px]">सफल डिलीवरी</span>
                  <span className="font-bold text-emerald-400 text-base">{campaignResult.successfulDeliveries}</span>
                </div>
                <div className="p-2 bg-rose-900/40 border border-rose-700/50 rounded-lg">
                  <span className="text-rose-300 block text-[10px]">विफल</span>
                  <span className="font-bold text-rose-400 text-base">{campaignResult.failedDeliveries}</span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: TARGET AUDIENCE & RECIPIENTS */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                <span>1. लक्षित दर्शक (Target Audience)</span>
              </label>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                चयनित प्राप्तकर्ता: <b>{calculatedRecipientCount}</b>
              </span>
            </div>

            {/* Audience Radios */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'सभी पात्र उपयोगकर्ता' },
                { id: 'basic', label: 'Basic प्लान' },
                { id: 'advance', label: 'Advanced प्लान' },
                { id: 'pro', label: 'Pro प्लान' },
                { id: 'vip', label: 'VIP Desk' },
                { id: 'selected', label: 'व्यक्तिगत चयन (Manual)' },
                { id: 'custom', label: 'कस्टम नंबर लिस्ट' },
              ].map((aud) => (
                <button
                  key={aud.id}
                  type="button"
                  onClick={() => setTargetAudience(aud.id as any)}
                  className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer ${
                    targetAudience === aud.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${targetAudience === aud.id ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className="truncate">{aud.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Numbers Textarea */}
            {targetAudience === 'custom' && (
              <div className="pt-2 space-y-1 animate-in fade-in">
                <label className="text-[11px] font-bold text-slate-300">
                  WhatsApp मोबाइल नंबर दर्ज करें (अल्पविराम या नई पंक्ति से अलग करें):
                </label>
                <textarea
                  rows={3}
                  value={customNumbersText}
                  onChange={(e) => setCustomNumbersText(e.target.value)}
                  placeholder="9876543210, 9123456789, 9988776655..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-emerald-400 focus:outline-hidden"
                />
              </div>
            )}

            {/* Manual User Selection Table */}
            {targetAudience === 'selected' && (
              <div className="pt-2 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="नाम, ईमेल या नंबर से खोजें..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    सभी चुनें
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    हटाएं
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/60 divide-y divide-slate-800/60 text-xs">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-slate-500">कोई उपयोगकर्ता नहीं मिला</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const em = (u.email || '').toLowerCase().trim();
                      const isSelected = selectedEmails.has(em);
                      const ph = u.whatsappNumber || u.mobileNumber || u.mobile || '—';
                      return (
                        <div
                          key={em || u.userId}
                          onClick={() => toggleUserEmail(em)}
                          className={`p-2.5 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition ${
                            isSelected ? 'bg-emerald-950/40 text-emerald-200' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-white">{u.fullName || u.name || 'यूज़र'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{em}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-emerald-400 text-xs font-bold">{ph}</span>
                            <span className="block text-[9px] uppercase text-amber-400 font-bold">{u.planName || u.tier || 'BASIC'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: CATEGORY & MESSAGE COMPOSITION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. संदेश विवरण (Message Details)</span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">समाचार श्रेणी (Category):</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                >
                  <option value="Breaking News">🚨 Breaking News (ब्रेकिंग न्यूज़)</option>
                  <option value="National">🇮🇳 National (राष्ट्रीय)</option>
                  <option value="State">🏛️ State / Regional (राज्य / प्रादेशिक)</option>
                  <option value="Politics">🗳️ Politics (राजनीति)</option>
                  <option value="Sports">🏏 Sports (खेल)</option>
                  <option value="Business">📈 Business / Finance (व्यापार)</option>
                  <option value="Technology">💻 Technology / AI (तकनीक)</option>
                  <option value="Product Updates">⚡ AI News Maker Updates (उत्पाद अपडेट)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">समाचार हेडलाइन (Headline):</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="मुख्य खबर की हेडलाइन दर्ज करें..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">संक्षिप्त विवरण (Summary):</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="खबर का मुख्य विवरण (2-3 पंक्तियों में)..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">अतिरिक्त संदेश (Custom Message):</label>
                <textarea
                  rows={2}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="उदा. AI News Maker पर अभी पढ़ें और अपनी रील तैयार करें..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">खबर लिंक (Article URL):</label>
                <input
                  type="text"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  placeholder="https://ainewsmaker.online/news/..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* LIVE WHATSAPP MESSAGE PREVIEW */}
            <div className="space-y-3">
              <label className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Phone className="w-3.5 h-3.5" />
                <span>लाइव WhatsApp पूर्वावलोकन (Preview)</span>
              </label>

              <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-700 shadow-inner flex flex-col justify-between min-h-[300px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WhatsApp Sender: <b>+1 555-706-1955</b></span>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-none text-xs leading-relaxed shadow space-y-1.5 whitespace-pre-wrap font-sans">
                    {previewText}
                    <div className="text-[10px] text-emerald-200/60 text-right">
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>

                {/* Test Send Box */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 block">
                    🧪 टेस्ट मैसेज भेजकर सत्यापित करें:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      maxLength={10}
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-अंकों का टेस्ट WhatsApp नंबर"
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-400 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestMessage}
                      disabled={isSendingTest || testPhone.replace(/\D/g, '').length !== 10}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isSendingTest || testPhone.replace(/\D/g, '').length !== 10
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                      }`}
                    >
                      {isSendingTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>टेस्ट भेजें</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            लक्षित प्राप्तकर्ता: <b className="text-emerald-400 font-bold">{calculatedRecipientCount}</b>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>

            <button
              type="button"
              onClick={() => {
                if (calculatedRecipientCount === 0) {
                  alert('कम से कम एक वैध प्राप्तकर्ता आवश्यक है।');
                  return;
                }
                if (!headline.trim()) {
                  alert('कृपया खबर की हेडलाइन दर्ज करें।');
                  return;
                }
                setConfirmSendOpen(true);
              }}
              disabled={isSending || calculatedRecipientCount === 0 || !headline.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 transition ${
                isSending || calculatedRecipientCount === 0 || !headline.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 cursor-pointer active:scale-95 shadow-emerald-500/20'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>भेजा जा रहा है...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>कैंपेन भेजें (Send Campaign)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Final Confirmation Modal */}
        {confirmSendOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>कैंपेन भेजने की पुष्टि करें</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                क्या आप वाकई <b>{calculatedRecipientCount}</b> उपयोगकर्ताओं को आधिकारिक WhatsApp (+1 555-706-1955) से यह समाचार नोटिफिकेशन भेजना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div><b>श्रेणी:</b> {category}</div>
                <div><b>हेडलाइन:</b> {headline}</div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSendOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow cursor-pointer active:scale-95"
                >
                  हाँ, तुरंत भेजें ➔
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
