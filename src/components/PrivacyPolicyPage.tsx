import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Lock, Database, EyeOff, UserCheck, Trash2, Mail, ExternalLink, Globe } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToDeleteAccount?: () => void;
  onNavigateToSupport?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onNavigateHome,
  onBack,
  onNavigateToTab,
  onNavigateToDeleteAccount,
  onNavigateToSupport,
}) => {
  const handleBack = onBack || onNavigateHome || (() => {
    if (typeof window !== 'undefined' && (window as any).setAppTab) {
      (window as any).setAppTab('home');
    }
  });

  useEffect(() => {
    document.title = 'AI News Maker';
    window.scrollTo(0, 0);
  }, []);

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
            <span className="hidden sm:inline">आधिकारिक गोपनीयता नीति • </span>
            <span className="font-mono text-emerald-400">अंतिम अद्यतन: अक्टूबर 2026</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-1">
                Data Privacy & Safety
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                गोपनीयता नीति (Privacy Policy)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                AI News Maker (Breaking News Wala) पर उपयोगकर्ता डेटा संग्रह, सुरक्षा, उपयोग और गोपनीयता अधिकार
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl space-y-7 text-xs sm:text-sm leading-relaxed text-slate-300">
          {/* Section 1 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
              <span>परिचय एवं गोपनीयता प्रतिबद्धता (Introduction & Commitment)</span>
            </h2>
            <p>
              <strong>AI News Maker</strong> (स्वामित्व: <em>Breaking News Wala</em>) आपके व्यक्तिगत डेटा और गोपनीयता का सम्मान करता है। यह नीति विस्तार से बताती है कि जब आप हमारी वेबसाइट (ainewsmaker.online), मोबाइल स्टूडियो या सेवाओं का उपयोग करते हैं, तो हम कौन सी जानकारी एकत्र करते हैं, उसे कैसे सुरक्षित रखते हैं और आपके अधिकार क्या हैं।
            </p>
            <p>
              हम Google Play Store डेटा सुरक्षा नीतियों और लागू डिजिटल डेटा सुरक्षा मानकों का पूर्ण अनुपालन सुनिश्चित करते हैं।
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
              <span>हम कौन सी जानकारी एकत्र करते हैं (Information We Collect)</span>
            </h2>
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">A. खाता एवं प्रमाणीकरण जानकारी (Account & Profile):</span>
                <p className="text-slate-300 text-xs">
                  आपका नाम, ईमेल पता, मोबाइल नंबर, चुना गया यूज़रनेम, सुरक्षित पासवर्ड हैश, और चैनल का नाम। Google Sign-In का उपयोग करने पर आपका मूल प्रोफ़ाइल नाम और सत्यापित ईमेल।
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">B. चैनल ब्रांडिंग एवं अपलोड की गई सामग्री:</span>
                <p className="text-slate-300 text-xs">
                  आपके चैनल का लोगो (PNG/JPEG/GIF), हेडर और फुटर ग्राफिक्स, रिपोर्टर फोटो, वॉटरमार्क सेटिंग्स, और सोशल मीडिया हैंडल्स (WhatsApp, YouTube, Telegram)।
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">C. समाचार आलेख, लिंक्स व यूज़र सामग्री:</span>
                <p className="text-slate-300 text-xs">
                  यूज़र द्वारा ग्राफिक निर्माण हेतु दर्ज किए गए समाचार लिंक (URLs), समाचार स्क्रिप्ट, जनरेट किए गए हेडलाइंस विकल्प, स्टोरी कार्ड्स और वीडियो बुलेटिन्स।
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">D. भुगतान व योजना संबंधी डेटा:</span>
                <p className="text-slate-300 text-xs">
                  सक्रिय प्लान (Basic/Advance/Pro/VIP Desk), वैधता तिथि, प्रोमो कोड रिडेम्पशन रिकॉर्ड और कॉइन वॉलेट बैलेंस। हम कभी भी उपयोगकर्ताओं के पूर्ण क्रेडिट/डेबिट कार्ड नंबर या बैंक पिन संग्रहीत नहीं करते।
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">E. तकनीकी लॉग्स व सुरक्षा डेटा:</span>
                <p className="text-slate-300 text-xs">
                  आईपी पता (दुरुपयोग और SSRF सुरक्षा हेतु), ब्राउज़र प्रकार, डिवाइस का प्रकार और सर्वर त्रुटि लॉग्स।
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
              <span>डेटा का उपयोग एवं उद्देश्य (How We Use Information)</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>न्यूज़ ग्राफिक्स, वीडियो और ई-पेपर का संपादन और एचडी एक्सपोर्ट प्रदान करने के लिए।</li>
              <li>विभिन्न उपकरणों (वेब ब्राउज़र और मोबाइल ऐप) के बीच आपकी चैनल सेटिंग्स को सिंक करने के लिए।</li>
              <li>आपके सदस्यता प्लान, ट्रायल अवधि और वॉलेट बैलेंस को प्रबंधित करने के लिए।</li>
              <li>प्लेटफॉर्म की सुरक्षा सुनिश्चित करने, साइबर हमलों को रोकने और दुरुपयोग की जांच के लिए।</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
              <span>तृतीय-पक्ष सेवाएं एवं एपीआई एकीकरण (Third-Party APIs & Services)</span>
            </h2>
            <p>
              सेवा की उच्चतम गुणवत्ता के लिए हम केवल प्रतिष्ठित और सुरक्षित तृतीय-पक्ष अवसंरचना का उपयोग करते हैं:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              <li><strong>Google Cloud & Firebase:</strong> सुरक्षित प्रमाणीकरण और डेटाबेस संग्रहण (Firestore) हेतु।</li>
              <li><strong>Google Gemini AI (@google/genai):</strong> समाचार आलेखों से तथ्यात्मक हेडलाइन और कैप्शन तैयार करने हेतु। AI इंजन को आपके निजी पासवर्ड या अनधिकृत वित्तीय डेटा का एक्सेस नहीं होता।</li>
              <li><strong>क्लाउड होस्टिंग अवसंरचना:</strong> एंटरप्राइज-ग्रेड सर्वर जो एन्क्रिप्टेड HTTPS प्रोटोकॉल पर संचालित होते हैं।</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono font-bold">5</span>
              <span>डेटा साझा न करने की गारंटी (Zero Data Selling Policy)</span>
            </h2>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex items-start gap-3">
              <EyeOff className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-slate-300 text-xs">
                हम आपके किसी भी व्यक्तिगत डेटा, संपर्क विवरण या बनाई गई सामग्री को किसी भी डेटा ब्रोकर, टेलीमार्केटर या तीसरे पक्ष को <strong>कभी नहीं बेचते, किराए पर नहीं देते और न ही व्यावसायिक लाभ हेतु साझा करते हैं</strong>।
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">6</span>
              <span>डेटा अवधारण व खाता हटाने का अधिकार (Retention & Account Deletion)</span>
            </h2>
            <p>
              उपयोगकर्ता को किसी भी समय अपना खाता और संपूर्ण डेटा हटाने का पूर्ण कानूनी अधिकार है:
            </p>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>खाता और डेटा स्थायी रूप से हटाना:</span>
              </div>
              <p className="text-xs text-slate-300">
                खाता हटाने का अनुरोध करने पर, आपका चैनल प्रोफाइल, अपलोड किए गए लोगो, ड्राफ्ट्स, और सभी संबंधित रिकॉर्ड्स हमारे सर्वर और डेटाबेस से स्थायी रूप से मिटा दिए जाते हैं।
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateToTab?.('delete-account')}
                  className="px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>खाता हटाने का लाइव पोर्टल खोलें (Account Deletion Page)</span>
                </button>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">7</span>
              <span>गोपनीयता संपर्क (Contact for Privacy Concerns)</span>
            </h2>
            <p>गोपनीयता नीति, डेटा सुरक्षा या व्यक्तिगत डेटा अनुरोधों के लिए संपर्क करें:</p>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-bold block">डेटा सुरक्षा अधिकारी:</span>
              <a href="mailto:support.ainewsmaker@gmail.com" className="text-emerald-400 hover:underline font-mono text-xs font-bold block truncate">
                support.ainewsmaker@gmail.com
              </a>
              <span className="text-[11px] text-slate-400 block">AI News Maker / Breaking News Wala</span>
            </div>
          </section>
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
            onClick={() => onNavigateToTab?.('delete-account')}
            className="hover:text-amber-300 underline cursor-pointer"
          >
            Account Deletion
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
