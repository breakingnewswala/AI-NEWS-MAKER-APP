import React, { useState } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Type,
  MapPin,
  Sliders,
  Download,
  CheckCircle2,
  HelpCircle,
  Video,
  Play,
  Film,
  FileText,
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
  const [activeTab, setActiveTab] = useState<'graphic' | 'video'>('graphic');
  const [dontShowAgain, setDontShowAgain] = useState(false);

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

  const graphicSteps = [
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
      title: 'स्टेप 2: AI टूल्स व लिंक ऑटोमेशन',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      badge: 'Gemini AI ऑटोमेशन',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'खबर का लिंक या विवरण पेस्ट करें। AI एक क्लिक में 3-लाइन कैची हेडलाइन, मुख्य कीवर्ड्स और आवश्यक विवरण तैयार कर देगा। साथ ही वेब से खबर के ओरिजिनल फोटो भी स्वतः फेच हो जाएंगे।',
      tips: 'यह आपका 80% समय बचाता है और खबर को सोशल मीडिया के लिए तुरंत वायरल-रेडी बनाता है।',
    },
    {
      step: 3,
      title: 'स्टेप 3: फोटो लेआउट व अपलोड',
      icon: <ImageIcon className="w-5 h-5 text-sky-400" />,
      badge: '1 से 4 फोटो ग्रिड',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description:
        'तय करें कि खबर 1 फोटो, 2 फोटो (ऊपर-नीचे या 50-50), 3 फोटो या 4 फोटो में बनेगी। गैलरी या कैमरे से फोटो अपलोड करें, और स्पेशल लीडर/पर्सन कटआउट PNG भी जोड़ें।',
      tips: 'फोटो को ड्रैग, ज़ूम और सही फ्रेम में पोजीशन भी कर सकते हैं।',
    },
    {
      step: 4,
      title: 'स्टेप 4: हेडलाइन, फॉन्ट व टेक्स्ट मैटर',
      icon: <Type className="w-5 h-5 text-red-400" />,
      badge: '3-लाइन हेडलाइन',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
      description:
        'अपनी मुख्य खबर का शीर्षक (हेडलाइन) 3 पंक्तियों में लिखें। फॉन्ट साइज एडजस्ट करें और महत्वपूर्ण शब्दों को पीले रंग से हाइलाइट करें। Baloo 2, Mukta, Noto Serif आदि 15 हिंदी फॉन्ट्स उपलब्ध हैं।',
      tips: 'शब्दों को सेलेक्ट करके [पीला रंग] बटन दबाएं ताकि मुख्य शब्द तुरंत आकर्षित करें।',
    },
    {
      step: 5,
      title: 'स्टेप 5: जिला, स्थान व दिनांक स्टैम्प',
      icon: <MapPin className="w-5 h-5 text-emerald-400" />,
      badge: 'लोकेशन व डेट',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description:
        'अपना जिला/स्थान (जैसे रीवा / सीधी / भोपाल / दिल्ली) दर्ज करें। 5 सॉफ्ट कलर शेड्स में लोकेशन बॉक्स और कॉम्पैक्ट डेट स्टैम्प उपलब्ध है।',
      tips: 'लोकेशन बॉक्स और डेट को जरूरत अनुसार एक क्लिक में ऑन या ऑफ (Show/Hide) कर सकते हैं।',
    },
    {
      step: 6,
      title: 'स्टेप 6: हैडर और फुटर ब्रांडिंग सेटिंग्स',
      icon: <Sliders className="w-5 h-5 text-purple-400" />,
      badge: 'लोगो व फुटर',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      description:
        'अपने न्यूज़ चैनल का लोगो, 14-कलर फुटर बैकग्राउंड पैलेट, व्हाट्सऐप नंबर और वेबसाइट सेट करें। प्रो और वीआईपी यूज़र्स कस्टम हेडर व फुटर PNG भी लगा सकते हैं।',
      tips: 'प्रोफ़ाइल में एक बार सेट किया गया लोगो और नाम हर ग्राफिक पर अपने आप लोड हो जाता है।',
    },
    {
      step: 7,
      title: 'स्टेप 7: डाउनलोड व कैप्शन (1080×1350 HD एक्सपोर्ट)',
      icon: <Download className="w-5 h-5 text-amber-400" />,
      badge: 'सोशल शेयर रेडी',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'फुल एचडी 1080x1350 पिक्सल में सोशल मीडिया रेडी कार्ड डाउनलोड करें। साथ ही एक क्लिक में पूरा हिंदी कैप्शन और हैशटैग्स कॉपी करके फेसबुक, इंस्टाग्राम व व्हाट्सएप पर शेयर करें।',
      tips: 'कैप्शन में आपकी चैनल आईडी, जिला और ट्रेंडिंग हैशटैग्स अपने आप जुड़ जाते हैं।',
    },
  ];

  const videoSteps = [
    {
      step: 1,
      title: 'स्टेप 1: वीडियो अपलोड या लिंक जोड़ें',
      icon: <Film className="w-5 h-5 text-red-400" />,
      badge: 'MP4 / YouTube',
      description:
        'गैलरी से अपना न्यूज़ वीडियो (MP4/WebM) अपलोड करें या YouTube/Social Media वीडियो लिंक पेस्ट करें।',
      tips: 'पोर्ट्रेट 9:16 रील्स और लैंडस्केप 16:9 टीवी दोनों फॉर्मेट समर्थित हैं।',
    },
    {
      step: 2,
      title: 'स्टेप 2: ब्रेकिंग टिकर व हेडलाइन स्ट्रिप',
      icon: <FileText className="w-5 h-5 text-yellow-400" />,
      badge: 'लाइव स्क्रॉल टिकर',
      description:
        'टीवी चैनलों की तरह स्क्रीन के निचले हिस्से पर रनिंग ब्रेकिंग न्यूज़ टिकर और टॉप हेडलाइन बैंड सक्रिय करें।',
      tips: 'आप टिकर की गति (स्पीड) और बैकग्राउंड रंग बदल सकते हैं।',
    },
    {
      step: 3,
      title: 'स्टेप 3: चैनल लोगो व वॉटरमार्क ओवरले',
      icon: <Layers className="w-5 h-5 text-sky-400" />,
      badge: 'ब्रांडिंग ओवरले',
      description:
        'अपने चैनल का पारदर्शी लोगो (PNG या लाइव GIF) स्क्रीन के ऊपरी दाएं या बाएं कोने पर सेट करें।',
      tips: 'इससे वीडियो चोरी होने से बचता है और चैनल की अलग पहचान बनती है।',
    },
    {
      step: 4,
      title: 'स्टेप 4: रेंडर व एचडी वीडियो एक्सपोर्ट',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      badge: 'HD एक्सपोर्ट',
      description:
        'लाइव प्रीव्यू देखें और 1080p क्वालिटी में रेंडर करके फेसबुक, यूट्यूब रील्स व व्हाट्सऐप स्टेटस पर सीधे पोस्ट करें।',
      tips: 'मास्टर एडमिन और वीआईपी यूज़र्स के वीडियो बिना किसी वॉटरमार्क के हाई-स्पीड रेंडर होते हैं।',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-['Baloo_2']">
                  AI News Maker उपयोग गाइड (ट्यूटोरियल)
                </h2>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  हेल्प
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                सरल हिंदी में समझें कि ग्राफिक और वीडियो कैसे बनाएं
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

        {/* Tab Selector: Graphic Studio vs Video Studio */}
        <div className="px-5 pt-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('graphic')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'graphic'
                ? 'bg-neutral-900 text-amber-300 border-amber-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>A. ग्राफिक फोटो स्टूडियो गाइड (7 चरण)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'video'
                ? 'bg-neutral-900 text-amber-300 border-amber-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/40'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>B. वीडियो न्यूज़ स्टूडियो गाइड</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 divide-y divide-neutral-800/60 text-neutral-200">
          {activeTab === 'graphic' ? (
            <>
              {/* Quick intro note */}
              <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-red-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between">
                <span>
                  📸 <strong>ग्राफिक स्टूडियो:</strong> 7 आसान चरणों में 1080x1350 फुल एचडी सोशल कार्ड बनाएं:
                </span>
                <span className="hidden sm:inline text-[11px] font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                  7 आसान स्टेप्स
                </span>
              </div>

              {/* Graphic Steps */}
              <div className="space-y-3 pt-2">
                {graphicSteps.map((item) => (
                  <div
                    key={item.step}
                    className="group p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-3 sm:gap-4"
                  >
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
            </>
          ) : (
            <>
              {/* Video Studio Intro */}
              <div className="bg-gradient-to-r from-red-500/10 via-neutral-900 to-amber-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between">
                <span>
                  🎬 <strong>वीडियो न्यूज़ स्टूडियो:</strong> टीवी स्टाइल रनिंग टिकर, लोगो ओवरले और एचडी एक्सपोर्ट:
                </span>
                <span className="hidden sm:inline text-[11px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                  रील्स व वीडियो
                </span>
              </div>

              {/* Video Steps */}
              <div className="space-y-3 pt-2">
                {videoSteps.map((item) => (
                  <div
                    key={item.step}
                    className="group p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-3 sm:gap-4"
                  >
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0 mt-0.5 shadow-inner">
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-extrabold text-white font-['Baloo_2']">
                          {item.title}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
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
            </>
          )}

          {/* Special Branding Guide */}
          <div className="pt-4 mt-2">
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-neutral-900/80 to-neutral-950 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📌</span>
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
                    ऐप के टॉप या बॉटम बार में <strong>'प्रोफ़ाइल'</strong> टैब पर क्लिक करें।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">2. लोगो व विवरण:</span>
                  <p className="text-[11px] text-neutral-300">
                    चैनल का नाम, यूज़रनेम, पारदर्शी <strong>लोगो PNG</strong> और जिला दर्ज करें।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">3. हेडर व फुटर PNG:</span>
                  <p className="text-[11px] text-neutral-300">
                    प्रो और वीआईपी यूज़र्स अपने चैनल का बना-बनाया <strong>टॉप हेडर</strong> व <strong>बॉटम फुटर PNG</strong> अपलोड कर सकते हैं।
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-1">
                  <span className="font-extrabold text-amber-400">4. सेव करें:</span>
                  <p className="text-[11px] text-neutral-300">
                    <strong>'हेडर/फुटर सुरक्षित करें'</strong> दबाएं। अब हर कार्ड पर आपकी ब्रांडिंग स्वतः दिखेगी!
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
            <span>समझ गया / शुरू करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
