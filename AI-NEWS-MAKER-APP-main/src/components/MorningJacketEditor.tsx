import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  Wand2,
  Type,
  Palette,
  Sliders,
  Eye,
  EyeOff,
  Upload,
  RotateCcw,
  Sun,
  Feather,
} from 'lucide-react';
import { NewsCardData } from '../types';
import { VoiceInputButton } from './VoiceInputButton';

interface MorningJacketEditorProps {
  card: NewsCardData;
  onChange: (updates: Partial<NewsCardData>) => void;
  initialTab?: 'ai-generator' | 'edit-text' | 'background' | 'caption';
}

// 6 Curated Soft & Light Backgrounds (Bright, serene, daylight, soft bokeh)
const SOFT_LIGHT_BACKGROUNDS = [
  {
    id: 'soft-sunrise',
    name: 'सॉफ्ट सनराइज',
    desc: 'हल्की सुनहरी धूप व शांत पहाड़ियां',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'morning-mist',
    name: 'शांत सुबह व धुंध',
    desc: 'पेड़ों के बीच से छनती सौम्य रोशनी',
    url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'green-canopy',
    name: 'हरी-भरी ताजगी',
    desc: 'ताजा सुबह और हल्की हरियाली',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'pastel-clouds',
    name: 'पेस्टल बादलों की भोर',
    desc: 'हल्का गुलाबी व सुनहरी सुबह का आकाश',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'calm-lake',
    name: 'शांत जल व क्षितिज',
    desc: 'सरोवर का शांत प्रतिबिंब व सौम्य प्रकाश',
    url: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'morning-sunlight',
    name: 'प्रकृति की मधुर धूप',
    desc: 'सॉफ्ट नेचुरल वॉर्म डेलाइट',
    url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=300&auto=format&fit=crop',
  },
];

// Quick Category / Badge presets
const BADGE_PRESETS = [
  '🌅 आज का विचार',
  '✨ अनमोल सुविचार',
  '💡 जीवन सूत्र',
  '🌸 प्रेरक प्रसंग',
  '🍃 स्वास्थ्य विचार',
  '🎯 सफलता का मंत्र',
  '🧘 शांति और धैर्य',
  '📖 भगवद्गीता सार',
  '💪 फिटनेस मंत्र',
];

// Quick AI Thought Suggestions
const QUICK_TOPICS = [
  'सकारात्मक सोच और निरंतर प्रयास पर विचार',
  'सुबह 20 मिनट वॉक के 3 स्वर्णिम फायदे',
  'कड़ी मेहनत और धैर्य से सफलता',
  'खाली पेट गुनगुना पानी पीने के 3 नियम',
  'मानसिक शांति और तनावमुक्ति के उपाय',
  'समय के सदुपयोग पर अनमोल विचार',
];

