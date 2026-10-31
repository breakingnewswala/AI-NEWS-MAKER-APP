import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Link as LinkIcon, Send, Sparkles, Check, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { AIAnalysisResult } from '../types';
import { VoiceInputButton } from './VoiceInputButton';
import { getApiUrl, getAuthHeaders } from '../lib/apiConfig';
import { cleanHeadlineText, cleanLocationField, generate5BalancedHeadlineOptions, fitHeadlinesTo5TierRanges, countHeadlineVisibleCharacters, HEADLINE_5_TIER_RANGES, HEADLINE_MAX_CHARACTER_LIMIT } from '../lib/speakerUtils';
import { scrapeNewsUrlClient } from '../lib/clientScraper';
import { processNewsLocally } from '../lib/clientAiProcessor';

interface NewsCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResult: (result: AIAnalysisResult) => void;
  initialTab?: 'link' | 'command' | 'manual';
  autoFillNews?: { url?: string; title?: string; summary?: string; imageUrl?: string } | null;
  templateId?: string;
  headlineMaxLines?: number;
}

export const NewsCommandModal: React.FC<NewsCommandModalProps> = ({
  isOpen,
  onClose,
  onApplyResult,
  initialTab = 'link',
  autoFillNews,
  templateId,
  headlineMaxLines,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'command'>(
    initialTab === 'command' ? 'command' : 'link'
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'command') {
        setActiveTab('command');
      } else {
        setActiveTab('link');
      }
    }
  }, [isOpen, initialTab]);

  const [inputText, setInputText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [headlineOptions, setHeadlineOptions] = useState<string[]>([]);
  const [selectedHeadlineIndex, setSelectedHeadlineIndex] = useState<number>(0);
  const [isRegeneratingHeadlines, setIsRegeneratingHeadlines] = useState<boolean>(false);
  const [useWebsitePhoto, setUseWebsitePhoto] = useState<boolean>(true);
  const [photoChoice, setPhotoMode] = useState<'manual' | 'ai' | 'website'>('manual');
  const [generatingAiImage, setGeneratingAiImage] = useState<boolean>(false);
  const [generatedAiImageUrl, setGeneratedAiImageUrl] = useState<string | null>(null);
  const [aiImageNotice, setAiImageNotice] = useState<string | null>(null);
  const [aiPhotoPrompt, setAiPhotoPrompt] = useState<string>('');
  const [aiPhotoVariation, setAiPhotoVariation] = useState<number>(0);

  // Auto-fill news if passed from external card or feed
  useEffect(() => {
    if (isOpen && autoFillNews) {
      if (autoFillNews.url) {
        setLinkUrl(autoFillNews.url);
        setActiveTab('link');
      } else if (autoFillNews.title || autoFillNews.summary) {
        setInputText(
          autoFillNews.title
            ? `${autoFillNews.title}\n\n${autoFillNews.summary || ''}`
            : autoFillNews.summary || ''
        );
        setActiveTab('command');
      }
    }
  }, [isOpen, autoFillNews]);

  const handleResetAiBox = () => {
    setInputText('');
    setLinkUrl('');
    setCustomPrompt('');
    setResult(null);
    setHeadlineOptions([]);
    setSelectedHeadlineIndex(0);
    setGeneratedAiImageUrl(null);
    setAiPhotoPrompt('');
    setError(null);
  };

  // AI Provider selections
  const [newsAiProvider, setNewsAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [photoAiProvider, setPhotoAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [providersStatus, setProvidersStatus] = useState<{ geminiAvailable: boolean; openaiAvailable: boolean }>({
    geminiAvailable: true,
    openaiAvailable: false,
  });

  // Check backend provider status on open
  useEffect(() => {
    if (isOpen) {
      fetch(getApiUrl('/api/ai-providers-status'))
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.openaiAvailable === 'boolean') {
            setProvidersStatus(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProcess = async () => {
    const rawInput = inputText.trim();
    const rawUrl = linkUrl.trim();
    const rawPrompt = customPrompt.trim();

    // Check if at least one piece of information is provided across link, input, or prompt
    if (!rawInput && !rawUrl && !rawPrompt) {
      setError('कृपया कोई न्यूज़ लिंक, कच्चा समाचार (Raw Script) या निर्देश/प्रॉम्प्ट दर्ज करें');
      return;
    }

    let urlPayload: string | undefined = undefined;
    let inputPayload = activeTab === 'command' ? rawInput : '';

    if (rawUrl) {
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        urlPayload = rawUrl;
      } else {
        // User pasted raw text/headline/script directly into the link box!
        inputPayload = inputPayload ? `${inputPayload}\n\n${rawUrl}` : rawUrl;
      }
    }

    // If no URL and no inputPayload, but user wrote in the prompt box:
    if (!urlPayload && !inputPayload && rawPrompt) {
      inputPayload = rawPrompt;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedAiImageUrl(null);

    try {
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputPayload || undefined,
          linkUrl: urlPayload || undefined,
          customPrompt: rawPrompt || undefined,
          aiProvider: newsAiProvider,
          template_id: templateId || undefined,
          headline_max_lines: headlineMaxLines || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'न्यूज़ प्रोसेस करने में त्रुटि');
      }

      setResult(data.data);
      const opts: string[] =
        data.data.headlineOptions && data.data.headlineOptions.length > 0
          ? [...data.data.headlineOptions]
          : [data.data.headline];
      if (data.data.headline && !opts.includes(data.data.headline)) {
        opts.unshift(data.data.headline);
      }
      if (opts.length < 5) {
        const baseTitle = cleanHeadlineText(opts[0] || data.data.headline || 'ताज़ा समाचार');
        const sourceText = data.data.summary || inputPayload || '';
        const sourceLoc = cleanLocationField(data.data.location || '');
        const factSentences = (sourceText || baseTitle)
          .split(/[।\n]+|\.\s+/)
          .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
          .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));

        const supp = generate5BalancedHeadlineOptions(baseTitle, factSentences, sourceLoc);
        const fitted = fitHeadlinesTo5TierRanges(supp, factSentences, baseTitle, sourceLoc);
        fitted.forEach((h) => {
          if (opts.length < 5 && !opts.includes(h)) opts.push(h);
        });
      }
      setHeadlineOptions(opts.slice(0, 5));
      setSelectedHeadlineIndex(0);
      setAiPhotoVariation(0);

      if (data.data.suggestedImagePrompt) {
        setAiPhotoPrompt(data.data.suggestedImagePrompt);
      }
      if (data.data.pickedImages?.main) {
        setUseWebsitePhoto(true);
        setPhotoMode('website');
      } else {
        setPhotoMode('manual');
      }
    } catch (err: any) {
      console.warn('Command processing network error, falling back to client engine:', err);
      try {
        let fallbackText = inputPayload || '';
        let fallbackImages: string[] = [];
        if (urlPayload && (!fallbackText || fallbackText.length < 25)) {
          const scraped = await scrapeNewsUrlClient(urlPayload, 16000);
          if (scraped) {
            fallbackText = scraped.title ? `Title: ${scraped.title}\n\n${scraped.content}` : scraped.content;
            if (scraped.images && scraped.images.length > 0) {
              fallbackImages = scraped.images;
            }
          }
        }

        if (urlPayload && (!fallbackText || fallbackText.length < 15 || !/[\u0900-\u097F]/.test(fallbackText))) {
          setError('इस न्यूज़ लिंक से मुख्य खबर स्वतः नहीं पढ़ी जा सकी (वेबसाइट सुरक्षा के कारण)। कृपया खबर का शीर्षक/टेक्स्ट सीधे बॉक्स में पेस्ट करें।');
          return;
        }

        const fallbackResult = processNewsLocally(fallbackText || urlPayload || '', urlPayload || undefined);
        setResult(fallbackResult);
        const opts = fallbackResult.headlineOptions && fallbackResult.headlineOptions.length > 0
          ? fallbackResult.headlineOptions
          : [fallbackResult.headline];
        setHeadlineOptions(opts);
        setSelectedHeadlineIndex(0);
        if (fallbackImages[0]) {
          setUseWebsitePhoto(true);
          setPhotoMode('website');
        } else {
          setPhotoMode('manual');
        }
      } catch (clientErr: any) {
        setError('न्यूज़ प्रोसेस करने में समस्या आई। कृपया खबर का टेक्स्ट सीधे पेस्ट करें।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHeadline = (hl: string, idx: number) => {
    setSelectedHeadlineIndex(idx);
    if (result) {
      setResult({
        ...result,
        headline: hl,
        formattedHeadline: hl,
      });
    }
  };

  const handleRegenerateHeadlines = async () => {
    if (!result?.headline) return;
    setIsRegeneratingHeadlines(true);
    setError(null);
    try {
      let data: any = null;
      try {
        const response = await fetch(getApiUrl('/api/regenerate-headlines'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            canonicalContext: {
              title: result.headline,
              articleText: result.summary,
              location: result.location,
            },
            sourceHeadline: result.headline,
            summary: result.summary,
            location: result.location,
            previousHeadlines: headlineOptions,
            customPrompt: customPrompt.trim() || undefined,
            aiProvider: newsAiProvider,
            userTier: 'pro',
          }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json().catch(() => null);
        } else {
          const rawText = await response.text().catch(() => '');
          try { data = JSON.parse(rawText); } catch { data = null; }
        }
      } catch (fetchErr) {
        data = null;
      }

      let newOpts: string[] = [];
      if (data && data.success && Array.isArray(data.headlineOptions) && data.headlineOptions.length > 0) {
        newOpts = data.headlineOptions.map((h: string) => cleanHeadlineText(h)).filter(Boolean);
      } else if (data && data.success && Array.isArray(data.options) && data.options.length > 0) {
        newOpts = data.options.map((h: string) => cleanHeadlineText(h)).filter(Boolean);
      } else if (data && data.success && Array.isArray(data.headlines) && data.headlines.length > 0) {
        newOpts = data.headlines.map((h: string) => cleanHeadlineText(h)).filter(Boolean);
      }

      if (newOpts.length === 0) {
        // Fallback to local headline generator
        const srcTitle = cleanHeadlineText(result.headline);
        const srcSummary = result.summary || '';
        const srcLoc = cleanLocationField(result.location || '');
        const sentences = (srcSummary || srcTitle)
          .split(/[।\n]+|\.\s+/)
          .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
          .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));
        const balanced = generate5BalancedHeadlineOptions(srcTitle, sentences, srcLoc);
        newOpts = fitHeadlinesTo5TierRanges(balanced, sentences, srcTitle, srcLoc);
      }

      if (newOpts.length > 0) {
        setHeadlineOptions(newOpts);
        setSelectedHeadlineIndex(0);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                headline: newOpts[0],
                formattedHeadline: newOpts[0],
              }
            : null
        );
      } else {
        setError('नए हेडलाइन विकल्प नहीं बन सके');
      }
    } catch (err: any) {
      console.warn('Headlines regeneration fallback in modal:', err);
      setError('नए हेडलाइन विकल्प नहीं बन सके');
    } finally {
      setIsRegeneratingHeadlines(false);
    }
  };

  const handleGenerateAiPhotoFromHeadline = async (
    promptOverride?: string,
    isNewVariation: boolean = false
  ) => {
    if (!result?.headline) return;
    setGeneratingAiImage(true);
    setError(null);
    setAiImageNotice(null);

    const nextVariation = isNewVariation ? aiPhotoVariation + 1 : aiPhotoVariation;
    if (isNewVariation) {
      setAiPhotoVariation(nextVariation);
    }

    const activePrompt =
      (promptOverride !== undefined ? promptOverride : aiPhotoPrompt) ||
      result.suggestedImagePrompt ||
      result.headline;

    try {
      const response = await fetch(getApiUrl('/api/generate-ai-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: result.headline,
          customPrompt: activePrompt,
          variation: nextVariation,
          aiProvider: photoAiProvider,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI फोटो जनरेट करने में त्रुटि');
      }
      setGeneratedAiImageUrl(data.imageUrl);
      setAiImageNotice(data.notice || null);
      setPhotoMode('ai');
      setResult((prev) => (prev ? { ...prev, isAiGeneratedPhoto: !data.fallbackUsed } : null));
    } catch (err: any) {
      console.error('AI image generation error:', err);
      setError(err.message || 'AI फोटो जनरेट नहीं हो सकी');
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const handleApply = () => {
    if (result) {
      const finalResult: AIAnalysisResult = { ...result };
      if (photoChoice === 'ai' && generatedAiImageUrl) {
        finalResult.pickedImages = {
          main: generatedAiImageUrl,
        };
        finalResult.isAiGeneratedPhoto = true;
      } else if (photoChoice === 'website' && result.pickedImages?.main) {
        finalResult.pickedImages = result.pickedImages;
      } else {
        // 'manual': User explicitly wants to keep current manual / uploaded photo
        finalResult.pickedImages = undefined;
      }
      onApplyResult(finalResult);
      onClose();
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                  <span>AI न्यूज़ बनाएं</span>
                  <span className="text-xs bg-yellow-400 text-neutral-950 px-1.5 py-0.5 rounded font-black">
                    Create News
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={handleResetAiBox}
                  title="AI इनपुट रिफ्रेश करें - लिंक व स्क्रिप्ट साफ़ करें"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-yellow-400 hover:text-yellow-300 text-xs font-bold border border-neutral-700 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                न्यूज़ लिंक, कच्ची स्क्रिप्ट या प्रेस नोट दर्ज करें, AI तुरंत 5 संतुलित हेडलाइन व फोटो तैयार करेगा
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            1. लिंक से खबर बनाएं (Link Analysis)
          </button>
          <button
            onClick={() => setActiveTab('command')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'command'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            2. कच्ची खबर या वॉइस कमांड (Raw Script)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {activeTab === 'link' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span>न्यूज़ आर्टिकल लिंक (URL):</span>
                </label>
                <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  अनिवार्य नहीं है
                </span>
              </div>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/news... (या लिंक न हो तो इसे खाली छोड़ दें)"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:border-yellow-400 focus:outline-none"
              />
              <p className="text-[11px] text-yellow-400/90 mt-1.5 flex items-center gap-1">
                <span>💡</span>
                <span>
                  <b>लिंक डालना अनिवार्य नहीं है!</b> यदि लिंक न हो तो इसे खाली छोड़ दें और नीचे <b>'निर्देश / प्रॉम्प्ट बॉक्स'</b> में अपनी कोई भी कच्ची स्क्रिप्ट/खबर पेस्ट कर दें।
                </span>
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  कच्ची खबर, प्रेस नोट या वॉइस विवरण दर्ज करें:
                </label>
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                  title="बोलकर समाचार विवरण दर्ज करें"
                />
              </div>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="उदा: शहडोल में छात्राओं ने कॉलेज सुविधाओं को लेकर 10 किलोमीटर पैदल मार्च निकाला और कलेक्ट्रेट पहुंचकर केवल कलेक्टर को ही ज्ञापन देने पर अड़ी रहीं।"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
              />
            </div>
          )}

          {/* User Prompt Box (Optional user instructions) */}
          <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>निर्देश / प्रॉम्प्ट बॉक्स (वैकल्पिक - Prompt Box):</span>
              </label>
              <div className="flex items-center gap-1.5">
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setCustomPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                  title="बोलकर निर्देश दर्ज करें"
                />
                <span className="text-[10px] text-neutral-500">Optional Prompt</span>
              </div>
            </div>
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="उदा. फोटो में केवल मुख्य नेता पर फोकस करें, 2 फोटो लें, या हेडलाइन को क्राइम एंगल में रखें..."
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg p-2.5 text-xs text-white placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
            />
            <p className="text-[10px] text-neutral-400 leading-snug">
              💡 यहाँ आप AI को अपनी प्राथमिकता बता सकते हैं (जैसे: किस नेता पर फोकस करना है, कितनी फोटो लगानी है, आदि)।
            </p>
          </div>

          {/* AI Engine Choice (Gemini vs ChatGPT) */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <span>🤖 AI इंजन चुनें (खबर निर्माण हेतु):</span>
              </span>
              <span className="text-[10px] text-neutral-500">
                {newsAiProvider === 'openai' ? 'OpenAI GPT-4o' : 'Google Gemini AI'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewsAiProvider('gemini')}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                  newsAiProvider === 'gemini'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm ring-1 ring-blue-500/40'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>✨ Google Gemini</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1 py-0.2 rounded font-normal">Active</span>
              </button>

              <button
                type="button"
                onClick={() => setNewsAiProvider('openai')}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                  newsAiProvider === 'openai'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>🤖 OpenAI ChatGPT</span>
                {providersStatus.openaiAvailable ? (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1 py-0.2 rounded font-normal">Ready</span>
                ) : (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-normal">API Key</span>
                )}
              </button>
            </div>
            {newsAiProvider === 'openai' && !providersStatus.openaiAvailable && (
              <p className="text-[10px] text-amber-400/90 leading-tight">
                ⚠️ OpenAI का उपयोग करने के लिए Settings में <code className="font-mono bg-neutral-900 px-1 rounded">OPENAI_API_KEY</code> उपलब्ध होनी चाहिए। (अन्यथा Gemini का चयन करें)
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProcess}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{newsAiProvider === 'openai' ? 'ChatGPT' : 'Gemini'} 5 हेडलाइन विकल्प तैयार कर रहा है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI न्यूज़ बनाएं ({newsAiProvider === 'openai' ? 'Via ChatGPT' : 'Via Gemini'})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetAiBox}
              disabled={loading}
              title="AI इनपुट रिफ्रेश करें (लिंक, स्क्रिप्ट, प्रॉम्प्ट व परिणाम पूरी तरह साफ़ करें)"
              className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow"
            >
              <RotateCcw className="w-4 h-4 text-yellow-400" />
              <span>रिफ्रेश</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleProcess}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>पुनः प्रयास करें</span>
              </button>
            </div>
          )}

          {/* Fallback notification if AI was experiencing high demand */}
          {result && (result as any).warning && (
            <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{(result as any).warning}</span>
            </div>
          )}

          {/* Result Output */}
          {result && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-yellow-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 5 संतुलित हेडलाइन विकल्प (5 Balanced Headline Options):
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                  {result.location}
                </span>
              </div>

              {/* 5 Balanced Headline Options Selector */}
              {headlineOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-400 font-semibold flex items-center justify-between">
                    <span>पसंदीदा हेडलाइन विकल्प चुनें (क्लिक करें):</span>
                    <button
                      type="button"
                      onClick={handleRegenerateHeadlines}
                      disabled={isRegeneratingHeadlines}
                      className="text-yellow-400 hover:text-yellow-300 text-[11px] font-bold flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30 cursor-pointer disabled:opacity-50"
                      title="पसंद न आने पर 5 बिल्कुल नए हेडलाइन विकल्प बनाएं"
                    >
                      {isRegeneratingHeadlines ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>नए 5 विकल्प बन रहे हैं...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          <span>🔄 5 नए विकल्प बनाएं</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {headlineOptions.slice(0, 5).map((opt, idx) => {
                      const isSelected = result.headline === opt;
                      const cleanOpt = opt.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
                      const wordCount = cleanOpt.split(/\s+/).filter(Boolean).length;
                      const charLen = countHeadlineVisibleCharacters(opt);
                      const tier = HEADLINE_5_TIER_RANGES[idx] || { min: 80, max: 200, label: '' };
                      const isCompliant = charLen >= tier.min && charLen <= tier.max;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectHeadline(opt, idx)}
                          className={`p-2.5 rounded-lg border text-xs sm:text-sm font-bold font-['Noto_Sans_Devanagari'] cursor-pointer transition-all flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-yellow-400/15 border-yellow-400 text-yellow-300 shadow-sm ring-1 ring-yellow-400/40'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-yellow-400 tracking-wide">
                                विकल्प {idx + 1}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono bg-neutral-950/80 px-2 py-0.5 rounded border border-neutral-800 flex items-center gap-1">
                                <span className="text-amber-300 font-bold">{wordCount} शब्द</span>
                                <span className="text-neutral-600">•</span>
                                <span className={isCompliant ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                  {charLen} अक्षर ({tier.min}-{tier.max})
                                </span>
                              </span>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                                <Check className="w-3.5 h-3.5 text-yellow-400" />
                                <span>चयनित</span>
                              </div>
                            )}
                          </div>
                          <div className="leading-snug text-neutral-200">
                            {opt}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Editable Active Headline */}
              <div className="space-y-1 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>चयनित हेडलाइन संपादित करें (Edit text):</span>
                    <span className="text-[10px] text-yellow-400 font-mono bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 flex items-center gap-1">
                      <span className="text-amber-300 font-bold">
                        {(result.headline || '')
                          .replace(/\[\/?(?:yellow|highlight)\]/g, '')
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length} शब्द
                      </span>
                      <span className="text-neutral-600">|</span>
                      <span>
                        {countHeadlineVisibleCharacters(result.headline || '')} / {HEADLINE_MAX_CHARACTER_LIMIT} अक्षर
                      </span>
                    </span>
                  </div>
                  <VoiceInputButton
                    onTranscript={(transcript) => {
                      setResult((prev) =>
                        prev
                          ? {
                              ...prev,
                              headline: prev.headline ? `${prev.headline} ${transcript}` : transcript,
                              formattedHeadline: prev.headline ? `${prev.headline} ${transcript}` : transcript,
                            }
                          : null
                      );
                    }}
                    title="बोलकर हेडलाइन संपादित करें"
                  />
                </div>
                <textarea
                  rows={2}
                  value={result.headline}
                  onChange={(e) => {
                    const val = e.target.value;
                    setResult((prev) =>
                      prev
                        ? {
                            ...prev,
                            headline: val,
                            formattedHeadline: val,
                          }
                        : null
                    );
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white font-extrabold text-sm sm:text-base font-['Noto_Sans_Devanagari'] focus:border-yellow-400 focus:outline-none leading-relaxed"
                  placeholder="हेडलाइन यहाँ लिखें..."
                />
              </div>

              {/* Power Words Highlighting */}
              {/* इस कैप्शन में आपका यूजरनेम शामिल है। */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-neutral-400 text-[11px]">हाइलाइटेड पॉवर शब्द:</span>
                {result.highlightWords?.map((hw, idx) => (
                  <span
                    key={idx}
                    className="bg-yellow-400 text-neutral-950 font-extrabold px-2 py-0.5 rounded text-[11px]"
                  >
                    {hw}
                  </span>
                ))}
              </div>

              {/* 1. Website Picked Image Preview & Toggle */}
              {result.pickedImages?.main && (
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <span>📸 वेबसाइट से प्राप्त फोटो (Web Scraping):</span>
                      <span className="text-[10px] bg-green-950 text-green-400 border border-green-800/60 px-1.5 py-0.2 rounded font-bold">
                        Auto Picked
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseWebsitePhoto(!useWebsitePhoto)}
                      className={`px-2.5 py-0.5 text-xs font-bold rounded border cursor-pointer ${
                        useWebsitePhoto
                          ? 'bg-green-600/30 text-green-300 border-green-500'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {useWebsitePhoto ? 'फोटो शामिल करें (ON)' : 'हटाएं (OFF)'}
                    </button>
                  </div>
                  {useWebsitePhoto && (
                    <div className="flex items-center gap-3">
                      <img
                        src={result.pickedImages.main}
                        alt="Website Article"
                        className="w-20 h-16 object-cover rounded-lg border border-neutral-700 shadow"
                      />
                      {result.pickedImages.second && (
                        <img
                          src={result.pickedImages.second}
                          alt="Website Article 2"
                          className="w-20 h-16 object-cover rounded-lg border border-neutral-700 shadow"
                        />
                      )}
                      <div className="text-[11px] text-neutral-400">
                        यह फोटो कार्ड के बैकग्राउंड में स्वतः सेट हो जाएगी। बाद में आप इसे एडिटर में बदल भी सकते हैं।
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. AI Generated Photo Option */}
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>AI फोटो जनरेटर (Image Generator):</span>
                  </span>
                  {generatedAiImageUrl && (
                    <span className="text-[11px] bg-yellow-400 text-neutral-950 font-black px-2 py-0.5 rounded">
                      {result?.isAiGeneratedPhoto ? 'AI फोटो तैयार ✅' : 'प्रेस फोटो तैयार ✅'}
                    </span>
                  )}
                </div>

                {/* Custom Image Prompt Box */}
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-yellow-400/90 flex items-center gap-1">
                      <span>कैसी AI फोटो बनाना चाहते हैं? (फोटो निर्देश / प्रॉम्प्ट):</span>
                    </label>
                    <VoiceInputButton
                      onTranscript={(transcript) => {
                        setAiPhotoPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
                      }}
                      title="बोलकर फोटो प्रॉम्प्ट बताएं"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={aiPhotoPrompt}
                    onChange={(e) => setAiPhotoPrompt(e.target.value)}
                    placeholder="उदा. सड़क हादसा, रात का समय, पुलिस बैरिकेड व एम्बुलेंस, प्रेस रिपोर्टर स्टाइल..."
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
                  />
                  <p className="text-[10px] text-neutral-400">
                    💡 यदि आप कुछ नहीं लिखेंगे तो हेडलाइन के आधार पर स्वतः उच्च गुणवत्ता फोटो बनेगी।
                  </p>
                </div>

                {/* Photo AI Provider Selector */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                  <span className="text-[11px] font-semibold text-neutral-300">
                    फोटो इंजन:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPhotoAiProvider('gemini')}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                        photoAiProvider === 'gemini'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      ✨ Gemini Imagen
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoAiProvider('openai')}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                        photoAiProvider === 'openai'
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      🎨 ChatGPT DALL-E 3
                    </button>
                  </div>
                </div>

                {/* Generate / Regenerate Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!generatedAiImageUrl ? (
                    <button
                      type="button"
                      disabled={generatingAiImage}
                      onClick={() => handleGenerateAiPhotoFromHeadline(aiPhotoPrompt)}
                      className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow transition-all"
                    >
                      {generatingAiImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{photoAiProvider === 'openai' ? 'DALL-E 3' : 'Gemini'} फोटो बना रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI फोटो बनाएं ({photoAiProvider === 'openai' ? 'DALL-E 3' : 'Gemini'})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={generatingAiImage}
                        onClick={() => handleGenerateAiPhotoFromHeadline(aiPhotoPrompt, true)}
                        className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow transition-all"
                        title="यदि पहली फोटो पसंद न आए तो दूसरी फोटो बनाएं"
                      >
                        {generatingAiImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>नई फोटो बन रही है...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>🔄 दूसरी फोटो बनाएं ({photoAiProvider === 'openai' ? 'DALL-E 3' : 'Gemini'})</span>
                          </>
                        )}
                      </button>
                      {aiPhotoVariation > 0 && (
                        <span className="text-[10px] px-2 py-1 rounded bg-neutral-800 text-neutral-300 font-mono font-bold">
                          वेरिएशन #{aiPhotoVariation + 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Generated image preview */}
                {generatedAiImageUrl && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-3 p-2 bg-neutral-950 rounded-lg border border-yellow-500/40">
                      <img
                        src={generatedAiImageUrl}
                        alt="AI Background Preview"
                        className="w-24 h-24 object-cover rounded-lg border border-yellow-400/50 shadow shrink-0"
                      />
                      <div className="text-[11px] text-neutral-300 space-y-1">
                        <div className="font-bold text-yellow-400">
                          {result?.isAiGeneratedPhoto ? 'AI फोटो तैयार है' : 'प्रेस फोटो तैयार है'}
                        </div>
                        <p>
                          {result?.isAiGeneratedPhoto
                            ? 'कार्ड में स्वतः यही बैकग्राउंड लगेगा और AI GENERATED वाटरमार्क ऑन रहेगा।'
                            : 'हेडलाइन के अनुसार प्रामाणिक प्रेस फोटो तैयार कर ली गई है।'}
                        </p>
                        <p className="text-neutral-400 text-[10px]">
                          पसंद नहीं आई? ऊपर प्रॉम्प्ट बदलकर <b>'दूसरी फोटो बनाएं'</b> दबाएं।
                        </p>
                      </div>
                    </div>
                    {aiImageNotice && (
                      <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded">
                        ℹ️ {aiImageNotice}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photo Choice: Manual / AI / Website */}
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>कार्ड में कौन सी फोटो लगानी है? (Photo Option):</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">अपनी पसंद चुनें</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('manual')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      photoChoice === 'manual'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📸</span>
                      <span className="text-xs font-bold">मैन्युअल फोटो</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                      मेरी अपनी फोटो रहने दें / गैलरी से लगाऊंगा
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!generatedAiImageUrl}
                    onClick={() => setPhotoMode('ai')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      photoChoice === 'ai'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold'
                        : !generatedAiImageUrl
                        ? 'bg-neutral-950 border-neutral-800/60 text-neutral-600 cursor-not-allowed opacity-50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">✨</span>
                      <span className="text-xs font-bold">AI फोटो</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                      {generatedAiImageUrl ? 'AI से बनी फोटो लगाएं' : 'ऊपर AI फोटो जनरेट करें'}
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!result?.pickedImages?.main}
                    onClick={() => setPhotoMode('website')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      photoChoice === 'website'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold'
                        : !result?.pickedImages?.main
                        ? 'bg-neutral-950 border-neutral-800/60 text-neutral-600 cursor-not-allowed opacity-50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🌐</span>
                      <span className="text-xs font-bold">वेबसाइट फोटो</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                      {result?.pickedImages?.main ? 'लिंक से प्राप्त फोटो लगाएं' : 'वेबसाइट फोटो नहीं मिली'}
                    </p>
                  </button>
                </div>
              </div>

              {/* AI Generated Photo Badge Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-neutral-200">
                    AI वाटरमार्क (AI GENERATED):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setResult({
                      ...result,
                      isAiGeneratedPhoto: !result.isAiGeneratedPhoto,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                    result.isAiGeneratedPhoto
                      ? 'bg-yellow-400 text-neutral-950 border-yellow-400 font-black'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {result.isAiGeneratedPhoto ? 'सक्रिय (ON)' : 'बंद (OFF)'}
                </button>
              </div>

              <button
                onClick={handleApply}
                className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Check className="w-4 h-4" />
                <span>कार्ड में लागू करें</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
