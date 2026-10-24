import React from 'react';
import {
  X,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Type,
  MapPin,
  Download,
  CheckCircle2,
  HelpCircle,
  Share2,
} from 'lucide-react';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStep?: (step: number) => void;
}

export const AppGuideModal: React.FC<AppGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectStep,
}) => {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('dont_show_app_guide_v1', 'true');
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  const handleGoToStep = (stepNumber: number) => {
    handleClose();
    if (onSelectStep) {
      onSelectStep(stepNumber);
    }
  };

  const stepsData = [
    {
      step: 1,
      title: 'स्टेप 1: टेम्पलेट या न्यूज़ फ्रेम्स चुनें',
      icon: <Layers className="w-5 h-5 text-yellow-400" />,
      badge: '9 न्यूज़ फ्रेम्स',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      description:
        'अपनी खबर के अनुरूप सही फ्रेम चुनें — जैसे मूल जैकेट (Original Jacket), सुपर ब्रेकिंग रेड, कोट/बयान जैकेट, 16:9 टीवी फ्रेम, मॉर्निंग शो आदि।',
      tips: 'हर टेम्प्लेट में टीवी न्यूज़ चैनलों जैसा पेशेवर हेडर, ब्रेकिंग टिकर और आकर्षक बैकग्राउंड सेट है।',
    },
    {
      step: 2,
      title: 'स्टेप 2: AI टूल्स (Gemini 3.1 Pro)',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      badge: 'AI ऑटोमेशन',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'खबर का विवरण या लिंक पेस्ट करें, AI एक क्लिक में 3-लाइन कैची हेडलाइन, मुख्य कीवर्ड्स और आवश्यक विवरण तैयार कर देगा। साथ ही AI इमेज सर्च व ऑटो-एनालिसिस भी उपलब्ध है।',
      tips: 'यह आपका 80% समय बचाता है और खबर को सोशल मीडिया के लिए तुरंत वायरल-रेडी बनाता है।',
    },
    {
      step: 3,
      title: 'स्टेप 3: फोटो लेआउट व अपलोड',
      icon: <ImageIcon className="w-5 h-5 text-sky-400" />,
      badge: 'मल्टी-फोटो ग्रिड',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description:
        'तय करें कि खबर 1 फोटो, 2 फोटो (ऊपर-नीचे या 50-50), 3 फोटो या 4 फोटो में बनेगी। इसके बाद गैलरी या कैमरे से फोटो अपलोड करें। साथ ही स्पेशल लीडर/पर्सन कटआउट PNG भी जोड़ सकते हैं।',
      tips: 'फोटो को ड्रैग, ज़ूम और सही फ्रेम में पोजीशन भी कर सकते हैं।',
    },
    {
      step: 4,
      title: 'स्टेप 4: हेडलाइन व टेक्स्ट मैटर दर्ज करें',
      icon: <Type className="w-5 h-5 text-red-400" />,
      badge: '3-लाइन हेडलाइन',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
      description:
        'अपनी मुख्य खबर का शीर्षक (हेडलाइन) 3 पंक्तियों में लिखें। फॉन्ट साइज एडजस्ट करें और महत्वपूर्ण शब्दों को पीले रंग से हाइलाइट करें।',
      tips: 'Baloo 2, Mukta और Noto Serif जैसे प्रीमियम हिंदी फॉन्ट्स का चयन कर सकते हैं।',
    },
    {
      step: 5,
      title: 'स्टेप 5: जिला, स्थान व विस्तृत विवरण',
      icon: <MapPin className="w-5 h-5 text-emerald-400" />,
      badge: 'लोकेशन व डेट',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description:
        'अपना जिला/स्थान (जैसे रीवा / सीधी / भोपाल / दिल्ली) दर्ज करें। 90° रोटेटेड डेटलाइन और स्पेशल कॉलआउट टैग (#बड़ी_खबर, #एक्सक्लूसिव) सक्रिय करें।',
      tips: 'तारीख अपने आप वर्तमान दिन के अनुसार सेट रहती है।',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-['Baloo_2']">
                  ग्राफिक कैसे बनाएं? (स्टेप-बाय-स्टेप गाइड)
                </h2>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  सहायता
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                मात्र 5 सरल स्टेप्स में तैयार करें 1080x1350 फुल एचडी न्यूज़ कार्ड
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 divide-y divide-neutral-800/60 text-neutral-200">
          {/* Quick intro note */}
          <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-red-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between">
            <span>
              👋 <strong>स्वागत है!</strong> यह गाइड आपको न्यूज़ ग्राफिक बनाने की पूरी प्रक्रिया समझाती है:
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">
              कुल 5 स्टेप्स
            </span>
          </div>

          {/* Step list */}
          <div className="space-y-3 pt-2">
            {stepsData.map((item) => (
              <div
                key={item.step}
                className="group p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-3 sm:gap-4"
              >
                {/* Step badge / icon */}
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0 mt-0.5 shadow-inner">
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-extrabold text-white font-['Baloo_2']">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {item.description}
                  </p>

                  <p className="text-[11px] text-yellow-400/90 font-medium mt-1 flex items-center gap-1">
                    <span>💡</span>
                    <span>{item.tips}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Special Dedicated Section: Header & Footer Customization via Profile */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-red-650/10 border-2 border-amber-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <h3 className="text-sm sm:text-base font-black text-amber-300 font-['Baloo_2']">
                    विशेष गाइड: हेडर व फुटर कैसे बदलें? (प्रोफ़ाइल सेटिंग्स)
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-neutral-950">
                  प्रोफ़ाइल सेटिंग्स
                </span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                अपने न्यूज़ चैनल या पोर्टल का ओरिजिनल लोगो, हेडर बैनर PNG, बॉटम फुटर PNG और सोशल मीडिया हैंडल्स सेट करने के लिए यह आसान तरीका अपनाएं:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">1. प्रोफ़ाइल टैब पर जाएं:</span>
                  <p className="text-[11px] text-neutral-300">
                    ऐप के सबसे नीचे नेविगेशन बार में दाईं ओर <strong>&apos;प्रोफ़ाइल (Profile)&apos;</strong> टैब पर क्लिक करें।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">2. टेम्पलेट चुनें:</span>
                  <p className="text-[11px] text-neutral-300">
                    &apos;हेडर एवं फुटर सेटिंग्स&apos; कार्ड में सबसे ऊपर ड्रॉपडाउन से अपना न्यूज़ टेम्पलेट (जैसे ओरिजिनल, सुपर ब्रेकिंग) चुनें।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">3. PNG फाइल्स अपलोड करें:</span>
                  <p className="text-[11px] text-neutral-300">
                    चैनल का <strong>लोगो</strong>, <strong>टॉप हेडर PNG</strong> व <strong>बॉटम फुटर PNG</strong> अपलोड करें।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">4. सेव करें:</span>
                  <p className="text-[11px] text-neutral-300">
                    व्हाट्सऐप व सोशल हैंडल लिखकर <strong>&apos;हेडर/फुटर सुरक्षित करें&apos;</strong> दबाएं। अब हर कार्ड पर आपकी ब्रांडिंग स्वतः दिखेगी!
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-200 flex items-center gap-2">
                <span>💡</span>
                <span><strong>टिप:</strong> आपको हर बार हेडर-फुटर नहीं लगाना पड़ेगा, प्रोफ़ाइल में एक बार सेव करने के बाद यह हमेशा के लिए सुरक्षित रहेगा।</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-yellow-400 focus:ring-yellow-400 cursor-pointer"
            />
            <span>लॉगिन पर दोबारा यह गाइड स्वतः न खोलें</span>
          </label>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>समझ गया / ग्राफिक बनाना शुरू करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
