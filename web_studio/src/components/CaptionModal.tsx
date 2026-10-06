import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Sparkles, Loader2 } from 'lucide-react';
import { NewsCardData } from '../types';
import { VoiceInputButton } from './VoiceInputButton';

interface CaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: NewsCardData;
}

// Helper to extract user's username for the first hashtag (#<username>)
export function getUserFirstHashtag(card?: NewsCardData): string {
  let uName = '';

  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('user_channel_profile') : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.username) uName = parsed.username;
    }
  } catch {}

  if (!uName && card?.socialHandle) {
    uName = card.socialHandle.replace(/^[/@]+/, '');
  }
  if (!uName && typeof localStorage !== 'undefined') {
    uName = localStorage.getItem('app_user_username') || '';
  }
  if (!uName) uName = 'User';

  const clean = uName.replace(/[\s\-_.,/\\|~`!@#$%^&*()+=[\]{}'":;?<>]+/g, '').replace(/[^a-zA-Z0-9_]/g, '');
  return `#${clean || 'User'}`;
}

// Build hashtags strictly ensuring:
// 1. FIRST TAG = User's Username (#<username>)
// 2. LAST TAG = #AINewsMaker (English)
// 3. NO #breakingnewswala or #BNWTV
export function buildHashtags(location?: string, existingTagsString?: string, card?: NewsCardData): string {
  const firstTag = getUserFirstHashtag(card);
  const lastTag = '#AINewsMaker';

  const loc = (location || 'News')
    .split(/[\/,]/)[0]
    .trim()
    .replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');
  const locationTag = loc && loc.toLowerCase() !== 'location' && loc !== 'स्थान' ? `#${loc}News` : '#HindiNews';

  let tagList: string[] = [];

  if (existingTagsString && existingTagsString.trim()) {
    const extracted = existingTagsString.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g) || [];
    tagList = extracted;
  }

  // Filter out any legacy or prohibited tags
  tagList = tagList.filter((t) => {
    const lower = t.toLowerCase();
    return (
      lower !== '#breakingnewswala' &&
      lower !== '#bnwtv' &&
      lower !== '#ब्रेकिंगन्यूजवाला' &&
      lower !== firstTag.toLowerCase() &&
      lower !== lastTag.toLowerCase()
    );
  });

  // If no or few existing tags, seed standard news tags
  if (tagList.length < 2) {
    tagList = [
      '#BreakingNews',
      locationTag,
      '#LatestNews',
      '#NewsUpdate',
      '#ViralNews',
    ];
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const uniqueMidTags: string[] = [];
  for (const t of tagList) {
    const lower = t.toLowerCase();
    if (!seen.has(lower) && lower !== firstTag.toLowerCase() && lower !== lastTag.toLowerCase()) {
      seen.add(lower);
      uniqueMidTags.push(t);
    }
  }

  return [firstTag, ...uniqueMidTags, lastTag].join(' ');
}

export const CaptionModal: React.FC<CaptionModalProps> = ({
  isOpen,
  onClose,
  card,
}) => {
  const [captionText, setCaptionText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'detailed_3_para' | 'bullet_points' | 'short'>('detailed_3_para');
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');

  const firstUserTag = getUserFirstHashtag(card);

  // Generate strictly 2 to 3 detailed paragraphs of news + tags at the end
  useEffect(() => {
    if (!isOpen) return;

    // Clean headline without [yellow] tags
    const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();

    let newsStory = '';

    if (card.summary && card.summary.trim()) {
      let rawSummary = card.summary.trim();

      // If summary already ends with hashtags, extract them
      const tagMatch = rawSummary.match(/(#[a-zA-Z0-9_\u0900-\u097F]+\s*)+$/);
      let existingTags = '';
      if (tagMatch) {
        existingTags = tagMatch[0].trim();
        rawSummary = rawSummary.substring(0, tagMatch.index).trim();
      }

      // Check how many paragraphs exist
      const existingParagraphs = rawSummary
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (existingParagraphs.length >= 2) {
        // Already formatted in 2-3 paragraphs (limit to max 3 for clean social post)
        newsStory = existingParagraphs.slice(0, 3).join('\n\n');
      } else {
        // Single block of text - split into 2-3 balanced paragraphs
        const sentences = rawSummary.split(/(?<=[।!?])\s+/).filter(Boolean);
        if (sentences.length >= 5) {
          const part1 = sentences.slice(0, 2).join(' ');
          const part2 = sentences.slice(2, Math.min(5, sentences.length - 1)).join(' ');
          const part3 = sentences.slice(Math.min(5, sentences.length - 1)).join(' ');
          newsStory = `${part1}\n\n${part2}\n\n${part3}`;
        } else if (sentences.length >= 3) {
          const mid = Math.ceil(sentences.length / 2);
          const p1 = sentences.slice(0, mid).join(' ');
          const p2 = sentences.slice(mid).join(' ');
          newsStory = `${p1}\n\n${p2}`;
        } else {
          // Detailed 2-paragraph news story
          newsStory = `${cleanHeadline}। घटना को लेकर इलाके में हड़कंप मच गया है और स्थानीय प्रशासन तुरंत हरकत में आ गया है।\n\n${rawSummary}\n\nमामले की गंभीरता को देखते हुए उच्चाधिकारियों द्वारा जांच के निर्देश दे दिए गए हैं तथा प्रभावितों की मदद की जा रही है।`;
        }
      }

      const tagsToUse = buildHashtags(card.location, existingTags, card);
      setCaptionText(`${newsStory}\n\n${tagsToUse}`);
    } else {
      // Default template strictly adhering to 2-3 detailed paragraphs + tags
      newsStory = `${cleanHeadline || 'मुख्य समाचार'}। घटना को लेकर इलाके में हड़कंप मच गया है और प्रत्यक्षदर्शियों के अनुसार स्थिति काफी तनावपूर्ण बनी हुई है।\n\nमामले की सूचना मिलते ही वरिष्ठ प्रशासनिक अधिकारी और पुलिस बल मौके पर पहुंच गए हैं तथा राहत एवं आवश्यक कार्रवाई शुरू कर दी गई है।\n\nफिलहाल स्थिति पर लगातार नजर रखी जा रही है और पूरे घटनाक्रम की विस्तृत जांच के निर्देश दिए गए हैं।`;
      const tagsToUse = buildHashtags(card.location, undefined, card);
      setCaptionText(`${newsStory}\n\n${tagsToUse}`);
    }
  }, [isOpen, card]);

  // Expand or rewrite caption using AI
  const handleExpandWithAI = async (overrideStyle?: 'detailed_3_para' | 'bullet_points' | 'short') => {
    const styleToUse = overrideStyle || selectedStyle;
    setIsExpanding(true);

    try {
      const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();
      const cleanSummary = (card.summary || '').trim();

      const prompt = `
आप एक वरिष्ठ हिंदी समाचार संपादक (Social Media News Journalist) हैं।
निम्नलिखित खबर के आधार पर इंस्टाग्राम और फेसबुक के लिए एक आकर्षक, प्रामाणिक और विस्तृत पोस्ट कैप्शन (Caption) तैयार करें।

हेडलाइन: "${cleanHeadline}"
मूल विवरण/सारांश: "${cleanSummary || 'विवरण उपलब्ध नहीं'}"
स्थान: "${card.location || 'मध्य प्रदेश'}"

शैली (Style): ${
  styleToUse === 'detailed_3_para'
    ? 'विस्तृत 3 पैराग्राफ (Detailed 3 Paragraphs News Story)'
    : styleToUse === 'bullet_points'
    ? 'मुख्य बिंदु (Bullet Points Format with Key Highlights)'
    : 'संक्षिप्त व असरदार 2 पैराग्राफ (Short & Punchy 2 Paragraphs)'
}

${customInstruction ? `अतिरिक्त निर्देश (User Instruction): "${customInstruction}"` : ''}

नियम:
1. भाषा शुद्ध, स्पष्ट और गंभीर हिंदी पत्रकारिता शैली की होनी चाहिए।
2. कोई अनावश्यक काल्पनिक बातें न जोड़ें।
3. पहला हैशटैग ${firstUserTag} और अंतिम हैशटैग #AINewsMaker ही होना चाहिए।
`;

      const response = await fetch('/api/generate-ai-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider: aiProvider,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          let aiText = data.text.trim();
          const tagMatch = aiText.match(/(#[a-zA-Z0-9_\u0900-\u097F]+\s*)+$/);
          let extractedTags = '';
          if (tagMatch) {
            extractedTags = tagMatch[0].trim();
            aiText = aiText.substring(0, tagMatch.index).trim();
          }
          const finalTags = buildHashtags(card.location, extractedTags, card);
          setCaptionText(`${aiText}\n\n${finalTags}`);
        }
      } else {
        const fallbackStory = `${cleanHeadline}। पूरे मामले पर प्रशासनिक स्तर पर त्वरित संज्ञान लिया गया है।\n\n${cleanSummary}\n\nसूत्रों के अनुसार मौके पर जांच दल तैनात है और आगे की कानूनी कार्यवाही जारी है।`;
        const tags = buildHashtags(card.location, undefined, card);
        setCaptionText(`${fallbackStory}\n\n${tags}`);
      }
    } catch (e) {
      console.warn('AI Caption expansion error:', e);
    } finally {
      setIsExpanding(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                इंस्टाग्राम व फेसबुक पोस्ट कैप्शन
              </h3>
              <p className="text-[11px] text-neutral-400">
                2-3 पैराग्राफ में पूरी खबर • पहला टैग <span className="text-yellow-400 font-mono font-bold">{firstUserTag}</span> • अंतिम टैग <span className="text-yellow-400 font-mono font-bold">#AINewsMaker</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* AI Provider Switcher */}
          <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-bold text-neutral-300">
              AI इंजन:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAiProvider('gemini')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  aiProvider === 'gemini'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/60 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                ✨ Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setAiProvider('openai')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  aiProvider === 'openai'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                🤖 OpenAI ChatGPT
              </button>
            </div>
          </div>

          {/* Style Selector Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <span>कैप्शन स्टाइल चुनें (Caption Format):</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedStyle('detailed_3_para');
                  handleExpandWithAI('detailed_3_para');
                }}
                className={`p-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                  selectedStyle === 'detailed_3_para'
                    ? 'bg-yellow-400 text-neutral-950 border-yellow-400 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                📰 3 पैराग्राफ (बड़ा)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedStyle('bullet_points');
                  handleExpandWithAI('bullet_points');
                }}
                className={`p-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                  selectedStyle === 'bullet_points'
                    ? 'bg-yellow-400 text-neutral-950 border-yellow-400 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                📌 बुलेट पॉइंट्स
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedStyle('short');
                  handleExpandWithAI('short');
                }}
                className={`p-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                  selectedStyle === 'short'
                    ? 'bg-yellow-400 text-neutral-950 border-yellow-400 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                ⚡ संक्षिप्त (शॉर्ट)
              </button>
            </div>
          </div>

          {/* Custom Instruction Box */}
          <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-yellow-400/90 flex items-center gap-1">
                <span>कैप्शन में कोई बदलाव / विशेष निर्देश? (Optional):</span>
              </span>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setCustomInstruction((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }}
                title="बोलकर निर्देश बताएं"
              />
            </div>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="उदा. पुलिस अधिकारी का बयान शामिल करें, सख्त लहजा रखें, आंकड़े जोड़ें..."
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-bold text-neutral-200">
              <span>कैप्शन विवरण (संपादित करें):</span>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setCaptionText((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
                }}
                title="बोलकर कैप्शन लिखें / जोड़ें"
              />
            </span>
            <button
              type="button"
              onClick={() => handleExpandWithAI()}
              disabled={isExpanding}
              className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 px-2.5 py-1 rounded-lg border border-yellow-400/30 transition-all cursor-pointer disabled:opacity-50"
              title="AI से कैप्शन को फिर से तैयार या बड़ा करें"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>तैयार हो रहा है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>🔄 AI से नया कैप्शन बनाएं / बड़ा करें</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={9}
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs sm:text-sm text-neutral-200 focus:border-green-500 focus:outline-none font-['Noto_Sans_Devanagari'] leading-relaxed resize-none shadow-inner"
            placeholder="2-3 पैराग्राफ खबर और अंत में हैशटैग..."
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-400 active:scale-[0.99] text-neutral-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-950/40 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>कैप्शन कॉपी हो गया!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 stroke-[2.5]" />
                  <span>इंस्टा/फेसबुक कैप्शन कॉपी करें</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
