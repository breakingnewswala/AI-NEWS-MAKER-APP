import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Link as LinkIcon,
  FileText,
  Clipboard,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Bot,
  Server,
  Zap,
} from 'lucide-react';
import { AIAnalysisResult, NewsCardData } from '../types';
import { VoiceInputButton } from './VoiceInputButton';
import { getApiUrl } from '../lib/apiConfig';
import { processNewsLocally } from '../lib/clientAiProcessor';
import { getTemplateHeadlineConfig } from '../lib/graphicTemplatesRegistry';
import { cleanHeadlineText, cleanLocationField, cleanCategoryField } from '../lib/speakerUtils';
import { isUserAdmin, isUserSuperAdmin } from '../lib/userPlanManager';
import { ReporterUser } from './LoginModal';

export interface AutoFillNewsData {
  url?: string;
  title?: string;
  summary?: string;
  fullNews?: string;
  imageUrl?: string;
  category?: string;
  location?: string;
  autoTrigger?: boolean;
  timestamp?: number;
  additionalPhotos?: string[];
}

interface InlineAiNewsToolsProps {
  card: NewsCardData;
  onChange: (updates: Partial<NewsCardData>) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  mobileViewMode?: 'steps' | 'all';
  onOpenCloudSettings?: () => void;
  autoFillNews?: AutoFillNewsData | null;
  currentUser?: ReporterUser | null;
}

