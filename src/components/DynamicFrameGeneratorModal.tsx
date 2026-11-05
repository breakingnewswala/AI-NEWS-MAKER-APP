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
} from '../types/dynamicFrame';
import {
  saveDynamicFrameToApi,
  requestAiFrameAnalysis,
  AiFrameAnalysisResult,
} from '../lib/dynamicFramesManager';
import { BUILTIN_RIBBONS } from '../lib/ribbonPresets';
import { STATEMENT_BACKGROUND_PRESETS } from '../lib/statementBackgroundPresets';
import { getAuthToken } from '../lib/apiConfig';

interface DynamicFrameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFramePublished?: (frame: DynamicFrameTemplate) => void;
  initialFrame?: DynamicFrameTemplate | null;
  currentUser?: any;
}

type WizardStage =
  | 'upload_aspect'
  | 'ai_analysis'
  | 'element_marking'
  | 'photo_slots'
  | 'text_config'
  | 'ribbon_footer'
  | 'live_preview'
  | 'metadata_publish';

export const DynamicFrameGeneratorModal: React.FC<DynamicFrameGeneratorModalProps> = ({
  isOpen,
  onClose,
  onFramePublished,
  initialFrame,
  currentUser,
}) => {
  // Wizard Stage
  const [currentStage, setCurrentStage] = useState<WizardStage>('upload_aspect');

  // Stage 1: Sample Upload & Aspect Ratio (Strictly 4:5 or 9:16)
  const [sampleImage, setSampleImage] = useState<string>(initialFrame?.sampleReferenceUrl || '');
  const [selectedRatio, setSelectedRatio] = useState<DynamicAspectRatio>(initialFrame?.aspectRatio || '4:5');
  const [sampleFileName, setSampleFileName] = useState<string>('');

  // Stage 2: AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AiFrameAnalysisResult | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');

  // Stage 3: Interactive Canvas Marking State
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

  // Stage 4: Dynamic Photo Slots Configuration (1 - 4 slots supported)
  const [photoSlots, setPhotoSlots] = useState<PhotoSlotConfig[]>(
    initialFrame?.photoSlots && initialFrame.photoSlots.length > 0
      ? initialFrame.photoSlots
      : [
          {
            id: 'slot_photo_1',
            name: 'मुख्य समाचार फोटो (Main Photo)',
            slotType: 'normal',
            rect: { x: 0, y: 0, width: 100, height: 61.33 },
            required: true,
            cropMode: 'cover',
            bgRemoval: false,
          },
        ]
  );

  // Stage 5: Text Elements Configuration & Devanagari Headline
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

  // Statement / Bayaanbaazi settings (Part 8 & 9)
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

  // Stage 6: Independent Header Elements (Logo & Location Separated)
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

      showDate: false,
      dateRect: { x: 2, y: 35, width: 4, height: 26 },
      dateFormat: 'hi_full',
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
      dateOpacity: 0.9,
      dateRotation: 270, // Vertical rotated date stamp
      dateAlign: 'center',
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
    }
  );

  // Optional POWERED BY Element (Strictly separated from permanent footer, default disabled)
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

  // Safe Zone System (Part 4)
  const [safeZoneConfig, setSafeZoneConfig] = useState<SafeZoneConfig>(
    initialFrame?.safeZoneConfig || {
      enabled: true, // Enabled by default for guidance
      topMarginPct: selectedRatio === '4:5' ? 4 : 5,
      bottomMarginPct: selectedRatio === '4:5' ? 8 : 6.5,
      leftMarginPct: 4,
      rightMarginPct: 4,
      headerSafeAreaPct: 12,
      footerSafeAreaPct: selectedRatio === '4:5' ? 8 : 6.5,
    }
  );

  // Permanent Protected Footer with Adjustable Width (Part 6)
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

  // Ribbon (Part 10)
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

  // Comprehensive Layers State (Part 1 & 11)
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
    // Update footer layer rect
    setLayers((prev) =>
      prev.map((l) =>
        l.type === 'footer'
          ? { ...l, rect: { ...l.rect, y: 100 - fRatio * 100, height: fRatio * 100 } }
          : l
      )
    );
  }, [selectedRatio]);

  // Synchronize dynamic elements into layers array whenever optional elements toggle (Part 11)
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
        zIndex: 0,
      });
    }

    // Photo slot layers
    photoSlots.forEach((slot, idx) => {
      newLayers.push({
        id: slot.id,
        name: slot.name || `फोटो स्लॉट ${idx + 1}`,
        type: 'photo',
        rect: slot.rect,
        visible: true,
        locked: false,
        zIndex: idx + 1,
      });
    });

    // Ribbon layer (if enabled)
    if (ribbonConfig.enabled) {
      newLayers.push({
        id: 'layer_ribbon',
        name: '3D ब्रेकिंग रिबन',
        type: 'ribbon',
        rect: ribbonConfig.rect || { x: 15, y: 60, width: 70, height: 8 },
        visible: true,
        locked: false,
        zIndex: 6,
      });
    }

    // Text slots
    textSlots.forEach((ts, idx) => {
      newLayers.push({
        id: ts.id,
        name: ts.name,
        type: 'text',
        rect: ts.rect,
        visible: true,
        locked: false,
        zIndex: 10 + idx,
      });
    });

    // Logo layer
    if (headerConfig.showLogo) {
      newLayers.push({
        id: 'layer_logo',
        name: 'चैनल लोगो (Logo)',
        type: 'logo',
        rect: headerConfig.logoRect,
        visible: true,
        locked: false,
        zIndex: 20,
      });
    }

    // Location badge layer
    if (headerConfig.showLocation) {
      newLayers.push({
        id: 'layer_location',
        name: 'लोकेशन बैज (Location)',
        type: 'location',
        rect: headerConfig.locationRect,
        visible: true,
        locked: false,
        zIndex: 21,
      });
    }

    // Date stamp layer
    if (headerConfig.showDate) {
      newLayers.push({
        id: 'layer_date',
        name: 'डेट स्टैम्प (Date)',
        type: 'date',
        rect: headerConfig.dateRect || { x: 2, y: 35, width: 4, height: 26 },
        visible: true,
        locked: false,
        zIndex: 22,
      });
    }

    // Watermark layer
    if (watermarkConfig.enabled) {
      newLayers.push({
        id: 'layer_watermark',
        name: `वॉटरमार्क (${watermarkConfig.label})`,
        type: 'watermark',
        rect: watermarkConfig.rect,
        visible: true,
        locked: false,
        zIndex: 23,
      });
    }

    // Full story callout layer
    if (fullStoryCalloutConfig.enabled) {
      newLayers.push({
        id: 'layer_callout',
        name: 'डिस्क्रिप्शन कॉलआउट',
        type: 'callout',
        rect: fullStoryCalloutConfig.rect,
        visible: true,
        locked: false,
        zIndex: 24,
      });
    }

    // Optional POWERED BY Graphic Element Layer (Strictly independent from footer)
    if (poweredByConfig.enabled) {
      newLayers.push({
        id: 'layer_powered_by',
        name: 'POWERED BY बैज (Optional)',
        type: 'powered_by',
        rect: poweredByConfig.rect,
        visible: true,
        locked: false,
        zIndex: 25,
      });
    }

    // Permanent Protected Footer
    const footerHeight = footerConfig.footerHeightRatio * 100;
    const footerW = footerConfig.footerWidthPct || 100;
    const footerX =
      footerConfig.footerAlignment === 'center'
        ? (100 - footerW) / 2
        : footerConfig.footerAlignment === 'right'
        ? 100 - footerW
        : 0;

    newLayers.push({
      id: 'layer_footer',
      name: 'स्थाई फुटर (Protected AI News Maker)',
      type: 'footer',
      rect: { x: footerX, y: 100 - footerHeight, width: footerW, height: footerHeight },
      visible: true,
      locked: true,
      zIndex: 30,
    });

    setLayers(newLayers);
  };

  // Sync elements when toggles change
  useEffect(() => {
    syncElementsToLayers();
  }, [
    headerConfig.showLogo,
    headerConfig.showLocation,
    headerConfig.showDate,
    watermarkConfig.enabled,
    watermarkConfig.label,
    fullStoryCalloutConfig.enabled,
    poweredByConfig.enabled,
    ribbonConfig.enabled,
    photoSlots.length,
    textSlots.length,
    isStatementFrame,
    footerConfig.footerWidthPct,
    footerConfig.footerAlignment,
  ]);

  if (!isOpen) return null;

  // Handle sample file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSampleFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSampleImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!sampleImage) {
      alert('कृपया पहले एक सैंपल ग्राफ़िक इमेज अपलोड करें।');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisStatusText('Gemini AI डिज़ाइन एनालिसिस शुरू हो रहा है...');
    try {
      const token = getAuthToken();
      const res = await requestAiFrameAnalysis(sampleImage, selectedRatio, token);
      if (res.success && res.result) {
        setAnalysisResult(res.result);
        setAnalysisStatusText('✅ AI एनालिसिस सफल! लेआउट कंपोनेंट्स डिटेक्ट हो गए हैं।');

        const r = res.result;
        setHeaderConfig((prev) => ({
          ...prev,
          showLogo: true,
          logoRect: r.logoRect,
          showLocation: true,
          locationRect: r.locationRect,
        }));

        if (r.statementDetected) {
          setIsStatementFrame(true);
          setDesignCategory('बयानबाजी');
        }

        if (r.ribbonDetected && r.ribbonRect) {
          setRibbonConfig((prev) => ({
            ...prev,
            enabled: true,
            rect: r.ribbonRect,
          }));
        }

        if (r.recommendedPhotoSlots && r.recommendedPhotoSlots.length > 0) {
          setPhotoSlots(
            r.recommendedPhotoSlots.map((slot, idx) => ({
              id: `slot_photo_${idx + 1}`,
              name: slot.name,
              slotType: slot.slotType as PhotoSlotType,
              rect: slot.rect,
              required: idx === 0,
              bgRemoval: slot.slotType === 'cutout',
              cropMode: 'cover',
            }))
          );
        }
      } else {
        setAnalysisStatusText('⚠️ AI रिस्पॉन्स में त्रुटि, मानक ज्यामितीय ग्रिड लागू किया गया।');
      }
    } catch (e: any) {
      setAnalysisStatusText(`⚠️ AI एनालिसिस चेतावनी: ${e.message || 'कैलकुलेटेड लेआउट लागू हुआ'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Synchronize layer coordinate changes back into corresponding configuration object
  const syncLayerRectToConfig = (type: FrameLayerType, id: string, rect: NormalizedRect) => {
    if (type === 'logo' || id === 'layer_logo') {
      setHeaderConfig((prev) => ({ ...prev, logoRect: rect }));
    } else if (type === 'location' || id === 'layer_location') {
      setHeaderConfig((prev) => ({ ...prev, locationRect: rect }));
    } else if (type === 'date' || id === 'layer_date') {
      setHeaderConfig((prev) => ({ ...prev, dateRect: rect }));
    } else if (type === 'watermark' || id === 'layer_watermark') {
      setWatermarkConfig((prev) => ({ ...prev, rect }));
    } else if (type === 'callout' || id === 'layer_callout') {
      setFullStoryCalloutConfig((prev) => ({ ...prev, rect }));
    } else if (type === 'powered_by' || id === 'layer_powered_by') {
      setPoweredByConfig((prev) => ({ ...prev, rect }));
    } else if (type === 'ribbon' || id === 'layer_ribbon') {
      setRibbonConfig((prev) => ({ ...prev, rect }));
    } else if (type === 'photo') {
      setPhotoSlots((prev) => prev.map((s) => (s.id === id ? { ...s, rect } : s)));
    } else if (type === 'text') {
      setTextSlots((prev) => prev.map((t) => (t.id === id ? { ...t, rect } : t)));
    } else if (type === 'footer' || id === 'layer_footer') {
      setFooterConfig((prev) => ({ ...prev, footerWidthPct: rect.width }));
    }
  };

  // Canvas Mouse & Touch Interaction Engine (Select, Drag, Move & Resize)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const curX = Math.max(0, Math.min(100, ((e.clientX - canvasRect.left) / canvasRect.width) * 100));
    const curY = Math.max(0, Math.min(100, ((e.clientY - canvasRect.top) / canvasRect.height) * 100));

    // Draw Rect Tool
    if (activeTool === 'draw_rect') {
      const footerBoundary = 100 - footerConfig.footerHeightRatio * 100;
      if (curY > footerBoundary) {
        alert('स्थाई फुटर (Bottom Footer) क्षेत्र संरक्षित है। इसके ऊपर कोई नया तत्व नहीं बनाया जा सकता।');
        return;
      }
      setIsDrawing(true);
      setDragStart({ x: curX, y: curY });
      setCurrentDrawRect({ x: curX, y: curY, width: 0, height: 0 });
    }
  };

  const handleLayerPointerDown = (e: React.PointerEvent, layer: FrameLayer) => {
    if (activeTool !== 'select' || !canvasRef.current || layer.locked) {
      if (layer.locked && layer.type === 'footer') {
        setSelectedLayerId(layer.id);
        setActiveSidebarTab('properties');
      }
      return;
    }
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedLayerId(layer.id);
    setActiveSidebarTab('properties');

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const curX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    const curY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    setIsDraggingElement(true);
    setDragHandle('move');
    setDragStartPos({ x: curX, y: curY });
    setInitialLayerRect({ ...layer.rect });
  };

  const handleResizeHandlePointerDown = (
    e: React.PointerEvent,
    handle: 'nw' | 'ne' | 'se' | 'sw',
    layer: FrameLayer
  ) => {
    e.stopPropagation();
    if (!canvasRef.current || layer.locked) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedLayerId(layer.id);
    setActiveSidebarTab('properties');

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const curX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    const curY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    setIsDraggingElement(true);
    setDragHandle(handle);
    setDragStartPos({ x: curX, y: curY });
    setInitialLayerRect({ ...layer.rect });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const curX = Math.max(0, Math.min(100, ((e.clientX - canvasRect.left) / canvasRect.width) * 100));
    const curY = Math.max(0, Math.min(100, ((e.clientY - canvasRect.top) / canvasRect.height) * 100));

    // Handle new box drawing
    if (activeTool === 'draw_rect' && isDrawing && dragStart) {
      const footerBoundary = 100 - footerConfig.footerHeightRatio * 100;
      const clampedY = Math.min(footerBoundary, curY);
      const x = Math.min(dragStart.x, curX);
      const y = Math.min(dragStart.y, clampedY);
      const width = Math.abs(curX - dragStart.x);
      const height = Math.abs(clampedY - dragStart.y);
      setCurrentDrawRect({ x, y, width, height });
      return;
    }

    // Handle layer move / resize
    if (isDraggingElement && dragHandle && dragStartPos && initialLayerRect && selectedLayerId) {
      const selectedLayer = layers.find((l) => l.id === selectedLayerId);
      if (!selectedLayer) return;

      const dx = curX - dragStartPos.x;
      const dy = curY - dragStartPos.y;
      const footerHeightPct = footerConfig.footerHeightRatio * 100;
      const maxY = 100 - footerHeightPct;

      let updatedRect = { ...initialLayerRect };

      if (dragHandle === 'move') {
        if (selectedLayer.type === 'footer') {
          // Footer cannot move vertically away from bottom anchor!
          const newX = Math.max(0, Math.min(100 - initialLayerRect.width, initialLayerRect.x + dx));
          updatedRect = { ...initialLayerRect, x: newX, y: 100 - footerHeightPct };
        } else {
          const newX = Math.max(0, Math.min(100 - initialLayerRect.width, initialLayerRect.x + dx));
          const newY = Math.max(0, Math.min(maxY - initialLayerRect.height, initialLayerRect.y + dy));
          updatedRect = { ...initialLayerRect, x: newX, y: newY };
        }
      } else if (dragHandle === 'se') {
        const maxW = 100 - initialLayerRect.x;
        const maxH = maxY - initialLayerRect.y;
        const newW = Math.max(4, Math.min(maxW, initialLayerRect.width + dx));
        const newH = Math.max(2, Math.min(maxH, initialLayerRect.height + dy));
        updatedRect = { ...initialLayerRect, width: newW, height: newH };
      } else if (dragHandle === 'sw') {
        const minX = 0;
        const maxX = initialLayerRect.x + initialLayerRect.width - 4;
        const newX = Math.max(minX, Math.min(maxX, initialLayerRect.x + dx));
        const newW = initialLayerRect.width - (newX - initialLayerRect.x);
        const maxH = maxY - initialLayerRect.y;
        const newH = Math.max(2, Math.min(maxH, initialLayerRect.height + dy));
        updatedRect = { ...initialLayerRect, x: newX, width: newW, height: newH };
      } else if (dragHandle === 'ne') {
        const minY = 0;
        const maxYPos = initialLayerRect.y + initialLayerRect.height - 2;
        const newY = Math.max(minY, Math.min(maxYPos, initialLayerRect.y + dy));
        const newH = initialLayerRect.height - (newY - initialLayerRect.y);
        const maxW = 100 - initialLayerRect.x;
        const newW = Math.max(4, Math.min(maxW, initialLayerRect.width + dx));
        updatedRect = { ...initialLayerRect, y: newY, width: newW, height: newH };
      } else if (dragHandle === 'nw') {
        const minX = 0;
        const maxX = initialLayerRect.x + initialLayerRect.width - 4;
        const newX = Math.max(minX, Math.min(maxX, initialLayerRect.x + dx));
        const newW = initialLayerRect.width - (newX - initialLayerRect.x);

        const minY = 0;
        const maxYPos = initialLayerRect.y + initialLayerRect.height - 2;
        const newY = Math.max(minY, Math.min(maxYPos, initialLayerRect.y + dy));
        const newH = initialLayerRect.height - (newY - initialLayerRect.y);
        updatedRect = { ...initialLayerRect, x: newX, y: newY, width: newW, height: newH };
      }

      setLayers((prev) => prev.map((l) => (l.id === selectedLayerId ? { ...l, rect: updatedRect } : l)));
      syncLayerRectToConfig(selectedLayer.type, selectedLayer.id, updatedRect);
    }
  };

  const handleCanvasPointerUp = () => {
    if (isDrawing && currentDrawRect && currentDrawRect.width > 3 && currentDrawRect.height > 3) {
      const newId = `layer_custom_${Date.now()}`;
      const newLayer: FrameLayer = {
        id: newId,
        name: `कस्टम तत्व (${drawingElementType})`,
        type: drawingElementType,
        rect: currentDrawRect,
        visible: true,
        locked: false,
        zIndex: layers.length + 1,
      };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newId);

      if (drawingElementType === 'photo') {
        const slotId = `slot_photo_${photoSlots.length + 1}`;
        setPhotoSlots([
          ...photoSlots,
          {
            id: slotId,
            name: `फोटो स्लॉट ${photoSlots.length + 1}`,
            slotType: 'normal',
            rect: currentDrawRect,
            required: false,
            cropMode: 'cover',
          },
        ]);
      }
    }

    setIsDrawing(false);
    setCurrentDrawRect(null);
    setDragStart(null);
    setIsDraggingElement(false);
    setDragHandle(null);
    setDragStartPos(null);
    setInitialLayerRect(null);
  };

  // Safe Zone Validation Warnings Calculation (Part 4)
  const safeZoneWarnings = useMemo(() => {
    if (!safeZoneConfig.enabled) return [];
    const warnings: string[] = [];
    const minX = safeZoneConfig.leftMarginPct;
    const maxX = 100 - safeZoneConfig.rightMarginPct;
    const minY = safeZoneConfig.topMarginPct;
    const maxY = 100 - safeZoneConfig.bottomMarginPct;

    const headlineSlot = textSlots.find((t) => t.role === 'headline');
    if (headlineSlot) {
      if (headlineSlot.rect.x < minX || headlineSlot.rect.x + headlineSlot.rect.width > maxX) {
        warnings.push('हेडलाइन हॉरिजॉन्टल सेफ ज़ोन से बाहर जा रही है');
      }
      if (headlineSlot.rect.y < minY || headlineSlot.rect.y + headlineSlot.rect.height > maxY) {
        warnings.push('हेडलाइन वर्टिकल सेफ ज़ोन सीमा लांघ रही है');
      }
    }
    if (headerConfig.showLogo) {
      if (headerConfig.logoRect.x < minX || headerConfig.logoRect.x + headerConfig.logoRect.width > maxX) {
        warnings.push('चैनल लोगो सेफ मार्जिन से बाहर जा रहा है');
      }
    }
    if (headerConfig.showLocation) {
      if (
        headerConfig.locationRect.x < minX ||
        headerConfig.locationRect.x + headerConfig.locationRect.width > maxX
      ) {
        warnings.push('लोकेशन बैज सेफ मार्जिन से बाहर जा रहा है');
      }
    }
    return warnings;
  }, [safeZoneConfig, textSlots, headerConfig]);

  // Statement Photo Left / Right Auto-Reflow (Part 9)
  const handleCutoutPositionChange = (pos: 'left' | 'right') => {
    setStatementCutoutPos(pos);
    if (pos === 'left') {
      // Move cutout to left, statement text to right
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
      // Move cutout to right, statement text to left
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
            ? { ...t, rect: { x: 6, y: 16, width: 50, height: 46 }, alignment: 'left' }
            : t.role === 'speaker_name'
            ? { ...t, rect: { x: 6, y: 68, width: 44, height: 7 }, alignment: 'left' }
            : t.role === 'speaker_designation'
            ? { ...t, rect: { x: 6, y: 76, width: 44, height: 6 }, alignment: 'left' }
            : t
        )
      );
    }
  };

  // Plan multi-select toggle
  const handleTogglePlan = (plan: DynamicPlanTier) => {
    if (allowedPlans.includes(plan)) {
      if (allowedPlans.length === 1) {
        alert('कम से कम एक सब्सक्रिप्शन प्लान चुनना अनिवार्य है।');
        return;
      }
      setAllowedPlans(allowedPlans.filter((p) => p !== plan));
    } else {
      setAllowedPlans([...allowedPlans, plan]);
    }
  };

  // Final Save & Publish
  const handleSaveAndPublish = async () => {
    if (!frameName.trim()) {
      alert('कृपया फ्रेम का नाम दर्ज करें।');
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const templateData: Partial<DynamicFrameTemplate> = {
      id: initialFrame?.id,
      name: frameName.trim(),
      description: frameDescription.trim(),
      aspectRatio: selectedRatio,
      canvasWidth: 1080,
      canvasHeight: selectedRatio === '4:5' ? 1350 : 1920,
      sampleReferenceUrl: sampleImage,
      previewImageUrl: sampleImage,
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

  // Selected layer reference for property inspector
  const activeLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];

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
                <h3 className="font-black text-sm text-white">AI डायनामिक फ्रेम जनरेटर (Frame Generator Pro)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  Master Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                कैनवास मार्किंग, स्वतंत्र लोगो/लोकेशन, मल्टी-फोटो स्लॉट्स व सेफ ज़ोन कंट्रोल।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 8-Step Wizard Navigation */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 font-bold">
          {[
            { id: 'upload_aspect', label: '1. सैंपल व रेशियो' },
            { id: 'ai_analysis', label: '2. AI एनालिसिस' },
            { id: 'element_marking', label: '3. कैनवास मार्किंग' },
            { id: 'photo_slots', label: '4. फोटो स्लॉट्स' },
            { id: 'text_config', label: '5. टेक्स्ट व कोट' },
            { id: 'ribbon_footer', label: '6. रिबन व फुटर' },
            { id: 'live_preview', label: '7. लाइव प्रीव्यू' },
            { id: 'metadata_publish', label: '8. प्लान व पब्लिश' },
          ].map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStage(step.id as WizardStage)}
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
          {/* STAGE 1: SAMPLE UPLOAD & ASPECT RATIO */}
          {currentStage === 'upload_aspect' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    कैनवास आस्पेक्ट रेशियो चुनें (Strict Aspect Ratio)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    केवल दो कैनवास समर्थित हैं। 1:1 स्क्वायर फॉर्मेट फ्रेम जनरेटर में पूर्णतः प्रतिबंधित है।
                  </p>

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
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    सैंपल ग्राफिक अपलोड (Reference Jacket / Graphic)
                  </h4>
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 text-center cursor-pointer relative bg-slate-900/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-white block">सैंपल फोटो यहाँ ड्रैग करें या क्लिक करें</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">PNG, JPG समर्थित (उच्च गुणवत्ता)</span>
                  </div>
                  {sampleFileName && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {sampleFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Preview Column */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 border border-slate-800 rounded-xl min-h-[300px]">
                {sampleImage ? (
                  <div className="space-y-2 text-center">
                    <div
                      className="relative border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl mx-auto"
                      style={{
                        width: selectedRatio === '4:5' ? '240px' : '200px',
                        height: selectedRatio === '4:5' ? '300px' : '355px',
                      }}
                    >
                      <img src={sampleImage} alt="Sample Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-slate-400">सैंपल रिफरेंस सक्रिय</span>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-xs">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    कोई सैंपल अपलोड नहीं हुआ।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: AI ANALYSIS */}
          {currentStage === 'ai_analysis' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      AI विज़न लेआउट एनालिसिस (Multimodal Detection)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gemini विज़न तकनीक से लोगो, लोकेशन, फोटो स्लॉट, हेडलाइन और फुटर सीमाओं को स्वतः पहचानें।
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isAnalyzing || !sampleImage}
                    onClick={handleRunAiAnalysis}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{isAnalyzing ? 'एनालिसिस चल रहा है...' : 'Analyze Sample Frame'}</span>
                  </button>
                </div>

                {analysisStatusText && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200">
                    {analysisStatusText}
                  </div>
                )}
              </div>

              {analysisResult && (
                <div className="p-4 bg-slate-950/70 border border-emerald-500/40 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    डिटेक्ट किए गए डिज़ाइन कंपोनेंट्स
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">चैनल लोगो:</span>
                      <span className="font-bold text-white">
                        {analysisResult.logoRect.width}% × {analysisResult.logoRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">लोकेशन बैज:</span>
                      <span className="font-bold text-white">
                        {analysisResult.locationRect.width}% × {analysisResult.locationRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">हेडलाइन ज़ोन:</span>
                      <span className="font-bold text-white">
                        {analysisResult.headlineRect.width}% × {analysisResult.headlineRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">स्थाई फुटर सुरक्षा:</span>
                      <span className="font-bold text-emerald-400">संरक्षित (8% Bottom)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: INTERACTIVE CANVAS MARKING (PARTS 1, 2, 3, 4, 5, 6, 10, 11) */}
          {currentStage === 'element_marking' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Canvas Area (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                {/* Tools & Safe Zone Bar */}
                <div className="w-full flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-xl mb-3 text-xs font-bold gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTool('select')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTool === 'select'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>सेलेक्ट / मूव</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('draw_rect')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTool === 'draw_rect'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>नया बॉक्स बनाएं</span>
                    </button>
                  </div>

                  {/* Safe Zone Toggle (Part 4) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSafeZoneConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
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
                </div>

                {/* Safe Zone Warnings Banner */}
                {safeZoneConfig.enabled && safeZoneWarnings.length > 0 && (
                  <div className="w-full mb-2 p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg flex items-center gap-2 text-[11px] text-amber-200">
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
                    width: selectedRatio === '4:5' ? '360px' : '290px',
                    height: selectedRatio === '4:5' ? '450px' : '515px',
                    backgroundColor: isStatementFrame ? statementBgColor : '#0B1329',
                  }}
                >
                  {/* Sample Reference Image */}
                  {sampleImage && (
                    <img
                      src={sampleImage}
                      alt="Sample Reference"
                      className="w-full h-full object-cover opacity-50 pointer-events-none absolute inset-0"
                    />
                  )}

                  {/* Safe Zone Visual Overlay (Part 4) */}
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

                  {/* Interactive Layers Rendering */}
                  {layers.map((layer) => {
                    const isSelected = selectedLayerId === layer.id;
                    const isFooter = layer.type === 'footer';

                    return (
                      <div
                        key={layer.id}
                        onPointerDown={(e) => handleLayerPointerDown(e, layer)}
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
                        {/* Layer Header Label */}
                        <div className="flex items-center justify-between pointer-events-none gap-1">
                          <span className="text-[8px] font-black text-white bg-slate-950/90 px-1 py-0.5 rounded truncate max-w-full">
                            {layer.name}
                          </span>
                          {isSelected && !isFooter && (
                            <span className="text-[7px] font-mono text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded">
                              {layer.rect.width.toFixed(0)}×{layer.rect.height.toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Footer Special Label */}
                        {isFooter && (
                          <span className="text-[8px] font-bold text-emerald-300 text-center pointer-events-none">
                            🔒 सुरक्षित AI News Maker फुटर ({layer.rect.width.toFixed(0)}%)
                          </span>
                        )}

                        {/* Resize Handles (Active for Selected Layer) */}
                        {isSelected && !isFooter && (
                          <>
                            <div
                              onPointerDown={(e) => handleResizeHandlePointerDown(e, 'nw', layer)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -top-1 -left-1 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleResizeHandlePointerDown(e, 'ne', layer)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -top-1 -right-1 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleResizeHandlePointerDown(e, 'sw', layer)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -bottom-1 -left-1 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                            />
                            <div
                              onPointerDown={(e) => handleResizeHandlePointerDown(e, 'se', layer)}
                              className="w-2.5 h-2.5 bg-white border-2 border-amber-500 absolute -bottom-1 -right-1 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Realtime Drawing Rect */}
                  {isDrawing && currentDrawRect && (
                    <div
                      className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 pointer-events-none"
                      style={{
                        left: `${currentDrawRect.x}%`,
                        top: `${currentDrawRect.y}%`,
                        width: `${currentDrawRect.width}%`,
                        height: `${currentDrawRect.height}%`,
                      }}
                    />
                  )}

                  {/* Permanent Footer Bottom Barrier Line */}
                  <div
                    className="absolute left-0 right-0 bottom-0 bg-emerald-950/40 border-t-2 border-emerald-500/80 flex items-center justify-center text-[9px] font-black text-emerald-300 pointer-events-none z-25"
                    style={{ height: `${footerConfig.footerHeightRatio * 100}%` }}
                  >
                    🔒 स्थाई फुटर क्षेत्र ({selectedRatio === '4:5' ? '8.0%' : '6.5%'})
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 text-center">
                  💡 किसी भी तत्व पर क्लिक करके ड्रैग करें, या कोनों के हैंडल्स से आकार बदलें।
                </div>
              </div>

              {/* Right Sidebar: Layers & Properties (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                {/* Tabs */}
                <div className="flex items-center border-b border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveSidebarTab('layers')}
                    className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                      activeSidebarTab === 'layers'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    लेयर्स सूची ({layers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSidebarTab('properties')}
                    className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                      activeSidebarTab === 'properties'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    तत्व सेटिंग्स (Properties)
                  </button>
                </div>

                {/* Tab 1: Layers Panel */}
                {activeSidebarTab === 'layers' && (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 max-h-[460px] overflow-y-auto">
                    {layers.map((layer) => {
                      const isSelected = selectedLayerId === layer.id;
                      const isFooter = layer.type === 'footer';

                      return (
                        <div
                          key={layer.id}
                          onClick={() => {
                            setSelectedLayerId(layer.id);
                            setActiveSidebarTab('properties');
                          }}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] text-slate-500 font-mono">#{layer.zIndex}</span>
                            <span className="font-bold truncate">{layer.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isFooter ? (
                              <Lock className="w-3.5 h-3.5 text-emerald-400" title="संरक्षित फुटर" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLayers(layers.filter((l) => l.id !== layer.id));
                                }}
                                className="p-1 text-slate-500 hover:text-red-400 rounded"
                                title="हटाएँ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Properties Inspector */}
                {activeSidebarTab === 'properties' && activeLayer && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-black text-amber-400">{activeLayer.name}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {activeLayer.type}
                      </span>
                    </div>

                    {/* Numeric Position & Dimensions Inputs */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        कैनवास पोजीशन व आकार (Normalized %)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Left X (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={activeLayer.rect.x.toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...activeLayer.rect, x: val };
                              setLayers(layers.map((l) => (l.id === activeLayer.id ? { ...l, rect: updated } : l)));
                              syncLayerRectToConfig(activeLayer.type, activeLayer.id, updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Top Y (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            disabled={activeLayer.type === 'footer'}
                            value={activeLayer.rect.y.toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...activeLayer.rect, y: val };
                              setLayers(layers.map((l) => (l.id === activeLayer.id ? { ...l, rect: updated } : l)));
                              syncLayerRectToConfig(activeLayer.type, activeLayer.id, updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Width (%)</span>
                          <input
                            type="number"
                            min={4}
                            max={100}
                            step={0.5}
                            value={activeLayer.rect.width.toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 10;
                              const updated = { ...activeLayer.rect, width: val };
                              setLayers(layers.map((l) => (l.id === activeLayer.id ? { ...l, rect: updated } : l)));
                              syncLayerRectToConfig(activeLayer.type, activeLayer.id, updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Height (%)</span>
                          <input
                            type="number"
                            min={2}
                            max={100}
                            step={0.5}
                            value={activeLayer.rect.height.toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 5;
                              const updated = { ...activeLayer.rect, height: val };
                              setLayers(layers.map((l) => (l.id === activeLayer.id ? { ...l, rect: updated } : l)));
                              syncLayerRectToConfig(activeLayer.type, activeLayer.id, updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Channel Logo Specific Inner Scaling (Part 2) */}
                    {activeLayer.type === 'logo' && (
                      <div className="space-y-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="font-bold text-[11px] text-amber-300 block">
                          लोगो इनर स्केलिंग व पैडिंग (Inner Logo Fit)
                        </span>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>इनर स्केल:</span>
                            <span>{headerConfig.logoScalePct || 100}%</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            value={headerConfig.logoScalePct || 100}
                            onChange={(e) =>
                              setHeaderConfig({ ...headerConfig, logoScalePct: parseInt(e.target.value) })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>इनर पैडिंग:</span>
                            <span>{headerConfig.logoPaddingPx || 4} px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            value={headerConfig.logoPaddingPx || 4}
                            onChange={(e) =>
                              setHeaderConfig({ ...headerConfig, logoPaddingPx: parseInt(e.target.value) })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Protected Footer Width Control (Part 6) */}
                    {activeLayer.type === 'footer' && (
                      <div className="space-y-2 p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-500/40">
                        <span className="font-bold text-[11px] text-emerald-300 block">
                          फुटर चौड़ाई व अलाइनमेंट (Width Adjustment)
                        </span>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>फुटर चौड़ाई (Width):</span>
                            <span>{footerConfig.footerWidthPct || 100}%</span>
                          </div>
                          <input
                            type="range"
                            min={70}
                            max={100}
                            value={footerConfig.footerWidthPct || 100}
                            onChange={(e) => {
                              const w = parseInt(e.target.value);
                              setFooterConfig({ ...footerConfig, footerWidthPct: w });
                              const newX =
                                footerConfig.footerAlignment === 'center'
                                  ? (100 - w) / 2
                                  : footerConfig.footerAlignment === 'right'
                                  ? 100 - w
                                  : 0;
                              setLayers(
                                layers.map((l) =>
                                  l.type === 'footer' ? { ...l, rect: { ...l.rect, x: newX, width: w } } : l
                                )
                              );
                            }}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => {
                                setFooterConfig({ ...footerConfig, footerAlignment: align });
                                const w = footerConfig.footerWidthPct || 100;
                                const newX = align === 'center' ? (100 - w) / 2 : align === 'right' ? 100 - w : 0;
                                setLayers(
                                  layers.map((l) =>
                                    l.type === 'footer' ? { ...l, rect: { ...l.rect, x: newX, width: w } } : l
                                  )
                                );
                              }}
                              className={`py-1 text-[10px] font-bold rounded capitalize ${
                                footerConfig.footerAlignment === align
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: PHOTO SLOTS CONFIGURATION (PARTS 7 & 11) */}
          {currentStage === 'photo_slots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">डायनामिक फोटो स्लॉट्स कॉन्फ़िगरेशन</h4>
                  <p className="text-xs text-slate-400">
                    प्रत्येक सहायक फोटो (Supporting Photo) एक स्वतंत्र स्लॉट है। 2 सहायक फोटो के लिए 2 अलग स्लॉट बनाएं।
                  </p>
                </div>
                <button
                  type="button"
                  disabled={photoSlots.length >= 4}
                  onClick={() => {
                    if (photoSlots.length >= 4) return;
                    const newId = `slot_photo_${photoSlots.length + 1}`;
                    setPhotoSlots([
                      ...photoSlots,
                      {
                        id: newId,
                        name: `फोटो स्लॉट ${photoSlots.length + 1}`,
                        slotType: 'normal',
                        rect: { x: 10, y: 10, width: 80, height: 40 },
                        required: false,
                        cropMode: 'cover',
                        bgRemoval: false,
                      },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                    photoSlots.length >= 4
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ फोटो स्लॉट जोड़ें {photoSlots.length >= 4 ? '(अधिकतम 4)' : ''}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photoSlots.map((slot, idx) => (
                  <div key={slot.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-400">
                        स्लॉट #{idx + 1}: {slot.name}
                      </span>
                      {photoSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPhotoSlots(photoSlots.filter((s) => s.id !== slot.id))}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="हटाएँ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">स्लॉट का नाम</label>
                        <input
                          type="text"
                          value={slot.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotoSlots(photoSlots.map((s) => (s.id === slot.id ? { ...s, name: val } : s)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">फोटो प्रकार (Type)</label>
                        <select
                          value={slot.slotType}
                          onChange={(e) => {
                            const val = e.target.value as PhotoSlotType;
                            setPhotoSlots(
                              photoSlots.map((s) =>
                                s.id === slot.id
                                  ? {
                                      ...s,
                                      slotType: val,
                                      bgRemoval: val === 'cutout', // ONLY cutout gets bg removal!
                                    }
                                  : s
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="normal">Normal Photo (सामान्य फोटो)</option>
                          <option value="background">Background Photo (बैकग्राउंड)</option>
                          <option value="cutout">Foreground Cutout (वक्ता कटआउट)</option>
                          <option value="inset">Inset Photo (इनसेट फ़ोटो)</option>
                          <option value="supporting">Supporting Photo (सहायक फ़ोटो)</option>
                        </select>
                      </div>
                    </div>

                    {slot.slotType === 'cutout' && (
                      <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-[11px] text-red-200">
                        ⚡ इस कटआउट स्लॉट का बैकग्राउंड AI द्वारा स्वतः हटाया जाएगा।
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 5: TEXT, STATEMENT & MULTI-BACKGROUND (PARTS 5, 8, 9) */}
          {currentStage === 'text_config' && (
            <div className="space-y-4">
              {/* Statement Frame Toggle & Options */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">बयानबाज़ी / कोटेशन मोड (Statement Frame)</h4>
                    <p className="text-xs text-slate-400">
                      वक्ता का बयान, कटआउट पोज़ीशन और मल्टी-बैकग्राउंड सिस्टम कॉन्फ़िगर करें।
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStatementFrame}
                      onChange={(e) => setIsStatementFrame(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {isStatementFrame && (
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    {/* Cutout Left / Right Positioning (Part 9) */}
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

                    {/* Three Background Modes (Part 8) */}
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

                      {/* Mode A: Solid Color */}
                      {statementBgMode === 'solid' && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                          <input
                            type="color"
                            value={statementBgColor}
                            onChange={(e) => setStatementBgColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer bg-transparent"
                          />
                          <span className="text-xs text-white font-mono">{statementBgColor}</span>
                          <span className="text-[11px] text-slate-400 ml-auto">
                            सॉलिड न्यूज़ कलर (रेड, नेवी, ब्लैक आदि)
                          </span>
                        </div>
                      )}

                      {/* Mode B: Curated Background Library */}
                      {statementBgMode === 'curated' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                          {STATEMENT_BACKGROUND_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setCuratedBgId(preset.id);
                                setStatementBgColor(preset.accentColor);
                              }}
                              className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                curatedBgId === preset.id
                                  ? 'border-amber-400 ring-2 ring-amber-400/50'
                                  : 'border-slate-800'
                              }`}
                            >
                              <div
                                className="w-full h-12 rounded"
                                style={{ background: preset.backgroundStyle }}
                              />
                              <span className="text-[10px] font-bold text-white truncate">{preset.nameHi}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mode C: AI Generated Background */}
                      {statementBgMode === 'ai_generated' && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2">
                          <label className="text-[10px] text-slate-400 block">
                            AI विजुअल प्रॉम्प्ट (बैकग्राउंड मूड)
                          </label>
                          <input
                            type="text"
                            value={aiBgPrompt}
                            onChange={(e) => setAiBgPrompt(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <p className="text-[10px] text-slate-400">
                            ✨ AI बैकग्राउंड में कोई टेक्स्ट या लोगो नहीं होगा, हाई-कंट्रास्ट सुरक्षित रहेगा।
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Headline Typography & Line Height */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                  हेडलाइन टाइपोग्राफी व देवनागरी मात्रा सुरक्षा
                </h4>
                {textSlots.map((ts) => (
                  <div key={ts.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">अधिकतम पंक्तियाँ</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={ts.maxLines}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 3;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, maxLines: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">फॉन्ट साइज (px)</label>
                      <input
                        type="number"
                        value={ts.fontSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 70;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, fontSize: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">लाइन हाइट (मात्रा सुरक्षा 1.1 - 1.8)</label>
                      <input
                        type="number"
                        step={0.05}
                        min={1.1}
                        max={1.8}
                        value={ts.lineHeight || 1.3}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1.3;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, lineHeight: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">अलाइनमेंट</label>
                      <select
                        value={ts.alignment}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, alignment: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value="center">सेंटर (Center)</option>
                        <option value="left">लेफ्ट (Left)</option>
                        <option value="right">राइट (Right)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 6: HEADER, WATERMARK, RIBBON & FOOTER (PARTS 2, 3, 6, 10) */}
          {currentStage === 'ribbon_footer' && (
            <div className="space-y-4">
              {/* Header Elements: Logo & Location (Separated) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                  हेडर तत्व: लोगो व लोकेशन (Separate Elements)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Channel Logo */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">चैनल लोगो (Channel Logo)</span>
                      <input
                        type="checkbox"
                        checked={headerConfig.showLogo}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, showLogo: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      यूजर की प्रोफाइल से वास्तविक चैनल लोगो स्वतः लोड होगा।
                    </p>
                  </div>

                  {/* Location Badge */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">लोकेशन बैज (Location Badge)</span>
                      <input
                        type="checkbox"
                        checked={headerConfig.showLocation}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, showLocation: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">स्टाइल:</span>
                      <select
                        value={headerConfig.locationStyle || 'pill'}
                        onChange={(e) =>
                          setHeaderConfig({ ...headerConfig, locationStyle: e.target.value as any })
                        }
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                      >
                        <option value="pill">Pill (कैप्सूल बैज)</option>
                        <option value="box">Box (आयताकार)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Stamp Element (Part 3) */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
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
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">फॉर्मेट</label>
                        <select
                          value={headerConfig.dateFormat || 'hi_full'}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, dateFormat: e.target.value as any })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="hi_full">5 नवंबर 2026, गुरुवार</option>
                          <option value="dd_mm_yyyy">05-11-2026</option>
                          <option value="en_short">5 Nov 2026</option>
                          <option value="hi_simple">5 नवंबर 2026</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">रोटेशन</label>
                        <select
                          value={headerConfig.dateRotation ?? 270}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, dateRotation: parseInt(e.target.value) })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value={0}>0° (हॉरिज़ॉन्टल)</option>
                          <option value={270}>270° (वर्टिकल लेफ्ट एज)</option>
                          <option value={90}>90° (वर्टिकल राइट एज)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Watermark & Callout Elements (Part 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* AI Watermark */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">वाटरमार्क (Watermark)</span>
                    <input
                      type="checkbox"
                      checked={watermarkConfig.enabled}
                      onChange={(e) =>
                        setWatermarkConfig({ ...watermarkConfig, enabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {watermarkConfig.enabled && (
                    <div className="pt-1">
                      <select
                        value={watermarkConfig.label}
                        onChange={(e) =>
                          setWatermarkConfig({ ...watermarkConfig, label: e.target.value as any })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      >
                        <option value="AI GENERATED">AI GENERATED</option>
                        <option value="प्रतीकात्मक फोटो">प्रतीकात्मक फोटो</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* "पूरी खबर डिस्क्रिप्शन में" Callout */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">डिस्क्रिप्शन कॉलआउट</span>
                    <input
                      type="checkbox"
                      checked={fullStoryCalloutConfig.enabled}
                      onChange={(e) =>
                        setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, enabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                  {fullStoryCalloutConfig.enabled && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={fullStoryCalloutConfig.text}
                        onChange={(e) =>
                          setFullStoryCalloutConfig({ ...fullStoryCalloutConfig, text: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Optional "POWERED BY AINEWSMAKER.ONLINE" Graphic Element (Strictly separated from permanent footer) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>POWERED BY बैज (ऐच्छिक ग्राफ़िक तत्व)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      स्थाई फुटर से स्वतंत्र। आवश्यकतानुसार ऑन/ऑफ करें (डिफ़ॉल्ट बंद)। कैनवास मार्किंग में कहीं भी ड्रैग व रीसाइज़ किया जा सकता है।
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
                        onChange={(e) =>
                          setPoweredByConfig({ ...poweredByConfig, fontSize: parseInt(e.target.value) || 16 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">टेक्स्ट रंग</label>
                      <input
                        type="color"
                        value={poweredByConfig.textColor || '#FFFFFF'}
                        onChange={(e) => setPoweredByConfig({ ...poweredByConfig, textColor: e.target.value })}
                        className="w-full h-8 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">बैकग्राउंड रंग</label>
                      <input
                        type="text"
                        value={poweredByConfig.bgColor || 'rgba(15, 23, 42, 0.85)'}
                        onChange={(e) => setPoweredByConfig({ ...poweredByConfig, bgColor: e.target.value })}
                        placeholder="rgba(15,23,42,0.85)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">अलाइनमेंट</label>
                      <select
                        value={poweredByConfig.alignment || 'center'}
                        onChange={(e) => setPoweredByConfig({ ...poweredByConfig, alignment: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 3D Ribbon (Part 10) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">3D ब्रेकिंग रिबन (Ribbon Layer)</h4>
                    <p className="text-xs text-slate-400">
                      रिबन सक्षम करने पर यह कैनवास मार्किंग में स्वतंत्र लेयर के रूप में कहीं भी मूव किया जा सकता है।
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ribbonConfig.enabled}
                      onChange={(e) => setRibbonConfig({ ...ribbonConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {ribbonConfig.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {BUILTIN_RIBBONS.slice(0, 8).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          setRibbonConfig({ ...ribbonConfig, ribbonId: r.id, customRibbonUrl: r.url })
                        }
                        className={`p-2 rounded-lg border text-left flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                          ribbonConfig.ribbonId === r.id
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <img src={r.url} alt={r.name} className="h-6 object-contain" />
                        <span className="text-[10px] font-bold truncate w-full text-center">{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Permanent Protected Footer Width Controls (Part 6) */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                      स्थाई AI News Maker फुटर चौड़ाई नियंत्रण (Footer Width)
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {footerConfig.footerWidthPct || 100}%
                  </span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={footerConfig.footerWidthPct || 100}
                  onChange={(e) =>
                    setFooterConfig({ ...footerConfig, footerWidthPct: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-300">
                  फुटर हमेशा बॉटम पर लॉक रहेगा, लेकिन इसकी चौड़ाई 70% से 100% तक समायोजित की जा सकती है।
                </p>
              </div>
            </div>
          )}

          {/* STAGE 7: LIVE PREVIEW (PART 12) */}
          {currentStage === 'live_preview' && (
            <div className="flex flex-col items-center space-y-4">
              <h4 className="font-bold text-sm text-white">
                प्रोडक्शन-स्टाइल लाइव प्रीव्यू ({selectedRatio})
              </h4>
              <div
                className="relative border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-black"
                style={{
                  width: selectedRatio === '4:5' ? '320px' : '260px',
                  height: selectedRatio === '4:5' ? '400px' : '462px',
                  backgroundColor: isStatementFrame ? statementBgColor : '#0B1329',
                }}
              >
                {/* Sample Photo */}
                {sampleImage && (
                  <img src={sampleImage} alt="Preview" className="w-full h-full object-cover opacity-80" />
                )}

                {/* Logo & Location */}
                {headerConfig.showLogo && (
                  <div
                    className="absolute bg-slate-900/90 border border-white/20 rounded px-2 py-0.5 text-[9px] font-bold text-white z-10"
                    style={{
                      left: `${headerConfig.logoRect.x}%`,
                      top: `${headerConfig.logoRect.y}%`,
                    }}
                  >
                    {currentUser?.channelName || 'न्यूज़ लोगो'}
                  </div>
                )}

                {headerConfig.showLocation && (
                  <div
                    className="absolute bg-red-600 rounded-full px-2 py-0.5 text-[8px] font-bold text-white z-10"
                    style={{
                      left: `${headerConfig.locationRect.x}%`,
                      top: `${headerConfig.locationRect.y}%`,
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
                      left: `${headerConfig.dateRect?.x || 2}%`,
                      top: `${headerConfig.dateRect?.y || 35}%`,
                      transform: `rotate(${headerConfig.dateRotation || 0}deg)`,
                    }}
                  >
                    5 नवंबर 2026
                  </div>
                )}

                {/* Ribbon */}
                {ribbonConfig.enabled && (
                  <div
                    className="absolute z-20"
                    style={{
                      left: `${ribbonConfig.rect?.x || 15}%`,
                      top: `${ribbonConfig.rect?.y || 60}%`,
                      width: `${ribbonConfig.rect?.width || 70}%`,
                    }}
                  >
                    <img
                      src={ribbonConfig.customRibbonUrl || '/assets/breaking_news_ribbon.svg'}
                      alt="Ribbon"
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {/* Headline */}
                <div
                  className="absolute text-center px-3 z-15"
                  style={{
                    bottom: `${footerConfig.footerHeightRatio * 100 + 2}%`,
                    left: '5%',
                    right: '5%',
                  }}
                >
                  <div className="font-bold text-white text-[11px] leading-snug drop-shadow-md">
                    {isStatementFrame
                      ? '"यह निर्णय प्रदेश की जनता के हित में लिया गया है"'
                      : 'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी'}
                  </div>
                </div>

                {/* Optional POWERED BY Element */}
                {poweredByConfig.enabled && (
                  <div
                    className="absolute text-[8px] font-bold px-2 py-0.5 rounded shadow-sm z-25 truncate max-w-[90%]"
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

                {/* Protected Footer (Channel / User Profile Branding) */}
                <div
                  className="absolute bottom-0 bg-white border-t flex items-center justify-between px-3 text-[8px] font-bold text-black z-30"
                  style={{
                    height: `${footerConfig.footerHeightRatio * 100}%`,
                    width: `${footerConfig.footerWidthPct || 100}%`,
                    left: `${(100 - (footerConfig.footerWidthPct || 100)) / 2}%`,
                  }}
                >
                  <span>@{currentUser?.username || 'breakingnewswala'}</span>
                  <span>{currentUser?.phone || currentUser?.whatsappNumber ? `📱 ${currentUser.phone || currentUser.whatsappNumber}` : 'सत्यापित डिजिटल समाचार नेटवर्क'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: METADATA & PUBLISH */}
          {currentStage === 'metadata_publish' && (
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
                      {cat} {cat === 'Story Frames' ? '(9:16 Dedicated)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Eligibility Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  उपलब्ध प्लान्स (Plan Eligibility)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DYNAMIC_PLAN_TIERS.map((tier) => {
                    const isSelected = allowedPlans.includes(tier);
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleTogglePlan(tier)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{tier}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Publication Status */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">पब्लिकेशन स्टेटस</label>
                <select
                  value={publicationStatus}
                  onChange={(e) => setPublicationStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="published">Published (पब्लिश्ड - यूज़र्स को तुरंत दिखेगा)</option>
                  <option value="draft">Draft (ड्राफ्ट - केवल मास्टर एडमिन)</option>
                  <option value="preview">Preview (प्रीव्यू मोड)</option>
                </select>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500 text-emerald-200'
                      : 'bg-red-950/70 border border-red-500 text-red-200'
                  }`}
                >
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              const stages: WizardStage[] = [
                'upload_aspect',
                'ai_analysis',
                'element_marking',
                'photo_slots',
                'text_config',
                'ribbon_footer',
                'live_preview',
                'metadata_publish',
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

          {currentStage !== 'metadata_publish' ? (
            <button
              type="button"
              onClick={() => {
                const stages: WizardStage[] = [
                  'upload_aspect',
                  'ai_analysis',
                  'element_marking',
                  'photo_slots',
                  'text_config',
                  'ribbon_footer',
                  'live_preview',
                  'metadata_publish',
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
