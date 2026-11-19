import React, { useState } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Image,
  Layout,
  Type,
  MapPin,
  Download,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Film,
  Video,
  Music,
  Eye,
  Sliders,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface GraphicStudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'graphic' | 'video';
}

export const GraphicStudioGuideModal: React.FC<GraphicStudioGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'graphic',
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<'graphic' | 'video'>(initialTab);

  if (!isOpen) return null;

  // Canonical Graphic Studio 7 Steps
  const graphicGuideSteps = [
    {
      step: 1,
      icon: Sparkles,
      color: 'text-purple-400',
      title: 'स्टेप 1 — AI टूल्स (AI Tools)',
      desc: 'खबर का वेब लिंक (URL) डालें या प्रेस नोट टेक्स्ट पेस्ट करें। AI तुरंत 5 संतुलित हेडलाइन विकल्प, कीवर्ड्स व सोशल कैप्शन तैयार करेगा।',
    },
    {
      step: 2,
      icon: Layers,
      color: 'text-amber-400',
      title: 'स्टेप 2 — टेम्पलेट्स (Templates)',
      desc: 'अपनी खबर के अनुसार 8 प्रमुख श्रेणियों (रेगुलर, पैकेज, सुपर ब्रेकिंग, स्पेशल आदि) में से उपयुक्त 4:5 ग्राफ़िक फ्रेम चुनें।',
    },
    {
      step: 3,
      icon: Type,
      color: 'text-yellow-400',
      title: 'स्टेप 3 — हेडलाइन (Headline)',
      desc: 'मुख्य खबर का शीर्षक दर्ज करें। महत्वपूर्ण शब्दों को [yellow]शब्द[/yellow] से हाइलाइट करें, फ़ॉन्ट साइज़ और अलाइनमेंट सेट करें।',
    },
    {
      step: 4,
      icon: Image,
      color: 'text-emerald-400',
      title: 'स्टेप 4 — फोटो & वॉटरमार्क (Photo & Watermark)',
      desc: 'घटना की फोटो अपलोड करें। लेआउट (सिंगल/डबल/ग्रिड) चुनें। AI जनरेटेड या प्रतीकात्मक फोटो टैग (बॉक्स सहित/बिना बॉक्स) और वॉटरमार्क सेट करें।',
    },
    {
      step: 5,
      icon: MapPin,
      color: 'text-rose-400',
      title: 'स्टेप 5 — स्थान & दिनांक (Location & Date)',
      desc: 'खबर का शहर/जिला दर्ज करें और लोकेशन बैज PNG चुनें। दिनांक दिखाने का विकल्प टॉगल करें।',
    },
    {
      step: 6,
      icon: Layout,
      color: 'text-sky-400',
      title: 'स्टेप 6 — हेडर & फुटर (Header & Footer)',
      desc: 'अपने चैनल का लोगो, चैनल का नाम, रिपोर्टर नाम, सोशल मीडिया हैंडल्स और व्हाट्सएप नंबर व्यवस्थित करें।',
    },
    {
      step: 7,
      icon: Download,
      color: 'text-blue-400',
      title: 'स्टेप 7 — डाउनलोड & कैप्शन (Download & Caption)',
      desc: 'विस्तृत, बुलेट या संक्षिप्त कैप्शन कॉपी करें। सभी 7 स्टेप्स पूरे होने पर 1080×1350 पिक्सल का हाई-डेफिनिशन (HD) JPG डाउनलोड करें।',
    },
  ];

  // Canonical Video Studio 7 Steps
  const videoGuideSteps = [
    {
      step: 1,
      icon: Video,
      color: 'text-red-400',
      title: 'स्टेप 1 — वीडियो स्रोत (Upload / Source)',
      desc: 'अपने मोबाइल या कंप्यूटर से रॉ न्यूज़ वीडियो (MP4/MOV) अपलोड करें या लाइब्रेरी से क्लिप चुनें।',
    },
    {
      step: 2,
      icon: Sliders,
      color: 'text-amber-400',
      title: 'स्टेप 2 — आस्पेक्ट रेशियो व फ्रेम (Frame & Ratio)',
      desc: 'इंस्टाग्राम रील्स/यूट्यूब शॉर्ट्स के लिए 9:16 वर्टिकल या टीवी न्यूज़ के लिए 16:9 लैंडस्केप ब्रेकिंग फ्रेम चुनें।',
    },
    {
      step: 3,
      icon: Type,
      color: 'text-yellow-400',
      title: 'स्टेप 3 — हेडलाइन व टिकर (Headline & Live Ticker)',
      desc: 'स्क्रीन पर चमकने वाली मुख्य वीडियो ब्रेकिंग हेडलाइन दर्ज करें और नीचे चलने वाले लाइव टिकर टेक्स्ट को कस्टमाइज़ करें।',
    },
    {
      step: 4,
      icon: ShieldAlert,
      color: 'text-sky-400',
      title: 'स्टेप 4 — चैनल लोगो व वॉटरमार्क (Logo & Watermark)',
      desc: 'वीडियो के ऊपरी कोने में ट्रांसपेरेंट PNG चैनल लोगो लगाएं और कॉपीराइट सुरक्षा के लिए हल्का वॉटरमार्क जोड़ें।',
    },
    {
      step: 5,
      icon: Music,
      color: 'text-emerald-400',
      title: 'स्टेप 5 — ऑडियो व बैकग्राउंड म्यूजिक (Audio & BG Music)',
      desc: 'न्यूज़ वीडियो की मूल आवाज़ का स्तर तय करें और न्यूज़ रूम म्यूजिक लाइब्रेरी से रोमांचक ब्रेकिंग बैकग्राउंड म्यूजिक जोड़ें।',
    },
    {
      step: 6,
      icon: Eye,
      color: 'text-purple-400',
      title: 'स्टेप 6 — लाइव पूर्वावलोकन (Live Preview)',
      desc: 'वीडियो को रेंडर करने से पहले प्ले करके लाइव देखें कि टेक्स्ट, लोगो, टिकर और ऑडियो सटीक तालमेल में हैं या नहीं।',
    },
    {
      step: 7,
      icon: Film,
      color: 'text-blue-400',
      title: 'स्टेप 7 — रेंडर व एक्सपोर्ट (Render & Export)',
      desc: 'क्लाउड या ब्राउज़र इंजन द्वारा हाई क्वालिटी MP4 वीडियो तैयार करें और सीधे सोशल मीडिया (YouTube/Instagram/FB) पर साझा करें।',
    },
  ];

  const currentSteps = activeGuideTab === 'graphic' ? graphicGuideSteps : videoGuideSteps;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                AI न्यूज़ स्टूडियो — संपूर्ण यूज़र गाइड
              </h3>
              <p className="text-[11px] text-slate-400">
                सोशल मीडिया न्यूज़ कार्ड व वीडियो रील्स बनाने की 7-चरणीय मार्गदर्शिका
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

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-1 bg-slate-950 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveGuideTab('graphic')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeGuideTab === 'graphic'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. ग्राफ़िक फोटो स्टूडियो (7 स्टेप्स)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('video')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeGuideTab === 'video'
                ? 'bg-red-500 text-white shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>2. वीडियो न्यूज़ स्टूडियो (7 स्टेप्स)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Safe Zone Info Banner */}
          {activeGuideTab === 'graphic' ? (
            <div className="p-3 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Safe Zone (सेफ ज़ोन) क्या है?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Safe Zone बटन ऑन करने पर स्क्रीन पर एक गाइडलाइन दिखती है, जिससे सुनिश्चित होता है कि हेडलाइन, लोगो और फुटर इंस्टाग्राम/फेसबुक/व्हाट्सएप पर कटेंगे नहीं।
              </p>
            </div>
          ) : (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-red-300 font-bold">
                <Video className="w-4 h-4 text-red-400 shrink-0" />
                <span>वीडियो रील्स व शॉर्ट्स अनुपात (Aspect Ratio)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                स्मार्टफोन स्क्रीन के लिए 9:16 वर्टिकल रील्स चुनें। टीवी व यूट्यूब के लिए 16:9 लैंडस्केप मोड चुनें। वीडियो टिकर में ब्रेकिंग टेक्स्ट नीचे निरंतर स्क्रॉल होता रहेगा।
              </p>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span>{activeGuideTab === 'graphic' ? 'ग्राफ़िक निर्माण प्रक्रिया:' : 'वीडियो निर्माण प्रक्रिया:'}</span>
              <span className="text-[10px] text-slate-400">कुल 7 चरण</span>
            </div>
            {currentSteps.map((gs) => {
              const Icon = gs.icon;
              return (
                <div
                  key={gs.step}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3 hover:border-slate-700 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${gs.color}`} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{gs.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{gs.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Important Rules */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>डाउनलोड & एक्सपोर्ट नियम</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {activeGuideTab === 'graphic'
                ? 'डाउनलोड बटन तभी अनलॉक होता है जब सभी 7 स्टेप्स पूरे हो जाएं (100% प्रगति)। किसी स्टेप पर जाने के लिए एडिटर स्टेप्स सूची में संबंधित स्टेप पर टैप करें।'
                : 'वीडियो रेंडर से पहले पूर्वावलोकन अवश्य चलाकर देखें। एक्सपोर्ट होने के बाद वीडियो सीधे गैलरी में सेव हो जाएगा।'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {activeGuideTab === 'graphic' ? (
            <button
              type="button"
              onClick={() => setActiveGuideTab('video')}
              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>अगला: वीडियो स्टूडियो गाइड</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveGuideTab('graphic')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>वापस: ग्राफ़िक स्टूडियो गाइड</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer transition shadow"
          >
            समझ गया (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
