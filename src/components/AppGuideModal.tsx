import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Video,
  Film,
  Music,
  Maximize2,
  Tv,
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
  const [activeGuideTab, setActiveGuideTab] = useState<'graphic' | 'video'>('graphic');
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
      title: '1. होम फ़ीड से खबर चुनें या फ़िल्टर करें',
      icon: <Layers className="w-5 h-5 text-yellow-400" />,
      badge: 'होम फ़ीड',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      description:
        'होम स्क्रीन पर देश, राजनीति, राज्य, खेल, व्यापार व क्राइम कैटेगरी के अनुसार ताज़ा खबरें देखें। किसी भी खबर के नीचे दिए गए मुख्य बिंदुओं को पढ़ें।',
      tips: 'आप अपनी पसंद की कैटेगरी चुनकर पसंदीदा खबरें जल्दी ढूंढ सकते हैं।',
    },
    {
      step: 2,
      title: '2. "खबर से ग्राफिक बनाएँ" पर क्लिक करें',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      badge: 'ब्रांडेड लोडर',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'बटन दबाते ही 10-सेकंड का प्रतिष्ठित AI News Maker संपादकीय लोडर शुरू होता है। यदि खबर पहले से स्वीकृत है तो बिना किसी AI खर्च के 5 संतुलित हेडलाइन तुरंत तैयार मिलती हैं।',
      tips: 'लोडर के दौरान स्क्रीन पर पत्रकारिता तथ्यों की समीक्षा और लेआउट मैपिंग की प्रगति दिखाई देती है।',
    },
    {
      step: 3,
      title: '3. पाँच संतुलित AI हेडलाइन में से मनपसंद चुनें',
      icon: <Type className="w-5 h-5 text-red-400" />,
      badge: '5 संतुलित विकल्प',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
      description:
        'रेडियो बटन से 5 अलग-अलग पत्रकारिता कोणों (मुख्य घटना, पात्र कोण, कार्रवाई, मुख्य बिंदु, सारगर्भित) में से अपनी पसंद की हेडलाइन चुनें और ज़रूरत पड़ने पर संपादित करें।',
      tips: 'हर हेडलाइन में शब्द और अक्षर संख्या (100-150 सीमा) लाइव दिखाई देती है।',
    },
    {
      step: 4,
      title: '4. फोटो समीक्षा, अतिरिक्त फोटो व कटआउट जोड़ें',
      icon: <ImageIcon className="w-5 h-5 text-sky-400" />,
      badge: 'मल्टी-फोटो ग्रिड',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description:
        'वेबसाइट से प्राप्त फोटो को रखें, गैलरी से 3 अतिरिक्त फोटो तक अपलोड करें या 1, 2, 3, 4 फोटो ग्रिड लेआउट में सेट करें। आप पारदर्शी लीडर कटआउट PNG भी जोड़ सकते हैं।',
      tips: 'फोटो को टच करके ज़ूम और स्थिति समायोजित की जा सकती है।',
    },
    {
      step: 5,
      title: '5. लोकेशन, सोशल हैंडल व हाई-रेज़ डाउनलोड',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      badge: 'फुल एचडी एक्सपोर्ट',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description:
        'अपना जिला या स्थान डालें। आपका चैनल लोगो, हेडर, फुटर और सोशल मीडिया हैंडल्स पहले से सेट रहेंगे। एक क्लिक में 1080x1350 फुल एचडी जेपीईजी या पीएनजी डाउनलोड करें।',
      tips: 'कैप्शन को भी एक क्लिक में कॉपी करके सीधे सोशल मीडिया (FB/Insta/WhatsApp) पर पेस्ट कर सकते हैं।',
    },
  ];

  const videoSteps = [
    {
      step: 1,
      title: '1. वीडियो एंड रील्स सेक्शन में वीडियो चुनें',
      icon: <Film className="w-5 h-5 text-red-400" />,
      badge: 'वीडियो फ़ीड',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
      description:
        'टॉप मेन्यू में "🎬 वीडियो एंड रील्स" टैब खोलें। ट्रेंडिंग वीडियो स्टोरीज़, बाइट्स और ग्राउंड रिपोर्ट्स को इनलाइन प्ले करके प्रीव्यू करें।',
      tips: 'बोनस वीडियो देखने और बनाने पर रिवॉर्ड कॉइन्स भी मिलते हैं।',
    },
    {
      step: 2,
      title: '2. "वीडियो न्यूज़ बनाएं" से वीडियो स्टूडियो में जाएं',
      icon: <Video className="w-5 h-5 text-amber-400" />,
      badge: 'वीडियो स्टूडियो',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'पसंदीदा वीडियो कार्ड पर "वीडियो न्यूज़ बनाएं" बटन दबाएं। वीडियो तुरंत वीडियो न्यूज़ स्टूडियो में लोड हो जाएगा, जहां आप अपनी ब्रांडिंग जोड़ सकते हैं।',
      tips: 'आप अपनी फ़ोन गैलरी या कंप्यूटर से भी कस्टम MP4 वीडियो फ़ाइल अपलोड कर सकते हैं।',
    },
    {
      step: 3,
      title: '3. आस्पेक्ट रेश्यो चुनें (16:9, 9:16 रील्स, 1:1 स्क्वायर)',
      icon: <Maximize2 className="w-5 h-5 text-sky-400" />,
      badge: 'सोशल मीडिया रेश्यो',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description:
        'इंस्टाग्राम रील्स/यूट्यूब शॉर्ट्स के लिए 9:16 वर्टिकल, यूट्यूब/टीवी स्क्रीन के लिए 16:9 हॉरिजॉन्टल, या फ़ेसबुक/ट्विटर के लिए 1:1 स्क्वायर रेश्यो चुनें।',
      tips: 'रेश्यो बदलते ही वीडियो फ्रेम और टेक्स्ट टिकर स्वतः उसी माप में सेट हो जाते हैं।',
    },
    {
      step: 4,
      title: '4. टीवी न्यूज़ फ्रेम्स, ब्रेकिंग टिकर व लोगो लगाएं',
      icon: <Tv className="w-5 h-5 text-yellow-400" />,
      badge: 'टीवी फ्रेम्स',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      description:
        'सुपर ब्रेकिंग लाल पट्टी, टीवी न्यूज़ चैनल हेडर, लाइव टिकर, जिला लोकेशन और अपना चैनल लोगो वीडियो के ऊपर पेशेवर अंदाज़ में लगाएं।',
      tips: 'हेडलाइन टेक्स्ट को 2 या 3 लाइनों में अपनी सुविधा अनुसार संपादित किया जा सकता है।',
    },
    {
      step: 5,
      title: '5. बैकग्राउंड म्यूज़िक, ऑडियो व एक्सपोर्ट/शेयर',
      icon: <Music className="w-5 h-5 text-emerald-400" />,
      badge: 'ऑडियो व रेंडरिंग',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description:
        'न्यूज़ बीट्स, सस्पेंस टोन या ब्रेकिंग चाइम म्यूज़िक जोड़ें। वीडियो को रेंडर करके सीधे गैलरी में सेव करें या व्हाट्सएप और यूट्यूब पर शेयर करें।',
      tips: 'वीडियो प्रीव्यू में प्ले/पॉज़ करके अंतिम रेंडर से पहले पूरा लुक चेक कर सकते हैं।',
    },
  ];

  const currentSteps = activeGuideTab === 'graphic' ? graphicSteps : videoSteps;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-['Baloo_2']">
                  ऐप कैसे उपयोग करें? (User Guide)
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
                  मार्गदर्शिका
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                सरल स्टेप्स में ग्राफिक फोटो व वीडियो न्यूज़ बनाना सीखें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Tabs: Graphic Studio vs Video Studio per Section 3.2 */}
        <div className="p-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveGuideTab('graphic')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeGuideTab === 'graphic'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>(A) ग्राफिक फोटो स्टूडियो गाइड</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveGuideTab('video')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeGuideTab === 'video'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>(B) वीडियो न्यूज़ स्टूडियो गाइड</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-neutral-200">
          {/* Quick intro note */}
          <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-red-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-200 flex items-center justify-between">
            <span>
              👋 <strong>{activeGuideTab === 'graphic' ? 'ग्राफिक फोटो स्टूडियो' : 'वीडियो न्यूज़ स्टूडियो'}:</strong> नीचे दिए गए 5 आसान चरणों का पालन करें:
            </span>
            <span className="text-[11px] font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/30">
              5 सरल स्टेप्स
            </span>
          </div>

          {/* Step list */}
          <div className="space-y-3">
            {currentSteps.map((item) => (
              <div
                key={item.step}
                className="group p-3 sm:p-4 rounded-2xl bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-3 sm:gap-4"
              >
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0 mt-0.5 shadow-inner">
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-white font-['Baloo_2']">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {item.description}
                  </p>

                  <p className="text-[11px] text-amber-300/90 font-medium mt-1 flex items-center gap-1">
                    <span>💡</span>
                    <span>{item.tips}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Special Dedicated Section: Header & Footer Customization via Profile */}
          {activeGuideTab === 'graphic' && (
            <div className="pt-2">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-red-600/10 border-2 border-amber-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏷️</span>
                    <h3 className="text-sm sm:text-base font-black text-amber-300 font-['Baloo_2']">
                      विशेष टिप: चैनल हेडर व फुटर कैसे सेट करें?
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-neutral-950">
                    प्रोफ़ाइल सेटिंग्स
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  ऐप में बार-बार हेडर-फुटर लगाने की आवश्यकता नहीं है। <strong>&apos;प्रोफ़ाइल&apos;</strong> टैब में जाकर अपना न्यूज़ चैनल लोगो, टॉप हेडर PNG और बॉटम फुटर PNG एक बार सेव करें, यह हर न्यूज़ कार्ड पर अपने आप लग जाएगा!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
            />
            <span>लॉगिन पर दोबारा यह गाइड स्वतः न खोलें</span>
          </label>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>समझ गया / शुरू करें</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
