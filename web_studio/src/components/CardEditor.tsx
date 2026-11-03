import React from 'react';
import { NewsCardData, CardLayout, AspectRatio, FrameDesign, TextBreakingBadgeStyle } from '../types';
import {
  Sparkles,
  LayoutGrid,
  Image as ImageIcon,
  Type,
  MapPin,
  Share2,
  Download,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Layers,
  CircleDot,
  Upload,
  RotateCcw,
  Check,
  ShieldAlert,
  Move,
  ZoomIn,
  ZoomOut,
  AlignJustify,
  AlignCenter,
  AlignLeft,
  Lock,
  Unlock,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  FileText,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  Palette,
  Globe,
  Phone,
  Calendar,
  Plus,
  Minus,
  FolderOpen,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import {
  saveCustomFrame,
  getCustomFrames,
  deleteCustomFrame,
  CustomFrameItem,
} from '../lib/customFramesManager';
import {
  FRAME_OPTIONS,
  REPORTER_ALLOWED_FRAMES,
  getEffectiveFrameOptions,
  FrameOption,
} from '../lib/HeaderDesigns';
import {
  isTemplateAvailableForUserPlan,
  getTemplateConfig,
  GraphicPlanCategory,
  FRAME_CATEGORIES,
} from '../lib/graphicTemplatesRegistry';
import {
  isTierSufficient,
  isEffectiveAdmin,
  isEffectiveSuperAdmin,
  getEffectiveUserTier,
  PLAN_KEY_MAP,
  isChannelProfileLocked,
  getAssignedCustomHeaderFooter,
} from '../lib/userPlanManager';
import {
  registerCustomFont,
  canUserUploadCustomFont,
  isFontAllowedForTier,
  getCustomUploadedFonts,
  getTierForFont,
} from '../lib/fontManager';
import {
  BUILTIN_RIBBONS,
  loadSavedCustomRibbons,
  saveCustomRibbon,
  deleteCustomRibbon,
  RibbonPreset,
} from '../lib/ribbonPresets';
import {
  getActiveFooterPng,
  setActiveFooterPng,
  getFrameDesignLabel,
} from '../lib/footerUtils';
import { PhotoPositionControl } from './PhotoPositionControl';
import {
  getActiveHeaderPng,
  setActiveHeaderPng,
} from '../lib/headerUtils';
import { extractLeaderFromHeadline, getEffectiveSpeaker, stripAllUrlsAndHyperlinks, cleanCaptionParagraphs } from '../lib/speakerUtils';
import { CardPreview } from './CardPreview';
import { getUserFirstHashtag, buildHashtags } from './CaptionModal';
import { VoiceInputButton } from './VoiceInputButton';
import { getFormattedHindiDate } from '../lib/dateUtils';
import { MorningJacketEditor } from './MorningJacketEditor';
import { EPaperJacketEditor } from './EPaperJacketEditor';
import { InlineAiNewsTools, AutoFillNewsData } from './InlineAiNewsTools';
import { ReporterUser } from './LoginModal';
import { scrollToStepById } from './StepNavigator';

export const HEADLINE_FONTS = [
  { id: 'Hind', label: 'हिंद (Hind - न्यूज़पेपर)', minTier: 'BASIC', badge: 'बेसिक' },
  { id: 'Baloo 2', label: 'बालू २ (Baloo 2 - बोल्ड)', minTier: 'ADVANCE', badge: 'एडवांस' },
  { id: 'Khand', label: 'खंड (Khand - कड़क बोल्ड)', minTier: 'ADVANCE', badge: 'एडवांस' },
  { id: 'Sahitya', label: 'साहित्य (Sahitya - क्लासिक)', minTier: 'ADVANCE', badge: 'एडवांस' },
  { id: 'Anek Devanagari', label: 'अनेक देवनागरी (Anek - मॉडर्न)', minTier: 'ADVANCE', badge: 'एडवांस' },
  { id: 'Noto Sans Devanagari', label: 'नोटो सैंस (Noto Sans - साफ़)', minTier: 'PRO', badge: 'प्रो' },
  { id: 'Poppins', label: 'पॉपिन्स (Poppins - स्टाइलिश)', minTier: 'PRO', badge: 'प्रो' },
  { id: 'Rozha One', label: 'रोज़्हा वन (Rozha One - हेडिंग)', minTier: 'PRO', badge: 'प्रो' },
  { id: 'Mukta', label: 'मुक्ता (Mukta - क्रिस्प)', minTier: 'PRO', badge: 'प्रो' },
  { id: 'Rajdhani', label: 'राजधानी (Rajdhani - स्क्वेयर्ड)', minTier: 'PRO', badge: 'प्रो' },
  { id: 'Tiro Devanagari Hindi', label: 'टीरो देवनागरी (Tiro Serif)', minTier: 'VIP DESK', badge: 'VIP' },
  { id: 'Kalam', label: 'कलाम (Kalam - हैंडराइटिंग)', minTier: 'VIP DESK', badge: 'VIP' },
  { id: 'Gotu', label: 'गोटू (Gotu - कर्व्ड)', minTier: 'VIP DESK', badge: 'VIP' },
  { id: 'Yatra One', label: 'यात्रा वन (Yatra One - हेरिटेज)', minTier: 'VIP DESK', badge: 'VIP' },
  { id: 'Martel', label: 'मार्तेल (Martel - संपादकीय)', minTier: 'VIP DESK', badge: 'VIP' },
];

export const HIGHLIGHT_COLOR_PRESETS = [
  { color: '#FFE600', label: 'पीला (Default)', bg: 'bg-[#FFE600]', text: 'text-neutral-900' },
  { color: '#EF4444', label: 'लाल (Red)', bg: 'bg-red-500', text: 'text-white' },
  { color: '#FFFFFF', label: 'सफ़ेद (White)', bg: 'bg-white', text: 'text-neutral-900' },
  { color: '#06B6D4', label: 'आसमानी (Cyan)', bg: 'bg-cyan-500', text: 'text-white' },
  { color: '#84CC16', label: 'हरा (Lime)', bg: 'bg-lime-500', text: 'text-neutral-900' },
  { color: '#F97316', label: 'नारंगी (Orange)', bg: 'bg-orange-500', text: 'text-white' },
  { color: '#A855F7', label: 'बैंगनी (Purple)', bg: 'bg-purple-500', text: 'text-white' },
  { color: '#EC4899', label: 'गुलाबी (Pink)', bg: 'bg-pink-500', text: 'text-white' },
  { color: '#10B981', label: 'पन्ना (Emerald)', bg: 'bg-emerald-500', text: 'text-white' },
];

export const FOOTER_BG_PRIMARY_PRESETS = [
  { color: '#FFFFFF', name: 'White', nameHi: 'सफ़ेद (डिफ़ॉल्ट)', border: 'border-neutral-300' },
  { color: '#EDEDED', name: 'Light Gray', nameHi: 'हल्का ग्रे', border: 'border-neutral-300' },
  { color: '#FFF1D6', name: 'Cream', nameHi: 'क्रीम', border: 'border-amber-200' },
  { color: '#D9F0FF', name: 'Sky Blue', nameHi: 'स्काई ब्लू', border: 'border-sky-300' },
  { color: '#DDF5E3', name: 'Mint Green', nameHi: 'मिंट ग्रीन', border: 'border-emerald-300' },
];

export const LOCATION_BG_PRESETS = FOOTER_BG_PRIMARY_PRESETS;

export const FOOTER_BG_SECONDARY_PRESETS = [
  { color: '#FFF200', name: 'Bright Yellow', nameHi: 'ब्राइट यलो', border: 'border-yellow-400' },
  { color: '#FFE1EC', name: 'Light Pink', nameHi: 'हल्का गुलाबी', border: 'border-pink-300' },
  { color: '#E8E0FF', name: 'Light Lavender', nameHi: 'लैवेंडर', border: 'border-purple-300' },
  { color: '#FFE3C2', name: 'Peach', nameHi: 'पीच', border: 'border-orange-200' },
  { color: '#D8F3F0', name: 'Aqua', nameHi: 'एक्वा', border: 'border-teal-200' },
  { color: '#FFF4B8', name: 'Pale Yellow', nameHi: 'पेल यलो', border: 'border-yellow-200' },
  { color: '#F5E6D3', name: 'Beige', nameHi: 'बेज', border: 'border-amber-200' },
  { color: '#E1E8F5', name: 'Light Steel Blue', nameHi: 'स्टील ब्लू', border: 'border-slate-300' },
  { color: '#E8E8C9', name: 'Light Olive', nameHi: 'ऑलिव', border: 'border-lime-200' },
];

export const FOOTER_BG_PRESETS = [
  ...FOOTER_BG_PRIMARY_PRESETS.map((p) => ({ color: p.color, label: `${p.nameHi} (${p.name})`, border: p.border })),
  ...FOOTER_BG_SECONDARY_PRESETS.map((p) => ({ color: p.color, label: `${p.nameHi} (${p.name})`, border: p.border })),
];

export const FOOTER_TEXT_COLOR_PRESETS = [
  { color: '#000000', name: 'Black', nameHi: 'काला (डिफ़ॉल्ट)' },
  { color: '#333333', name: 'Dark Gray', nameHi: 'डार्क ग्रे' },
  { color: '#FFFFFF', name: 'White', nameHi: 'सफ़ेद' },
  { color: '#17365D', name: 'Dark Blue', nameHi: 'डार्क ब्लू' },
  { color: '#176B3A', name: 'Dark Green', nameHi: 'डार्क ग्रीन' },
  { color: '#8B1E1E', name: 'Dark Red', nameHi: 'डार्क रेड' },
  { color: '#5B2C83', name: 'Dark Purple', nameHi: 'डार्क पर्पल' },
];

interface CardEditorProps {
  card: NewsCardData;
  onChange: (updated: Partial<NewsCardData>) => void;
  onOpenAIAnalyze: () => void;
  onOpenCommandModal: (initialTab?: 'link' | 'command') => void;
  onOpenCaptionModal: () => void;
  onResetAI?: () => void;
  onDownload?: () => void;
  downloading?: boolean;
  activeStep?: number;
  onStepChange?: (step: number) => void;
  currentUser?: ReporterUser | null;
  mobileViewMode?: 'steps' | 'all';
  onToggleMobileViewMode?: (mode: 'steps' | 'all') => void;
  onOpenCloudSettings?: () => void;
  onLogout?: () => void;
  autoFillNews?: AutoFillNewsData | null;
}

const handleThumbnailImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  const currentSrc = target.src;
  if (currentSrc.includes('/api/proxy-image') && currentSrc.includes('url=')) {
    try {
      const u = new URL(currentSrc, window.location.href);
      const originalUrl = u.searchParams.get('url');
      if (originalUrl && originalUrl !== currentSrc) {
        target.src = originalUrl;
        return;
      }
    } catch {}
  }
  target.onerror = null;
  target.src = '/assets/preview_placeholder.jpg';
};

