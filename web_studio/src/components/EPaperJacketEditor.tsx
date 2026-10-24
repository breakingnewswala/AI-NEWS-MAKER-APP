import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Trash2,
  Plus,
  Sliders,
  MapPin,
  User,
  ExternalLink,
  ShieldCheck,
  Type,
  BookOpen,
  Palette,
  Megaphone,
  Move,
  Maximize2,
  Crop,
} from 'lucide-react';
import { NewsCardData, EPaperAdSettings } from '../types';
import { VoiceInputButton } from './VoiceInputButton';
import { PhotoPositionControl } from './PhotoPositionControl';
import { EPaperAdControl } from './EPaperAdControl';

interface EPaperJacketEditorProps {
  card: NewsCardData;
  onChange: (updates: Partial<NewsCardData>) => void;
  activeSection?: 'ai-pressnote' | 'content' | 'photos' | 'ads' | 'caption';
}

export const EPaperJacketEditor: React.FC<EPaperJacketEditorProps> = ({
  card,
  onChange,
  activeSection = 'ai-pressnote',
}) => {
  const [activeTab, setActiveTab] = useState<'ai-pressnote' | 'content' | 'photos' | 'ads' | 'caption'>(activeSection);
  const [selectedAdTab, setSelectedAdTab] = useState<'ad1' | 'ad2'>('ad1');
  const [pressNoteText, setPressNoteText] = useState(card.epaperRawPressNote || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [cityInput, setCityInput] = useState(card.epaperCity || card.location?.split('/')[0]?.trim() || 'निवाड़ी');
  const [reporterInput, setReporterInput] = useState(card.epaperByline || 'फारूक अली / विशेष संवाददाता, निवाड़ी');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Sync internal state if card updates
  React.useEffect(() => {
    if (card.epaperCity && card.epaperCity !== cityInput) {
      setCityInput(card.epaperCity);
    }
  }, [card.epaperCity]);

  const handleProcessPressNote = async () => {
    if (!pressNoteText.trim() && !linkUrl.trim()) {
      setErrorMsg('कृपया प्रेस नोट का विवरण लिखें, बोलें या समाचार लिंक दर्ज करें।');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/process-epaper-pressnote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pressNoteText: pressNoteText.trim(),
          linkUrl: linkUrl.trim(),
          city: cityInput.trim(),
          reporterName: reporterInput.trim(),
          aiProvider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'प्रेस नोट प्रोसेस करने में त्रुटि आई।');
      }

      const data = json.data;

      // Update card state with structured newspaper data
      const updates: Partial<NewsCardData> = {
        epaperRawPressNote: pressNoteText.trim(),
        epaperCity: data.epaperCity || cityInput.trim() || 'निवाड़ी',
        epaperKicker: data.epaperKicker || 'विशेष रिपोर्ट',
        epaperHeadline: data.epaperHeadline || card.headline,
        formattedHeadline: data.epaperHeadline || card.headline,
        headline: data.epaperHeadline || card.headline,
        epaperSubHeadline: data.epaperSubHeadline || '',
        epaperByline: data.epaperByline || reporterInput.trim(),
        epaperArticleBody: data.epaperArticleBody || '',
        epaperHighlightsTitle: data.epaperHighlightsTitle || 'कार्रवाई के मुख्य बिंदु',
        epaperHighlights: Array.isArray(data.epaperHighlights) && data.epaperHighlights.length > 0
          ? data.epaperHighlights
          : card.epaperHighlights || ['घटनास्थल पर प्रशासनिक दल ने लिया जायजा', 'दोषियों के विरुद्ध सख्त वैधानिक कार्रवाई के निर्देश'],
        epaperQuoteText: data.epaperQuoteText || card.epaperQuoteText || '',
        epaperQuoteSpeaker: data.epaperQuoteSpeaker || card.epaperQuoteSpeaker || '',
        epaperShowQuote: Boolean(data.epaperQuoteText || card.epaperQuoteText),
        epaperStoryLayout: card.epaperStoryLayout || (data.epaperQuoteText ? '2_cols_with_quote' : '2_equal_cols'),
        epaperPhotoCaption: data.epaperPhotoCaption || card.epaperPhotoCaption || 'घटनास्थल पर जांच करती प्रशासनिक टीम।',
        epaperPhotoCaption2: data.epaperPhotoCaption2 || card.epaperPhotoCaption2 || 'जब्त दस्तावेज व सामग्री।',
        epaperPhotoCaption3: data.epaperPhotoCaption3 || card.epaperPhotoCaption3 || 'मौके पर उपस्थित जांच अधिकारी।',
        summary: data.summary || card.summary,
        category: data.category || card.category || 'प्रशासन',
        location: data.epaperCity || cityInput.trim() || 'निवाड़ी',
        showDate: false, // E-paper date is managed in header/byline
      };

      // If URL had an image, attach it
      if (data.pickedImages?.main && !card.images.main) {
        updates.images = {
          ...card.images,
          main: data.pickedImages.main,
        };
      }

      onChange(updates);
      setSuccessMsg('🎉 प्रेस नोट सफलतापूर्वक ई-पेपर अखबार स्टोरी में तैयार हो गया!');
      setActiveTab('content');
    } catch (err: any) {
      console.error('E-Paper press note process error:', err);
      setErrorMsg(err.message || 'प्रेस नोट प्रोसेस करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoKey: 'main' | 'second' | 'third') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const url = uploadEvent.target?.result as string;
      if (url) {
        const newImages = { ...card.images, [photoKey]: url };
        onChange({ images: newImages });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const url = uploadEvent.target?.result as string;
      if (url) {
        updateAd({
          showAd: true,
          type: 'image',
          imageUrl: url,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateAd = (updates: Partial<EPaperAdSettings>) => {
    const current = card.epaperAd || {
      showAd: true,
      placement: 'movable',
      type: 'template',
      templateType: 'wishes',
      x: 50,
      y: 60,
      width: 45,
      height: 25,
      title: 'हार्दिक शुभकामनाएं',
      subtitle: '',
      phone: card.whatsappNumber || '96698-02408',
      sponsorName: '',
      crop: { x: 50, y: 50, zoom: 1 },
    };
    onChange({
      epaperAd: {
        ...current,
        ...updates,
      },
    });
  };

  const handleSecondAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const url = uploadEvent.target?.result as string;
      if (url) {
        updateSecondAd({
          showAd: true,
          type: 'image',
          imageUrl: url,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateSecondAd = (updates: Partial<EPaperAdSettings>) => {
    const current = card.epaperSecondAd || {
      showAd: true,
      placement: 'movable',
      type: 'template',
      templateType: 'wishes',
      x: 52,
      y: 68,
      width: 44,
      height: 22,
      title: 'हार्दिक शुभकामनाएं',
      subtitle: '',
      phone: card.whatsappNumber || '96698-02408',
      sponsorName: '',
      crop: { x: 50, y: 50, zoom: 1 },
    };
    onChange({
      epaperSecondAd: {
        ...current,
        ...updates,
      },
    });
  };

  const handleHighlightChange = (index: number, val: string) => {
    const list = [...(card.epaperHighlights || [])];
    list[index] = val;
    onChange({ epaperHighlights: list });
  };

  const handleAddHighlight = () => {
    const list = [...(card.epaperHighlights || [])];
    list.push('नया महत्वपूर्ण बिंदु...');
    onChange({ epaperHighlights: list });
  };

  const handleRemoveHighlight = (index: number) => {
    const list = [...(card.epaperHighlights || [])];
    list.splice(index, 1);
    onChange({ epaperHighlights: list });
  };

  const copyCaptionToClipboard = () => {
    if (!card.summary) return;
    navigator.clipboard.writeText(card.summary);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveTab('ai-pressnote')}
          className={`py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'ai-pressnote'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">प्रेस नोट</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'content'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Type className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">खबर</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">फोटो (1-3)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'ads'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">विज्ञापन</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('caption')}
          className={`py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'caption'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">कैप्शन</span>
        </button>
      </div>

      {/* 1. AI PRESS NOTE TAB */}
      {activeTab === 'ai-pressnote' && (
        <div className="space-y-3.5">
          {/* Rules Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-200">ऑटोमैटिक पत्रकारिता शुद्धिकरण (AI De-Flattery):</span>
              पुलिस या सरकारी प्रेस नोट में लिखे औपचारिक शब्द जैसे <em>'श्री', 'श्रीमान', 'श्रीमती', 'माननीय', 'सम्मानीय', 'महोदय'</em> आदि स्वतः हटकर शुद्ध निष्पक्ष 2-कॉलम अखबार स्टोरी बनती है।
            </div>
          </div>

          {/* City / District & Reporter Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" />
                शहर / जिला (खबर की शुरुआत में बोल्ड दिखेगा):
              </label>
              <input
                type="text"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  onChange({ epaperCity: e.target.value, location: e.target.value });
                }}
                placeholder="उदा. निवाड़ी / इंदौर / भोपाल"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-yellow-400" />
                रिपोर्टर नाम / बायलाइन बॉक्स:
              </label>
              <input
                type="text"
                value={reporterInput}
                onChange={(e) => {
                  setReporterInput(e.target.value);
                  onChange({ epaperByline: e.target.value });
                }}
                placeholder="उदा. फारूक अली / विशेष संवाददाता, निवाड़ी"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Raw Press Note Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-500" />
                रॉ प्रेस नोट इनपुट (यहाँ पूरा प्रेस नोट पेस्ट करें या बोलें):
              </label>
              <VoiceInputButton
                onTranscript={(text) => {
                  setPressNoteText((prev) => (prev ? `${prev} ${text}` : text));
                }}
              />
            </div>
            <textarea
              rows={6}
              value={pressNoteText}
              onChange={(e) => setPressNoteText(e.target.value)}
              placeholder="यहाँ पुलिस, कलेक्ट्रेट, प्रशासन या रिपोर्टर का कच्चा प्रेस नोट पेस्ट करें (200 से 1000 शब्द)... उदाहरण: पुलिस अधीक्षक के निर्देशन में अवैध खनन माफिया पर दबिश देकर 5 डंपर जब्त किए गए..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 leading-relaxed focus:outline-none focus:border-red-500 placeholder:text-neutral-600 font-['Baloo_2',sans-serif]"
            />
          </div>

          {/* Optional News Link */}
          <div>
            <label className="text-[11px] font-bold text-neutral-400 mb-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3 text-neutral-500" />
              वैकल्पिक खबर लिंक (यदि किसी वेबसाइट खबर को ई-पेपर में बदलना हो):
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/news/article..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-600"
            />
          </div>

          {/* AI Engine Provider Selection */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-semibold text-neutral-400">AI मॉडल:</span>
            <div className="inline-flex rounded-lg bg-neutral-900 p-0.5 border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setAiProvider('gemini')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  aiProvider === 'gemini' ? 'bg-amber-400 text-neutral-950 shadow' : 'text-neutral-400'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setAiProvider('openai')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  aiProvider === 'openai' ? 'bg-emerald-500 text-white shadow' : 'text-neutral-400'
                }`}
              >
                OpenAI GPT-4o
              </button>
            </div>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleProcessPressNote}
            className="w-full py-3 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>AI ई-पेपर स्टोरी तैयार कर रहा है (अखबार लेआउट)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>⚡ AI से ई-पेपर अखबार स्टोरी तैयार करें</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 2. CONTENT EDIT TAB */}
      {activeTab === 'content' && (
        <div className="space-y-3.5">
          {/* Authentic Newspaper Theme & Typography Section */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>अखबार रियलिस्टिक थीम व फॉन्ट शैली (Authentic Newspaper Print)</span>
              </span>
              <span className="text-[10px] text-neutral-400">दैनिक भास्कर व अमर उजाला स्टाइल</span>
            </div>

            {/* Font Family Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-300 block">
                प्रामाणिक अखबार फॉन्ट (Authentic Devanagari Typography):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  {
                    id: 'serif-traditional',
                    title: 'पारंपरिक सेरिफ़',
                    fontName: 'Noto Serif',
                    desc: 'दैनिक भास्कर व अमर उजाला',
                    badge: 'अनुशंसित',
                  },
                  {
                    id: 'serif-martel',
                    title: 'मार्टेल सेरिफ़',
                    fontName: 'Martel Serif',
                    desc: 'प्रीमियम संपादकीय लुक',
                    badge: 'संपादकीय',
                  },
                  {
                    id: 'sans-modern',
                    title: 'आधुनिक संस',
                    fontName: 'Noto Sans',
                    desc: 'क्रिस्प डिजिटल ई-पेपर',
                    badge: 'मॉडर्न',
                  },
                  {
                    id: 'baloo',
                    title: 'बालू 2',
                    fontName: 'Baloo 2',
                    desc: 'राउंडेड डिस्प्ले',
                    badge: 'क्लासिक',
                  },
                ].map((f) => {
                  const currentFont = card.epaperFontFamily || 'serif-traditional';
                  const isSel = currentFont === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onChange({ epaperFontFamily: f.id as any })}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isSel
                          ? 'bg-amber-400/15 border-amber-400 text-white shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-tight">{f.title}</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                          isSel ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {f.badge}
                        </span>
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-1 leading-snug">{f.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paper Theme & Drop Cap Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Paper Tone */}
              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  कागज की रंगत (Paper Tone):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ epaperTheme: 'subtle-cream' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      (card.epaperTheme || 'subtle-cream') === 'subtle-cream'
                        ? 'bg-amber-900/30 border-amber-400 text-amber-200 shadow'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span>📜</span>
                    <span>न्यूजप्रिंट क्रीम (ऑफ-व्हाइट)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ epaperTheme: 'pure-white' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      card.epaperTheme === 'pure-white'
                        ? 'bg-neutral-800 border-white text-white shadow'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span>📄</span>
                    <span>प्योर व्हाइट</span>
                  </button>
                </div>
              </div>

              {/* Drop Cap Toggle */}
              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  अखबार ड्रॉप कैप (Drop Cap):
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ epaperDropCap: !(card.epaperDropCap ?? true) })}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-between cursor-pointer transition-all ${
                    (card.epaperDropCap ?? true)
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-serif font-black text-sm text-red-500 bg-neutral-900 px-1 rounded">अ</span>
                    <span>पहला अक्षर बड़ा (अखबार ड्रॉप कैप)</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold">
                    {(card.epaperDropCap ?? true) ? 'सक्रिय (ON)' : 'बंद (OFF)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Kicker / Category Ribbon */}
          <div>
            <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
              किकर / संदर्भ पट्टी (शीर्षक के ऊपर छोटा संदर्भ टैग):
            </label>
            <input
              type="text"
              value={card.epaperKicker || ''}
              onChange={(e) => onChange({ epaperKicker: e.target.value })}
              placeholder="उदा. विशेष कार्रवाई / खनिज माफिया पर शिकंजा"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-['Baloo_2']"
            />
          </div>

          {/* Main Headline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-neutral-200">
                अखबार मुख्य हेडलाइन (2-3 लाइन बोल्ड शीर्षक):
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <Sliders className="w-3 h-3" />
                <span>साइज: {card.headlineFontSize || 28}px</span>
              </div>
            </div>
            <textarea
              rows={2}
              value={card.epaperHeadline || card.headline || ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ epaperHeadline: val, headline: val, formattedHeadline: val });
              }}
              placeholder="मुख्य हेडलाइन लिखें..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm font-bold text-white leading-snug focus:outline-none focus:border-red-500 font-['Baloo_2']"
            />
            <input
              type="range"
              min={20}
              max={36}
              value={card.headlineFontSize || 28}
              onChange={(e) => onChange({ headlineFontSize: parseInt(e.target.value, 10) })}
              className="w-full mt-1 accent-red-500 cursor-pointer"
            />
          </div>

          {/* Sub-headline */}
          <div>
            <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
              उप-शीर्षक (Sub-headline - घटना का त्वरित सार):
            </label>
            <input
              type="text"
              value={card.epaperSubHeadline || ''}
              onChange={(e) => onChange({ epaperSubHeadline: e.target.value })}
              placeholder="उदा. कलेक्टर व एसपी के संयुक्त निर्देश पर तड़के 4 बजे दबिश, हड़कंप"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-['Baloo_2']"
            />
          </div>

          {/* City Dateline & Byline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                स्थान / संदर्भ:
              </label>
              <input
                type="text"
                value={card.epaperCity || ''}
                onChange={(e) => onChange({ epaperCity: e.target.value, location: e.target.value })}
                placeholder="निवाड़ी"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-['Baloo_2'] font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                रिपोर्टर बायलाइन पट्टी:
              </label>
              <input
                type="text"
                value={card.epaperByline || ''}
                onChange={(e) => onChange({ epaperByline: e.target.value })}
                placeholder="फारूक अली / विशेष संवाददाता, निवाड़ी"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-['Baloo_2']"
              />
            </div>
          </div>

          {/* Promotional Tagline (Right side of byline bar) */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-2.5">
            <label className="text-[11px] font-bold text-red-300 mb-1 flex items-center justify-between">
              <span>📢 प्रोमोशनल संदेश (बायलाइन पट्टी में दाईं ओर):</span>
              <span className="text-[10px] text-red-400/80 font-normal">पुराने 'पृष्ठ 1' के स्थान पर</span>
            </label>
            <input
              type="text"
              value={card.epaperPromoTagline || ''}
              onChange={(e) => onChange({ epaperPromoTagline: e.target.value })}
              placeholder="उदा. 📢 अब आप भी भेजें अपनी खबर हम तक: 96698-02408"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-red-300 font-bold focus:outline-none focus:border-red-500 font-['Baloo_2']"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              यहाँ रिपोर्टर के नाम के साथ अपना व्हाट्सएप्प नंबर या संदेश लिख सकते हैं जो पाठकों को खबर भेजने हेतु प्रेरित करेगा।
            </p>
          </div>

          {/* Story Column Layout Selector */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <span>📰</span>
                <span>अखबार खबर का कॉलम लेआउट (Justified Format):</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                100% Justified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: '2_equal_cols',
                  title: '2 समान कॉलम (Continuous)',
                  desc: 'पूरी खबर 2 बराबर कॉलम में (फोटो के नीचे)',
                  icon: '⚖️',
                },
                {
                  id: '2_cols_with_quote',
                  title: '2 कॉलम + अधिकारी/नेता का बयान',
                  desc: 'कॉलम 2 में बयान बॉक्स + खबर',
                  icon: '💬',
                },
                {
                  id: '2_cols_with_highlights',
                  title: '2 कॉलम + मुख्य बिंदु',
                  desc: 'कॉलम 2 में अहम बिंदु इनसेट बॉक्स',
                  icon: '📌',
                },
                {
                  id: 'story_with_highlights',
                  title: 'बाएं पूरी खबर + दाएं बिंदु (क्लासिक)',
                  desc: 'बाएं 60% खबर, दाएं पूरा इनसेट बॉक्स',
                  icon: '📑',
                },
              ].map((opt) => {
                const currentStoryLayout = card.epaperStoryLayout || '2_equal_cols';
                const isSelected = currentStoryLayout === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ epaperStoryLayout: opt.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-600/20 border-red-500 text-white shadow-md'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{opt.icon}</span>
                      <span className="text-xs font-bold text-white leading-tight">{opt.title}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 leading-snug">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leader / Official Quote Box */}
          {card.epaperStoryLayout === '2_cols_with_quote' && (
            <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>नेता / अधिकारी का बयान (Quote Call-out):</span>
                </label>
                <span className="text-[10px] text-neutral-400">अखबार स्टाइल कोटेशन</span>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">बयान / प्रतिक्रिया का कथन:</label>
                <textarea
                  rows={3}
                  value={card.epaperQuoteText || ''}
                  onChange={(e) => onChange({ epaperQuoteText: e.target.value })}
                  placeholder="उदा. 'जनहित और निष्पक्ष कार्रवाई के लिए प्रशासन पूरी तरह मुस्तैद है। किसी भी स्तर पर लापरवाही बर्दाश्त नहीं होगी।'"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white leading-relaxed focus:outline-none focus:border-red-500 font-['Baloo_2'] italic"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">बयान देने वाले का नाम व पद:</label>
                <input
                  type="text"
                  value={card.epaperQuoteSpeaker || ''}
                  onChange={(e) => onChange({ epaperQuoteSpeaker: e.target.value })}
                  placeholder="उदा. विनीत कपूर, पुलिस अधीक्षक अथवा डॉ. महेंद्र सिंह, प्रभारी"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-red-300 font-bold focus:outline-none focus:border-red-500 font-['Baloo_2']"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 self-center">क्विक पद:</span>
                {['पुलिस अधीक्षक (SP)', 'कलेक्टर (DM)', 'मुख्यमंत्री', 'क्षेत्रीय विधायक', 'प्रशासनिक प्रवक्ता'].map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => {
                      const city = card.epaperCity || 'जिला';
                      onChange({ epaperQuoteSpeaker: `${title}, ${city}` });
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-300 cursor-pointer"
                  >
                    + {title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article Story Body (2-Column Newspaper Story) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-neutral-200">
                अखबार स्टोरी बॉडी (2 कॉलम में प्रवाहित खबर):
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <Sliders className="w-3 h-3 text-red-400" />
                <span className="font-mono text-amber-300 font-bold">
                  {card.epaperFontSize || 17}px
                </span>
                <span className="text-[10px] text-neutral-500">
                  ({(card.epaperArticleBody || '').trim().split(/\s+/).filter(Boolean).length} शब्द)
                </span>
              </div>
            </div>
            <textarea
              rows={6}
              value={card.epaperArticleBody || ''}
              onChange={(e) => onChange({ epaperArticleBody: e.target.value })}
              placeholder="पूरी खबर का विवरण (उदा. निवाड़ी (विशेष संवाददाता): शहर के मुख्य तिराहे पर देर रात...)"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 leading-relaxed focus:outline-none focus:border-red-500 font-['Noto_Serif_Devanagari',serif]"
            />

            {/* Quick Size Presets & Auto-Fit */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
              <span className="text-[10px] text-neutral-400 font-medium">त्वरित साइज:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const wordCount = (card.epaperArticleBody || '').trim().split(/\s+/).filter(Boolean).length;
                    const hasBottomStrip = card.epaperAd?.showAd && card.epaperAd.placement === 'bottom_strip';
                    let idealSize = 17;
                    if (wordCount > 180) idealSize = 14;
                    else if (wordCount > 130) idealSize = 15;
                    else if (wordCount > 95) idealSize = 16;
                    else if (wordCount > 65) idealSize = 17;
                    else if (wordCount > 40) idealSize = 19;
                    else idealSize = 21;

                    if (hasBottomStrip && idealSize > 14) {
                      idealSize -= 1;
                    }
                    onChange({ epaperFontSize: idealSize });
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-500/60 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 cursor-pointer transition-all flex items-center gap-1"
                  title="खबर की लंबाई व विज्ञापन के अनुसार स्वतः सर्वश्रेष्ठ साइज सेट करें"
                >
                  ⚡ ऑटो-फिट
                </button>
                {[
                  { size: 15, label: '15px (अधिक खबर)' },
                  { size: 17, label: '17px (मानक अखबार)' },
                  { size: 20, label: '20px (बड़ा व स्पष्ट)' },
                ].map((preset) => {
                  const current = card.epaperFontSize || 17;
                  const isSel = current === preset.size;
                  return (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => onChange({ epaperFontSize: preset.size })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        isSel
                          ? 'bg-amber-400 text-neutral-950 border-amber-400 shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine Slider */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-[10px] text-neutral-500 font-mono">14px</span>
              <input
                type="range"
                min={14}
                max={24}
                value={card.epaperFontSize || 17}
                onChange={(e) => onChange({ epaperFontSize: parseInt(e.target.value, 10) })}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 font-mono">24px</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              💡 <b>सुझाव:</b> 90 से 130 शब्दों की खबर 17px पर दोनों कॉलम में पूरी तरह फिट होकर बिना कटे स्पष्ट दिखती है।
            </p>
          </div>

          {/* Highlights / Inset Box */}
          {(card.epaperStoryLayout === '2_cols_with_highlights' || card.epaperStoryLayout === 'story_with_highlights' || !card.epaperStoryLayout) && (
            <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>📌</span>
                  <span>अहम बिंदु / साइड इनसेट बॉक्स:</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>बिंदु जोड़ें</span>
                </button>
              </div>

              <input
                type="text"
                value={card.epaperHighlightsTitle || ''}
                onChange={(e) => onChange({ epaperHighlightsTitle: e.target.value })}
                placeholder="बॉक्स का शीर्षक (उदा. कार्रवाई के 3 मुख्य बिंदु)"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400 font-['Baloo_2']"
              />

              <div className="space-y-1.5">
                {(card.epaperHighlights || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-neutral-500 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleHighlightChange(idx, e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-yellow-500 font-['Baloo_2']"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PHOTOS TAB (UP TO 3 PHOTOS) */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          {/* Photo Layout & Count Selector */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-neutral-200 mb-1.5 block">
                ई-पेपर फोटो लेआउट स्टाइल चुनें:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { layout: '1_top', count: 1, label: '1 फोटो (शीर्ष पर बड़ी)', icon: '🖼️' },
                  { layout: '2_side', count: 2, label: '2 फोटो (साइड-बाय-साइड)', icon: '👥' },
                  { layout: '3_split', count: 3, label: '3 फोटो (1 बड़ी + 2 छोटी ग्रिड)', icon: '📰' },
                  { layout: '1_top_2_bottom', count: 3, label: '1 ऊपर + 2 नीचे (खबर के नीचे)', icon: '📐' },
                  { layout: '1_below_highlights', count: 1, label: '1 फोटो (हाइलाइट्स के नीचे)', icon: '📌' },
                  { layout: '1_thumb_left', count: 1, label: '1 थंबनेल (लेफ्ट कॉलम में)', icon: '🏷️' },
                  { layout: '2_column_bottom', count: 2, label: '2 फोटो (दोनों कॉलम के नीचे)', icon: '⬇️' },
                  { layout: '0_none', count: 0, label: '0 फोटो (केवल टेक्स्ट खबर)', icon: '📄' },
                ].map((opt) => {
                  const currentLayout = card.epaperPhotoLayout || (
                    card.epaperPhotoCount === 0 ? '0_none' :
                    card.epaperPhotoCount === 2 ? '2_side' :
                    card.epaperPhotoCount === 3 ? '3_split' :
                    '1_top'
                  );
                  const isSelected = currentLayout === opt.layout;
                  return (
                    <button
                      key={opt.layout}
                      type="button"
                      onClick={() => onChange({ epaperPhotoLayout: opt.layout as any, epaperPhotoCount: opt.count })}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-600/20 border-red-500 text-white shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-sm">{opt.icon}</div>
                      <div className="text-xs font-bold mt-1 text-white leading-tight">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Height Mode Selector */}
            {card.epaperPhotoCount !== 0 && card.epaperPhotoLayout !== '0_none' && (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-red-400" />
                    फोटो की ऊंचाई (हाइट) एडजस्टमेंट:
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {card.epaperPhotoHeightMode === 'compact' ? 'कॉम्पैक्ट (कम ऊंचाई, अधिक टेक्स्ट)' :
                     card.epaperPhotoHeightMode === 'tall' ? 'लंबा फोटो' :
                     card.epaperPhotoHeightMode === 'extra-tall' ? 'अतिरिक्त बड़ा फोटो' :
                     'सामान्य (संतुलित)'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'compact', label: 'कॉम्पैक्ट' },
                    { id: 'normal', label: 'सामान्य' },
                    { id: 'tall', label: 'लंबा' },
                    { id: 'extra-tall', label: 'बड़ा' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onChange({ epaperPhotoHeightMode: mode.id as any })}
                      className={`py-1 px-2 rounded-lg font-bold text-center border cursor-pointer ${
                        (card.epaperPhotoHeightMode || 'normal') === mode.id
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Photo 1: Main Photo */}
          {(card.epaperPhotoCount ?? 1) >= 1 && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                  फोटो 1 (मुख्य बड़ी तस्वीर)
                </span>
                {card.images.main && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> अपलोड है
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {card.images.main ? (
                  <img
                    src={card.images.main}
                    alt="Photo 1"
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-600 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-700">
                  <Upload className="w-3.5 h-3.5 text-red-400" />
                  <span>{card.images.main ? 'फोटो 1 बदलें' : 'फोटो 1 अपलोड करें'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'main')}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 mb-1 block">
                  फोटो 1 कैप्शन (अखबार में फोटो के नीचे विवरण):
                </label>
                <input
                  type="text"
                  value={card.epaperPhotoCaption || ''}
                  onChange={(e) => onChange({ epaperPhotoCaption: e.target.value })}
                  placeholder="उदा. कार्रवाई स्थल से जब्त डंपर व पोकलेन मशीनें।"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-['Baloo_2']"
                />
              </div>

              {/* Photo 1 Move / Position D-Pad Cursor */}
              {card.images.main && (
                <PhotoPositionControl
                  label="फोटो 1 कर्सर व स्थिति (Move / Position)"
                  crop={card.imagePositions?.main || { x: 50, y: 50, zoom: 1 }}
                  onChange={(cropUpdates) => {
                    const current = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
                    onChange({
                      imagePositions: {
                        ...card.imagePositions,
                        main: { ...current, ...cropUpdates },
                      },
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Photo 2 */}
          {(card.epaperPhotoCount ?? 1) >= 2 && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  फोटो 2
                </span>
                {card.images.second && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> अपलोड है
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {card.images.second ? (
                  <img
                    src={card.images.second}
                    alt="Photo 2"
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-600 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-700">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{card.images.second ? 'फोटो 2 बदलें' : 'फोटो 2 अपलोड करें'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'second')}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 mb-1 block">
                  फोटो 2 कैप्शन:
                </label>
                <input
                  type="text"
                  value={card.epaperPhotoCaption2 || ''}
                  onChange={(e) => onChange({ epaperPhotoCaption2: e.target.value })}
                  placeholder="उदा. पुलिस हिरासत में लिए गए आरोपी।"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-['Baloo_2']"
                />
              </div>

              {/* Photo 2 Move / Position D-Pad Cursor */}
              {card.images.second && (
                <PhotoPositionControl
                  label="फोटो 2 कर्सर व स्थिति (Move / Position)"
                  crop={card.imagePositions?.second || { x: 50, y: 50, zoom: 1 }}
                  onChange={(cropUpdates) => {
                    const current = card.imagePositions?.second || { x: 50, y: 50, zoom: 1 };
                    onChange({
                      imagePositions: {
                        ...card.imagePositions,
                        second: { ...current, ...cropUpdates },
                      },
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Photo 3 */}
          {(card.epaperPhotoCount ?? 1) >= 3 && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  फोटो 3
                </span>
                {card.images.third && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> अपलोड है
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {card.images.third ? (
                  <img
                    src={card.images.third}
                    alt="Photo 3"
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-600 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-700">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>{card.images.third ? 'फोटो 3 बदलें' : 'फोटो 3 अपलोड करें'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'third')}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 mb-1 block">
                  फोटो 3 कैप्शन:
                </label>
                <input
                  type="text"
                  value={card.epaperPhotoCaption3 || ''}
                  onChange={(e) => onChange({ epaperPhotoCaption3: e.target.value })}
                  placeholder="उदा. मौके पर पंचनामा बनाते अधिकारी।"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-['Baloo_2']"
                />
              </div>

              {/* Photo 3 Move / Position D-Pad Cursor */}
              {card.images.third && (
                <PhotoPositionControl
                  label="फोटो 3 कर्सर व स्थिति (Move / Position)"
                  crop={card.imagePositions?.third || { x: 50, y: 50, zoom: 1 }}
                  onChange={(cropUpdates) => {
                    const current = card.imagePositions?.third || { x: 50, y: 50, zoom: 1 };
                    onChange({
                      imagePositions: {
                        ...card.imagePositions,
                        third: { ...current, ...cropUpdates },
                      },
                    });
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. ADVERTISEMENT (मूवेबल, ऑटो-फिल व 2 बॉक्स विज्ञापन प्रणाली) */}
      {activeTab === 'ads' && (
        <div className="space-y-4">
          {/* Ad 1 vs Ad 2 Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setSelectedAdTab('ad1')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedAdTab === 'ad1'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>📦 विज्ञापन 1 (Ad 1)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  card.epaperAd?.showAd
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {card.epaperAd?.showAd ? 'चालू' : 'बंद'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAdTab('ad2')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedAdTab === 'ad2'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>📦 विज्ञापन 2 (Ad 2)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  card.epaperSecondAd?.showAd
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {card.epaperSecondAd?.showAd ? 'चालू' : 'बंद'}
              </span>
            </button>
          </div>

          {/* Quick Info / 2-Box Combo Guide */}
          <div className="p-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between text-[11px] text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold shrink-0">💡 2-बॉक्स कॉम्बो:</span>
              <span className="text-[11px] leading-snug">
                {card.epaperAd?.showAd && card.epaperSecondAd?.showAd
                  ? 'दोनों विज्ञापन सक्रिय हैं (उदा. 1 ऑटो-फिल + 1 मूवेबल बॉक्स)'
                  : card.epaperAd?.showAd
                  ? 'विज्ञापन 1 सक्रिय है | आप दूसरा विज्ञापन भी साथ में जोड़ सकते हैं'
                  : card.epaperSecondAd?.showAd
                  ? 'विज्ञापन 2 सक्रिय है'
                  : 'दोनों विज्ञापन बंद हैं'}
              </span>
            </div>
            {!card.epaperSecondAd?.showAd && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAdTab('ad2');
                  updateSecondAd({ showAd: true, placement: 'movable' });
                }}
                className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-2"
              >
                <Plus className="w-3 h-3" />
                <span>+ दूसरा जोड़ें</span>
              </button>
            )}
          </div>

          {/* Active Ad Controls */}
          {selectedAdTab === 'ad1' ? (
            <EPaperAdControl
              adKey="ad1"
              boxName="विज्ञापन बॉक्स 1 (मुख्य Ad Box)"
              subTitle="अखबार के खाली स्थान पर ऑटो-फिल या मूवेबल विज्ञापन"
              adSettings={card.epaperAd}
              whatsappNumber={card.whatsappNumber}
              onUpdate={updateAd}
              accentColor="red"
            />
          ) : (
            <EPaperAdControl
              adKey="ad2"
              boxName="विज्ञापन बॉक्स 2 (अतिरिक्त Ad Box)"
              subTitle="अतिरिक्त खाली स्थान के लिए दूसरा मूवेबल या ऑटो-फिल बॉक्स"
              adSettings={card.epaperSecondAd}
              whatsappNumber={card.whatsappNumber}
              onUpdate={updateSecondAd}
              accentColor="amber"
            />
          )}
        </div>
      )}

      {/* 5. SOCIAL MEDIA CAPTION TAB */}
      {activeTab === 'caption' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200">
              सोशल मीडिया पोस्ट विवरण (Instagram व Facebook हेतु):
            </span>
            <button
              type="button"
              onClick={copyCaptionToClipboard}
              className="py-1 px-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-800" />
                  <span>कॉपी हो गया!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>1-क्लिक कॉपी</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={8}
            value={card.summary || ''}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="सोशल मीडिया विवरण..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 leading-relaxed focus:outline-none focus:border-yellow-400 font-['Baloo_2']"
          />
        </div>
      )}
    </div>
  );
};
