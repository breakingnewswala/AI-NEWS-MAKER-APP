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
  const [primaryBackgroundMode, setPrimaryBackgroundMode] = useState<PrimaryBackgroundMode>(
    initialFrame?.primaryBackgroundMode || 'image'
  );
  const [primaryBackgroundHex, setPrimaryBackgroundHex] = useState<string>(
    initialFrame?.primaryBackgroundHex || '#0B1329'
  );
  const [primaryBgFileName, setPrimaryBgFileName] = useState<string>('');

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
            backgroundColor: '#B91C1C',
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

  // Watermark (AI GENERATED / प्रतीकात्मक फोटो)
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(
    initialFrame?.watermarkConfig || {
      enabled: false,
      label: 'AI GENERATED',
      rect: { x: 72, y: 56, width: 25, height: 4 },
      fontSize: 16,
      textColor: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.6)',
      opacity: 0.85,
      rotation: 0,
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
    }
  );

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

    // Photo layers
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
        setPrimaryBackgroundAsset(ev.target.result as string);
        setPrimaryBackgroundMode('image');
      }
    };
    reader.readAsDataURL(file);
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
      setFeedbackMsg({ type: 'error', text: 'कृपया पहले सैंपल ग्राफिक अपलोड करें।' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisStatusText('Gemini 1.5 Pro विज़न से सैंपल लेआउट का विश्लेषण हो रहा है...');
    try {
      const res = await requestAiFrameAnalysis(sampleImage, selectedRatio);
      setAnalysisResult(res);
      setAnalysisStatusText('विज़न विश्लेषण पूर्ण! तत्वों की पहचान कर ली गई है।');
    } catch (err: any) {
      setAnalysisStatusText('AI विश्लेषण में त्रुटि आई। डिफ़ॉल्ट लेआउट सक्रिय किया जा रहा है।');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAiAnalysis = () => {
    if (!analysisResult) return;
    if (analysisResult.headlineArea) {
      setTextSlots((prev) => [
        {
          ...prev[0],
          rect: analysisResult.headlineArea!,
          fontSize: analysisResult.headlineMaxLines === 2 ? 74 : 64,
          maxLines: analysisResult.headlineMaxLines || 3,
        },
      ]);
    }
    if (analysisResult.photoSlotArea) {
      setPhotoSlots((prev) => [
        {
          ...prev[0],
          rect: analysisResult.photoSlotArea!,
        },
      ]);
    }
    if (analysisResult.logoArea) {
      setHeaderConfig((prev) => ({
        ...prev,
        showLogo: true,
        logoRect: analysisResult.logoArea!,
      }));
    }
    if (analysisResult.locationArea) {
      setHeaderConfig((prev) => ({
        ...prev,
        showLocation: true,
        locationRect: analysisResult.locationArea!,
      }));
    }
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

  // Step 7: Full Resolution Direct Test Preview Download
  const handleDownloadTestPreview = async () => {
    try {
      const canvas = document.createElement('canvas');
      const w = 1080;
      const h = selectedRatio === '4:5' ? 1350 : selectedRatio === '9:16' ? 1920 : 1080;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background
      if (primaryBackgroundMode === 'solid') {
        ctx.fillStyle = primaryBackgroundHex || '#0B1329';
        ctx.fillRect(0, 0, w, h);
      } else if (primaryBackgroundAsset || sampleImage) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';
          bgImg.src = primaryBackgroundAsset || sampleImage;
          await new Promise((resolve) => {
            bgImg.onload = resolve;
            bgImg.onerror = resolve;
          });
          ctx.drawImage(bgImg, 0, 0, w, h);
        } catch {
          ctx.fillStyle = '#0B1329';
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        ctx.fillStyle = '#0B1329';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Draw Test Photos for current layout slots
      const activeSlots = photoSlots;
      for (let i = 0; i < activeSlots.length; i++) {
        const slot = activeSlots[i];
        const testImgSrc = testPhotos[i] || sampleImage;
        const sx = (slot.rect.x / 100) * w;
        const sy = (slot.rect.y / 100) * h;
        const sw = (slot.rect.width / 100) * w;
        const sh = (slot.rect.height / 100) * h;

        if (testImgSrc) {
          try {
            const pImg = new Image();
            pImg.crossOrigin = 'anonymous';
            pImg.src = testImgSrc;
            await new Promise((resolve) => {
              pImg.onload = resolve;
              pImg.onerror = resolve;
            });
            ctx.save();
            ctx.beginPath();
            ctx.rect(sx, sy, sw, sh);
            ctx.clip();
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
          } catch {}
        } else {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(sx, sy, sw, sh);
        }
      }

      // 3. Draw Ribbon if enabled
      if (ribbonConfig.enabled && ribbonConfig.customRibbonUrl) {
        try {
          const rImg = new Image();
          rImg.crossOrigin = 'anonymous';
          rImg.src = ribbonConfig.customRibbonUrl;
          await new Promise((resolve) => {
            rImg.onload = resolve;
            rImg.onerror = resolve;
          });
          const rx = ((ribbonConfig.rect?.x ?? 15) / 100) * w;
          const ry = ((ribbonConfig.rect?.y ?? 60) / 100) * h;
          const rw = ((ribbonConfig.rect?.width ?? 70) / 100) * w;
          const rh = ((ribbonConfig.rect?.height ?? 8) / 100) * h;
          ctx.drawImage(rImg, rx, ry, rw, rh);
        } catch {}
      }

      // 4. Draw Headline Box & Text
      const headlineSlot = textSlots[0] || {
        rect: { x: 7, y: 63, width: 86, height: 27 },
        backgroundColor: '#B91C1C',
        textColor: '#FFFFFF',
        fontSize: 70,
        fontFamily: 'Noto Sans Devanagari',
      };
      const hx = (headlineSlot.rect.x / 100) * w;
      const hy = (headlineSlot.rect.y / 100) * h;
      const hw = (headlineSlot.rect.width / 100) * w;
      const hh = (headlineSlot.rect.height / 100) * h;
      if (headlineSlot.backgroundColor && headlineSlot.backgroundColor !== 'transparent') {
        ctx.fillStyle = headlineSlot.backgroundColor;
        ctx.fillRect(hx, hy, hw, hh);
      }

      ctx.fillStyle = headlineSlot.textColor || '#FFFFFF';
      ctx.font = `bold ${Math.round((headlineSlot.fontSize || 60) * 0.9)}px "${headlineSlot.fontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textToDraw = testHeadline || 'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी';
      ctx.fillText(textToDraw, hx + hw / 2, hy + hh / 2, hw - 40);

      // 5. Draw Protected Footer Bar
      const fRatio = footerConfig.footerHeightRatio || 0.08;
      const fh = fRatio * h;
      const fw = ((footerConfig.footerWidthPct || 100) / 100) * w;
      const fx = (w - fw) / 2;
      const fy = h - fh;
      ctx.fillStyle = footerConfig.footerBgColor || '#FFFFFF';
      ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = footerConfig.footerTextColor || '#000000';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`@${currentUser?.username || 'breakingnewswala'}`, fx + 30, fy + fh / 2 + 8);
      ctx.textAlign = 'right';
      ctx.fillText(currentUser?.phone ? `📱 ${currentUser.phone}` : 'सत्यापित डिजिटल समाचार नेटवर्क', fx + fw - 30, fy + fh / 2 + 8);

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
    if (generatorMode === 'video') {
      setFeedbackMsg({
        type: 'error',
        text: '⚠️ वीडियो फ्रेम नियम (Timeline, Animations) अभी विनिर्देशों के अनुसार लंबित हैं। कृपया फोटो फ्रेम जनरेटर का उपयोग करें।',
      });
      return;
    }

    if (!frameName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'कृपया फ्रेम का नाम दर्ज करें।' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const templateData: Partial<DynamicFrameTemplate> = {
      name: frameName.trim(),
      description: frameDescription.trim(),
      frameMode: 'photo',
      aspectRatio: selectedRatio,
      canvasWidth: 1080,
      canvasHeight: selectedRatio === '4:5' ? 1350 : 1920,
      sampleReferenceUrl: sampleImage,
      primaryBackgroundAsset: primaryBackgroundMode === 'image' ? primaryBackgroundAsset : undefined,
      primaryBackgroundMode,
      primaryBackgroundHex,
      previewImageUrl: primaryBackgroundAsset || sampleImage,
      designCategory,
      allowedPlans,
      publicationStatus,
      createdBy: currentUser?.email || 'breakingnewswala.com@gmail.com',
      headerConfig,
      footerConfig: {
        ...footerConfig,
        enforcePermanentFooter: true,
      },
      photoSlots,
      photoLayoutVariants: layoutVariants,
      activePhotoLayoutMode: activeLayoutMode,
      textSlots,
      ribbonConfig,
      watermarkConfig,
      fullStoryCalloutConfig,
      poweredByConfig,
      safeZoneConfig,
      layers,
      isStatementFrame,
      statementOptions: {
        solidBackgroundHex: statementBgColor,
        backgroundMode: statementBgMode,
        curatedBackgroundId: curatedBgId,
        aiPrompt: aiBgPrompt,
        cutoutPosition: statementCutoutPos,
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

                {/* Panel B: Primary Background Upload (Clean static artwork / PNG with transparency) */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      पैनल B: प्राइमरी बैकग्राउंड अपलोड (Clean Artwork)
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold">
                      वास्तविक बैकग्राउंड
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    क्लीन ट्रांसपेरेंट PNG आर्टवर्क या सॉलिड कलर चुनें जो डायनामिक लेयर्स के पीछे दिखेगा।
                  </p>

                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPrimaryBackgroundMode('image')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        primaryBackgroundMode === 'image'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      PNG / इमेज अपलोड
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrimaryBackgroundMode('solid')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        primaryBackgroundMode === 'solid'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      सॉलिड कलर मोड
                    </button>
                  </div>

                  {primaryBackgroundMode === 'image' ? (
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-5 text-center cursor-pointer relative bg-slate-900/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePrimaryBgUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-white block">प्राइमरी बैकग्राउंड PNG चुनें</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">पारदर्शी PNG या क्लीन आर्टवर्क</span>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={primaryBackgroundHex}
                          onChange={(e) => setPrimaryBackgroundHex(e.target.value)}
                          className="w-12 h-10 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={primaryBackgroundHex}
                          onChange={(e) => setPrimaryBackgroundHex(e.target.value)}
                          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs w-32"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['#0B1329', '#1E293B', '#B91C1C', '#0F172A', '#18181B', '#312E81'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPrimaryBackgroundHex(c)}
                            className="w-6 h-6 rounded-md border border-white/20 cursor-pointer"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {primaryBgFileName && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {primaryBgFileName}
                    </div>
                  )}
                  {primaryBackgroundAsset && primaryBackgroundMode === 'image' && (
                    <div className="w-28 h-36 border border-slate-700 rounded-lg overflow-hidden mx-auto mt-2">
                      <img src={primaryBackgroundAsset} alt="Primary Background" className="w-full h-full object-cover" />
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
              {/* Channel Logo & Location Badge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel Logo */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">चैनल लोगो (Channel Logo)</span>
                    <input
                      type="checkbox"
                      checked={headerConfig.showLogo}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showLogo: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {headerConfig.showLogo && (
                    <div className="space-y-2 pt-1">
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">अलाइनमेंट:</span>
                        <select
                          value={headerConfig.logoAlign || 'left'}
                          onChange={(e) => setHeaderConfig({ ...headerConfig, logoAlign: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Badge */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">लोकेशन बैज (Location Badge)</span>
                    <input
                      type="checkbox"
                      checked={headerConfig.showLocation}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showLocation: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {headerConfig.showLocation && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">मोड:</span>
                        <select
                          value={headerConfig.locationBadgeMode || 'dynamic_overlay'}
                          onChange={(e) => setHeaderConfig({ ...headerConfig, locationBadgeMode: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="dynamic_overlay">Mode A: बैज स्किन + डायनामिक टेक्स्ट</option>
                          <option value="static_image">Mode B: पूर्ण स्टैटिक बैज इमेज</option>
                        </select>
                      </div>

                      {headerConfig.locationBadgeMode === 'static_image' ? (
                        <div className="pt-1">
                          <label className="text-[10px] text-slate-400 block mb-1">मैनुअल लोकेशन बॉक्स अपलोड करें</label>
                          <input type="file" accept="image/*" onChange={handleManualLocationUpload} className="text-[11px] text-slate-400" />
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
                    </div>
                  )}
                </div>
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
                      className="w-4 h-4 accent-amber-500 rounded"
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
                            <option value={0}>0° (हॉरिज़ॉन्टल)</option>
                            <option value={270}>270° (वर्टिकल लेफ्ट एज)</option>
                            <option value={90}>90° (वर्टिकल राइट एज)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Watermark */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">वाटरमार्क (AI Watermark)</span>
                    <input
                      type="checkbox"
                      checked={watermarkConfig.enabled}
                      onChange={(e) => setWatermarkConfig({ ...watermarkConfig, enabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {watermarkConfig.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">लेबल</label>
                        <select
                          value={watermarkConfig.label}
                          onChange={(e) => setWatermarkConfig({ ...watermarkConfig, label: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="AI GENERATED">AI GENERATED</option>
                          <option value="प्रतीकात्मक फोटो">प्रतीकात्मक फोटो</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">रोटेशन</label>
                        <select
                          value={watermarkConfig.rotation ?? 0}
                          onChange={(e) => setWatermarkConfig({ ...watermarkConfig, rotation: parseInt(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value={0}>0°</option>
                          <option value={90}>90°</option>
                          <option value={270}>270°</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Story Callout & Ribbon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Story Callout */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">पूरी खबर डिस्क्रिप्शन कॉलआउट</span>
                    <input
                      type="checkbox"
                      checked={fullStoryCalloutConfig.enabled}
                      onChange={(e) => setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, enabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {fullStoryCalloutConfig.enabled && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">कॉलआउट टेक्स्ट</label>
                        <input
                          type="text"
                          value={fullStoryCalloutConfig.text}
                          onChange={(e) => setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, text: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">मैनुअल कॉलआउट अपलोड</label>
                          <input type="file" accept="image/*" onChange={handleManualCalloutUpload} className="text-[10px] text-slate-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ribbon */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">ब्रेकिंग न्यूज़ रिबन (Ribbon)</span>
                    <input
                      type="checkbox"
                      checked={ribbonConfig.enabled}
                      onChange={(e) => setRibbonConfig({ ...ribbonConfig, enabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
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
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                    स्थाई फुटर सेटिंग्स (Protected Channel Profile Footer)
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    सुरक्षित फुटर
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">बैकग्राउंड रंग</label>
                    <input
                      type="color"
                      value={footerConfig.footerBgColor || '#FFFFFF'}
                      onChange={(e) => setFooterConfig({ ...footerConfig, footerBgColor: e.target.value })}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">टेक्स्ट रंग</label>
                    <input
                      type="color"
                      value={footerConfig.footerTextColor || '#000000'}
                      onChange={(e) => setFooterConfig({ ...footerConfig, footerTextColor: e.target.value })}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: CANVAS MARKING & ELEMENT ADJUSTMENT */}
          {currentStage === 'canvas_marking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canvas Column */}
              <div className="lg:col-span-2 flex flex-col items-center">
                {/* Safe Zone Toggle Header */}
                <div className="flex items-center justify-between w-full max-w-[360px] mb-2">
                  <span className="text-xs font-bold text-slate-300">कैनवास मार्किंग</span>
                  <button
                    type="button"
                    onClick={() => setSafeZoneConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      safeZoneConfig.enabled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>सेफ ज़ोन {safeZoneConfig.enabled ? 'ON' : 'OFF'}</span>
                  </button>
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
                    backgroundColor: isStatementFrame ? statementBgColor : primaryBackgroundMode === 'solid' ? primaryBackgroundHex : '#0B1329',
                  }}
                >
                  {/* Primary Background Asset or Sample Image */}
                  {(primaryBackgroundAsset || sampleImage) && primaryBackgroundMode === 'image' && (
                    <img
                      src={primaryBackgroundAsset || sampleImage}
                      alt="Canvas"
                      className="w-full h-full object-cover pointer-events-none opacity-85 absolute inset-0"
                    />
                  )}

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

                {/* Active Layer Properties */}
                {activeLayer && (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <h5 className="font-bold text-white">चुनी हुई लेयर: {activeLayer.name}</h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>X: {Math.round(activeLayer.rect.x)}%</div>
                      <div>Y: {Math.round(activeLayer.rect.y)}%</div>
                      <div>W: {Math.round(activeLayer.rect.width)}%</div>
                      <div>H: {Math.round(activeLayer.rect.height)}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 5: PHOTO SLOTS & MULTI-PHOTO LAYOUT VARIANTS */}
          {currentStage === 'photo_slots_layout' && (
            <div className="space-y-6">
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

                {/* Test Headline Live Input */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    टेस्ट हेडलाइन (Live Editable Headline):
                  </label>
                  <input
                    type="text"
                    value={testHeadline}
                    onChange={(e) => setTestHeadline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                  />
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

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400">टेस्ट फोटो अपलोड:</span>
                    {photoSlots.map((slot, idx) => (
                      <label
                        key={slot.id}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer"
                      >
                        फोटो {idx + 1}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleTestPhotoUpload(idx, e)}
                          className="hidden"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dual Previews Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preview A: Sample Reference */}
                <div className="flex flex-col items-center p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>सैंपल ग्राफिक (Preview A - Original Reference)</span>
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
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        सैंपल ग्राफिक उपलब्ध नहीं
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview B: Actual Render with Primary Background */}
                <div className="flex flex-col items-center p-4 bg-slate-950/50 border border-amber-500/40 rounded-2xl space-y-2 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>वास्तविक फ्रेम प्रीव्यू (Preview B - With Primary Background)</span>
                  </div>

                  <div
                    className="relative border-4 border-amber-500/60 rounded-xl overflow-hidden shadow-2xl"
                    style={{
                      width: selectedRatio === '4:5' ? '280px' : '230px',
                      height: selectedRatio === '4:5' ? '350px' : '408px',
                      backgroundColor: isStatementFrame ? statementBgColor : primaryBackgroundMode === 'solid' ? primaryBackgroundHex : '#0B1329',
                    }}
                  >
                    {/* Primary Background Image */}
                    {(primaryBackgroundAsset || sampleImage) && primaryBackgroundMode === 'image' && (
                      <img
                        src={primaryBackgroundAsset || sampleImage}
                        alt="Primary Background"
                        className="w-full h-full object-cover pointer-events-none opacity-90"
                      />
                    )}

                    {/* Photo Slots with uploaded test photos */}
                    {photoSlots.map((slot, idx) => {
                      const testSrc = testPhotos[idx] || sampleImage;
                      return (
                        <div
                          key={slot.id}
                          className="absolute overflow-hidden"
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
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[9px] text-slate-400">
                              फोटो {idx + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Logo */}
                    {headerConfig.showLogo && (
                      <div
                        className="absolute bg-slate-900/90 border border-white/20 rounded px-1.5 py-0.5 text-[8px] font-bold text-white z-10"
                        style={{
                          left: `${headerConfig.logoRect?.x ?? 5}%`,
                          top: `${headerConfig.logoRect?.y ?? 3.5}%`,
                        }}
                      >
                        {currentUser?.channelName || 'न्यूज़ लोगो'}
                      </div>
                    )}

                    {/* Location Badge */}
                    {headerConfig.showLocation && (
                      <div
                        className="absolute bg-red-600 rounded-full px-2 py-0.5 text-[8px] font-bold text-white z-10"
                        style={{
                          left: `${headerConfig.locationRect?.x ?? 5}%`,
                          top: `${headerConfig.locationRect?.y ?? 13.5}%`,
                        }}
                      >
                        📍 भोपाल
                      </div>
                    )}

                    {/* Date Stamp */}
                    {headerConfig.showDate && (
                      <div
                        className="absolute text-[8px] font-bold text-slate-300 z-10"
                        style={{
                          left: `${headerConfig.dateRect?.x ?? 2}%`,
                          top: `${headerConfig.dateRect?.y ?? 35}%`,
                          transform: `rotate(${headerConfig.dateRotation || 0}deg)`,
                        }}
                      >
                        5 नवंबर 2026
                      </div>
                    )}

                    {/* Ribbon */}
                    {ribbonConfig.enabled && ribbonConfig.customRibbonUrl && (
                      <div
                        className="absolute z-20"
                        style={{
                          left: `${ribbonConfig.rect?.x ?? 15}%`,
                          top: `${ribbonConfig.rect?.y ?? 60}%`,
                          width: `${ribbonConfig.rect?.width ?? 70}%`,
                        }}
                      >
                        <img src={ribbonConfig.customRibbonUrl} alt="Ribbon" className="w-full h-auto" />
                      </div>
                    )}

                    {/* Headline */}
                    <div
                      className="absolute text-center px-2 z-15"
                      style={{
                        bottom: `${footerConfig.footerHeightRatio * 100 + 2}%`,
                        left: '4%',
                        right: '4%',
                      }}
                    >
                      <div
                        className="font-bold text-white text-[10px] leading-snug drop-shadow-md px-1.5 py-1 rounded"
                        style={{ backgroundColor: textSlots[0]?.backgroundColor || '#B91C1C' }}
                      >
                        {testHeadline}
                      </div>
                    </div>

                    {/* Optional POWERED BY Element */}
                    {poweredByConfig.enabled && (
                      <div
                        className="absolute text-[7px] font-bold px-1.5 py-0.5 rounded shadow-sm z-25 truncate max-w-[90%]"
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

                    {/* Protected Footer */}
                    <div
                      className="absolute bottom-0 bg-white border-t flex items-center justify-between px-2 text-[7px] font-bold text-black z-30"
                      style={{
                        height: `${footerConfig.footerHeightRatio * 100}%`,
                        width: `${footerConfig.footerWidthPct || 100}%`,
                        left: `${(100 - (footerConfig.footerWidthPct || 100)) / 2}%`,
                      }}
                    >
                      <span>@{currentUser?.username || 'breakingnewswala'}</span>
                      <span>{currentUser?.phone ? `📱 ${currentUser.phone}` : 'सत्यापित डिजिटल समाचार नेटवर्क'}</span>
                    </div>
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
