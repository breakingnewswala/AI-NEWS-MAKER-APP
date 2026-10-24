import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Sparkles, Loader2, Lock } from 'lucide-react';
import { NewsCardData } from '../types';
import { VoiceInputButton } from './VoiceInputButton';
import { getApiUrl } from '../lib/apiConfig';
import { isUserActionAllowed } from '../lib/userPlanManager';
import { cleanCaptionParagraphs, stripAllUrlsAndHyperlinks } from '../lib/speakerUtils';

interface CaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: NewsCardData;
}

// Helper to extract user's username for the first hashtag (#<username>)
export function getUserFirstHashtag(card?: NewsCardData): string {
  let uName = '';

  try {
    const session = typeof localStorage !== 'undefined' ? localStorage.getItem('reporter_auth_session') : null;
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.username) uName = parsed.username;
    }
  } catch {}

  if (!uName) {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('user_channel_profile') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username) uName = parsed.username;
      }
    } catch {}
  }

  if (!uName && card?.socialHandle) {
    uName = card.socialHandle.replace(/^[/@]+/, '');
  }
  if (!uName && typeof localStorage !== 'undefined') {
    uName = localStorage.getItem('app_user_username') || '';
  }

  const clean = uName ? uName.replace(/[\s\-_.,/\\|~`!@#$%^&*()+=[\]{}'":;?<>]+/g, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '') : '';
  return clean ? `#${clean}` : '';
}

// Build hashtags for caption: username first, 4-6 middle tags, #AINewsMaker strictly last
export function buildHashtags(location?: string, existingTagsString?: string, card?: NewsCardData): string {
  const firstTag = getUserFirstHashtag(card);

  const loc = (location || '')
    .split(/[\/,]/)[0]
    .trim()
    .replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
  const locationTag = loc && loc.toLowerCase() !== 'location' && loc !== 'स्थान' && loc.toLowerCase() !== 'news' ? `#${loc}News` : '#HindiNews';

  let tagList: string[] = [];

  if (existingTagsString && existingTagsString.trim()) {
    const extracted = existingTagsString.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g) || [];
    tagList = extracted;
  }

  // Filter out any legacy, redundant or placeholder tags
  tagList = tagList.filter((t) => {
    const lower = t.toLowerCase();
    return (
      lower !== '#breakingnewswala' &&
      lower !== '#bnwtv' &&
      lower !== '#ब्रेकिंगन्यूजवाला' &&
      lower !== '#ainewsmaker' &&
      lower !== '#ai_news_maker' &&
      (!firstTag || lower !== firstTag.toLowerCase())
    );
  });

  // If few existing tags, seed standard news tags
  if (tagList.length < 2) {
    tagList = [
      '#BreakingNews',
      locationTag,
      '#HindiNews',
      '#LatestUpdate',
      '#NewsUpdate',
    ];
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const uniqueMidTags: string[] = [];
  for (const t of tagList) {
    const lower = t.toLowerCase();
    if (!seen.has(lower) && (!firstTag || lower !== firstTag.toLowerCase()) && lower !== '#ainewsmaker' && lower !== '#ai_news_maker') {
      seen.add(lower);
      uniqueMidTags.push(t);
    }
  }

  const middleSlice = uniqueMidTags.slice(0, 6);
  const orderedTags: string[] = [];
  if (firstTag) {
    orderedTags.push(firstTag);
  }
  orderedTags.push(...middleSlice);
  orderedTags.push('#AINewsMaker');

  return orderedTags.join(' ');
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
  const actionAllowance = isUserActionAllowed();
  const isActionLocked = !actionAllowance.allowed;

  useEffect(() => {
    if (!isOpen) return;

    // Clean headline without [yellow] tags
    const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();

    let newsStory = '';

    if (card.summary && card.summary.trim()) {
      let rawSummary = stripAllUrlsAndHyperlinks(card.summary.trim());

      // If summary already ends with hashtags, extract them
      const tagMatch = rawSummary.match(/(#[a-zA-Z0-9_\u0900-\u097F]+\s*)+$/);
      let existingTags = '';
      if (tagMatch) {
        existingTags = tagMatch[0].trim();
        rawSummary = rawSummary.substring(0, tagMatch.index).trim();
      }

      newsStory = rawSummary || cleanHeadline || 'मुख्य समाचार';
      const tagsToUse = buildHashtags(card.location, existingTags, card);
      const combined = tagsToUse ? `${newsStory}\n\n${tagsToUse}` : newsStory;
      const cleaned = cleanCaptionParagraphs(combined, 'detailed', firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
      setCaptionText(cleaned);
    } else {
      newsStory = cleanHeadline || 'मुख्य समाचार';
      const tagsToUse = buildHashtags(card.location, undefined, card);
      const combined = tagsToUse ? `${newsStory}\n\n${tagsToUse}` : newsStory;
      const cleaned = cleanCaptionParagraphs(combined, 'detailed', firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
      setCaptionText(cleaned);
    }
  }, [isOpen, card]);

  // Expand or rewrite caption using AI
  const handleExpandWithAI = async (overrideStyle?: 'detailed_3_para' | 'bullet_points' | 'short') => {
    if (isActionLocked) return;
    const styleToUse = overrideStyle || selectedStyle;
    const mode = styleToUse === 'short' ? 'short' : styleToUse === 'bullet_points' ? 'bullet' : 'detailed';
    setIsExpanding(true);

    try {
      const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();
      const cleanSummary = stripAllUrlsAndHyperlinks((card.summary || '').trim());

      const response = await fetch(getApiUrl('/api/generate-caption'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: cleanHeadline,
          location: card.location,
          category: card.category,
          existingSummary: captionText || cleanSummary,
          style: styleToUse,
          captionLength: mode,
          customInstruction: customInstruction.trim() || undefined,
          aiProvider: aiProvider,
          username: firstUserTag.replace(/^#/, ''),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.caption) {
          const finalCaption = cleanCaptionParagraphs(data.caption, mode, firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
          setCaptionText(finalCaption);
        }
      } else {
        const fallbackStory = cleanSummary || cleanHeadline;
        const finalCaption = cleanCaptionParagraphs(fallbackStory, mode, firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
        setCaptionText(finalCaption);
      }
    } catch (e) {
      console.warn('AI Caption expansion error:', e);
    } finally {
      setIsExpanding(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (isActionLocked) return;
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
              <p className="text-[11px] text-neutral-400">सोशल मीडिया पोस्ट कैप्शन</p>
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
          {isActionLocked && (
            <div className="bg-red-950/80 border border-red-700/80 rounded-xl p-3 text-red-200 text-xs flex items-center gap-2.5 shadow-md">
              <Lock className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>7-Day Free Trial समाप्त:</strong> कैप्शन कॉपी व AI जनरेशन की सुविधा निष्क्रिय है। कृपया प्रोफाइल में जाकर प्लान अपग्रेड करें।
              </span>
            </div>
          )}
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
                📰 विस्तृत
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
                ⚡ संक्षिप्त
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
              disabled={isExpanding || isActionLocked}
              className={`font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                isActionLocked
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700/60 opacity-60 cursor-not-allowed'
                  : 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 border-yellow-400/30 cursor-pointer disabled:opacity-50'
              }`}
              title={isActionLocked ? 'ट्रायल समाप्त — AI कैप्शन लॉक' : 'AI से कैप्शन को फिर से तैयार या बड़ा करें'}
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>तैयार हो रहा है...</span>
                </>
              ) : (
                <>
                  {isActionLocked ? <Lock className="w-3 h-3 text-neutral-400" /> : <Sparkles className="w-3 h-3 text-yellow-400" />}
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
            placeholder="सोशल मीडिया कैप्शन यहाँ लिखें..."
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCopy}
              disabled={isActionLocked}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                isActionLocked
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 opacity-60 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-400 active:scale-[0.99] text-neutral-950 cursor-pointer shadow-lg shadow-green-950/40'
              }`}
              title={isActionLocked ? 'ट्रायल समाप्त — कैप्शन लॉक' : 'इंस्टा/फेसबुक कैप्शन कॉपी करें'}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>कैप्शन कॉपी हो गया!</span>
                </>
              ) : (
                <>
                  {isActionLocked ? <Lock className="w-5 h-5 text-neutral-400" /> : <Copy className="w-5 h-5 stroke-[2.5]" />}
                  <span>{isActionLocked ? 'कैप्शन सुविधा लॉक (ट्रायल समाप्त)' : 'इंस्टा/फेसबुक कैप्शन कॉपी करें'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
