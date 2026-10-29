import React, { useState, useEffect } from 'react';
import { HelpCircle, ArrowLeft, Mail, Globe, ExternalLink, Send, CheckCircle2, MessageSquare, ShieldCheck, FileText, Trash2, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { ReporterUser } from './LoginModal';

interface SupportContactPageProps {
  currentUser?: ReporterUser | null;
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SupportContactPage: React.FC<SupportContactPageProps> = ({
  currentUser,
  onNavigateHome,
  onBack,
  onNavigateToTab,
}) => {
  const handleBack = onBack || onNavigateHome || (() => {
    if (typeof window !== 'undefined' && (window as any).setAppTab) {
      (window as any).setAppTab('home');
    }
  });

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [reportType, setReportType] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{
    success: boolean;
    ticketId?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    document.title = 'AI News Maker';
    window.scrollTo(0, 0);
    if (currentUser) {
      const userMobileNum = (currentUser as any)?.mobile || currentUser?.mobileNumber;
      if (currentUser.username) setUserName(currentUser.username);
      if (currentUser.email) setUserEmail(currentUser.email);
      if (userMobileNum) setUserMobile(userMobileNum);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('कृपया अपनी समस्या या संदेश दर्ज करें।');
      return;
    }
    if (!userEmail.trim() && !userMobile.trim()) {
      alert('कृपया संपर्क के लिए ईमेल या मोबाइल नंबर अवश्य दर्ज करें।');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);

    try {
      const response = await fetch('/api/support/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (currentUser as any)?.userId || currentUser?.email || '',
          userName: userName.trim() || 'Reporter',
          userEmail: userEmail.trim(),
          userMobile: userMobile.trim(),
          reportType,
          message: message.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissionStatus({
          success: true,
          ticketId: data.request?.id || `REQ-${Date.now().toString().slice(-6)}`,
          message: 'आपका सहायता अनुरोध सफलतापूर्वक दर्ज कर लिया गया है। हमारी तकनीकी टीम 24 घंटे के भीतर आपसे संपर्क करेगी।',
        });
        setMessage('');
      } else {
        setSubmissionStatus({
          success: false,
          message: data.error || 'अनुरोध दर्ज करने में समस्या आई। कृपया ईमेल द्वारा संपर्क करें।',
        });
      }
    } catch (err: any) {
      setSubmissionStatus({
        success: false,
        message: err?.message || 'सर्वर से संपर्क नहीं हो सका। कृपया सीधे ईमेल पर लिखें।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Home</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">24x7 सहायता डेस्क • </span>
            <span className="font-mono text-purple-400">Official Support</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-block mb-1">
                Help & Contact Desk
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                सहायता व संपर्क (Support / Contact Us)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                AI News Maker (Breaking News Wala) - तकनीकी सहायता, बिलिंग, खाता प्रबंधन एवं संपादकीय पूछताछ
              </p>
            </div>
          </div>
        </div>

        {/* Verified Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
              <Mail className="w-4 h-4" />
              <span>आधिकारिक ईमेल (Email Support)</span>
            </div>
            <a
              href="mailto:support.ainewsmaker@gmail.com"
              className="text-white hover:text-amber-300 font-mono text-xs sm:text-sm font-bold block truncate"
            >
              support.ainewsmaker@gmail.com
            </a>
            <a
              href="mailto:breakingnewswala.com@gmail.com"
              className="text-slate-300 hover:text-amber-300 font-mono text-xs block truncate"
            >
              breakingnewswala.com@gmail.com
            </a>
            <p className="text-[11px] text-slate-400 pt-1">
              लॉगिन समस्या, बिलिंग, सदस्यता एक्टिवेशन एवं तकनीकी रिपोर्टिंग हेतु लिखें
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs sm:text-sm">
              <Globe className="w-4 h-4" />
              <span>लाइव वेब पोर्टल (Official Portal)</span>
            </div>
            <a
              href="https://www.ainewsmaker.online/"
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-blue-300 font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5"
            >
              <span>ainewsmaker.online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[11px] text-slate-400 pt-1">
              क्लाउड आधारित न्यूज़ मेकर स्टूडियो, ग्राफिक कार्ड्स व वीडियो बुलेटिन जेनरेशन
            </p>
          </div>
        </div>

        {/* Issue Categorization Guide */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5 text-xs sm:text-sm">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <span>समस्या रिपोर्ट करने की श्रेणियां (Issue Guidelines)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">🔑 1. लॉगिन व खाता पहुंच (Login / Auth):</span>
              <p className="text-xs text-slate-400">
                यदि आपको Google Sign-In, OTP या पासवर्ड रीसेट में समस्या आ रही है, तो अपने पंजीकृत ईमेल से अनुरोध भेजें।
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-rose-300 block">🗑️ 2. खाता और डेटा हटाना (Account Deletion):</span>
              <p className="text-xs text-slate-400">
                खाता हटाने के लिए सीधे हमारे <button type="button" onClick={() => onNavigateToTab?.('delete-account')} className="text-rose-400 underline font-bold">खाता हटाने के पेज</button> का उपयोग करें या ईमेल में "Account Deletion" लिखें।
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-300 block">💳 3. बिलिंग व प्रोमो कोड (Billing & Recharge):</span>
              <p className="text-xs text-slate-400">
                प्लान एक्टिवेशन में देरी या प्रोमो कोड रिडेम्पशन संबंधी समस्याओं के लिए ट्रांजेक्शन संदर्भ साझा करें।
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-blue-300 block">🛠️ 4. तकनीकी व एक्सपोर्ट (Rendering & Bugs):</span>
              <p className="text-xs text-slate-400">
                HD ग्राफिक एक्सपोर्ट, वीडियो टाइमलाइन या फॉन्ट रेंडरिंग संबंधी दिक्कतों के लिए स्क्रीनशॉट संलग्न करें।
              </p>
            </div>
          </div>

          {/* Interactive Support Form */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              <span>सीधा सहायता अनुरोध भेजें (Submit Support Request)</span>
            </h3>

            {submissionStatus && (
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
                  submissionStatus.success
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                {submissionStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{submissionStatus.message}</p>
                  {submissionStatus.ticketId && (
                    <p className="font-mono text-xs text-emerald-300 mt-1">
                      टिकट संदर्भ संख्या: <strong>{submissionStatus.ticketId}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    आपका नाम या चैनल का नाम *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="उदा. रिपोर्टर राहुल / न्यूज़ 24"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    समस्या की श्रेणी
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="general">सामान्य सहायता (General Help)</option>
                    <option value="login_issue">लॉगिन या खाता पहुंच (Login Issue)</option>
                    <option value="billing_plans">बिलिंग व प्लान रिचार्ज (Billing & Plans)</option>
                    <option value="account_deletion">खाता हटाने का अनुरोध (Account Deletion)</option>
                    <option value="technical_bug">तकनीकी त्रुटि / रेंडरिंग (Technical Bug)</option>
                    <option value="privacy_inquiry">गोपनीयता व डेटा सुरक्षा (Privacy Inquiry)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ईमेल पता *
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="उदा. reporter@example.com"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    मोबाइल नंबर (वैकल्पिक)
                  </label>
                  <input
                    type="tel"
                    value={userMobile}
                    onChange={(e) => setUserMobile(e.target.value)}
                    placeholder="उदा. 98XXXXXXXX"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  विस्तृत संदेश या समस्या का विवरण *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="कृपया अपनी समस्या, एरर मैसेज या पूछताछ का विवरण यहाँ लिखें..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-900/50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>अनुरोध भेजा जा रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>सहायता अनुरोध भेजें (Send Request)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => onNavigateToTab?.('terms')}
            className="hover:text-amber-300 underline cursor-pointer"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateToTab?.('privacy')}
            className="hover:text-amber-300 underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateToTab?.('delete-account')}
            className="hover:text-amber-300 underline cursor-pointer"
          >
            Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
};
