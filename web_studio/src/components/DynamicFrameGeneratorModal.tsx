import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  X,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  ShieldCheck,
  Crown,
  AlertTriangle,
  Move,
  Maximize2,
  Sliders,
  Image as ImageIcon,
  Type,
  FileCheck,
  RefreshCw,
  Info,
  Calendar,
  BadgeCheck,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  RotateCw,
  ShieldAlert,
  Film,
  Download,
  MapPin,
  FileText,
  Camera,
  AlertCircle,
} from 'lucide-react';
import {
  DynamicFrameTemplate,
  DynamicAspectRatio,
  DynamicDesignCategory,
  DYNAMIC_FRAME_CATEGORIES,
  DynamicPlanTier,
  DYNAMIC_PLAN_TIERS,
  NormalizedRect,
  PhotoSlotConfig,
  PhotoSlotType,
  TextSlotConfig,
  FrameLayer,
  FrameLayerType,
  HeaderConfig,
  FooterConfig,
  RibbonConfig,
  WatermarkConfig,
  FullStoryCalloutConfig,
  PoweredByConfig,
  SafeZoneConfig,
  StatementOptions,
  StatementBackgroundMode,
  FrameMode,
  PHOTO_ALLOWED_ASPECT_RATIOS,
  VIDEO_ALLOWED_ASPECT_RATIOS,
  PhotoLayoutMode,
  PhotoLayoutVariantConfig,
  LocationBadgeMode,
  DateStampStyle,
  WatermarkStyle,
  CalloutVisibilityPolicy,
  CalloutAssetMode,
  PrimaryBackgroundMode,
} from '../types/dynamicFrame';
import {
  saveDynamicFrameToApi,
  requestAiFrameAnalysis,
  AiFrameAnalysisResult,
  getLocalDynamicFrames,
} from '../lib/dynamicFramesManager';
import { computeCanonicalHeadlineLayout, normalizeHeadlineText } from '../lib/canonicalLayoutEngine';
import { drawThemeFooterBar } from '../lib/CanvasExporter';

/**
 * Robust image loader that avoids setting crossOrigin on data: and blob: URLs
 * to eliminate CORS/security failures in modern web engines.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Empty src'));
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (img.crossOrigin) {
        const retry = new Image();
        retry.onload = () => resolve(retry);
        retry.onerror = (e) => reject(e);
        retry.src = src;
      } else {
        reject(new Error(`Failed to load image: ${src.substring(0, 50)}`));
      }
    };
    img.src = src;
  });
}

/**
 * Removes baked-in fake checkerboard pattern from photo area if present in uploaded frame PNG
 */
function removeFakeCheckerboardFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  photoRect: { x: number; y: number; width: number; height: number }
) {
  try {
    const rx = Math.max(0, Math.floor((photoRect.x / 100) * width));
    const ry = Math.max(0, Math.floor((photoRect.y / 100) * height));
    const rw = Math.min(width - rx, Math.ceil((photoRect.width / 100) * width));
    const rh = Math.min(height - ry, Math.ceil((photoRect.height / 100) * height));

    if (rw <= 0 || rh <= 0) return;

    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;
    let checkerboardCount = 0;
    const totalPixels = rw * rh;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 200) {
        const isWhite = r >= 240 && g >= 240 && b >= 240;
        const isGrey = r >= 180 && r <= 230 && Math.abs(r - g) <= 5 && Math.abs(g - b) <= 5;
        if (isWhite || isGrey) {
          checkerboardCount++;
        }
      }
    }

    if (checkerboardCount / totalPixels > 0.6) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isWhite = r >= 240 && g >= 240 && b >= 240;
        const isGrey = r >= 180 && r <= 230 && Math.abs(r - g) <= 5 && Math.abs(g - b) <= 5;
        if (isWhite || isGrey) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, rx, ry);
    }
  } catch (err) {
    console.warn('Checkerboard scan error:', err);
  }
}
import { BUILTIN_RIBBONS } from '../lib/ribbonPresets';
import { STATEMENT_BACKGROUND_PRESETS } from '../lib/statementBackgroundPresets';
import { getAuthToken } from '../lib/apiConfig';

interface DynamicFrameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFramePublished?: (frame: DynamicFrameTemplate) => void;
  initialFrame?: DynamicFrameTemplate | null;
  initialMode?: 'photo' | 'video';
  currentUser?: any;
}

// Revised 8-Step Wizard Order
type WizardStage =
  | 'upload_aspect'
  | 'ai_analysis'
  | 'ribbon_header_footer'
  | 'canvas_marking'
  | 'photo_slots_layout'
  | 'text_quote_config'
  | 'dual_live_preview'
  | 'plan_publish';

