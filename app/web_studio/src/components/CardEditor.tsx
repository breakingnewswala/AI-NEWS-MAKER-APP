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
} from 'lucide-react';
import {
  FRAME_OPTIONS,
  REPORTER_ALLOWED_FRAMES,
  getEffectiveFrameOptions,
  FrameOption,
} from '../lib/HeaderDesigns';
import {
  isTemplateAvailableForUserPlan,
  getTemplateConfig,
} from '../lib/graphicTemplatesRegistry';
import {
  isTierSufficient,
  isEffectiveAdmin,
  getEffectiveUserTier,
  PLAN_KEY_MAP,
  isChannelProfileLocked,
  getAssignedCustomHeaderFooter,
} from '../lib/userPlanManager';
import {
  registerCustomFont,
  canUserUploadCustomFont,
  getHeadlineFontsForPackage,
  PACKAGE_FONT_MAPPING,
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
import { extractLeaderFromHeadline, getEffectiveSpeaker } from '../lib/speakerUtils';
import { VoiceInputButton } from './VoiceInputButton';
import { getFormattedHindiDate } from '../lib/dateUtils';
import { MorningJacketEditor } from './MorningJacketEditor';
import { EPaperJacketEditor } from './EPaperJacketEditor';
import { InlineAiNewsTools, AutoFillNewsData } from './InlineAiNewsTools';
import { ReporterUser } from './LoginModal';
import { scrollToStepById } from './StepNavigator';

export const HEADLINE_FONTS = [
  { id: 'Baloo 2', label: 'बालू २ (Baloo 2 - बोल्ड)' },
  { id: 'Noto Sans Devanagari', label: 'नोटो सैंस (Noto Sans - साफ़)' },
  { id: 'Rozha One', label: 'रोज़्हा वन (Rozha One - हेडिंग)' },
  { id: 'Yatra One', label: 'यात्रा वन (Yatra One - पारम्परिक)' },
  { id: 'Mukta', label: 'मुक्ता (Mukta - क्रिस्प)' },
  { id: 'Poppins', label: 'पॉपिन्स (Poppins - मॉडर्न)' },
  { id: 'Hind', label: 'हिंद (Hind - न्यूज़पेपर)' },
  { id: 'Tiro Devanagari Hindi', label: 'टीरो देवनागरी (Tiro Serif)' },
  { id: 'Kalam', label: 'कलाम (Kalam - हैंडराइटिंग)' },
  { id: 'Rajdhani', label: 'राजधानी (Rajdhani - स्क्वेयर्ड)' },
  { id: 'Gotu', label: 'गोटू (Gotu - कर्व्ड)' },
  { id: 'Martel', label: 'मार्तेल (Martel - संपादकीय)' },
];

export const HIGHLIGHT_COLOR_PRESETS = [
  { color: '#FFE600', label: 'पीला (Default)', bg: 'bg-[#FFE600]', text: 'text-neutral-900' },
  { color: '#EF4444', label: 'लाल (Red)', bg: 'bg-red-500', text: 'text-white' },
  { color: '#FFFFFF', label: 'सफ़ेद (White)', bg: 'bg-white', text: 'text-neutral-900' },
  { color: '#06B6D4', label: 'आसमानी (Cyan)', bg: 'bg-cyan-500', text: 'text-white' },
  { color: '#84CC16', label: 'हरा (Lime)', bg: 'bg-lime-500', text: 'text-neutral-900' },
  { color: '#F97316', label: 'नारंगी (Orange)', bg: 'bg-orange-500', text: 'text-white' },
];

export const FOOTER_BG_PRESETS = [
  { color: '#FFFFFF', label: 'सफ़ेद (White)', border: 'border-neutral-300' },
  { color: '#FFE600', label: 'पीला (Yellow)', border: 'border-yellow-500' },
  { color: '#DC2626', label: 'लाल (Red)', border: 'border-red-600' },
  { color: '#0F172A', label: 'डार्क नेवी (Navy)', border: 'border-slate-700' },
  { color: '#000000', label: 'गहरा काला (Black)', border: 'border-neutral-700' },
  { color: '#F1F5F9', label: 'हल्का ग्रे (Light)', border: 'border-slate-300' },
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
  const canUseCustomHF = effectiveAdmin || effectiveTier === 'professional' || effectiveTier === 'ultra';
  const canUploadCustomFont = effectiveAdmin || effectiveTier === 'ultra';

  // Package-based headline fonts system (prepared for per-package font mappings)
  const packageHeadlineFonts = React.useMemo(() => {
    const tierKey = effectiveTier === 'ultra' ? 'VIP DESK' : effectiveTier === 'professional' ? 'PRO' : effectiveTier === 'advanced' ? 'ADVANCE' : 'BASIC';
    const mappedIds = PACKAGE_FONT_MAPPING[tierKey] || [];
    const pkgFonts = getHeadlineFontsForPackage(effectiveTier, effectiveAdmin);
    const customFonts = (effectiveAdmin || effectiveTier === 'ultra')
      ? pkgFonts.filter((f) => f.isCustom).map((cf) => ({ id: cf.name, label: `${cf.name} (कस्टम फ़ॉन्ट)` }))
      : [];
    const baseFonts = mappedIds.length > 0
      ? HEADLINE_FONTS.filter((f) => mappedIds.includes(f.id))
      : HEADLINE_FONTS;
    return [...baseFonts, ...customFonts];
  }, [effectiveTier, effectiveAdmin]);

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
    card.frameDesign || 'jacket-original'
  );

  React.useEffect(() => {
    if (card.frameDesign) {
      setSelectedFooterDesignTab(card.frameDesign);
    }
  }, [card.frameDesign]);

  // Mobile active step navigation (1 to 6)
  const [internalActiveStep, setInternalActiveStep] = React.useState<number>(1);
  const activeStep = propActiveStep !== undefined ? propActiveStep : internalActiveStep;
  const setActiveStep = onStepChange || setInternalActiveStep;
  const [internalMobileViewMode, setInternalMobileViewMode] = React.useState<'steps' | 'all'>('steps');
  const mobileViewMode = propMobileViewMode !== undefined ? propMobileViewMode : internalMobileViewMode;
  const setMobileViewMode = onToggleMobileViewMode || setInternalMobileViewMode;
  const defaultFilter = effectiveAdmin ? 'all' : effectiveTier;
  const [templatePlanFilter, setTemplatePlanFilter] = React.useState<string>(defaultFilter);

  React.useEffect(() => {
    if (!effectiveAdmin) {
      if (effectiveTier === 'basic') setTemplatePlanFilter('basic');
      else if (effectiveTier === 'advanced') setTemplatePlanFilter('advanced');
      else if (effectiveTier === 'professional' && templatePlanFilter !== 'custom') setTemplatePlanFilter('professional');
      else if (effectiveTier === 'ultra' && templatePlanFilter !== 'custom') setTemplatePlanFilter('ultra');
    }
  }, [effectiveAdmin, effectiveTier]);

  // Plan Categories for Step 1
  const planCategories = React.useMemo(() => {
    if (effectiveAdmin) {
      return [
        { id: 'all', label: 'सभी फ्रेम्स (All)', badge: `${currentFrameOptions.length + 1}` },
        { id: 'basic', label: 'BASIC PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'basic').length}` },
        { id: 'advanced', label: 'ADVANCE PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'advanced').length}` },
        { id: 'professional', label: 'PRO PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'professional').length}` },
        { id: 'ultra', label: 'VIP DESK PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'ultra').length}` },
        { id: 'custom', label: 'CUSTOM FRAMES', badge: '1' },
      ];
    }
    if (effectiveTier === 'basic') {
      return [
        { id: 'basic', label: 'BASIC PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'basic').length}` },
      ];
    }
    if (effectiveTier === 'advanced') {
      return [
        { id: 'advanced', label: 'ADVANCE PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'advanced').length}` },
      ];
    }
    if (effectiveTier === 'professional') {
      return [
        { id: 'professional', label: 'PRO PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'professional').length}` },
        { id: 'custom', label: 'CUSTOM FRAMES', badge: '1' },
      ];
    }
    if (effectiveTier === 'ultra') {
      return [
        { id: 'ultra', label: 'VIP DESK PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'ultra').length}` },
        { id: 'custom', label: 'CUSTOM FRAMES', badge: '1' },
      ];
    }
    return [
      { id: 'basic', label: 'BASIC PACKAGE FRAMES', badge: `${currentFrameOptions.filter((f) => f.requiredTier === 'basic').length}` },
    ];
  }, [effectiveAdmin, effectiveTier, currentFrameOptions]);

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
    { step: 4, id: 'step-photo', label: '4. फोटो', shortLabel: 'फोटो', icon: '📷' },
    { step: 5, id: 'step-location', label: '5. लोकेशन, तारीख और वॉटरमार्क', shortLabel: 'लोकेशन-तारीख', icon: '📍' },
    { step: 6, id: 'step-header-footer', label: '6. हैडर और फुटर', shortLabel: 'हैडर-फुटर', icon: '📜' },
    { step: 7, id: 'step-download', label: '7. डाउनलोड', shortLabel: 'डाउनलोड', icon: '⬇️' },
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
          : card.layout === 'inset-circle'
          ? 'मुख्य बैकग्राउंड फोटो'
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

  if (card.layout === 'inset-circle' || card.images.insetCircle) {
    availableCropPhotos.push({
      key: 'insetCircle',
      label: '⭕ गोल सर्कल फोटो (Arrow Connected)',
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
    const currentActiveDesign = card.frameDesign || 'jacket-original';
    onChange({
      customHeaderPng: updatedHeaders[currentActiveDesign] || undefined,
      headersByDesign: updatedHeaders,
    });
  };

  // Apply a header to all templates
  const handleApplyHeaderToAll = (url: string) => {
    const allDesigns: FrameDesign[] = [
      'jacket-original',
      'jacket-breaking-red',
      'jacket-text-breaking',
      'jacket-investigation',
      'jacket-quote',
      'jacket-morning',
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
    const currentDesign = card.frameDesign || 'jacket-original';
    handleHeaderUploadForDesign(file, currentDesign);
  };

  // Handle Full Frame Overlay PNG upload
  const handleFrameOverlayUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange({
          customFrameOverlayPng: e.target.result as string,
          frameDesign: 'custom-png',
        });
      }
    };
    reader.readAsDataURL(file);
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
        const designToUpdate = targetDesign || selectedFooterDesignTab || card.frameDesign || 'jacket-original';
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
    const designToReset = targetDesign || selectedFooterDesignTab || card.frameDesign || 'jacket-original';
    const updatedFooters = { ...(card.footersByDesign || {}) };
    delete updatedFooters[designToReset];
    const currentActiveDesign = card.frameDesign || 'jacket-original';
    onChange({
      customFooterPng: updatedFooters[currentActiveDesign] || undefined,
      footersByDesign: updatedFooters,
    });
  };

  const handleResetFooterForDesign = handleFooterReset;

  // Apply a footer to all templates
  const handleApplyFooterToAll = (url: string) => {
    const allDesigns: FrameDesign[] = [
      'jacket-original',
      'jacket-breaking-red',
      'jacket-text-breaking',
      'jacket-investigation',
      'jacket-quote',
      'jacket-morning',
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
            {currentFrameOptions.find((f) => (card.frameDesign || 'jacket-original') === f.id)?.name || 'फ्रेम स्टाइल'}
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

          {/* Plan Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {planCategories.map((cat) => {
              const isActive = templatePlanFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTemplatePlanFilter(cat.id as any)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                    isActive
                      ? cat.id === 'basic'
                        ? 'bg-emerald-500 text-neutral-950 ring-2 ring-emerald-400 shadow-md scale-105'
                        : cat.id === 'advanced'
                        ? 'bg-blue-500 text-white ring-2 ring-blue-400 shadow-md scale-105'
                        : cat.id === 'professional'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md scale-105'
                        : cat.id === 'ultra'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 ring-2 ring-yellow-400 shadow-md scale-105'
                        : cat.id === 'custom'
                        ? 'bg-purple-500 text-white ring-2 ring-purple-300 shadow-md scale-105'
                        : 'bg-neutral-200 text-neutral-950 ring-2 ring-neutral-300 shadow-md scale-105'
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

          {/* Quick 1-Tap Horizontal Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-neutral-800/60 pt-2">
            {currentFrameOptions
              .filter((f) => isTemplateAvailableForUserPlan(f.id, effectiveTier, effectiveAdmin))
              .filter((f) => templatePlanFilter === 'all' || f.requiredTier === templatePlanFilter)
              .map((frame, idx) => {
                const isSelected = (card.frameDesign || 'jacket-original') === frame.id;
                const isUnlocked = effectiveAdmin || isTierSufficient(effectiveTier, frame.requiredTier);
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        onChange({ frameDesign: frame.id });
                      } else {
                        const tierLabel = frame.requiredTier === 'ultra' ? 'VIP DESK' : PLAN_KEY_MAP[frame.requiredTier] || frame.requiredTier.toUpperCase();
                        alert(`यह ${frame.name} टेम्पलेट केवल ${tierLabel} प्लान में उपलब्ध है। कृपया प्रोफ़ाइल में जाकर अपना प्लान अपग्रेड करें।`);
                      }
                    }}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
                      isSelected
                        ? 'bg-amber-400 text-neutral-950 ring-2 ring-amber-300 font-black'
                        : isUnlocked
                        ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                        : 'bg-neutral-950/80 text-neutral-500 border border-neutral-800/60'
                    }`}
                  >
                    <span>T{idx + 1}</span>
                    <span>{frame.name.split(' ')[0]}</span>
                    {!isUnlocked && <Lock className="w-2.5 h-2.5 text-amber-500" />}
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

        {/* Frame Designs Grid: Admin sees all, User strictly sees only templates allowed for active plan */}
        {currentFrameOptions.length === 0 ? (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-neutral-900 to-amber-500/10 text-neutral-200 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>मास्टर निर्देश सक्रिय — सभी पुराने टेम्पलेट्स डिलीट किए गए</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              सिस्टम पूरी तरह से रीसेट हो चुका है। जैसे ही आप <strong>Graphic 1, Graphic 2, Graphic 3...</strong> सैंपल इमेजेज प्रदान करेंगे, उनके अनुसार सटीक लेआउट (Headline, Photo, Logo, Location, Footer) अपनी संबंधित कैटेगरी (<strong>BASIC / ADVANCED / PRO / VIP DESK</strong>) में यहाँ स्वतः लोड हो जाएंगे।
            </p>
            <div className="p-2.5 rounded-lg bg-black/50 border border-neutral-800 text-[11px] text-amber-300 flex flex-col gap-1">
              <span>📌 <strong>मुख्य टेक्स्ट:</strong> केवल YOUR HEADLINE मान्य • Subtitle पूर्णतः इग्नोर रहेगा</span>
              <span>📌 <strong>ग्लोबल फिक्स:</strong> Date (SHOW / HIDE) एवं Watermark (ON / OFF / प्रतीकात्मक / AI)</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {currentFrameOptions
              .filter((f) => isTemplateAvailableForUserPlan(f.id, effectiveTier, effectiveAdmin))
              .filter((f) => {
                if (effectiveAdmin) return templatePlanFilter === 'all' || f.requiredTier === templatePlanFilter;
                if (templatePlanFilter === 'custom') return false;
                return true;
              })
              .map((f) => {
                const isSelected = (card.frameDesign || 'graphic_001') === f.id;
                const isUnlocked = effectiveAdmin || isTierSufficient(effectiveTier, f.requiredTier);
                const planDisplay = f.requiredTier === 'basic' 
                  ? { name: 'BASIC', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' }
                  : f.requiredTier === 'advanced'
                  ? { name: 'ADVANCE', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' }
                  : f.requiredTier === 'professional'
                  ? { name: 'PRO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' }
                  : { name: 'VIP DESK', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };

                return (
                  <div
                    key={f.id}
                    onClick={() => onChange({ frameDesign: f.id })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative overflow-hidden select-none ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-500/15 text-white shadow-lg ring-2 ring-yellow-400/40'
                        : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 text-neutral-300 hover:bg-neutral-900/60'
                    }`}
                  >
                    {/* Top Badge Row */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black tracking-wide truncate text-white">
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
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
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
                      <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {isSelected ? '✓ एक्टिव टेम्पलेट' : 'क्लिक करके चुनें'}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        4:5 अनुपात
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Custom Frame Card — strictly visible only to PRO, VIP DESK, and Admin */}
            {(effectiveAdmin || effectiveTier === 'professional' || effectiveTier === 'ultra') &&
              (templatePlanFilter === 'all' || templatePlanFilter === 'custom' || templatePlanFilter === 'professional' || templatePlanFilter === 'ultra') && (
                <div
                  onClick={() => onChange({ frameDesign: 'custom-png' })}
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
          </div>
        )}

        {/* Step 1 Mobile Nav Button */}
        {mobileViewMode === 'steps' && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 1 / {STEPS.length}</span>
            <button
              type="button"
              onClick={() => handleGoToStep(2)}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <span>अगला: एआई टूल्स</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
          />
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
            {card.frameDesign !== 'jacket-morning' && (
              <span className="text-[11px] text-neutral-400 font-medium">
                अधिकतम 3 लाइनें
              </span>
            )}
          </div>
        </div>

        {/* Headline Line Formatting Helpers & Counter */}
        {card.frameDesign === 'jacket-morning' ? (
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
        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-yellow-400" />
              <span>हेडलाइन फ़ॉन्ट (Devanagari Font):</span>
            </span>
            <span className="text-yellow-400 font-mono text-[11px] font-bold px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
              {card.headlineFontFamily || 'Baloo 2'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {packageHeadlineFonts.map((f) => {
              const isSel = (card.headlineFontFamily || 'Baloo 2') === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange({ headlineFontFamily: f.id })}
                  className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-all cursor-pointer truncate ${
                    isSel
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-black ring-1 ring-yellow-400/50'
                      : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 text-neutral-300'
                  }`}
                  style={{ fontFamily: `'${f.id}', sans-serif` }}
                  title={f.label}
                >
                  <div className="text-[11px] truncate">{f.label}</div>
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

          {/* Alignment */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-semibold">
              <AlignJustify className="w-3.5 h-3.5 text-yellow-400" />
              <span>अलाइनमेंट (Alignment):</span>
            </div>
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
              <button
                type="button"
                onClick={() => onChange({ headlineAlign: 'center' })}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  (!card.headlineAlign || card.headlineAlign === 'center')
                    ? 'bg-yellow-400 text-neutral-950 shadow-sm font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="बीच में (Center - डिफ़ॉल्ट)"
              >
                <AlignCenter className="w-3 h-3" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ headlineAlign: 'justify' })}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  card.headlineAlign === 'justify'
                    ? 'bg-yellow-400 text-neutral-950 shadow-sm font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="दोनों तरफ से बराबर (Justify - समाचार पत्र प्रारूप)"
              >
                <AlignJustify className="w-3 h-3" />
                <span>Justify</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ headlineAlign: 'left' })}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  card.headlineAlign === 'left'
                    ? 'bg-yellow-400 text-neutral-950 shadow-sm font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="बाईं ओर (Left)"
              >
                <AlignLeft className="w-3 h-3" />
                <span>Left</span>
              </button>
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
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-300 font-semibold flex items-center gap-1">
              <Palette className="w-3 h-3 text-yellow-400" />
              <span>हाइलाइट रंग:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {HIGHLIGHT_COLOR_PRESETS.map((hc) => {
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
              <label className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] font-bold text-neutral-300 cursor-pointer hover:border-neutral-500" title="कस्टम रंग चुनें">
                <input
                  type="color"
                  value={card.highlightColor || '#FFE600'}
                  onChange={(e) => onChange({ highlightColor: e.target.value })}
                  className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span>कस्टम</span>
              </label>
            </div>
          </div>

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
                        value={item.fontFamily || 'Baloo 2'}
                        onChange={(e) => {
                          const updated = card.customTextOverlays?.map((t) =>
                            t.id === item.id ? { ...t, fontFamily: e.target.value } : t
                          );
                          onChange({ customTextOverlays: updated });
                        }}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-1.5 text-xs text-white focus:border-yellow-400 focus:outline-none cursor-pointer"
                      >
                        {packageHeadlineFonts.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
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

        {/* Custom Font Upload — strictly restricted to VIP DESK (and Admin) */}
        {canUploadCustomFont && (
          <div className="bg-neutral-950/80 border border-yellow-500/40 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>Custom Font Upload (कस्टम फ़ॉन्ट अपलोड)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 font-bold">
                ★ केवल VIP DESK
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              अपनी पसंद का कोई भी देवनागरी / हिंदी TTF, OTF या WOFF फ़ॉन्ट अपलोड करें। अपलोड होते ही हेडलाइन पर लागू हो जाएगा।
            </p>
            <div className="flex items-center gap-2">
              <label className="flex-1 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-yellow-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-dashed border-yellow-500/50 transition">
                <Upload className="w-4 h-4 text-yellow-400" />
                <span>नया फ़ॉन्ट अपलोड करें (.ttf, .otf, .woff)</span>
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
            </div>
          </div>
        )}

        {/* Step 3 Nav Buttons */}
        {mobileViewMode === 'steps' && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleGoToStep(2)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>पिछला: AI टूल्स</span>
            </button>
            <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 3 / {STEPS.length}</span>
            <button
              type="button"
              onClick={() => handleGoToStep(4)}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <span>अगला: फोटो लेआउट</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
                स्टेप 4: फोटो लेआउट
              </span>
          <span className="text-xs text-yellow-400 font-medium">
            {card.frameDesign === 'jacket-morning'
              ? '🌅 मॉर्निंग जैकेट (नो फोटो लेआउट)'
              : card.frameDesign === 'jacket-text-breaking'
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { id: 'single' as CardLayout, label: '1 इमेज', sub: 'सिंगल फुल' },
              { id: 'split-v' as CardLayout, label: '2 इमेज (35-65)', sub: '35% ऊपर, 65% नीचे' },
              { id: 'double' as CardLayout, label: '2 इमेज (50-50)', sub: '50% ऊपर, 50% नीचे' },
              { id: 'double-h' as CardLayout, label: '2 इमेज (L-R)', sub: 'लेफ्ट-राइट 50-50' },
              { id: 'grid-3' as CardLayout, label: '3 इमेज (2-1)', sub: '2 ऊपर, 1 नीचे' },
              { id: 'grid-3-bottom' as CardLayout, label: '3 इमेज (1-2)', sub: '1 ऊपर, 2 नीचे' },
              { id: 'grid-4' as CardLayout, label: '4 इमेज (2x2)', sub: '2 ऊपर, 2 नीचे ग्रिड' },
              { id: 'inset-circle' as CardLayout, label: 'गोल सर्कल', sub: 'सर्कल पोर्ट्रेट' },
            ].map((l) => {
              const isSelected =
                card.layout === l.id ||
                (l.id === 'double-h' && card.layout === 'split-h');
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onChange({ layout: l.id })}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span>{l.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{l.sub}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Layout specific tips */}
        {card.layout === 'split-v' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 35-65 अप-डाउन मोड: 35% ऊपर इमेज (Top), 65% नीचे इमेज (Bottom) - नीचे की फोटो पूरी तरह साफ़ दिखेगी!</span>
            <span className="text-[11px] font-bold bg-yellow-500 text-neutral-950 px-2 py-0.5 rounded">
              35-65 Ratio
            </span>
          </div>
        )}

        {card.layout === 'double' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 50-50 अप-डाउन मोड: 50% आधी फोटो ऊपर, 50% आधी फोटो नीचे।</span>
            <span className="text-[11px] font-bold bg-yellow-500 text-neutral-950 px-2 py-0.5 rounded">
              50-50 Ratio
            </span>
          </div>
        )}

        {(card.layout === 'double-h' || card.layout === 'split-h') && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 50-50 लेफ्ट-राइट मोड: आधी फोटो बाईं तरफ, आधी फोटो दाईं तरफ।</span>
            <span className="text-[11px] font-bold bg-yellow-500 text-neutral-950 px-2 py-0.5 rounded">
              Side-by-Side
            </span>
          </div>
        )}

        {card.layout === 'grid-3' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 3 फोटो मोड (2 ऊपर, 1 नीचे): 2 फोटो ऊपर (लेफ्ट-राइट), 1 चौड़ी फोटो नीचे।</span>
          </div>
        )}

        {card.layout === 'grid-3-bottom' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 3 फोटो मोड (1 ऊपर, 2 नीचे): 1 चौड़ी फोटो ऊपर, 2 फोटो नीचे (लेफ्ट-राइट)।</span>
          </div>
        )}

        {card.layout === 'grid-4' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ 4 फोटो मोड (2x2 ग्रिड): 2 फोटो ऊपर (लेफ्ट-राइट), 2 फोटो नीचे (लेफ्ट-राइट)।</span>
            <span className="text-[11px] font-bold bg-yellow-500 text-neutral-950 px-2 py-0.5 rounded">
              4 Photos 2x2
            </span>
          </div>
        )}

        {card.layout === 'inset-circle' && (
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 flex items-center justify-between">
            <span>✨ राउंड सर्कल मोड: मुख्य बैकग्राउंड फोटो + गोल कटआउट (सर्कल पोर्ट्रेट फोटो)।</span>
            <span className="text-[11px] font-bold bg-yellow-500 text-neutral-950 px-2 py-0.5 rounded">
              Round Circle
            </span>
          </div>
        )}

        {/* Upload Buttons according to selected layout */}
        <div className="pt-2 border-t border-neutral-800/80 space-y-3">
          <div className="text-xs font-semibold text-neutral-300">
            तस्वीरें अपलोड करें:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Photo 1 */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
              <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                <span>
                  {card.layout === 'single' || card.layout === 'full'
                    ? 'मुख्य फोटो (Single Photo)'
                    : card.layout === 'split-v'
                    ? 'पहली फोटो (35% ऊपर - Top)'
                    : card.layout === 'double'
                    ? 'पहली फोटो (50% ऊपर - Top)'
                    : card.layout === 'double-h' || card.layout === 'split-h'
                    ? 'पहली फोटो (50% बाईं - Left Half)'
                    : card.layout === 'grid-3' || card.layout === 'grid-4'
                    ? 'पहली फोटो (ऊपर बाईं - Top Left)'
                    : card.layout === 'grid-3-bottom'
                    ? 'पहली फोटो (ऊपर चौड़ी - Top Wide)'
                    : 'मुख्य बैकग्राउंड फोटो (Background)'}
                </span>
                <span className="text-yellow-400 text-[10px] font-bold">अनिवार्य</span>
              </div>

              {/* Current photo preview thumbnail */}
              {card.images.main && (
                <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                  <img
                    src={card.images.main}
                    alt="Photo 1 preview"
                    className="w-12 h-12 object-cover rounded border border-neutral-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-green-400 font-semibold truncate flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-400" /> फोटो एक्टिव है
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">लाइव कार्ड पर दिख रही है</p>
                  </div>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-yellow-500/50 hover:border-yellow-400 rounded-md cursor-pointer text-xs text-yellow-300 font-bold hover:text-white bg-yellow-500/10 hover:bg-yellow-500/20 transition-all">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>{card.images.main ? 'नई फोटो अपलोड / बदलें' : 'फोटो अपलोड करें'}</span>
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

            {/* Photo 2 (for double, split-v, double-h, grid-3, grid-3-bottom, grid-4) */}
            {(card.layout === 'double' ||
              card.layout === 'split-v' ||
              card.layout === 'double-h' ||
              card.layout === 'split-h' ||
              card.layout === 'grid-3' ||
              card.layout === 'grid-3-bottom' ||
              card.layout === 'grid-4') && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                  <span>
                    {card.layout === 'split-v'
                      ? 'दूसरी फोटो (65% नीचे - Bottom)'
                      : card.layout === 'double'
                      ? 'दूसरी फोटो (50% नीचे - Bottom)'
                      : card.layout === 'double-h' || card.layout === 'split-h'
                      ? 'दूसरी फोटो (50% दाईं - Right Half)'
                      : card.layout === 'grid-3' || card.layout === 'grid-4'
                      ? 'दूसरी फोटो (ऊपर दाईं - Top Right)'
                      : 'दूसरी फोटो (नीचे बाईं - Bottom Left)'}
                  </span>
                </div>

                {card.images.second && (
                  <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                    <img
                      src={card.images.second}
                      alt="Photo 2 preview"
                      className="w-12 h-12 object-cover rounded border border-neutral-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-green-400 font-semibold truncate flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400" /> फोटो 2 एक्टिव है
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">लाइव कार्ड पर दिख रही है</p>
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-neutral-700 hover:border-yellow-500 rounded-md cursor-pointer text-xs text-neutral-400 hover:text-white bg-neutral-900/50 transition-all">
                  <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{card.images.second ? 'फोटो 2 बदलें' : 'फोटो 2 अपलोड करें'}</span>
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
            )}

            {/* Photo 3 (for grid-3, grid-3-bottom, grid-4) */}
            {(card.layout === 'grid-3' || card.layout === 'grid-3-bottom' || card.layout === 'grid-4') && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                  <span>
                    {card.layout === 'grid-3'
                      ? 'तीसरी फोटो (नीचे चौड़ी - Bottom Wide)'
                      : card.layout === 'grid-4'
                      ? 'तीसरी फोटो (नीचे बाईं - Bottom Left)'
                      : 'तीसरी फोटो (नीचे दाईं - Bottom Right)'}
                  </span>
                </div>

                {card.images.third && (
                  <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                    <img
                      src={card.images.third}
                      alt="Photo 3 preview"
                      className="w-12 h-12 object-cover rounded border border-neutral-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-green-400 font-semibold truncate flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400" /> फोटो 3 एक्टिव है
                      </p>
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-md cursor-pointer text-xs text-neutral-400 hover:text-white bg-neutral-900/50 transition-all">
                  <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{card.images.third ? 'फोटो 3 बदलें' : 'फोटो 3 अपलोड करें'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload('third', f);
                    }}
                  />
                </label>
              </div>
            )}

            {/* Photo 4 (for grid-4) */}
            {card.layout === 'grid-4' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>चौथी फोटो (नीचे दाईं - Bottom Right)</span>
                </div>
                <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-md cursor-pointer text-xs text-neutral-400 hover:text-white bg-neutral-900/50 transition-all">
                  <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  <span>फोटो 4 अपलोड करें</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload('fourth', f);
                    }}
                  />
                </label>
              </div>
            )}

            {/* Inset Circle Photo (for inset-circle) */}
            {card.layout === 'inset-circle' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>सर्कल इनसेट फोटो (नेता/अधिकारी/छात्र)</span>
                </div>
                <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-md cursor-pointer text-xs text-neutral-400 hover:text-white bg-neutral-900/50 transition-all">
                  <CircleDot className="w-3.5 h-3.5 text-yellow-400" />
                  <span>सर्कल फोटो अपलोड करें</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload('insetCircle', f);
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* If Inset Circle: Position Controls */}
          {card.layout === 'inset-circle' && (
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80 space-y-3 text-xs">
              <div className="font-semibold text-neutral-300 flex items-center justify-between">
                <span>सर्कल फोटो की पोजीशन (X & Y Slider):</span>
                <span className="text-neutral-500">
                  X: {card.insetPosition.x}% | Y: {card.insetPosition.y}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-400">दाएं - बाएं (X):</label>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={card.insetPosition.x}
                    onChange={(e) =>
                      onChange({
                        insetPosition: {
                          ...card.insetPosition,
                          x: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400">ऊपर - नीचे (Y):</label>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    value={card.insetPosition.y}
                    onChange={(e) =>
                      onChange({
                        insetPosition: {
                          ...card.insetPosition,
                          y: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

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
        </div>
        )}

        {/* Step 4 Nav Buttons */}
        {mobileViewMode === 'steps' && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleGoToStep(3)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>पिछला: हेडलाइन</span>
            </button>
            <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 4 / {STEPS.length}</span>
            <button
              type="button"
              onClick={() => handleGoToStep(5)}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <span>अगला: लोकेशन</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 5: लोकेशन (Location & District) */}
      {/* ========================================================================= */}
      <div
        id="step-location"
        style={{ scrollMarginTop: '120px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
          mobileViewMode === 'steps' && (activeStep !== 5 && activeStep !== 6) ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-500" />
            स्टेप 5: लोकेशन (Location)
          </span>
          <span className="text-[11px] text-neutral-400">
            स्थान व जिला • लोकेशन शो/हाइड
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
          <p className="text-[10px] text-neutral-400">
            * लोकेशन OFF करने पर चैनल लोगो या कोई फिक्स्ड एलिमेंट अपनी जगह से नहीं हिलेगा (दाएं कोने पर सुरक्षित रहेगा)।
          </p>
        </div>

        {/* Step 5 Mobile Nav Buttons */}
        {mobileViewMode === 'steps' && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleGoToStep(4)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>पिछला: फोटो</span>
            </button>
            <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 5 / {STEPS.length}</span>
            <button
              type="button"
              onClick={() => handleGoToStep(6)}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <span>अगला: तारीख और वॉटरमार्क</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 6: तारीख और वॉटरमार्क (Date & Watermark) */}
      {/* ========================================================================= */}
      <div
        id="step-date-watermark"
        style={{ scrollMarginTop: '120px' }}
        className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
          mobileViewMode === 'steps' && (activeStep !== 5 && activeStep !== 6) ? 'hidden' : 'block'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            स्टेप 6: तारीख व वॉटरमार्क (Date & Watermark)
          </span>
          <span className="text-[11px] text-neutral-400">
            दिनांक शो/हाइड • वॉटरमार्क (ऑफ / प्रतीकात्मक फोटो / AI जनरेटेड)
          </span>
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

        {/* वॉटरमार्क व प्रतीकात्मक फोटो Section */}
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
                      showWatermark: selId !== 'none',
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

        {/* Step 6 Mobile Nav Buttons */}
        {mobileViewMode === 'steps' && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleGoToStep(5)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>पिछला: लोकेशन</span>
            </button>
            <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 6 / {STEPS.length}</span>
            <button
              type="button"
              onClick={() => handleGoToStep(7)}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <span>अगला: हैडर और फुटर</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
          {/* STEP 7: हैडर और फुटर (Header & Footer) */}
          {/* ========================================================================= */}
          <div
            id="step-header-footer"
            style={{ scrollMarginTop: '120px' }}
            className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-4 scroll-mt-28 ${
              mobileViewMode === 'steps' && (activeStep !== 6 && activeStep !== 7) ? 'hidden' : 'block'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                स्टेप 7: हैडर और फुटर (Header & Footer)
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                टॉप हेडर व बॉटम फुटर स्ट्रिप
              </span>
            </div>

            {/* Template-specific Header & Footer PNG Customization Box (Strictly PRO & VIP DESK) */}
            {canUseCustomHF && (
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-neutral-800/80 pb-2.5">
                  <div className="flex items-start sm:items-center gap-2">
                    <span className="text-amber-400 text-sm">🏷️</span>
                    <div>
                      <span className="text-xs font-bold text-neutral-200 block">
                        {currentFrameOptions.find((f) => (card.frameDesign || 'jacket-original') === f.id)?.name || 'मूल न्यूज़ जैकेट'} : हेडर व फुटर पीएनजी
                      </span>
                      <span className="text-[10.5px] text-neutral-400 block">
                        इस टेम्पलेट के लिए कस्टम हेडर/फुटर अपलोड करें (बदलने पर सुरक्षित रहेगा)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold self-start sm:self-auto flex items-center gap-1">
                    <span>✓</span> टेम्पलेट सक्रिय
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Top Header PNG Card */}
                  <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <span>🖼️</span> हेडर पीएनजी (Top Header)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-medium flex items-center gap-1 border border-neutral-700/60">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{isProfileLocked ? 'लॉक्ड' : 'अनलॉक्ड'}</span>
                      </span>
                    </div>

                    {/* Header Preview & Action buttons */}
                    {activeHeaderPng ? (
                      <div className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                        <div className="w-16 h-8 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={activeHeaderPng} alt="Header" className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-[11px] text-neutral-300 truncate flex-1 font-mono">कस्टम हेडर सक्रिय</span>
                        <button
                          type="button"
                          onClick={() => handleResetHeaderForDesign(card.frameDesign || 'jacket-original')}
                          className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-400 text-xs cursor-pointer"
                          title="हेडर हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyHeaderToAll(activeHeaderPng)}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10.5px] font-bold border border-neutral-700 cursor-pointer"
                          title="सभी टेम्पलेट्स पर लगाएं"
                        >
                          सभी पर
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 text-center bg-neutral-950/60 rounded-lg border border-dashed border-neutral-800 text-[11px] text-neutral-400">
                        डिफ़ॉल्ट हेडर सक्रिय (कोई कस्टम PNG नहीं)
                      </div>
                    )}

                    <label className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 transition">
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>नया हेडर PNG बदलें</span>
                      <input
                        type="file"
                        accept="image/png,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHeaderUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Bottom Footer PNG Card */}
                  <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <span>🔻</span> फुटर पीएनजी (Bottom Footer)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-medium flex items-center gap-1 border border-neutral-700/60">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{isProfileLocked ? 'लॉक्ड' : 'अनलॉक्ड'}</span>
                      </span>
                    </div>

                    {/* Footer Preview & Action buttons */}
                    {activeFooterPng ? (
                      <div className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                        <div className="w-16 h-8 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={activeFooterPng} alt="Footer" className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-[11px] text-neutral-300 truncate flex-1 font-mono">कस्टम फुटर सक्रिय</span>
                        <button
                          type="button"
                          onClick={() => handleResetFooterForDesign(card.frameDesign || 'jacket-original')}
                          className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-400 text-xs cursor-pointer"
                          title="फुटर हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyFooterToAll(activeFooterPng)}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10.5px] font-bold border border-neutral-700 cursor-pointer"
                          title="सभी टेम्पलेट्स पर लगाएं"
                        >
                          सभी पर
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 text-center bg-neutral-950/60 rounded-lg border border-dashed border-neutral-800 text-[11px] text-neutral-400">
                        डिफ़ॉल्ट फुटर सक्रिय (कोई कस्टम PNG नहीं)
                      </div>
                    )}

                    <label className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 transition">
                      <Upload className="w-3.5 h-3.5 text-red-400" />
                      <span>नया फुटर PNG बदलें</span>
                      <input
                        type="file"
                        accept="image/png,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFooterUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Logo Settings & Locked Position Controls */}
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  🏷️ चैनल / ब्रांड लोगो (शीर्ष दाईं ओर फिक्स):
                </span>
                <span className="text-[11px] text-amber-400 font-semibold">
                  साइज: {Math.round((card.logoScale ?? 1.25) * 100)}%
                </span>
              </div>

              {isProfileLocked ? (
                <div className="p-3 bg-neutral-900 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-200 font-bold truncate">
                      चैनल लोगो स्थायी रूप से सुरक्षित है (One-Time Setup)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">
                    Locked
                  </span>
                </div>
              ) : (
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
                      onClick={() => onChange({ logoScale: 1.25 })}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-[10px] border border-neutral-700 cursor-pointer"
                      title="125% पर रीसेट करें"
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
                  onChange={(e) => onChange({ logoScale: parseFloat(e.target.value) })}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
                  <span>50% (छोटा)</span>
                  <span>125% (डिफ़ॉल्ट)</span>
                  <span>180% (बड़ा)</span>
                </div>
              </div>
            </div>

            {/* 2. Master Branding Card with ON/OFF Toggle */}
            <div className="p-3 bg-neutral-950/80 border border-blue-900/40 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-blue-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>मास्टर ब्रांडिंग (Master Branding)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ showMasterBranding: card.showMasterBranding === false ? true : false })}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
                    card.showMasterBranding !== false
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {card.showMasterBranding !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{card.showMasterBranding !== false ? 'चालू (ON)' : 'बंद (OFF)'}</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                हेडर लोगो, फुटर स्ट्रिप, सोशल हैंडल व वेबसाइट सीधे आपकी <strong>प्रोफ़ाइल</strong> से ऑटो-लिंक रहते हैं।
              </p>
            </div>

            {/* 3. Footer Style Customization (3 Blocks Center Aligned, No Partition Line) */}
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>फुटर 3 ब्लॉक्स (Social | Website | Contact):</span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  सेंटर अलाइंड • कॉम्पैक्ट
                </span>
              </div>

              {/* Background Color Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-semibold">फुटर बैकग्राउंड रंग:</span>
                  <span className="font-mono text-[10px] text-amber-300">{card.footerBgColor || '#FFFFFF'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {FOOTER_BG_PRESETS.map((p) => {
                    const isSel = (card.footerBgColor || '#FFFFFF').toUpperCase() === p.color.toUpperCase();
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => onChange({ footerBgColor: p.color })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSel ? 'ring-2 ring-yellow-400 scale-105 shadow-sm' : 'hover:border-neutral-500'
                        } ${p.border}`}
                        style={{ backgroundColor: p.color, color: p.color === '#0F172A' || p.color === '#000000' || p.color === '#DC2626' ? '#FFFFFF' : '#1E293B' }}
                      >
                        <span className="text-[10px]">{p.label}</span>
                        {isSel && <span className="text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact ON/OFF and details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">वेबसाइट:</label>
                  <input
                    type="text"
                    value={card.websiteUrl || ''}
                    onChange={(e) => onChange({ websiteUrl: e.target.value })}
                    placeholder="ainewsmaker.online"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-neutral-300 font-bold">WhatsApp / Contact:</label>
                    <button
                      type="button"
                      onClick={() => onChange({ showMobileNumber: !card.showMobileNumber })}
                      className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${
                        card.showMobileNumber !== false
                          ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-600/60 hover:bg-rose-900'
                      }`}
                      title={card.showMobileNumber !== false ? 'नंबर छिपाने हेतु क्लिक करें' : 'नंबर दिखाने हेतु क्लिक करें'}
                    >
                      <span>{card.showMobileNumber !== false ? '✓ ON (दिखेगा)' : '✕ OFF (छिपा)'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={card.whatsappNumber || ''}
                    onChange={(e) => onChange({ whatsappNumber: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 7 Navigation Buttons */}
            {mobileViewMode === 'steps' && (
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleGoToStep(6)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>पिछला: तारीख व वॉटरमार्क</span>
                </button>
                <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 8 / {STEPS.length}</span>
                <button
                  type="button"
                  onClick={() => handleGoToStep(8)}
                  className="px-3.5 py-1.5 rounded-lg bg-yellow-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
                >
                  <span>अगला: डाउनलोड</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          

      {/* ========================================================================= */}
      {/* STEP 8: डाउनलोड (HD कार्ड एक्सपोर्ट) */}
      {/* ========================================================================= */}
      {(mobileViewMode === 'all' || activeStep === 7 || activeStep === 8) && (
        <div
          id="step-download"
          style={{ scrollMarginTop: '120px' }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 scroll-mt-28"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-sm shadow-sm">
                8
              </span>
              <h2 className="text-base sm:text-lg font-black text-white font-['Mukta']">
                डाउनलोड (HD कार्ड एक्सपोर्ट)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
              1080×1350 HD
            </span>
          </div>

          <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800/80 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shrink-0 shadow-md text-white font-black">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm sm:text-base">
                  सोशल मीडिया रेडी न्यूज़ कार्ड
                </span>
                <span className="text-xs text-neutral-400">
                  इंस्टाग्राम, फेसबुक, ट्विटर और व्हाट्सएप हेतु 4:5 आस्पेक्ट रेशियो में क्रिस्टल क्लीयर इमेज।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDownload?.()}
              disabled={downloading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-650 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-sm sm:text-base shadow-lg border border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Download className="w-5 h-5 text-amber-300" />
              <span>{downloading ? 'कार्ड तैयार हो रहा है...' : 'HD कार्ड डाउनलोड करें (JPG)'}</span>
            </button>
          </div>

          {/* Mobile Step Nav */}
          {mobileViewMode === 'steps' && (
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => handleGoToStep(7)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>पिछला: फुटर</span>
              </button>
              <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 7 / {STEPS.length}</span>
              <button
                type="button"
                onClick={onOpenCaptionModal}
                className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-black flex items-center gap-1 shadow cursor-pointer"
              >
                <span>कैप्शन व शेयर</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: कैप्शन (सोशल मीडिया कैप्शन व शेयर) */}
      {/* ========================================================================= */}
      {(mobileViewMode === 'all' || activeStep === 8) && (
        <div
          id="step-caption"
          style={{ scrollMarginTop: '380px' }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 scroll-mt-[380px]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-sm shadow-sm">
                7
              </span>
              <h2 className="text-base sm:text-lg font-black text-white font-['Mukta']">
                कैप्शन (सोशल मीडिया कैप्शन व शेयर)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold border border-green-500/30">
              ऑटो कैप्शन
            </span>
          </div>

          <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800/80 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center shrink-0 text-green-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm sm:text-base">
                  रेडी-टू-पोस्ट कैप्शन व हैशटैग्स
                </span>
                <span className="text-xs text-neutral-400">
                  हेडलाइन, जिला और तारीख के साथ तैयार सोशल मीडिया टेक्स्ट को एक क्लिक में कॉपी करें।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCaptionModal}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm sm:text-base shadow-lg border border-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Share2 className="w-5 h-5 text-emerald-200" />
              <span>कैप्शन बॉक्स खोलें व कॉपी करें</span>
            </button>
          </div>


          {/* Mobile Step Nav */}
          {mobileViewMode === 'steps' && (
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs lg:hidden">
              <button
                type="button"
                onClick={() => handleGoToStep(7)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>पिछला: फुटर</span>
              </button>
              <span className="text-neutral-500 font-semibold text-[11px]">स्टेप 7 / {STEPS.length}</span>
              <button
                type="button"
                onClick={() => handleGoToStep(1)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-black flex items-center gap-1 shadow cursor-pointer"
              >
                <span>स्टेप 1 पर जाएं</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};
