import React, { useState } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Tv,
  FileImage,
  SlidersHorizontal,
  Sliders,
  Settings,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { NewsCardData } from '../types';
import { CardPreview } from './CardPreview';
import { ProfileScreenWeb } from './ProfileScreenWeb';
import { ReporterUser } from './LoginModal';
import { isUserAdmin } from '../lib/userPlanManager';

interface ExportScreenWebProps {
  card: NewsCardData;
  onDownload: (format?: 'png' | 'jpeg') => void;
  downloading: boolean;
  onCopyImage: () => void;
  copied: boolean;
  onOpenCaptionModal: () => void;
  currentUser: ReporterUser | null;
  onLogout: () => void;
  onAddNewPost: (post: any) => void;
  onOpenStudio: () => void;
  onNavigateToGenerator: () => void;
}

export const ExportScreenWeb: React.FC<ExportScreenWebProps> = ({
  card,
  onDownload,
  downloading,
  onCopyImage,
  copied,
  onOpenCaptionModal,
  currentUser,
  onLogout,
  onAddNewPost,
  onOpenStudio,
  onNavigateToGenerator,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'settings'>('export');
  const [selectedFormat, setSelectedFormat] = useState<'4:5' | '9:16' | '16:9'>('4:5');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedAnchor, setCopiedAnchor] = useState(false);

  const isAdmin = isUserAdmin(currentUser);

  // Auto-formatted social media caption with hashtags
  const captionText = `${card.headline || 'ताज़ा समाचार'}

${card.summary || ''}

📍 स्थान: ${card.location || 'मध्य प्रदेश'}
📅 दिनांक: ${card.date || 'आज'}

#BreakingNews #HindiNews #${(card.location || 'MP').replace(/\s+/g, '')}News #${(card.category || 'News').replace(/\s+/g, '')} #AINewsMaker`;

  const anchorScriptText = `नमस्कार, मैं एआई न्यूज़ से। इस समय की बड़ी खबर आ रही है ${card.location || 'मध्य प्रदेश'} से। ${card.headline || ''}। अधिकारियों द्वारा आवश्यक संज्ञान लेकर अग्रिम कार्रवाई की जा रही है। आइए देखते हैं पूरी रिपोर्ट।`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyAnchor = () => {
    navigator.clipboard.writeText(anchorScriptText);
    setCopiedAnchor(true);
    setTimeout(() => setCopiedAnchor(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24 text-slate-100">
      {/* Top Toggle: Export Hub vs Settings/Admin */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex items-center shadow-lg w-full max-w-md">
          <button
            onClick={() => setActiveSubTab('export')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'export'
                ? 'bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>एक्सपोर्ट व डाउनलोड</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isAdmin ? 'कंट्रोल पैनल (10 ऑप्शंस)' : 'प्रोफाइल व सेटिंग्स'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'settings' ? (
        <ProfileScreenWeb
          currentUser={currentUser}
          onLogout={onLogout}
          onAddNewPost={onAddNewPost}
          onOpenStudio={onOpenStudio}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Card Preview (lg: 6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3 px-1">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <FileImage className="w-4 h-4" />
                  <span>लाइव न्यूज़ कार्ड प्रीव्यू</span>
                </span>

                <button
                  onClick={onNavigateToGenerator}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>जनरेटर में एडिट करें</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Responsive Card Container without overflow */}
              <div className="w-full flex justify-center overflow-hidden rounded-xl shadow-2xl bg-black/40 p-1">
                <CardPreview
                  card={card}
                  scale={0.78}
                  containerClassName="shadow-2xl rounded-lg"
                />
              </div>

              {/* Format Switcher Pills */}
              <div className="flex items-center justify-center gap-2 w-full mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedFormat('4:5')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    selectedFormat === '4:5'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>4:5 पोस्ट</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('9:16')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    selectedFormat === '9:16'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3 rotate-90" />
                  <span>9:16 रील</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('16:9')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    selectedFormat === '16:9'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>16:9 टीवी</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Instant Download & Social Copy Actions (lg: 6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Primary Download Actions Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <h3 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>हाई-रिज़ॉल्यूशन डाउनलोड व एक्सपोर्ट</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                प्रेस-क्वालिटी HD इमेज (1080x1350) में डाउनलोड करें या क्लिपबोर्ड पर कॉपी करें।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => onDownload('jpeg')}
                  disabled={downloading}
                  className="py-3 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>{downloading ? 'तैयार हो रहा है...' : 'HD JPG डाउनलोड करें'}</span>
                </button>

                <button
                  onClick={() => onDownload('png')}
                  disabled={downloading}
                  className="py-3 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>HD PNG डाउनलोड करें</span>
                </button>
              </div>

              <button
                onClick={onCopyImage}
                disabled={downloading}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700/80 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-black">इमेज क्लिपबोर्ड में कॉपी हो गई!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>इमेज क्लिपबोर्ड में कॉपी करें (Ctrl+V)</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Caption Generator Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  <span>सोशल मीडिया विवरण व हैशटैग</span>
                </h3>

                <button
                  onClick={handleCopyCaption}
                  className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">कॉपी हुआ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>कैप्शन कॉपी करें</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {captionText}
              </div>

              <button
                onClick={onOpenCaptionModal}
                className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI द्वारा और अधिक हैशटैग व 3 पैराग्राफ कैप्शन बनाएं</span>
              </button>
            </div>

            {/* Anchor Script Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🎙️</span>
                  <span>टेलीप्रॉम्प्टर / टीवी एंकर स्क्रिप्ट</span>
                </h3>

                <button
                  onClick={handleCopyAnchor}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedAnchor ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">कॉपी हुआ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>स्क्रिप्ट कॉपी</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed italic">
                "{anchorScriptText}"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