export function getDefaultLayoutVariants(aspectRatio: DynamicAspectRatio): PhotoLayoutVariantConfig[] {
  const isStory = aspectRatio === '9:16';
  const maxHeight = isStory ? 75 : 62;
  const halfHeight = (maxHeight - 1) / 2;

  return [
    {
      id: 'var_single',
      mode: 'single',
      label: 'सिंगल फोटो (1 Photo Full)',
      enabled: true,
      slots: [
        {
          id: 'slot_photo_1',
          name: 'मुख्य फोटो (Main Photo)',
          slotType: 'normal',
          rect: { x: 0, y: 0, width: 100, height: maxHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
      ],
    },
    {
      id: 'var_dual_50_50',
      mode: 'dual_50_50',
      label: 'ड्यूल 50:50 स्प्लिट (Side-by-Side)',
      enabled: true,
      slots: [
        {
          id: 'slot_photo_1',
          name: 'बायाँ फोटो (Left Photo)',
          slotType: 'normal',
          rect: { x: 0, y: 0, width: 49.5, height: maxHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_2',
          name: 'दायाँ फोटो (Right Photo)',
          slotType: 'normal',
          rect: { x: 50.5, y: 0, width: 49.5, height: maxHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
      ],
    },
    {
      id: 'var_dual_vertical',
      mode: 'dual_vertical',
      label: 'ड्यूल वर्टिकल (Top / Bottom)',
      enabled: true,
      slots: [
        {
          id: 'slot_photo_1',
          name: 'ऊपरी फोटो (Top Photo)',
          slotType: 'normal',
          rect: { x: 0, y: 0, width: 100, height: halfHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_2',
          name: 'निचला फोटो (Bottom Photo)',
          slotType: 'normal',
          rect: { x: 0, y: halfHeight + 1, width: 100, height: halfHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
      ],
    },
    {
      id: 'var_triple',
      mode: 'triple',
      label: 'ट्रिपल फोटो (1 Large + 2 Small)',
      enabled: true,
      slots: [
        {
          id: 'slot_photo_1',
          name: 'बड़ा फोटो (Left Main)',
          slotType: 'normal',
          rect: { x: 0, y: 0, width: 59.5, height: maxHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_2',
          name: 'छोटा फोटो 1 (Top Right)',
          slotType: 'normal',
          rect: { x: 60.5, y: 0, width: 39.5, height: halfHeight },
          required: false,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_3',
          name: 'छोटा फोटो 2 (Bottom Right)',
          slotType: 'normal',
          rect: { x: 60.5, y: halfHeight + 1, width: 39.5, height: halfHeight },
          required: false,
          cropMode: 'cover',
          bgRemoval: false,
        },
      ],
    },
    {
      id: 'var_quad',
      mode: 'quad',
      label: 'फोर फोटो (2×2 Grid)',
      enabled: true,
      slots: [
        {
          id: 'slot_photo_1',
          name: 'फोटो 1 (Top Left)',
          slotType: 'normal',
          rect: { x: 0, y: 0, width: 49.5, height: halfHeight },
          required: true,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_2',
          name: 'फोटो 2 (Top Right)',
          slotType: 'normal',
          rect: { x: 50.5, y: 0, width: 49.5, height: halfHeight },
          required: false,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_3',
          name: 'फोटो 3 (Bottom Left)',
          slotType: 'normal',
          rect: { x: 0, y: halfHeight + 1, width: 49.5, height: halfHeight },
          required: false,
          cropMode: 'cover',
          bgRemoval: false,
        },
        {
          id: 'slot_photo_4',
          name: 'फोटो 4 (Bottom Right)',
          slotType: 'normal',
          rect: { x: 50.5, y: halfHeight + 1, width: 49.5, height: halfHeight },
          required: false,
          cropMode: 'cover',
          bgRemoval: false,
        },
      ],
    },
  ];
}

export const DynamicFrameGeneratorModal: React.FC<DynamicFrameGeneratorModalProps> = ({
  isOpen,
  onClose,
  onFramePublished,
  initialFrame,
  initialMode = 'photo',
  currentUser,
}) => {
  // Mobile Screen Detection
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  useEffect(() => {
    const checkWidth = () => {
      setIsMobileScreen(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Wizard Stage
  const [currentStage, setCurrentStage] = useState<WizardStage>('upload_aspect');

  // Generator Mode: Photo vs Video
  const [generatorMode, setGeneratorMode] = useState<FrameMode>(
    initialFrame?.frameMode || initialMode || 'photo'
  );

  // Stage 1: Dual Upload & Ratio Selection
  const [sampleImage, setSampleImage] = useState<string>(initialFrame?.sampleReferenceUrl || '');
  const [sampleFileName, setSampleFileName] = useState<string>('');

  const [primaryBackgroundAsset, setPrimaryBackgroundAsset] = useState<string>(
    initialFrame?.primaryBackgroundAsset || ''
  );
  const [primaryBackgroundMode, setPrimaryBackgroundMode] = useState<PrimaryBackgroundMode>('image');
  const [primaryBackgroundHex, setPrimaryBackgroundHex] = useState<string>(
    initialFrame?.primaryBackgroundHex || '#0B1329'
  );
  const [primaryBgFileName, setPrimaryBgFileName] = useState<string>('');
  const [primaryBgDimensions, setPrimaryBgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPngTransparent, setIsPngTransparent] = useState<boolean | null>(null);


  // Typography Configuration (Part 4, Req 8)
  const [typographyFontFamily, setTypographyFontFamily] = useState<string>(
    initialFrame?.typographyConfig?.primaryFontFamily || 'Noto Sans Devanagari'
  );
  const [typographyFontSize, setTypographyFontSize] = useState<number>(
    initialFrame?.typographyConfig?.primaryFontSize || 70
  );
  const [typographyFontWeight, setTypographyFontWeight] = useState<string>(
    initialFrame?.typographyConfig?.fontWeight || 'bold'
  );

  // Video-First Configurations (Part 6 & 7)
  const [videoDisplayMode, setVideoDisplayMode] = useState<'fit' | 'crop'>(
    initialFrame?.videoConfig?.displayMode || 'fit'
  );
  const [videoFooterPosition, setVideoFooterPosition] = useState<'bottom' | 'top'>(
    initialFrame?.videoConfig?.footerPosition || 'bottom'
  );
  const [videoLocationBadgeUrl, setVideoLocationBadgeUrl] = useState<string>(
    initialFrame?.videoConfig?.locationBadgeUrl || ''
  );
  const [videoWatermarkTextEnabled, setVideoWatermarkTextEnabled] = useState<boolean>(
    Boolean(initialFrame?.videoConfig?.watermarkTextEnabled)
  );
  const [videoWatermarkText, setVideoWatermarkText] = useState<string>(
    initialFrame?.videoConfig?.watermarkText || 'AI NEWS MAKER'
  );
  const [videoWatermarkLogoEnabled, setVideoWatermarkLogoEnabled] = useState<boolean>(
    Boolean(initialFrame?.videoConfig?.watermarkLogoEnabled)
  );
  const [videoWatermarkLogoUrl, setVideoWatermarkLogoUrl] = useState<string>(
    initialFrame?.videoConfig?.watermarkLogoUrl || ''
  );
  const [videoWatermarkUserAllowed, setVideoWatermarkUserAllowed] = useState<boolean>(
    initialFrame?.videoConfig?.watermarkUserAllowed !== false
  );
  const [videoRect, setVideoRect] = useState<NormalizedRect>(
    initialFrame?.videoConfig?.videoRect || { x: 0, y: 15, width: 100, height: 75 }
  );

  // Sample Media for Dual Live Preview (Req 6 & 18)
  const [samplePhotoPreview, setSamplePhotoPreview] = useState<string>(initialFrame?.samplePhotoUrl || '');
  const [sampleVideoPreview, setSampleVideoPreview] = useState<string>(initialFrame?.sampleVideoUrl || '');

  // Pre-designed Callout PNG (Req 9 & 11)
  const [manualCalloutAssetUrl, setManualCalloutAssetUrl] = useState<string>(
    initialFrame?.calloutAssetUrl || initialFrame?.fullStoryCalloutConfig?.manualCalloutAsset || ''
  );

  // Central Approved Built-in Fallbacks for Location Badge & Story Callout
  const FALLBACK_LOCATION_BADGES = [
    {
      id: 'asset_1794132101671_u0g9s',
      name: 'Red Map Pin Badge with Divider',
      category: 'general',
      type: 'location_badge',
      url: '/assets/location_white_icon.png',
      assetUrl: '/assets/location_white_icon.png',
      enabled: true,
      textRegion: { x: 32, y: 24, width: 58, height: 55 },
      typographyConfig: { fontFamily: 'Mukta', fontSize: 50, fontWeight: 'bold', textColor: '#000000', textAlign: 'center' },
    },
  ];

  const FALLBACK_CALLOUTS = [
    {
      id: 'callout_bully_forward_story',
      name: 'पूरी खबर विवरण कॉलआउट (Full Story Callout)',
      category: 'general',
      type: 'callout_png',
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23DC2626'/><stop offset='60%' stop-color='%23991B1B'/><stop offset='100%' stop-color='%231E293B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23bgGrad)' stroke='%23FACC15' stroke-width='3'/><polygon points='38,24 54,36 38,48' fill='%23FACC15'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FACC15'/><polygon points='436,28 448,36 436,44' fill='%23000000'/></svg>",
      assetUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23DC2626'/><stop offset='60%' stop-color='%23991B1B'/><stop offset='100%' stop-color='%231E293B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23bgGrad)' stroke='%23FACC15' stroke-width='3'/><polygon points='38,24 54,36 38,48' fill='%23FACC15'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FACC15'/><polygon points='436,28 448,36 436,44' fill='%23000000'/></svg>",
      enabled: true,
    },
  ];

  // Central Asset Libraries for Location Badge & Story Callout (Part 1 & 2: Expandable List UI)
  const [locationBadgeLibrary, setLocationBadgeLibrary] = useState<any[]>(FALLBACK_LOCATION_BADGES);
  const [calloutLibrary, setCalloutLibrary] = useState<any[]>(FALLBACK_CALLOUTS);
  const [isCalloutListExpanded, setIsCalloutListExpanded] = useState<boolean>(true);
  const [isLocationBadgeListExpanded, setIsLocationBadgeListExpanded] = useState<boolean>(true);

  useEffect(() => {
    // Fetch central approved asset libraries with robust alias matching
    fetch('/api/admin/asset-libraries')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.items)) {
          const badges = d.items.filter((it: any) =>
            it.type === 'location_badge' ||
            it.category === 'location_badge' ||
            it.type === 'location' ||
            it.type === 'badge' ||
            (it.name && /badge|बैज|location|लोकेशन|pin|पिंन/i.test(it.name))
          ).map((it: any) => ({
            ...it,
            url: it.url || it.assetUrl || '',
            assetUrl: it.assetUrl || it.url || '',
          }));

          const callouts = d.items.filter((it: any) =>
            it.type === 'callout_png' ||
            it.category === 'callout_png' ||
            it.type === 'callout' ||
            it.type === 'story_callout' ||
            it.type === 'full_story' ||
            it.type === 'description_callout' ||
            (it.name && /callout|कॉलआउट|विवरण|डिस्क्रिप्शन|story|bully|forward/i.test(it.name))
          ).map((it: any) => ({
            ...it,
            url: it.url || it.assetUrl || '',
            assetUrl: it.assetUrl || it.url || '',
          }));

          if (badges.length > 0) setLocationBadgeLibrary(badges);
          if (callouts.length > 0) setCalloutLibrary(callouts);
        }
      })
      .catch((err) => {
        console.warn('Could not load asset libraries in modal:', err);
      });
  }, []);

  const [selectedRatio, setSelectedRatio] = useState<DynamicAspectRatio>(
    initialFrame?.aspectRatio || '4:5'
  );

  // Stage 2: AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AiFrameAnalysisResult | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');

  // Stage 4: Interactive Canvas Marking State
  const [activeTool, setActiveTool] = useState<'select' | 'draw_rect'>('select');
  const [drawingElementType, setDrawingElementType] = useState<FrameLayerType>('photo');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('layer_photo_1');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'layers' | 'properties'>('layers');

  // Canvas Drag & Resize Engine State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawRect, setCurrentDrawRect] = useState<NormalizedRect | null>(null);

  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragHandle, setDragHandle] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialLayerRect, setInitialLayerRect] = useState<NormalizedRect | null>(null);

  // Stage 5: Dynamic Photo Slots & Multi-Photo Layout Variants
  const [layoutVariants, setLayoutVariants] = useState<PhotoLayoutVariantConfig[]>(() => {
    if (initialFrame?.photoLayoutVariants && initialFrame.photoLayoutVariants.length > 0) {
      return initialFrame.photoLayoutVariants;
    }
    return getDefaultLayoutVariants(initialFrame?.aspectRatio || '4:5');
  });

  const [activeLayoutMode, setActiveLayoutMode] = useState<PhotoLayoutMode>(
    initialFrame?.activePhotoLayoutMode || 'single'
  );

  const [photoSlots, setPhotoSlots] = useState<PhotoSlotConfig[]>(() => {
    if (initialFrame?.photoSlots && initialFrame.photoSlots.length > 0) {
      return initialFrame.photoSlots;
    }
    const def = getDefaultLayoutVariants(initialFrame?.aspectRatio || '4:5')[0];
    return def.slots;
  });

  // When active layout mode changes, update photoSlots from layout variant
  const handleSelectLayoutMode = (mode: PhotoLayoutMode) => {
    setActiveLayoutMode(mode);
    const variant = layoutVariants.find((v) => v.mode === mode);
    if (variant && variant.slots.length > 0) {
      setPhotoSlots(variant.slots);
    }
  };

  // Stage 6: Text Elements Configuration & Devanagari Headline
  const [textSlots, setTextSlots] = useState<TextSlotConfig[]>(
    initialFrame?.textSlots && initialFrame.textSlots.length > 0
      ? initialFrame.textSlots
      : [
          {
            id: 'slot_text_headline',
            name: 'मुख्य हेडलाइन (Main Headline)',
            role: 'headline',
            rect: { x: 7, y: 63, width: 86, height: 27 },
            fontFamily: 'Noto Sans Devanagari',
            fontSize: 70,
            fontWeight: 'bold',
            textColor: '#FFFFFF',
            alignment: 'center',
            maxLines: 3,
            lineHeight: 1.3,
            padding: 12,
            backgroundColor: 'transparent',
          },
        ]
  );

  // Statement / Bayaanbaazi settings
  const [isStatementFrame, setIsStatementFrame] = useState<boolean>(initialFrame?.isStatementFrame || false);
  const [statementBgMode, setStatementBgMode] = useState<StatementBackgroundMode>(
    initialFrame?.statementOptions?.backgroundMode || 'solid'
  );
  const [statementBgColor, setStatementBgColor] = useState<string>(
    initialFrame?.statementOptions?.solidBackgroundHex || '#C81E1E'
  );
  const [curatedBgId, setCuratedBgId] = useState<string>(
    initialFrame?.statementOptions?.curatedBackgroundId || 'bg_crimson_editorial'
  );
  const [aiBgPrompt, setAiBgPrompt] = useState<string>(
    initialFrame?.statementOptions?.aiPrompt || 'गंभीर राजनीतिक वक्तव्य के लिए डार्क एलिगेंट बैकग्राउंड'
  );
  const [statementCutoutPos, setStatementCutoutPos] = useState<'left' | 'right'>(
    initialFrame?.statementOptions?.cutoutPosition || 'right'
  );

  // Stage 3: Independent Header Elements (Logo, Location, Date, Watermark, Callout, Ribbon, PoweredBy, Footer)
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(
    initialFrame?.headerConfig || {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      logoOpacity: 1.0,
      logoAlign: 'left',

      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 },
      locationStyle: 'pill',
      locationBgColor: '#DC2626',
      locationTextColor: '#FFFFFF',
      locationFontSize: 24,
      locationShowIcon: true,
      locationAlign: 'center',
      locationBadgeMode: 'dynamic_overlay',
      manualLocationAsset: '',

      showDate: false,
      dateRect: { x: 2, y: 35, width: 4, height: 26 },
      dateFormat: 'hi_full',
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
      dateBgColor: 'rgba(0,0,0,0.7)',
      dateOpacity: 0.9,
      dateRotation: 270,
      dateAlign: 'center',
      dateStampStyle: 'only_text',
    }
  );

  // Watermark (AI GENERATED / प्रतीकात्मक फोटो - Part 4 default: 270° Vertical Right Edge)
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(
    initialFrame?.watermarkConfig || {
      enabled: false,
      type: 'text',
      label: 'AI GENERATED',
      customText: 'AI GENERATED',
      position: 'right_edge',
      rect: { x: 92, y: 35, width: 6, height: 25 },
      fontSize: 14,
      textColor: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.6)',
      opacity: 0.85,
      rotation: 270,
      align: 'center',
      watermarkStyle: 'badge',
    }
  );

  // Full Story Callout ("पूरी खबर डिस्क्रिप्शन में")
  const [fullStoryCalloutConfig, setFullStoryCalloutConfig] = useState<FullStoryCalloutConfig>(
    initialFrame?.fullStoryCalloutConfig || {
      enabled: false,
      text: 'पूरी खबर डिस्क्रिप्शन में',
      rect: { x: 10, y: 88, width: 80, height: 3.5 },
      fontSize: 18,
      textColor: '#FFFFFF',
      bgColor: '#DC2626',
      borderColor: '#FACC15',
      borderWidth: 1,
      align: 'center',
      showIcon: true,
      rotation: 0,
      calloutAssetMode: 'dynamic_overlay',
      calloutVisibilityPolicy: 'optional',
      manualCalloutAsset: '',
    }
  );

  // Optional POWERED BY Element
  const [poweredByConfig, setPoweredByConfig] = useState<PoweredByConfig>(
    initialFrame?.poweredByConfig || {
      enabled: false,
      text: 'POWERED BY AINEWSMAKER.ONLINE',
      rect: { x: 55, y: 92, width: 42, height: 3.5 },
      fontSize: 16,
      textColor: '#FFFFFF',
      bgColor: 'rgba(15, 23, 42, 0.85)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      opacity: 0.85,
      rotation: 0,
      alignment: 'center',
    }
  );

  // Safe Zone System
  const [safeZoneConfig, setSafeZoneConfig] = useState<SafeZoneConfig>(
    initialFrame?.safeZoneConfig || {
      enabled: true,
      topMarginPct: selectedRatio === '4:5' ? 4 : 5,
      bottomMarginPct: selectedRatio === '4:5' ? 8 : 6.5,
      leftMarginPct: 4,
      rightMarginPct: 4,
      headerSafeAreaPct: 12,
      footerSafeAreaPct: selectedRatio === '4:5' ? 8 : 6.5,
    }
  );

  // Permanent Protected Footer
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(
    initialFrame?.footerConfig || {
      footerHeightRatio: selectedRatio === '4:5' ? 0.08 : 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
      footerWidthPct: 100,
      footerAlignment: 'center',
      footerInset: 0,
      primaryFooterColor: '#FFFFFF',
      bannedFooterColor: '',
    }
  );

  const [primaryFooterColor, setPrimaryFooterColor] = useState<string>(
    initialFrame?.footerConfig?.primaryFooterColor || initialFrame?.primaryFooterColor || initialFrame?.footerConfig?.footerBgColor || '#FFFFFF'
  );
  const [bannedFooterColor, setBannedFooterColor] = useState<string>(
    initialFrame?.footerConfig?.bannedFooterColor || initialFrame?.bannedFooterColor || ''
  );

  const isFooterColorConflict = useMemo(() => {
    if (!primaryFooterColor || !bannedFooterColor) return false;
    return primaryFooterColor.trim().toLowerCase() === bannedFooterColor.trim().toLowerCase();
  }, [primaryFooterColor, bannedFooterColor]);

  // Ribbon
  const [ribbonConfig, setRibbonConfig] = useState<RibbonConfig>(
    initialFrame?.ribbonConfig || {
      enabled: false,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 15, y: 60, width: 70, height: 8 },
      scalePct: 70,
      rotation: 0,
    }
  );

  // Comprehensive Layers State
  const [layers, setLayers] = useState<FrameLayer[]>(
    initialFrame?.layers && initialFrame.layers.length > 0
      ? initialFrame.layers
      : [
          { id: 'layer_photo_1', name: 'मुख्य फोटो', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 61.33 }, visible: true, locked: false, zIndex: 1 },
          { id: 'layer_headline', name: 'हेडलाइन लेयर', type: 'text', rect: { x: 7, y: 63, width: 86, height: 27 }, visible: true, locked: false, zIndex: 5 },
          { id: 'layer_logo', name: 'चैनल लोगो', type: 'logo', rect: { x: 5, y: 3.5, width: 22, height: 9 }, visible: true, locked: false, zIndex: 10 },
          { id: 'layer_location', name: 'लोकेशन बैज', type: 'location', rect: { x: 5, y: 13.5, width: 28, height: 4.5 }, visible: true, locked: false, zIndex: 11 },
          { id: 'layer_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 92, width: 100, height: 8 }, visible: true, locked: true, zIndex: 20 },
        ]
  );

  // Stage 8: Metadata & Publishing
  const [frameName, setFrameName] = useState<string>(initialFrame?.name || '');
  const [frameDescription, setFrameDescription] = useState<string>(initialFrame?.description || '');
  const [designCategory, setDesignCategory] = useState<DynamicDesignCategory>(
    initialFrame?.designCategory || (selectedRatio === '9:16' ? 'Story Frames' : 'Regular Frames')
  );
  const [allowedPlans, setAllowedPlans] = useState<DynamicPlanTier[]>(
    initialFrame?.allowedPlans || ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK']
  );
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'preview' | 'published'>('published');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stage 7 Test Inputs State
  const [testPhotos, setTestPhotos] = useState<string[]>(['', '', '', '']);
  const [testHeadline, setTestHeadline] = useState<string>(
    'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी'
  );

  // Part 2: Sample Test Mode (Dummy Text Input) State
  const [dummyLine1, setDummyLine1] = useState<string>('मध्य प्रदेश में ऐतिहासिक फैसला:');
  const [dummyLine2, setDummyLine2] = useState<string>('कैबिनेट बैठक में बड़े प्रस्तावों को');
  const [dummyLine3, setDummyLine3] = useState<string>('मिली अंतिम मंजूरी');
  const [dummyLocation, setDummyLocation] = useState<string>('भोपाल');
  const [dummyCalloutText, setDummyCalloutText] = useState<string>('पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें');
  const [isSampleTestModeExpanded, setIsSampleTestModeExpanded] = useState<boolean>(true);

  // Part 8: Layout Lock State (Protects canvas coordinates from accidental moves)
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(Boolean(initialFrame?.isLayoutLocked));

  const handleResetSampleText = () => {
    setDummyLine1('मध्य प्रदेश में ऐतिहासिक फैसला:');
    setDummyLine2('कैबिनेट बैठक में बड़े प्रस्तावों को');
    setDummyLine3('मिली अंतिम मंजूरी');
    setDummyLocation('भोपाल');
    setDummyCalloutText('पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें');
    setTestHeadline('मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी');
  };

  // Keep footer height aligned with ratio
  useEffect(() => {
    const fRatio = selectedRatio === '4:5' ? 0.08 : 0.065;
    setFooterConfig((prev) => ({
      ...prev,
      footerHeightRatio: fRatio,
      enforcePermanentFooter: true,
    }));
    setSafeZoneConfig((prev) => ({
      ...prev,
      topMarginPct: selectedRatio === '4:5' ? 4 : 5,
      bottomMarginPct: fRatio * 100,
      footerSafeAreaPct: fRatio * 100,
    }));
  }, [selectedRatio]);

  // Synchronize dynamic elements into layers array whenever optional elements toggle
  const syncElementsToLayers = () => {
    const newLayers: FrameLayer[] = [];

    // Background layer (if statement frame)
    if (isStatementFrame) {
      newLayers.push({
        id: 'layer_bg',
        name: 'स्टेटमेंट बैकग्राउंड',
        type: 'background',
        rect: { x: 0, y: 0, width: 100, height: 100 - footerConfig.footerHeightRatio * 100 },
        visible: true,
        locked: true,
        zIndex: 1,
      });
    }

    // Photo or Video layers
    if (generatorMode === 'video') {
      newLayers.push({
        id: 'layer_main_video',
        name: 'मुख्य वीडियो (Main Video)',
        type: 'photo',
        rect: videoRect,
        visible: true,
        locked: false,
        zIndex: 5,
      });
    } else {
      photoSlots.forEach((slot, idx) => {
        newLayers.push({
          id: `layer_photo_${slot.id}`,
          name: slot.name,
          type: 'photo',
          rect: slot.rect,
          visible: true,
          locked: false,
          zIndex: 5 + idx,
        });
      });
    }

    // Text layers
    textSlots.forEach((slot, idx) => {
      newLayers.push({
        id: `layer_text_${slot.id}`,
        name: slot.name,
        type: 'text',
        rect: slot.rect,
        visible: true,
        locked: false,
        zIndex: 15 + idx,
      });
    });

    // Breaking Ribbon layer
    if (ribbonConfig.enabled && ribbonConfig.rect) {
      newLayers.push({
        id: 'layer_ribbon',
        name: 'ब्रेकिंग रिबन (Ribbon)',
        type: 'ribbon',
        rect: ribbonConfig.rect,
        visible: true,
        locked: false,
        zIndex: 25,
      });
    }

    // Logo layer
    if (headerConfig.showLogo && headerConfig.logoRect) {
      newLayers.push({
        id: 'layer_logo',
        name: 'चैनल लोगो (Logo)',
        type: 'logo',
        rect: headerConfig.logoRect,
        visible: true,
        locked: false,
        zIndex: 30,
      });
    }

    // Location Badge layer
    if (headerConfig.showLocation && headerConfig.locationRect) {
      newLayers.push({
        id: 'layer_location',
        name: 'लोकेशन बैज (Location Badge)',
        type: 'location',
        rect: headerConfig.locationRect,
        visible: true,
        locked: false,
        zIndex: 31,
      });
    }

    // Date stamp layer
    if (headerConfig.showDate && headerConfig.dateRect) {
      newLayers.push({
        id: 'layer_date',
        name: 'दिनांक मुहर (Date Stamp)',
        type: 'date',
        rect: headerConfig.dateRect,
        visible: true,
        locked: false,
        zIndex: 32,
      });
    }

    // Watermark layer
    if (watermarkConfig.enabled && watermarkConfig.rect) {
      newLayers.push({
        id: 'layer_watermark',
        name: 'वॉटरमार्क (AI Watermark)',
        type: 'watermark',
        rect: watermarkConfig.rect,
        visible: true,
        locked: false,
        zIndex: 33,
      });
    }

    // Callout layer
    if (fullStoryCalloutConfig.enabled && fullStoryCalloutConfig.rect) {
      newLayers.push({
        id: 'layer_callout',
        name: 'पूरी खबर कॉलआउट (Callout)',
        type: 'callout',
        rect: fullStoryCalloutConfig.rect,
        visible: true,
        locked: false,
        zIndex: 34,
      });
    }

    // Optional Powered By Branding layer
    if (poweredByConfig.enabled && poweredByConfig.rect) {
      newLayers.push({
        id: 'layer_powered_by',
        name: 'POWERED BY बैज (Optional)',
        type: 'powered_by',
        rect: poweredByConfig.rect,
        visible: true,
        locked: false,
        zIndex: 35,
      });
    }

    // Footer layer (Protected, locked)
    const footerH = footerConfig.footerHeightRatio * 100;
    const footerW = footerConfig.footerWidthPct || 100;
    const footerX = footerConfig.footerAlignment === 'left' ? 0 : footerConfig.footerAlignment === 'right' ? 100 - footerW : (100 - footerW) / 2;
    newLayers.push({
      id: 'layer_footer',
      name: 'स्थाई फुटर (Permanent Footer)',
      type: 'footer',
      rect: { x: footerX, y: 100 - footerH, width: footerW, height: footerH },
      visible: true,
      locked: true,
      zIndex: 50,
    });

    setLayers(newLayers);
  };

  useEffect(() => {
    syncElementsToLayers();
  }, [
    photoSlots,
    textSlots,
    ribbonConfig.enabled,
    headerConfig.showLogo,
    headerConfig.showLocation,
    headerConfig.showDate,
    watermarkConfig.enabled,
    fullStoryCalloutConfig.enabled,
    poweredByConfig.enabled,
    isStatementFrame,
    footerConfig.footerHeightRatio,
    footerConfig.footerWidthPct,
    footerConfig.footerAlignment,
  ]);

  // Stage 1 Upload Handlers
  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSampleFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setSampleImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrimaryBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryBgFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const dataUrl = ev.target.result as string;
        setPrimaryBackgroundAsset(dataUrl);
        setPrimaryBackgroundMode('image');

        const img = new Image();
        img.onload = () => {
          setPrimaryBgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(img.naturalWidth, 150);
            canvas.height = Math.min(img.naturalHeight, 150);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              let hasAlpha = false;
              for (let i = 3; i < imgData.length; i += 4) {
                if (imgData[i] < 250) {
                  hasAlpha = true;
                  break;
                }
              }
              setIsPngTransparent(hasAlpha);
            }
          } catch {
            setIsPngTransparent(null);
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearPrimaryBg = () => {
    setPrimaryBackgroundAsset('');
    setPrimaryBgFileName('');
    setPrimaryBgDimensions(null);
    setIsPngTransparent(null);
  };

  const handleManualLocationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setHeaderConfig((prev) => ({
          ...prev,
          manualLocationAsset: ev.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualCalloutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setFullStoryCalloutConfig((prev) => ({
          ...prev,
          manualCalloutAsset: ev.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Test photo upload handler for Step 7
  const handleTestPhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setTestPhotos((prev) => {
          const updated = [...prev];
          updated[index] = ev.target!.result as string;
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Stage 2: AI Gemini Multimodal Analysis
  const handleRunAiAnalysis = async () => {
    if (!sampleImage) {
      setFeedbackMsg({ type: 'error', text: 'कृपया पहले पैनल A में सैंपल ग्राफिक अपलोड करें।' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisStatusText('Gemini 1.5 Pro विज़न से सैंपल लेआउट का विश्लेषण हो रहा है...');
    try {
      const res = await requestAiFrameAnalysis(sampleImage, selectedRatio);
      if (res.success && res.result) {
        setAnalysisResult(res.result);
        setAnalysisStatusText('विज़न विश्लेषण पूर्ण! तत्वों की पहचान कर ली गई है।');
      } else {
        setAnalysisStatusText(res.error || 'AI विश्लेषण में असमर्थ');
      }
    } catch (err: any) {
      setAnalysisStatusText('AI विश्लेषण में त्रुटि आई। डिफ़ॉल्ट लेआउट सक्रिय किया जा रहा है।');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAiAnalysis = () => {
    if (!analysisResult) return;
    const hRect = analysisResult.headlineRect || (analysisResult as any).headlineArea;
    if (hRect) {
      setTextSlots((prev) => [
        {
          ...prev[0],
          rect: hRect,
          fontSize: (analysisResult as any).headlineMaxLines === 2 ? 74 : 64,
          maxLines: (analysisResult as any).headlineMaxLines || 3,
        },
      ]);
    }
    const pRect = analysisResult.recommendedPhotoSlots?.[0]?.rect || (analysisResult as any).photoSlotArea;
    if (pRect) {
      setPhotoSlots((prev) => [
        {
          ...prev[0],
          rect: pRect,
        },
      ]);
    }
    const lRect = analysisResult.logoRect || (analysisResult as any).logoArea;
    if (lRect) {
      setHeaderConfig((prev) => ({
        ...prev,
        showLogo: true,
        logoRect: lRect,
      }));
    }
    const locRect = analysisResult.locationRect || (analysisResult as any).locationArea;
    if (locRect) {
      setHeaderConfig((prev) => ({
        ...prev,
        showLocation: true,
        locationRect: locRect,
      }));
    }
    if (analysisResult.dateRect) {
      setHeaderConfig((prev) => ({
        ...prev,
        showDate: true,
        dateRect: analysisResult.dateRect,
      }));
    }
    if (analysisResult.watermarkRect) {
      setWatermarkConfig((prev) => ({
        ...prev,
        enabled: true,
        rect: analysisResult.watermarkRect,
      }));
    }
    if (analysisResult.footerRect) {
      const fH = Math.min(15, Math.max(5, analysisResult.footerRect.height || 8));
      setFooterConfig((prev) => ({
        ...prev,
        footerHeightRatio: fH / 100,
        footerWidthPct: analysisResult.footerRect.width || 100,
      }));
    }
    setFeedbackMsg({ type: 'success', text: 'AI लेआउट निर्देशांक सफलतापूर्वक लागू किए गए!' });
    setCurrentStage('ribbon_header_footer');
  };

  // Interactive Canvas Marking Engine Handlers (Pointer Event Engine with Touch & Mouse Drag)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Canvas pointer down for deselection or drawing
  };

  const handleLayerPointerDown = (layerId: string, handle: 'move' | 'nw' | 'ne' | 'se' | 'sw', e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedLayerId(layerId);
    if (isLayoutLocked) return;
    const targetLayer = layers.find((l) => l.id === layerId);
    if (!targetLayer) return;
    if (targetLayer.locked && targetLayer.type === 'footer') {
      return;
    }
    if (targetLayer.locked) return;

    setIsDraggingElement(true);
    setDragHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialLayerRect({ ...targetLayer.rect });
  };

  const handleRotateActiveLayer = (deg: number) => {
    if (isLayoutLocked) return;
    if (!selectedLayerId) return;
    const cleanDeg = (deg + 360) % 360;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedLayerId ? { ...l, rotation: cleanDeg } : l))
    );

    if (selectedLayerId.startsWith('layer_photo_')) {
      const slotId = selectedLayerId.replace('layer_photo_', '');
      setPhotoSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, rotation: cleanDeg } : s))
      );
    } else if (selectedLayerId.startsWith('layer_text_')) {
      const slotId = selectedLayerId.replace('layer_text_', '');
      setTextSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, rotation: cleanDeg } : s))
      );
    } else if (selectedLayerId === 'layer_logo') {
      setHeaderConfig((prev) => ({ ...prev, logoRotation: cleanDeg }));
    } else if (selectedLayerId === 'layer_location') {
      setHeaderConfig((prev) => ({ ...prev, locationRotation: cleanDeg }));
    } else if (selectedLayerId === 'layer_date') {
      setHeaderConfig((prev) => ({ ...prev, dateRotation: cleanDeg }));
    } else if (selectedLayerId === 'layer_watermark') {
      setWatermarkConfig((prev) => ({ ...prev, rotation: cleanDeg }));
    } else if (selectedLayerId === 'layer_callout') {
      setFullStoryCalloutConfig((prev) => ({ ...prev, rotation: cleanDeg }));
    }
  };

  const handleToggleLayerLock = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const canvasBounds = canvasRef.current.getBoundingClientRect();

    if (isDraggingElement && dragStartPos && initialLayerRect && selectedLayerId) {
      const selectedLayer = layers.find((l) => l.id === selectedLayerId);
      if (!selectedLayer) return;

      const dxPx = e.clientX - dragStartPos.x;
      const dyPx = e.clientY - dragStartPos.y;
      const dxPct = (dxPx / canvasBounds.width) * 100;
      const dyPct = (dyPx / canvasBounds.height) * 100;

      const footerHeightPct = footerConfig.footerHeightRatio * 100;
      const maxY = 100 - footerHeightPct;

      let newRect = { ...initialLayerRect };
      if (dragHandle === 'move') {
        if (selectedLayer.type === 'footer') {
          const newX = Math.max(0, Math.min(100 - initialLayerRect.width, initialLayerRect.x + dxPct));
          newRect = { ...initialLayerRect, x: newX, y: 100 - footerHeightPct };
        } else {
          newRect.x = Math.max(0, Math.min(100 - newRect.width, initialLayerRect.x + dxPct));
          newRect.y = Math.max(0, Math.min(maxY - newRect.height, initialLayerRect.y + dyPct));
        }
      } else if (dragHandle === 'se') {
        newRect.width = Math.max(5, Math.min(100 - newRect.x, initialLayerRect.width + dxPct));
        newRect.height = Math.max(3, Math.min(maxY - newRect.y, initialLayerRect.height + dyPct));
      } else if (dragHandle === 'sw') {
        const potentialW = initialLayerRect.width - dxPct;
        if (potentialW > 5 && initialLayerRect.x + dxPct >= 0) {
          newRect.x = initialLayerRect.x + dxPct;
          newRect.width = potentialW;
        }
        newRect.height = Math.max(3, Math.min(maxY - newRect.y, initialLayerRect.height + dyPct));
      } else if (dragHandle === 'ne') {
        newRect.width = Math.max(5, Math.min(100 - newRect.x, initialLayerRect.width + dxPct));
        const potentialH = initialLayerRect.height - dyPct;
        if (potentialH > 3 && initialLayerRect.y + dyPct >= 0) {
          newRect.y = initialLayerRect.y + dyPct;
          newRect.height = potentialH;
        }
      } else if (dragHandle === 'nw') {
        const potentialW = initialLayerRect.width - dxPct;
        const potentialH = initialLayerRect.height - dyPct;
        if (potentialW > 5 && initialLayerRect.x + dxPct >= 0) {
          newRect.x = initialLayerRect.x + dxPct;
          newRect.width = potentialW;
        }
        if (potentialH > 3 && initialLayerRect.y + dyPct >= 0) {
          newRect.y = initialLayerRect.y + dyPct;
          newRect.height = potentialH;
        }
      }

      setLayers((prev) =>
        prev.map((l) => (l.id === selectedLayerId ? { ...l, rect: newRect } : l))
      );

      // Sync specific element state
      const cur = layers.find((l) => l.id === selectedLayerId);
      if (cur) {
        if (cur.type === 'logo') setHeaderConfig((prev) => ({ ...prev, logoRect: newRect }));
        if (cur.type === 'location') setHeaderConfig((prev) => ({ ...prev, locationRect: newRect }));
        if (cur.type === 'date') setHeaderConfig((prev) => ({ ...prev, dateRect: newRect }));
        if (cur.type === 'ribbon') setRibbonConfig((prev) => ({ ...prev, rect: newRect }));
        if (cur.type === 'watermark') setWatermarkConfig((prev) => ({ ...prev, rect: newRect }));
        if (cur.type === 'callout') setFullStoryCalloutConfig((prev) => ({ ...prev, rect: newRect }));
        if (cur.type === 'powered_by') setPoweredByConfig((prev) => ({ ...prev, rect: newRect }));
        if (cur.type === 'footer') {
          setFooterConfig((prev) => ({ ...prev, footerWidthPct: newRect.width }));
        }
        if (cur.type === 'photo') {
          const slotId = cur.id.replace('layer_photo_', '');
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, rect: newRect } : s))
          );
        }
        if (cur.type === 'text') {
          const textId = cur.id.replace('layer_text_', '');
          setTextSlots((prev) =>
            prev.map((t) => (t.id === textId ? { ...t, rect: newRect } : t))
          );
        }
      }
    }
  };

  const handleCanvasPointerUp = () => {
    setIsDraggingElement(false);
    setDragHandle(null);
    setDragStartPos(null);
    setInitialLayerRect(null);
  };

  // Safe Zone Validation Warnings Calculation
  const safeZoneWarnings = useMemo(() => {
    if (!safeZoneConfig.enabled) return [];
    const warnings: string[] = [];
    const minX = safeZoneConfig.leftMarginPct;
    const maxX = 100 - safeZoneConfig.rightMarginPct;
    const minY = safeZoneConfig.topMarginPct;
    const maxY = 100 - safeZoneConfig.bottomMarginPct;

    const headlineSlot = textSlots.find((t) => t.role === 'headline') || textSlots[0];
    if (headlineSlot) {
      if (headlineSlot.rect.x < minX || headlineSlot.rect.x + headlineSlot.rect.width > maxX) {
        warnings.push('हेडलाइन हॉरिजॉन्टल सेफ ज़ोन से बाहर जा रही है');
      }
      if (headlineSlot.rect.y < minY || headlineSlot.rect.y + headlineSlot.rect.height > maxY) {
        warnings.push('हेडलाइन वर्टिकल सेफ ज़ोन सीमा लांघ रही है');
      }
    }
    return warnings;
  }, [safeZoneConfig, textSlots]);

  // Statement Photo Left / Right Auto-Reflow
  const handleCutoutPositionChange = (pos: 'left' | 'right') => {
    setStatementCutoutPos(pos);
    if (pos === 'left') {
      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.slotType === 'cutout'
            ? { ...s, rect: { x: 2, y: 46, width: 48, height: 47 } }
            : s
        )
      );
      setTextSlots((prev) =>
        prev.map((t) =>
          t.role === 'quote'
            ? { ...t, rect: { x: 44, y: 16, width: 52, height: 46 }, alignment: 'left' }
            : t.role === 'speaker_name'
            ? { ...t, rect: { x: 44, y: 68, width: 48, height: 7 }, alignment: 'left' }
            : t.role === 'speaker_designation'
            ? { ...t, rect: { x: 44, y: 76, width: 48, height: 6 }, alignment: 'left' }
            : t
        )
      );
    } else {
      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.slotType === 'cutout'
            ? { ...s, rect: { x: 50, y: 46, width: 48, height: 47 } }
            : s
        )
      );
      setTextSlots((prev) =>
        prev.map((t) =>
          t.role === 'quote'
            ? { ...t, rect: { x: 4, y: 16, width: 48, height: 46 }, alignment: 'left' }
            : t.role === 'speaker_name'
            ? { ...t, rect: { x: 4, y: 68, width: 44, height: 7 }, alignment: 'left' }
            : t.role === 'speaker_designation'
            ? { ...t, rect: { x: 4, y: 76, width: 44, height: 6 }, alignment: 'left' }
            : t
        )
      );
    }
  };

  // Step 7: Full Resolution Authoritative Canonical Test Preview Download
  const handleDownloadTestPreview = async () => {
    try {
      const canvas = document.createElement('canvas');
      const w = 1080;
      const h = selectedRatio === '4:5' ? 1350 : selectedRatio === '9:16' ? 1920 : 1080;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 0. Base dark canvas (solid background, never fake checkerboard)
      ctx.fillStyle = '#0B1329';
      ctx.fillRect(0, 0, w, h);

      // LAYER 1: Photo Slots (Drawn at the bottom)
      const activeSlots = photoSlots;
      for (let i = 0; i < activeSlots.length; i++) {
        const slot = activeSlots[i];
        const testImgSrc = testPhotos[i] || samplePhotoPreview;
        const sx = (slot.rect.x / 100) * w;
        const sy = (slot.rect.y / 100) * h;
        const sw = (slot.rect.width / 100) * w;
        const sh = (slot.rect.height / 100) * h;
        const pRot = slot.rotation ?? 0;

        if (testImgSrc) {
          try {
            const pImg = await loadImageSafe(testImgSrc);
            ctx.save();
            ctx.beginPath();
            if (slot.cornerRadius) {
              const r = (slot.cornerRadius / 100) * sw;
              ctx.roundRect(sx, sy, sw, sh, r);
            } else {
              ctx.rect(sx, sy, sw, sh);
            }
            ctx.clip();

            if (pRot !== 0) {
              ctx.translate(sx + sw / 2, sy + sh / 2);
              ctx.rotate((pRot * Math.PI) / 180);
              ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
            }

            const imgAspect = pImg.width / pImg.height;
            const slotAspect = sw / sh;
            let drawW = sw, drawH = sh, dx = sx, dy = sy;
            if (imgAspect > slotAspect) {
              drawW = sh * imgAspect;
              dx = sx - (drawW - sw) / 2;
            } else {
              drawH = sw / imgAspect;
              dy = sy - (drawH - sh) / 2;
            }
            ctx.drawImage(pImg, dx, dy, drawW, drawH);
            ctx.restore();
          } catch (err) {
            console.warn('Photo slot load error:', err);
          }
        } else {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#64748B';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`फोटो स्लॉट ${i + 1}`, sx + sw / 2, sy + sh / 2);
        }
      }

      // LAYER 2: Panel B Original PNG Artwork (Drawn on top of photo)
      if (primaryBackgroundAsset) {
        try {
          const bgImg = await loadImageSafe(primaryBackgroundAsset);
          if (bgImg && bgImg.width > 0) {
            const primarySlot = activeSlots[0]?.rect || { x: 0, y: 0, width: 100, height: 60 };
            const tempC = document.createElement('canvas');
            tempC.width = w;
            tempC.height = h;
            const tCtx = tempC.getContext('2d');
            if (tCtx) {
              tCtx.drawImage(bgImg, 0, 0, w, h);
              removeFakeCheckerboardFromCanvas(tCtx, w, h, primarySlot);
              ctx.drawImage(tempC, 0, 0, w, h);
            } else {
              ctx.drawImage(bgImg, 0, 0, w, h);
            }
          }
        } catch (e) {
          console.warn('Panel B PNG Artwork load error in test download:', e);
        }
      }

      // LAYER 3: Main Headline (3 Lines Canonical Word-Wrapped Layout)
      const headlineSlot = textSlots[0] || {
        rect: { x: 7, y: 63, width: 86, height: 27 },
        backgroundColor: 'transparent',
        textColor: '#FFFFFF',
        fontSize: 70,
        fontFamily: 'Noto Sans Devanagari',
      };
      const hx = (headlineSlot.rect.x / 100) * w;
      const hy = (headlineSlot.rect.y / 100) * h;
      const hw = (headlineSlot.rect.width / 100) * w;
      const hh = (headlineSlot.rect.height / 100) * h;
      const hRot = headlineSlot.rotation ?? 0;

      if (headlineSlot.backgroundColor && headlineSlot.backgroundColor !== 'transparent') {
        ctx.fillStyle = headlineSlot.backgroundColor;
        ctx.fillRect(hx, hy, hw, hh);
      }

      const rawInput =
        testHeadline ||
        [dummyLine1, dummyLine2, dummyLine3].filter(Boolean).join(' ') ||
        'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी';
      const textToDraw = normalizeHeadlineText(rawInput);

      const headlineAlign = (headlineSlot.alignment || 'center') as CanvasTextAlign;
      const canonicalLayout = computeCanonicalHeadlineLayout({
        headline: textToDraw,
        fontFamily: headlineSlot.fontFamily || typographyFontFamily || 'Noto Sans Devanagari',
        aspectRatio: selectedRatio,
        isBreakingStyle: false,
        customBounds: { x: hx, y: hy, width: hw, height: hh },
        customMaxLines: 3,
        alignment: headlineAlign as any,
      });

      ctx.save();
      // Clip to headline bounding area with a small safety margin
      ctx.beginPath();
      ctx.rect(hx - 5, hy - 5, hw + 10, hh + 10);
      ctx.clip();

      if (hRot !== 0) {
        ctx.translate(hx + hw / 2, hy + hh / 2);
        ctx.rotate((hRot * Math.PI) / 180);
        ctx.translate(-(hx + hw / 2), -(hy + hh / 2));
      }

      const textColor = headlineSlot.textColor || '#FFFFFF';
      const isBlack = textColor.toLowerCase() === '#000000' || textColor.toLowerCase() === 'black';
      ctx.fillStyle = textColor;
      ctx.font = `bold ${canonicalLayout.fontSize}px "${canonicalLayout.fontFamily}", "Noto Sans Devanagari", sans-serif`;
      ctx.textBaseline = 'middle';

      if (!isBlack) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      const lines = canonicalLayout.lines || [];
      const lineHeight = canonicalLayout.lineHeight || 60;

      lines.forEach((line: any, lIdx: number) => {
        const lineY = canonicalLayout.startY + lIdx * lineHeight;
        let totalLineWidth = 0;
        const spaceWidth = ctx.measureText(' ').width;
        const tokenWidths: number[] = [];

        const tokens: any[] = Array.isArray(line) ? line : [{ text: String(line || '') }];

        tokens.forEach((token: any, tIdx: number) => {
          const tText = typeof token === 'string' ? token : (token?.text || '');
          const tw = ctx.measureText(tText).width;
          tokenWidths.push(tw);
          totalLineWidth += tw;
          if (tIdx < tokens.length - 1) totalLineWidth += spaceWidth;
        });

        let curX = headlineAlign === 'center'
          ? hx + (hw - totalLineWidth) / 2
          : headlineAlign === 'left'
          ? hx + 20
          : hx + hw - totalLineWidth - 20;

        tokens.forEach((token: any, tIdx: number) => {
          const tText = typeof token === 'string' ? token : (token?.text || '');
          ctx.textAlign = 'left';
          ctx.fillText(tText, curX, lineY);
          curX += tokenWidths[tIdx] + spaceWidth;
        });
      });
      ctx.restore();

      // LAYER 4: Channel Logo
      if (headerConfig.showLogo) {
        const lRect = headerConfig.logoRect || { x: 5, y: 3.5, width: 22, height: 9 };
        const lx = (lRect.x / 100) * w;
        const ly = (lRect.y / 100) * h;
        const lw = (lRect.width / 100) * w;
        const lh = (lRect.height / 100) * h;
        const lRot = headerConfig.logoRotation ?? 0;
        try {
          const logoSrc = currentUser?.channelLogo || currentUser?.profileLogo || '/assets/ai_news_maker_logo.png';
          let logoImg: HTMLImageElement;
          try {
            logoImg = await loadImageSafe(logoSrc);
          } catch {
            logoImg = await loadImageSafe('/logo.png');
          }
          if (logoImg && logoImg.width > 0) {
            ctx.save();
            if (lRot !== 0) {
              ctx.translate(lx + lw / 2, ly + lh / 2);
              ctx.rotate((lRot * Math.PI) / 180);
              ctx.translate(-(lx + lw / 2), -(ly + lh / 2));
            }
            const scale = (headerConfig.logoScalePct || 100) / 100;
            const targetW = lw * scale;
            const targetH = lh * scale;
            const lAspect = logoImg.width / logoImg.height;
            let drawW = targetW, drawH = targetH;
            if (lAspect > targetW / targetH) {
              drawH = targetW / lAspect;
            } else {
              drawW = targetH * lAspect;
            }
            const align = headerConfig.logoAlign || 'left';
            const dx = align === 'center' ? lx + (lw - drawW) / 2 : align === 'right' ? lx + lw - drawW : lx;
            const dy = ly + (lh - drawH) / 2;
            ctx.drawImage(logoImg, dx, dy, drawW, drawH);
            ctx.restore();
          }
        } catch (e) {
          console.warn('Channel Logo draw error in preview download:', e);
        }
      }

      // LAYER 5: Location Badge
      if (headerConfig.showLocation) {
        const locRect = headerConfig.locationRect || { x: 5, y: 13.5, width: 28, height: 4.5 };
        const bx = (locRect.x / 100) * w;
        const by = (locRect.y / 100) * h;
        const bw = (locRect.width / 100) * w;
        const bh = (locRect.height / 100) * h;
        const locRot = headerConfig.locationRotation ?? 0;

        const badgeAsset =
          headerConfig.manualLocationAsset ||
          locationBadgeLibrary.find((b) => b.id === headerConfig.locationBadgeAssetId)?.url ||
          locationBadgeLibrary.find((b) => b.id === headerConfig.locationBadgeAssetId)?.assetUrl;

        ctx.save();
        if (locRot !== 0) {
          ctx.translate(bx + bw / 2, by + bh / 2);
          ctx.rotate((locRot * Math.PI) / 180);
          ctx.translate(-(bx + bw / 2), -(by + bh / 2));
        }

        let badgeDrawn = false;
        if (badgeAsset) {
          try {
            const bImg = await loadImageSafe(badgeAsset);
            if (bImg && bImg.width > 0) {
              const bAspect = bImg.width / bImg.height;
              const boxAspect = bw / bh;
              let dw = bw, dh = bh;
              if (bAspect > boxAspect) {
                dh = bw / bAspect;
              } else {
                dw = bh * bAspect;
              }
              const dx = bx + (bw - dw) / 2;
              const dy = by + (bh - dh) / 2;
              ctx.drawImage(bImg, dx, dy, dw, dh);
              badgeDrawn = true;

              const locText = dummyLocation || 'भोपाल';
              let locColor = headerConfig.locationTextColor;
              const libBadge = locationBadgeLibrary.find(
                (b) => b.id === headerConfig.locationBadgeAssetId || (b.url || b.assetUrl) === badgeAsset
              );
              if (!locColor || (locColor.toUpperCase() === '#FFFFFF' && libBadge?.typographyConfig?.textColor)) {
                locColor = libBadge?.typographyConfig?.textColor || '#000000';
              } else if (!locColor && badgeAsset) {
                locColor = '#000000';
              }

              const tr = headerConfig.textRegion || libBadge?.textRegion || { x: 32, y: 22, width: 62, height: 56 };
              const tx = dx + (tr.x / 100) * dw;
              const ty = dy + (tr.y / 100) * dh;
              const tw = (tr.width / 100) * dw;
              const th = (tr.height / 100) * dh;

              ctx.save();
              let fontSize = Math.max(14, Math.min(36, Math.round(th * 0.75)));
              ctx.font = `800 ${fontSize}px "Mukta", "Baloo 2", "Noto Sans Devanagari", sans-serif`;
              ctx.fillStyle = locColor || '#000000';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              // Dynamic text shrink if city name is long so it NEVER overflows
              let measuredW = ctx.measureText(locText).width;
              while (measuredW > tw - 4 && fontSize > 10) {
                fontSize -= 1;
                ctx.font = `800 ${fontSize}px "Mukta", "Baloo 2", "Noto Sans Devanagari", sans-serif`;
                measuredW = ctx.measureText(locText).width;
              }

              ctx.fillText(locText, tx + tw / 2, ty + th / 2);
              ctx.restore();
            }
          } catch (e) {
            console.warn('Failed to draw badge asset, falling back:', e);
          }
        }

        if (!badgeDrawn) {
          ctx.fillStyle = headerConfig.locationBgColor || '#DC2626';
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, bh / 2);
          ctx.fill();
          ctx.fillStyle = headerConfig.locationTextColor || '#FFFFFF';
          ctx.font = 'bold 22px "Noto Sans Devanagari", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`📍 ${dummyLocation || 'भोपाल'}`, bx + bw / 2, by + bh / 2);
        }
        ctx.restore();
      }

      // LAYER 6: Date Stamp
      if (headerConfig.showDate) {
        const dateRect = headerConfig.dateRect || { x: 5, y: 18.5, width: 34, height: 3.5 };
        const dx = (dateRect.x / 100) * w;
        const dy = (dateRect.y / 100) * h;
        const rot = headerConfig.dateRotation ?? 270;
        ctx.save();
        ctx.translate(dx, dy);
        if (rot === 270) {
          ctx.rotate((-90 * Math.PI) / 180);
        } else if (rot === 90) {
          ctx.rotate((90 * Math.PI) / 180);
        } else if (rot !== 0) {
          ctx.rotate((rot * Math.PI) / 180);
        }
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        ctx.fillText(dateStr, 0, 0);
        ctx.restore();
      }

      // LAYER 7: AI Watermark
      if (watermarkConfig.enabled) {
        const wm = watermarkConfig;
        const rotDeg = wm.rotation ?? 270;
        const op = wm.opacity ?? 0.85;
        let wx = ((wm.rect?.x ?? 74) / 100) * w;
        let wy = ((wm.rect?.y ?? 3.5) / 100) * h;
        ctx.save();
        ctx.globalAlpha = op;
        ctx.translate(wx, wy);
        ctx.rotate((rotDeg * Math.PI) / 180);
        ctx.fillStyle = wm.textColor || '#FFFFFF';
        ctx.font = 'bold 20px "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(wm.customText || wm.label || 'AI GENERATED', 0, 0);
        ctx.restore();
      }

      // LAYER 8: Full Story Callout
      if (fullStoryCalloutConfig.enabled) {
        const cRect = fullStoryCalloutConfig.rect || { x: 50, y: 85, width: 40, height: 4 };
        const cx = (cRect.x / 100) * w;
        const cy = (cRect.y / 100) * h;
        const cw = (cRect.width / 100) * w;
        const ch = (cRect.height / 100) * h;
        const cRot = fullStoryCalloutConfig.rotation ?? 0;

        const calloutAsset =
          fullStoryCalloutConfig.manualCalloutAsset ||
          manualCalloutAssetUrl ||
          calloutLibrary.find((c) => c.id === fullStoryCalloutConfig.calloutAssetId)?.url ||
          calloutLibrary.find((c) => c.id === fullStoryCalloutConfig.calloutAssetId)?.assetUrl;

        ctx.save();
        if (cRot !== 0) {
          ctx.translate(cx + cw / 2, cy + ch / 2);
          ctx.rotate((cRot * Math.PI) / 180);
          ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
        }

        let calloutDrawn = false;
        if (calloutAsset) {
          try {
            const cImg = await loadImageSafe(calloutAsset);
            if (cImg && cImg.width > 0) {
              const cAspect = cImg.width / cImg.height;
              const boxAspect = cw / ch;
              let dw = cw, dh = ch;
              if (cAspect > boxAspect) {
                dh = cw / cAspect;
              } else {
                dw = ch * cAspect;
              }
              const dx = cx + (cw - dw) / 2;
              const dy = cy + (ch - dh) / 2;
              ctx.drawImage(cImg, dx, dy, dw, dh);
              calloutDrawn = true;
            }
          } catch (e) {
            console.warn('Failed to draw callout asset, falling back:', e);
          }
        }

        if (!calloutDrawn) {
          ctx.fillStyle = fullStoryCalloutConfig.bgColor || '#F59E0B';
          ctx.beginPath();
          ctx.roundRect(cx, cy, cw, ch, 6);
          ctx.fill();
          ctx.fillStyle = fullStoryCalloutConfig.textColor || '#0F172A';
          ctx.font = 'bold 22px "Noto Sans Devanagari", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            dummyCalloutText || fullStoryCalloutConfig.text || 'पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें',
            cx + cw / 2,
            cy + ch / 2
          );
        }
        ctx.restore();
      }

      // LAYER 9: Permanent Protected Master Admin Brand Footer
      const fRatio = footerConfig.footerHeightRatio || (selectedRatio === '4:5' ? 0.08 : 0.065);
      const fh = Math.round(fRatio * h);
      const fw = Math.round(((footerConfig.footerWidthPct || 100) / 100) * w);
      const fx = Math.round((w - fw) / 2);
      const fy = h - fh;

      let footerBg = primaryFooterColor || footerConfig.primaryFooterColor || footerConfig.footerBgColor || '#FFFFFF';
      if (bannedFooterColor && footerBg.trim().toLowerCase() === bannedFooterColor.trim().toLowerCase()) {
        footerBg = '#0B1329';
      }

      const hexClean = footerBg.replace('#', '').trim();
      let isLightBg = true;
      if (hexClean.length === 6) {
        const r = parseInt(hexClean.substring(0, 2), 16);
        const g = parseInt(hexClean.substring(2, 4), 16);
        const b = parseInt(hexClean.substring(4, 6), 16);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        isLightBg = lum >= 0.5;
      }
      const footerTextColor = footerConfig.footerTextColor || (isLightBg ? '#0A0A0A' : '#FFFFFF');

      // Master Admin Sample Footer with Authentic Circular Social Icons
      await drawThemeFooterBar(
        ctx,
        w,
        h,
        fh,
        '@breakingnewswala',
        '+91 96698 02408',
        undefined,
        'breakingnewswala.com',
        ['youtube', 'facebook', 'instagram', 'twitter'],
        true,
        footerBg,
        footerTextColor,
        'color',
        true
      );

      // Trigger direct download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `Test_Frame_${frameName ? frameName.replace(/\s+/g, '_') : 'Preview'}_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download test preview error:', err);
    }
  };

  // Step 8: Save & Publish Handler
  const handleSaveAndPublish = async () => {
    if (!frameName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'कृपया फ्रेम का नाम दर्ज करें।' });
      return;
    }

    if (isFooterColorConflict) {
      setFeedbackMsg({ type: 'error', text: 'प्राइमरी फुटर रंग और प्रतिबंधित (Banned) फुटर रंग समान नहीं हो सकते! कृपया अलग रंग चुनें।' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const isVideo = generatorMode === 'video';
    const finalVersion = initialFrame?.id ? (initialFrame.version || 1) + 1 : 1;
    const templateData: Partial<DynamicFrameTemplate> = {
      ...(initialFrame?.id ? { id: initialFrame.id } : {}),
      name: frameName.trim(),
      description: frameDescription.trim(),
      frameMode: isVideo ? 'video' : 'photo',
      frameType: isVideo ? 'video' : selectedRatio === '9:16' ? 'story' : 'graphic',
      aspectRatio: selectedRatio,
      canvasWidth: selectedRatio === '4:3' ? 1440 : 1080,
      canvasHeight: selectedRatio === '4:5' ? 1350 : selectedRatio === '9:16' ? 1920 : 1080,
      sampleReferenceUrl: sampleImage,
      samplePhotoUrl: samplePhotoPreview,
      sampleVideoUrl: sampleVideoPreview,
      primaryBackgroundAsset: primaryBackgroundAsset || undefined,
      primaryBackgroundMode: 'image',
      primaryBackgroundHex,
      previewImageUrl: primaryBackgroundAsset || sampleImage,
      primaryFooterColor,
      bannedFooterColor,
      designCategory: isVideo ? 'Special Frames' : designCategory,
      allowedPlans,
      publicationStatus,
      createdBy: currentUser?.email || 'breakingnewswala.com@gmail.com',
      version: finalVersion,
      headerConfig: {
        ...headerConfig,
        manualLocationAsset: videoLocationBadgeUrl || headerConfig.manualLocationAsset,
      },
      footerConfig: {
        ...footerConfig,
        enforcePermanentFooter: true,
        primaryFooterColor,
        bannedFooterColor,
        footerBgColor: primaryFooterColor || footerConfig.footerBgColor || '#FFFFFF',
      },
      photoSlots: isVideo ? [] : photoSlots,
      photoLayoutVariants: isVideo ? [] : layoutVariants,
      activePhotoLayoutMode: activeLayoutMode,
      textSlots: textSlots.map((ts, idx) =>
        idx === 0
          ? {
              ...ts,
              fontFamily: typographyFontFamily || ts.fontFamily,
              fontSize: typographyFontSize || ts.fontSize,
              fontWeight: typographyFontWeight || ts.fontWeight,
              textColor: ts.textColor || '#FFFFFF',
              backgroundColor: ts.backgroundColor === '#B91C1C' ? 'transparent' : ts.backgroundColor || 'transparent',
            }
          : ts
      ),
      ribbonConfig,
      watermarkConfig,
      fullStoryCalloutConfig: {
        ...fullStoryCalloutConfig,
        manualCalloutAsset: manualCalloutAssetUrl || fullStoryCalloutConfig.manualCalloutAsset,
      },
      calloutAssetUrl: manualCalloutAssetUrl,
      locationBadgeAssetId: headerConfig.locationBadgeAssetId,
      calloutAssetId: fullStoryCalloutConfig.calloutAssetId,
      poweredByConfig,
      safeZoneConfig,
      layers,
      isLayoutLocked,
      isStatementFrame: isVideo ? false : isStatementFrame,
      statementOptions: {
        solidBackgroundHex: statementBgColor,
        backgroundMode: statementBgMode,
        curatedBackgroundId: curatedBgId,
        aiPrompt: aiBgPrompt,
        cutoutPosition: statementCutoutPos,
      },
      // Video Manifest (Req 13, 14, 15, 16, 17)
      // वीडियो फ्रेम नियम व आवश्यकताएं: वीडियो फ्रेम अब पूर्णतः समर्थित है (लंबित विनिर्देशों का समाधान कर लिया गया है)
      videoConfig: isVideo
        ? {
            displayMode: videoDisplayMode,
            videoRect: videoRect || { x: 0, y: videoFooterPosition === 'top' ? 20 : 12, width: 100, height: 76 },
            footerPosition: videoFooterPosition,
            locationBadgeUrl: videoLocationBadgeUrl,
            watermarkTextEnabled: videoWatermarkTextEnabled,
            watermarkText: videoWatermarkText,
            watermarkLogoEnabled: videoWatermarkLogoEnabled,
            watermarkLogoUrl: videoWatermarkLogoUrl,
            watermarkUserAllowed: videoWatermarkUserAllowed,
            watermarkRect: { x: 35, y: 48, width: 30, height: 6 },
          }
        : undefined,
      // Typography Manifest (Req 8)
      typographyConfig: {
        primaryFontFamily: typographyFontFamily,
        primaryFontSize: typographyFontSize,
        minFontSize: 24,
        fontWeight: typographyFontWeight,
      },
    };

    try {
      const token = getAuthToken();
      const res = await saveDynamicFrameToApi(templateData, token);
      if (res.success && res.frame) {
        setFeedbackMsg({
          type: 'success',
          text: `🎉 फ्रेम "${res.frame.name}" सफलतापूर्वक प्रकाशित हो गया!`,
        });
        window.dispatchEvent(new CustomEvent('template_plans_updated'));
        window.dispatchEvent(new CustomEvent('dynamic_frames_updated'));
        if (onFramePublished) onFramePublished(res.frame);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'फ़्रेम पब्लिश करने में त्रुटि।' });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'नेटवर्क विफलता।' });
    } finally {
      setIsSaving(false);
    }
  };

  const activeLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];

  const updateSelectedLayerRect = (updates: Partial<NormalizedRect>) => {
    if (!activeLayer || activeLayer.locked) return;
    const current = activeLayer.rect;
    let newX = updates.x !== undefined ? Math.max(0, Math.min(100 - (updates.width !== undefined ? updates.width : current.width), updates.x)) : current.x;
    let newY = updates.y !== undefined ? Math.max(0, Math.min(100 - (updates.height !== undefined ? updates.height : current.height), updates.y)) : current.y;
    let newW = updates.width !== undefined ? Math.max(2, Math.min(100 - newX, updates.width)) : current.width;
    let newH = updates.height !== undefined ? Math.max(1, Math.min(100 - newY, updates.height)) : current.height;

    const newRect: NormalizedRect = {
      ...current,
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
      width: Math.round(newW * 10) / 10,
      height: Math.round(newH * 10) / 10,
    };

    setLayers((prev) =>
      prev.map((l) => (l.id === activeLayer.id ? { ...l, rect: newRect } : l))
    );

    if (activeLayer.type === 'logo') setHeaderConfig((prev) => ({ ...prev, logoRect: newRect }));
    if (activeLayer.type === 'location') setHeaderConfig((prev) => ({ ...prev, locationRect: newRect }));
    if (activeLayer.type === 'date') setHeaderConfig((prev) => ({ ...prev, dateRect: newRect }));
    if (activeLayer.type === 'ribbon') setRibbonConfig((prev) => ({ ...prev, rect: newRect }));
    if (activeLayer.type === 'watermark') setWatermarkConfig((prev) => ({ ...prev, rect: newRect }));
    if (activeLayer.type === 'callout') setFullStoryCalloutConfig((prev) => ({ ...prev, rect: newRect }));
    if (activeLayer.type === 'powered_by') setPoweredByConfig((prev) => ({ ...prev, rect: newRect }));
    if (activeLayer.type === 'photo') {
      const slotId = activeLayer.id.replace('layer_photo_', '');
      setPhotoSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, rect: newRect } : s)));
    }
    if (activeLayer.type === 'text') {
      const textId = activeLayer.id.replace('layer_text_', '');
      setTextSlots((prev) => prev.map((t) => (t.id === textId ? { ...t, rect: newRect } : t)));
    }
  };


  const WIZARD_STEPS: { id: WizardStage; label: string; number: number }[] = [
    { id: 'upload_aspect', label: '1. सैंपल, रेशियो व बैकग्राउंड', number: 1 },
    { id: 'ai_analysis', label: '2. AI एनालिसिस', number: 2 },
    { id: 'ribbon_header_footer', label: '3. रिबन, हेडर व फुटर', number: 3 },
    { id: 'canvas_marking', label: '4. कैनवास मार्किंग', number: 4 },
    { id: 'photo_slots_layout', label: '5. फोटो लेआउट्स', number: 5 },
    { id: 'text_quote_config', label: '6. टेक्स्ट व कोट', number: 6 },
    { id: 'dual_live_preview', label: '7. ड्यूल लाइव प्रीव्यू', number: 7 },
    { id: 'plan_publish', label: '8. प्लान व पब्लिश', number: 8 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  {generatorMode === 'photo' ? 'A. AI फोटो फ्रेम जनरेटर (Photo Frame Pro)' : 'B. AI वीडियो फ्रेम जनरेटर (Video Frame)'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  Master Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {generatorMode === 'photo'
                  ? '4:5 व 9:16 फोटो फ्रेम्स • डुअल अपलोड • डायनामिक फोटो लेआउट्स • ड्यूल प्रीव्यू'
                  : '9:16, 1:1, 4:5, 4:3 वीडियो फ्रेम्स • वीडियो टेम्पलेट एक्सटेंशन पॉइंट (विशिष्टताएं लंबित)'}
              </p>
            </div>
          </div>

          {/* Mode Switcher in Header */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setGeneratorMode('photo');
                  if (selectedRatio === '1:1' || selectedRatio === '4:3') {
                    setSelectedRatio('4:5');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  generatorMode === 'photo'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                फोटो फ्रेम
              </button>
              <button
                type="button"
                onClick={() => setGeneratorMode('video')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  generatorMode === 'video'
                    ? 'bg-indigo-600 text-white font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                वीडियो फ्रेम
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Screen Notice */}
        {isMobileScreen && (
          <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              📱 <strong>डेस्कटॉप स्क्रीन अनुशंसित:</strong> कैनवास मार्किंग और सटीक लेयर कोऑर्डिनेट नियंत्रण के लिए डेस्कटॉप स्क्रीन का उपयोग करें।
            </span>
          </div>
        )}

        {/* 8-Step Wizard Navigation */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 font-bold">
          {WIZARD_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStage(step.id)}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentStage === step.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STAGE 1: SAMPLE, RATIO & PRIMARY BACKGROUND */}
          {currentStage === 'upload_aspect' && (
            <div className="space-y-6">
              {/* Ratio Selection */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" />
                  कैनवास आस्पेक्ट रेशियो चुनें ({generatorMode === 'photo' ? 'फोटो: केवल 4:5 व 9:16' : 'वीडियो रेशियो'})
                </h4>
                {generatorMode === 'photo' ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRatio('4:5')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRatio === '4:5'
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">4:5 पोर्ट्रेट</span>
                        {selectedRatio === '4:5' && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">1080 × 1350 px</div>
                      <div className="text-[10px] text-slate-400 mt-1">रेगुलर समाचार व फ़ोटो न्यूज़ ग्राफ़िक्स</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRatio('9:16')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRatio === '9:16'
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">9:16 सोशल स्टोरी</span>
                        {selectedRatio === '9:16' && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">1080 × 1920 px</div>
                      <div className="text-[10px] text-slate-400 mt-1">व्हाट्सएप स्टेटस, इंस्टा व एफबी स्टोरी</div>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {[
                      { r: '9:16', desc: '1080 × 1920 px (रील्स/शॉर्ट्स)' },
                      { r: '1:1', desc: '1080 × 1080 px (स्क्वायर वीडियो)' },
                      { r: '4:5', desc: '1080 × 1350 px (वर्टिकल वीडियो)' },
                      { r: '4:3', desc: '1440 × 1080 px (क्लासिक वीडियो)' },
                    ].map((item) => (
                      <button
                        key={item.r}
                        type="button"
                        onClick={() => setSelectedRatio(item.r as DynamicAspectRatio)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedRatio === item.r
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                            : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-black text-sm text-indigo-300">{item.r}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                )}

                {generatorMode === 'video' && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center gap-2 mt-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      ℹ️ वीडियो फ्रेम जनरेटर: वीडियो टाइमलाइन, हेडलाइन एनिमेशन और वीडियो ओवरले के नियम उपयोगकर्ता विनिर्देशों के अनुसार लंबित हैं।
                    </span>
                  </div>
                )}
              </div>

              {/* Dual Upload Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel A: Sample Graphic Upload (For Reference & AI Analysis) */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      पैनल A: सैंपल ग्राफिक अपलोड (AI एनालिसिस संदर्भ)
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                      रेफरेंस जैकेट
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    सैंपल न्यूज़ ग्राफिक अपलोड करें जिससे Gemini AI विज़न टेक्स्ट और फोटो स्लॉट की स्थिति पहचानेगा।
                  </p>
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-5 text-center cursor-pointer relative bg-slate-900/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSampleUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-white block">सैंपल ग्राफिक चुनें या यहाँ ड्रैग करें</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">PNG, JPG समर्थित</span>
                  </div>
                  {sampleFileName && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {sampleFileName}
                    </div>
                  )}
                  {sampleImage && (
                    <div className="w-28 h-36 border border-slate-700 rounded-lg overflow-hidden mx-auto mt-2">
                      <img src={sampleImage} alt="Sample" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Panel B: Primary Background Upload (Clean static artwork / PNG with transparency ONLY) */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      पैनल B: पारदर्शी PNG आर्टवर्क अपलोड (Transparent Artwork)
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold">
                      Layer 2 आर्टवर्क
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    फ्रेम का ओरिजिनल पारदर्शी PNG अपलोड करें जिसमें फोटो का कटआउट व कर्व्स हों। यह फोटो के ऊपर (Layer 2) बैठेगा जिससे कर्व्स व डिज़ाइन पूरी तरह सुरक्षित रहेंगे।
                  </p>

                  {!primaryBackgroundAsset ? (
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-5 text-center cursor-pointer relative bg-slate-900/50 transition-colors">
                      <input
                        type="file"
                        accept="image/png,image/*"
                        onChange={handlePrimaryBgUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-white block">पारदर्शी PNG आर्टवर्क चुनें या ड्रैग करें</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">केवल पारदर्शी PNG समर्थित (अनुशंसित 1080x1350 या 1080x1920)</span>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px]">{primaryBgFileName || 'Frame_Artwork.png'}</span>
                          </div>
                          {primaryBgDimensions && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              आकार: {primaryBgDimensions.width} × {primaryBgDimensions.height} px
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer font-bold border border-slate-700">
                            बदलें
                            <input
                              type="file"
                              accept="image/png,image/*"
                              onChange={handlePrimaryBgUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleClearPrimaryBg}
                            className="text-[10px] px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold border border-red-500/40 cursor-pointer"
                          >
                            हटाएँ
                          </button>
                        </div>
                      </div>

                      {/* Alpha Transparency Status Badge */}
                      {isPngTransparent === true && (
                        <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>✓ पारदर्शी PNG सक्रिय: कटआउट व कर्व्स सुरक्षित हैं।</span>
                        </div>
                      )}
                      {isPngTransparent === false && (
                        <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>⚠️ चेतावनी: पारदर्शिता नहीं मिली। फोटो के कर्व्स सही दिखने हेतु पारदर्शी PNG का उपयोग करें।</span>
                        </div>
                      )}

                      {/* Checkered Transparency Thumbnail */}
                      <div
                        className="w-28 h-36 border border-slate-700 rounded-lg overflow-hidden mx-auto mt-2 relative shadow-inner"
                        style={{
                          backgroundImage: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%)',
                          backgroundSize: '16px 16px',
                        }}
                      >
                        <img
                          src={primaryBackgroundAsset}
                          alt="Primary Background"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: AI MULTIMODAL ANALYSIS */}
          {currentStage === 'ai_analysis' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-black text-base text-white">Gemini 1.5 Pro विज़न एनालिसिस</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  सैंपल ग्राफिक को स्कैन करके हेडलाइन स्थिति, फोटो स्लॉट अनुपात, लोगो व लोकेशन बैज के निर्देशांक स्वतः पहचाने जाएंगे।
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isAnalyzing || !sampleImage}
                    onClick={handleRunAiAnalysis}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer transition transform active:scale-95"
                  >
                    {isAnalyzing ? 'एनालिसिस चल रहा है...' : '🚀 विज़न एनालिसिस प्रारंभ करें'}
                  </button>
                </div>

                {analysisStatusText && (
                  <div className="text-xs text-amber-300 font-bold pt-2">{analysisStatusText}</div>
                )}
              </div>

              {analysisResult && (
                <div className="p-5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Check className="w-4 h-4" />
                    <span>सफलतापूर्वक पहचाने गए तत्व:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <div>• हेडलाइन लाइन: {analysisResult.headlineMaxLines || 3} लाइन्स</div>
                    <div>• फोटो स्लॉट: 1 मुख्य स्लॉट</div>
                    <div>• लोगो स्थिति: टॉप-लेफ्ट</div>
                    <div>• लोकेशन बैज: पिल स्टाइल</div>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleApplyAiAnalysis}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow cursor-pointer transition"
                    >
                      ✓ परिणाम लागू करें और स्टेप 3 पर बढ़ें
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: RIBBON, HEADER & FOOTER ELEMENTS */}
          {currentStage === 'ribbon_header_footer' && (
            <div className="space-y-6">
              {/* Channel Logo */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">चैनल लोगो (Channel Logo)</span>
                  <input
                    type="checkbox"
                    checked={headerConfig.showLogo}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, showLogo: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                {headerConfig.showLogo && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>लोगो स्केल: {headerConfig.logoScalePct ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={headerConfig.logoScalePct ?? 100}
                          onChange={(e) => setHeaderConfig({ ...headerConfig, logoScalePct: parseInt(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>पैडिंग: {headerConfig.logoPaddingPx ?? 4}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          value={headerConfig.logoPaddingPx ?? 4}
                          onChange={(e) => setHeaderConfig({ ...headerConfig, logoPaddingPx: parseInt(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">अलाइनमेंट:</span>
                        <select
                          value={headerConfig.logoAlign || 'left'}
                          onChange={(e) => setHeaderConfig({ ...headerConfig, logoAlign: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date Stamp & AI Watermark */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Stamp */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      डेट स्टैम्प (Date Stamp)
                    </span>
                    <input
                      type="checkbox"
                      checked={headerConfig.showDate}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showDate: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {headerConfig.showDate && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">डिज़ाइन स्टाइल (5 प्रकार)</label>
                          <select
                            value={headerConfig.dateStampStyle || 'only_text'}
                            onChange={(e) => setHeaderConfig({ ...headerConfig, dateStampStyle: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value="only_text">1. केवल टेक्स्ट</option>
                            <option value="white_on_black">2. ब्लैक बॉक्स पर व्हाइट</option>
                            <option value="custom_bg_text">3. कस्टम रंग</option>
                            <option value="circular_badge">4. सर्कुलर बैज</option>
                            <option value="rounded_badge">5. राउंडेड बैज</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">रोटेशन</label>
                          <select
                            value={headerConfig.dateRotation ?? 270}
                            onChange={(e) => setHeaderConfig({ ...headerConfig, dateRotation: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value={270}>270° (वर्टिकल लेफ्ट एज - डिफ़ॉल्ट)</option>
                            <option value={0}>0° (हॉरिज़ॉन्टल)</option>
                            <option value={90}>90° (वर्टिकल राइट एज)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Watermark (Part 4: Rotation, Position & Type Controls) */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      वाटरमार्क (AI Watermark)
                    </span>
                    <input
                      type="checkbox"
                      checked={watermarkConfig.enabled}
                      onChange={(e) => setWatermarkConfig({ ...watermarkConfig, enabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {watermarkConfig.enabled && (
                    <div className="space-y-2 pt-1">
                      {/* Watermark Type & Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">प्रकार (Type)</label>
                          <select
                            value={watermarkConfig.type || 'text'}
                            onChange={(e) => setWatermarkConfig({ ...watermarkConfig, type: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value="text">टेक्स्ट वाटरमार्क (Text)</option>
                            <option value="image">इमेज वाटरमार्क (Image)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">स्थिति (Position)</label>
                          <select
                            value={watermarkConfig.position || 'right_edge'}
                            onChange={(e) => setWatermarkConfig({ ...watermarkConfig, position: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value="right_edge">Right Edge (डिफ़ॉल्ट)</option>
                            <option value="left_edge">Left Edge</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="center">Centre</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                      </div>

                      {/* Rotation (0, 90, 180, 270) & Opacity */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">रोटेशन (Rotation)</label>
                          <select
                            value={watermarkConfig.rotation ?? 270}
                            onChange={(e) => setWatermarkConfig({ ...watermarkConfig, rotation: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value={270}>270° (ऊर्ध्वाधर - डिफ़ॉल्ट)</option>
                            <option value={0}>0° (सामान्य / हॉरिज़ॉन्टल)</option>
                            <option value={90}>90° (दायाँ झुकाव)</option>
                            <option value={180}>180° (उल्टा)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">पारदर्शिता: {Math.round((watermarkConfig.opacity ?? 0.85) * 100)}%</label>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            value={Math.round((watermarkConfig.opacity ?? 0.85) * 100)}
                            onChange={(e) => setWatermarkConfig({ ...watermarkConfig, opacity: parseInt(e.target.value) / 100 })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>

                      {/* Text vs Image Controls */}
                      {watermarkConfig.type === 'image' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">इमेज URL / पाथ</label>
                          <input
                            type="text"
                            value={watermarkConfig.imageUrl || ''}
                            onChange={(e) => setWatermarkConfig({ ...watermarkConfig, imageUrl: e.target.value })}
                            placeholder="/assets/ai_watermark.png या https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">लेबल / टेक्स्ट</label>
                            <input
                              type="text"
                              value={watermarkConfig.customText || watermarkConfig.label || 'AI GENERATED'}
                              onChange={(e) => setWatermarkConfig({ ...watermarkConfig, customText: e.target.value, label: e.target.value as any })}
                              placeholder="AI GENERATED"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">रंग (Color)</label>
                            <input
                              type="color"
                              value={watermarkConfig.textColor || '#FFFFFF'}
                              onChange={(e) => setWatermarkConfig({ ...watermarkConfig, textColor: e.target.value })}
                              className="w-full h-7 bg-slate-900 rounded cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Breaking News Ribbon (Placed ABOVE Callout sections per Part 3) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    ब्रेकिंग न्यूज़ रिबन (Breaking News Ribbon)
                  </span>
                  <input
                    type="checkbox"
                    checked={ribbonConfig.enabled}
                    onChange={(e) => setRibbonConfig({ ...ribbonConfig, enabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                {ribbonConfig.enabled && (
                  <div className="space-y-2 pt-1">
                    <select
                      value={ribbonConfig.ribbonId}
                      onChange={(e) => {
                        const r = BUILTIN_RIBBONS.find((b) => b.id === e.target.value);
                        setRibbonConfig({
                          ...ribbonConfig,
                          ribbonId: e.target.value,
                          customRibbonUrl: r?.svgPath || ribbonConfig.customRibbonUrl,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-[11px]"
                    >
                      {BUILTIN_RIBBONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Side-by-Side Equal Width Callouts: LEFT = Story Callout, RIGHT = Location Badge (Part 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* LEFT: Full Story Callout */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-400" />
                        पूरी खबर विवरण कॉलआउट (Story Callout)
                      </span>
                      <input
                        type="checkbox"
                        checked={fullStoryCalloutConfig.enabled}
                        onChange={(e) => setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, enabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                    {fullStoryCalloutConfig.enabled && (
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">कॉलआउट टेक्स्ट</label>
                          <input
                            type="text"
                            value={fullStoryCalloutConfig.text}
                            onChange={(e) => setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, text: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">विजिबिलिटी पॉलिसी</label>
                          <select
                            value={fullStoryCalloutConfig.calloutVisibilityPolicy || 'optional'}
                            onChange={(e) => setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, calloutVisibilityPolicy: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          >
                            <option value="optional">Optional (यूजर टॉगल कर सके)</option>
                            <option value="forced_on">Forced ON (हमेशा दिखे)</option>
                            <option value="disabled">Disabled (कभी न दिखे)</option>
                          </select>
                        </div>

                        {/* Approved Callout PNG Library Picker (Part 1 & 2: Expandable List UI) */}
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsCalloutListExpanded(!isCalloutListExpanded)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-200">
                                केंद्रीय स्वीकृत कॉलआउट लाइब्रेरी से चुनें ({calloutLibrary.length})
                              </span>
                              {(manualCalloutAssetUrl || fullStoryCalloutConfig.manualCalloutAsset) && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold truncate max-w-[140px]">
                                  ✓ {calloutLibrary.find(c => (c.url || c.assetUrl) === (manualCalloutAssetUrl || fullStoryCalloutConfig.manualCalloutAsset))?.name || 'चयनित'}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400">
                              {isCalloutListExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isCalloutListExpanded && (
                            <>
                              {calloutLibrary.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                                  {calloutLibrary.map((item) => {
                                    const assetUrl = item.url || item.assetUrl;
                                    const isSelected = manualCalloutAssetUrl === assetUrl || fullStoryCalloutConfig.manualCalloutAsset === assetUrl || fullStoryCalloutConfig.calloutAssetId === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setManualCalloutAssetUrl(assetUrl);
                                          setFullStoryCalloutConfig({
                                            ...fullStoryCalloutConfig,
                                            calloutAssetId: item.id,
                                            manualCalloutAsset: assetUrl,
                                            calloutAssetMode: 'static_image',
                                          });
                                        }}
                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition cursor-pointer text-left ${
                                          isSelected
                                            ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
                                            : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="w-full h-10 flex items-center justify-center bg-slate-950/80 rounded overflow-hidden p-1">
                                          <img src={assetUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                                          {item.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-3 text-center text-[10px] text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                                  इस श्रेणी में अभी कोई स्वीकृत डिज़ाइन उपलब्ध नहीं है।
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {fullStoryCalloutConfig.enabled && (
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span className="text-amber-400 font-bold block mb-0.5">प्लान नियम:</span>
                      Basic/Adv: फिक्स डिफ़ॉल्ट | Pro/VIP: वैकल्पिक चयन उपलब्ध
                    </div>
                  )}
                </div>

                {/* RIGHT: Location Badge */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-400" />
                        लोकेशन बैज कॉलआउट (Location Badge Callout)
                      </span>
                      <input
                        type="checkbox"
                        checked={headerConfig.showLocation}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, showLocation: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                    {headerConfig.showLocation && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">मोड:</span>
                          <select
                            value={headerConfig.locationBadgeMode || 'dynamic_overlay'}
                            onChange={(e) => setHeaderConfig({ ...headerConfig, locationBadgeMode: e.target.value as any })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px] w-full"
                          >
                            <option value="dynamic_overlay">Mode A: बैज स्किन + डायनामिक टेक्स्ट</option>
                            <option value="static_image">Mode B: पूर्ण स्टैटिक बैज इमेज</option>
                          </select>
                        </div>

                        {headerConfig.locationBadgeMode === 'static_image' ? (
                          <div className="space-y-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsLocationBadgeListExpanded(!isLocationBadgeListExpanded)}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-200">
                                  केंद्रीय स्वीकृत लोकेशन बैज लाइब्रेरी से चुनें ({locationBadgeLibrary.length})
                                </span>
                                {(headerConfig.manualLocationAsset || headerConfig.locationBadgeAssetId) && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold truncate max-w-[140px]">
                                    ✓ {locationBadgeLibrary.find(b => b.id === headerConfig.locationBadgeAssetId || (b.url || b.assetUrl) === headerConfig.manualLocationAsset)?.name || 'चयनित'}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400">
                                {isLocationBadgeListExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>

                            {isLocationBadgeListExpanded && (
                              <>
                                {locationBadgeLibrary.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                                    {locationBadgeLibrary.map((item) => {
                                      const assetUrl = item.url || item.assetUrl;
                                      const isSelected = headerConfig.locationBadgeAssetId === item.id || headerConfig.manualLocationAsset === assetUrl;
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => {
                                            const chosenColor = item.typographyConfig?.textColor || item.typographyConfig?.color || '#000000';
                                            setHeaderConfig({
                                              ...headerConfig,
                                              locationBadgeAssetId: item.id,
                                              manualLocationAsset: assetUrl,
                                              textRegion: item.textRegion,
                                              typographyConfig: item.typographyConfig,
                                              locationBadgeMode: 'static_image',
                                              locationTextColor: chosenColor,
                                            });
                                          }}
                                          className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition cursor-pointer text-left ${
                                            isSelected
                                              ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
                                              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                          }`}
                                        >
                                          <div className="w-full h-10 flex items-center justify-center bg-slate-950/80 rounded overflow-hidden p-1">
                                            <img src={assetUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                                            {item.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-3 text-center text-[10px] text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                                    इस श्रेणी में अभी कोई स्वीकृत डिज़ाइन उपलब्ध नहीं है।
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">स्टाइल</label>
                              <select
                                value={headerConfig.locationStyle || 'pill'}
                                onChange={(e) => setHeaderConfig({ ...headerConfig, locationStyle: e.target.value as any })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                              >
                                <option value="pill">Pill (कैप्सूल)</option>
                                <option value="box">Box (आयताकार)</option>
                                <option value="strip">Strip (पट्टी)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">बैकग्राउंड रंग</label>
                              <input
                                type="color"
                                value={headerConfig.locationBgColor || '#DC2626'}
                                onChange={(e) => setHeaderConfig({ ...headerConfig, locationBgColor: e.target.value })}
                                className="w-full h-7 bg-slate-900 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        )}

                        {/* Location Text Color Control */}
                        <div className="mt-2.5 flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-300 font-semibold">लोकेशन टेक्स्ट रंग:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setHeaderConfig({ ...headerConfig, locationTextColor: '#000000' })}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer border ${
                                (headerConfig.locationTextColor || '#000000').toLowerCase() === '#000000'
                                  ? 'bg-black text-white border-amber-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              काला (Black)
                            </button>
                            <button
                              type="button"
                              onClick={() => setHeaderConfig({ ...headerConfig, locationTextColor: '#FFFFFF' })}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer border ${
                                (headerConfig.locationTextColor || '').toLowerCase() === '#ffffff'
                                  ? 'bg-white text-black border-amber-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              सफेद (White)
                            </button>
                            <input
                              type="color"
                              value={headerConfig.locationTextColor || '#000000'}
                              onChange={(e) => setHeaderConfig({ ...headerConfig, locationTextColor: e.target.value })}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {headerConfig.showLocation && (
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span className="text-rose-400 font-bold block mb-0.5">स्थान:</span>
                      सैंपल टेस्ट में भोपाल (📍 भोपाल) दिखेगा, लाइव में यूज़र का शहर
                    </div>
                  )}
                </div>
              </div>

              {/* Optional POWERED BY Element */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>POWERED BY बैज (ऐच्छिक ग्राफ़िक तत्व)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      स्थाई फुटर से स्वतंत्र। आवश्यकतानुसार ऑन/ऑफ करें (डिफ़ॉल्ट बंद)।
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={poweredByConfig.enabled}
                      onChange={(e) => setPoweredByConfig({ ...poweredByConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                {poweredByConfig.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">बैज टेक्स्ट</label>
                      <input
                        type="text"
                        value={poweredByConfig.text}
                        onChange={(e) => setPoweredByConfig({ ...poweredByConfig, text: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">फ़ॉन्ट साइज़ (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={36}
                        value={poweredByConfig.fontSize || 16}
                        onChange={(e) => setPoweredByConfig({ ...poweredByConfig, fontSize: parseInt(e.target.value) || 16 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Permanent Protected Footer */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    स्थाई फुटर सेटिंग्स (Protected Channel Profile Footer)
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    सुरक्षित फुटर
                  </span>
                </div>

                {/* Conflict Alert Banner */}
                {isFooterColorConflict && (
                  <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-xs font-bold text-red-200 flex items-center gap-2 shadow-lg animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>⚠️ प्राइमरी फुटर रंग और प्रतिबंधित (Banned) फुटर रंग समान नहीं हो सकते! कृपया अलग रंग चुनें।</span>
                  </div>
                )}

                {/* Primary Footer Colour & Banned Footer Colour Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Footer Colour (Default for users) */}
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <label className="text-[11px] font-bold text-white block">
                      प्राइमरी फुटर रंग (Default Footer Colour) *
                    </label>
                    <p className="text-[10px] text-slate-400">
                      यूज़र्स के लिए डिफ़ॉल्ट फुटर बैकग्राउंड रंग।
                    </p>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={primaryFooterColor}
                        onChange={(e) => {
                          setPrimaryFooterColor(e.target.value);
                          setFooterConfig((prev) => ({
                            ...prev,
                            primaryFooterColor: e.target.value,
                            footerBgColor: e.target.value,
                          }));
                        }}
                        className="w-10 h-8 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryFooterColor}
                        onChange={(e) => {
                          setPrimaryFooterColor(e.target.value);
                          setFooterConfig((prev) => ({
                            ...prev,
                            primaryFooterColor: e.target.value,
                            footerBgColor: e.target.value,
                          }));
                        }}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs w-28 uppercase"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {['#FFFFFF', '#0F172A', '#FFE600', '#DC2626', '#000000', '#1E3A8A', '#047857'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setPrimaryFooterColor(c);
                            setFooterConfig((prev) => ({
                              ...prev,
                              primaryFooterColor: c,
                              footerBgColor: c,
                            }));
                          }}
                          className={`w-6 h-6 rounded-md border transition cursor-pointer ${
                            primaryFooterColor.toLowerCase() === c.toLowerCase()
                              ? 'ring-2 ring-amber-400 border-white'
                              : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Banned Footer Colour (Forbidden for users) */}
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <label className="text-[11px] font-bold text-white block">
                      प्रतिबंधित फुटर रंग (Banned Footer Colour)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      एडमिन द्वारा प्रतिबंधित रंग जिसे यूज़र स्टूडियो में नहीं चुन सकता।
                    </p>
                    <select
                      value={bannedFooterColor}
                      onChange={(e) => {
                        setBannedFooterColor(e.target.value);
                        setFooterConfig((prev) => ({
                          ...prev,
                          bannedFooterColor: e.target.value,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold"
                    >
                      <option value="">-- कोई नहीं (None) --</option>
                      <option value="#FFFFFF">सफेद (White #FFFFFF)</option>
                      <option value="#000000">काला (Black #000000)</option>
                      <option value="#DC2626">लाल (Red #DC2626)</option>
                      <option value="#FFE600">पीला (Yellow #FFE600)</option>
                      <option value="#0F172A">नेवी डार्क (#0F172A)</option>
                    </select>

                    {bannedFooterColor && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300">
                        <span className="w-4 h-4 rounded border border-white/20 inline-block" style={{ backgroundColor: bannedFooterColor }} />
                        <span className="font-mono text-[10px]">{bannedFooterColor}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBannedFooterColor('');
                            setFooterConfig((prev) => ({ ...prev, bannedFooterColor: '' }));
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 ml-auto"
                        >
                          हटाएँ
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">फुटर चौड़ाई (%)</label>
                    <input
                      type="number"
                      min={70}
                      max={100}
                      value={footerConfig.footerWidthPct || 100}
                      onChange={(e) => setFooterConfig({ ...footerConfig, footerWidthPct: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">टेक्स्ट रंग</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={footerConfig.footerTextColor || '#000000'}
                        onChange={(e) => setFooterConfig({ ...footerConfig, footerTextColor: e.target.value })}
                        className="w-10 h-8 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={footerConfig.footerTextColor || '#000000'}
                        onChange={(e) => setFooterConfig({ ...footerConfig, footerTextColor: e.target.value })}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs w-28 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Video Footer Position Selector (Part 7, Req 15) */}
                {generatorMode === 'video' && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-amber-300 block">
                      वीडियो फुटर स्थिति (Movable Video Footer Position)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVideoFooterPosition('bottom')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          videoFooterPosition === 'bottom'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>बॉटम फुटर (Bottom Footer)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoFooterPosition('top')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          videoFooterPosition === 'top'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>टॉप हेडर फुटर (Top / Header Footer)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Watermark Controls (Part 7, Req 17) */}
                {generatorMode === 'video' && (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5 mt-2">
                    <h5 className="font-bold text-[11px] text-amber-400">
                      वीडियो वाटरमार्क सेटिंग्स (Centered Video Watermarks)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-300 font-bold">टेक्स्ट वाटरमार्क</span>
                          <input
                            type="checkbox"
                            checked={videoWatermarkTextEnabled}
                            onChange={(e) => setVideoWatermarkTextEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-500 rounded"
                          />
                        </div>
                        {videoWatermarkTextEnabled && (
                          <input
                            type="text"
                            value={videoWatermarkText}
                            onChange={(e) => setVideoWatermarkText(e.target.value)}
                            placeholder="उदा. AI NEWS MAKER"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-300 font-bold">लोगो वाटरमार्क</span>
                          <input
                            type="checkbox"
                            checked={videoWatermarkLogoEnabled}
                            onChange={(e) => setVideoWatermarkLogoEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-500 rounded"
                          />
                        </div>
                        {videoWatermarkLogoEnabled && (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) setVideoWatermarkLogoUrl(ev.target.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-[10px] text-slate-400"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={videoWatermarkUserAllowed}
                        onChange={(e) => setVideoWatermarkUserAllowed(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded"
                      />
                      <span>एंड-यूजर को वाटरमार्क टॉगल करने की अनुमति दें</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: CANVAS MARKING & ELEMENT ADJUSTMENT */}
          {currentStage === 'canvas_marking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canvas Column */}
              <div className="lg:col-span-2 flex flex-col items-center">
                {/* Safe Zone & Layout Lock Toggle Header */}
                <div className="flex items-center justify-between w-full max-w-[360px] mb-2">
                  <span className="text-xs font-bold text-slate-300">कैनवास मार्किंग</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLayoutLocked(!isLayoutLocked)}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-black transition-all cursor-pointer ${
                        isLayoutLocked
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isLayoutLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{isLayoutLocked ? 'लेआउट लॉक ON' : 'लेआउट लॉक करें'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSafeZoneConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        safeZoneConfig.enabled
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>सेफ ज़ोन {safeZoneConfig.enabled ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Safe Zone Warnings Banner */}
                {safeZoneConfig.enabled && safeZoneWarnings.length > 0 && (
                  <div className="w-full max-w-[360px] mb-2 p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg flex items-center gap-2 text-[11px] text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{safeZoneWarnings[0]}</span>
                    {safeZoneWarnings.length > 1 && (
                      <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                        +{safeZoneWarnings.length - 1} और
                      </span>
                    )}
                  </div>
                )}

                {/* Interactive Canvas Box */}
                <div
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  className="relative border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 select-none touch-none"
                  style={{
                    width: selectedRatio === '4:5' ? '340px' : '280px',
                    height: selectedRatio === '4:5' ? '425px' : '497px',
                    backgroundColor: '#0B1329',
                  }}
                >
                  {/* Underneath: Photo Slots Preview */}
                  {photoSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="absolute border border-dashed border-slate-600/60 bg-slate-800/40 pointer-events-none z-0 flex items-center justify-center"
                      style={{
                        left: `${slot.rect.x}%`,
                        top: `${slot.rect.y}%`,
                        width: `${slot.rect.width}%`,
                        height: `${slot.rect.height}%`,
                      }}
                    >
                      <Camera className="w-5 h-5 text-slate-500/50" />
                    </div>
                  ))}

                  {/* Panel B Artwork on top of photo slot or subtle sample reference */}
                  {primaryBackgroundAsset ? (
                    <img
                      src={primaryBackgroundAsset}
                      alt="Canvas Artwork"
                      className="w-full h-full object-contain pointer-events-none absolute inset-0 z-5"
                    />
                  ) : sampleImage ? (
                    <img
                      src={sampleImage}
                      alt="Reference Sample"
                      className="w-full h-full object-cover pointer-events-none opacity-40 absolute inset-0 z-5"
                    />
                  ) : null}

                  {/* Safe Zone Visual Overlay */}
                  {safeZoneConfig.enabled && (
                    <div
                      className="absolute border-2 border-dashed border-cyan-400/70 pointer-events-none z-10"
                      style={{
                        top: `${safeZoneConfig.topMarginPct}%`,
                        bottom: `${safeZoneConfig.bottomMarginPct}%`,
                        left: `${safeZoneConfig.leftMarginPct}%`,
                        right: `${safeZoneConfig.rightMarginPct}%`,
                      }}
                    >
                      <div className="absolute top-1 left-1 bg-cyan-950/80 text-cyan-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-cyan-500/30">
                        सुरक्षित सामग्री क्षेत्र
                      </div>
                    </div>
                  )}

                  {/* Draggable Element Layers */}
                  {layers.map((layer) => {
                    const isSelected = selectedLayerId === layer.id;
                    const isFooter = layer.type === 'footer';
                    return (
                      <div
                        key={layer.id}
                        onPointerDown={(e) => handleLayerPointerDown(layer.id, 'move', e)}
                        className={`absolute border-2 transition-all flex flex-col justify-between p-1 select-none ${
                          isFooter
                            ? 'border-emerald-500 bg-emerald-500/25 cursor-pointer'
                            : isSelected
                            ? 'border-amber-400 bg-amber-500/30 ring-2 ring-amber-300 shadow-xl cursor-move'
                            : 'border-blue-500/70 bg-blue-500/15 hover:border-blue-400 hover:bg-blue-500/25 cursor-pointer'
                        }`}
                        style={{
                          left: `${layer.rect.x}%`,
                          top: `${layer.rect.y}%`,
                          width: `${layer.rect.width}%`,
                          height: `${layer.rect.height}%`,
                          zIndex: isSelected ? 40 : layer.zIndex,
                        }}
                      >
                        <div className="flex items-center justify-between pointer-events-none gap-1">
                          <span className="text-[8px] font-black text-white bg-slate-950/90 px-1 py-0.5 rounded truncate max-w-full">
                            {layer.name}
                          </span>
                          {isSelected && !isFooter && (
                            <span className="text-[7px] font-mono text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded">
                              {Math.round(layer.rect.width)}×{Math.round(layer.rect.height)}%
                            </span>
                          )}
                        </div>

                        {isFooter && (
                          <span className="text-[8px] font-bold text-emerald-300 text-center pointer-events-none">
                            🔒 सुरक्षित AI News Maker फुटर ({Math.round(layer.rect.width)}%)
                          </span>
                        )}

                        {isSelected && !isFooter && (
                          <>
                            <div
                              onPointerDown={(e) => handleLayerPointerDown(layer.id, 'nw', e)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -top-1 -left-1 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleLayerPointerDown(layer.id, 'ne', e)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -top-1 -right-1 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleLayerPointerDown(layer.id, 'se', e)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -bottom-1 -right-1 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleLayerPointerDown(layer.id, 'sw', e)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -bottom-1 -left-1 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar: Layers List & Property Inspector */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                    लेयर सूची (Layers & Positions)
                  </h4>
                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                    {layers.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLayerId(l.id)}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                          selectedLayerId === l.id
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <span className="truncate">{l.name}</span>
                        <div className="flex items-center gap-1">
                          {l.locked && <Lock className="w-3 h-3 text-amber-300" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Layer Properties with Manual X, Y, W, H, Center Alignment & Nudge */}
                {activeLayer && (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-white flex items-center gap-1.5">
                        <span>लेयर: {activeLayer.name}</span>
                        {activeLayer.locked && <Lock className="w-3 h-3 text-amber-400" />}
                      </h5>
                      <span className="text-[10px] text-amber-400 font-mono">
                        z-index: {activeLayer.zIndex}
                      </span>
                    </div>

                    {/* Numeric X, Y, W, H Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">X (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          disabled={activeLayer.locked}
                          value={Math.round(activeLayer.rect.x * 10) / 10}
                          onChange={(e) => updateSelectedLayerRect({ x: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:border-amber-400"
                        />
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Y (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          disabled={activeLayer.locked}
                          value={Math.round(activeLayer.rect.y * 10) / 10}
                          onChange={(e) => updateSelectedLayerRect({ y: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:border-amber-400"
                        />
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">W (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="2"
                          max="100"
                          disabled={activeLayer.locked}
                          value={Math.round(activeLayer.rect.width * 10) / 10}
                          onChange={(e) => updateSelectedLayerRect({ width: parseFloat(e.target.value) || 2 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:border-amber-400"
                        />
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">H (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          disabled={activeLayer.locked}
                          value={Math.round(activeLayer.rect.height * 10) / 10}
                          onChange={(e) => updateSelectedLayerRect({ height: parseFloat(e.target.value) || 1 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Center Alignment Buttons */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">सेंटर अलाइन:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ x: (100 - activeLayer.rect.width) / 2 })}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 hover:text-white cursor-pointer"
                        >
                          हॉरिजॉन्टल
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ y: (100 - activeLayer.rect.height) / 2 })}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 hover:text-white cursor-pointer"
                        >
                          वर्टिकल
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() =>
                            updateSelectedLayerRect({
                              x: (100 - activeLayer.rect.width) / 2,
                              y: (100 - activeLayer.rect.height) / 2,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                        >
                          दोनों सेंटर
                        </button>
                      </div>
                    </div>

                    {/* Move / Nudge & Resize Controls */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">नज / मूव:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ x: activeLayer.rect.x - 1 })}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="बाएं मूव करें (Left)"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ y: activeLayer.rect.y - 1 })}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="ऊपर मूव करें (Up)"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ y: activeLayer.rect.y + 1 })}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="नीचे मूव करें (Down)"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() => updateSelectedLayerRect({ x: activeLayer.rect.x + 1 })}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="दाएं मूव करें (Right)"
                        >
                          →
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold ml-2">साइज:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() =>
                            updateSelectedLayerRect({
                              width: activeLayer.rect.width - 2,
                              height: activeLayer.rect.height - 2,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="साइज घटाएं"
                        >
                          - छोटा
                        </button>
                        <button
                          type="button"
                          disabled={activeLayer.locked}
                          onClick={() =>
                            updateSelectedLayerRect({
                              width: activeLayer.rect.width + 2,
                              height: activeLayer.rect.height + 2,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                          title="साइज बढ़ाएं"
                        >
                          + बड़ा
                        </button>
                      </div>
                    </div>

                    {/* Part 7: Element Rotation Controls */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">रोटेशन (Rotation):</span>
                      <div className="flex items-center gap-1">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            disabled={isLayoutLocked || activeLayer.locked}
                            onClick={() => handleRotateActiveLayer(deg)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                              (activeLayer.rotation || 0) === deg
                                ? 'bg-amber-400 text-slate-950 font-black shadow'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={isLayoutLocked || activeLayer.locked}
                          onClick={() => handleRotateActiveLayer(((activeLayer.rotation || 0) - 90 + 360) % 360)}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
                          title="90° वामावर्त घुमाएँ (-90°)"
                        >
                          ↶
                        </button>
                        <button
                          type="button"
                          disabled={isLayoutLocked || activeLayer.locked}
                          onClick={() => handleRotateActiveLayer(((activeLayer.rotation || 0) + 90) % 360)}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
                          title="90° दक्षिणावर्त घुमाएँ (+90°)"
                        >
                          ↷
                        </button>
                      </div>
                    </div>

                    {/* Part 8: Individual Layer Lock / Unlock */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">लेयर लॉक स्थिति:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleLayerLock(activeLayer.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                          activeLayer.locked
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {activeLayer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                        <span>{activeLayer.locked ? 'लेयर लॉक है' : 'लेयर अनलॉक है'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 5: PHOTO SLOTS & MULTI-PHOTO LAYOUT VARIANTS */}
          {currentStage === 'photo_slots_layout' && (
            <div className="space-y-6">
              {/* VIDEO MODE: Video Display Mode (Choice A: Fit vs Choice B: Crop) */}
              {generatorMode === 'video' ? (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-4 h-4" />
                      वीडियो लेआउट व डिस्प्ले मोड (Video Layout & Display Mode)
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30 font-bold">
                      {selectedRatio} वीडियो
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    वीडियो के लिए मुख्य विज़िबल एरिया और क्रॉप/फिट व्यवहार चुनें। एंड-यूजर वीडियो स्टूडियो में इसी नियम के अनुसार वीडियो दिखेगा।
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Choice A: Full Video / Fit */}
                    <div
                      onClick={() => setVideoDisplayMode('fit')}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        videoDisplayMode === 'fit'
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h5 className="font-black text-sm text-amber-300">विकल्प A: फुल वीडियो / फिट (Full Video / Fit)</h5>
                          {videoDisplayMode === 'fit' && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          पूरा वीडियो बिना किसी अनचाही क्रॉपिंग के विज़िबल एरिया में सुरक्षित रूप से फिट होगा। ओरिजिनल अनुपात सुरक्षित रहेगा।
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">
                        displayMode: 'fit' (अनुशंसित)
                      </div>
                    </div>

                    {/* Choice B: Crop Video */}
                    <div
                      onClick={() => setVideoDisplayMode('crop')}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        videoDisplayMode === 'crop'
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h5 className="font-black text-sm text-amber-300">विकल्प B: क्रॉप वीडियो (Crop Video)</h5>
                          {videoDisplayMode === 'crop' && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          वीडियो विज़िबल एरिया को पूरी तरह भरने के लिए {selectedRatio} के अनुसार केंद्र से क्रॉप होगा। कोई खाली किनारा नहीं दिखेगा।
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-1 rounded">
                        displayMode: 'crop' ({selectedRatio} फिल)
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {/* Layout Mode Variants Selector */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    मल्टी-फोटो लेआउट वेरिएंट्स (Photo Layout Variants)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={photoSlots.length >= 4}
                      onClick={() => {
                        if (photoSlots.length >= 4) return;
                        const newId = `slot_${Date.now()}`;
                        const newSlot: PhotoSlotConfig = {
                          id: newId,
                          name: `फोटो स्लॉट ${photoSlots.length + 1}`,
                          rect: { x: 10 + photoSlots.length * 5, y: 20 + photoSlots.length * 5, width: 40, height: 40 },
                          slotType: 'regular',
                          bgRemoval: false,
                          cropMode: 'cover',
                        };
                        setPhotoSlots((prev) => [...prev, newSlot]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        photoSlots.length >= 4
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ फोटो स्लॉट जोड़ें</span>
                    </button>
                    <span className="text-[10px] text-slate-400">यूजर इन अनुमत वेरिएंट्स में से चुन सकेंगे</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                  {layoutVariants.map((v) => {
                    const isSelected = activeLayoutMode === v.mode;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleSelectLayoutMode(v.mode)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{v.label}</span>
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              setLayoutVariants((prev) =>
                                prev.map((x) => (x.id === v.id ? { ...x, enabled: e.target.checked } : x))
                              );
                            }}
                            className="w-3.5 h-3.5 accent-amber-500 rounded"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{v.slots.length} फोटो स्लॉट्स</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Statement Frame Options (If Enabled) */}
              {isStatementFrame && (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                    वक्तव्य / बयानबाजी फ्रेम सेटिंग्स (Statement Frame Options)
                  </h4>

                  {/* Cutout Left / Right Positioning */}
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1.5">
                      वक्ता कटआउट फोटो पोज़ीशन (Photo Position)
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                      <button
                        type="button"
                        onClick={() => handleCutoutPositionChange('left')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          statementCutoutPos === 'left'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4" />
                        <span>बाईं ओर (Left Cutout)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCutoutPositionChange('right')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          statementCutoutPos === 'right'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <AlignRight className="w-4 h-4" />
                        <span>दाईं ओर (Right Cutout)</span>
                      </button>
                    </div>
                  </div>

                  {/* Three Background Modes */}
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1.5">
                      स्टेटमेंट बैकग्राउंड मोड (3 Modes)
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-w-md mb-3">
                      {(['solid', 'curated', 'ai_generated'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setStatementBgMode(m)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            statementBgMode === m
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {m === 'solid' ? 'सॉलिड कलर' : m === 'curated' ? 'क्यूरेटेड लाइब्रेरी' : 'AI बैकग्राउंड'}
                        </button>
                      ))}
                    </div>

                    {statementBgMode === 'solid' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={statementBgColor}
                          onChange={(e) => setStatementBgColor(e.target.value)}
                          className="w-10 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={statementBgColor}
                          onChange={(e) => setStatementBgColor(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono text-xs w-28"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Active Layout Slots List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photoSlots.map((slot, idx) => (
                  <div key={slot.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-400">
                        फोटो स्लॉट #{idx + 1}: {slot.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {Math.round(slot.rect.width)}% × {Math.round(slot.rect.height)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">स्लॉट प्रकार</label>
                        <select
                          value={slot.slotType || 'regular'}
                          onChange={(e) => {
                            const val = e.target.value as 'regular' | 'cutout';
                            setPhotoSlots((prev) =>
                              prev.map((s) =>
                                s.id === slot.id
                                  ? {
                                      ...s,
                                      slotType: val,
                                      bgRemoval: val === 'cutout',
                                    }
                                  : s
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="regular">रेगुलर (Box Photo)</option>
                          <option value="cutout">कटआउट (Bg Removal)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">क्रॉप मोड</label>
                        <select
                          value={slot.cropMode || 'cover'}
                          onChange={(e) =>
                            setPhotoSlots((prev) =>
                              prev.map((s) => (s.id === slot.id ? { ...s, cropMode: e.target.value as any } : s))
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="cover">Cover (पूर्ण भरें)</option>
                          <option value="contain">Contain (अनुपात सुरक्षित)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <span className="text-[11px] text-slate-300 font-bold">कटआउट</span>
                        <input
                          type="checkbox"
                          checked={slot.bgRemoval || slot.slotType === 'cutout'}
                          onChange={(e) =>
                            setPhotoSlots((prev) =>
                              prev.map((s) => (s.id === slot.id ? { ...s, bgRemoval: e.target.checked } : s))
                            )
                          }
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 6: TEXT & QUOTE CONFIGURATION */}
          {currentStage === 'text_quote_config' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                  हेडलाइन टाइपोग्राफी एवं रंग (Devanagari Headline)
                </h4>
                {textSlots.map((slot) => (
                  <div key={slot.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">देवनागरी फ़ॉन्ट</label>
                      <select
                        value={slot.fontFamily}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, fontFamily: e.target.value } : s))
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                      >
                        <option value="Noto Sans Devanagari">Noto Sans Devanagari</option>
                        <option value="Baloo 2">Baloo 2 (बोल्ड हेडिंग)</option>
                        <option value="Hind">Hind</option>
                        <option value="Rozha One">Rozha One</option>
                        <option value="Yatra One">Yatra One</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">फ़ॉन्ट साइज़ (px)</label>
                      <input
                        type="number"
                        min={30}
                        max={120}
                        value={slot.fontSize}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, fontSize: parseInt(e.target.value) || 60 } : s))
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">लाइन हाइट (मात्रा सुरक्षा 1.1 - 1.8)</label>
                      <input
                        type="number"
                        step={0.05}
                        min={1.1}
                        max={1.8}
                        value={slot.lineHeight || 1.3}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1.3;
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, lineHeight: val } : s))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">अधिकतम लाइन्स</label>
                      <select
                        value={slot.maxLines}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, maxLines: parseInt(e.target.value) || 3 } : s))
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                      >
                        <option value={1}>1 लाइन</option>
                        <option value={2}>2 लाइन</option>
                        <option value={3}>3 लाइन</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">टेक्स्ट रंग</label>
                      <input
                        type="color"
                        value={slot.textColor || '#FFFFFF'}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, textColor: e.target.value } : s))
                          )
                        }
                        className="w-full h-8 bg-slate-900 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">बैकग्राउंड रंग</label>
                      <input
                        type="text"
                        value={slot.backgroundColor || '#B91C1C'}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, backgroundColor: e.target.value } : s))
                          )
                        }
                        placeholder="#B91C1C या transparent"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">अलाइनमेंट</label>
                      <select
                        value={slot.alignment || 'center'}
                        onChange={(e) =>
                          setTextSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, alignment: e.target.value as any } : s))
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                      >
                        <option value="center">Center</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 7: DUAL LIVE PREVIEW SYSTEM */}
          {currentStage === 'dual_live_preview' && (
            <div className="space-y-6">
              {/* Test Controls Bar */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>ड्यूल लाइव प्रीव्यू एवं इंटरएक्टिव टेस्टिंग</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      सैंपल संदर्भ की वास्तविक रेंडरिंग से तुलना करें और लाइव टेस्ट इनपुट बदलें।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTestPreview}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>⚡ टेस्ट प्रीव्यू डाउनलोड करें (No Coins)</span>
                  </button>
                </div>

                {/* Part 2: Dedicated Sample Test Mode (Dummy Text Input) Panel */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsSampleTestModeExpanded(!isSampleTestModeExpanded)}
                      className="flex items-center gap-2 text-xs font-black text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>नमूना टेक्स्ट दर्ज करें (Sample Test Inputs)</span>
                      {isSampleTestModeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSampleText}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                    >
                      <span>🔄 रीसेट नमूना टेक्स्ट</span>
                    </button>
                  </div>

                  {isSampleTestModeExpanded && (
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                      {/* 3 Distinct Headline Lines */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">हेडलाइन: लाइन 1</label>
                          <input
                            type="text"
                            value={dummyLine1}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDummyLine1(v);
                              setTestHeadline([v, dummyLine2, dummyLine3].filter(Boolean).join(' '));
                            }}
                            placeholder="लाइन 1"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">हेडलाइन: लाइन 2</label>
                          <input
                            type="text"
                            value={dummyLine2}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDummyLine2(v);
                              setTestHeadline([dummyLine1, v, dummyLine3].filter(Boolean).join(' '));
                            }}
                            placeholder="लाइन 2"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">हेडलाइन: लाइन 3</label>
                          <input
                            type="text"
                            value={dummyLine3}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDummyLine3(v);
                              setTestHeadline([dummyLine1, dummyLine2, v].filter(Boolean).join(' '));
                            }}
                            placeholder="लाइन 3"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Location & Callout Full Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">सैंपल लोकेशन (City/State)</label>
                          <input
                            type="text"
                            value={dummyLocation}
                            onChange={(e) => setDummyLocation(e.target.value)}
                            placeholder="भोपाल"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">कॉलआउट विवरण (Callout Text)</label>
                          <input
                            type="text"
                            value={dummyCalloutText}
                            onChange={(e) => setDummyCalloutText(e.target.value)}
                            placeholder="पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Layout Switcher & Test Photos Upload */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1">लेआउट टेस्ट:</span>
                    {layoutVariants.filter((v) => v.enabled).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectLayoutMode(v.mode)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          activeLayoutMode === v.mode
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {v.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {generatorMode === 'video' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400">सैंपल वीडियो:</span>
                      <label className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow">
                        <Upload className="w-3.5 h-3.5" />
                        <span>सैंपल वीडियो अपलोड (लगभग 10s)</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              setSampleVideoPreview(url);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setSampleVideoPreview('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer"
                      >
                        डिफ़ॉल्ट सैंपल वीडियो
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400">सैंपल फोटो टेस्ट:</span>
                      <label className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black cursor-pointer transition flex items-center gap-1.5 shadow">
                        <Upload className="w-3.5 h-3.5" />
                        <span>सैंपल फोटो अपलोड (Upload Sample Photo)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  const dataUrl = ev.target.result as string;
                                  setSamplePhotoPreview(dataUrl);
                                  setTestPhotos((prev) => [dataUrl, ...prev.slice(1)]);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {photoSlots.length > 1 && photoSlots.slice(1).map((slot, idx) => (
                        <label
                          key={slot.id}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer"
                        >
                          स्लॉट {idx + 2}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleTestPhotoUpload(idx + 1, e)}
                            className="hidden"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dual Previews Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preview A: Sample Reference Jacket (Reference Only) */}
                {/* Preview A - Original Reference */}
                <div className="flex flex-col items-center p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>पैनल A: सैंपल संदर्भ जैकेट (Reference Only)</span>
                  </div>
                  <div
                    className="relative border-2 border-slate-700 rounded-xl overflow-hidden shadow-xl bg-black"
                    style={{
                      width: selectedRatio === '4:5' ? '280px' : '230px',
                      height: selectedRatio === '4:5' ? '350px' : '408px',
                    }}
                  >
                    {sampleImage ? (
                      <img src={sampleImage} alt="Sample Reference" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-600 text-xs">
                        <Upload className="w-6 h-6 mb-1 text-slate-700" />
                        <span>सैंपल ग्राफिक उपलब्ध नहीं</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview B - With Primary Background: Exact Canonical Composition with Layer Hierarchy */}
                <div className="flex flex-col items-center p-4 bg-slate-950/50 border border-amber-500/40 rounded-2xl space-y-2 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>वास्तविक कैनोनिकल फ्रेम प्रीव्यू (Preview B)</span>
                  </div>

                  <div
                    className="relative border-4 border-amber-500/60 rounded-xl overflow-hidden shadow-2xl bg-[#0B1329]"
                    style={{
                      width: selectedRatio === '4:5' ? '280px' : '230px',
                      height: selectedRatio === '4:5' ? '350px' : '408px',
                    }}
                  >
                    {/* LAYER 1: Photo Slots (Drawn at the bottom z-5) */}
                    {generatorMode === 'video' ? (
                      <div
                        className="absolute overflow-hidden bg-black flex items-center justify-center z-5"
                        style={{
                          left: `${videoRect.x}%`,
                          top: `${videoRect.y}%`,
                          width: `${videoRect.width}%`,
                          height: `${videoRect.height}%`,
                        }}
                      >
                        <video
                          src={sampleVideoPreview || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className={`w-full h-full ${videoDisplayMode === 'crop' ? 'object-cover' : 'object-contain'}`}
                        />
                      </div>
                    ) : (
                      photoSlots.map((slot, idx) => {
                        const testSrc = testPhotos[idx] || samplePhotoPreview;
                        return (
                          <div
                            key={slot.id}
                            className="absolute overflow-hidden z-5"
                            style={{
                              left: `${slot.rect.x}%`,
                              top: `${slot.rect.y}%`,
                              width: `${slot.rect.width}%`,
                              height: `${slot.rect.height}%`,
                              borderRadius: `${slot.cornerRadius ?? 0}px`,
                            }}
                          >
                            {testSrc ? (
                              <img src={testSrc} alt={slot.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-800/90 border border-dashed border-slate-600 flex flex-col items-center justify-center p-2 text-center text-slate-400">
                                <Camera className="w-5 h-5 mb-1 text-slate-500" />
                                <span className="text-[9px] font-bold">फोटो स्लॉट {idx + 1}</span>
                                <span className="text-[8px] text-slate-500">(सैंपल फोटो अपलोड करें)</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* LAYER 2: Panel B Original PNG Artwork (z-12 - Preserving transparency & curves) */}
                    {primaryBackgroundAsset && (
                      <img
                        src={primaryBackgroundAsset}
                        alt="Frame Overlay"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-12"
                      />
                    )}

                    {/* LAYER 3: Primary Headline (z-15 - Exact 3 Lines Typography Layout) */}
                    {textSlots.length > 0 && (() => {
                      const hSlot = textSlots[0];
                      const rawText = normalizeHeadlineText(
                        testHeadline ||
                        [dummyLine1, dummyLine2, dummyLine3].filter(Boolean).join(' ') ||
                        'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी'
                      );
                      const hRot = hSlot.rotation ?? 0;
                      return (
                        <div
                          className={`absolute z-15 flex flex-col justify-center px-1 pointer-events-none select-none ${hSlot.alignment === 'left' ? 'items-start text-left' : hSlot.alignment === 'right' ? 'items-end text-right' : 'items-center text-center'}`}
                          style={{
                            left: `${hSlot.rect.x}%`,
                            top: `${hSlot.rect.y}%`,
                            width: `${hSlot.rect.width}%`,
                            height: `${hSlot.rect.height}%`,
                            transform: hRot !== 0 ? `rotate(${hRot}deg)` : undefined,
                            transformOrigin: 'center center',
                            backgroundColor: hSlot.backgroundColor && hSlot.backgroundColor !== 'transparent' ? hSlot.backgroundColor : undefined,
                          }}
                        >
                          <p
                            className="font-bold leading-tight line-clamp-3 w-full"
                            style={{
                              fontFamily: typographyFontFamily || hSlot.fontFamily || 'Noto Sans Devanagari',
                              color: textSlots[0]?.textColor || typographyConfig?.primaryHeadline?.fontColor || hSlot.textColor || '#FFFFFF',
                              fontSize: selectedRatio === '4:5' ? '12px' : '11px',
                              textAlign: (hSlot.alignment as any) || 'center',
                              textShadow: hSlot.textColor?.toLowerCase() === '#000000' ? 'none' : '0 1px 4px rgba(0,0,0,0.9)',
                            }}
                          >
                            {rawText}
                          </p>
                        </div>
                      );
                    })()}

                    {/* LAYER 4: Channel Logo (z-16) */}
                    {headerConfig.showLogo && (
                      <div
                        className="absolute z-16 flex items-center justify-center p-0.5 rounded bg-slate-900/80 border border-white/20 shadow pointer-events-none"
                        style={{
                          left: `${headerConfig.logoRect?.x ?? 5}%`,
                          top: `${headerConfig.logoRect?.y ?? 3.5}%`,
                          maxWidth: `${headerConfig.logoRect?.width ?? 22}%`,
                          maxHeight: `${headerConfig.logoRect?.height ?? 9}%`,
                          transform: (headerConfig.logoRotation ?? 0) !== 0 ? `rotate(${headerConfig.logoRotation}deg)` : undefined,
                          transformOrigin: 'center center',
                        }}
                      >
                        <img
                          src={currentUser?.channelLogo || currentUser?.profileLogo || "/assets/ai_news_maker_logo.png"}
                          alt="Admin Logo"
                          className="max-h-5 max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                    )}

                    {/* LAYER 5: Location Badge (z-16) */}
                    {headerConfig.showLocation && (() => {
                      const badgeAsset =
                        headerConfig.manualLocationAsset ||
                        locationBadgeLibrary.find(b => b.id === headerConfig.locationBadgeAssetId)?.url ||
                        locationBadgeLibrary[0]?.url;
                      const locRot = headerConfig.locationRotation ?? 0;
                      return (
                        <div
                          className="absolute z-16 flex items-center justify-center pointer-events-none"
                          style={{
                            left: `${headerConfig.locationRect?.x ?? 5}%`,
                            top: `${headerConfig.locationRect?.y ?? 13.5}%`,
                            transform: locRot !== 0 ? `rotate(${locRot}deg)` : undefined,
                            transformOrigin: 'center center',
                          }}
                        >
                          {headerConfig.locationBadgeMode === 'static_image' && badgeAsset ? (
                            <div className="relative flex items-center justify-center">
                              <img
                                src={badgeAsset}
                                alt="Location Badge"
                                className="max-h-6 object-contain"
                              />
                              <span
                                className="absolute right-2 text-[8px] font-black shadow-sm"
                                style={{
                                  color: headerConfig.locationTextColor || '#000000',
                                }}
                              >
                                {dummyLocation || 'भोपाल'}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white shadow flex items-center gap-1"
                              style={{
                                backgroundColor: headerConfig.locationBgColor || '#DC2626',
                              }}
                            >
                              <span>📍 {dummyLocation || 'भोपाल'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* LAYER 6: Date Stamp (z-16) */}
                    {headerConfig.showDate && (
                      <div
                        className="absolute text-[8px] font-bold text-slate-300 z-16 pointer-events-none flex items-center justify-center"
                        style={{
                          left: `${headerConfig.dateRect?.x ?? 5}%`,
                          top: `${headerConfig.dateRect?.y ?? 18.5}%`,
                          transform: (headerConfig.dateRotation ?? 270) === 270 ? 'rotate(-90deg) origin-left-top' : undefined,
                        }}
                      >
                        <span>{new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}

                    {/* LAYER 7: AI Watermark (z-18) */}
                    {watermarkConfig.enabled && (() => {
                      const rot = watermarkConfig.rotation ?? (watermarkConfig.position === 'right_edge' ? 270 : 0);
                      const pos = watermarkConfig.position || 'right_edge';
                      let posStyle: React.CSSProperties = { right: '8px', top: '35%' };
                      let baseTranslate = 'translateY(-50%)';

                      if (pos === 'left_edge') {
                        posStyle = { left: '8px', top: '35%' };
                        baseTranslate = 'translateY(-50%)';
                      } else if (pos === 'top') {
                        posStyle = { top: '12px', left: '50%' };
                        baseTranslate = 'translateX(-50%)';
                      } else if (pos === 'bottom') {
                        posStyle = { bottom: '12px', left: '50%' };
                        baseTranslate = 'translateX(-50%)';
                      } else if (pos === 'center') {
                        posStyle = { top: '50%', left: '50%' };
                        baseTranslate = 'translate(-50%, -50%)';
                      } else if (watermarkConfig.rect?.x !== undefined) {
                        posStyle = {
                          left: `${watermarkConfig.rect.x}%`,
                          top: `${watermarkConfig.rect.y}%`,
                        };
                        baseTranslate = '';
                      }

                      const transform = baseTranslate ? `${baseTranslate} rotate(${rot}deg)` : `rotate(${rot}deg)`;

                      return (
                        <div
                          className="absolute z-18 pointer-events-none flex items-center justify-center font-bold select-none"
                          style={{
                            ...posStyle,
                            transform,
                            transformOrigin: 'center center',
                            opacity: watermarkConfig.opacity ?? 0.85,
                          }}
                        >
                          {watermarkConfig.type === 'image' && watermarkConfig.imageUrl ? (
                            <img src={watermarkConfig.imageUrl} alt="Watermark" className="max-h-8 max-w-20 object-contain" />
                          ) : (
                            <span
                              className="text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{
                                color: watermarkConfig.textColor || '#FFFFFF',
                                backgroundColor: watermarkConfig.watermarkStyle === 'box' ? (watermarkConfig.bgColor || 'rgba(0,0,0,0.6)') : 'transparent',
                                textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.7)',
                              }}
                            >
                              {watermarkConfig.customText || watermarkConfig.label || 'AI GENERATED'}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Breaking News Ribbon */}
                    {ribbonConfig.enabled && ribbonConfig.customRibbonUrl && (
                      <div
                        className="absolute z-14 pointer-events-none"
                        style={{
                          left: `${ribbonConfig.rect?.x ?? 15}%`,
                          top: `${ribbonConfig.rect?.y ?? 60}%`,
                          width: `${ribbonConfig.rect?.width ?? 70}%`,
                        }}
                      >
                        <img src={ribbonConfig.customRibbonUrl} alt="Ribbon" className="w-full h-auto" />
                      </div>
                    )}

                    {/* LAYER 8: Full Story Callout (z-18) */}
                    {fullStoryCalloutConfig.enabled && (() => {
                      const calloutAsset =
                        fullStoryCalloutConfig.manualCalloutAsset ||
                        manualCalloutAssetUrl ||
                        calloutLibrary.find(c => c.id === fullStoryCalloutConfig.calloutAssetId)?.url ||
                        calloutLibrary[0]?.url;
                      const cRot = fullStoryCalloutConfig.rotation ?? 0;
                      return (
                        <div
                          className="absolute z-18 flex items-center justify-center pointer-events-none"
                          style={{
                            left: `${fullStoryCalloutConfig.rect?.x ?? 10}%`,
                            top: `${fullStoryCalloutConfig.rect?.y ?? 85}%`,
                            width: `${fullStoryCalloutConfig.rect?.width ?? 80}%`,
                            height: `${fullStoryCalloutConfig.rect?.height ?? 3.5}%`,
                            transform: cRot !== 0 ? `rotate(${cRot}deg)` : undefined,
                            transformOrigin: 'center center',
                          }}
                        >
                          {fullStoryCalloutConfig.calloutAssetMode === 'static_image' && calloutAsset ? (
                            <img
                              src={calloutAsset}
                              alt="Story Callout"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div
                              className="text-[8px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1"
                              style={{
                                color: fullStoryCalloutConfig.textColor || '#FFFFFF',
                                backgroundColor: fullStoryCalloutConfig.bgColor || '#F59E0B',
                                border: `${fullStoryCalloutConfig.borderWidth ?? 1}px solid ${fullStoryCalloutConfig.borderColor || '#FACC15'}`,
                              }}
                            >
                              <span>📢</span>
                              <span>{dummyCalloutText || fullStoryCalloutConfig.text || 'पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Optional POWERED BY Element */}
                    {poweredByConfig.enabled && (
                      <div
                        className="absolute text-[7px] font-bold px-1.5 py-0.5 rounded shadow-sm z-25 truncate max-w-[90%] pointer-events-none"
                        style={{
                          left: `${poweredByConfig.rect.x}%`,
                          top: `${poweredByConfig.rect.y}%`,
                          width: `${poweredByConfig.rect.width}%`,
                          color: poweredByConfig.textColor || '#FFFFFF',
                          backgroundColor: poweredByConfig.bgColor || 'rgba(15, 23, 42, 0.85)',
                          borderColor: poweredByConfig.borderColor || '#3B82F6',
                          borderWidth: `${poweredByConfig.borderWidth ?? 1}px`,
                          textAlign: poweredByConfig.alignment || 'center',
                          opacity: poweredByConfig.opacity ?? 0.85,
                          transform: `rotate(${poweredByConfig.rotation || 0}deg)`,
                        }}
                      >
                        {poweredByConfig.text || 'POWERED BY AINEWSMAKER.ONLINE'}
                      </div>
                    )}

                    {/* LAYER 9: Permanent Protected Footer (z-20) */}
                    {(() => {
                      const fRatio = footerConfig.footerHeightRatio || (selectedRatio === '4:5' ? 0.08 : 0.065);
                      const fHeightPct = fRatio * 100;
                      const fWidthPct = footerConfig.footerWidthPct || 100;
                      let fBg = primaryFooterColor || footerConfig.primaryFooterColor || footerConfig.footerBgColor || '#FFFFFF';
                      if (bannedFooterColor && fBg.trim().toLowerCase() === bannedFooterColor.trim().toLowerCase()) {
                        fBg = '#0B1329';
                      }
                      const hexClean = fBg.replace('#', '').trim();
                      let isLight = true;
                      if (hexClean.length === 6) {
                        const r = parseInt(hexClean.substring(0, 2), 16);
                        const g = parseInt(hexClean.substring(2, 4), 16);
                        const b = parseInt(hexClean.substring(4, 6), 16);
                        isLight = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 >= 0.5;
                      }
                      const fColor = footerConfig.footerTextColor || (isLight ? '#0A0A0A' : '#FFFFFF');
                      return (
                        <div
                          className={`absolute ${generatorMode === 'video' && videoFooterPosition === 'top' ? 'top-0 border-b' : 'bottom-0 border-t'} flex items-center justify-between px-2 text-[7px] font-bold z-20 pointer-events-none select-none`}
                          style={{
                            height: `${fHeightPct}%`,
                            width: `${fWidthPct}%`,
                            left: `${(100 - fWidthPct) / 2}%`,
                            backgroundColor: fBg,
                            color: fColor,
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex items-center justify-center text-[5px] text-white font-black">▶</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex items-center justify-center text-[5px] text-white font-black">f</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-pink-600 flex items-center justify-center text-[5px] text-white font-black">📷</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 flex items-center justify-center text-[5px] text-white font-black">𝕏</span>
                            </div>
                            <span className="truncate max-w-[95px] font-bold">@breakingnewswala</span>
                          </div>
                          <div className="flex items-center gap-1 text-[6.5px] truncate">
                            <span>🌐 breakingnewswala.com</span>
                            <span>|</span>
                            <span>📱 +91 96698 02408</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sample Photo Upload Control for Test in Preview B */}
                  <div className="w-full flex items-center justify-center gap-2 pt-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow transition">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{samplePhotoPreview ? 'सैंपल फोटो बदलें' : 'सैंपल फोटो अपलोड करें (स्लॉट टेस्ट)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              const url = ev.target.result as string;
                              setSamplePhotoPreview(url);
                              setTestPhotos((prev) => {
                                const u = [...prev];
                                u[0] = url;
                                return u;
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    {samplePhotoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setSamplePhotoPreview('');
                          setTestPhotos([]);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        फोटो हटाएँ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: PLAN & PUBLISH */}
          {currentStage === 'plan_publish' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">फ्रेम का नाम *</label>
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  placeholder="उदा. सुपर प्राइम 4:5 रेड फ्रेम"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">विवरण (Description)</label>
                <textarea
                  value={frameDescription}
                  onChange={(e) => setFrameDescription(e.target.value)}
                  rows={2}
                  placeholder="फ्रेम की विशेषताएं लिखें..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Primary Typography Selection (Req 8) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <h5 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                  प्राथमिक टाइपोग्राफी सेटिंग्स (Primary Headline Typography)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">फ़ॉन्ट फ़ैमिली (Font Family)</label>
                    <select
                      value={typographyFontFamily}
                      onChange={(e) => setTypographyFontFamily(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                    >
                      <option value="Noto Sans Devanagari">Noto Sans Devanagari</option>
                      <option value="Rozha One">Rozha One (Bold Editorial)</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Tiro Devanagari Hindi">Tiro Devanagari Hindi</option>
                      <option value="Mukta">Mukta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">फ़ॉन्ट साइज़ (Font Size)</label>
                    <input
                      type="number"
                      min="36"
                      max="100"
                      value={typographyFontSize}
                      onChange={(e) => setTypographyFontSize(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">वेट (Font Weight)</label>
                    <select
                      value={typographyFontWeight}
                      onChange={(e) => setTypographyFontWeight(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                    >
                      <option value="bold">Bold (बोल्ड)</option>
                      <option value="black">Black (अति बोल्ड)</option>
                      <option value="semibold">SemiBold</option>
                      <option value="normal">Normal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Design Category Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  डिज़ाइन कैटेगरी (Design Category)
                </label>
                <select
                  value={designCategory}
                  onChange={(e) => setDesignCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold"
                >
                  {DYNAMIC_FRAME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allowed Subscription Plans */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  अनुमत मेंबरशिप प्लान (Allowed Subscription Plans)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DYNAMIC_PLAN_TIERS.map((tier) => {
                    const isChecked = allowedPlans.includes(tier);
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            if (allowedPlans.length > 1) {
                              setAllowedPlans(allowedPlans.filter((p) => p !== tier));
                            }
                          } else {
                            setAllowedPlans([...allowedPlans, tier]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-xs">{tier}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/60 border border-red-500/40 text-red-300'
                  }`}
                >
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              const stages: WizardStage[] = [
                'upload_aspect',
                'ai_analysis',
                'ribbon_header_footer',
                'canvas_marking',
                'photo_slots_layout',
                'text_quote_config',
                'dual_live_preview',
                'plan_publish',
              ];
              const idx = stages.indexOf(currentStage);
              if (idx > 0) setCurrentStage(stages[idx - 1]);
            }}
            disabled={currentStage === 'upload_aspect'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>पिछला</span>
          </button>

          {currentStage !== 'plan_publish' ? (
            <button
              type="button"
              onClick={() => {
                const stages: WizardStage[] = [
                  'upload_aspect',
                  'ai_analysis',
                  'ribbon_header_footer',
                  'canvas_marking',
                  'photo_slots_layout',
                  'text_quote_config',
                  'dual_live_preview',
                  'plan_publish',
                ];
                const idx = stages.indexOf(currentStage);
                if (idx < stages.length - 1) setCurrentStage(stages[idx + 1]);
              }}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>अगला</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndPublish}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSaving ? 'सेव हो रहा है...' : 'Save & Publish Frame'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