export const MorningJacketEditor: React.FC<MorningJacketEditorProps> = ({
  card,
  onChange,
  initialTab = 'ai-generator',
}) => {
  const [activeTab, setActiveTab] = useState<'edit-text' | 'background' | 'ai-generator' | 'caption'>(initialTab);
  const [commandPrompt, setCommandPrompt] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefiningImage, setIsRefiningImage] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Build formatted headline with [yellow]...[/yellow] tags while preserving line breaks
  const buildFormattedHeadline = (rawHeadline: string, highlights: string[]) => {
    if (!rawHeadline) return '';
    const cleanHighlights = (highlights || [])
      .map((h) => h.trim().replace(/[.,:;!?।\-"'“”‘’()]/g, '').toLowerCase())
      .filter(Boolean);

    if (cleanHighlights.length === 0) {
      return rawHeadline.replace(/\[yellow\]/g, '').replace(/\[\/yellow\]/g, '');
    }

    const lines = rawHeadline.split(/\r?\n/);
    return lines
      .map((line) => {
        const tokens = line.split(/\s+/).filter(Boolean);
        return tokens
          .map((tok) => {
            const clean = tok.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim().toLowerCase();
            const isMatch = cleanHighlights.some(
              (h) => h === clean || h.split(/\s+/).some((part) => part === clean)
            );
            if (isMatch) {
              return `[yellow]${tok}[/yellow]`;
            }
            return tok;
          })
          .join(' ');
      })
      .join('\n');
  };

  // Toggle word highlight in Yellow
  const toggleWordHighlight = (word: string) => {
    const cleanWord = word.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim();
    if (!cleanWord) return;

    const currentHighlights = card.highlightWords || [];
    const exists = currentHighlights.some(
      (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
    );

    let newHighlights: string[];
    if (exists) {
      newHighlights = currentHighlights.filter(
        (hw) => hw.toLowerCase() !== cleanWord.toLowerCase()
      );
    } else {
      newHighlights = [...currentHighlights, cleanWord];
    }

    const formatted = buildFormattedHeadline(card.headline, newHighlights);

    onChange({
      highlightWords: newHighlights,
      formattedHeadline: formatted,
    });
  };

  // Clear all word highlights
  const handleClearHighlights = () => {
    onChange({
      highlightWords: [],
      formattedHeadline: card.headline.replace(/\[yellow\]/g, '').replace(/\[\/yellow\]/g, ''),
    });
  };

  // Handle Headline Text Change
  const handleHeadlineChange = (newHeadline: string) => {
    const formatted = buildFormattedHeadline(newHeadline, card.highlightWords || []);
    onChange({
      headline: newHeadline,
      formattedHeadline: formatted,
    });
  };

  // Handle Sub-quote Text Change
  const handleSubQuoteChange = (text: string) => {
    onChange({
      morningThoughtQuote: text,
      morningTakeaway: text,
    });
  };

  // Handle Custom Image Upload from device
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange({
          images: {
            ...card.images,
            main: dataUrl,
          },
          morningCustomBgUrl: dataUrl,
        });
        setSuccessMsg('✅ आपकी चुनी गई सॉफ्ट बैकग्राउंड फोटो सफलतापूर्वक सेट हो गई!');
      }
    };
    reader.readAsDataURL(file);
  };

  // AI Generation of Thought + Soft Background
  const handleGenerate = async (explicitPrompt?: string) => {
    let promptToUse = (explicitPrompt || commandPrompt).trim();
    if (!promptToUse) {
      const randTopic = QUICK_TOPICS[Math.floor(Math.random() * QUICK_TOPICS.length)];
      promptToUse = randTopic;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/generate-morning-jacket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: promptToUse,
          topicPrompt: promptToUse,
          action: 'generate',
          generateImage: true,
          variation: Date.now() % 5,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'एआई विचार व इमेज जनरेशन में समस्या आई।');
      }

      const result = await response.json();
      const content = result.data;
      const imageUrl = result.imageUrl;

      onChange({
        headline: content.headline || promptToUse,
        formattedHeadline: content.formattedHeadline || content.headline || promptToUse,
        morningThoughtQuote: content.thoughtQuote || '',
        morningTakeaway: content.thoughtQuote || '',
        morningBadgeText: content.badgeText || '🌅 आज का विचार',
        summary: content.summary || '',
        images: {
          ...card.images,
          main: imageUrl || card.images.main || '',
        },
        morningCustomBgUrl: imageUrl || '',
        calloutTag: card.calloutTag || '🔴 पूरी खबर डिस्क्रिप्शन में',
        showCallout: true,
        morningVariationIndex: 0,
      });

      setSuccessMsg('✨ सुविचार और सॉफ्ट बैकग्राउंड तैयार हो गए हैं!');
      setCommandPrompt('');
      setActiveTab('edit-text');
    } catch (err: any) {
      console.error('Error in handleGenerate:', err);
      setErrorMsg(err.message || 'जनरेशन विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setIsGenerating(false);
    }
  };

  // Change Background Image via AI
  const handleRefineOrChangeImage = async (customCommand?: string) => {
    const activeCommand = (customCommand || refinementPrompt).trim() || 'सॉफ्ट लाइट बैकग्राउंड इमेज बदलें';
    setIsRefiningImage(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const nextVariation = ((card.morningVariationIndex || 0) + 1) % 5;
      const response = await fetch('/api/generate-morning-jacket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: activeCommand,
          action: 'change_image',
          refinementCommand: activeCommand,
          currentCard: {
            headline: card.headline,
            formattedHeadline: card.formattedHeadline,
            morningBadgeText: card.morningBadgeText,
            morningThoughtQuote: card.morningThoughtQuote,
            summary: card.summary,
          },
          variation: nextVariation,
          generateImage: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'इमेज बदलने में त्रुटि हुई।');
      }

      const result = await response.json();
      const imageUrl = result.imageUrl;

      if (imageUrl) {
        onChange({
          images: {
            ...card.images,
            main: imageUrl,
          },
          morningCustomBgUrl: imageUrl,
          morningVariationIndex: nextVariation,
        });
        setSuccessMsg('🔄 नया सॉफ्ट बैकग्राउंड सेट कर दिया गया है!');
      }
      setRefinementPrompt('');
    } catch (err: any) {
      console.error('Error in handleRefineOrChangeImage:', err);
      setErrorMsg(err.message || 'इमेज बदलने में समस्या आई।');
    } finally {
      setIsRefiningImage(false);
    }
  };

  const handleCopyCaption = () => {
    if (!card.summary) return;
    navigator.clipboard.writeText(card.summary);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // Get words array from raw headline
  const headlineWords = (card.headline || '').split(/\s+/).filter(Boolean);
  const activeHighlights = card.highlightWords || [];

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="flex-1">{successMsg}</span>
        </div>
      )}

      {/* 1-Click Instant AI Morning Generator Bar (Always accessible) */}
      <div className="bg-gradient-to-r from-amber-950/70 via-neutral-900 to-amber-900/50 border border-amber-500/50 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
              🌅
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-300">
                1-क्लिक AI सुविचार व एस्थेटिक फोटो
              </h4>
              <p className="text-[11px] text-neutral-300">
                बिना टाइप किए तुरंत नया सुविचार और सॉफ्ट फोटो तैयार करें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating || isRefiningImage}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI बना रहा है...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ नया सुविचार बनाएं (Auto)</span>
              </>
            )}
          </button>
        </div>

        {/* Quick 1-Click Topic Chips */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {QUICK_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCommandPrompt(topic);
                handleGenerate(topic);
              }}
              disabled={isGenerating || isRefiningImage}
              className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-amber-300 border border-neutral-700 hover:border-amber-400/60 rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              + {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Top Segmented Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('ai-generator')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ai-generator'
              ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-400'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✨ AI जनरेटर</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('edit-text')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'edit-text'
              ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-400'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>📝 शब्द एडिट</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('background')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'background'
              ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-400'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>🎨 सॉफ्ट बैकग्राउंड</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('caption')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'caption'
              ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-400'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>📋 कैप्शन</span>
        </button>
      </div>

      {/* ================= TAB 1: 📝 शब्द एवं सुविचार संपादन (EDITABLE FORMAT) ================= */}
      {activeTab === 'edit-text' && (
        <div className="space-y-4">
          {/* Section 1: Category / Badge Text */}
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                <span>कैटेगरी / बैज का नाम (शीर्षक के ऊपर):</span>
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={card.morningBadgeText || '🌅 आज का विचार'}
                onChange={(e) => onChange({ morningBadgeText: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 pr-12 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                placeholder="उदा. 🌅 आज का विचार"
              />
              <div className="absolute right-2 top-1.5">
                <VoiceInputButton
                  onTranscript={(text) => onChange({ morningBadgeText: text })}
                />
              </div>
            </div>
            {/* Quick Badge Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BADGE_PRESETS.map((badge, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ morningBadgeText: badge })}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    card.morningBadgeText === badge
                      ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300 shadow'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-amber-500/40'
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Main Thought / Headline Words Editor */}
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5 text-amber-400" />
                <span>मुख्य सुविचार (हेडलाइन टेक्स्ट एडिट):</span>
              </label>
              <span className="text-[10px] text-neutral-400 font-medium">
                {headlineWords.length} शब्द
              </span>
            </div>

            <div className="relative">
              <textarea
                value={card.headline || ''}
                onChange={(e) => handleHeadlineChange(e.target.value)}
                placeholder="अपना मुख्य सुविचार यहाँ लिखें या बोलें..."
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 pr-12 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none leading-relaxed"
              />
              <div className="absolute right-2.5 top-2.5">
                <VoiceInputButton
                  onTranscript={(text) =>
                    handleHeadlineChange(
                      card.headline ? `${card.headline} ${text}` : text
                    )
                  }
                />
              </div>
            </div>

            {/* Headline Font Size Slider */}
            <div className="pt-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-400 font-medium shrink-0">
                फॉन्ट साइज:
              </span>
              <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                <input
                  type="range"
                  min={18}
                  max={42}
                  step={1}
                  value={card.headlineFontSize || 26}
                  onChange={(e) =>
                    onChange({ headlineFontSize: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-amber-400 font-bold w-9 text-right shrink-0">
                  {card.headlineFontSize || 26}px
                </span>
              </div>
            </div>

            {/* Section 2B: Clickable Yellow Word Highlight Selector */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-yellow-300 block">
                    ✨ पीले (Yellow) रंग में हाइलाइट शब्द चुनें:
                  </span>
                  <span className="text-[10px] text-neutral-400 block">
                    जिस शब्द पर क्लिक करेंगे, वह कार्ड में चमकदार पीले रंग में दिखेगा:
                  </span>
                </div>
                {activeHighlights.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHighlights}
                    className="text-[10px] text-red-300 hover:text-red-200 bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    ❌ सभी हटाएं
                  </button>
                )}
              </div>

              {/* Word Chips */}
              <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-900/90 rounded-xl border border-neutral-800 min-h-[44px] items-center">
                {headlineWords.length === 0 ? (
                  <span className="text-[11px] text-neutral-500 italic">
                    ऊपर सुविचार लिखने पर यहाँ शब्द दिखाई देंगे...
                  </span>
                ) : (
                  headlineWords.map((word, idx) => {
                    const cleanWord = word
                      .replace(/[.,:;!?।\-"'“”‘’()]/g, '')
                      .trim()
                      .toLowerCase();
                    const isHighlighted = activeHighlights.some(
                      (hw) => hw.toLowerCase() === cleanWord
                    );

                    return (
                      <button
                        key={`${word}-${idx}`}
                        type="button"
                        onClick={() => toggleWordHighlight(word)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          isHighlighted
                            ? 'bg-yellow-400 text-neutral-950 font-black shadow-md ring-2 ring-yellow-300/80 scale-105'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                        }`}
                        title="पीले रंग में हाइलाइट करने / हटाने के लिए क्लिक करें"
                      >
                        <span>{word}</span>
                        {isHighlighted && <Check className="w-3 h-3 text-neutral-950" />}
                      </button>
                    );
                  })
                )}
              </div>

              {activeHighlights.length > 0 && (
                <div className="text-[10px] text-amber-300/90 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <span>{activeHighlights.length} शब्द पीले (Yellow) रंग में हाइलाइटेड हैं।</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Sub-Quote / Elaboration / Takeaway Editor */}
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>नीचे का छोटा विवरण / सब-कोट (छोटा मैटर):</span>
              </label>
            </div>

            <div className="relative">
              <textarea
                value={card.morningThoughtQuote || card.morningTakeaway || ''}
                onChange={(e) => handleSubQuoteChange(e.target.value)}
                placeholder="नीचे का छोटा विचार, व्याख्या अथवा 3 नियम/उपाय यहाँ लिखें या बोलें..."
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 pr-12 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none leading-relaxed"
              />
              <div className="absolute right-2.5 top-2.5">
                <VoiceInputButton
                  onTranscript={(text) =>
                    handleSubQuoteChange(
                      (card.morningThoughtQuote || '') ? `${card.morningThoughtQuote} ${text}` : text
                    )
                  }
                />
              </div>
            </div>

            {/* Sub-quote font size slider & presets */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400 font-medium shrink-0">
                  विवरण फॉन्ट साइज (बैलेंस):
                </span>
                <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                  <input
                    type="range"
                    min={11}
                    max={22}
                    step={1}
                    value={card.morningSubQuoteFontSize || 14}
                    onChange={(e) =>
                      onChange({ morningSubQuoteFontSize: Number(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <span className="text-amber-400 font-bold w-9 text-right shrink-0">
                    {card.morningSubQuoteFontSize || 14}px
                  </span>
                </div>
              </div>

              {/* Quick balance presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 font-medium">
                  क्विक साइज:
                </span>
                {[
                  { label: 'छोटा', size: 12 },
                  { label: 'संतुलित', size: 14 },
                  { label: 'मध्यम', size: 16 },
                  { label: 'बड़ा', size: 18 },
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => onChange({ morningSubQuoteFontSize: item.size })}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                      (card.morningSubQuoteFontSize || 14) === item.size
                        ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {item.label} ({item.size}px)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: "पूरी खबर डिस्क्रिप्शन में" Box Toggle & Edit */}
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  'पूरी खबर डिस्क्रिप्शन में' बॉक्स:
                </label>
                <span className="text-[10px] text-neutral-400 block">
                  कार्ड के निचले हिस्से में दिखने वाला लाल डॉट बॉक्स
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChange({ showCallout: !card.showCallout })}
                className={`px-3 py-1 text-xs font-black rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  card.showCallout
                    ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {card.showCallout ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>दिखाएं (Visible)</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>छिपाएं (Hidden)</span>
                  </>
                )}
              </button>
            </div>

            {card.showCallout && (
              <div className="pt-2 border-t border-neutral-800/80">
                <input
                  type="text"
                  value={card.calloutTag || '🔴 पूरी खबर डिस्क्रिप्शन में'}
                  onChange={(e) => onChange({ calloutTag: e.target.value })}
                  placeholder="उदा. 🔴 पूरी खबर डिस्क्रिप्शन में"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: 🎨 सॉफ्ट बैकग्राउंड्स (SOFT & LIGHT BACKGROUNDS) ================= */}
      {activeTab === 'background' && (
        <div className="space-y-4">
          {/* Header Description */}
          <div className="bg-neutral-950/85 border border-amber-500/30 rounded-2xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-amber-300">
                सॉफ्ट व लाइट बैकग्राउंड (Soft & Light-Colored Themes)
              </h4>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              हल्के, शांत और सॉफ्ट रंग जो सुविचार को साफ, स्पष्ट और उच्च गुणवत्ता में पढ़ने योग्य बनाते हैं। नीचे दिए गए रेडीमेड बैकग्राउंड में से चुनें अथवा AI से नया बनवाएं।
            </p>
          </div>

          {/* Curated Soft Backgrounds Gallery */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-300 block">
              1-क्लिक सॉफ्ट बैकग्राउंड्स (Curated Soft Scenes):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SOFT_LIGHT_BACKGROUNDS.map((bg) => {
                const isSelected =
                  card.images.main === bg.url || card.morningCustomBgUrl === bg.url;

                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        images: { ...card.images, main: bg.url },
                        morningCustomBgUrl: bg.url,
                      });
                      setSuccessMsg(`✅ '${bg.name}' बैकग्राउंड सेट हो गया!`);
                    }}
                    className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-yellow-400 ring-2 ring-yellow-400/50 scale-[1.02] shadow-lg'
                        : 'border-neutral-800 hover:border-amber-400/60'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-900">
                      <img
                        src={bg.thumbnail}
                        alt={bg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="p-2 bg-neutral-950/90">
                      <span className="text-xs font-bold text-white block truncate">
                        {bg.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {bg.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-yellow-400 text-neutral-950 rounded-full p-0.5 shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Soft Background Generator & Refinement */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3.5 space-y-3 shadow-md">
            <label className="text-xs font-bold text-amber-300 block">
              ✨ AI से नया सॉफ्ट बैकग्राउंड बनाएं (बोलकर या लिखकर):
            </label>
            <div className="relative">
              <input
                type="text"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRefineOrChangeImage();
                }}
                placeholder="उदा. 'हल्के सुनहरे बादलों के साथ सुबह की धूप', 'शांत हरी प्रकृति', 'हल्का पेस्टल आकाश'..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 pr-12 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
              <div className="absolute right-2 top-1.5">
                <VoiceInputButton
                  onTranscript={(text) => {
                    setRefinementPrompt(text);
                    handleRefineOrChangeImage(text);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRefineOrChangeImage()}
                disabled={isRefiningImage || isGenerating}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isRefiningImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>✨ नया AI सॉफ्ट बैकग्राउंड बनाएं</span>
              </button>

              <button
                type="button"
                onClick={() => handleRefineOrChangeImage('सॉफ्ट व लाइट दृश्य, नया सुबह का शांत बैकग्राउंड')}
                disabled={isRefiningImage || isGenerating}
                className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRefiningImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>🔄 अगला सॉफ्ट सीन (Next)</span>
              </button>
            </div>
          </div>

          {/* Upload Custom Background Photo from Device */}
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-3.5 space-y-2 shadow-md">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>अपनी पसंद की फोटो अपलोड करें (Upload Custom Photo):</span>
            </label>
            <p className="text-[10px] text-neutral-400">
              यदि आपके फोन या कंप्यूटर में कोई सुंदर सॉफ्ट या शांत फोटो है, तो उसे यहाँ से चुन सकते हैं:
            </p>
            <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 hover:border-amber-400 rounded-xl text-xs font-bold text-neutral-300 hover:text-white cursor-pointer transition-all">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>📂 डिवाइस से फोटो चुनें (PNG / JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ✨ AI सुविचार जनरेटर (AI GENERATOR) ================= */}
      {activeTab === 'ai-generator' && (
        <div className="space-y-4">
          <div className="bg-neutral-950/85 border border-amber-500/30 rounded-2xl p-4 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌅</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">
                    AI सुविचार व बैकग्राउंड क्रिएटर
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    बोलकर या लिखकर विषय बताएं, AI संतुलित सुविचार और सॉफ्ट बैकग्राउंड बनाएगा।
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                AI Powered
              </span>
            </div>

            {/* Text / Voice Input Area */}
            <div className="relative">
              <textarea
                value={commandPrompt}
                onChange={(e) => setCommandPrompt(e.target.value)}
                placeholder="बोलकर या लिखकर बताएं — उदा. 'सफलता और निरंतर प्रयास पर 2 पंक्ति का सुविचार', 'सुबह की सैर के 3 नियम'..."
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 pr-12 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none transition-colors"
              />
              <div className="absolute right-2.5 top-2.5">
                <VoiceInputButton
                  onTranscript={(text) =>
                    setCommandPrompt((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
            </div>

            {/* Quick 1-Click Topic Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                लोकप्रिय विषय (1-क्लिक से विचार तैयार करें):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCommandPrompt(topic);
                      handleGenerate(topic);
                    }}
                    disabled={isGenerating || isRefiningImage}
                    className="px-2.5 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/40 rounded-lg transition-all text-left cursor-pointer disabled:opacity-50"
                  >
                    + {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Big Action Button */}
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || isRefiningImage}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI सुविचार और सॉफ्ट बैकग्राउंड बना रहा है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ AI से नया सुविचार व कार्ड बनाएं</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 4: 📋 सोशल मीडिया कैप्शन (CAPTION BOX) ================= */}
      {activeTab === 'caption' && (
        <div className="space-y-3">
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>सोशल मीडिया कैप्शन (Instagram / Facebook Post):</span>
              </label>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">कॉपी हो गया!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>कॉपी करें</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={card.summary || ''}
              onChange={(e) => onChange({ summary: e.target.value })}
              rows={6}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none leading-relaxed"
              placeholder="यहाँ कैप्शन और हैशटैग्स दिखाई देंगे..."
            />

            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-4 h-4 text-neutral-950" />
                  <span>कैप्शन कॉपी हो गया! (फेसबुक/इंस्टा पर पेस्ट करें)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-neutral-950" />
                  <span>📋 सोशल मीडिया कैप्शन कॉपी करें (#हैशटैग सहित)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