export const InlineAiNewsTools: React.FC<InlineAiNewsToolsProps> = ({
  card,
  onChange,
  onNextStep,
  onPrevStep,
  mobileViewMode = 'steps',
  onOpenCloudSettings,
  autoFillNews,
  currentUser,
}) => {
  const isAdminOrSuperAdmin = isUserAdmin(currentUser) || isUserSuperAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<'link' | 'command'>('link');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptBox, setShowPromptBox] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [headlineOptions, setHeadlineOptions] = useState<string[]>([]);
  const [selectedHeadlineIndex, setSelectedHeadlineIndex] = useState<number>(0);
  const [useWebsitePhoto, setUseWebsitePhoto] = useState<boolean>(true);

  // AI Photo state inside result
  const [generatingAiPhoto, setGeneratingAiPhoto] = useState<boolean>(false);
  const [generatedAiImageUrl, setGeneratedAiImageUrl] = useState<string | null>(null);
  const [aiPhotoPrompt, setAiPhotoPrompt] = useState<string>('');
  const [captionCopied, setCaptionCopied] = useState<boolean>(false);

  // 3 Caption Styles: detailed (3 paragraphs), bullets (bullet points), short (2 paragraphs)
  const [captionStyle, setCaptionStyle] = useState<'detailed' | 'bullets' | 'short'>('detailed');
  const isExecutingRef = React.useRef<boolean>(false);
  const lastTriggerPayloadRef = React.useRef<string>('');
  const currentAbortControllerRef = React.useRef<AbortController | null>(null);
  const isResetRef = React.useRef<boolean>(false);

  // Listen for studio reset event from App.tsx
  useEffect(() => {
    const handleStudioReset = () => {
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }
      isExecutingRef.current = false;
      isResetRef.current = true;
      setLoading(false);
      setLinkUrl('');
      setInputText('');
      setCustomPrompt('');
      setResult(null);
      setHeadlineOptions([]);
      setSelectedHeadlineIndex(0);
      setGeneratedAiImageUrl(null);
      setError(null);
      setAiPhotoPrompt('');
      lastTriggerPayloadRef.current = '';
      try {
        localStorage.removeItem('ai_tools_raw_url');
        localStorage.removeItem('ai_tools_raw_news');
        localStorage.removeItem('selected_raw_news_id');
        localStorage.removeItem('ai_tools_generated_headlines');
        localStorage.removeItem('studio_autofill_news_item');
        localStorage.removeItem('studio_active_news_photos');
      } catch {}
    };
    window.addEventListener('ai_news_studio_reset', handleStudioReset);
    return () => window.removeEventListener('ai_news_studio_reset', handleStudioReset);
  }, []);

  const normalizeInputUrl = (u: string): string => {
    const trimmed = (u || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed) || /^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Structured caption formatter supporting 3 distinct styles with strict hashtag hierarchy:
  // 1st: #${username}, Middle: location & news tags, Last: #AiNewsMaker
  const formatCaptionByStyle = (
    style: 'detailed' | 'bullets' | 'short',
    headline: string,
    location: string,
    baseSummary: string,
    currentRes?: AIAnalysisResult | null,
    sourceUrl?: string
  ): string => {
    const loc = location || 'मध्य प्रदेश';
    const cleanUser = card.socialHandle
      ? card.socialHandle.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')
      : (currentUser?.username ? currentUser.username.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '') : '');
    const userTag = cleanUser ? `#${cleanUser}` : '';

    const ensureStrictHashtags = (caption: string): string => {
      const hashtagRegex = /#[\w\u0900-\u097F]+/g;
      const rawTags = caption.match(hashtagRegex) || [];
      const cleanBody = caption.replace(hashtagRegex, '').replace(/\n{3,}/g, '\n\n').trim();

      const locTag = loc && loc !== 'विशेष कवरेज' ? `#${loc.replace(/[^\w\u0900-\u097F]/g, '')}News` : '';
      const midTags: string[] = [];
      if (locTag) midTags.push(locTag);

      for (const t of rawTags) {
        const lower = t.toLowerCase();
        if (
          lower === '#breakingnewswala' ||
          lower === '#bnwtv' ||
          lower === '#ainewsmaker' ||
          (userTag && lower === userTag.toLowerCase()) ||
          lower.startsWith('#http') ||
          lower.startsWith('#www') ||
          lower.startsWith('#url')
        ) {
          continue;
        }
        if (!midTags.includes(t)) {
          midTags.push(t);
        }
      }

      if (!midTags.includes('#BreakingNews')) midTags.push('#BreakingNews');
      if (!midTags.includes('#HindiNews')) midTags.push('#HindiNews');

      const allTags = [userTag, ...midTags, '#AINewsMaker'].filter(Boolean);
      return `${cleanBody}\n\n${allTags.join(' ')}`;
    };

    if (currentRes) {
      if (style === 'detailed' && currentRes.captionDetailed) return ensureStrictHashtags(currentRes.captionDetailed);
      if (style === 'bullets' && currentRes.captionBullets) return ensureStrictHashtags(currentRes.captionBullets);
      if (style === 'short' && currentRes.captionShort) return ensureStrictHashtags(currentRes.captionShort);
    }

    const hashtagRegex = /#[\w\u0900-\u097F]+/g;
    const cleanBody = (baseSummary || '').replace(hashtagRegex, '').trim();
    const sentences = cleanBody
      .split(/[।\.\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (style === 'bullets') {
      const intro = `मुख्य घटनाक्रम: ${headline}\nस्थान: ${loc}`;
      const bulletItems = (sentences.length >= 3 ? sentences.slice(0, 4) : [
        `घटनाक्रम को लेकर मुख्य विवरण संज्ञान में लिया गया है।`,
        `संबंधित विभाग और अधिकारियों द्वारा आवश्यक जांच की जा रही है।`,
        `तथ्यों के आधार पर अग्रिम दिशा-निर्देश दिए गए हैं।`,
      ]).map((b) => `• ${b}`);
      const closing = `प्रशासनिक अमला मौके की निगरानी कर रहा है और अग्रिम कार्रवाई की जा रही है।`;
      return ensureStrictHashtags(`${intro}\n\n${bulletItems.join('\n')}\n\n${closing}`);
    }

    if (style === 'short') {
      const shortP1 = `${headline}। ${loc ? `${loc} से संबंधित` : 'इस'} ताजा घटनाक्रम में महत्वपूर्ण जानकारी सामने आई है। ${sentences[0] || 'मामले को लेकर संबंधित स्तर पर संज्ञान लिया गया है।'}`;
      const shortP2 = `${sentences[1] || 'उत्तरदायी अधिकारियों द्वारा स्थिति का जायजा लेते हुए अग्रिम प्रक्रिया पूरी की जा रही है।'}`;
      return ensureStrictHashtags(`${shortP1}\n\n${shortP2}`);
    }

    // Default: Detailed (3 full paragraphs)
    const p1 = `${headline}। ${loc ? `${loc} से संबंधित` : 'इस'} मुख्य घटनाक्रम को लेकर ताजा जानकारी सामने आई है। ${sentences[0] || 'मामले की पूरी पृष्ठभूमि की समीक्षा की जा रही है।'}`;
    const p2 = sentences.slice(1, 3).join('। ') || 'प्राप्त जानकारी के अनुसार मामले की पृष्ठभूमि में कई अहम तथ्य और कारण सामने आ रहे हैं। प्रत्यक्षदर्शियों व आधिकारिक सूत्रों के अनुसार घटनाक्रम के प्रभाव का गहनता से आकलन किया जा रहा है।';
    const p3 = sentences.slice(3, 5).join('। ') || 'प्रशासन और उत्तरदायी अधिकारियों की ओर से त्वरित संज्ञान लेते हुए आवश्यक दिशा-निर्देश जारी कर दिए गए हैं। स्थिति पर लगातार नजर रखी जा रही है।';
    return ensureStrictHashtags(`${p1}\n\n${p2}\n\n${p3}`);
  };

  const handleSwitchCaptionStyle = (newStyle: 'detailed' | 'bullets' | 'short') => {
    setCaptionStyle(newStyle);
    const h = result?.headline || card.headline;
    const loc = result?.location || card.location || 'मध्य प्रदेश';
    const newSummary = formatCaptionByStyle(newStyle, h, loc, result?.summary || card.summary || '', result, linkUrl);
    if (result) {
      setResult({
        ...result,
        summary: newSummary,
      });
    }
    onChange({ summary: newSummary });
  };

  const handleCopyCaption = () => {
    const h = result?.headline || card.headline;
    const loc = result?.location || card.location || 'मध्य प्रदेश';
    const fullCaption = formatCaptionByStyle(
      captionStyle,
      h,
      loc,
      result?.summary || card.summary || '',
      result,
      linkUrl || card.websiteUrl
    );
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullCaption).catch(() => {});
    }
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2500);

    if (typeof window !== 'undefined') {
      if ((window as any).AndroidBridge?.showToast) {
        try {
          (window as any).AndroidBridge.showToast('कैप्शन कॉपी हो गया');
        } catch {}
      }
      if ((window as any).showAppToast) {
        (window as any).showAppToast('कैप्शन कॉपी हो गया');
      }
    }
  };

  const lastProcessedTimeRef = React.useRef<number>(0);

  // Automation: When autoFillNews is supplied, paste into Step 2A and auto-trigger if requested
  React.useEffect(() => {
    if (!autoFillNews) return;
    if (autoFillNews.timestamp && autoFillNews.timestamp === lastProcessedTimeRef.current) return;
    if (autoFillNews.timestamp) {
      lastProcessedTimeRef.current = autoFillNews.timestamp;
    }

    const rawUrl = autoFillNews.url || (autoFillNews.title ? `https://www.ainewsmaker.online/news/${encodeURIComponent(autoFillNews.title.slice(0, 30))}` : '');
    const effectiveTargetUrl = normalizeInputUrl(rawUrl);
    const rawContent = autoFillNews.fullNews || autoFillNews.summary || autoFillNews.title || '';
    
    if (autoFillNews.url) {
      setActiveTab('link');
    } else if (autoFillNews.fullNews) {
      setActiveTab('command');
    } else {
      setActiveTab('link');
    }
    
    setLinkUrl(effectiveTargetUrl);
    setInputText(rawContent);
    setError(null);

    // Apply news photo and additional photos if provided
    if (autoFillNews.imageUrl || (autoFillNews.additionalPhotos && autoFillNews.additionalPhotos.length > 0)) {
      const photos = autoFillNews.additionalPhotos || [];
      const primaryPhoto = autoFillNews.imageUrl || photos[0] || card.images.main;
      const secondPhoto = photos[1] || photos[0] || card.images.second || primaryPhoto;
      const thirdPhoto = photos[2] || photos[0] || card.images.third || primaryPhoto;
      const fourthPhoto = photos[3] || photos[1] || photos[0] || card.images.fourth || primaryPhoto;

      onChange({
        images: {
          ...card.images,
          main: primaryPhoto,
          second: secondPhoto,
          third: thirdPhoto,
          fourth: fourthPhoto,
        },
        extractedArticlePhotos: photos.length > 0 ? photos : (primaryPhoto ? [primaryPhoto] : card.extractedArticlePhotos),
      });
    }

    if (autoFillNews.autoTrigger) {
      triggerProcessDirectly(effectiveTargetUrl, rawContent, autoFillNews);
    }
  }, [autoFillNews]);

  // Paste from clipboard to link (supports both Web and Android Native Bridge)
  const handlePasteClipboardToLink = async () => {
    try {
      let text = '';
      if ((window as any).AndroidBridge?.getClipboardText) {
        text = (window as any).AndroidBridge.getClipboardText();
      }
      if (!text && navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text && text.trim()) {
        setLinkUrl(normalizeInputUrl(text.trim()));
        setError(null);
      } else {
        setError('क्लिपबोर्ड खाली है या अनुमति नहीं है। कृपया लिंक सीधे बॉक्स में पेस्ट करें।');
      }
    } catch {
      setError('कृपया लिंक सीधे इनपुट बॉक्स में पेस्ट करें।');
    }
  };

  // Paste from clipboard to raw text
  const handlePasteClipboardToInput = async () => {
    try {
      let text = '';
      if ((window as any).AndroidBridge?.getClipboardText) {
        text = (window as any).AndroidBridge.getClipboardText();
      }
      if (!text && navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text && text.trim()) {
        setInputText((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
        setError(null);
      } else {
        setError('क्लिपबोर्ड खाली है या अनुमति नहीं है। कृपया टेक्स्ट सीधे बॉक्स में टाइप/पेस्ट करें।');
      }
    } catch {
      setError('कृपया टेक्स्ट सीधे इनपुट बॉक्स में टाइप या पेस्ट करें।');
    }
  };

  // Automated execution for Step 2A (when user clicks 'खबर से ग्राफिक बनाएं' in feed)
  const triggerProcessDirectly = async (url: string, rawText: string, extraData?: AutoFillNewsData) => {
    let effectiveLink = normalizeInputUrl(url);
    let effectiveText = rawText.trim();

    if (effectiveLink && !effectiveLink.startsWith('http://') && !effectiveLink.startsWith('https://')) {
      effectiveText = effectiveLink;
      effectiveLink = '';
    }

    const payloadKey = `${effectiveLink}|${effectiveText}|${extraData?.timestamp || ''}`;
    if (isExecutingRef.current) return;
    if (lastTriggerPayloadRef.current === payloadKey && Date.now() - lastProcessedTimeRef.current < 2500) {
      return;
    }
    isExecutingRef.current = true;
    lastTriggerPayloadRef.current = payloadKey;
    lastProcessedTimeRef.current = Date.now();

    setLoading(true);
    setError(null);
    setResult(null);
    setHeadlineOptions([]);
    setGeneratedAiImageUrl(null);

    // Immediate apply: As soon as user clicks "खबर से ग्राफिक बनाएँ", load title, summary and image immediately into card
    if (extraData?.title || extraData?.imageUrl) {
      const immediateHeadline = extraData.title || card.headline;
      const immediateLocation = extraData.location || card.location || '';
      const immediateImage = extraData.imageUrl || card.images.main;
      const immediateSummary = extraData.summary || card.summary;
      const extraPhotos = extraData.additionalPhotos || [];

      onChange({
        headline: immediateHeadline,
        formattedHeadline: immediateHeadline,
        location: immediateLocation,
        summary: immediateSummary,
        images: {
          ...card.images,
          main: immediateImage,
          second: extraPhotos[1] || extraPhotos[0] || card.images.second || immediateImage,
          third: extraPhotos[2] || extraPhotos[0] || card.images.third || immediateImage,
          fourth: extraPhotos[3] || extraPhotos[1] || extraPhotos[0] || card.images.fourth || immediateImage,
        },
        extractedArticlePhotos: extraPhotos.length > 0 ? extraPhotos : card.extractedArticlePhotos,
      });

      const baseImmediate = cleanHeadlineText(immediateHeadline);
      setHeadlineOptions([
        baseImmediate,
        cleanHeadlineText("मामले में बड़ा खुलासा, सामने आए महत्वपूर्ण तथ्य और नए दिशा-निर्देश"),
        cleanHeadlineText("क्या नियमों में बदलाव से आम जनता को मिलेगी राहत? उठे गंभीर सवाल"),
        cleanHeadlineText("उच्चाधिकारियों ने लिया त्वरित संज्ञान, अग्रिम दिशा-निर्देश व जांच जारी"),
        cleanHeadlineText("फैसले का आम जनजीवन पर दिखेगा व्यापक असर, व्यवस्था में सुधार की मांग तेज"),
      ]);
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!immediateImage);
    }

    const tplConfig = getTemplateHeadlineConfig(card.frameDesign);
    const targetMaxLines = tplConfig.headline_max_lines;

    try {
      const controller = new AbortController();
      currentAbortControllerRef.current = controller;
      isResetRef.current = false;
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: effectiveText || extraData?.title || undefined,
          linkUrl: effectiveLink || undefined,
          imageUrl: extraData?.imageUrl || card.images.main || undefined,
          customPrompt: customPrompt.trim() || undefined,
          aiProvider,
          channelUsername: card.socialHandle || currentUser?.username || undefined,
          template_id: tplConfig.template_id,
          headline_line_count: targetMaxLines,
          headline_max_lines: targetMaxLines,
          headline_area: tplConfig.headline_area,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (isResetRef.current) {
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'सर्वर से विश्लेषण में त्रुटि');
      }

      const res: AIAnalysisResult = data.data;
      if (res.headline) res.headline = cleanHeadlineText(res.headline);
      if (res.formattedHeadline) res.formattedHeadline = cleanHeadlineText(res.formattedHeadline);
      if (res.location) res.location = cleanLocationField(res.location);
      if (res.category) res.category = cleanCategoryField(res.category);
      setResult(res);

      const opts: string[] = [];
      if (Array.isArray(res.headlineOptions) && res.headlineOptions.length > 0) {
        res.headlineOptions.forEach((h: string) => {
          const cleanH = cleanHeadlineText(h);
          if (cleanH && !opts.includes(cleanH)) opts.push(cleanH);
        });
      }
      if (res.headline) {
        const cleanMain = cleanHeadlineText(res.headline);
        if (cleanMain && !opts.includes(cleanMain)) opts.unshift(cleanMain);
      }
      if (opts.length < 5) {
        const baseH = cleanHeadlineText(opts[0] || res.headline || extraData?.title || 'ताज़ा समाचार');
        const standardOptions = [
          baseH,
          cleanHeadlineText("प्रशासनिक संवेदनहीनता और बदहाली पर उठे गंभीर सवाल, आखिर कौन है जिम्मेदार"),
          cleanHeadlineText("मामले में सामने आए चौंकाने वाले तथ्य, जानिए क्या है पूरा घटनाक्रम"),
          cleanHeadlineText("लापरवाही पर सख्त संज्ञान: उत्तरदायी अधिकारियों ने दिए जांच व कार्रवाई के सख्त आदेश"),
          cleanHeadlineText("फैसले का आम जनजीवन पर दिखेगा व्यापक असर, व्यवस्था में सुधार की मांग तेज"),
        ];
        for (const sOpt of standardOptions) {
          if (!opts.includes(sOpt) && opts.length < 5) {
            opts.push(sOpt);
          }
        }
      }
      setHeadlineOptions(opts.slice(0, 5));
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!res.pickedImages?.main || !!extraData?.imageUrl);

      const finalHeadline = cleanHeadlineText(opts[0] || res.headline || extraData?.title || card.headline);
      const finalLoc = cleanLocationField(res.location || extraData?.location || card.location || '');
      const safeProxy = (u?: string) => {
        if (!u || !u.trim()) return '';
        const trimmed = u.trim();
        if (trimmed.includes('/api/proxy-image')) {
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
          return getApiUrl(trimmed);
        }
        if (
          (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
          typeof window !== 'undefined' &&
          !trimmed.startsWith(window.location.origin)
        ) {
          return getApiUrl(`/api/proxy-image?url=${encodeURIComponent(trimmed)}`);
        }
        return trimmed;
      };

      const finalImage = safeProxy(
        (res.pickedImages?.main && !res.pickedImages.main.includes('placeholder'))
          ? res.pickedImages.main
          : (extraData?.imageUrl || card.images.main)
      );
      const extraPhotos = (res.extractedArticlePhotos && res.extractedArticlePhotos.length > 0)
        ? res.extractedArticlePhotos
        : (extraData?.additionalPhotos || []);
      const finalSecond = safeProxy(
        res.pickedImages?.second ||
        (extraPhotos[1] && extraPhotos[1] !== finalImage ? extraPhotos[1] : '') ||
        (card.images.second && card.images.second !== finalImage ? card.images.second : '')
      );
      const finalThird = safeProxy(
        res.pickedImages?.third ||
        (extraPhotos[2] && extraPhotos[2] !== finalImage && extraPhotos[2] !== finalSecond ? extraPhotos[2] : '') ||
        (card.images.third && card.images.third !== finalImage ? card.images.third : '')
      );
      const finalFourth = safeProxy(
        res.pickedImages?.fourth ||
        (extraPhotos[3] && extraPhotos[3] !== finalImage ? extraPhotos[3] : '') ||
        (card.images.fourth && card.images.fourth !== finalImage ? card.images.fourth : '')
      );

      const effectiveCaption = formatCaptionByStyle(
        captionStyle,
        finalHeadline,
        finalLoc,
        res.summary || extraData?.summary || '',
        res,
        effectiveLink || url
      );

      onChange({
        headline: finalHeadline,
        formattedHeadline: res.formattedHeadline || finalHeadline,
        highlightWords: res.highlightWords || [],
        location: finalLoc,
        summary: effectiveCaption,
        images: {
          ...card.images,
          main: finalImage,
          second: finalSecond,
          third: finalThird,
          fourth: finalFourth,
        },
        extractedArticlePhotos: extraPhotos.length > 0 ? extraPhotos : card.extractedArticlePhotos,
      });

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(effectiveCaption).catch(() => {});
      }
    } catch (err: any) {
      console.warn('API error, executing client AI fallback:', err);
      const fallbackResult = processNewsLocally(
        effectiveText || extraData?.title || effectiveLink,
        effectiveLink || undefined
      );

      const opts: string[] = [];
      if (Array.isArray(fallbackResult.headlineOptions) && fallbackResult.headlineOptions.length > 0) {
        fallbackResult.headlineOptions.forEach((h: string) => {
          const cleanH = cleanHeadlineText(h);
          if (cleanH && !opts.includes(cleanH)) opts.push(cleanH);
        });
      }
      if (fallbackResult.headline) {
        const cleanMain = cleanHeadlineText(fallbackResult.headline);
        if (cleanMain && !opts.includes(cleanMain)) opts.unshift(cleanMain);
      }
      if (opts.length < 5) {
        const baseH = cleanHeadlineText(opts[0] || fallbackResult.headline || extraData?.title || 'ताज़ा समाचार');
        const standardOptions = [
          baseH,
          cleanHeadlineText("प्रशासनिक संवेदनहीनता और बदहाली पर उठे गंभीर सवाल, आखिर कौन है जिम्मेदार"),
          cleanHeadlineText("मामले में सामने आए चौंकाने वाले तथ्य, जानिए क्या है पूरा घटनाक्रम"),
          cleanHeadlineText("मामले को लेकर बड़ा फैसला: उत्तरदायी अधिकारियों ने दिए जांच व कार्रवाई के निर्देश"),
          cleanHeadlineText("फैसले का आम जनजीवन पर दिखेगा व्यापक असर, व्यवस्था में सुधार की मांग तेज"),
        ];
        for (const sOpt of standardOptions) {
          if (!opts.includes(sOpt) && opts.length < 5) {
            opts.push(sOpt);
          }
        }
      }

      setResult(fallbackResult);
      setHeadlineOptions(opts.slice(0, 5));
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!extraData?.imageUrl);

      const finalHeadline = cleanHeadlineText(opts[0] || fallbackResult.headline || extraData?.title || card.headline);
      const finalLoc = cleanLocationField(fallbackResult.location || extraData?.location || card.location || '');
      const finalImage = (extraData?.imageUrl && !extraData.imageUrl.includes('placeholder'))
        ? extraData.imageUrl
        : (card.images.main || extraData?.imageUrl || '');

      const effectiveCaption = formatCaptionByStyle(
        captionStyle,
        finalHeadline,
        finalLoc,
        fallbackResult.summary || extraData?.summary || '',
        fallbackResult,
        effectiveLink || url
      );

      const extraPhotos = extraData?.additionalPhotos || [];
      const finalSecond = extraPhotos[1] || extraPhotos[0] || card.images.second || finalImage;
      const finalThird = extraPhotos[2] || extraPhotos[0] || card.images.third || finalImage;
      const finalFourth = extraPhotos[3] || extraPhotos[1] || extraPhotos[0] || card.images.fourth || finalImage;

      onChange({
        headline: finalHeadline,
        formattedHeadline: fallbackResult.formattedHeadline || finalHeadline,
        highlightWords: fallbackResult.highlightWords || [],
        location: finalLoc,
        summary: effectiveCaption,
        images: {
          ...card.images,
          main: finalImage,
          second: finalSecond,
          third: finalThird,
          fourth: finalFourth,
        },
        extractedArticlePhotos: extraPhotos.length > 0 ? extraPhotos : card.extractedArticlePhotos,
      });

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(effectiveCaption).catch(() => {});
      }
    } finally {
      setLoading(false);
      isExecutingRef.current = false;
    }
  };

  // Main AI Process
  const handleProcess = async () => {
    if (isExecutingRef.current) return;
    const isLinkMode = activeTab === 'link';
    let effectiveLink = isLinkMode ? normalizeInputUrl(linkUrl) : '';
    let effectiveText = !isLinkMode ? inputText.trim() : '';
    const rawPrompt = customPrompt.trim();

    if (isLinkMode && effectiveLink) {
      if (!effectiveLink.startsWith('http://') && !effectiveLink.startsWith('https://')) {
        effectiveText = effectiveLink;
        effectiveLink = '';
      }
    }

    if (!effectiveLink && !effectiveText && rawPrompt) {
      effectiveText = rawPrompt;
    }

    if (!effectiveLink && !effectiveText) {
      setError('कृपया किसी समाचार का लिंक, कच्चा विवरण या निर्देश/प्रॉम्प्ट दर्ज करें');
      return;
    }

    isExecutingRef.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setHeadlineOptions([]);
    setGeneratedAiImageUrl(null);

    const tplConfig = getTemplateHeadlineConfig(card.frameDesign);
    const targetMaxLines = tplConfig.headline_max_lines;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: effectiveText || undefined,
          linkUrl: effectiveLink || undefined,
          customPrompt: (customPrompt.trim() ? customPrompt.trim() + ' ' : '') + `(सख्ती से अधिकतम ${targetMaxLines} लाइन हेडलाइन)`,
          aiProvider,
          channelUsername: card.socialHandle || currentUser?.username || undefined,
          template_id: tplConfig.template_id,
          headline_line_count: targetMaxLines,
          headline_max_lines: targetMaxLines,
          headline_area: tplConfig.headline_area,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'सर्वर से विश्लेषण में त्रुटि');
      }

      const res: AIAnalysisResult = data.data;
      if (res.headline) res.headline = cleanHeadlineText(res.headline);
      if (res.formattedHeadline) res.formattedHeadline = cleanHeadlineText(res.formattedHeadline);
      setResult(res);

      const opts: string[] = [];
      if (Array.isArray(res.headlineOptions) && res.headlineOptions.length > 0) {
        res.headlineOptions.forEach((h: string) => {
          const cleanH = cleanHeadlineText(h);
          if (cleanH && !opts.includes(cleanH)) opts.push(cleanH);
        });
      }
      if (res.headline) {
        const cleanMain = cleanHeadlineText(res.headline);
        if (cleanMain && !opts.includes(cleanMain)) opts.unshift(cleanMain);
      }
      if (opts.length < 5) {
        if (res.summary) {
          const s = cleanHeadlineText(res.summary.slice(0, 90));
          if (s && !opts.includes(s)) opts.push(s);
        }
        if (res.location && res.headline) {
          const locOpt = cleanHeadlineText(`${res.location}: ${res.headline}`);
          if (locOpt && !opts.includes(locOpt)) opts.push(locOpt);
        }
        const baseH = cleanHeadlineText(opts[0] || res.headline || card.headline || 'ताज़ा समाचार');
        const extras = [
          cleanHeadlineText("प्रशासनिक संवेदनहीनता और बदहाली पर उठे गंभीर सवाल, आखिर कौन है जिम्मेदार"),
          cleanHeadlineText("मामले में सामने आए चौंकाने वाले तथ्य, जानिए क्या है पूरा घटनाक्रम"),
          cleanHeadlineText("लापरवाही पर सख्त संज्ञान: उत्तरदायी अधिकारियों ने दिए जांच व कार्रवाई के सख्त आदेश"),
          cleanHeadlineText("फैसले का आम जनजीवन पर दिखेगा व्यापक असर, व्यवस्था में सुधार की मांग तेज"),
        ];
        for (const ex of extras) {
          if (!opts.includes(ex) && opts.length < 5) opts.push(ex);
        }
      }
      setHeadlineOptions(opts.slice(0, 5));
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!res.pickedImages?.main);

      const finalHeadline = cleanHeadlineText(opts[0] || res.headline || card.headline);
      const finalLoc = cleanLocationField(res.location || card.location || '');
      const finalImage = res.pickedImages?.main || card.images.main;

      const effectiveCaption = formatCaptionByStyle(
        captionStyle,
        finalHeadline,
        finalLoc,
        res.summary || '',
        res,
        effectiveLink
      );

      onChange({
        headline: finalHeadline,
        formattedHeadline: res.formattedHeadline || finalHeadline,
        highlightWords: res.highlightWords || [],
        location: finalLoc,
        summary: effectiveCaption,
        images: {
          ...card.images,
          main: finalImage,
          second: res.pickedImages?.second || card.images.second,
          third: res.pickedImages?.third || card.images.third,
          fourth: res.pickedImages?.fourth || card.images.fourth,
        },
        extractedArticlePhotos: card.extractedArticlePhotos,
      });

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(effectiveCaption).catch(() => {});
      }
    } catch (err: any) {
      console.warn('API error, executing client AI fallback:', err);
      try {
        const fallbackResult = processNewsLocally(
          effectiveText || effectiveLink,
          effectiveLink || undefined,
          tplConfig
        );

        const opts: string[] = [];
        if (Array.isArray(fallbackResult.headlineOptions) && fallbackResult.headlineOptions.length > 0) {
          fallbackResult.headlineOptions.forEach((h: string) => {
            const cleanH = cleanHeadlineText(h);
            if (cleanH && !opts.includes(cleanH)) opts.push(cleanH);
          });
        }
        if (fallbackResult.headline) {
          const cleanMain = cleanHeadlineText(fallbackResult.headline);
          if (cleanMain && !opts.includes(cleanMain)) opts.unshift(cleanMain);
        }
        if (opts.length < 5) {
          if (fallbackResult.summary) {
            opts.push(cleanHeadlineText(fallbackResult.summary.slice(0, 90)));
          }
          opts.push(`${fallbackResult.location}: ${fallbackResult.headline}`);
          const baseH = cleanHeadlineText(opts[0] || fallbackResult.headline || 'ताज़ा समाचार');
          const extras = [
            cleanHeadlineText("प्रशासनिक संवेदनहीनता और बदहाली पर उठे गंभीर सवाल, आखिर कौन है जिम्मेदार"),
            cleanHeadlineText("मामले में सामने आए चौंकाने वाले तथ्य, जानिए क्या है पूरा घटनाक्रम"),
            cleanHeadlineText("लापरवाही पर सख्त संज्ञान: उत्तरदायी अधिकारियों ने दिए जांच व कार्रवाई के सख्त आदेश"),
            cleanHeadlineText("फैसले का आम जनजीवन पर दिखेगा व्यापक असर, व्यवस्था में सुधार की मांग तेज"),
          ];
          for (const ex of extras) {
            if (!opts.includes(ex) && opts.length < 5) opts.push(ex);
          }
        }

        setResult(fallbackResult);
        setHeadlineOptions(opts.slice(0, 5));
        setSelectedHeadlineIndex(0);
        setUseWebsitePhoto(false);

        const finalHeadline = cleanHeadlineText(opts[0] || fallbackResult.headline || card.headline);
        const finalLoc = cleanLocationField(fallbackResult.location || card.location || '');

        const effectiveCaption = formatCaptionByStyle(
          captionStyle,
          finalHeadline,
          finalLoc,
          fallbackResult.summary || '',
          fallbackResult,
          effectiveLink
        );

        onChange({
          headline: finalHeadline,
          formattedHeadline: fallbackResult.formattedHeadline || finalHeadline,
          highlightWords: fallbackResult.highlightWords || [],
          location: finalLoc,
          summary: effectiveCaption,
        });

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(effectiveCaption).catch(() => {});
        }
      } catch {
        setError('खबर की जानकारी प्राप्त नहीं हो सकी। कृपया लिंक जाँचें या खबर का टेक्स्ट पेस्ट करें।');
      }
    } finally {
      setLoading(false);
      isExecutingRef.current = false;
    }
  };

  // Switch headline option and auto update card
  const handleSelectHeadline = (opt: string, index: number) => {
    setSelectedHeadlineIndex(index);
    if (result) {
      setResult({
        ...result,
        headline: opt,
        formattedHeadline: opt,
      });
    }
    onChange({
      headline: opt,
      formattedHeadline: opt,
    });
  };

  // Generate AI Photo based on headline
  const handleGenerateAiPhoto = async () => {
    if (!result?.headline) return;
    setGeneratingAiPhoto(true);
    try {
      const res = await fetch(getApiUrl('/api/generate-ai-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: result.headline,
          customPrompt: aiPhotoPrompt.trim() || undefined,
          aspectRatio: card.aspectRatio || '4:5',
          aiProvider,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedAiImageUrl(data.imageUrl);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingAiPhoto(false);
    }
  };

  // Apply to Card and go to Step 3
  const handleApplyToCard = () => {
    if (!result) return;

    let finalMainImage = card.images.main;
    if (generatedAiImageUrl) {
      finalMainImage = generatedAiImageUrl;
    } else if (useWebsitePhoto && result.pickedImages?.main) {
      finalMainImage = result.pickedImages.main;
    }

    const updates: Partial<NewsCardData> = {
      headline: result.headline,
      formattedHeadline: result.formattedHeadline || result.headline,
      highlightWords: result.highlightWords || [],
      location: result.location || card.location,
      summary: result.summary || card.summary,
      images: {
        ...card.images,
        main: finalMainImage,
        second: result.pickedImages?.second || card.images.second,
      },
      showAiGenerated: !!generatedAiImageUrl || !!result.isAiGeneratedPhoto,
    };

    onChange(updates);
    onNextStep();
  };

  return (
    <div className="space-y-3">
      {/* AI Card Official Information Banner */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-start gap-2.5 text-blue-200">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-black text-amber-400">AI कार्ड: </span>
          <span>AI कार्ड आपके न्यूज चैनल के लिए सौ प्रतिशत सटीक अनुपात में ग्राफिक तैयार करके देता है। (ग्राफिक साइज: <strong>4:5</strong>)</span>
        </div>
      </div>

      {/* AI Model (Gemini vs ChatGPT) & Cloud Setting Header - Only for Admin / SuperAdmin */}
      {isAdminOrSuperAdmin && (
        <div className="flex items-center justify-between bg-neutral-950 p-2 sm:p-2.5 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400">AI मॉडल:</span>
            <div className="inline-flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-700/80">
              <button
                type="button"
                onClick={() => {
                  setAiProvider('gemini');
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  aiProvider === 'gemini'
                    ? 'bg-yellow-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Gemini AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiProvider('openai');
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  aiProvider === 'openai'
                    ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>चैट जीपीटी (OpenAI)</span>
              </button>
            </div>
          </div>

          {onOpenCloudSettings && (
            <button
              type="button"
              onClick={onOpenCloudSettings}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/80 px-2 py-1 rounded-lg transition-all cursor-pointer"
              title="क्लाउड, ChatGPT API व कस्टम डोमेन सेटिंग्स"
            >
              <Server className="w-3 h-3" />
              <span className="hidden sm:inline">क्लाउड/API</span>
            </button>
          )}
        </div>
      )}

      {/* Direct News Session vs Normal Manual Workflow (Part I) */}
      {card.sourceNewsId ? (
        <div className="space-y-3">
          {loading && (
            <div className="bg-neutral-950 border border-blue-500/50 rounded-xl p-5 text-center space-y-3 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <h4 className="text-sm font-black text-white">खबर से स्वचालित AI हेडलाइन तैयार हो रही है...</h4>
              <p className="text-xs text-slate-400">कृपया प्रतीक्षा करें, खबर का विश्लेषण और आकर्षक हेडलाइन्स तैयार की जा रही हैं।</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/60 border border-red-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (autoFillNews) {
                      triggerProcessDirectly(autoFillNews.url || '', autoFillNews.fullNews || autoFillNews.summary || '', autoFillNews);
                    } else {
                      handleProcess();
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>पुनः प्रयास करें (Retry)</span>
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>डायरेक्ट खबर मोड:</strong> AI हेडलाइन विकल्प नीचे तैयार हैं</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tab Selector: Step 2A vs Step 2B */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('link');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>न्यूज़ लिंक से खबर बनाएँ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('command');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'command'
                  ? 'bg-yellow-400 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>रॉ न्यूज़ या स्क्रिप्ट से खबर बनाएँ</span>
            </button>
          </div>

          {/* Input Section */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 sm:p-4 space-y-3">
            {activeTab === 'link' ? (
              /* Step 2A: Link Input */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>वेबसाइट का न्यूज़ लिंक (URL) डालें:</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePasteClipboardToLink}
                      className="text-[11px] font-bold text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      title="क्लिपबोर्ड से लिंक पेस्ट करें"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>पेस्ट करें</span>
                    </button>
                    {linkUrl && (
                      <button
                        type="button"
                        onClick={() => setLinkUrl('')}
                        className="text-neutral-500 hover:text-red-400 p-0.5 rounded"
                        title="साफ़ करें"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://... कोई भी न्यूज़ वेबसाइट लिंक पेस्ट करें"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-blue-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-neutral-400 leading-snug">
                  💡 AI लिंक से सीधे ताज़ा समाचार, मुख्य शीर्षक व प्रेस फोटो पढ़कर कार्ड में सेट करेगा।
                </p>
              </div>
            ) : (
              /* Step 2B: Raw Script Input */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-yellow-400" />
                    <span>कच्चा समाचार / प्रेस नोट / स्क्रिप्ट लिखें या बोलें:</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <VoiceInputButton
                      onTranscript={(transcript) => {
                        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                        setError(null);
                      }}
                      title="बोलकर समाचार विवरण दर्ज करें"
                    />
                    <button
                      type="button"
                      onClick={handlePasteClipboardToInput}
                      className="text-[11px] font-bold text-yellow-300 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/40 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      title="क्लिपबोर्ड से टेक्स्ट पेस्ट करें"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>पेस्ट करें</span>
                    </button>
                    {inputText && (
                      <button
                        type="button"
                        onClick={() => setInputText('')}
                        className="text-neutral-500 hover:text-red-400 p-0.5 rounded"
                        title="साफ़ करें"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setError(null);
                  }}
                  placeholder="व्हाट्सएप मैसेज, प्रेस नोट, या अपनी कच्ची खबर यहाँ पेस्ट करें... उदा: शहडोल में छात्राओं ने कॉलेज सुविधाओं को लेकर पैदल मार्च निकाला।"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-yellow-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none font-['Noto_Sans_Devanagari'] leading-relaxed transition-colors"
                />
                <p className="text-[11px] text-neutral-400 leading-snug">
                  💡 व्हाट्सएप मैसेज या प्रेस नोट डालने पर AI स्वतः 2-3 लाइन की आकर्षक हेडलाइन तैयार करेगा।
                </p>
              </div>
            )}

            {/* Optional Custom Instructions / Prompt Box Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPromptBox(!showPromptBox)}
                className="text-[11px] font-bold text-neutral-400 hover:text-yellow-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{showPromptBox ? '▼' : '▶'} निर्देश / प्रॉम्प्ट बॉक्स (वैकल्पिक)</span>
              </button>

              {showPromptBox && (
                <div className="mt-2 p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 space-y-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">AI को विशेष निर्देश दें:</span>
                    <VoiceInputButton
                      onTranscript={(transcript) => {
                        setCustomPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
                      }}
                      title="बोलकर निर्देश दर्ज करें"
                    />
                  </div>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="उदा. मुख्य नेता पर फोकस करें, हेडलाइन शॉर्ट रखें..."
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Action Button: Generate */}
            <button
              type="button"
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 ${
                activeTab === 'link'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI खबर का विश्लेषण कर रहा है...</span>
                </>
              ) : activeTab === 'link' ? (
                <>
                  <LinkIcon className="w-4 h-4" />
                  <span>🔗 लिंक से AI हेडलाइन बनाएं</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ रॉ न्यूज़ से AI हेडलाइन बनाएं</span>
                </>
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleProcess}
                  className="px-2 py-0.5 rounded bg-red-800 text-white font-bold text-[10px] shrink-0 flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>पुनः प्रयास</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Result Section (Inline) */}
      {result && (
        <div className="bg-neutral-950 border-2 border-yellow-400/60 rounded-xl p-3.5 sm:p-4 space-y-3 animate-in fade-in shadow-xl">
          {/* Success banner confirming headline and photo ready + caption copied */}
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center justify-between gap-2 shadow">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="leading-tight">
                <strong>हेडलाइन, स्थान व फोटो कार्ड में सेट हो गए हैं!</strong> सोशल मीडिया कैप्शन क्लिपबोर्ड में कॉपी हो चुका है।
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCaption}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow"
              title="सोशल मीडिया कैप्शन कॉपी करें"
            >
              <Clipboard className="w-3 h-3" />
              <span>{captionCopied ? 'कॉपी हुआ!' : 'कैप्शन कॉपी'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-400" />
              <span>तैयार AI हेडलाइन ({headlineOptions.length || 5} विकल्प उपलब्ध)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-bold">
              📍 {result.location || card.location || 'मध्य प्रदेश'}
            </span>
          </div>

          {/* Headline Options */}
          {headlineOptions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-bold">5 हेडलाइन विकल्प (पसंदीदा पर क्लिक करें):</span>
              {headlineOptions.slice(0, 5).map((opt, idx) => {
                const isSelected = selectedHeadlineIndex === idx;
                const badgeLabel = `विकल्प ${idx + 1}`;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectHeadline(opt, idx)}
                    className={`p-2.5 rounded-lg border text-xs sm:text-sm font-bold font-['Noto_Sans_Devanagari'] cursor-pointer transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'bg-yellow-400/15 border-yellow-400 text-yellow-300 shadow-sm ring-1 ring-yellow-400/40'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 mt-0.5 whitespace-nowrap ${
                        isSelected ? 'bg-yellow-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {badgeLabel}
                    </span>
                    <span className="flex-1 leading-snug">{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Headline Direct Edit Box */}
          <div className="space-y-1 bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold">
              <span>हेडलाइन संपादित करें (Edit):</span>
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
                setResult((prev) => (prev ? { ...prev, headline: val, formattedHeadline: val } : null));
              }}
              className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white font-extrabold text-xs sm:text-sm font-['Noto_Sans_Devanagari'] focus:border-yellow-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Highlight words */}
          {result.highlightWords && result.highlightWords.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-neutral-400 text-[11px] font-bold">हाइलाइट:</span>
              {result.highlightWords.map((hw, idx) => (
                <span
                  key={idx}
                  className="bg-yellow-400 text-neutral-950 font-black px-2 py-0.5 rounded text-[11px]"
                >
                  {hw}
                </span>
              ))}
            </div>
          )}

          {/* AI Generated Social Media Caption with 3 Style Switchers */}
          <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-neutral-200">
                  सोशल मीडिया कैप्शन:
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCaption}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                  captionCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }`}
                title="सोशल मीडिया कैप्शन कॉपी करें"
              >
                {captionCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                <span>{captionCopied ? 'कैप्शन कॉपी हो गया!' : 'कैप्शन कॉपी'}</span>
              </button>
            </div>

            {/* 3 Caption Style Buttons */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => handleSwitchCaptionStyle('detailed')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  captionStyle === 'detailed'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                विस्तृत (3 पैराग्राफ)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCaptionStyle('bullets')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  captionStyle === 'bullets'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                बुलेट पॉइंट्स
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCaptionStyle('short')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  captionStyle === 'short'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                संक्षिप्त (2 पैराग्राफ)
              </button>
            </div>

            <textarea
              rows={5}
              value={result.summary || card.summary || ''}
              onChange={(e) => {
                const val = e.target.value;
                setResult((prev) => (prev ? { ...prev, summary: val } : null));
                onChange({ summary: val });
              }}
              placeholder="कैप्शन विवरण यहाँ आएगा..."
              className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg p-2.5 text-xs text-neutral-200 focus:border-blue-400 focus:outline-none font-['Noto_Sans_Devanagari'] leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="leading-tight">
                💡 {captionStyle === 'detailed' ? 'विस्तृत पैराग्राफ' : captionStyle === 'bullets' ? 'मुख्य बुलेट पॉइंट्स' : 'संक्षिप्त पैराग्राफ'} {card.socialHandle || currentUser?.username ? `+ #${card.socialHandle || currentUser?.username}` : ''}
              </span>
              {captionCopied && (
                <span className="text-emerald-400 font-bold animate-in fade-in">
                  ✓ कैप्शन कॉपी हो गया
                </span>
              )}
            </div>
          </div>

          {/* Website Photo Picked (if URL mode) */}
          {result.pickedImages?.main && (
            <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>वेबसाइट से प्राप्त फोटो:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !useWebsitePhoto;
                    setUseWebsitePhoto(nextVal);
                    if (nextVal) {
                      const photoToRestore = result?.pickedImages?.main || (card as any).extractedArticlePhotos?.[0] || '';
                      if (photoToRestore) {
                        onChange({
                          images: {
                            ...card.images,
                            main: photoToRestore,
                          },
                        });
                      }
                    } else {
                      onChange({
                        images: {
                          ...card.images,
                          main: '',
                        },
                      });
                    }
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded border cursor-pointer ${
                    useWebsitePhoto
                      ? 'bg-green-600/30 text-green-300 border-green-500'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {useWebsitePhoto ? 'फोटो शामिल करें (ON)' : 'हटाएं (OFF)'}
                </button>
              </div>
              {useWebsitePhoto && (
                <div className="flex items-center gap-2.5">
                  <img
                    src={result.pickedImages.main}
                    alt="Article"
                    className="w-16 h-12 object-cover rounded border border-neutral-700 shadow"
                  />
                  <span className="text-[11px] text-neutral-400 leading-tight">
                    यह फोटो आपके कार्ड के बैकग्राउंड में स्वतः सेट हो जाएगी।
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI Photo Generation Section with ON/OFF Control */}
          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI फोटो जनरेटर (AI Generated Photo):</span>
              </span>
              {generatedAiImageUrl && (
                <button
                  type="button"
                  onClick={() => setGeneratedAiImageUrl(null)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-red-400 cursor-pointer"
                >
                  हटाएं (OFF)
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>कैसी AI फोटो बनाना चाहते हैं? (ऐच्छिक प्रॉम्प्ट):</span>
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setAiPhotoPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                  title="बोलकर फोटो प्रॉम्प्ट बताएं"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiPhotoPrompt}
                  onChange={(e) => setAiPhotoPrompt(e.target.value)}
                  placeholder="उदा. संसद भवन के बाहर प्रेस कॉन्फ्रेंस, जलभराव..."
                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiPhoto}
                  disabled={generatingAiPhoto || !result.headline}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {generatingAiPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>बन रही है...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatedAiImageUrl ? 'दूसरी फोटो बनाएं' : '✨ AI फोटो बनाएं'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedAiImageUrl && (
              <div className="flex items-center gap-3 p-2 bg-neutral-950 rounded border border-amber-500/40">
                <img
                  src={generatedAiImageUrl}
                  alt="AI Generated"
                  className="w-16 h-16 object-cover rounded border border-neutral-700"
                />
                <div className="flex-1 text-[11px] text-neutral-300">
                  <span className="text-amber-400 font-bold">✅ AI फोटो तैयार है!</span>
                  <p className="text-neutral-400 text-[10px] mt-0.5">
                    यह फोटो कार्ड में मुख्य तस्वीर के रूप में उपयोग की जाएगी।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Apply and Go to Step 3 */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleApplyToCard}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>कार्ड में लागू करें और अगले स्टेप (फोटो) पर जाएं ➔</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentAbortControllerRef.current) {
                  currentAbortControllerRef.current.abort();
                  currentAbortControllerRef.current = null;
                }
                isExecutingRef.current = false;
                isResetRef.current = true;
                setLoading(false);
                setLinkUrl('');
                setInputText('');
                setCustomPrompt('');
                setResult(null);
                setHeadlineOptions([]);
                setSelectedHeadlineIndex(0);
                setGeneratedAiImageUrl(null);
                setError(null);
                setAiPhotoPrompt('');
                lastTriggerPayloadRef.current = '';
                try {
                  localStorage.removeItem('ai_tools_raw_url');
                  localStorage.removeItem('ai_tools_raw_news');
                  localStorage.removeItem('selected_raw_news_id');
                  localStorage.removeItem('ai_tools_generated_headlines');
                  localStorage.removeItem('studio_autofill_news_item');
                  localStorage.removeItem('studio_active_news_photos');
                } catch {}
                window.dispatchEvent(new CustomEvent('ai_news_studio_reset_request'));
              }}
              className="w-full py-2 text-neutral-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>नया लिंक या खबर डालने के लिए रीसेट करें</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
