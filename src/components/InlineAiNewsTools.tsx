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
import { getApiUrl, getAuthHeaders } from '../lib/apiConfig';
import { processNewsLocally } from '../lib/clientAiProcessor';
import { getTemplateHeadlineConfig } from '../lib/graphicTemplatesRegistry';
import { cleanHeadlineText, cleanLocationField, cleanCategoryField, generate5JournalisticHeadlines, generate5BalancedHeadlineOptions, generate4BalancedHeadlineOptions, calculateHeadlineSimilarity, cleanCaptionParagraphs, validateHeadlineOption, enrichHeadlineWithContext, fitHeadlinesTo5TierRanges } from '../lib/speakerUtils';
import { isUserAdmin, isUserSuperAdmin } from '../lib/userPlanManager';
import { ReporterUser } from './LoginModal';
import { scrapeNewsUrlClient } from '../lib/clientScraper';

export interface AutoFillNewsData {
  newsId?: string;
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

export function getActiveCaptionUsername(card?: NewsCardData, currentUser?: ReporterUser | null): string {
  if (card?.socialHandle && card.socialHandle.trim()) {
    const u = card.socialHandle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
    if (u) return u;
  }
  if (currentUser?.username && currentUser.username.trim()) {
    const u = currentUser.username.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
    if (u) return u;
  }
  if (typeof window !== 'undefined') {
    try {
      const channelProfile = localStorage.getItem('user_channel_profile');
      if (channelProfile) {
        const parsed = JSON.parse(channelProfile);
        const u = (parsed.channelUsername || parsed.username || parsed.channelName || '').toString().trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
        if (u) return u;
      }
    } catch {}
    try {
      const savedUser = localStorage.getItem('reporter_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const u = (parsed.username || parsed.name || '').toString().trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
        if (u) return u;
      }
    } catch {}
    try {
      const appUser = localStorage.getItem('app_user_username');
      if (appUser && appUser.trim()) {
        const u = appUser.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
        if (u) return u;
      }
    } catch {}
  }
  return '';
}

export const PERSISTED_AI_SESSION_KEY = 'ai_tools_persisted_session_v2';

export interface PersistedAiSession {
  result: AIAnalysisResult | null;
  headlineOptions: string[];
  selectedHeadlineIndex: number;
  linkUrl: string;
  inputText: string;
  customPrompt: string;
  activeTab: 'link' | 'command';
  canonicalContext: any;
  activeGeneratedProvider?: 'gemini' | 'openai' | null;
  generatedAiImageUrl?: string | null;
  timestamp?: number;
}

export function getSavedAiSession(): PersistedAiSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PERSISTED_AI_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.result || (Array.isArray(parsed.headlineOptions) && parsed.headlineOptions.length > 0))) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function saveAiSession(data: Partial<PersistedAiSession>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedAiSession() || {
      result: null,
      headlineOptions: [],
      selectedHeadlineIndex: 0,
      linkUrl: '',
      inputText: '',
      customPrompt: '',
      activeTab: 'link',
      canonicalContext: null,
    };
    const updated = { ...existing, ...data, timestamp: Date.now() };
    localStorage.setItem(PERSISTED_AI_SESSION_KEY, JSON.stringify(updated));
  } catch {}
}

