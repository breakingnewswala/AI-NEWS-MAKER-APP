import React from 'react';
import { X, Layers, Sparkles, Image, Layout, Type, MapPin, Download, CheckCircle, HelpCircle, ShieldAlert } from 'lucide-react';

interface GraphicStudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GraphicStudioGuideModal: React.FC<GraphicStudioGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const guideSteps = [
    {
      step: 1,
      icon: Layers,
      color: 'text-amber-400',
      title: 'स्टेप 1 — टेम्पलेट चुनें',
      desc: 'अपनी खबर के अनुसार 8 प्रमुख श्रेणियों (रेगुलर, पैकेज, सुपर ब्रेकिंग आदि) में से उपयुक्त 4:5 ग्राफ़िक फ्रेम चुनें।',
    },
    {
      step: 2,
      icon: Sparkles,
      color: 'text-purple-400',
      title: 'स्टेप 2 — AI टूल्स',
      desc: 'खबर का वेब लिंक (URL) डालें या प्रेस नोट टेक्स्ट पेस्ट करें। AI तुरंत 5 संतुलित हेडलाइन विकल्प व सोशल कैप्शन तैयार करेगा।',
    },
    {
      step: 3,
      icon: Layout,
      color: 'text-sky-400',
      title: 'स्टेप 3 — हेडर व फुटर',
      desc: 'अपने न्यूज़ चैनल का लोगो, चैनल का नाम, वॉटरमार्क और सोशल मीडिया हैंडल्स सेट करें।',
    },
    {
      step: 4,
      icon: Image,
      color: 'text-emerald-400',
      title: 'स्टेप 4 — फोटो व लेआउट',
      desc: 'घटना या खबर से संबंधित मुख्य फोटो अपलोड करें। सिंगल, डबल (35-65) या 4-इमेज ग्रिड लेआउट चुनें।',
    },
    {
      step: 5,
      icon: Type,
      color: 'text-yellow-400',
      title: 'स्टेप 5 — हेडलाइन एडिटर',
      desc: 'हेडलाइन के मुख्य शब्दों को [yellow]शब्द[/yellow] से हाइलाइट करें, फ़ॉन्ट आकार व अलाइनमेंट एडजस्ट करें।',
    },
    {
      step: 6,
      icon: MapPin,
      color: 'text-rose-400',
      title: 'स्टेप 6 — स्थान एवं दिनांक',
      desc: 'खबर का शहर/जिला दर्ज करें और लोकेशन बैज PNG चुनें। दिनांक दिखाने का विकल्प चुनें।',
    },
    {
      step: 7,
      icon: Download,
      color: 'text-blue-400',
      title: 'स्टेप 7 — कैप्शन व डाउनलोड',
      desc: 'विस्तृत, मुख्य बिंदु या संक्षिप्त कैप्शन में से चुनें और कॉपी करें। सभी 7 स्टेप्स पूरे होने पर 1080×1350 HD JPG डाउनलोड करें।',
    },
  ];

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
                ग्राफ़िक फोटो स्टूडियो — यूज़र गाइड
              </h3>
              <p className="text-[11px] text-slate-400">
                सोशल मीडिया न्यूज़ कार्ड बनाने की संपूर्ण चरणबद्ध मार्गदर्शिका
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Safe Zone Info Banner */}
          <div className="p-3 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-sky-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Safe Zone (सेफ ज़ोन) क्या है?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Safe Zone बटन ऑन करने पर स्क्रीन पर एक गाइडलाइन दिखती है, जिससे सुनिश्चित होता है कि हेडलाइन, लोगो और फुटर इंस्टाग्राम/फेसबुक पर कटेंगे नहीं।
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              7-स्टेप निर्माण प्रक्रिया:
            </div>
            {guideSteps.map((gs) => {
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
              <span>डाउनलोड अनलॉक नियम</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              डाउनलोड बटन तभी अनलॉक होता है जब सभी 7 स्टेप्स पूरे हो जाएं (100% प्रगति)। यदि कोई स्टेप छूट जाता है तो एडिटर स्टेप्स सूची में संबंधित स्टेप पर टैप करके उसे पूरा करें।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
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
