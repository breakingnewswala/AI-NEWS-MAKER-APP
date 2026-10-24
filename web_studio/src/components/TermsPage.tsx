import React, { useEffect } from 'react';
import { FileText, Shield, ArrowLeft, CheckCircle2, AlertTriangle, Scale, Lock, Mail, Globe, ExternalLink } from 'lucide-react';

interface TermsPageProps {
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToSupport?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
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
    document.title = 'Terms & Conditions - AI News Maker';
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
            <span className="hidden sm:inline">आधिकारिक दस्तावेज़ • </span>
            <span className="font-mono text-amber-400">अंतिम अद्यतन: अक्टूबर 2026</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-block mb-1">
                Legal Agreement
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                नियम एवं शर्तें (Terms & Conditions)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                AI News Maker (Breaking News Wala) की सेवाओं, डिजिटल न्यूज़ स्टूडियो और टूल्स के उपयोग हेतु अनिवार्य नियम
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl space-y-7 text-xs sm:text-sm leading-relaxed text-slate-300">
          {/* Section 1 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
              <span>सेवा एवं प्लेटफॉर्म का परिचय (Introduction & Service Overview)</span>
            </h2>
            <p>
              <strong>AI News Maker</strong> (स्वामित्व: <em>Breaking News Wala</em>) एक उन्नत क्लाउड-आधारित डिजिटल न्यूज़ स्टूडियो प्लेटफॉर्म है जो डिजिटल मीडिया प्रकाशकों, स्थानीय संवाददाताओं, वीडियो पत्रकारों और न्यूज़ रूम्स को पेशेवर ग्राफिक्स, वीडियो बुलेटिन, ई-पेपर जैकेट्स और समाचार ड्राफ्टिंग की सुविधाएं प्रदान करता है।
            </p>
            <p>
              इस वेबसाइट या एप्लिकेशन का उपयोग करने पर आप इन नियमों एवं शर्तों से पूरी तरह बाध्य होने की सहमति देते हैं। यदि आप इन शर्तों से असहमत हैं, तो कृपया सेवा का उपयोग न करें।
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
              <span>यूज़र पात्रता एवं खाता सुरक्षा (User Eligibility & Account Security)</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>प्लेटफॉर्म का उपयोग केवल 18 वर्ष या उससे अधिक आयु के व्यक्ति या उनके द्वारा अधिकृत प्रतिनिधि कर सकते हैं।</li>
              <li>पंजीकरण के समय प्रदान की गई सभी जानकारियां (नाम, मोबाइल नंबर, ईमेल, चैनल का नाम) सत्य और सटीक होनी चाहिए।</li>
              <li>आप अपने खाते के पासवर्ड, लॉगिन क्रेडेंशियल्स और एपीआई एक्सेस की गोपनीयता बनाए रखने के लिए व्यक्तिगत रूप से जिम्मेदार हैं।</li>
              <li>अनधिकृत एक्सेस या सुरक्षा उल्लंघन का संदेह होने पर तुरंत हमारी सपोर्ट टीम को सूचित करना अनिवार्य है।</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
              <span>उचित उपयोग एवं प्रतिबंधित गतिविधियां (Acceptable Use & Prohibitions)</span>
            </h2>
            <p className="text-rose-200/90 font-medium">
              मंच की अखंडता और पत्रकारिता के उच्च मानकों को बनाए रखने के लिए निम्न गतिविधियां पूर्णतः प्रतिबंधित हैं:
            </p>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-rose-950/60 space-y-2">
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>झूठी, भ्रामक, मनगढ़ंत या बिना सत्यापन वाली सनसनीखेज खबरें (Fake News & Disinformation) बनाना या प्रसारित करना।</li>
                <li>सांप्रदायिक सौहार्द, राष्ट्रीय सुरक्षा, धार्मिक भावनाओं या सामाजिक शांति को ठेस पहुंचाने वाली सामग्री का निर्माण।</li>
                <li>किसी व्यक्ति, संस्था या समुदाय के विरुद्ध मानहानिकारक (Defamatory), अश्लील या आपत्तिजनक भाषा का प्रयोग।</li>
                <li>कॉपीराइट, ट्रेडमार्क या किसी अन्य पक्ष के बौद्धिक संपदा अधिकारों का अनधिकृत उल्लंघन।</li>
                <li>सिस्टम पर साइबर हमले, दुर्भावनापूर्ण बॉट्स, अनधिकृत डेटा स्क्रैपिंग या सेवा में बाधा उत्पन्न करने का प्रयास।</li>
              </ul>
            </div>
            <p className="text-[11px] text-slate-400">
              प्रतिबंधित गतिविधियों में लिप्त पाए जाने वाले खातों को बिना पूर्व सूचना के स्थायी रूप से ब्लैकलिस्ट/निलंबित किया जा सकता है।
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
              <span>AI-जनरेटेड सामग्री व संपादकीय सत्यापन ज़िम्मेदारी (AI Content & Editorial Verification)</span>
            </h2>
            <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>महत्वपूर्ण संपादकीय अस्वीकरण (Mandatory Editorial Disclaimer):</span>
              </div>
              <p className="text-slate-300">
                AI News Maker द्वारा प्रदान किए जाने वाले AI टूल्स (हेडलाइन सुझाव, कैप्शन विस्तार, इमेज विश्लेषण व ड्राफ्टिंग) केवल आपकी सहायता के लिए हैं। अंतिम समाचार सामग्री, नामों, तिथियों, तथ्यों, कानूनी परिणामों और प्रसारण की पूर्ण संपादकीय व कानूनी ज़िम्मेदारी उपयोगकर्ता/पत्रकार की होती है।
              </p>
              <p className="text-slate-300">
                सार्वजनिक प्रसारण या सोशल मीडिया पर साझा करने से पहले प्रत्येक खबर के तथ्यों की स्वतंत्र रूप से पुष्टि करना उपयोगकर्ता का अनिवार्य दायित्व है।
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">5</span>
              <span>सदस्यता, भुगतान व रिफंड नीतियां (Subscription, Pricing & Refund Policy)</span>
            </h2>
            <div className="space-y-2 text-slate-300">
              <p>
                प्लेटफॉर्म विभिन्न सदस्यता प्लान्स (Basic 7-Day Free Trial, Advance, Professional, VIP Desk) प्रदान करता है। प्रत्येक प्लान की विशेषताएं, वैधता और शुल्क प्लान्स अनुभाग में स्पष्ट रूप से प्रदर्शित हैं।
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>तत्काल डिजिटल एक्टिवेशन:</strong> भुगतान या प्रोमो कोड रिडेम्पशन के तुरंत बाद सेवाएं सक्रिय कर दी जाती हैं।</li>
                <li><strong>रिफंड नीति:</strong> डिजिटल सेवाओं और तत्काल संसाधन आवंटन के कारण, योजना सक्रिय होने के पश्चात किया गया भुगतान सामान्यतः अप्रतिदेय (Non-Refundable) होता है।</li>
                <li><strong>तकनीकी त्रुटि समाधान:</strong> यदि भुगतान के बाद तकनीकी विफलता से प्लान सक्रिय नहीं होता, तो लेन-देन संदर्भ सहित 48 घंटे के भीतर सपोर्ट पर संपर्क करें; सत्यापन उपरांत 5-7 कार्यदिवसों में समाधान या रिफंड किया जाएगा।</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">6</span>
              <span>बौद्धिक संपदा अधिकार (Intellectual Property Rights)</span>
            </h2>
            <p>
              उपयोगकर्ता द्वारा अपलोड किया गया चैनल लोगो, नाम, निजी ग्राफिक्स और कस्टम फुटर उपयोगकर्ता की संपत्ति बने रहते हैं। AI News Maker के सॉफ्टवेयर कोड, यूजर इंटरफेस, पूर्व-निर्मित टेम्पलेट्स, लेआउट डिजाइंस और मालिकाना एल्गोरिदम्‍स <em>Breaking News Wala</em> की अनन्य बौद्धिक संपदा हैं।
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-mono font-bold">7</span>
              <span>दायित्व की सीमा (Limitation of Liability)</span>
            </h2>
            <p>
              लागू कानूनों की अधिकतम सीमा तक, AI News Maker किसी भी अप्रत्यक्ष, आकस्मिक, दंडात्मक या परिणामी नुकसान (जिसमें लाभ की हानि, डेटा हानि या व्यावसायिक रुकावट शामिल है) के लिए उत्तरदायी नहीं होगा, जो सेवा के उपयोग या उपयोग करने में असमर्थता से उत्पन्न हुआ हो।
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">8</span>
              <span>संपर्क एवं शिकायत निवारण (Contact & Grievance Redressal)</span>
            </h2>
            <p>इन नियमों व शर्तों के संबंध में किसी भी स्पष्टीकरण या शिकायत के लिए हमसे संपर्क करें:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-bold block">आधिकारिक ईमेल:</span>
                <a href="mailto:support.ainewsmaker@gmail.com" className="text-amber-400 hover:underline font-mono text-xs font-bold block truncate">
                  support.ainewsmaker@gmail.com
                </a>
                <a href="mailto:breakingnewswala.com@gmail.com" className="text-slate-300 hover:underline font-mono text-[11px] block truncate">
                  breakingnewswala.com@gmail.com
                </a>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-bold block">आधिकारिक वेब पोर्टल:</span>
                <a href="https://www.ainewsmaker.online/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono text-xs font-bold flex items-center gap-1">
                  <span>ainewsmaker.online</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-[11px] text-slate-400 block">डिजिटल मीडिया स्टूडियो व क्लाउड पोर्टल</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-slate-400">
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