export function cleanAiToolsMemory(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'ai_news_canonical_context',
      'ai_tools_raw_url',
      'ai_tools_raw_news',
      'selected_raw_news_id',
      'ai_tools_generated_headlines',
      'studio_autofill_news_item',
      'studio_active_news_photos',
      'app_default_thumbnail_news_ids_v1',
      'ai_tools_memory',
      'ai_tools_cache_v1',
      'ai_tools_history',
      PERSISTED_AI_SESSION_KEY,
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    try {
      sessionStorage.removeItem('ai_news_auto_triggered_keys');
    } catch {}
  } catch {}
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
  const userPlan = (currentUser?.package || currentUser?.role || currentUser?.tier || 'basic').toLowerCase().trim();
  const isVipDeskUser = Boolean(
    isAdminOrSuperAdmin ||
    ['ultra', 'vip_dash', 'vip-dash', 'vip', 'vip_desk', 'vip desk'].includes(userPlan) ||
    ((currentUser as any)?.planName && String((currentUser as any).planName).toUpperCase().includes('VIP'))
  );
  const canUseOpenAi = ['pro', 'professional', 'vip_dash', 'vip-dash', 'ultra', 'vip desk', 'admin', 'superadmin'].includes(userPlan) || isAdminOrSuperAdmin;

  // Restore previous session from localStorage so headlines are preserved across view/tab changes
  const [activeTab, setActiveTab] = useState<'link' | 'command'>(() => {
    const s = getSavedAiSession();
    if (s?.activeTab) return s.activeTab;
    return autoFillNews?.url ? 'link' : 'link';
  });
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [activeGeneratedProvider, setActiveGeneratedProvider] = useState<'gemini' | 'openai' | null>(() => {
    return getSavedAiSession()?.activeGeneratedProvider || null;
  });
  const [linkUrl, setLinkUrl] = useState<string>(() => {
    const s = getSavedAiSession();
    return s?.linkUrl || autoFillNews?.url || card.websiteUrl || '';
  });
  const [inputText, setInputText] = useState<string>(() => {
    const s = getSavedAiSession();
    return s?.inputText || '';
  });
  const [customPrompt, setCustomPrompt] = useState<string>(() => {
    const s = getSavedAiSession();
    return s?.customPrompt || '';
  });
  const [showPromptBox, setShowPromptBox] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Result state - automatically restored from persistent session across tab switches!
  const [result, setResult] = useState<AIAnalysisResult | null>(() => {
    const s = getSavedAiSession();
    if (s?.result) return s.result;
    if (card.headline && card.headline.trim()) {
      return {
        headline: cleanHeadlineText(card.headline),
        headlineOptions: [cleanHeadlineText(card.headline)],
        formattedHeadline: cleanHeadlineText(card.headline),
        highlightWords: card.highlightWords || [],
        location: card.location || '',
        category: card.category || '',
        summary: card.summary || '',
      };
    }
    return null;
  });

  const [headlineOptions, setHeadlineOptions] = useState<string[]>(() => {
    const s = getSavedAiSession();
    if (s?.headlineOptions && s.headlineOptions.length > 0) {
      return s.headlineOptions;
    }
    if (card.headline && card.headline.trim()) {
      return [cleanHeadlineText(card.headline)];
    }
    return [];
  });

  const [selectedHeadlineIndex, setSelectedHeadlineIndex] = useState<number>(() => {
    const s = getSavedAiSession();
    return typeof s?.selectedHeadlineIndex === 'number' ? s.selectedHeadlineIndex : 0;
  });

  const [useWebsitePhoto, setUseWebsitePhoto] = useState<boolean>(true);
  const [canonicalContext, setCanonicalContext] = useState<any>(() => {
    return getSavedAiSession()?.canonicalContext || null;
  });
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenSuccessMsg, setRegenSuccessMsg] = useState<string | null>(null);

  // AI Photo state inside result
  const [generatingAiPhoto, setGeneratingAiPhoto] = useState<boolean>(false);
  const [generatedAiImageUrl, setGeneratedAiImageUrl] = useState<string | null>(() => {
    return getSavedAiSession()?.generatedAiImageUrl || null;
  });
  const [aiPhotoPrompt, setAiPhotoPrompt] = useState<string>('');
  const [captionCopied, setCaptionCopied] = useState<boolean>(false);

  // 3 Caption Styles: detailed (3 paragraphs), bullets (bullet points), short (2 paragraphs)
  const [captionStyle, setCaptionStyle] = useState<'detailed' | 'bullets' | 'short'>('detailed');
  const isAutomatedEntry = Boolean(
    card.sourceNewsId ||
    (autoFillNews && (autoFillNews.newsId || autoFillNews.autoTrigger))
  );
  const [isManualInputMode, setIsManualInputMode] = useState<boolean>(false);
  const isExecutingRef = React.useRef<boolean>(false);
  const activeRequestIdRef = React.useRef<number>(0);
  const activeNewsIdRef = React.useRef<string>('');
  const lastTriggerPayloadRef = React.useRef<string>('');
  const currentAbortControllerRef = React.useRef<AbortController | null>(null);
  const isResetRef = React.useRef<boolean>(false);

  // Synchronize state changes to localStorage so navigation across tabs preserves generated headlines
  useEffect(() => {
    if (result || headlineOptions.length > 0 || linkUrl || inputText) {
      saveAiSession({
        result,
        headlineOptions,
        selectedHeadlineIndex,
        linkUrl,
        inputText,
        customPrompt,
        activeTab,
        canonicalContext,
        activeGeneratedProvider,
        generatedAiImageUrl,
      });
    }
  }, [
    result,
    headlineOptions,
    selectedHeadlineIndex,
    linkUrl,
    inputText,
    customPrompt,
    activeTab,
    canonicalContext,
    activeGeneratedProvider,
    generatedAiImageUrl,
  ]);

  // Listen for studio reset / refresh event from App.tsx - ONLY clears when user explicitly clicks Refresh / Reset button!
  useEffect(() => {
    const handleStudioReset = () => {
      cleanAiToolsMemory();
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }
      isExecutingRef.current = false;
      isResetRef.current = true;
      activeNewsIdRef.current = '';
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
    };
    window.addEventListener('ai_news_studio_reset', handleStudioReset);
    return () => window.removeEventListener('ai_news_studio_reset', handleStudioReset);
  }, []);

  // Auto-detect available AI providers on mount (seamless failover to OpenAI if available)
  useEffect(() => {
    fetch(getApiUrl('/api/ai-providers-status'))
      .then((res) => (res.ok ? res.json() : null))
      .then((status) => {
        if (status?.openaiAvailable && !status?.geminiAvailable && canUseOpenAi) {
          setAiProvider('openai');
        }
      })
      .catch(() => {});
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

  const buildFiveStoryOptions = (
    existing: string[],
    baseH: string = '',
    _summaryText: string = '',
    _locationText: string = '',
    _sourceTitle: string = ''
  ): string[] => {
    const combined: string[] = [];
    if (existing && Array.isArray(existing)) {
      for (const h of existing) {
        const clean = cleanHeadlineText(h).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
        if (clean && !combined.includes(clean)) {
          combined.push(clean);
        }
      }
    }
    if (combined.length === 0 && baseH) {
      combined.push(cleanHeadlineText(baseH).replace(/[।\.\,\!\?\:\-]+$/g, '').trim());
    }
    return combined.slice(0, 5);
  };


  // Structured caption formatter (Strictly zero URLs across all modes)
  const formatCaptionByStyle = (
    style: 'detailed' | 'bullets' | 'short',
    headline: string,
    location: string,
    baseSummary: string,
    currentRes?: AIAnalysisResult | null,
    _sourceUrl?: string
  ): string => {
    const loc = location || 'मध्य प्रदेश';
    const cleanUser = getActiveCaptionUsername(card, currentUser);
    const mode = style === 'short' ? 'short' : style === 'bullets' ? 'bullet' : 'detailed';

    let rawSource = '';
    if (currentRes) {
      if (style === 'detailed' && currentRes.captionDetailed) rawSource = currentRes.captionDetailed;
      else if (style === 'bullets' && currentRes.captionBullets) rawSource = currentRes.captionBullets;
      else if (style === 'short' && currentRes.captionShort) rawSource = currentRes.captionShort;
      else if (currentRes.summary) rawSource = currentRes.summary;
    }
    if (!rawSource) {
      rawSource = baseSummary || headline;
    }

    return cleanCaptionParagraphs(rawSource, mode, cleanUser, loc, headline);
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
  const lastTriggeredNewsKeyRef = React.useRef<string>('');

  // Automation: When autoFillNews is supplied, paste into Step 2A and auto-trigger ONLY ONCE
  // Does NOT re-trigger when returning to Studio from other tabs (Videos, Newsroom, Control Room)
  React.useEffect(() => {
    if (!autoFillNews) return;
    const triggerKey = `${autoFillNews.newsId || ''}_${autoFillNews.timestamp || ''}_${autoFillNews.url || ''}_${autoFillNews.title || ''}`;
    
    let processedKeys: string[] = [];
    try {
      processedKeys = JSON.parse(sessionStorage.getItem('ai_news_auto_triggered_keys') || '[]');
    } catch {}

    const isAlreadyTriggered = processedKeys.includes(triggerKey);

    if (lastTriggeredNewsKeyRef.current === triggerKey) return;
    lastTriggeredNewsKeyRef.current = triggerKey;
    if (autoFillNews.timestamp) {
      lastProcessedTimeRef.current = autoFillNews.timestamp;
    }

    const currentNewsId = autoFillNews.newsId || autoFillNews.url || autoFillNews.title || '';
    if (activeNewsIdRef.current && currentNewsId && activeNewsIdRef.current !== currentNewsId) {
      if (currentAbortControllerRef.current) {
        try {
          currentAbortControllerRef.current.abort();
        } catch {}
        currentAbortControllerRef.current = null;
      }
      activeRequestIdRef.current++;
      setError(null);
      setCaptionCopied(false);
      lastTriggerPayloadRef.current = '';
    }
    activeNewsIdRef.current = currentNewsId;

    const rawUrl = autoFillNews.url ? autoFillNews.url.trim() : '';
    const hasValidUrl = Boolean(
      rawUrl &&
      /^https?:\/\//i.test(rawUrl) &&
      !rawUrl.includes('localhost') &&
      !rawUrl.includes('127.0.0.1')
    );
    const effectiveTargetUrl = hasValidUrl ? normalizeInputUrl(rawUrl) : (rawUrl.startsWith('http') ? rawUrl : '');
    const rawContent = autoFillNews.fullNews || autoFillNews.summary || autoFillNews.title || '';
    
    if (effectiveTargetUrl) {
      setActiveTab('link');
      setLinkUrl(effectiveTargetUrl);
    } else {
      setActiveTab('command');
      setLinkUrl('');
    }
    
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

    // Only auto-trigger once per triggerKey. If already triggered or if headlines already exist for this session, DO NOT re-trigger!
    if (autoFillNews.autoTrigger && !isAlreadyTriggered) {
      try {
        processedKeys.push(triggerKey);
        sessionStorage.setItem('ai_news_auto_triggered_keys', JSON.stringify(processedKeys.slice(-20)));
      } catch {}
      autoFillNews.autoTrigger = false;
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
    if (lastTriggerPayloadRef.current === payloadKey && isExecutingRef.current) {
      return;
    }
    const requestId = ++activeRequestIdRef.current;
    if (currentAbortControllerRef.current) {
      try {
        currentAbortControllerRef.current.abort();
      } catch {}
      currentAbortControllerRef.current = null;
    }
    isExecutingRef.current = true;
    lastTriggerPayloadRef.current = payloadKey;
    if (extraData?.timestamp) {
      lastProcessedTimeRef.current = extraData.timestamp;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setHeadlineOptions([]);
    setSelectedHeadlineIndex(0);
    setGeneratedAiImageUrl(null);

    const tplConfig = getTemplateHeadlineConfig(card.frameDesign);
    const targetMaxLines = tplConfig.headline_max_lines;

    try {

      const controller = new AbortController();
      currentAbortControllerRef.current = controller;
      isResetRef.current = false;
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          input: effectiveText || extraData?.title || undefined,
          linkUrl: effectiveLink || undefined,
          imageUrl: extraData?.imageUrl || card.images.main || undefined,
          customPrompt: customPrompt.trim() || undefined,
          aiProvider,
          userTier: userPlan,
          email: currentUser?.email,
          userId: currentUser?.userId || currentUser?.uid,
          channelUsername: getActiveCaptionUsername(card, currentUser),
          template_id: tplConfig.template_id,
          headline_line_count: targetMaxLines,
          headline_max_lines: targetMaxLines,
          headline_area: tplConfig.headline_area,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (
        isResetRef.current ||
        activeRequestIdRef.current !== requestId
      ) {
        return;
      }

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const rawText = await response.text().catch(() => '');
        try { data = JSON.parse(rawText); } catch { data = null; }
      }
      if (!response.ok || !data || !data.success) {
        throw new Error(data?.error || 'सर्वर से विश्लेषण में त्रुटि');
      }

      const res: AIAnalysisResult = data.data;
      if (res.headline) res.headline = cleanHeadlineText(res.headline);
      if (res.formattedHeadline) res.formattedHeadline = cleanHeadlineText(res.formattedHeadline);
      if (res.location) res.location = cleanLocationField(res.location);
      if (res.category) res.category = cleanCategoryField(res.category);
      setResult(res);
      setActiveGeneratedProvider((data.data?.actualProvider as ('gemini' | 'openai')) || aiProvider);
      if (res.canonicalContext) {
        setCanonicalContext(res.canonicalContext);
        try {
          localStorage.setItem('ai_news_canonical_context', JSON.stringify(res.canonicalContext));
        } catch {}
      } else {
        const derivedCtx = {
          sourceUrl: linkUrl || extraData?.url || '',
          title: res.headline || extraData?.title || '',
          articleText: extraData?.fullNews || extraData?.summary || inputText || '',
          mainEvent: res.headline || '',
          location: res.location || '',
          category: res.category || '',
          extractedAt: new Date().toISOString(),
        };
        setCanonicalContext(derivedCtx);
        try {
          localStorage.setItem('ai_news_canonical_context', JSON.stringify(derivedCtx));
        } catch {}
      }

      let opts: string[] = [];
      if (Array.isArray(res.headlineOptions) && res.headlineOptions.length > 0) {
        res.headlineOptions.forEach((h: string) => {
          const cleanH = cleanHeadlineText(h);
          if (cleanH && !opts.includes(cleanH)) opts.push(cleanH);
        });
      }
      if (res.headline) {
        const cleanMain = cleanHeadlineText(res.headline);
        if (cleanMain && !opts.includes(cleanMain)) {
          if (!opts.some((o) => calculateHeadlineSimilarity(o, cleanMain) >= 0.65)) {
            opts.unshift(cleanMain);
          }
        }
      }

      if (opts.length === 0 && res.headline) {
        opts.push(cleanHeadlineText(res.headline));
      }

      if (isVipDeskUser) {
        if (opts.length < 5) {
          const baseTitle = cleanHeadlineText(opts[0] || res.headline || extraData?.title || 'ताज़ा समाचार');
          const sourceText = extraData?.fullNews || extraData?.summary || res.summary || '';
          const sourceLoc = cleanLocationField(res.location || extraData?.location || '');
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
      } else {
        setHeadlineOptions(opts.slice(0, 1));
      }
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!res.pickedImages?.main || !!extraData?.imageUrl);

      // Selected headline for graphic: Option 1 directly from AI
      const finalHeadline = cleanHeadlineText(opts[0] || res.headline || '');
      const finalLoc = cleanLocationField(res.location || extraData?.location || '');
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
        extraData?.summary || res.summary || '',
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
      setLoading(false);
      isExecutingRef.current = false;
    } catch (err: any) {
      if (
        isResetRef.current ||
        activeRequestIdRef.current !== requestId ||
        (extraData?.newsId && activeNewsIdRef.current && extraData.newsId !== activeNewsIdRef.current)
      ) {
        setLoading(false);
        isExecutingRef.current = false;
        return;
      }
      if (aiProvider === 'openai') {
        setError(err.message || 'चैट जीपीटी (OpenAI) से विश्लेषण विफल रहा। कृपया API कुंजी या नेटवर्क की जाँच करें।');
        setLoading(false);
        isExecutingRef.current = false;
        return;
      }
      console.warn('API error, executing client AI fallback:', err);
      let fallbackText = effectiveText || extraData?.title || '';
      let fallbackImages: string[] = extraData?.additionalPhotos || (extraData?.imageUrl ? [extraData.imageUrl] : []);

      // If URL was provided, attempt client-side edge scraping so real news facts and photos are used
      if (effectiveLink && (!fallbackText || fallbackText.length < 25)) {
        try {
          const scraped = await scrapeNewsUrlClient(effectiveLink, 16000);
          if (scraped) {
            fallbackText = scraped.title ? `Title: ${scraped.title}\n\n${scraped.content}` : scraped.content;
            if (scraped.images && scraped.images.length > 0) {
              fallbackImages = scraped.images;
            }
          }
        } catch (scrapeErr) {
          console.warn('Client scrape fallback error in triggerProcessDirectly:', scrapeErr);
        }
      }

      if (effectiveLink && (!fallbackText || fallbackText.length < 15 || !/[\u0900-\u097F]/.test(fallbackText))) {
        setError('इस न्यूज़ लिंक से मुख्य खबर स्वतः नहीं पढ़ी जा सकी (वेबसाइट सुरक्षा के कारण)। कृपया खबर का शीर्षक/टेक्स्ट बॉक्स में सीधे पेस्ट करें।');
        setLoading(false);
        isExecutingRef.current = false;
        return;
      }

      const fallbackResult = processNewsLocally(
        fallbackText || effectiveLink,
        effectiveLink || undefined,
        tplConfig,
        getActiveCaptionUsername(card, currentUser)
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
        if (cleanMain && !opts.includes(cleanMain)) {
          if (!opts.some((o) => calculateHeadlineSimilarity(o, cleanMain) >= 0.65)) {
            opts.push(cleanMain);
          }
        }
      }

      const finalOpts = buildFiveStoryOptions(
        opts,
        cleanHeadlineText(opts[0] || fallbackResult.headline || ''),
        extraData?.summary || fallbackResult.summary || '',
        fallbackResult.location || extraData?.location || '',
        extraData?.title || ''
      );

      setResult(fallbackResult);
      if (fallbackResult.canonicalContext) {
        setCanonicalContext(fallbackResult.canonicalContext);
        try {
          localStorage.setItem('ai_news_canonical_context', JSON.stringify(fallbackResult.canonicalContext));
        } catch {}
      }
      setHeadlineOptions(finalOpts.slice(0, 5));
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!fallbackImages[0] || !!extraData?.imageUrl);

      const finalHeadline = cleanHeadlineText(finalOpts[0] || fallbackResult.headline || '');
      const finalLoc = cleanLocationField(fallbackResult.location || extraData?.location || '');
      const finalImage = (fallbackImages[0] && !fallbackImages[0].includes('placeholder'))
        ? fallbackImages[0]
        : (card.images.main || extraData?.imageUrl || '');

      const effectiveCaption = formatCaptionByStyle(
        captionStyle,
        finalHeadline,
        finalLoc,
        extraData?.summary || fallbackResult.summary || '',
        fallbackResult,
        effectiveLink || url
      );

      const finalSecond = fallbackImages[1] || extraData?.additionalPhotos?.[1] || card.images.second || finalImage;
      const finalThird = fallbackImages[2] || extraData?.additionalPhotos?.[2] || card.images.third || finalImage;
      const finalFourth = fallbackImages[3] || extraData?.additionalPhotos?.[3] || card.images.fourth || finalImage;

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
        extractedArticlePhotos: fallbackImages.length > 0 ? fallbackImages : card.extractedArticlePhotos,
      });

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(effectiveCaption).catch(() => {});
      }
    } finally {
      setLoading(false);
      isExecutingRef.current = false;
    }
  };

  // Main AI Process with optional provider override
  const handleProcess = async (providerOverride?: 'gemini' | 'openai') => {
    if (isExecutingRef.current) return;
    const effectiveProvider = providerOverride || aiProvider;
    if (effectiveProvider === 'openai' && !canUseOpenAi) {
      setError('यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।');
      return;
    }

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

    const requestId = ++activeRequestIdRef.current;
    if (currentAbortControllerRef.current) {
      try {
        currentAbortControllerRef.current.abort();
      } catch {}
      currentAbortControllerRef.current = null;
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
      currentAbortControllerRef.current = controller;
      isResetRef.current = false;
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          input: effectiveText || undefined,
          linkUrl: effectiveLink || undefined,
          customPrompt: customPrompt.trim() || undefined,
          aiProvider: effectiveProvider,
          userTier: userPlan,
          email: currentUser?.email,
          userId: currentUser?.userId || currentUser?.uid,
          channelUsername: card.socialHandle || currentUser?.username || undefined,
          template_id: tplConfig.template_id,
          headline_line_count: targetMaxLines,
          headline_max_lines: targetMaxLines,
          headline_area: tplConfig.headline_area,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (isResetRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const rawText = await response.text().catch(() => '');
        try { data = JSON.parse(rawText); } catch { data = null; }
      }
      if (!response.ok || !data || !data.success) {
        throw new Error(data?.error || 'सर्वर से विश्लेषण में त्रुटि');
      }

      const res: AIAnalysisResult = data.data;
      if (res.headline) res.headline = cleanHeadlineText(res.headline);
      if (res.formattedHeadline) res.formattedHeadline = cleanHeadlineText(res.formattedHeadline);
      setResult(res);
      setActiveGeneratedProvider((data.data?.actualProvider as ('gemini' | 'openai')) || effectiveProvider);

      let rawOpts: string[] = [];
      if (Array.isArray(res.headlineOptions) && res.headlineOptions.length > 0) {
        res.headlineOptions.forEach((h: string) => {
          const cleanH = cleanHeadlineText(h);
          if (cleanH && !rawOpts.includes(cleanH)) rawOpts.push(cleanH);
        });
      }
      if (res.headline) {
        const cleanMain = cleanHeadlineText(res.headline);
        if (cleanMain && !rawOpts.includes(cleanMain)) {
          if (!rawOpts.some((o) => calculateHeadlineSimilarity(o, cleanMain) >= 0.65)) {
            rawOpts.unshift(cleanMain);
          }
        }
      }
      if (rawOpts.length === 0 && res.headline) {
        rawOpts.push(cleanHeadlineText(res.headline));
      }

      if (isVipDeskUser) {
        if (rawOpts.length < 5) {
          const baseTitle = cleanHeadlineText(rawOpts[0] || res.headline || 'ताज़ा समाचार');
          const sourceText = res.summary || inputText || '';
          const sourceLoc = cleanLocationField(res.location || '');
          const factSentences = (sourceText || baseTitle)
            .split(/[।\n]+|\.\s+/)
            .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
            .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));

          const supp = generate5BalancedHeadlineOptions(baseTitle, factSentences, sourceLoc);
          const fitted = fitHeadlinesTo5TierRanges(supp, factSentences, baseTitle, sourceLoc);
          fitted.forEach((h) => {
            if (rawOpts.length < 5 && !rawOpts.includes(h)) rawOpts.push(h);
          });
        }
        setHeadlineOptions(rawOpts.slice(0, 5));
      } else {
        setHeadlineOptions(rawOpts.slice(0, 1));
      }
      setSelectedHeadlineIndex(0);
      setUseWebsitePhoto(!!res.pickedImages?.main);

      const finalHeadline = cleanHeadlineText(rawOpts[0] || res.headline || '');
      const finalLoc = cleanLocationField(res.location || '');
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
      if (isResetRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }
      if (effectiveProvider === 'openai') {
        setError(err.message || 'चैट जीपीटी (OpenAI) से विश्लेषण विफल रहा। कृपया API कुंजी या नेटवर्क की जाँच करें।');
        setLoading(false);
        return;
      }
      console.warn('API error, executing client AI fallback:', err);
      try {
        let fallbackText = effectiveText;
        let scrapedPhotos: string[] = [];

        // If URL was provided, attempt client-side edge scraping so real news facts and photos are used
        if (effectiveLink && (!fallbackText || fallbackText.length < 25)) {
          try {
            const scraped = await scrapeNewsUrlClient(effectiveLink, 16000);
            if (scraped) {
              fallbackText = scraped.title ? `Title: ${scraped.title}\n\n${scraped.content}` : scraped.content;
              if (scraped.images && scraped.images.length > 0) {
                scrapedPhotos = scraped.images;
              }
            }
          } catch (scrapeErr) {
            console.warn('Client scrape fallback error in handleProcess:', scrapeErr);
          }
        }

        if (effectiveLink && (!fallbackText || fallbackText.length < 15 || !/[\u0900-\u097F]/.test(fallbackText))) {
          setError('इस न्यूज़ लिंक से मुख्य खबर स्वतः नहीं पढ़ी जा सकी (वेबसाइट सुरक्षा के कारण)। कृपया खबर का शीर्षक/टेक्स्ट बॉक्स में सीधे पेस्ट करें।');
          setLoading(false);
          isExecutingRef.current = false;
          return;
        }

        const fallbackResult = processNewsLocally(
          fallbackText || effectiveLink,
          effectiveLink || undefined,
          tplConfig,
          card.socialHandle || currentUser?.username
        );

        const rawOpts: string[] = [];
        if (Array.isArray(fallbackResult.headlineOptions) && fallbackResult.headlineOptions.length > 0) {
          fallbackResult.headlineOptions.forEach((h: string) => {
            const cleanH = cleanHeadlineText(h);
            if (cleanH && !rawOpts.includes(cleanH)) rawOpts.push(cleanH);
          });
        }
        const originalTitleToExclude = card.originalHeadline || autoFillNews?.title || '';
        const finalOpts = buildFiveStoryOptions(
          rawOpts,
          cleanHeadlineText(rawOpts[0] || fallbackResult.headline || ''),
          fallbackResult.summary || '',
          fallbackResult.location || '',
          originalTitleToExclude
        );

        setResult(fallbackResult);
        if (fallbackResult.canonicalContext) {
          setCanonicalContext(fallbackResult.canonicalContext);
          try {
            localStorage.setItem('ai_news_canonical_context', JSON.stringify(fallbackResult.canonicalContext));
          } catch {}
        }
        setHeadlineOptions(finalOpts.slice(0, 5));
        setSelectedHeadlineIndex(0);
        setUseWebsitePhoto(scrapedPhotos.length > 0);

        const finalHeadline = cleanHeadlineText(finalOpts[0] || fallbackResult.headline || '');
        const finalLoc = cleanLocationField(fallbackResult.location || '');
        const finalImage = scrapedPhotos[0] || card.images.main;
        const finalSecond = scrapedPhotos[1] || card.images.second || finalImage;
        const finalThird = scrapedPhotos[2] || card.images.third || finalImage;
        const finalFourth = scrapedPhotos[3] || card.images.fourth || finalImage;

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
          images: {
            ...card.images,
            main: finalImage,
            second: finalSecond,
            third: finalThird,
            fourth: finalFourth,
          },
          extractedArticlePhotos: scrapedPhotos.length > 0 ? scrapedPhotos : card.extractedArticlePhotos,
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

  // Explicitly generate with selected AI provider (Gemini or ChatGPT)
  const handleGenerateWithProvider = async (provider: 'gemini' | 'openai') => {
    if (provider === 'openai' && !canUseOpenAi) {
      setError('यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।');
      return;
    }
    setAiProvider(provider);
    await handleProcess(provider);
  };

  // Switch headline option and auto update card
  const handleSelectHeadline = (opt: string, index: number) => {
    setSelectedHeadlineIndex(index);
    const cleanOpt = cleanHeadlineText(opt);
    let formatted = cleanOpt;
    const highlightWords = result?.highlightWords || [];
    if (highlightWords.length > 0) {
      for (const hw of highlightWords) {
        if (formatted.includes(hw)) {
          formatted = formatted.replace(new RegExp(`(${hw})`, 'g'), '[yellow]$1[/yellow]');
          break;
        }
      }
    }
    const updatedCaption = formatCaptionByStyle(
      captionStyle,
      cleanOpt,
      result?.location || card.location || '',
      result?.summary || card.summary || '',
      result || undefined,
      linkUrl
    );
    if (result) {
      setResult({
        ...result,
        headline: cleanOpt,
        formattedHeadline: formatted,
        summary: updatedCaption,
      });
    }
    onChange({
      headline: cleanOpt,
      formattedHeadline: formatted,
      summary: updatedCaption,
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(updatedCaption).catch(() => {});
    }
  };

  // Regenerate 5 brand new headline options from the same canonical news context
  const handleRegenerateHeadlines = async () => {
    if (isRegenerating || loading) return;
    if (!isVipDeskUser) {
      setError('यह सुविधा केवल पात्र VIP Desk उपयोगकर्ताओं के लिए उपलब्ध है।');
      return;
    }
    if (aiProvider === 'openai' && !canUseOpenAi) {
      setError('यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।');
      return;
    }
    setIsRegenerating(true);
    setError(null);
    setRegenSuccessMsg(null);

    const activeCtx = canonicalContext || result?.canonicalContext || {
      sourceUrl: linkUrl || card.sourceUrl || '',
      title: result?.headline || card.headline || '',
      articleText: inputText || result?.summary || card.summary || '',
      location: result?.location || card.location || '',
      category: result?.category || card.category || '',
    };

    try {
      const payload = {
        canonicalContext: activeCtx,
        sourceHeadline: result?.headline || card.headline || '',
        summary: inputText || result?.summary || card.summary || '',
        location: result?.location || card.location || '',
        previousHeadlines: headlineOptions,
        template_id: card.templateId || 'graphic_001',
        channelUsername: card.socialHandle || currentUser?.username || '',
        userTier: userPlan || currentUser?.tier || 'pro',
        email: currentUser?.email || 'admin.ainewsmaker@gmail.com',
        userId: currentUser?.userId || currentUser?.uid || 'reporter-admin-01',
        aiProvider,
        customPrompt,
      };

      let data: any = null;
      try {
        const res = await fetch(getApiUrl('/api/regenerate-headlines'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json().catch(() => null);
        } else {
          const rawText = await res.text().catch(() => '');
          try {
            data = JSON.parse(rawText);
          } catch {
            data = null;
          }
        }
      } catch (fetchErr) {
        console.warn('Network or endpoint fetch error in regenerate-headlines:', fetchErr);
        data = null;
      }

      let newOptions: string[] = [];
      if (data && data.success && Array.isArray(data.headlineOptions) && data.headlineOptions.length > 0) {
        newOptions = data.headlineOptions.map((h: string) => cleanHeadlineText(h)).filter(Boolean).slice(0, 5);
      } else if (data && data.success && Array.isArray(data.headlines) && data.headlines.length > 0) {
        newOptions = data.headlines.map((h: string) => cleanHeadlineText(h)).filter(Boolean).slice(0, 5);
      } else if (data && data.success && Array.isArray(data.options) && data.options.length > 0) {
        newOptions = data.options.map((h: string) => cleanHeadlineText(h)).filter(Boolean).slice(0, 5);
      }

      // If backend was unreachable, returned HTML (404/502), or failed, execute resilient client-side 5-tier generator
      if (newOptions.length === 0) {
        const sourceTitle = cleanHeadlineText(activeCtx.title || result?.headline || card.headline || 'ताज़ा समाचार');
        const sourceText = activeCtx.articleText || inputText || result?.summary || card.summary || '';
        const sourceLoc = cleanLocationField(activeCtx.location || result?.location || card.location || '');
        const articleSentences = (sourceText || sourceTitle)
          .split(/[।\n]+|\.\s+/)
          .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
          .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));

        const generated = generate5BalancedHeadlineOptions(sourceTitle, articleSentences, sourceLoc);
        const fitted = fitHeadlinesTo5TierRanges(generated, articleSentences, sourceTitle, sourceLoc);
        newOptions = fitted.filter((h) => !headlineOptions.includes(h)).slice(0, 5);
        if (newOptions.length < 5) {
          fitted.forEach((h) => {
            if (newOptions.length < 5 && !newOptions.includes(h)) newOptions.push(h);
          });
        }
        if (newOptions.length === 0) {
          newOptions = generated.slice(0, 5);
        }
      }

      if (newOptions.length > 0) {
        setHeadlineOptions(newOptions);
        setSelectedHeadlineIndex(0);
        const topH = newOptions[0];
        setResult((prev) =>
          prev
            ? {
                ...prev,
                headline: topH,
                formattedHeadline: topH,
                headlineOptions: newOptions,
                canonicalContext: (data && data.canonicalContext) || activeCtx,
              }
            : null
        );
        if (data && data.actualProvider) {
          setActiveGeneratedProvider(data.actualProvider);
        }
        onChange({ headline: topH, formattedHeadline: topH });
        setRegenSuccessMsg('5 नए संतुलित हेडलाइन विकल्प सफलतापूर्वक तैयार किए गए!');
        setTimeout(() => setRegenSuccessMsg(null), 3500);
      } else {
        setError('हेडलाइन्स के नए विकल्प तैयार नहीं हो सके। कृपया समाचार टेक्स्ट जांचें।');
      }
    } catch (err: any) {
      console.warn('Fallback headline regeneration executed:', err);
      try {
        const sourceTitle = cleanHeadlineText(activeCtx.title || result?.headline || card.headline || 'ताज़ा समाचार');
        const sourceText = activeCtx.articleText || inputText || result?.summary || card.summary || '';
        const sourceLoc = cleanLocationField(activeCtx.location || result?.location || card.location || '');
        const articleSentences = (sourceText || sourceTitle)
          .split(/[।\n]+|\.\s+/)
          .map((s: string) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, '').trim())
          .filter((s: string) => s.length > 15 && /[\u0900-\u097F]/.test(s));
        const generated = generate5BalancedHeadlineOptions(sourceTitle, articleSentences, sourceLoc);
        const fitted = fitHeadlinesTo5TierRanges(generated, articleSentences, sourceTitle, sourceLoc);
        if (fitted.length > 0) {
          setHeadlineOptions(fitted.slice(0, 5));
          setSelectedHeadlineIndex(0);
          const topH = fitted[0];
          setResult((prev) => (prev ? { ...prev, headline: topH, formattedHeadline: topH, headlineOptions: fitted } : null));
          onChange({ headline: topH, formattedHeadline: topH });
          setRegenSuccessMsg('5 नए संतुलित हेडलाइन विकल्प तैयार किए गए!');
          setTimeout(() => setRegenSuccessMsg(null), 3500);
          return;
        }
      } catch {}
      setError('हेडलाइन्स दोबारा बनाने में समस्या आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Generate AI Photo based on headline
  const handleGenerateAiPhoto = async () => {
    if (!result?.headline) return;
    setGeneratingAiPhoto(true);
    try {
      const res = await fetch(getApiUrl('/api/generate-ai-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          headline: result.headline,
          customPrompt: aiPhotoPrompt.trim() || undefined,
          aspectRatio: card.aspectRatio || '4:5',
          aiProvider,
        }),
      });
      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const rawText = await res.text().catch(() => '');
        try { data = JSON.parse(rawText); } catch { data = null; }
      }
      if (data && data.success && data.imageUrl) {
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
    <div className="space-y-3 relative">
      {/* Full Blocking Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-base font-black text-white">
              मूल समाचार पढ़ा और सत्यापित किया जा रहा है... कृपया प्रतीक्षा करें
            </h4>
            <p className="text-xs text-neutral-300">
              स्रोत आलेख का विश्लेषण कर 5 संतुलित हेडलाइन्स व सोशल मीडिया कैप्शन तैयार किए जा रहे हैं
            </p>
          </div>
        </div>
      )}

      {/* AI Card Official Information Banner */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-start gap-2.5 text-blue-200">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-black text-amber-400">AI कार्ड: </span>
          <span>AI कार्ड आपके न्यूज चैनल के लिए सौ प्रतिशत सटीक अनुपात में ग्राफिक तैयार करके देता है। (ग्राफिक साइज: <strong>4:5</strong>)</span>
        </div>
      </div>

      {/* AI Model (Gemini vs ChatGPT) & Cloud Setting Header */}
      <div className="flex items-center justify-between bg-neutral-950 p-2 sm:p-2.5 rounded-xl border border-neutral-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
                if (!canUseOpenAi) {
                  setError('यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।');
                  return;
                }
                setAiProvider('openai');
                setError(null);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                aiProvider === 'openai'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={canUseOpenAi ? 'चैट जीपीटी (OpenAI)' : 'यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।'}
            >
              <Bot className="w-3 h-3" />
              <span>चैट जीपीटी (OpenAI)</span>
              {!canUseOpenAi && <span className="text-[9px] bg-neutral-800 text-amber-300 px-1 py-0.5 rounded font-mono ml-0.5">🔒 Pro/VIP</span>}
            </button>
          </div>

          {/* Dedicated ChatGPT generation action button when ChatGPT is active and authorized */}
          {aiProvider === 'openai' && canUseOpenAi && (
            <button
              type="button"
              onClick={() => handleGenerateWithProvider('openai')}
              disabled={loading}
              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-lg shadow flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer animate-in fade-in"
              title="ChatGPT से ग्राफिक, हेडलाइन और कैप्शन तैयार करें"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>ChatGPT विश्लेषण कर रहा है...</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-emerald-200" />
                  <span>ChatGPT से ग्राफिक, हेडलाइन और कैप्शन तैयार करें</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeGeneratedProvider && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
              {activeGeneratedProvider === 'openai' ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold"><Bot className="w-2.5 h-2.5" /> सक्रिय AI: ChatGPT</span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-1 font-bold"><Zap className="w-2.5 h-2.5" /> सक्रिय AI: Gemini AI</span>
              )}
            </div>
          )}

          {isAdminOrSuperAdmin && onOpenCloudSettings && (
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

          <button
            type="button"
            onClick={() => {
              if (currentAbortControllerRef.current) {
                currentAbortControllerRef.current.abort();
                currentAbortControllerRef.current = null;
              }
              isExecutingRef.current = false;
              isResetRef.current = true;
              activeNewsIdRef.current = '';
              lastTriggerPayloadRef.current = '';
              cleanAiToolsMemory();
              setLoading(false);
              setResult(null);
              setHeadlineOptions([]);
              setSelectedHeadlineIndex(0);
              setLinkUrl('');
              setInputText('');
              setCustomPrompt('');
              setGeneratedAiImageUrl(null);
              setError(null);
              setAiPhotoPrompt('');
              if ((window as any).showAppToast) {
                (window as any).showAppToast('AI टूल्स की मेमोरी और डेटा पूरी तरह साफ़ कर दिया गया है।');
              }
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/80 px-2 py-1 rounded-lg transition-all cursor-pointer"
            title="AI टूल्स मेमोरी और डेटा क्लीन करें"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>मेमोरी क्लीन करें</span>
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && !result && (
        <div className="bg-neutral-950 border border-blue-500/50 rounded-xl p-5 text-center space-y-3 animate-in fade-in">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <h4 className="text-sm font-black text-white">
            {aiProvider === 'openai' ? 'ChatGPT द्वारा 5 संतुलित AI हेडलाइन तैयार हो रही हैं...' : 'खबर से 5 संतुलित AI हेडलाइन तैयार हो रही हैं...'}
          </h4>
          <p className="text-xs text-slate-400">कृपया प्रतीक्षा करें, समाचार सामग्री का विश्लेषण कर 5 संतुलित और प्रकाशित करने योग्य हेडलाइन तैयार की जा रही हैं।</p>
        </div>
      )}

      {loading && result && (
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-blue-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span>AI द्वारा 5 मुख्य हेडलाइंस तैयार — गहरा संपादकीय विश्लेषण जारी...</span>
          </div>
        </div>
      )}

      {/* Tab Selector & Inputs: Simplified Mode vs Manual Mode */}
      {isAutomatedEntry && !isManualInputMode ? (
        /* Simplified AI Tools Interface (Home-to-Studio Workflow) */
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white">सक्रिय AI मॉडल:</span>
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  disabled={loading || isRegenerating}
                  onClick={() => handleGenerateWithProvider('gemini')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    aiProvider === 'gemini'
                      ? 'bg-yellow-400 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="गूगल जेमिनी AI द्वारा हेडलाइन व कैप्शन बनाएं"
                >
                  <Zap className="w-3 h-3" />
                  <span>Gemini AI</span>
                </button>
                <button
                  type="button"
                  disabled={loading || isRegenerating}
                  onClick={() => {
                    if (!canUseOpenAi) {
                      setError('यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।');
                      return;
                    }
                    handleGenerateWithProvider('openai');
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    aiProvider === 'openai'
                      ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={canUseOpenAi ? 'चैट जीपीटी (OpenAI)' : 'यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।'}
                >
                  <Bot className="w-3 h-3" />
                  <span>चैट जीपीटी (OpenAI)</span>
                  {!canUseOpenAi && <span className="text-[9px] bg-neutral-800 text-amber-300 px-1 py-0.5 rounded font-mono ml-0.5">🔒 Pro/VIP</span>}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeGeneratedProvider && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 flex items-center gap-1">
                  {activeGeneratedProvider === 'openai' ? (
                    <span className="text-emerald-400 flex items-center gap-1"><Bot className="w-2.5 h-2.5" /> सक्रिय: ChatGPT</span>
                  ) : (
                    <span className="text-yellow-400 flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> सक्रिय: Gemini AI</span>
                  )}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsManualInputMode(true)}
                className="text-[11px] font-bold text-neutral-400 hover:text-yellow-300 underline cursor-pointer transition-colors"
                title="कस्टम लिंक या टेक्स्ट दर्ज करने के लिए बॉक्स 1 और 2 खोलें"
              >
                ➕ कस्टम लिंक / टेक्स्ट
              </button>
            </div>
          </div>

          {loading && !result && (
            <div className="py-6 text-center space-y-2.5 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <h4 className="text-xs sm:text-sm font-black text-white">
                {aiProvider === 'openai' ? 'ChatGPT द्वारा खबर का विश्लेषण व AI हेडलाइन तैयार हो रही हैं...' : 'AI द्वारा खबर का विश्लेषण व हेडलाइन तैयार हो रही हैं...'}
              </h4>
              <p className="text-[11px] text-neutral-400">कृपया प्रतीक्षा करें, हेडलाइन, स्थान और सोशल मीडिया कैप्शन तैयार किए जा रहे हैं।</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleProcess()}
                className="px-2 py-0.5 rounded bg-red-800 text-white font-bold text-[10px] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>पुनः प्रयास</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tab Selector: Two Clear Action Boxes (Module 3) */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              type="button"
              disabled={loading || isRegenerating}
              onClick={() => {
                setActiveTab('link');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'link'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>बॉक्स 1: 'लिंक से खबर बनाएं'</span>
            </button>

            <button
              type="button"
              disabled={loading || isRegenerating}
              onClick={() => {
                setActiveTab('command');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'command'
                  ? 'bg-yellow-400 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>बॉक्स 2: 'कच्ची खबर या वॉइस कमांड से खबर बनाएं'</span>
            </button>
          </div>

          {/* Input Section */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 sm:p-4 space-y-3">
            {activeTab === 'link' ? (
              /* बॉक्स 1: Link Input with Automatic Photo Extraction */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>बॉक्स 1: वेबसाइट का न्यूज़ लिंक (URL) डालें (ऑटोमैटिक फोटो एक्सट्रैक्शन):</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={loading || isRegenerating}
                      onClick={handlePasteClipboardToLink}
                      className="text-[11px] font-bold text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="क्लिपबोर्ड से लिंक पेस्ट करें"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>पेस्ट करें</span>
                    </button>
                    {linkUrl && (
                      <button
                        type="button"
                        disabled={loading || isRegenerating}
                        onClick={() => setLinkUrl('')}
                        className="text-neutral-500 hover:text-red-400 p-0.5 rounded disabled:opacity-50"
                        title="साफ़ करें"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="url"
                  disabled={loading || isRegenerating}
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://... कोई भी न्यूज़ वेबसाइट लिंक पेस्ट करें"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-blue-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-neutral-400 leading-snug">
                  💡 AI लिंक से सीधे ताज़ा समाचार, मुख्य शीर्षक व प्रेस फोटो पढ़कर कार्ड में सेट करेगा।
                </p>
              </div>
            ) : (
              /* बॉक्स 2: Raw Script & Voice Command Input */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-yellow-400" />
                    <span>बॉक्स 2: कच्चा समाचार / व्हाट्सएप प्रेस नोट / वॉइस कमांड से खबर बनाएं:</span>
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
                      disabled={loading || isRegenerating}
                      onClick={handlePasteClipboardToInput}
                      className="text-[11px] font-bold text-yellow-300 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/40 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="क्लिपबोर्ड से टेक्स्ट पेस्ट करें"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>पेस्ट करें</span>
                    </button>
                    {inputText && (
                      <button
                        type="button"
                        disabled={loading || isRegenerating}
                        onClick={() => setInputText('')}
                        className="text-neutral-500 hover:text-red-400 p-0.5 rounded disabled:opacity-50"
                        title="साफ़ करें"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={4}
                  disabled={loading || isRegenerating}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setError(null);
                  }}
                  placeholder="व्हाट्सएप मैसेज, प्रेस नोट, या अपनी कच्ची खबर यहाँ पेस्ट करें... उदा: शहडोल में छात्राओं ने कॉलेज सुविधाओं को लेकर पैदल मार्च निकाला।"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-yellow-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none font-['Noto_Sans_Devanagari'] leading-relaxed transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => handleProcess()}
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
                  <span>🔗 {aiProvider === 'openai' ? 'ChatGPT से लिंक द्वारा AI हेडलाइन बनाएं' : 'लिंक से AI हेडलाइन बनाएं'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ {aiProvider === 'openai' ? 'ChatGPT से रॉ न्यूज़ द्वारा AI हेडलाइन बनाएं' : 'रॉ न्यूज़ से AI हेडलाइन बनाएं'}</span>
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
                  onClick={() => handleProcess()}
                  className="px-2 py-0.5 rounded bg-red-800 text-white font-bold text-[10px] shrink-0 flex items-center gap-1 cursor-pointer"
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

          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 gap-2 flex-wrap">
            <span className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-400" />
              <span>
                {isVipDeskUser
                  ? `तैयार AI हेडलाइन (${headlineOptions.length || 5} विकल्प उपलब्ध)`
                  : 'तैयार AI हेडलाइन'}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {isVipDeskUser && (
                <button
                  type="button"
                  onClick={handleRegenerateHeadlines}
                  disabled={isRegenerating || loading}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="उसी खबर के लिए 5 नए संतुलित हेडलाइन विकल्प बनाएं"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>{isRegenerating ? 'नई हेडलाइन्स बन रही हैं...' : '🔄 5 नई हेडलाइन्स बनाएं (Regenerate)'}</span>
                </button>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-bold">
                📍 {result.location || card.location || 'मध्य प्रदेश'}
              </span>
            </div>
          </div>

          {regenSuccessMsg && (
            <div className="p-2 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{regenSuccessMsg}</span>
            </div>
          )}

          {/* Headline Options: Exactly 5 Simple Numbered Options with Word and Character Counts (VIP Desk Only) */}
          {isVipDeskUser && headlineOptions.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-bold">
                तैयार 5 संतुलित AI हेडलाइन विकल्प (पसंदीदा पर एक क्लिक करें):
              </span>
              {headlineOptions.slice(0, 5).map((opt, idx) => {
                const isSelected = selectedHeadlineIndex === idx;
                const displayText = isSelected && result?.headline ? result.headline : opt;
                const cleanDisplay = displayText.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
                const wordCount = cleanDisplay.split(/\s+/).filter(Boolean).length;
                const charCount = cleanDisplay.length;

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
                          <span>{charCount} अक्षर</span>
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
                      {displayText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Headline Direct Edit Box with Live Dynamic Word and Character Counter */}
          <div className="space-y-1 bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold">
              <div className="flex items-center gap-1.5">
                <span>हेडलाइन संपादित करें (Edit text):</span>
                <span className="text-[10px] text-yellow-400 font-mono bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 flex items-center gap-1">
                  <span className="text-amber-300 font-bold">
                    {(result.headline || '')
                      .replace(/\[\/?(?:yellow|highlight)\]/g, '')
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length} शब्द
                  </span>
                  <span className="text-neutral-600">|</span>
                  <span>{(result.headline || '').replace(/\[\/?(?:yellow|highlight)\]/g, '').trim().length} / 150 अक्षर</span>
                </span>
              </div>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setResult((prev) => {
                    const newText = prev?.headline ? `${prev.headline} ${transcript}` : transcript;
                    onChange({ headline: newText, formattedHeadline: newText });
                    return prev
                      ? {
                          ...prev,
                          headline: newText,
                          formattedHeadline: newText,
                        }
                      : null;
                  });
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
                onChange({ headline: val, formattedHeadline: val });
              }}
              className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white font-extrabold text-xs sm:text-sm font-['Noto_Sans_Devanagari'] focus:border-yellow-400 focus:outline-none leading-relaxed"
            />
          </div>



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
                विस्तृत
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
                संक्षिप्त
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
              {getActiveCaptionUsername(card, currentUser) ? (
                <span className="leading-tight font-medium text-emerald-400/90">
                  इस कैप्शन में आपका यूजरनेम शामिल है।
                </span>
              ) : null}
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
