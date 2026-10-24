import React, { useState, useEffect } from 'react';
import { Trash2, ArrowLeft, ShieldAlert, CheckCircle, AlertTriangle, HelpCircle, Mail, ExternalLink, RefreshCw } from 'lucide-react';
import { ReporterUser } from './LoginModal';

interface AccountDeletionPageProps {
  currentUser?: ReporterUser | null;
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onLogout?: () => void;
}

export const AccountDeletionPage: React.FC<AccountDeletionPageProps> = ({
  currentUser,
  onNavigateHome,
  onBack,
  onNavigateToTab,
  onLogout,
}) => {
  const handleBack = onBack || onNavigateHome || (() => {
    if (typeof window !== 'undefined' && (window as any).setAppTab) {
      (window as any).setAppTab('home');
    }
  });

  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [channelName, setChannelName] = useState('');
  const [reason, setReason] = useState('चैनल संचालन बंद कर रहे हैं');
  const [customReason, setCustomReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    requestId?: string;
  } | null>(null);

  useEffect(() => {
    document.title = 'Account Deletion - AI News Maker';
    window.scrollTo(0, 0);
    if (currentUser) {
      const userMobile = (currentUser as any)?.mobile || currentUser?.mobileNumber;
      if (currentUser.email) setEmailOrMobile(currentUser.email);
      else if (userMobile) setEmailOrMobile(userMobile);
      if (currentUser.username) setChannelName(currentUser.username);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      alert('कृपया खाता और डेटा हटाने की पुष्टि के लिए चेकबॉक्स पर टिक करें।');
      return;
    }
    if (!emailOrMobile.trim()) {
      alert('कृपया पंजीकृत ईमेल या मोबाइल नंबर दर्ज करें।');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const userMobile = (currentUser as any)?.mobile || currentUser?.mobileNumber || '';
      // If user is currently logged in, use in-app deletion endpoint
      const endpoint = currentUser ? '/api/user-data/delete-account' : '/api/account-deletion-requests';
      const payload = {
        email: emailOrMobile.includes('@') ? emailOrMobile.trim() : (currentUser?.email || ''),
        mobile: !emailOrMobile.includes('@') ? emailOrMobile.trim() : userMobile,
        channelName: channelName.trim() || currentUser?.username || '',
        reason: reason === 'अन्य' ? customReason.trim() : reason,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'आपका खाता और संबंधित डेटा हटाने का अनुरोध सफलतापूर्वक स्वीकार कर लिया गया है।',
          requestId: data.requestId,
        });

        // If user was logged in, log them out locally
        if (currentUser && onLogout) {
          setTimeout(() => {
            onLogout();
          }, 2500);
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'अनुरोध संसाधित करने में त्रुटि आई। कृपया सपोर्ट टीम से संपर्क करें।',
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
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
            <span className="hidden sm:inline">Google Play नीति अनुपालन • </span>
            <span className="font-mono text-rose-400">Data Safety Compliant</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-red-950/60 border border-rose-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 shrink-0">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-block mb-1">
                Data Deletion Portal
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                खाता और डेटा हटाना (Account Deletion)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                AI News Maker खाते और उससे संबंधित सभी डेटा को स्थायी रूप से हटाने की आधिकारिक प्रक्रिया
              </p>
            </div>
          </div>
        </div>

        {/* Informational Guidance Cards */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 text-xs sm:text-sm">
          {/* 4 Steps */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>खाता हटाने की चरणबद्ध प्रक्रिया (Step-by-Step Instructions)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400">चरण 1:</span>
                <p className="text-slate-300 font-medium">वेबसाइट या ऐप पर अपने खाते में साइन-इन करें।</p>
              </div>
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400">चरण 2:</span>
                <p className="text-slate-300 font-medium">नेविगेशन बार से <strong>कंट्रोल रूम (Profile)</strong> अनुभाग खोलें।</p>
              </div>
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400">चरण 3:</span>
                <p className="text-slate-300 font-medium">नीचे <strong>"खाता और डेटा स्थायी रूप से हटाएं"</strong> विकल्प पर क्लिक करें।</p>
              </div>
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400">चरण 4:</span>
                <p className="text-slate-300 font-medium">हटाने की पुष्टि करें। आपका खाता तुरंत बंद और डेटा स्थायी रूप से मिटा दिया जाएगा।</p>
              </div>
            </div>
          </div>

          {/* Data Impact */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>क्या डेटा मिटाया जाएगा और क्या सुरक्षित रहेगा?</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg">
                <span className="font-bold text-rose-300 block mb-1">🗑️ स्थायी रूप से मिटाया जाने वाला डेटा:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>यूज़र प्रोफाइल, नाम, पासवर्ड और संपर्क</li>
                  <li>अपलोड किए गए चैनल लोगो, हेडर व फुटर</li>
                  <li>सहेजे गए सभी समाचार ड्राफ्ट्स व कार्ड्स</li>
                  <li>कस्टम चैनल सेटिंग्स व प्राथमिकताएं</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-lg">
                <span className="font-bold text-blue-300 block mb-1">⚖️ वैधानिक अवधारण (Legal Retention):</span>
                <p className="text-slate-300 leading-relaxed">
                  लागू कर और वित्तीय लेखा कानूनों के तहत केवल वित्तीय लेनदेन रिकॉर्ड (ऑर्डर आईडी, तिथि, राशि) सीमित कानूनी अवधि तक सुरक्षित रखे जाते हैं।
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              <strong>प्रोसेसिंग समय:</strong> ऐप के माध्यम से पुष्टि करने पर प्रक्रिया <em>तत्काल</em> पूरी होती है। वेब पोर्टल फॉर्म द्वारा अनुरोध करने पर 24-48 घंटे के भीतर डेटा स्थायी रूप से हटा दिया जाता है।
            </p>
          </div>

          {/* Interactive Request Form */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {currentUser ? 'सक्रिय खाते के लिए खाता हटाने का अनुरोध' : 'खाता हटाने का ऑनलाइन अनुरोध फॉर्म'}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentUser
                    ? `लॉगिन यूज़र: ${currentUser.email || (currentUser as any)?.mobile || currentUser?.mobileNumber || currentUser.username}`
                    : 'यदि आप लॉगिन नहीं कर पा रहे हैं, तो नीचे दिए गए फॉर्म से अनुरोध भेजें:'}
                </p>
              </div>
            </div>

            {result && (
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
                  result.success
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{result.message}</p>
                  {result.requestId && (
                    <p className="font-mono text-xs text-emerald-300">
                      अनुरोध ट्रैकिंग आईडी: <strong>{result.requestId}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  पंजीकृत ईमेल या मोबाइल नंबर *
                </label>
                <input
                  type="text"
                  required
                  value={emailOrMobile}
                  onChange={(e) => setEmailOrMobile(e.target.value)}
                  placeholder="उदा. reporter@example.com या 98XXXXXXXX"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  चैनल या ब्रांड का नाम
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="उदा. Breaking News Live"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  खाता हटाने का मुख्य कारण
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-rose-500"
                >
                  <option value="चैनल संचालन बंद कर रहे हैं">चैनल संचालन बंद कर रहे हैं</option>
                  <option value="दूसरा नया खाता बना लिया है">दूसरा नया खाता बना लिया है</option>
                  <option value="गोपनीयता या डेटा सुरक्षा कारण">गोपनीयता या डेटा सुरक्षा कारण</option>
                  <option value="सेवा का उपयोग अब आवश्यक नहीं">सेवा का उपयोग अब आवश्यक नहीं</option>
                  <option value="अन्य">अन्य कारण</option>
                </select>
              </div>

              {reason === 'अन्य' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    कारण स्पष्ट करें
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="कृपया संक्षेप में बताएं..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded-sm border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 select-none">
                    मैं पुष्टि करता हूँ कि मैं AI News Maker से अपना खाता और उससे संबंधित सभी डेटा स्थायी रूप से मिटाना चाहता हूँ। मैं समझता हूँ कि यह प्रक्रिया अपरिवर्तनीय है।
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !confirmed}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-rose-900/50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>अनुरोध भेजा जा रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>खाता और डेटा स्थायी रूप से हटाएं</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Fallback Support Contact */}
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-white block">सपोर्ट सहायता एवं वैकल्पिक अनुरोध:</span>
              <span className="text-slate-400">यदि फॉर्म काम न करे तो आप सीधे हमारे ईमेल पर भी अनुरोध भेज सकते हैं।</span>
            </div>
            <a
              href="mailto:support.ainewsmaker@gmail.com?subject=Account%20Deletion%20Request%20-%20AI%20News%20Maker"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-700 rounded-lg font-bold transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>support.ainewsmaker@gmail.com</span>
            </a>
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
            onClick={() => onNavigateToTab?.('support')}
            className="hover:text-amber-300 underline cursor-pointer"
          >
            Support / Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};