export const CardEditor: React.FC<CardEditorProps> = ({
  card,
  onChange,
  onOpenAIAnalyze,
  onOpenCommandModal,
  onOpenCaptionModal,
  onResetAI,
  onDownload,
  downloading,
  activeStep: propActiveStep,
  onStepChange,
  currentUser,
  mobileViewMode: propMobileViewMode,
  onToggleMobileViewMode,
  onOpenCloudSettings,
  onLogout,
  autoFillNews,
}) => {
  const effectiveAdmin = isEffectiveAdmin(currentUser);
  const effectiveTier = getEffectiveUserTier(currentUser);
  const isAdmin = effectiveAdmin;
  const isProfileLocked = !effectiveAdmin && isChannelProfileLocked(currentUser);
  const canToggleMasterBranding = isEffectiveSuperAdmin(currentUser) || effectiveTier === 'professional' || effectiveTier === 'ultra';
  const canChangeLogo = isEffectiveSuperAdmin(currentUser) || effectiveTier === 'professional' || effectiveTier === 'ultra' || effectiveTier === 'advanced';
  const canUseCustomHF = canToggleMasterBranding;
  const canUploadCustomFont = canUserUploadCustomFont(effectiveTier, effectiveAdmin);

  const isBasicUser = !effectiveAdmin && (!effectiveTier || effectiveTier === 'basic');

  // All available headline fonts: all 15 built-in fonts + any custom uploaded fonts (all users see all fonts)
  const allHeadlineFontChoices = React.useMemo(() => {
    const customFonts = getCustomUploadedFonts().map((cf) => ({
      id: cf.name,
      label: `${cf.name} (कस्टम फ़ॉन्ट)`,
      minTier: 'VIP DESK' as const,
      badge: 'कस्टम',
      isCustom: true,
    }));
    return [...HEADLINE_FONTS, ...customFonts];
  }, []);

  // Determine current active selected font (for basic user: strictly 'Hind' if current is not allowed)
  const currentActiveFont = React.useMemo(() => {
    if (isBasicUser) {
      if (!card.headlineFontFamily || !isFontAllowedForTier(card.headlineFontFamily, effectiveTier, effectiveAdmin)) {
        return 'Hind';
      }
    }
    return card.headlineFontFamily || (isBasicUser ? 'Hind' : 'Baloo 2');
  }, [card.headlineFontFamily, isBasicUser, effectiveTier, effectiveAdmin]);

  // Backward compatibility alias so any other reference continues working seamlessly
  const packageHeadlineFonts = allHeadlineFontChoices;

  // Auto-enforce 'Hind' for basic users if card has an unavailable font
  React.useEffect(() => {
    if (isBasicUser && card.headlineFontFamily && card.headlineFontFamily !== 'Hind') {
      onChange({ headlineFontFamily: 'Hind' });
    }
  }, [isBasicUser, card.headlineFontFamily]);

  const [currentFrameOptions, setCurrentFrameOptions] = React.useState<FrameOption[]>(() => getEffectiveFrameOptions());

  React.useEffect(() => {
    const handlePlansUpdated = () => {
      setCurrentFrameOptions(getEffectiveFrameOptions());
    };
    window.addEventListener('template_plans_updated', handlePlansUpdated);
    return () => {
      window.removeEventListener('template_plans_updated', handlePlansUpdated);
    };
  }, []);

  const allowedFrameOptions = isAdmin
    ? currentFrameOptions
    : currentFrameOptions.filter((f) => (REPORTER_ALLOWED_FRAMES as readonly string[]).includes(f.id));

  // Saved custom ribbons for Super Breaking layout
  const [savedRibbons, setSavedRibbons] = React.useState<RibbonPreset[]>(() => loadSavedCustomRibbons());
  const [newRibbonName, setNewRibbonName] = React.useState<string>('');

  // Per-template footer selection state
  const [selectedFooterDesignTab, setSelectedFooterDesignTab] = React.useState<FrameDesign>(
    card.frameDesign || 'graphic_001'
  );

  React.useEffect(() => {
    if (card.frameDesign) {
      setSelectedFooterDesignTab(card.frameDesign);
    }
  }, [card.frameDesign]);

  // Master Branding custom frames sub-mode and saved catalog state
  const [customBrandingSubTab, setCustomBrandingSubTab] = React.useState<'hf' | 'full'>('hf');
  const [savedCustomFramesList, setSavedCustomFramesList] = React.useState<CustomFrameItem[]>(() =>
    getCustomFrames(currentUser?.email || currentUser?.username)
  );

  React.useEffect(() => {
    const handleFramesUpdated = () => {
      setSavedCustomFramesList(getCustomFrames(currentUser?.email || currentUser?.username));
    };
    window.addEventListener('ai_news_custom_frames_updated', handleFramesUpdated);
    return () => window.removeEventListener('ai_news_custom_frames_updated', handleFramesUpdated);
  }, [currentUser]);

  // Mobile active step navigation (1 to 6)
  const [internalActiveStep, setInternalActiveStep] = React.useState<number>(1);
  const activeStep = propActiveStep !== undefined ? propActiveStep : internalActiveStep;
  const setActiveStep = onStepChange || setInternalActiveStep;
  const [internalMobileViewMode, setInternalMobileViewMode] = React.useState<'steps' | 'all'>('steps');
  const mobileViewMode = propMobileViewMode !== undefined ? propMobileViewMode : internalMobileViewMode;
  const setMobileViewMode = onToggleMobileViewMode || setInternalMobileViewMode;
  const [selectedFrameCategory, setSelectedFrameCategory] = React.useState<string>('Regular Frame');
  const [unlockedFrameIds, setUnlockedFrameIds] = React.useState<string[]>([]);
  const [isUnlockingFrame, setIsUnlockingFrame] = React.useState<string | null>(null);
  const [showSearchHelper, setShowSearchHelper] = React.useState<boolean>(false);

  // Fetch active daily frame unlocks for the current user
  const fetchUnlockedFrames = React.useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/wallet/frame-unlocks?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.unlockedFrameIds)) {
          setUnlockedFrameIds(data.unlockedFrameIds);
        }
      }
    } catch (err) {
      console.error('Failed to fetch frame unlocks:', err);
    }
  }, [currentUser?.email]);

  React.useEffect(() => {
    fetchUnlockedFrames();
  }, [fetchUnlockedFrames]);

  const handleCoinUnlock = async (frameId: string, coinPrice: number) => {
    if (!currentUser?.email) {
      alert('कृपया पहले लॉगिन करें।');
      return;
    }
    if (!window.confirm(`क्या आप ${coinPrice} सिक्कों का उपयोग करके इस फ्रेम को आज के लिए अनलॉक करना चाहते हैं?`)) {
      return;
    }
    try {
      setIsUnlockingFrame(frameId);
      const res = await fetch('/api/wallet/unlock-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, frameId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'सिक्का अनलॉक विफल रहा। कृपया पर्याप्त सिक्के जांचें।');
        return;
      }
      setUnlockedFrameIds((prev) => [...prev, frameId]);
      onChange({ frameDesign: frameId as any });
      alert('फ्रेम सफलतापूर्वक आज के लिए अनलॉक हो गई है!');
    } catch (err: any) {
      alert(err.message || 'अनलॉक में समस्या आई।');
    } finally {
      setIsUnlockingFrame(null);
    }
  };

  // 8 Frame Categories for Step 1
  const frameCategoryItems = React.useMemo(() => {
    return FRAME_CATEGORIES.map((catName) => {
      if (catName === 'Custom Frame') {
        const savedCount = savedCustomFramesList.length;
        return { id: catName, label: catName, badge: `${savedCount + 1}` };
      }
      const count = currentFrameOptions.filter((f) => {
        const cfg = getTemplateConfig(f.id);
        if (!cfg.isActive) return false;
        const c = cfg.category || 'Regular Frame';
        return c === catName;
      }).length;
      return { id: catName, label: catName, badge: `${count}` };
    });
  }, [currentFrameOptions, savedCustomFramesList]);

  // Load Custom Header & Footer for eligible user or admin assignment
  React.useEffect(() => {
    const cleanEmail = currentUser?.email?.toLowerCase().trim();
    const assigned = getAssignedCustomHeaderFooter(cleanEmail);
    let userHF = assigned;
    if (!userHF && cleanEmail && canUseCustomHF) {
      try {
        const saved = localStorage.getItem(`user_custom_hf_${cleanEmail}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.active && (parsed.headerUrl || parsed.footerUrl)) {
            userHF = parsed;
          }
        }
      } catch {}
    }

    if (userHF && userHF.active) {
      const updates: Partial<NewsCardData> = {};
      const allDesigns: FrameDesign[] = [
        'graphic_001', 'graphic_002', 'graphic_003', 'graphic_004',
        'jacket-original', 'jacket-breaking-red', 'jacket-text-breaking',
        'jacket-investigation', 'jacket-quote', 'jacket-morning', 'custom-png',
      ];
      if (userHF.headerUrl && !card.customHeaderPng) {
        updates.customHeaderPng = userHF.headerUrl;
        const h: any = { ...(card.headersByDesign || {}) };
        allDesigns.forEach((d) => {
          if (!h[d]) h[d] = userHF!.headerUrl;
        });
        updates.headersByDesign = h;
      }
      if (userHF.footerUrl && !card.customFooterPng) {
        updates.customFooterPng = userHF.footerUrl;
        const f: any = { ...(card.footersByDesign || {}) };
        allDesigns.forEach((d) => {
          if (!f[d]) f[d] = userHF!.footerUrl;
        });
        updates.footersByDesign = f;
      }
      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [currentUser?.email, canUseCustomHF]);

  const handleGoToStep = (newStep: number, targetId?: string) => {
    setActiveStep(newStep);
    const stepMap: Record<number, string> = {
      1: 'step-frame',
      2: 'step-ai',
      3: 'step-headline',
      4: 'step-photo',
      5: 'step-location',
      6: 'step-header-footer',
      7: 'step-download',

    };
    const id = targetId || stepMap[newStep];
    if (id) {
      scrollToStepById(id);
    }
  };

  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState<boolean>(false);
  const [captionCopied, setCaptionCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleOpenGraphicPreview = () => {
      setIsPreviewModalOpen(true);
    };
    window.addEventListener('ai_news_open_graphic_preview', handleOpenGraphicPreview);
    return () => window.removeEventListener('ai_news_open_graphic_preview', handleOpenGraphicPreview);
  }, []);

  const handleDirectCopyCaption = () => {
    try {
      const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();
      let newsStory = '';
      if (card.summary && card.summary.trim()) {
        let rawSummary = stripAllUrlsAndHyperlinks(card.summary.trim());
        const tagMatch = rawSummary.match(/(#[a-zA-Z0-9_\u0900-\u097F]+\s*)+$/);
        let existingTags = '';
        if (tagMatch) {
          existingTags = tagMatch[0].trim();
          rawSummary = rawSummary.substring(0, tagMatch.index).trim();
        }
        newsStory = rawSummary || cleanHeadline || 'मुख्य समाचार';
        const tagsToUse = buildHashtags(card.location, existingTags, card);
        const combined = tagsToUse ? `${newsStory}\n\n${tagsToUse}` : newsStory;
        const firstUserTag = getUserFirstHashtag(card);
        const cleaned = cleanCaptionParagraphs(combined, 'detailed', firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
        navigator.clipboard.writeText(cleaned);
      } else {
        newsStory = cleanHeadline || 'मुख्य समाचार';
        const tagsToUse = buildHashtags(card.location, undefined, card);
        const combined = tagsToUse ? `${newsStory}\n\n${tagsToUse}` : newsStory;
        const firstUserTag = getUserFirstHashtag(card);
        const cleaned = cleanCaptionParagraphs(combined, 'detailed', firstUserTag.replace(/^#/, ''), card.location, cleanHeadline);
        navigator.clipboard.writeText(cleaned);
      }
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy caption:', err);
    }
  };

  const renderMobileStepNavigation = (stepNumber: number) => {
    if (mobileViewMode !== 'steps') return null;
    return (
      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs">
        {/* Left: पिछला चरण */}
        {stepNumber > 1 ? (
          <button
            type="button"
            onClick={() => handleGoToStep(stepNumber - 1)}
            className="flex-1 py-2 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold flex items-center justify-center gap-1 border border-neutral-700/80 transition-all cursor-pointer active:scale-95 text-[11px] sm:text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
            <span>पिछला चरण</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 py-2 px-2 rounded-xl bg-neutral-900 text-neutral-600 font-medium flex items-center justify-center gap-1 border border-neutral-800 opacity-40 cursor-not-allowed text-[11px] sm:text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-neutral-600" />
            <span>पिछला चरण</span>
          </button>
        )}

        {/* Center: ग्राफिक प्रीव्यू देखें */}
        <button
          type="button"
          onClick={() => setIsPreviewModalOpen(true)}
          className="flex-1 py-2 px-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 text-[11px] sm:text-xs"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate">ग्राफिक प्रीव्यू देखें</span>
        </button>

        {/* Right: अगला चरण */}
        {stepNumber < 7 ? (
          <button
            type="button"
            onClick={() => handleGoToStep(stepNumber + 1)}
            className="flex-1 py-2 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 font-black flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer active:scale-95 text-[11px] sm:text-xs"
          >
            <span>अगला चरण</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-950" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleGoToStep(1)}
            className="flex-1 py-2 px-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer active:scale-95 text-[11px] sm:text-xs"
          >
            <span>स्टेप 1 पर जाएं</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
    );
  };

  // Strictly enforce single photo layout for jacket-quote template
  React.useEffect(() => {
    if (card.frameDesign === 'jacket-quote' && card.layout !== 'single') {
      onChange({ layout: 'single' });
    }
  }, [card.frameDesign, card.layout, onChange]);

  const STEPS = [
    { step: 1, id: 'step-frame', label: '1. फ्रेम्स', shortLabel: 'फ्रेम्स', icon: '🖼️' },
    { step: 2, id: 'step-ai', label: '2. एआई टूल्स', shortLabel: 'एआई टूल्स', icon: '🤖' },
    { step: 3, id: 'step-headline', label: '3. हेडलाइन', shortLabel: 'हेडलाइन', icon: '✍️' },
    { step: 4, id: 'step-photo', label: '4. फोटो व वॉटरमार्क', shortLabel: 'फोटो-वॉटरमार्क', icon: '📷' },
    { step: 5, id: 'step-location', label: '5. स्थान व दिनांक', shortLabel: 'स्थान-दिनांक', icon: '📍' },
    { step: 6, id: 'step-header-footer', label: '6. हैडर और फुटर', shortLabel: 'हैडर-फुटर', icon: '📜' },
    { step: 7, id: 'step-download', label: '7. डाउनलोड व कैप्शन', shortLabel: 'डाउनलोड-कैप्शन', icon: '⬇️' },
  ];

  const activeHeaderPng = getActiveHeaderPng(card);
  const activeFooterPng = getActiveFooterPng(card);

  // Photo crop/position active tab
  const [activeCropPhotoKey, setActiveCropPhotoKey] = React.useState<'main' | 'second' | 'third' | 'fourth' | 'insetCircle'>('main');

  // Available photos for cropping based on layout
  const availableCropPhotos: { key: 'main' | 'second' | 'third' | 'fourth' | 'insetCircle'; label: string }[] = [
    {
      key: 'main',
      label:
        card.layout === 'split-v'
          ? 'फोटो 1 (ऊपर 35%)'
          : card.layout === 'double'
          ? 'फोटो 1 (ऊपर 50%)'
          : card.layout === 'double-h' || card.layout === 'split-h'
          ? 'फोटो 1 (बाईं 50%)'
          : card.layout === 'grid-3' || card.layout === 'grid-4'
          ? 'फोटो 1 (ऊपर बाईं)'
          : card.layout === 'grid-3-bottom'
          ? 'फोटो 1 (ऊपर चौड़ी)'
          : 'मुख्य फोटो (Photo 1)',
    },
  ];

  if (
    card.layout === 'double' ||
    card.layout === 'split-v' ||
    card.layout === 'double-h' ||
    card.layout === 'split-h' ||
    card.layout === 'grid-3' ||
    card.layout === 'grid-3-bottom' ||
    card.layout === 'grid-4'
  ) {
    availableCropPhotos.push({
      key: 'second',
      label:
        card.layout === 'split-v'
          ? 'फोटो 2 (नीचे 65%)'
          : card.layout === 'double'
          ? 'फोटो 2 (नीचे 50%)'
          : card.layout === 'double-h' || card.layout === 'split-h'
          ? 'फोटो 2 (दाईं 50%)'
          : card.layout === 'grid-3' || card.layout === 'grid-4'
          ? 'फोटो 2 (ऊपर दाईं)'
          : 'फोटो 2 (नीचे बाईं)',
    });
  }

  if (card.layout === 'grid-3' || card.layout === 'grid-3-bottom' || card.layout === 'grid-4') {
    availableCropPhotos.push({
      key: 'third',
      label:
        card.layout === 'grid-3'
          ? 'फोटो 3 (नीचे चौड़ी)'
          : card.layout === 'grid-4'
          ? 'फोटो 3 (नीचे बाईं)'
          : 'फोटो 3 (नीचे दाईं)',
    });
  }

  if (card.layout === 'grid-4') {
    availableCropPhotos.push({
      key: 'fourth',
      label: 'फोटो 4 (नीचे दाईं)',
    });
  }

  // Ensure activeCropPhotoKey is always a valid key for the current layout
  React.useEffect(() => {
    if (!availableCropPhotos.some((p) => p.key === activeCropPhotoKey)) {
      setActiveCropPhotoKey('main');
    }
  }, [card.layout, activeCropPhotoKey]);

  const currentCrop = card.imagePositions?.[activeCropPhotoKey] || { x: 50, y: 50, zoom: 1 };

  const updateCrop = (
    key: 'main' | 'second' | 'third' | 'fourth' | 'insetCircle',
    updates: Partial<{ x: number; y: number; zoom: number }>
  ) => {
    const existing = card.imagePositions?.[key] || { x: 50, y: 50, zoom: 1 };
    onChange({
      imagePositions: {
        ...card.imagePositions,
        [key]: {
          ...existing,
          ...updates,
        },
      },
    });
  };

  // Handle image file upload helper
  const handleFileUpload = (
    key: 'main' | 'second' | 'third' | 'fourth' | 'insetCircle',
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange({
          images: {
            ...card.images,
            [key]: e.target.result as string,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Header PNG upload for a specific design
  const handleHeaderUploadForDesign = (file: File, targetDesign: FrameDesign) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const url = e.target.result as string;
        const updatedHeaders = { ...(card.headersByDesign || {}) };
        updatedHeaders[targetDesign] = url;
        onChange({
          customHeaderPng: url,
          headersByDesign: updatedHeaders,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset header for a specific design
  const handleResetHeaderForDesign = (targetDesign: FrameDesign) => {
    const updatedHeaders = { ...(card.headersByDesign || {}) };
    delete updatedHeaders[targetDesign];
    const currentActiveDesign = card.frameDesign || 'graphic_001';
    onChange({
      customHeaderPng: updatedHeaders[currentActiveDesign] || undefined,
      headersByDesign: updatedHeaders,
    });
  };

  // Apply a header to all templates
  const handleApplyHeaderToAll = (url: string) => {
    const allDesigns: FrameDesign[] = [
      'graphic_001',
      'graphic_002',
      'graphic_003',
      'graphic_004',
      'custom-png',
    ];
    const updatedHeaders: Record<string, string> = {};
    for (const d of allDesigns) {
      updatedHeaders[d] = url;
    }
    onChange({
      customHeaderPng: url,
      headersByDesign: updatedHeaders,
    });
  };

  // Legacy/Default Header PNG upload
  const handleHeaderUpload = (file: File) => {
    const currentDesign = card.frameDesign || 'graphic_001';
    handleHeaderUploadForDesign(file, currentDesign);
  };

  // Handle Full Frame Overlay PNG upload
  const handleFrameOverlayUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const frameDataUrl = e.target.result as string;
        const frameName =
          window.prompt('कृपया 4:5 कस्टम फ्रेम का नाम दर्ज करें (Enter Frame Name):', 'माय 4:5 मास्टर फ्रेम') ||
          'कस्टम 4:5 फ्रेम';

        saveCustomFrame({
          userId: currentUser?.email || currentUser?.username || 'general',
          name: frameName.trim(),
          assetUrl: frameDataUrl,
          frameType: 'full_4_5',
        });

        // Set full frame, disable master branding, and clear header/footer so they don't overlap
        onChange({
          customFrameOverlayPng: frameDataUrl,
          customHeaderPng: undefined,
          customFooterPng: undefined,
          frameDesign: 'custom-png',
          showMasterBranding: false,
        });

        setSavedCustomFramesList(getCustomFrames(currentUser?.email || currentUser?.username));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle saving Header + Footer combo as a custom frame preset
  const handleSaveHeaderFooterCombo = () => {
    if (!activeHeaderPng && !activeFooterPng) {
      alert('कृपया पहले हेडर या फुटर PNG अपलोड करें!');
      return;
    }
    const frameName =
      window.prompt('कृपया हेडर+फुटर फ्रेम का नाम दर्ज करें (Enter Frame Name):', 'माय हेडर-फुटर फ्रेम') ||
      'हेडर-फुटर कॉम्बो';

    saveCustomFrame({
      userId: currentUser?.email || currentUser?.username || 'general',
      name: frameName.trim(),
      assetUrl: activeHeaderPng || activeFooterPng || '',
      headerUrl: activeHeaderPng,
      footerUrl: activeFooterPng,
      frameType: 'header_footer',
    });

    // Clear 4:5 frame overlay so header+footer combo displays cleanly
    onChange({
      customFrameOverlayPng: undefined,
      showMasterBranding: false,
    });
    setSavedCustomFramesList(getCustomFrames(currentUser?.email || currentUser?.username));
    alert(`"${frameName}" कस्टम फ्रेम्स में सुरक्षित कर लिया गया है!`);
  };

  // Handle Custom Brand/Channel Logo upload
  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange({
          customLogoUrl: e.target.result as string,
          brandLogoType: 'custom',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Footer PNG upload for a specific design or selected design
  const handleFooterUpload = (file: File, targetDesign?: FrameDesign) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const url = e.target.result as string;
        const designToUpdate = targetDesign || selectedFooterDesignTab || card.frameDesign || 'graphic_001';
        const updatedFooters = { ...(card.footersByDesign || {}) };
        updatedFooters[designToUpdate] = url;
        onChange({
          customFooterPng: url,
          footersByDesign: updatedFooters,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFooterUploadForDesign = handleFooterUpload;

  // Reset footer for a specific design
  const handleFooterReset = (targetDesign?: FrameDesign) => {
    const designToReset = targetDesign || selectedFooterDesignTab || card.frameDesign || 'graphic_001';
    const updatedFooters = { ...(card.footersByDesign || {}) };
    delete updatedFooters[designToReset];
    const currentActiveDesign = card.frameDesign || 'graphic_001';
    onChange({
      customFooterPng: updatedFooters[currentActiveDesign] || undefined,
      footersByDesign: updatedFooters,
    });
  };

  const handleResetFooterForDesign = handleFooterReset;

  // Apply a footer to all templates
  const handleApplyFooterToAll = (url: string) => {
    const allDesigns: FrameDesign[] = [
      'graphic_001',
      'graphic_002',
      'graphic_003',
      'graphic_004',
      'custom-png',
    ];
    const updatedFooters: Record<string, string> = {};
    for (const d of allDesigns) {
      updatedFooters[d] = url;
    }
    onChange({
      customFooterPng: url,
      footersByDesign: updatedFooters,
    });
  };

  // Handle Custom Background Upload for Text Breaking Jacket
  const handleTextBreakingBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange({
          textBreakingCustomBgUrl: e.target.result as string,
          textBreakingBgStyle: 'custom-image',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Dedicated Render function for Text Breaking Settings (Used in Step 1 and Step 3)
  const renderTextBreakingSettings = () => (
    <div className="space-y-4">
      {/* Informational banner */}
      <div className="p-3 bg-red-950/40 rounded-xl border border-red-800/60 text-xs text-neutral-200 flex items-start gap-2.5">
        <span className="text-base text-red-400">⚡</span>
        <div>
          <strong className="block text-red-300 font-bold mb-0.5">
            टेक्स्ट ब्रेकिंग जैकेट (Text Breaking Jacket)
          </strong>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            यह टेम्पलेट विशेष रूप से बिना फोटो वाली बड़ी और त्वरित ब्रेकिंग खबरों के लिए है। फोटो लेआउट और क्रॉपिंग की आवश्यकता नहीं है।
          </p>
        </div>
      </div>

      {/* 1. 3D & Simple Breaking Badge Styles Selector (9 styles) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-200 block">
            ब्रेकिंग न्यूज़ बैज स्टाइल (9 विकल्प):
          </span>
          <span className="text-[10px] text-yellow-400 font-semibold">
            {card.textBreakingStyle === 'breaking-flat-red'
              ? 'फ्लैट रेड (कम 3D)'
              : card.textBreakingStyle === 'breaking-solid-bar'
              ? 'सॉलिड टीवी बार'
              : card.textBreakingStyle === 'breaking-simple-hi'
              ? 'सादा हिंदी बोल्ड'
              : card.textBreakingStyle === 'breaking-3d-en'
              ? '3D बोल्ड (English)'
              : card.textBreakingStyle === 'breaking-3d-hi'
              ? '3D बोल्ड (Hindi)'
              : card.textBreakingStyle === 'breaking-ribbon'
              ? 'ग्लॉसी रिबन'
              : card.textBreakingStyle === 'breaking-gold'
              ? 'गोल्डन & रेड'
              : card.textBreakingStyle === 'breaking-duotone'
              ? 'डुओटोन'
              : 'एक्सक्लूसिव'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            {
              id: 'breaking-3d-en',
              title: '3D BOLD RED (English)',
              subtitle: 'BREAKING NEWS (सैंपल 3D)',
            },
            {
              id: 'breaking-3d-hi',
              title: '3D BOLD RED (Hindi)',
              subtitle: 'ब्रेकिंग न्यूज़ (हिंदी 3D)',
            },
            {
              id: 'breaking-flat-red',
              title: 'Flat Bold Red (कम 3D)',
              subtitle: 'BREAKING NEWS (Clean)',
            },
            {
              id: 'breaking-solid-bar',
              title: 'Solid TV Red Bar',
              subtitle: 'लाल टीवी प्लेट बार',
            },
            {
              id: 'breaking-simple-hi',
              title: 'Simple Hindi Bold',
              subtitle: 'ब्रेकिंग न्यूज़ (साफ़ हिंदी)',
            },
            {
              id: 'breaking-ribbon',
              title: 'Glossy 3D Ribbon',
              subtitle: '★ BREAKING NEWS ★',
            },
            {
              id: 'breaking-gold',
              title: '⚡ Gold & Red',
              subtitle: 'BIG BREAKING / बड़ी ख़बर',
            },
            {
              id: 'breaking-duotone',
              title: 'Duotone Red/Black',
              subtitle: 'BREAKING / NEWS',
            },
            {
              id: 'breaking-exclusive',
              title: 'Exclusive Gold Pill',
              subtitle: 'EXCLUSIVE + BOLD RED',
            },
          ].map((st) => {
            const isSelected = (card.textBreakingStyle || 'breaking-3d-en') === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  onChange({
                    textBreakingStyle: st.id as TextBreakingBadgeStyle,
                  })
                }
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-red-500 bg-red-500/20 text-white shadow-sm ring-1 ring-red-500/60'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-xs font-black text-white">{st.title}</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">{st.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Badge Text & Size Controls */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-neutral-200">
            कस्टम हेडर शब्द एवं साइज़:
          </span>
          <span className="text-[10px] text-neutral-500">खाली रखने पर डिफ़ॉल्ट दिखेगा</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={card.textBreakingCustomTitle || ''}
            onChange={(e) => onChange({ textBreakingCustomTitle: e.target.value })}
            placeholder="उदा. BREAKING NEWS या बड़ी ख़बर या महा ब्रेकिंग"
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
          {/* Size Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-1 self-start sm:self-auto shrink-0">
            <span className="text-[10px] text-neutral-400 px-1 font-semibold">साइज़:</span>
            {[
              { id: 'sm', label: 'छोटा (SM)' },
              { id: 'md', label: 'सामान्य (MD)' },
              { id: 'lg', label: 'बड़ा (LG)' },
            ].map((sz) => {
              const isSelected = (card.textBreakingTitleSize || 'md') === sz.id;
              return (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => onChange({ textBreakingTitleSize: sz.id as 'sm' | 'md' | 'lg' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {sz.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Background Texture / Tone & Custom Background Upload */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <span className="text-xs font-bold text-neutral-200 block">
          बैकग्राउंड टेक्सचर एवं कस्टम इमेज:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'light-geo', label: '3D ज्यामितीय मेश', sub: 'ABP Live जैसा' },
            { id: 'pure-white', label: 'शुद्ध सफेद', sub: 'साफ़ सुथरा' },
            { id: 'dark-news', label: 'डार्क स्लेट', sub: 'गहरा रंग' },
            { id: 'custom-image', label: '📷 कस्टम फोटो', sub: 'अपनी इमेज अपलोड करें' },
          ].map((bg) => {
            const isSelected = (card.textBreakingBgStyle || 'light-geo') === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() =>
                  onChange({
                    textBreakingBgStyle: bg.id as 'light-geo' | 'pure-white' | 'dark-news' | 'custom-image',
                  })
                }
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-500/15 text-white ring-1 ring-yellow-400/40'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-xs font-bold">{bg.label}</span>
                <span className="text-[10px] text-neutral-400">{bg.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Background Image Upload Box */}
        {card.textBreakingBgStyle === 'custom-image' && (
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>बैकग्राउंड इमेज अपलोड करें:</span>
              </span>
              {card.textBreakingCustomBgUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ textBreakingCustomBgUrl: undefined, textBreakingBgStyle: 'light-geo' })}
                  className="text-[11px] text-red-400 hover:text-red-300 font-medium cursor-pointer"
                >
                  हटाएं (Remove)
                </button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-yellow-400/70 rounded-lg p-3 cursor-pointer transition-all bg-neutral-900/50 group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleTextBreakingBgUpload(file);
                }}
              />
              {card.textBreakingCustomBgUrl ? (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={card.textBreakingCustomBgUrl}
                    alt="Custom Bg"
                    className="w-16 h-16 rounded object-cover border border-neutral-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-yellow-400 font-bold">कस्टम इमेज सक्रिय है</p>
                    <p className="text-[10px] text-neutral-400">दूसरी फोटो बदलने के लिए यहाँ क्लिक करें</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Upload className="w-6 h-6 text-neutral-400 group-hover:text-yellow-400 mx-auto mb-1 transition-colors" />
                  <span className="text-xs text-neutral-300 font-bold block">
                    बैकग्राउंड इमेज चुनें या यहाँ ड्रैग करें
                  </span>
                  <span className="text-[10px] text-neutral-500">JPG, PNG, WebP समर्थित</span>
                </div>
              )}
            </label>
          </div>
        )}
      </div>
    </div>
  );

  // Build formatted headline with [yellow]...[/yellow] tags while strictly preserving line breaks (\n)
  const buildFormattedHeadline = (rawHeadline: string, highlights: string[]) => {
    if (!rawHeadline) return '';
    const cleanHighlights = highlights
      .map((h) => h.trim().replace(/[.,:;!?।\-"'“”‘’()]/g, '').toLowerCase())
      .filter(Boolean);

    if (cleanHighlights.length === 0) {
      return rawHeadline.replace(/\[yellow\]/g, '').replace(/\[\/yellow\]/g, '');
    }

    // Split strictly by lines so line breaks \n are never collapsed or destroyed!
    const lines = rawHeadline.split(/\r?\n/);
    return lines
      .map((line) => {
        // Tokenize line by whitespace
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

  // Split current headline into individual words for quick chip toggling
  const getHeadlineWords = () => {
    return card.headline.split(/\s+/).filter(Boolean);
  };

  const toggleWordHighlight = (word: string) => {
    const cleanWord = word.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim();
    if (!cleanWord) return;

    const exists = card.highlightWords?.some(
      (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
    );

    let newHighlights: string[];
    if (exists) {
      newHighlights = (card.highlightWords || []).filter(
        (hw) => hw.toLowerCase() !== cleanWord.toLowerCase()
      );
    } else {
      newHighlights = [...(card.highlightWords || []), cleanWord];
    }

    const formatted = buildFormattedHeadline(card.headline, newHighlights);

    onChange({
      highlightWords: newHighlights,
      formattedHeadline: formatted,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. फ्रेम टेम्पलेट्स (हेडर स्टाइल चुनें) - STEP 1 */}
      <div
        id="step-frame"
        style={{ scrollMarginTop: '380px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-[380px] ${
          mobileViewMode === 'steps' && activeStep !== 1 ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-yellow-400" />
            स्टेप 1: टेम्पलेट्स (Templates)
          </span>
          <span className="text-xs text-neutral-400 font-medium">
            {currentFrameOptions.find((f) => (card.frameDesign || 'graphic_001') === f.id)?.name || 'फ्रेम स्टाइल'}
          </span>
        </div>

        {/* ==================================================
            CATEGORIZED TEMPLATES BY PLAN (BASIC, ADVANCED, PRO, VIP DESK)
            ================================================== */}
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3.5 space-y-3 shadow-md">
          {/* Header & Current User Tier */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs sm:text-sm text-white">
                टेम्पलेट कैटलॉग (प्लान अनुसार श्रेणियां):
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400">आपका प्लान:</span>
              <span className="px-2 py-0.5 rounded-full font-black uppercase text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {currentUser?.tier ? (currentUser.tier === 'ultra' ? 'VIP DESK' : currentUser.tier.toUpperCase()) : 'BASIC'}
              </span>
              {isAdmin && (
                <span className="px-1.5 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/50 text-[9px] font-bold">
                  ADMIN
                </span>
              )}
            </div>
          </div>

          {/* 8 Frame Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {frameCategoryItems.map((cat) => {
              const isActive = selectedFrameCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedFrameCategory(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 ring-2 ring-yellow-400 shadow-md scale-105'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-black/20 text-current' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Header & Footer Active Banner for Eligible User */}
        {canUseCustomHF && (activeHeaderPng || activeFooterPng) && (
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🏷️</span>
              <div>
                <span className="font-bold text-white block">कस्टम हेडर और फुटर सक्रिय</span>
                <span className="text-[11px] text-purple-300">आपके पैकेज के सभी उपलब्ध फ्रेम्स में आपका कस्टम हेडर/फुटर स्वतः जुड़ा हुआ है।</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeHeaderPng && (
                <div className="w-10 h-6 rounded bg-neutral-900 border border-purple-400 overflow-hidden flex items-center justify-center" title="हेडर सक्रिय">
                  <img src={activeHeaderPng} alt="Header" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              {activeFooterPng && (
                <div className="w-10 h-6 rounded bg-neutral-900 border border-purple-400 overflow-hidden flex items-center justify-center" title="फुटर सक्रिय">
                  <img src={activeFooterPng} alt="Footer" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Frame Designs Grid: Admin sees all, User sees category frames with unlock options */}
        {currentFrameOptions.length === 0 ? (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-neutral-900 to-amber-500/10 text-neutral-200 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>मास्टर निर्देश सक्रिय — सभी पुराने टेम्पलेट्स डिलीट किए गए</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              सिस्टम पूरी तरह से रीसेट हो चुका है। जैसे ही आप <strong>Graphic 1, Graphic 2, Graphic 3...</strong> सैंपल इमेजेज प्रदान करेंगे, उनके अनुसार सटीक लेआउट (Headline, Photo, Logo, Location, Footer) अपनी संबंधित कैटेगरी में लोड हो जाएंगे।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {selectedFrameCategory !== 'Custom Frame' &&
              currentFrameOptions
                .filter((f) => {
                  const cfg = getTemplateConfig(f.id);
                  if (!cfg.isActive) return false;
                  const cat = cfg.category || 'Regular Frame';
                  return cat === selectedFrameCategory;
                })
                .map((f) => {
                  const isSelected = (card.frameDesign || 'graphic_001') === f.id;
                  const isPlanAllowed = isTemplateAvailableForUserPlan(f.id, effectiveTier, effectiveAdmin);
                  const isUnlocked = effectiveAdmin || isPlanAllowed || unlockedFrameIds.includes(f.id);
                  const cfg = getTemplateConfig(f.id);
                  const planDisplay = cfg.allowedPlans.includes('BASIC') 
                    ? { name: 'BASIC', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' }
                    : cfg.allowedPlans.includes('ADVANCED')
                    ? { name: 'ADVANCE', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' }
                    : cfg.allowedPlans.includes('PRO')
                    ? { name: 'PRO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' }
                    : { name: 'VIP', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };

                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        if (isUnlocked) {
                          onChange({ frameDesign: f.id });
                        }
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all relative overflow-hidden select-none ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-500/15 text-white shadow-lg ring-2 ring-yellow-400/40 cursor-pointer'
                          : isUnlocked
                          ? 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 text-neutral-300 hover:bg-neutral-900/60 cursor-pointer'
                          : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-500'
                      }`}
                    >
                      {/* Top Badge Row */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black tracking-wide truncate ${isUnlocked ? 'text-white' : 'text-neutral-400'}`}>
                          {f.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {canUseCustomHF && (activeHeaderPng || activeFooterPng) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Custom H/F
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 ${planDisplay.color}`}
                          >
                            {isUnlocked ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Lock className="w-2.5 h-2.5 text-amber-400" />}
                            <span>{planDisplay.name}</span>
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {f.description}
                      </p>

                      {/* Footer Action / Status Strip */}
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                        {isUnlocked ? (
                          <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {isSelected ? '✓ एक्टिव टेम्पलेट' : 'क्लिक करके चुनें'}
                          </span>
                        ) : cfg.coinPrice && cfg.coinPrice > 0 ? (
                          <button
                            type="button"
                            disabled={isUnlockingFrame === f.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCoinUnlock(f.id, cfg.coinPrice!);
                            }}
                            className="w-full py-1 px-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            <span>🪙</span>
                            <span>{isUnlockingFrame === f.id ? 'अनलॉक हो रहा है...' : `${cfg.coinPrice} सिक्के से अनलॉक करें`}</span>
                          </button>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{planDisplay.name} अपग्रेड आवश्यक</span>
                          </span>
                        )}
                        <span className="text-[9px] text-neutral-500 font-mono shrink-0 ml-1">
                          4:5 अनुपात
                        </span>
                      </div>
                    </div>
                  );
                })}

            {/* Custom Frame Card — visible on Custom Frame category */}
            {selectedFrameCategory === 'Custom Frame' && (
                <div
                  onClick={() => onChange({ frameDesign: 'custom-png', showMasterBranding: false })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative overflow-hidden select-none ${
                    card.frameDesign === 'custom-png'
                      ? 'border-yellow-400 bg-yellow-500/15 text-white shadow-lg ring-2 ring-yellow-400/40'
                      : 'border-purple-500/40 bg-neutral-950/70 hover:border-purple-400 text-neutral-300 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black tracking-wide truncate text-white flex items-center gap-1.5">
                      <span>✨</span>
                      <span>CUSTOM FRAMES (कस्टम फ्रेम PNG)</span>
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 bg-purple-500/20 text-purple-300 border-purple-500/40">
                      PRO / VIP DESK
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {card.customFrameOverlayPng ? 'कस्टम 4:5 ओवरले फ्रेम सक्रिय है।' : 'अपनी बनाई हुई 4:5 कस्टम PNG फ्रेम (1080x1350) अपलोड करें।'}
                  </p>

                  {card.customFrameOverlayPng && (
                    <div className="w-full h-14 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-center overflow-hidden">
                      <img src={card.customFrameOverlayPng} alt="Custom Frame" className="max-h-full object-contain" />
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                    <label className="text-yellow-400 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>{card.customFrameOverlayPng ? 'फ्रेम बदलें' : 'PNG अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFrameOverlayUpload(file);
                        }}
                      />
                    </label>
                    <span className="text-[9px] text-neutral-500 font-mono">1080x1350</span>
                  </div>
                </div>
              )}

            {/* List of Saved Custom Frames */}
            {selectedFrameCategory === 'Custom Frame' &&
              (() => {
                const savedFrames = getCustomFrames(currentUser?.email);
                if (savedFrames.length === 0) return null;
                return savedFrames.map((cf) => {
                  const isApplied = card.customFrameOverlayPng === cf.assetUrl && card.frameDesign === 'custom-png';
                  return (
                    <div
                      key={cf.id}
                      onClick={() =>
                        onChange({
                          frameDesign: 'custom-png',
                          customFrameOverlayPng: cf.assetUrl,
                          showMasterBranding: false,
                        })
                      }
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative overflow-hidden select-none ${
                        isApplied
                          ? 'border-yellow-400 bg-yellow-500/15 text-white shadow-lg ring-2 ring-yellow-400/40'
                          : 'border-slate-800 bg-neutral-950/70 hover:border-yellow-400/60 text-neutral-300 hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black tracking-wide truncate text-white flex items-center gap-1.5">
                          <span>🖼️</span>
                          <span className="truncate">{cf.name}</span>
                        </span>
                        {isApplied && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950">
                            सक्रिय
                          </span>
                        )}
                      </div>
                      <div className="w-full h-16 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-center overflow-hidden">
                        <img src={cf.assetUrl} alt={cf.name} className="max-h-full object-contain" />
                      </div>
                      <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-yellow-400 font-bold">{isApplied ? 'फ्रेम लागू है' : 'फ्रेम लागू करें'}</span>
                        <span className="text-[9px] text-neutral-500 font-mono">4:5 PNG</span>
                      </div>
                    </div>
                  );
                });
              })()}
          </div>
        )}

        {/* Step 1 Mobile Nav Button */}
        {renderMobileStepNavigation(1)}
      </div>

      {/* 2. AI टूल्स - STEP 2 */}
      {card.frameDesign === 'jacket-morning' ? (
        /* Morning Jacket Step 2: AI विचार व बैकग्राउंड */
        <div
          id="step-ai"
          style={{ scrollMarginTop: '380px' }}
          className={`bg-gradient-to-r from-neutral-900 to-neutral-950 border border-yellow-500/20 rounded-xl p-3.5 space-y-3 scroll-mt-[380px] ${
            mobileViewMode === 'steps' && activeStep !== 2 ? 'hidden' : 'block'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              स्टेप 2: AI टूल्स (सुविचार व बैकग्राउंड)
            </span>
          </div>
          <MorningJacketEditor card={card} onChange={onChange} />
          {renderMobileStepNavigation(2)}
        </div>
      ) : (
        /* Standard Templates Step 2: AI ऑटोमेशन टूल्स */
        <div
          id="step-ai"
          style={{ scrollMarginTop: '380px' }}
          className={`bg-gradient-to-r from-neutral-900 to-neutral-950 border border-yellow-500/20 rounded-xl p-4 space-y-3.5 scroll-mt-[380px] ${
            mobileViewMode === 'steps' && activeStep !== 2 ? 'hidden' : 'block'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              स्टेप 2: AI टूल्स (AI न्यूज़ व हेडलाइन ऑटोमेशन)
            </span>
          </div>
          <InlineAiNewsTools
            card={card}
            onChange={onChange}
            onNextStep={() => handleGoToStep(3)}
            onPrevStep={() => handleGoToStep(1)}
            mobileViewMode={mobileViewMode}
            onOpenCloudSettings={onOpenCloudSettings}
            autoFillNews={autoFillNews}
            currentUser={currentUser}
          />
          {renderMobileStepNavigation(2)}
        </div>
      )}

      {card.frameDesign !== 'jacket-morning' && (
        <>
          {/* 3. Headline & Keyword Highlights - STEP 3 */}
      <div
        id="step-headline"
        style={{ scrollMarginTop: '120px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
          mobileViewMode === 'steps' && activeStep !== 3 ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-yellow-400" />
            स्टेप 3: हेडलाइन (मुख्य खबर का शीर्षक)
          </span>
          <div className="flex items-center gap-2">
            {(card.frameDesign as string) !== 'jacket-morning' && (
              <span className="text-[11px] text-neutral-400 font-medium">
                अधिकतम 3 लाइनें
              </span>
            )}
          </div>
        </div>

        {/* Headline Line Formatting Helpers & Counter */}
        {(card.frameDesign as string) === 'jacket-morning' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ morningShowQuotes: !card.morningShowQuotes })}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  card.morningShowQuotes
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                <span>“ ”</span>
                <span>{card.morningShowQuotes ? 'उद्धरण चिह्न (Quotes): चालू' : 'उद्धरण चिह्न: बंद'}</span>
              </button>
            </div>
            <span className="text-[11px] text-amber-300 font-semibold">
              * यह शीर्षक सीधे मॉर्निंग कार्ड के सबसे ऊपर दिखेगा
            </span>
          </div>
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const raw = (card.headline || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
                if (!raw) return;
                const words = raw.split(' ').filter(Boolean);
                if (words.length < 3) return;

                let break1 = -1;
                for (let i = 0; i < words.length - 2; i++) {
                  if (words[i].endsWith(':') || words[i].endsWith(';') || words[i] === ':' || words[i] === '-') {
                    break1 = i + 1;
                    break;
                  }
                }
                if (break1 === -1 || break1 > Math.ceil(words.length * 0.55)) {
                  const target1 = Math.round(words.length / 3);
                  break1 = target1;
                  for (let i = Math.max(1, target1 - 2); i <= Math.min(words.length - 2, target1 + 2); i++) {
                    if (words[i].endsWith(',') || words[i].endsWith(';')) {
                      break1 = i + 1;
                      break;
                    }
                  }
                }

                const remainingWords = words.length - break1;
                let break2 = break1 + Math.round(remainingWords / 2);
                for (let i = break1 + 1; i < words.length - 1; i++) {
                  if (words[i].endsWith(',') || words[i].endsWith(';') || words[i].endsWith(':')) {
                    break2 = i + 1;
                    break;
                  }
                }

                const line1 = words.slice(0, break1).join(' ');
                const line2 = words.slice(break1, break2).join(' ');
                const line3 = words.slice(break2).join(' ');
                const formatted = `${line1}\n${line2}\n${line3}`;

                onChange({
                  headline: formatted,
                  formattedHeadline: formatted,
                });
              }}
              className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black rounded-lg text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
              title="हेडलाइन को संतुलित 3 लाइनों में विभाजित करें"
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
              <span>✨ 3 लाइनें</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const raw = (card.headline || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
                if (!raw) return;
                const words = raw.split(' ').filter(Boolean);
                if (words.length < 2) return;

                const half = Math.round(words.length / 2);
                let breakIdx = half;
                for (let i = Math.max(1, half - 2); i <= Math.min(words.length - 2, half + 2); i++) {
                  if (words[i].endsWith(':') || words[i].endsWith(',') || words[i].endsWith(';')) {
                    breakIdx = i + 1;
                    break;
                  }
                }

                const line1 = words.slice(0, breakIdx).join(' ');
                const line2 = words.slice(breakIdx).join(' ');
                const formatted = `${line1}\n${line2}`;

                onChange({
                  headline: formatted,
                  formattedHeadline: formatted,
                });
              }}
              className="px-2.5 py-1 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-lg text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
              title="हेडलाइन को संतुलित 2 लाइनों में विभाजित करें"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>✨ 2 लाइनें</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const single = (card.headline || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
                onChange({
                  headline: single,
                  formattedHeadline: single,
                });
              }}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-lg text-xs transition-all cursor-pointer"
              title="लाइन ब्रेक हटाकर 1 लाइन करें"
            >
              1 लाइन (ऑटो)
            </button>
          </div>

          {/* Line Count Indicator */}
          {(() => {
            const count = (card.headline || '').split(/\r?\n/).filter((l) => l.trim().length > 0).length;
            return (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  count === 3
                    ? 'bg-green-950 text-green-400 border-green-700/60'
                    : count === 2
                    ? 'bg-blue-950 text-blue-400 border-blue-700/60'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {count === 3 ? '✅ 3 लाइनें सेट हैं' : count === 2 ? '⚡ 2 लाइनें सेट हैं (3rd के लिए Enter दबाएं)' : '1 लाइन (ऑटो रैप)'}
              </span>
            );
          })()}
        </div>
        )}

        {/* Textarea for headline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-400 font-medium">
              हिंदी समाचार हेडलाइन (आप जहां चाहें वहां <b>Enter</b> दबाकर 3 लाइनें बना सकते हैं):
            </label>
            <VoiceInputButton
              onTranscript={(transcript) => {
                const current = card.headline ? `${card.headline} ${transcript}` : transcript;
                onChange({
                  headline: current,
                  formattedHeadline: current,
                });
              }}
              title="बोलकर हेडलाइन लिखें (Voice Typing)"
            />
          </div>
          <textarea
            rows={3}
            value={card.headline}
            onChange={(e) => {
              const newHeadline = e.target.value;
              onChange({
                headline: newHeadline,
                formattedHeadline: newHeadline, // reset formatted
              });
            }}
            placeholder="यहाँ अपनी मुख्य खबर की हेडलाइन दर्ज करें (उदा. कृपया स्टेप 5 में जाकर अपनी मुख्य खबर का शीर्षक दर्ज करें...)"
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-base text-white font-['Baloo_2'] focus:border-yellow-400 focus:outline-none leading-relaxed"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            💡 <b>सुझाव:</b> हेडलाइन को 3 लाइनों में करने के लिए कीबोर्ड पर <b>Enter</b> दबाकर लाइन तोड़ सकते हैं, या ऊपर <b>'3 लाइनों में बांटें'</b> बटन पर क्लिक करें। माइक बटन से बोलकर भी टाइप कर सकते हैं।
          </p>
        </div>

        {/* Quote Speaker Attribution Input (for Quote Jacket) */}
        {card.frameDesign === 'jacket-quote' && (() => {
          const detected = extractLeaderFromHeadline(card.headline || '');
          const effective = getEffectiveSpeaker(card.speakerName, card.speakerTitle, card.headline);

          return (
            <div className="p-3 bg-neutral-950 border border-yellow-500/40 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>वक्ता / नेता का नाम व पद (बयान कोटेशन):</span>
                </span>
                {detected.name && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        speakerName: detected.name,
                        speakerTitle: detected.title,
                      })
                    }
                    className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-400/15 hover:bg-yellow-400/25 border border-yellow-400/30 px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>ऑटो-डिटेक्ट: {detected.name}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-neutral-400">वक्ता का नाम:</label>
                    <VoiceInputButton
                      onTranscript={(transcript) => onChange({ speakerName: transcript })}
                      title="बोलकर नाम लिखें"
                    />
                  </div>
                  <input
                    type="text"
                    value={card.speakerName || ''}
                    onChange={(e) => onChange({ speakerName: e.target.value })}
                    placeholder={detected.name ? `उदा. ${detected.name}` : 'उदा. दिग्विजय सिंह'}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-neutral-400">पद / पदवी / परिचय:</label>
                    <VoiceInputButton
                      onTranscript={(transcript) => onChange({ speakerTitle: transcript })}
                      title="बोलकर पद लिखें"
                    />
                  </div>
                  <input
                    type="text"
                    value={card.speakerTitle || ''}
                    onChange={(e) => onChange({ speakerTitle: e.target.value })}
                    placeholder={detected.title ? `उदा. ${detected.title}` : 'उदा. पूर्व मुख्यमंत्री'}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick leader preset chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 block font-medium">त्वरित चयन (Quick Pick):</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: 'दिग्विजय सिंह', title: 'पूर्व मुख्यमंत्री' },
                    { name: 'डॉ. मोहन यादव', title: 'मुख्यमंत्री, मप्र' },
                    { name: 'शिवराज सिंह चौहान', title: 'केंद्रीय मंत्री' },
                    { name: 'कमलनाथ', title: 'पूर्व मुख्यमंत्री' },
                    { name: 'अनिरुद्धाचार्य महाराज', title: 'कथावाचक' },
                    { name: 'पंडित धीरेंद्र शास्त्री', title: 'पीठाधीश्वर' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        onChange({
                          speakerName: preset.name,
                          speakerTitle: preset.title,
                        })
                      }
                      className="text-[10px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-400/50 text-neutral-300 hover:text-white px-2 py-0.5 rounded transition-all cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] bg-neutral-900/90 border border-neutral-800 rounded p-1.5 text-neutral-300 flex items-center justify-between">
                <span>कार्ड पर दिखेगा:</span>
                <span className="font-bold text-white">
                  {effective.name ? `— ${effective.name}${effective.title ? ` | ${effective.title}` : ''}` : 'खाली (प्रदर्शित नहीं होगा)'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Headline Font Family Selector */}
        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-yellow-400" />
              <span>हेडलाइन फ़ॉन्ट (Devanagari Font):</span>
              <span className="text-yellow-400 font-mono text-[11px] font-bold px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                {currentActiveFont}
              </span>
            </div>

            {/* Custom Font Upload Button right alongside fonts */}
            {canUploadCustomFont ? (
              <label className="text-[10px] bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/50 hover:border-yellow-400 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>+ कस्टम फ़ॉन्ट (VIP Desk)</span>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,font/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                        const newFont = await registerCustomFont(fontName, file);
                        onChange({ headlineFontFamily: newFont.name });
                        alert(`कस्टम फ़ॉन्ट "${fontName}" सफलतापूर्वक अपलोड व लागू किया गया!`);
                      } catch (err: any) {
                        alert(`फ़ॉन्ट अपलोड विफल: ${err.message || err}`);
                      }
                    }
                  }}
                />
              </label>
            ) : (
              <div
                className="text-[10px] bg-neutral-900/80 text-neutral-500 border border-neutral-850 px-2 py-1 rounded-md font-medium flex items-center gap-1 opacity-70 cursor-not-allowed select-none"
                title="कस्टम फ़ॉन्ट अपलोड केवल VIP Desk पैकेज में उपलब्ध है"
              >
                <Lock className="w-3 h-3 text-neutral-500" />
                <span>+ कस्टम फ़ॉन्ट (🔒 केवल VIP Desk)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {allHeadlineFontChoices.map((f) => {
              const isAllowed = isFontAllowedForTier(f.id, effectiveTier, effectiveAdmin);
              const isSel = currentActiveFont === f.id;
              const tierBadge = (f as any).isCustom ? 'VIP Desk' : f.badge;

              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => {
                    if (isAllowed) {
                      onChange({ headlineFontFamily: f.id });
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-all relative truncate flex items-center justify-between ${
                    isSel
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-black ring-1 ring-yellow-400/50'
                      : isAllowed
                      ? 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 text-neutral-300 cursor-pointer'
                      : 'border-neutral-900 bg-neutral-950/60 text-neutral-600 opacity-60 cursor-not-allowed select-none pointer-events-none'
                  }`}
                  style={{ fontFamily: `'${f.id}', sans-serif` }}
                  title={isAllowed ? f.label : `${f.label} (${tierBadge} पैकेज आवश्यक)`}
                >
                  <span className="text-[11px] truncate">{f.label}</span>
                  {!isAllowed && (
                    <span className="ml-1 flex items-center text-[9px] font-sans font-bold text-amber-500/80 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800 shrink-0">
                      <Lock className="w-2.5 h-2.5 mr-0.5 inline" />
                      {tierBadge}
                    </span>
                  )}
                  {isAllowed && isSel && (
                    <Check className="w-3 h-3 text-yellow-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Headline Font Size Slider & Alignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
          {/* Font Size Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-yellow-400" />
                <span>फ़ॉन्ट साइज (Size):</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      headlineFontSize: Math.max(14, (card.headlineFontSize || 20) - 1),
                    })
                  }
                  className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                  title="1px छोटा करें"
                >
                  -
                </button>
                <span className="text-yellow-400 font-mono text-[11px] font-bold px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                  {card.headlineFontSize || 20}px
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      headlineFontSize: Math.min(48, (card.headlineFontSize || 20) + 1),
                    })
                  }
                  className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                  title="1px बड़ा करें"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="14"
                max="48"
                step="1"
                value={card.headlineFontSize || 20}
                onChange={(e) => onChange({ headlineFontSize: Number(e.target.value) })}
                className="flex-1 accent-yellow-400 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
              <span>छोटा (14px)</span>
              <span className="text-amber-400 font-bold">डिफ़ॉल्ट (20px)</span>
              <span>बड़ा (48px)</span>
            </div>
          </div>
        </div>

        {/* Interactive Manual Word Highlighting System */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 space-y-2.5">
          <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-yellow-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              हाइलाइट करने के लिए शब्द (चयनित रंग में दिखेंगे):
            </span>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-[10px] font-bold">
                {card.highlightWords?.length || 0} शब्द हाइलाइटेड
              </span>
              {(card.highlightWords?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      highlightWords: [],
                      formattedHeadline: card.headline.replace(/\[yellow\]/g, '').replace(/\[\/yellow\]/g, ''),
                    });
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                >
                  सब हटाएं (Clear)
                </button>
              )}
            </div>
          </div>

          {/* Highlight Color Picker */}
          {effectiveTier === 'basic' && !effectiveAdmin ? (
            <div className="p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800 text-[11px] text-amber-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>🔒 हेडलाइन कीवर्ड हाइलाइट केवल एडवांस, प्रो और वीआईपी डेस्क में उपलब्ध है।</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800">
              <span className="text-[11px] text-neutral-300 font-semibold flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-yellow-400" />
                <span>हाइलाइट रंग:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(effectiveTier === 'advanced' && !effectiveAdmin
                  ? HIGHLIGHT_COLOR_PRESETS.slice(0, 5)
                  : HIGHLIGHT_COLOR_PRESETS
                ).map((hc) => {
                  const isSel = (card.highlightColor || '#FFE600').toUpperCase() === hc.color.toUpperCase();
                  return (
                    <button
                      key={hc.color}
                      type="button"
                      onClick={() => onChange({ highlightColor: hc.color })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSel ? 'ring-2 ring-yellow-400 font-black scale-105 shadow-sm' : 'border-neutral-700 opacity-90'
                      } ${hc.bg} ${hc.text}`}
                    >
                      <span>{hc.label}</span>
                      {isSel && <span>✓</span>}
                    </button>
                  );
                })}
                {/* Custom Color Picker: strictly for VIP DESK and Admin */}
                {(effectiveAdmin || effectiveTier === 'ultra') && (
                  <label className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] font-bold text-neutral-300 cursor-pointer hover:border-neutral-500" title="कस्टम रंग चुनें">
                    <input
                      type="color"
                      value={card.highlightColor || '#FFE600'}
                      onChange={(e) => onChange({ highlightColor: e.target.value })}
                      className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span>कस्टम</span>
                  </label>
                )}
                {/* Pro & VIP Desk: Set as Primary Highlight Color button */}
                {(effectiveAdmin || effectiveTier === 'professional' || effectiveTier === 'ultra') && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('primary_highlight_color', card.highlightColor || '#FFE600');
                      alert(`प्राथमिक हाइलाइट रंग (${card.highlightColor || '#FFE600'}) सेव हो गया है।`);
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold hover:bg-amber-500/30 cursor-pointer"
                    title="इस रंग को अपना डिफ़ॉल्ट हाइलाइट रंग बनाएं"
                  >
                    ★ प्राथमिक बनाएं
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Direct Manual Input to customize or type words */}
          <div>
            <input
              type="text"
              value={(card.highlightWords || []).join(', ')}
              onChange={(e) => {
                const raw = e.target.value;
                const newWords = raw
                  .split(/[,،]+/)
                  .map((w) => w.trim())
                  .filter(Boolean);
                const formatted = buildFormattedHeadline(card.headline, newWords);
                onChange({
                  highlightWords: newWords,
                  formattedHeadline: formatted,
                });
              }}
              placeholder="उदा. सड़क हादसा, 15 की मौत (कॉमा लगाकर शब्द लिखें)"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-yellow-300 focus:border-yellow-400 focus:outline-none font-bold"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              * अपनी पसंद का कोई भी शब्द यहां कॉमा (,) लगाकर टाइप करें, या नीचे हेडलाइन के शब्दों पर क्लिक करें:
            </p>
          </div>

          {/* Clickable Word Chips from Headline */}
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-neutral-900 rounded-lg border border-neutral-800">
            {getHeadlineWords().map((word, wIdx) => {
              const clean = word.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim();
              const isSelected = (card.highlightWords || []).some(
                (hw) => hw.toLowerCase() === clean.toLowerCase()
              );
              return (
                <button
                  key={`${word}-${wIdx}`}
                  type="button"
                  onClick={() => toggleWordHighlight(word)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-400 text-neutral-950 shadow-sm font-extrabold ring-1 ring-yellow-400'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                  title={isSelected ? 'क्लिक करके हाइलाइट हटाएं' : 'क्लिक करके पीला रंग दें'}
                >
                  {word} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Custom Text Overlays (Custom Fonts, Colors & Badges) */}
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-yellow-400" />
              <span>कस्टम टेक्स्ट व फ़ॉन्ट टूल्स (Custom Text, Fonts & Colors)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                const newId = `txt_${Date.now()}`;
                const newOverlay = {
                  id: newId,
                  text: 'विशेष बुलेटिन',
                  fontFamily: 'Baloo 2',
                  color: '#FFFFFF',
                  backgroundColor: '#DC2626',
                  fontSize: 24,
                  isBold: true,
                  x: 50,
                  y: 45,
                };
                onChange({
                  customTextOverlays: [...(card.customTextOverlays || []), newOverlay],
                });
              }}
              className="py-1 px-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition shadow-sm active:scale-95"
            >
              <span>+ नया टेक्स्ट जोड़ें</span>
            </button>
          </div>

          {(!card.customTextOverlays || card.customTextOverlays.length === 0) ? (
            <p className="text-xs text-neutral-500 py-1 italic">
              कार्ड पर अतिरिक्त टेक्स्ट, कस्टम फ़ॉन्ट, रंगीन पट्टी या स्टिकर जोड़ने के लिए ऊपर "+ नया टेक्स्ट जोड़ें" दबाएं।
            </p>
          ) : (
            <div className="space-y-3">
              {card.customTextOverlays.map((item, index) => (
                <div key={item.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
                  {/* Top bar with Label and Delete */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <span>🏷️ टेक्स्ट #{index + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          customTextOverlays: card.customTextOverlays?.filter((t) => t.id !== item.id),
                        });
                      }}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 cursor-pointer transition"
                      title="हटाएं (Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const updated = card.customTextOverlays?.map((t) =>
                        t.id === item.id ? { ...t, text: e.target.value } : t
                      );
                      onChange({ customTextOverlays: updated });
                    }}
                    placeholder="कस्टम टेक्स्ट यहाँ लिखें..."
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 focus:outline-none"
                    style={{ fontFamily: `'${item.fontFamily || 'Baloo 2'}', sans-serif` }}
                  />

                  {/* Font Family Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold block mb-0.5">फ़ॉन्ट (Font):</label>
                      <select
                        value={item.fontFamily || (isBasicUser ? 'Hind' : 'Baloo 2')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!isFontAllowedForTier(val, effectiveTier, effectiveAdmin)) return;
                          const updated = card.customTextOverlays?.map((t) =>
                            t.id === item.id ? { ...t, fontFamily: val } : t
                          );
                          onChange({ customTextOverlays: updated });
                        }}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-1.5 text-xs text-white focus:border-yellow-400 focus:outline-none cursor-pointer"
                      >
                        {allHeadlineFontChoices.map((f) => {
                          const isAllowed = isFontAllowedForTier(f.id, effectiveTier, effectiveAdmin);
                          const tierBadge = (f as any).isCustom ? 'VIP Desk' : f.badge;
                          return (
                            <option
                              key={f.id}
                              value={f.id}
                              disabled={!isAllowed}
                              className={!isAllowed ? 'text-neutral-500 bg-neutral-900' : 'text-white bg-neutral-950'}
                            >
                              {f.label}{!isAllowed ? ` 🔒 (${tierBadge})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Font Size & Bold */}
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 font-semibold mb-0.5">
                        <span>साइज: {item.fontSize}px</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isBold !== false}
                            onChange={(e) => {
                              const updated = card.customTextOverlays?.map((t) =>
                                t.id === item.id ? { ...t, isBold: e.target.checked } : t
                              );
                              onChange({ customTextOverlays: updated });
                            }}
                            className="accent-yellow-400 w-3 h-3"
                          />
                          <span>बोल्ड (Bold)</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="56"
                        value={item.fontSize}
                        onChange={(e) => {
                          const updated = card.customTextOverlays?.map((t) =>
                            t.id === item.id ? { ...t, fontSize: Number(e.target.value) } : t
                          );
                          onChange({ customTextOverlays: updated });
                        }}
                        className="w-full accent-yellow-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Colors: Text Color & Background Pill Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Text Color */}
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold block mb-1">टेक्स्ट का रंग:</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['#FFFFFF', '#FFE600', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#000000'].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              const updated = card.customTextOverlays?.map((t) =>
                                t.id === item.id ? { ...t, color: col } : t
                              );
                              onChange({ customTextOverlays: updated });
                            }}
                            className={`w-5 h-5 rounded-full border border-neutral-600 transition cursor-pointer ${
                              item.color === col ? 'ring-2 ring-yellow-400 scale-110' : ''
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                        <input
                          type="color"
                          value={item.color || '#FFFFFF'}
                          onChange={(e) => {
                            const updated = card.customTextOverlays?.map((t) =>
                              t.id === item.id ? { ...t, color: e.target.value } : t
                            );
                            onChange({ customTextOverlays: updated });
                          }}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                          title="कस्टम रंग"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold block mb-1">बैकग्राउंड पट्टी:</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { col: 'transparent', label: 'सादा' },
                          { col: '#DC2626', label: 'लाल' },
                          { col: '#0F172A', label: 'नेवी' },
                          { col: '#D97706', label: 'गोल्ड' },
                          { col: '#000000', label: 'काला' },
                          { col: '#FFFFFF', label: 'सफ़ेद' },
                        ].map((bg) => (
                          <button
                            key={bg.col}
                            type="button"
                            onClick={() => {
                              const updated = card.customTextOverlays?.map((t) =>
                                t.id === item.id ? { ...t, backgroundColor: bg.col } : t
                              );
                              onChange({ customTextOverlays: updated });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${
                              (item.backgroundColor || 'transparent') === bg.col
                                ? 'bg-yellow-400 text-neutral-950 border-yellow-400'
                                : 'bg-neutral-950 text-neutral-400 border-neutral-700'
                            }`}
                          >
                            {bg.label}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-1">
                          <input
                            type="color"
                            value={item.backgroundColor && item.backgroundColor !== 'transparent' ? item.backgroundColor : '#DC2626'}
                            onChange={(e) => {
                              const updated = card.customTextOverlays?.map((t) =>
                                t.id === item.id ? { ...t, backgroundColor: e.target.value } : t
                              );
                              onChange({ customTextOverlays: updated });
                            }}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                            title="कस्टम बैकग्राउंड रंग चुनें"
                          />
                          <span className="text-[9px] text-neutral-400 font-mono">
                            {item.backgroundColor && item.backgroundColor !== 'transparent' ? item.backgroundColor : 'कस्टम'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Position Sliders & Quick Placement */}
                  <div className="space-y-1.5 pt-1 border-t border-neutral-800 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>पोजीशन (X: {item.x}% | Y: {item.y}%):</span>
                      <div className="flex items-center gap-1">
                        {[
                          { label: '↖️ टॉप', x: 25, y: 18 },
                          { label: '↗️ राइट', x: 75, y: 18 },
                          { label: '🎯 मध्य', x: 50, y: 45 },
                          { label: '🏷️ लोअर', x: 50, y: 70 },
                        ].map((pos) => (
                          <button
                            key={pos.label}
                            type="button"
                            onClick={() => {
                              const updated = card.customTextOverlays?.map((t) =>
                                t.id === item.id ? { ...t, x: pos.x, y: pos.y } : t
                              );
                              onChange({ customTextOverlays: updated });
                            }}
                            className="px-1.5 py-0.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[9px] cursor-pointer"
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={item.x}
                        onChange={(e) => {
                          const updated = card.customTextOverlays?.map((t) =>
                            t.id === item.id ? { ...t, x: Number(e.target.value) } : t
                          );
                          onChange({ customTextOverlays: updated });
                        }}
                        className="w-full accent-yellow-400 cursor-pointer"
                        title="दाएं-बाएं (X)"
                      />
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={item.y}
                        onChange={(e) => {
                          const updated = card.customTextOverlays?.map((t) =>
                            t.id === item.id ? { ...t, y: Number(e.target.value) } : t
                          );
                          onChange({ customTextOverlays: updated });
                        }}
                        className="w-full accent-yellow-400 cursor-pointer"
                        title="ऊपर-नीचे (Y)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3 Nav Buttons */}
        {renderMobileStepNavigation(3)}
      </div>

      

          {/* 4. Photo Upload & Layout Configuration - STEP 4 */}
          <div
            id="step-photo"
            style={{ scrollMarginTop: '120px' }}
            className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
              mobileViewMode === 'steps' && activeStep !== 4 ? 'hidden' : 'block'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-yellow-400" />
                स्टेप 4: फोटो व वॉटरमार्क
              </span>
          <span className="text-xs text-yellow-400 font-medium">
            {(card.frameDesign as string) === 'jacket-morning'
              ? '🌅 मॉर्निंग जैकेट (नो फोटो लेआउट)'
              : (card.frameDesign as string) === 'jacket-text-breaking'
              ? '⚡ 100% टेक्स्ट-ड्रिवन (नो फोटो)'
              : card.layout === 'single'
              ? '1 फोटो (सिंगल)'
              : card.layout === 'split-v'
              ? '2 फोटो (35-65 अप & डाउन)'
              : card.layout === 'double'
              ? '2 फोटो (50-50 अप & डाउन)'
              : card.layout === 'double-h' || card.layout === 'split-h'
              ? '2 फोटो (लेफ्ट-राइट)'
              : card.layout === 'grid-3'
              ? '3 फोटो (2 ऊपर, 1 नीचे)'
              : card.layout === 'grid-3-bottom'
              ? '3 फोटो (1 ऊपर, 2 नीचे)'
              : card.layout === 'grid-4'
              ? '4 फोटो (2 ऊपर, 2 नीचे ग्रिड)'
              : card.layout === 'full'
              ? 'फुल स्क्रीन इमेज'
              : 'गोल सर्कल (सर्कल पोर्ट्रेट)'}
          </span>
        </div>

        {card.frameDesign === 'jacket-text-breaking' ? (
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-dashed border-neutral-800 text-center py-6 space-y-1.5">
            <span className="text-2xl block">⚡</span>
            <h4 className="text-xs font-bold text-neutral-200">
              टेक्स्ट ब्रेकिंग जैकेट (100% टेक्स्ट आधारित लेआउट)
            </h4>
            <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
              इस टेम्पलेट में फोटो लेआउट की आवश्यकता नहीं है। 9 बैज स्टाइल्स, कस्टम हेडर शब्द एवं बैकग्राउंड टेक्सचर आप ऊपर <b>स्टेप 1</b> में सेट कर सकते हैं।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
        {/* Layout Selector Buttons */}
        {card.frameDesign === 'jacket-quote' ? (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-300 flex items-start gap-2.5">
              <span className="text-base">📌</span>
              <div>
                <strong className="block text-yellow-300 font-bold mb-0.5">
                  बयान एवं कोटेशन टेम्पलेट: केवल सिंगल फोटो अनुमत
                </strong>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  इस टेम्पलेट में केवल 1 मुख्य फोटो (सिंगल इमेज) ही कार्य करेगी। नीचे का 50% भाग बयान और वक्ता की जानकारी के लिए आरक्षित है।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-4 py-2.5 rounded-lg text-xs font-bold border border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm flex items-center gap-2">
                <span>📷 1 इमेज (सिंगल फोटो मोड)</span>
                <span className="text-[10px] bg-yellow-400 text-neutral-950 font-black px-1.5 py-0.5 rounded">
                  सक्रिय (Active)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Primary Layout Selection Tabs: 1 Image vs 2 Image vs Multi Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onChange({ layout: 'single' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                  card.layout === 'single' || card.layout === 'full'
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm ring-1 ring-yellow-400/40'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-yellow-400" />
                  <span>1 इमेज (Single)</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">सिंगल फुल स्क्रीन</span>
              </button>

              {effectiveTier === 'basic' && !effectiveAdmin ? (
                <div className="py-2.5 px-3 rounded-xl text-xs font-bold border border-neutral-800 bg-neutral-950/60 text-neutral-500 flex flex-col items-center justify-center gap-1 cursor-not-allowed select-none">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                    <span>2 इमेज (Locked)</span>
                  </div>
                  <span className="text-[9px] text-amber-500/80">एडवांस/प्रो में उपलब्ध</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const targetLayout = (card.layout === 'double' || card.layout === 'double-h' || card.layout === 'split-h')
                      ? card.layout
                      : 'split-v';
                    const updates: Partial<NewsCardData> = { layout: targetLayout };
                    const availablePhotos = card.extractedArticlePhotos || [];
                    const secondPhoto = (card.images?.second && card.images.second !== card.images.main)
                      ? card.images.second
                      : (availablePhotos[1] && availablePhotos[1] !== card.images.main ? availablePhotos[1] : card.images?.second);
                    if (secondPhoto && secondPhoto !== card.images?.second) {
                      updates.images = { ...card.images, second: secondPhoto };
                    }
                    onChange(updates);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    card.layout === 'split-v' || card.layout === 'double' || card.layout === 'double-h' || card.layout === 'split-h'
                      ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm ring-1 ring-yellow-400/40'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-yellow-400" />
                    <span>2 इमेज (Two Photos)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">2 फोटो अलग स्लॉट</span>
                </button>
              )}

              {(effectiveTier === 'basic' || effectiveTier === 'advanced') && !effectiveAdmin ? (
                <div className="py-2.5 px-3 rounded-xl text-xs font-bold border border-neutral-800 bg-neutral-950/60 text-neutral-500 flex flex-col items-center justify-center gap-1 cursor-not-allowed select-none col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                    <span>मल्टी ग्रिड (Locked)</span>
                  </div>
                  <span className="text-[9px] text-amber-500/80">प्रो/वीआईपी में उपलब्ध</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const targetLayout = (card.layout === 'grid-3-bottom' || card.layout === 'grid-4')
                      ? card.layout
                      : 'grid-3';
                    const updates: Partial<NewsCardData> = { layout: targetLayout };
                    const availablePhotos = card.extractedArticlePhotos || [];
                    const newImages = { ...card.images };
                    let changed = false;
                    if ((!newImages.second || newImages.second === newImages.main) && availablePhotos[1]) {
                      newImages.second = availablePhotos[1];
                      changed = true;
                    }
                    if ((!newImages.third || newImages.third === newImages.main) && availablePhotos[2]) {
                      newImages.third = availablePhotos[2];
                      changed = true;
                    }
                    if (changed) updates.images = newImages;
                    onChange(updates);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border col-span-2 sm:col-span-1 ${
                    card.layout === 'grid-3' || card.layout === 'grid-3-bottom' || card.layout === 'grid-4'
                      ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm ring-1 ring-yellow-400/40'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-yellow-400" />
                    <span>मल्टी ग्रिड (3-4)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">3 या 4 तस्वीरें</span>
                </button>
              )}
            </div>

            {/* Sub-variant selector for 2 Images */}
            {(card.layout === 'split-v' || card.layout === 'double' || card.layout === 'double-h' || card.layout === 'split-h') && (
              <div className="p-2.5 bg-neutral-950 rounded-xl border border-yellow-500/30 space-y-2">
                <div className="text-[11px] font-bold text-yellow-300 flex items-center justify-between">
                  <span>2 इमेज स्टाइल चुनें:</span>
                  <span className="text-[10px] text-neutral-400">नीचे 2 अलग फोटो स्लॉट सक्रिय हैं</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'split-v' as CardLayout, label: '35-65 अप-डाउन', desc: '35% ऊपर, 65% नीचे' },
                    { id: 'double' as CardLayout, label: '50-50 अप-डाउन', desc: '50% ऊपर, 50% नीचे' },
                    { id: 'double-h' as CardLayout, label: '50-50 L-R', desc: 'लेफ्ट-राइट' },
                  ].map((l) => {
                    const isSelected = card.layout === l.id || (l.id === 'double-h' && card.layout === 'split-h');
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          const updates: Partial<NewsCardData> = { layout: l.id };
                          const availablePhotos = card.extractedArticlePhotos || [];
                          if ((!card.images?.second || card.images.second === card.images.main) && availablePhotos[1]) {
                            updates.images = { ...card.images, second: availablePhotos[1] };
                          }
                          onChange(updates);
                        }}
                        className={`p-2 rounded-lg text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm font-bold'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-[11px]">{l.label}</span>
                        <span className="text-[9px] opacity-75">{l.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-variant selector for Multi Grid */}
            {(card.layout === 'grid-3' || card.layout === 'grid-3-bottom' || card.layout === 'grid-4') && (
              <div className="p-2.5 bg-neutral-950 rounded-xl border border-yellow-500/30 space-y-2">
                <div className="text-[11px] font-bold text-yellow-300">
                  मल्टी ग्रिड स्टाइल चुनें:
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'grid-3' as CardLayout, label: '3 इमेज (2-1)', desc: '2 ऊपर, 1 नीचे' },
                    { id: 'grid-3-bottom' as CardLayout, label: '3 इमेज (1-2)', desc: '1 ऊपर, 2 नीचे' },
                    { id: 'grid-4' as CardLayout, label: '4 इमेज (2x2)', desc: '4 फोटो ग्रिड' },
                  ].map((l) => {
                    const isSelected = card.layout === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          const updates: Partial<NewsCardData> = { layout: l.id };
                          const availablePhotos = card.extractedArticlePhotos || [];
                          const newImages = { ...card.images };
                          let changed = false;
                          if ((!newImages.second || newImages.second === newImages.main) && availablePhotos[1]) {
                            newImages.second = availablePhotos[1];
                            changed = true;
                          }
                          if ((!newImages.third || newImages.third === newImages.main) && availablePhotos[2]) {
                            newImages.third = availablePhotos[2];
                            changed = true;
                          }
                          if (changed) updates.images = newImages;
                          onChange(updates);
                        }}
                        className={`p-2 rounded-lg text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm font-bold'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-[11px]">{l.label}</span>
                        <span className="text-[9px] opacity-75">{l.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Photo Slots Workspace */}
            <div className="pt-2 border-t border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span>
                    {card.layout === 'single' || card.layout === 'full'
                      ? 'फोटो वर्कस्पेस (1 Photo Slot)'
                      : card.layout === 'split-v' || card.layout === 'double' || card.layout === 'double-h' || card.layout === 'split-h'
                      ? 'फोटो वर्कस्पेस (2 Photo Slots)'
                      : 'फोटो वर्कस्पेस (मल्टी फोटो स्लॉट)'}
                  </span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  चयनित फोटो यहाँ लाइव प्रीव्यू होगी
                </span>
              </div>

              {/* Step 4 Auto-Fit and Slider Instructions */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5 shadow-sm">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>ऑटो-फिट सिस्टम:</strong> अपलोड की गई फोटो फ्रेम में अपने आप स्वतः फिट (Auto-fit) हो जाती है। यदि आप फोटो की स्थिति या आकार को एडजस्ट करना चाहते हैं, तो नीचे दिए गए <strong>ज़ूम व पोजीशनिंग स्लाइडर्स</strong> का उपयोग करें।
                </span>
              </div>

              {/* EXTRACTED ARTICLE MULTI-PHOTO SELECTOR */}
              {card.extractedArticlePhotos && card.extractedArticlePhotos.length > 1 && (
                <div className="p-3 bg-neutral-950 border border-yellow-500/40 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-yellow-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>लेख की लिंक में उपलब्ध फोटोज़ ({card.extractedArticlePhotos.length}):</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">टच करके प्राइमरी फोटो बदलें</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {card.extractedArticlePhotos.map((photoUrl, pIdx) => {
                      const isSelected = card.images?.main === photoUrl || card.photoUrl === photoUrl;
                      return (
                        <button
                          key={`ext-photo-${pIdx}`}
                          type="button"
                          onClick={() => {
                            onChange({
                              photoUrl,
                              images: {
                                ...card.images,
                                main: photoUrl,
                              },
                            });
                          }}
                          className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-yellow-400 ring-2 ring-yellow-400/50 scale-105 shadow-lg'
                              : 'border-neutral-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={photoUrl} alt={`Extracted Photo ${pIdx + 1}`} className="w-full h-full object-cover" onError={handleThumbnailImgError} />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-black text-center text-yellow-300 py-0.5">
                            फोटो {pIdx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SINGLE PHOTO WORKSPACE: Exactly 1 Photo Slot */}
              {(card.layout === 'single' || card.layout === 'full' || (card.frameDesign as string) === 'jacket-quote') && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                      <span>मुख्य फोटो (Photo Slot 1)</span>
                    </span>
                    <span className="text-yellow-400 text-[10px] font-bold bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                      सिंगल फोटो
                    </span>
                  </div>

                  {card.images.main ? (
                    <div className="flex items-center gap-3 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                      <img
                        src={card.images.main}
                        alt="Photo 1 preview"
                        className="w-16 h-16 object-cover rounded-md border border-neutral-700 shadow-sm shrink-0"
                        onError={handleThumbnailImgError}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> फोटो 1 सक्रिय है
                        </p>
                        <p className="text-xs text-neutral-300 mt-0.5 font-medium truncate">लाइव कार्ड व डाउनलोड में यह फोटो दिखाई देगी</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-900/60 rounded-lg border border-dashed border-neutral-700 text-center text-xs sm:text-sm font-semibold text-neutral-200 tracking-wide font-['Noto_Sans_Devanagari']">
                      कोई फोटो चयनित नहीं है। कृपया नीचे दिए गए बटन से मुख्य फोटो अपलोड करें।
                    </div>
                  )}

                  <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-yellow-400/80 hover:border-yellow-300 rounded-xl cursor-pointer text-xs sm:text-sm font-black text-yellow-300 hover:text-white bg-yellow-500/15 hover:bg-yellow-500/25 transition-all shadow-sm">
                    <Upload className="w-4 h-4 text-yellow-400" />
                    <span>{card.images.main ? 'नई फोटो अपलोड / बदलें' : 'मुख्य फोटो अपलोड करें'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload('main', f);
                      }}
                    />
                  </label>
                </div>
              )}

              {/* TWO IMAGES WORKSPACE: Exactly 2 Photo Slots side-by-side */}
              {(card.layout === 'split-v' || card.layout === 'double' || card.layout === 'double-h' || card.layout === 'split-h') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Slot 1 (पहली फोटो) */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                        <span>पहली फोटो (Slot 1)</span>
                      </span>
                      <span className="text-[10px] text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                        {card.layout === 'split-v' ? '35% ऊपर' : card.layout === 'double' ? '50% ऊपर' : '50% बाईं'}
                      </span>
                    </div>

                    {card.images.main ? (
                      <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                        <img
                          src={card.images.main}
                          alt="Photo 1 preview"
                          className="w-14 h-14 object-cover rounded border border-neutral-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-green-400 font-bold truncate flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-400" /> फोटो 1 सक्रिय
                          </p>
                          <p className="text-[11px] text-neutral-300 font-medium truncate">लाइव कार्ड पर दिख रही है</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-neutral-900/60 rounded border border-dashed border-neutral-700 text-center text-xs font-semibold text-neutral-200">
                        फोटो 1 खाली है (अपलोड करें)
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-1.5 p-2 border-2 border-dashed border-yellow-400/80 hover:border-yellow-300 rounded-lg cursor-pointer text-xs font-bold text-yellow-300 bg-yellow-500/15 hover:bg-yellow-500/25 transition-all">
                      <Upload className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{card.images.main ? 'फोटो 1 बदलें' : 'फोटो 1 अपलोड'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('main', f);
                        }}
                      />
                    </label>
                  </div>

                  {/* Slot 2 (दूसरी फोटो) */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>दूसरी फोटो (Slot 2)</span>
                      </span>
                      <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {card.layout === 'split-v' ? '65% नीचे' : card.layout === 'double' ? '50% नीचे' : '50% दाईं'}
                      </span>
                    </div>

                    {card.images.second ? (
                      <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                        <img
                          src={card.images.second}
                          alt="Photo 2 preview"
                          className="w-14 h-14 object-cover rounded border border-neutral-700 shrink-0"
                          onError={handleThumbnailImgError}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-green-400 font-bold truncate flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-400" /> फोटो 2 सक्रिय
                          </p>
                          <p className="text-[11px] text-neutral-300 font-medium truncate">लाइव कार्ड पर दिख रही है</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-neutral-900/60 rounded border border-dashed border-neutral-700 text-center text-xs font-semibold text-neutral-200">
                        दूसरी फोटो खाली है (अपलोड करें)
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-1.5 p-2 border-2 border-dashed border-blue-400/80 hover:border-blue-300 rounded-lg cursor-pointer text-xs font-bold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 transition-all">
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>{card.images.second ? 'फोटो 2 बदलें' : 'दूसरी फोटो अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('second', f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* MULTI GRID WORKSPACE (3 or 4 Images) */}
              {(card.layout === 'grid-3' || card.layout === 'grid-3-bottom' || card.layout === 'grid-4') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Photo 1 */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                      <span>फोटो 1 (मुख्य)</span>
                      <span className="text-yellow-400 text-[10px] font-bold">स्लॉट 1</span>
                    </div>
                    {card.images.main && (
                      <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded">
                        <img src={card.images.main} alt="Photo 1" className="w-10 h-10 object-cover rounded" onError={handleThumbnailImgError} />
                        <span className="text-[10px] text-green-400">सक्रिय</span>
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-yellow-500/50 rounded-lg cursor-pointer text-xs text-yellow-300 font-bold">
                      <Upload className="w-3 h-3 text-yellow-400" />
                      <span>{card.images.main ? 'फोटो 1 बदलें' : 'फोटो 1 अपलोड'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('main', f); }} />
                    </label>
                  </div>

                  {/* Photo 2 */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                      <span>फोटो 2</span>
                      <span className="text-blue-400 text-[10px] font-bold">स्लॉट 2</span>
                    </div>
                    {card.images.second && (
                      <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded">
                        <img src={card.images.second} alt="Photo 2" className="w-10 h-10 object-cover rounded" onError={handleThumbnailImgError} />
                        <span className="text-[10px] text-green-400">सक्रिय</span>
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-blue-500/50 rounded-lg cursor-pointer text-xs text-blue-300 font-bold">
                      <Upload className="w-3 h-3 text-blue-400" />
                      <span>{card.images.second ? 'फोटो 2 बदलें' : 'फोटो 2 अपलोड'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('second', f); }} />
                    </label>
                  </div>

                  {/* Photo 3 */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                      <span>फोटो 3</span>
                      <span className="text-purple-400 text-[10px] font-bold">स्लॉट 3</span>
                    </div>
                    {card.images.third && (
                      <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded">
                        <img src={card.images.third} alt="Photo 3" className="w-10 h-10 object-cover rounded" onError={handleThumbnailImgError} />
                        <span className="text-[10px] text-green-400">सक्रिय</span>
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-purple-500/50 rounded-lg cursor-pointer text-xs text-purple-300 font-bold">
                      <Upload className="w-3 h-3 text-purple-400" />
                      <span>{card.images.third ? 'फोटो 3 बदलें' : 'फोटो 3 अपलोड'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('third', f); }} />
                    </label>
                  </div>

                  {/* Photo 4 (if grid-4) */}
                  {card.layout === 'grid-4' && (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                        <span>फोटो 4</span>
                        <span className="text-emerald-400 text-[10px] font-bold">स्लॉट 4</span>
                      </div>
                      {card.images.fourth && (
                        <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded">
                          <img src={card.images.fourth} alt="Photo 4" className="w-10 h-10 object-cover rounded" onError={handleThumbnailImgError} />
                          <span className="text-[10px] text-green-400">सक्रिय</span>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-emerald-500/50 rounded-lg cursor-pointer text-xs text-emerald-300 font-bold">
                        <Upload className="w-3 h-3 text-emerald-400" />
                        <span>{card.images.fourth ? 'फोटो 4 बदलें' : 'फोटो 4 अपलोड'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('fourth', f); }} />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Compact / Collapsible Google Image Search Assistant (Below Photo Slots) */}
              <div className="pt-2 border-t border-neutral-800/80">
                {(effectiveTier === 'basic' || effectiveTier === 'advanced') && !effectiveAdmin ? (
                  <div className="w-full p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-2 text-neutral-400">
                      <Lock className="w-4 h-4 text-amber-500/80" />
                      <span>इंटरनेट समाचार फोटो खोजें (गूगल इमेज सर्च)</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">🔒 केवल PRO / VIP DESK</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSearchHelper((prev) => !prev)}
                    className="w-full p-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-blue-300">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span>इंटरनेट समाचार फोटो खोजें (गूगल इमेज सर्च)</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <span>{showSearchHelper ? 'छुपाएं ▲' : 'खोलें ▼'}</span>
                    </span>
                  </button>
                )}

                {showSearchHelper && (
                  <div className="mt-2 p-3 bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 rounded-xl space-y-2 text-xs">
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      खबर के विषय से संबंधित वास्तविक समाचार फोटो गूगल से खोजकर डाउनलोड करें और ऊपर दिए गए फोटो स्लॉट में अपलोड करें।
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(() => {
                        const searchQuery = (card.headline || card.title || 'ताज़ा समाचार')
                          .replace(/\[\/?(yellow|red|white|cyan|green|orange|gold)\]/gi, '')
                          .slice(0, 70)
                          .trim();
                        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery + (card.location ? ` ${card.location}` : ''))}`;
                        return (
                          <>
                            <a
                              href={searchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition text-center"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>गूगल इमेज पर फोटो खोजें</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(searchQuery);
                                alert('सर्च क्वेरी क्लिपबोर्ड में कॉपी हो गई!');
                              }}
                              className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-lg border border-neutral-700 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>क्वेरी कॉपी</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* 3.1 Photo Crop & Move Controls (Left, Right, Center, Up, Down, Zoom) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-yellow-400" />
                फोटो क्रॉप व स्थिति (Photo Crop & Move / Position)
              </span>
              <button
                type="button"
                onClick={() =>
                  updateCrop(activeCropPhotoKey, { x: 50, y: 50, zoom: 1 })
                }
                className="text-[11px] text-neutral-400 hover:text-yellow-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="डिफ़ॉल्ट सेंटर पर रीसेट करें"
              >
                <RotateCcw className="w-3 h-3" />
                <span>रीसेट (Center)</span>
              </button>
            </div>

            {/* Tabs if layout has multiple photos */}
            {availableCropPhotos.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                {availableCropPhotos.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setActiveCropPhotoKey(p.key)}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      activeCropPhotoKey === p.key
                        ? 'bg-yellow-400 text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* 4-Way Directional Cursor Pad & Photo Position Control */}
            <PhotoPositionControl
              label={`${availableCropPhotos.find((p) => p.key === activeCropPhotoKey)?.label || 'फोटो'} स्थिति व कर्सर कंट्रोल`}
              crop={currentCrop}
              onChange={(updates) => updateCrop(activeCropPhotoKey, updates)}
            />
          </div>

          {/* वॉटरमार्क व प्रतीकात्मक फोटो Section (Step 4 के सबसे लास्ट में) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                <span>🏷️</span>
                <span>वॉटरमार्क व प्रतीकात्मक फोटो (Watermark):</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                ऑफ • प्रतीकात्मक फोटो • AI जनरेटेड
              </span>
            </div>

            {effectiveTier === 'basic' && !effectiveAdmin ? (
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-[11px] text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>🔒 वॉटरमार्क विकल्प केवल एडवांस, प्रो और वीआईपी डेस्क में उपलब्ध हैं।</span>
              </div>
            ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'none',
                  label: '1. ऑफ',
                  desc: 'ऑफ (No Tag)',
                  icon: '✕',
                },
                {
                  id: 'representative',
                  label: '2. प्रतीकात्मक फोटो',
                  desc: 'सांकेतिक तस्वीर',
                  icon: '📷',
                },
                {
                  id: 'ai',
                  label: '3. AI जनरेटेड',
                  desc: 'AI जनरेटेड इमेज',
                  icon: '✨',
                },
              ].map((opt) => {
                const currentType = card.photoDisclaimerType || (card.showAiGenerated ? 'ai' : 'none');
                const isSelected = currentType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const selId = opt.id as 'none' | 'representative' | 'ai';
                      onChange({
                        photoDisclaimerType: selId,
                        showAiGenerated: selId === 'ai',
                        photoWatermarkTag: selId === 'ai' ? 'AI जनरेटेड' : selId === 'representative' ? 'प्रतीकात्मक फोटो' : undefined,
                        representativePhotoText: selId === 'representative' ? (card.representativePhotoText || 'प्रतीकात्मक फोटो') : card.representativePhotoText,
                        aiGeneratedText: selId === 'ai' ? (card.aiGeneratedText || 'AI जनरेटेड') : card.aiGeneratedText,
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-amber-400 text-neutral-950 font-black border-amber-300 shadow-md ring-1 ring-amber-300'
                        : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    <span className="text-xs font-black flex items-center gap-1">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-neutral-900/80 font-bold' : 'text-neutral-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {/* Optional custom text input if representative or ai is active */}
            {(card.photoDisclaimerType === 'representative' || card.photoDisclaimerType === 'ai') && (
              <div className="pt-1 flex items-center gap-2">
                <label className="text-[11px] text-neutral-400 whitespace-nowrap">
                  टैग टेक्स्ट:
                </label>
                <input
                  type="text"
                  value={
                    card.photoDisclaimerType === 'representative'
                      ? (card.representativePhotoText || 'प्रतीकात्मक फोटो')
                      : (card.aiGeneratedText || 'AI GENERATED')
                  }
                  onChange={(e) => {
                    if (card.photoDisclaimerType === 'representative') {
                      onChange({ representativePhotoText: e.target.value });
                    } else {
                      onChange({ aiGeneratedText: e.target.value });
                    }
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-['Baloo_2']"
                />
              </div>
            )}
          </div>
        </div>
        )}

        {/* Dedicated Text Watermark: ON/OFF Control (Decoupled from Photo Label) */}
        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-amber-300 flex items-center gap-1.5 text-xs">
              <span>🔤</span>
              <span>टेक्स्ट वॉटरमार्क (Text Watermark)</span>
            </span>
            {(effectiveTier === 'basic' || effectiveTier === 'advanced') && !effectiveAdmin ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>केवल PRO / VIP DESK</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const nextState = !card.showTextWatermark;
                  onChange({
                    showTextWatermark: nextState,
                    textWatermarkContent: card.textWatermarkContent || card.channelNameEn || card.brandName || 'BREAKING NEWS WALA',
                    textWatermarkOpacity: card.textWatermarkOpacity ?? 0.15,
                    textWatermarkColor: card.textWatermarkColor || 'white',
                  });
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
                  card.showTextWatermark
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                <span>{card.showTextWatermark ? 'चालू (ON)' : 'बंद (OFF)'}</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-neutral-400">
            इमेज के ऊपर चैनल नाम या टेक्स्ट का सूक्ष्म बैकग्राउंड वॉटरमार्क (Default: OFF)
          </p>

          {card.showTextWatermark && (
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-400 whitespace-nowrap">
                  वॉटरमार्क टेक्स्ट:
                </label>
                <input
                  type="text"
                  value={card.textWatermarkContent ?? (card.channelNameEn || card.brandName || 'BREAKING NEWS WALA')}
                  onChange={(e) => onChange({ textWatermarkContent: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-['Baloo_2']"
                  placeholder="चैनल नाम दर्ज करें"
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>पारदर्शिता (Opacity):</span>
                  <span className="font-bold text-amber-300">
                    {Math.round((card.textWatermarkOpacity ?? 0.15) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.02"
                  value={card.textWatermarkOpacity ?? 0.15}
                  onChange={(e) => onChange({ textWatermarkOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Color Selector */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-neutral-400">रंग:</span>
                {(['white', 'black', 'red'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ textWatermarkColor: c })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      (card.textWatermarkColor || 'white') === c
                        ? 'border-amber-400 text-amber-300 bg-neutral-800'
                        : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {c === 'white' ? 'सफेद' : c === 'black' ? 'काला' : 'लाल'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 4 Nav Buttons */}
        {renderMobileStepNavigation(4)}
      </div>

      {/* ========================================================================= */}
      {/* STEP 5: स्थान व दिनांक (Location & Date) */}
      {/* ========================================================================= */}
      <div
        id="step-location"
        style={{ scrollMarginTop: '120px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
          mobileViewMode === 'steps' && activeStep !== 5 ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-500" />
            स्टेप 5: स्थान व दिनांक
          </span>
          <span className="text-[11px] text-neutral-400">
            स्थान व जिला • दिनांक स्टैम्प
          </span>
        </div>

        {/* Location with On/Off Toggle */}
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-200 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>स्थान / जिला (Location / District):</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400">शो / हाइड:</span>
              <button
                type="button"
                onClick={() => onChange({ showLocation: card.showLocation === false ? true : false })}
                className={`text-[10px] font-black px-2.5 py-0.5 rounded border transition-all cursor-pointer ${
                  card.showLocation !== false
                    ? 'bg-green-500/20 border-green-500/60 text-green-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {card.showLocation !== false ? 'ON (दिखेगा)' : 'OFF (छिपा)'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={card.location || ''}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="यहाँ अपना स्थान/जिला दर्ज करें (उदा. भोपाल / मध्य प्रदेश)"
              disabled={card.showLocation === false}
              className={`w-full bg-neutral-900 border rounded-lg px-3 py-2 text-xs focus:outline-none font-['Noto_Sans_Devanagari'] ${
                card.showLocation === false
                  ? 'opacity-40 border-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'border-neutral-700 text-white focus:border-yellow-400'
              }`}
            />
          </div>

          {/* Location Box Soft Color Selector */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-300 font-bold text-[11px] flex items-center gap-1.5">
                <span>🎨</span>
                <span>लोकेशन बॉक्स बैकग्राउंड रंग (5 सॉफ्ट शेड्स):</span>
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {card.locationBgColor || '#FFFFFF'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LOCATION_BG_PRESETS.map((p) => {
                const isSel = (card.locationBgColor || '#FFFFFF').toUpperCase() === p.color.toUpperCase();
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => onChange({ locationBgColor: p.color })}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSel
                        ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-md'
                        : 'border-neutral-700 hover:border-neutral-500'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={`${p.nameHi} (${p.name}) - ${p.color}`}
                  >
                    <div className="w-full flex items-center justify-center">
                      {isSel ? (
                        <span className="text-[10px] font-black text-neutral-950">✓</span>
                      ) : (
                        <span className="w-2 h-2 rounded-full border border-neutral-400/60" />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-neutral-800 truncate max-w-full px-0.5">
                      {p.nameHi.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-neutral-400">
            * लोकेशन OFF करने पर चैनल लोगो या कोई फिक्स्ड एलिमेंट अपनी जगह से नहीं हिलेगा (दाएं कोने पर सुरक्षित रहेगा)।
          </p>
        </div>

        {/* Date Stamp */}
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-200 font-bold flex items-center gap-1.5">
              <span>📅</span>
              <span>दिनांक (Date Stamp - कॉम्पैक्ट पोज़ीशन):</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400">शो / हाइड:</span>
              <button
                type="button"
                onClick={() => onChange({ showDate: card.showDate === false ? true : false })}
                className={`text-[10px] font-black px-2.5 py-0.5 rounded border transition-all cursor-pointer ${
                  card.showDate !== false
                    ? 'bg-green-500/20 border-green-500/60 text-green-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {card.showDate !== false ? 'ON (दिखेगी)' : 'OFF (छिपी)'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={card.dateStr || getFormattedHindiDate()}
              onChange={(e) => onChange({ dateStr: e.target.value })}
              disabled={card.showDate === false}
              placeholder="उदा. 29 सितम्बर 2026, मंगलवार"
              className={`w-full bg-neutral-900 border rounded-lg px-3 py-2 text-xs focus:outline-none font-['Baloo_2'] ${
                card.showDate === false
                  ? 'opacity-40 border-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'border-neutral-700 text-white focus:border-yellow-400'
              }`}
            />
            <button
              type="button"
              onClick={() => onChange({ dateStr: getFormattedHindiDate() })}
              title="आज की तारीख सेट करें"
              className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 text-xs font-bold shrink-0 cursor-pointer"
            >
              आज
            </button>
          </div>
          <p className="text-[10px] text-neutral-500">
            * टेम्पलेट के अनुसार कॉम्पैक्ट पोज़ीशन में फिक्स रहेगी।
          </p>
        </div>

        {/* Single Step 5 Mobile Nav Buttons */}
        {renderMobileStepNavigation(5)}
      </div>

      {/* ========================================================================= */}
      {/* STEP 6: हैडर और फुटर (Header & Footer) */}
      {/* ========================================================================= */}
      <div
        id="step-header-footer"
        style={{ scrollMarginTop: '120px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
          mobileViewMode === 'steps' && activeStep !== 6 ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            स्टेप 6 : हैडर और फुटर (Header & Footer)
          </span>
          <span className="text-xs text-neutral-400 font-medium">
            ब्रांडिंग व फुटर सेटिंग्स
          </span>
        </div>

        {/* Admin Test Mode Custom Identity (Admin Only) */}
        {isAdmin && (
          <div className="p-3 bg-neutral-950/90 border-2 border-purple-500/60 rounded-xl space-y-3 text-xs shadow-lg">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300 font-black">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>🧪 टेस्ट मोड (Admin Sample Identity Preview)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextState = !card.isTestMode;
                  onChange({
                    isTestMode: nextState,
                    testChannelName: nextState ? (card.testChannelName || 'सैंपल न्यूज़ नेटवर्क') : card.testChannelName,
                    testSocialHandle: nextState ? (card.testSocialHandle || '@sample_reporter') : card.testSocialHandle,
                  });
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                  card.isTestMode
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-400/40'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                }`}
              >
                <span>{card.isTestMode ? '✓ टेस्ट मोड चालू (ON)' : '✕ बंद (OFF)'}</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              यह सुविधा एडमिन को किसी नए यूज़र का सैंपल ग्राफ़िक तैयार करने के लिए अलग चैनल नाम, यूज़रनेम, लोगो और फ़ोटो आज़माने की अनुमति देती है। वास्तविक एडमिन प्रोफ़ाइल बिल्कुल सुरक्षित रहती है।
            </p>

            {card.isTestMode && (
              <div className="pt-2 border-t border-purple-900/60 space-y-3 animate-in fade-in duration-200">
                {/* 1. Test Channel Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-purple-200 block">
                    1. टेस्ट चैनल नाम (Test Channel Name):
                  </label>
                  <input
                    type="text"
                    value={card.testChannelName || ''}
                    onChange={(e) => onChange({ testChannelName: e.target.value })}
                    placeholder="उदा. दैनिक एक्सप्रेस / भारत टीवी"
                    className="w-full p-2 bg-neutral-900 border border-purple-800/80 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* 2. Test Social Username */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-purple-200 block">
                    2. टेस्ट सोशल यूज़रनेम (Test Social Username):
                  </label>
                  <input
                    type="text"
                    value={card.testSocialHandle || ''}
                    onChange={(e) => onChange({ testSocialHandle: e.target.value })}
                    placeholder="उदा. @dainik_express या @reporter_rahul"
                    className="w-full p-2 bg-neutral-900 border border-purple-800/80 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* 3. Test Logo Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-200">3. टेस्ट लोगो अपलोड (Test Logo):</span>
                    {card.testLogoUrl && (
                      <button
                        type="button"
                        onClick={() => onChange({ testLogoUrl: undefined })}
                        className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        हटाएं
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-1.5 px-3 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/60 rounded-lg text-xs font-bold text-purple-200 flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>{card.testLogoUrl ? '🔄 टेस्ट लोगो बदलें' : '📁 टेस्ट लोगो चुनें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                onChange({ testLogoUrl: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {card.testLogoUrl && (
                    <div className="flex items-center gap-2 p-1.5 bg-neutral-900 rounded-lg border border-purple-800/60">
                      <div className="w-9 h-9 bg-black rounded flex items-center justify-center p-0.5 overflow-hidden">
                        <img src={card.testLogoUrl} alt="Test Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-purple-300 font-bold">✓ टेस्ट लोगो सक्रिय</span>
                    </div>
                  )}
                </div>

                {/* 4. Sample User Photo (Optional for Test Preview) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-200">4. सैंपल यूज़र फोटो (Sample Photo):</span>
                    {card.testSamplePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => onChange({ testSamplePhotoUrl: undefined })}
                        className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        हटाएं
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-bold text-neutral-300 flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{card.testSamplePhotoUrl ? '🔄 सैंपल फोटो बदलें' : '📁 सैंपल यूज़र फोटो अपलोड'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                onChange({ testSamplePhotoUrl: reader.result, photoUrl: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* 1. Master Branding Card with ON/OFF Toggle (Top of Step 6) */}
        <div className="p-3 bg-neutral-950/80 border border-blue-900/40 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-blue-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>मास्टर ब्रांडिंग (Master Branding)</span>
            </span>
            {canToggleMasterBranding ? (
              <button
                type="button"
                onClick={() => {
                  if (card.showMasterBranding !== false) {
                    if (!isEffectiveSuperAdmin(currentUser) && effectiveTier !== 'professional' && effectiveTier !== 'ultra') {
                      alert('मास्टर ब्रांडिंग बंद करने के लिए प्रो या वीआईपी डेस्क प्लान आवश्यक है।');
                      return;
                    }
                    const userCustomFrames = getCustomFrames(currentUser?.email || currentUser?.username);
                    if (!isEffectiveSuperAdmin(currentUser) && userCustomFrames.length === 0) {
                      alert('मास्टर ब्रांडिंग बंद करने के लिए आपके पास अप्रूव्ड कस्टम फ्रेम होना आवश्यक है। कृपया पहले अपनी कस्टम फ्रेम अपलोड करें।');
                      return;
                    }
                    onChange({ showMasterBranding: false });
                  } else {
                    onChange({ showMasterBranding: true });
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
                  card.showMasterBranding !== false
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {card.showMasterBranding !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{card.showMasterBranding !== false ? 'चालू (ON)' : 'बंद (OFF)'}</span>
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>केवल PRO / VIP DESK</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            हेडर लोगो व फुटर ब्रैंडिंग सीधे आपकी प्रोफ़ाइल से ऑटो-लिंक रहते हैं। प्रो/VIP यूज़र मास्टर ब्रांडिंग बंद कर सकते हैं।
          </p>

          {/* When Master Branding is OFF: Header & Footer Combo or 4:5 Full Frame */}
          {card.showMasterBranding === false && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>कस्टम ब्रांडिंग मोड चुनें:</span>
                </span>
              </div>

              {/* Sub-mode selector tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCustomBrandingSubTab('hf')}
                  className={`py-1.5 px-2 rounded text-[11px] font-bold transition-all text-center cursor-pointer ${
                    customBrandingSubTab === 'hf'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1. हेडर + फुटर कॉम्बो
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBrandingSubTab('full')}
                  className={`py-1.5 px-2 rounded text-[11px] font-bold transition-all text-center cursor-pointer ${
                    customBrandingSubTab === 'full'
                      ? 'bg-yellow-500 text-neutral-950 font-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  2. 4:5 मास्टर फ्रेम
                </button>
              </div>

              {/* SUB-MODE 1: Header + Footer Combo */}
              {customBrandingSubTab === 'hf' && (
                <div className="space-y-2.5 p-2 bg-neutral-900/90 border border-blue-900/40 rounded-lg">
                  <p className="text-[10px] text-neutral-400">
                    पारदर्शी हेडर और फुटर अपलोड करें। दोनों एक साथ सहेजने पर मास्टर फुल फ्रेम नहीं जाएगी।
                  </p>

                  {/* 1. Header PNG */}
                  <div className="p-2 bg-neutral-950 border border-neutral-800 rounded space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-200">हेडर PNG (Header)</span>
                      {activeHeaderPng && (
                        <button
                          type="button"
                          onClick={() => handleResetHeaderForDesign(card.frameDesign || 'graphic_001')}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          हटाएं
                        </button>
                      )}
                    </div>
                    {activeHeaderPng ? (
                      <div className="relative h-12 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center p-1">
                        <img src={activeHeaderPng} alt="Header" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-500">कस्टम पारदर्शी हेडर पट्टी अपलोड करें।</p>
                    )}
                    <label className="block text-center py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-blue-300 border border-blue-500/30 rounded text-[11px] font-bold cursor-pointer transition-all">
                      <span>{activeHeaderPng ? '🔄 हेडर बदलें' : '📁 हेडर PNG अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHeaderUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* 2. Footer PNG */}
                  <div className="p-2 bg-neutral-950 border border-neutral-800 rounded space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-200">फुटर PNG (Footer)</span>
                      {activeFooterPng && (
                        <button
                          type="button"
                          onClick={() => handleFooterReset()}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          हटाएं
                        </button>
                      )}
                    </div>
                    {activeFooterPng ? (
                      <div className="relative h-12 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center p-1">
                        <img src={activeFooterPng} alt="Footer" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-500">कस्टम पारदर्शी फुटर स्ट्रिप अपलोड करें।</p>
                    )}
                    <label className="block text-center py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold cursor-pointer transition-all">
                      <span>{activeFooterPng ? '🔄 फुटर बदलें' : '📁 फुटर PNG अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFooterUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Save Header + Footer Combo Button */}
                  <button
                    type="button"
                    onClick={handleSaveHeaderFooterCombo}
                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <span>💾</span>
                    <span>हेडर + फुटर कॉम्बो सहेजें (Save Preset)</span>
                  </button>
                </div>
              )}

              {/* SUB-MODE 2: 4:5 Master Frame */}
              {customBrandingSubTab === 'full' && (
                <div className="space-y-2.5 p-2 bg-neutral-900/90 border border-yellow-900/40 rounded-lg">
                  <p className="text-[10px] text-neutral-400">
                    सम्पूर्ण 4:5 पारदर्शी मास्टर फ्रेम अपलोड करें। इसे सहेजते समय नाम पूछा जाएगा और हेडर/फुटर स्वतः हट जाएंगे।
                  </p>

                  <div className="p-2 bg-neutral-950 border border-neutral-800 rounded space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-200">4:5 मास्टर फ्रेम PNG</span>
                      {card.customFrameOverlayPng && (
                        <button
                          type="button"
                          onClick={() => onChange({ customFrameOverlayPng: undefined })}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          हटाएं
                        </button>
                      )}
                    </div>
                    {card.customFrameOverlayPng ? (
                      <div className="relative h-20 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center p-1">
                        <img src={card.customFrameOverlayPng} alt="Custom 4:5 Frame" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-500">1080x1350 पारदर्शी PNG फ्रेम अपलोड करें।</p>
                    )}
                    <label className="block text-center py-2 px-2 bg-yellow-500 hover:bg-yellow-400 text-neutral-950 rounded text-xs font-black cursor-pointer shadow-md transition-all">
                      <span>{card.customFrameOverlayPng ? '🔄 नई 4:5 मास्टर फ्रेम बदलें' : '📁 4:5 मास्टर फ्रेम PNG अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFrameOverlayUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Saved Custom Frames Catalog (Visible to Pro, VIP & Admin) */}
              {savedCustomFramesList.length > 0 && (
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-neutral-300 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>आपकी सहेजी गई कस्टम फ्रेम्स ({savedCustomFramesList.length}):</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {savedCustomFramesList.map((f) => (
                      <div
                        key={f.id}
                        className="p-2 bg-neutral-900/90 border border-neutral-700/80 rounded-lg flex flex-col justify-between gap-1.5 text-[10px]"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate max-w-[90px]" title={f.name}>
                            {f.name}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-neutral-800 text-amber-300 border border-neutral-700 shrink-0">
                            {f.frameType === 'header_footer' ? 'हेडर+फुटर' : '4:5 फ्रेम'}
                          </span>
                        </div>
                        <div className="h-10 bg-black/60 rounded flex items-center justify-center p-0.5 overflow-hidden">
                          {f.assetUrl ? (
                            <img src={f.assetUrl} alt={f.name} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-neutral-500 text-[9px]">PNG फ़ाइल</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (f.frameType === 'header_footer') {
                                onChange({
                                  customHeaderPng: f.headerUrl,
                                  customFooterPng: f.footerUrl,
                                  customFrameOverlayPng: undefined,
                                  showMasterBranding: false,
                                });
                              } else {
                                onChange({
                                  customFrameOverlayPng: f.assetUrl,
                                  customHeaderPng: undefined,
                                  customFooterPng: undefined,
                                  frameDesign: 'custom-png',
                                  showMasterBranding: false,
                                });
                              }
                            }}
                            className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-center cursor-pointer transition active:scale-95 text-[10px]"
                          >
                            लागू करें
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`क्या आप फ्रेम "${f.name}" को हटाना चाहते हैं?`)) {
                                deleteCustomFrame(f.id);
                                setSavedCustomFramesList(getCustomFrames(currentUser?.email || currentUser?.username));
                              }
                            }}
                            className="p-1 bg-red-900/60 hover:bg-red-800 text-red-300 rounded cursor-pointer transition shrink-0"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof (window as any).setAppTab === 'function') {
                        (window as any).setAppTab('profile');
                      }
                      window.dispatchEvent(new CustomEvent('ai_news_open_template_manager'));
                    }}
                    className="w-full mt-2 py-1.5 px-3 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 hover:text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <span>🎨 टेम्प्लेट व कस्टम फ्रेम्स मैनेजर में जाएं</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Channel Logo Settings & Position Controls (Second in Step 6) */}
        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              🏷️ चैनल / ब्रांड लोगो (शीर्ष दाईं ओर फिक्स):
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">
              Locked
            </span>
          </div>

          {canChangeLogo ? (
            <div className="flex items-center gap-2">
              <label className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{card.customLogoUrl ? 'नया लोगो बदलें' : 'कस्टम लोगो अपलोड'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </label>
              {card.customLogoUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ customLogoUrl: undefined, brandLogoType: 'default', logoScale: 1.25 })}
                  className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-800/80 cursor-pointer"
                  title="लोगो हटाएं"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-400 text-xs flex items-center justify-between">
              <span>लोगो सुरक्षित (Basic Plan):</span>
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>लोगो बदलने हेतु Pro/VIP आवश्यक</span>
              </span>
            </div>
          )}

              {/* Logo Preview thumbnail */}
              {card.customLogoUrl && (
                <div className="flex items-center gap-3 p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="w-12 h-12 bg-neutral-950 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden p-1">
                    <img src={card.customLogoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                      ✓ लोगो लोड किया गया (स्थिति फिक्स व लॉक)
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
                      स्केल: {Math.round((card.logoScale ?? 1.25) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Logo Resize Controls */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-neutral-300">लोगो का आकार (Logo Size छोटा-बड़ा):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChange({ logoScale: Math.max(0.5, (card.logoScale ?? 1.25) - 0.1) })}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
                      title="छोटा करें"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ logoScale: Math.min(1.8, (card.logoScale ?? 1.25) + 0.1) })}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
                      title="बड़ा करें"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ logoScale: 1.25, logoX: 5.5, logoY: undefined })}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-[10px] border border-neutral-700 cursor-pointer"
                      title="डिफ़ॉल्ट सेफ-ज़ोन (5.5%) पर रीसेट करें"
                    >
                      डिफ़ॉल्ट (125%)
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={card.logoScale ?? 1.25}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChange({ logoScale: val, logoSizePercent: Math.round(val * 100) });
                  }}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
                  <span>50% (छोटा)</span>
                  <span>125% (डिफ़ॉल्ट)</span>
                  <span>180% (बड़ा)</span>
                </div>
              </div>
            </div>

            {/* 3. Footer Settings & WhatsApp Toggle (Third in Step 6, No Website Box) */}
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>फुटर ब्रैंडिंग एवं बैकग्राउंड सेटिंग्स:</span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  कॉम्पैक्ट डिज़ाइन
                </span>
              </div>

              {/* Part H: 14-Color Dedicated Footer Background Palette */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-300 font-bold flex items-center gap-1">
                    <span>🎨</span>
                    <span>फुटर बैकग्राउंड रंग (Footer Background):</span>
                  </span>
                  <span className="font-mono text-[10px] text-amber-300 font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {card.footerBgColor || '#FFFFFF'}
                  </span>
                </div>

                {effectiveTier === 'basic' && !effectiveAdmin ? (
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>🔒 बेसिक पैकेज में फुटर बैकग्राउंड सफ़ेद निर्धारित है। अन्य रंगों के लिए एडवांस/प्रो/वीआईपी डेस्क चुनें।</span>
                  </div>
                ) : (
                  <>
                    {/* Primary Colors — First 5 options displayed prominently */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-400 block font-semibold">1. मुख्य प्राथमिक रंग (Primary 5):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {FOOTER_BG_PRIMARY_PRESETS.map((p) => {
                          const isSel = (card.footerBgColor || '#FFFFFF').toUpperCase() === p.color.toUpperCase();
                          return (
                            <button
                              key={p.color}
                              type="button"
                              onClick={() => onChange({ footerBgColor: p.color })}
                              className={`px-2 py-1.5 rounded-lg text-left text-xs font-bold border flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                                isSel ? 'ring-2 ring-yellow-400 scale-[1.02] shadow-md border-yellow-400' : 'hover:border-neutral-500'
                              } ${p.border}`}
                              style={{ backgroundColor: p.color, color: '#0F172A' }}
                              title={`${p.nameHi} - ${p.color}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-3.5 h-3.5 rounded-full border border-neutral-400/60 shrink-0 shadow-inner" style={{ backgroundColor: p.color }} />
                                <span className="text-[10.5px] truncate">{p.nameHi}</span>
                              </div>
                              <span className="font-mono text-[9px] text-neutral-600 shrink-0">{p.color}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remaining 9 Colors — Visible to Pro, VIP, and Admin */}
                    {(effectiveAdmin || effectiveTier === 'professional' || effectiveTier === 'ultra') && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-neutral-400 block font-semibold">2. अतिरिक्त रंग पैलेट (Remaining 9):</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          {FOOTER_BG_SECONDARY_PRESETS.map((p) => {
                            const isSel = (card.footerBgColor || '#FFFFFF').toUpperCase() === p.color.toUpperCase();
                            return (
                              <button
                                key={p.color}
                                type="button"
                                onClick={() => onChange({ footerBgColor: p.color })}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                                  isSel ? 'ring-2 ring-yellow-400 scale-105 shadow-md border-yellow-400' : 'hover:border-neutral-500'
                                } ${p.border}`}
                                style={{ backgroundColor: p.color, color: '#0F172A' }}
                                title={`${p.nameHi} (${p.name}) - ${p.color}`}
                              >
                                <span className="w-3 h-3 rounded-full border border-neutral-400/60 shadow-inner" style={{ backgroundColor: p.color }} />
                                <span className="text-[10px] whitespace-nowrap">{p.nameHi}</span>
                                <span className="font-mono text-[9px] text-neutral-600">{p.color}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom Color Option for Footer Background — strictly for VIP Desk and Admin */}
                    {(effectiveAdmin || effectiveTier === 'ultra') && (
                      <div className="flex items-center justify-between p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                        <span className="text-[11px] text-neutral-300 font-semibold flex items-center gap-1.5">
                          <span>🖌️</span>
                          <span>कस्टम बैकग्राउंड रंग (VIP Desk):</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={card.footerBgColor || '#FFFFFF'}
                            onChange={(e) => onChange({ footerBgColor: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                            title="कस्टम बैकग्राउंड रंग चुनें"
                          />
                          <input
                            type="text"
                            value={card.footerBgColor || '#FFFFFF'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                onChange({ footerBgColor: val });
                              }
                            }}
                            className="w-20 px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-amber-300 font-mono text-xs focus:border-yellow-400 focus:outline-hidden"
                            placeholder="#FFFFFF"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Part I: Independent Footer Text Color Picker (Default #000000 Black) */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-300 font-bold flex items-center gap-1">
                    <span>✏️</span>
                    <span>फुटर टेक्स्ट रंग (Footer Text Color - डिफ़ॉल्ट काला):</span>
                  </span>
                  <span className="font-mono text-[10px] text-amber-300 font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {card.footerTextColor || '#000000'}
                  </span>
                </div>

                {effectiveTier === 'basic' && !effectiveAdmin ? (
                  <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>🔒 बेसिक पैकेज में फुटर टेक्स्ट काला निर्धारित है।</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(effectiveTier === 'advanced' && !effectiveAdmin
                      ? FOOTER_TEXT_COLOR_PRESETS.filter(p => p.color !== '#FFFFFF')
                      : FOOTER_TEXT_COLOR_PRESETS
                    ).map((p) => {
                      const isSel = (card.footerTextColor || '#000000').toUpperCase() === p.color.toUpperCase();
                      return (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => onChange({ footerTextColor: p.color })}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSel ? 'ring-2 ring-yellow-400 scale-105 shadow-md border-yellow-400' : 'hover:border-neutral-500'
                          }`}
                          style={{
                            backgroundColor: p.color,
                            color: p.color === '#FFFFFF' ? '#0F172A' : '#FFFFFF',
                            borderColor: p.color === '#FFFFFF' ? '#D1D5DB' : '#4B5563',
                          }}
                          title={`${p.nameHi} - ${p.color}`}
                        >
                          <span className="text-[10px] whitespace-nowrap">{p.nameHi}</span>
                          {isSel && <span className="text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                    {/* Custom Text Color Picker: strictly for VIP DESK and Admin */}
                    {(effectiveAdmin || effectiveTier === 'ultra') && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="color"
                          value={card.footerTextColor || '#000000'}
                          onChange={(e) => onChange({ footerTextColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                          title="कस्टम टेक्स्ट रंग चुनें"
                        />
                        <input
                          type="text"
                          value={card.footerTextColor || '#000000'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                              onChange({ footerTextColor: val });
                            }
                          }}
                          className="w-18 px-1.5 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-amber-300 font-mono text-[11px] focus:border-yellow-400 focus:outline-hidden"
                          placeholder="#000000"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Live Contrast Warning if readability is reduced */}
                {(() => {
                  const getLum = (hex: string) => {
                    const c = (hex || '#FFFFFF').replace('#', '').trim();
                    let r = 255, g = 255, b = 255;
                    if (c.length === 3) {
                      r = parseInt(c[0] + c[0], 16);
                      g = parseInt(c[1] + c[1], 16);
                      b = parseInt(c[2] + c[2], 16);
                    } else if (c.length === 6) {
                      r = parseInt(c.substring(0, 2), 16);
                      g = parseInt(c.substring(2, 4), 16);
                      b = parseInt(c.substring(4, 6), 16);
                    }
                    return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
                  };
                  const bgLum = getLum(card.footerBgColor || '#FFFFFF');
                  const txLum = getLum(card.footerTextColor || '#000000');
                  const contrast = Math.abs(bgLum - txLum);
                  if (contrast < 0.25) {
                    return (
                      <div className="p-2 bg-amber-500/15 border border-amber-400/50 rounded-lg text-amber-200 text-[10.5px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>⚠️ ध्यान दें: बैकग्राउंड और टेक्स्ट रंग के बीच कम कंट्रास्ट के कारण फुटर टेक्स्ट पढ़ने में असुविधा हो सकती है।</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* WhatsApp Single Toggle */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Footer में WhatsApp नंबर दिखाएँ</span>
                    </span>
                    <span className="text-[10.5px] text-neutral-400 block">
                      नंबर सीधे आपकी प्रोफ़ाइल के वाट्सएप सेक्शन से प्राप्त होता है।
                    </span>
                  </div>
                  {(effectiveTier === 'basic' || effectiveTier === 'advanced') && !effectiveAdmin ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>केवल PRO / VIP</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onChange({ showMobileNumber: card.showMobileNumber === false ? true : false })}
                      className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0 ${
                        card.showMobileNumber !== false
                          ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-600/60 hover:bg-rose-900'
                      }`}
                    >
                      <span>{card.showMobileNumber !== false ? '✓ ON (दिखेगा)' : '✕ OFF (छिपा)'}</span>
                    </button>
                  )}
                </div>

                {/* VIP Desk WhatsApp Override Input Field */}
                {(effectiveAdmin || effectiveTier === 'ultra') && (
                  <div className="p-2.5 bg-neutral-900 rounded-xl border border-amber-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>WhatsApp नंबर बदलें (केवल इस ग्राफिक के लिए):</span>
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        VIP DESK
                      </span>
                    </div>
                    <input
                      type="text"
                      value={(card as any).contactNumber || card.whatsappNumber || ''}
                      onChange={(e) => onChange({ whatsappNumber: e.target.value, contactNumber: e.target.value } as any)}
                      placeholder="उदा. +91 9876543210 (खाली छोड़ने पर प्रोफ़ाइल नंबर दिखेगा)"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutral-400 block">
                      * केवल इस ग्राफिक के लिए संपर्क नंबर बदलें। प्रोफ़ाइल नंबर अपरिवर्तित रहेगा।
                    </span>
                  </div>
                )}

                {/* Website Single Toggle (ON/OFF) */}
                <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>Footer में वेबसाइट (Website) दिखाएँ</span>
                    </span>
                    <span className="text-[10.5px] text-neutral-400 block">
                      वेबसाइट लिंक सीधे आपकी प्रोफ़ाइल से प्राप्त होती है।
                    </span>
                  </div>
                  {effectiveTier === 'basic' && !effectiveAdmin ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>केवल ADVANCE/PRO/VIP</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onChange({ showWebsite: card.showWebsite === false ? true : false })}
                      className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0 ${
                        card.showWebsite !== false
                          ? 'bg-sky-500 text-slate-950 ring-1 ring-sky-300'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-600/60 hover:bg-rose-900'
                      }`}
                    >
                      <span>{card.showWebsite !== false ? '✓ ON (दिखेगा)' : '✕ OFF (छिपा)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 6 Navigation Buttons */}
            {renderMobileStepNavigation(6)}
          </div>

          

      {/* ========================================================================= */}
      {/* STEP 7: डाउनलोड व कैप्शन (HD कार्ड एक्सपोर्ट व सोशल शेयर) */}
      {/* ========================================================================= */}
      {(mobileViewMode === 'all' || activeStep === 7) && (
        <div
          id="step-download"
          style={{ scrollMarginTop: '120px' }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 scroll-mt-28"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                7
              </span>
              <h2 className="text-base sm:text-lg font-black text-white font-['Mukta']">
                डाउनलोड व कैप्शन (HD कार्ड एक्सपोर्ट व सोशल शेयर)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 shrink-0">
              1080×1350 HD
            </span>
          </div>

          {/* 1. Prominent Live 4:5 Card Preview on Mobile & Desktop */}
          <div className="bg-neutral-950 rounded-xl p-3 border border-neutral-800 flex flex-col items-center justify-center">
            <div className="w-full max-w-[340px] aspect-[4/5] rounded-lg overflow-hidden shadow-2xl border border-neutral-700 flex items-center justify-center bg-black">
              <CardPreview card={card} />
            </div>
            <span className="text-[11px] text-neutral-400 mt-2 font-medium">
              सोशल मीडिया (4:5 रेशियो) लाइव कार्ड प्रीव्यू
            </span>
          </div>

          {/* 2. Exactly TWO Primary Side-by-Side Equal-Width Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Left Red Button: सोशल मीडिया रेडी कार्ड डाउनलोड करें */}
            <button
              type="button"
              onClick={() => onDownload?.()}
              disabled={downloading}
              className="py-3 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-red-650 via-red-600 to-red-700 hover:from-red-600 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-lg border border-red-400 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-amber-300" />
              <span className="leading-tight">
                {downloading ? 'कार्ड तैयार हो रहा है...' : 'सोशल मीडिया रेडी कार्ड डाउनलोड करें'}
              </span>
            </button>

            {/* Right Green Button: कैप्शन कॉपी करें */}
            <button
              type="button"
              onClick={handleDirectCopyCaption}
              className="py-3 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm shadow-lg border border-emerald-400 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {captionCopied ? (
                <>
                  <Check className="w-5 h-5 text-yellow-300" />
                  <span className="text-yellow-200 leading-tight">कैप्शन कॉपी हो गया! ✓</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 text-emerald-200" />
                  <span className="leading-tight">कैप्शन कॉपी करें</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Secondary link to detailed caption editor modal */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onOpenCaptionModal}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>विस्तृत कैप्शन एडिटर व AI रीराइट खोलें</span>
            </button>
          </div>

        </div>
      )}
        </>
      )}

      {/* Global Live Card Preview Modal for Mobile (Steps 1-6) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold text-sm">लाइव ग्राफिक कार्ड प्रीव्यू (4:5)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4">
            <div className="w-full max-w-[340px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-neutral-700 bg-black flex items-center justify-center">
              <CardPreview card={card} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition"
            >
              एडिटिंग जारी रखें (बंद करें)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
