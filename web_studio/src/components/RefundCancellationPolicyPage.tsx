import React, { useEffect } from 'react';
import { RefreshCw, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, Clock, CreditCard, Mail, Phone, MapPin, ExternalLink, HelpCircle } from 'lucide-react';

interface RefundCancellationPolicyPageProps {
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToSupport?: () => void;
}

export const RefundCancellationPolicyPage: React.FC<RefundCancellationPolicyPageProps> = ({
  onNavigateHome,
  onBack,
  onNavigateToTab,
  onNavigateToSupport,
}) => {
  const handleBack = onBack || onNavigateHome || (() => {
    if (typeof window !== 'undefined' && (window as any).setAppTab) {
      (window as any).setAppTab('home');
    }
  });

  useEffect(() => {
    document.title = 'रिफंड एवं कैंसिलेशन नीति • AI News Maker';
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
            <span className="hidden sm:inline">आधिकारिक नीति • </span>
            <span className="font-mono text-emerald-400">अंतिम अद्यतन: अक्टूबर 2026</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
              <RefreshCw className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-1">
                Cashfree Merchant Compliance
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                रिफंड, कैंसिलेशन एवं डिलीवरी नीति (Refunds & Cancellations)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                AI News Maker (Breaking News Wala) - डिजिटल सेवाओं, सदस्यता भुगतान व रिफंड प्रक्रिया की स्पष्ट नियमावली
              </p>
            </div>
          </div>
        </div>

        {/* Highlight Cards: Digital Fulfillment & Refund Window */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>तत्काल डिजिटल डिलीवरी</span>
            </div>
            <p className="text-xs text-slate-300">
              सफल भुगतान के पश्चात सदस्यता प्लान, फ़ीचर्स और डाउनलोड कोटा <strong>तुरंत (Instant)</strong> सक्रिय हो जाते हैं।
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4" />
              <span>24–48 घंटे में समीक्षा</span>
            </div>
            <p className="text-xs text-slate-300">
              रिफंड या लेनदेन त्रुटि की शिकायतों का समाधान हमारी सहायता टीम द्वारा 24 से 48 कार्य घंटों में किया जाता है।
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs sm:text-sm">
              <CreditCard className="w-4 h-4" />
              <span>5–7 दिन में मूल खाते में वापसी</span>
            </div>
            <p className="text-xs text-slate-300">
              स्वीकृत रिफंड राशि Cashfree पेमेंट गेटवे के माध्यम से <strong>5 से 7 कार्य दिवसों</strong> में सीधे आपके मूल बैंक/UPI में जमा होती है।
            </p>
          </div>
        </div>

        {/* Detailed Policy Sections */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 text-xs sm:text-sm leading-relaxed">
          
          {/* Section 1: Digital Delivery Policy */}
          <section className="space-y-2 border-b border-slate-800/80 pb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>1. डिजिटल डिलीवरी व सेवा उपलब्धता नीति (Fulfillment / Delivery Policy)</span>
            </h2>
            <p className="text-slate-300">
              AI News Maker (Breaking News Wala) एक 100% क्लाउड-आधारित डिजिटल मीडिया सॉफ्टवेयर (SaaS) है।
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>भौतिक शिपिंग नहीं:</strong> चूंकि हमारी सेवाएं विशुद्ध डिजिटल हैं, इसलिए किसी भी भौतिक कूरियर या पार्सल शिपिंग की आवश्यकता नहीं होती है।</li>
              <li><strong>तत्काल सक्रियण:</strong> कैशफ्री (Cashfree) पेमेंट गेटवे द्वारा लेनदेन की पुष्टि होते ही उपयोगकर्ता के खाते में संबंधित प्लान (Basic, Advance, Pro, या VIP Desk) और दैनिक डाउनलोड कोटा स्वतः चालू कर दिया जाता है।</li>
              <li><strong>सत्यापन रसीद:</strong> भुगतान संपन्न होते ही ऑर्डर आईडी एवं डिजिटल रसीद उपयोगकर्ता के पंजीकृत ईमेल पर तुरंत प्रेषित की जाती है।</li>
            </ul>
          </section>

          {/* Section 2: Cancellation Policy */}
          <section className="space-y-2 border-b border-slate-800/80 pb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>2. कैंसिलेशन नीति (Cancellation Policy)</span>
            </h2>
            <p className="text-slate-300">
              उपयोगकर्ता अपनी सदस्यता या नवीनीकरण को कभी भी रद्द (Cancel) करने के लिए स्वतंत्र हैं:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>स्वतः समाप्ति:</strong> हमारे प्लान 30 दिनों की अवधि के लिए प्रीपेड आधार पर होते हैं। उपयोगकर्ता द्वारा अतिरिक्त नवीनीकरण न कराने पर सदस्यता स्वतः समाप्त हो जाती है और कोई छुपा हुआ अतिरिक्त शुल्क नहीं काटा जाता।</li>
              <li><strong>सक्रियण उपरांत निरस्तीकरण:</strong> यदि आपने कोई प्लान एक्टिवेट किया है और उसे बीच में रद्द करना चाहते हैं, तो आप सहायता डेस्क पर अनुरोध भेज सकते हैं। पहले से प्रदत्त 30 दिनों की अवधि के समाप्त होने तक आपकी सेवाएं चालू रहेंगी।</li>
              <li><strong>खाता विलोपन:</strong> यदि आप अपनी सदस्यता के साथ अपना संपूर्ण प्रोफ़ाइल व डेटा स्थायी रूप से मिटाना चाहते हैं, तो <button type="button" onClick={() => onNavigateToTab?.('delete-account')} className="text-amber-300 underline font-bold cursor-pointer">Account Deletion</button> विकल्प का उपयोग कर सकते हैं।</li>
            </ul>
          </section>

          {/* Section 3: Refund Eligibility & Process */}
          <section className="space-y-2 border-b border-slate-800/80 pb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <span>3. रिफंड नीति एवं पात्रता (Refund Policy & Eligibility)</span>
            </h2>
            <p className="text-slate-300">
              हम अपने सभी सम्मानित संवाददाताओं एवं मीडिया संस्थानों के प्रति निष्पक्षता और संतुष्टि के लिए प्रतिबद्ध हैं। निम्नलिखित परिस्थितियों में पूर्ण रिफंड देय होगा:
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-emerald-300 block">✅ दोहरा या अतिरिक्त भुगतान (Duplicate Payment / Double Charge):</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  यदि नेटवर्क में रुकावट या गेटवे टाइमआउट के कारण आपके बैंक से एक ही योजना के लिए एक से अधिक बार राशि कट गई है, तो अतिरिक्त काटी गई पूरी राशि बिना किसी कटौती के 100% वापस की जाएगी।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-emerald-300 block">✅ तकनीकी विफलता (Technical Service Failure):</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  यदि भुगतान सफल होने के बाद तकनीकी कारण से 24 घंटे के भीतर आपका प्लान सक्रिय नहीं हो पाया या सर्वर पर ग्राफिक जेनरेशन पूरी तरह बाधित रहा और हमारी तकनीकी टीम इसका समाधान नहीं कर सकी।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-emerald-300 block">✅ 7-दिवसीय असंतोष गारंटी (New User Courtesy Window):</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  यदि किसी नए उपयोगकर्ता ने प्रथम बार सदस्यता ली है और प्रारंभिक 48 घंटों में प्लेटफ़ॉर्म से कोई भी व्यावसायिक लाभ नहीं उठाया है तथा सेवा उपयुक्त नहीं लगी, तो उचित कारण प्रस्तुत करने पर सहानुभूतिपूर्वक रिफंड प्रोसेस किया जाएगा।
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 mt-3">
              <span className="font-bold block text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>अपवाद (Non-Refundable Circumstances):</span>
              </span>
              <p className="text-xs text-slate-300 mt-1">
                यदि उपयोगकर्ता ने प्लान के तहत अपने दैनिक कोटा का अधिकांश उपयोग कर लिया है, अथवा भारत सरकार के आईटी नियमों, कॉपीराइट या पत्रकारिता आचार संहिता के उल्लंघन के कारण खाता निलंबित किया गया है, तो रिफंड स्वीकार्य नहीं होगा।
              </p>
            </div>
          </section>

          {/* Section 4: Refund Request & Timeline */}
          <section className="space-y-2 border-b border-slate-800/80 pb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span>4. रिफंड आवेदन प्रक्रिया एवं समय-सीमा (How to Request a Refund)</span>
            </h2>
            <p className="text-slate-300">
              रिफंड प्राप्त करने के लिए उपयोगकर्ता को निम्नलिखित विवरणों के साथ ईमेल भेजना होगा:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>पंजीकृत ईमेल व मोबाइल नंबर:</strong> जिस खाते से खरीदारी की गई है।</li>
              <li><strong>Cashfree ऑर्डर आईडी (Order ID) / UTR नंबर:</strong> भुगतान रसीद में उल्लिखित।</li>
              <li><strong>रिफंड का संक्षिप्त कारण:</strong> ताकि हमारी सपोर्ट टीम त्वरित जांच कर सके।</li>
            </ol>
            <p className="text-slate-300 pt-2">
              <strong>रिफंड का माध्यम:</strong> स्वीकृत रिफंड केवल उसी मूल भुगतान स्रोत (Original Payment Method - Bank Account, Debit/Credit Card, or UPI) में Cashfree के सुरक्षित पेमेंट चैनल द्वारा क्रेडिट किया जाता है। नकद (Cash) या किसी तीसरे व्यक्ति के खाते में राशि नहीं भेजी जा सकती।
            </p>
          </section>

          {/* Section 5: Official Contact & Grievance Officer */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              <span>5. संपर्क सूत्र एवं नोडल अधिकारी (Grievance & Merchant Contact)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-slate-400 block">आधिकारिक सपोर्ट ईमेल:</span>
                <a href="mailto:support.ainewsmaker@gmail.com" className="font-mono text-white hover:text-amber-300 font-bold block truncate">
                  support.ainewsmaker@gmail.com
                </a>
                <a href="mailto:breakingnewswala.com@gmail.com" className="font-mono text-slate-300 hover:text-amber-300 block truncate">
                  breakingnewswala.com@gmail.com
                </a>
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-slate-400 block">हेल्पलाइन व WhatsApp सपोर्ट:</span>
                <span className="font-mono text-white font-bold block">+91 9669802408</span>
                <span className="text-[11px] text-slate-400 block">समय: सोमवार–शनिवार (सुबह 9:00 से रात 8:00 IST)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-400 block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>पंजीकृत कार्यालय व संपादकीय डेस्क (Registered Address):</span>
              </span>
              <p className="text-slate-300 font-medium">
                AI NEWS MAKER (BREAKING NEWS WALA)<br />
                सेंट्रल डेस्क, भोपाल, मध्य प्रदेश (Bhopal, Madhya Pradesh), पिन कोड: 462001, भारत (India)
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs text-slate-400 border-t border-slate-800">
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
            Contact Us
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
