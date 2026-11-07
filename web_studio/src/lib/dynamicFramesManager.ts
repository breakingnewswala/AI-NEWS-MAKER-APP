// AI NEWS MAKER — Dynamic Frames Manager
// Manages 4:5 and 9:16 Reusable Dynamic Frame Templates, AI Frame Analysis, and User Story Preferences

import {
  DynamicFrameTemplate,
  DynamicAspectRatio,
  DynamicDesignCategory,
  DynamicPlanTier,
  UserStoryPreference,
  FrameLayer,
  HeaderConfig,
  FooterConfig,
  WatermarkConfig,
  FullStoryCalloutConfig,
  PoweredByConfig,
  SafeZoneConfig,
  StatementOptions,
  AssetLibraryItem,
  DynamicFrameType,
  VideoFrameConfig,
  TypographyConfig,
} from '../types/dynamicFrame';
import { getApiBaseUrl } from './apiConfig';

const STORAGE_KEY_FRAMES = 'ai_news_dynamic_frames_v1';
const STORAGE_KEY_STORY_PREF = 'ai_news_user_story_pref_v1';

/**
 * Plan weight hierarchy:
 * BASIC = 1
 * ADVANCED = 2
 * PRO = 3
 * VIP DESK = 4
 */
export const DYNAMIC_PLAN_WEIGHTS: Record<DynamicPlanTier, number> = {
  BASIC: 1,
  ADVANCED: 2,
  PRO: 3,
  'VIP DESK': 4,
};

export function normalizeDynamicPlanTier(tier?: string | null): DynamicPlanTier {
  if (!tier) return 'BASIC';
  const t = tier.trim().toLowerCase();
  if (t === 'ultra' || t === 'vip' || t === 'vip desk' || t === 'vip_desk' || t === 'vip-dash' || t === 'vip_dash') return 'VIP DESK';
  if (t === 'professional' || t === 'pro') return 'PRO';
  if (t === 'advanced' || t === 'advance') return 'ADVANCED';
  return 'BASIC';
}

export function isPlanEligibleForFrame(userTier: string | undefined | null, allowedPlans: DynamicPlanTier[]): boolean {
  if (!allowedPlans || allowedPlans.length === 0) return true;
  const currentTier = normalizeDynamicPlanTier(userTier);
  const currentWeight = DYNAMIC_PLAN_WEIGHTS[currentTier] || 1;
  const minAllowedWeight = Math.min(...allowedPlans.map((p) => DYNAMIC_PLAN_WEIGHTS[p] || 1));
  return currentWeight >= minAllowedWeight;
}

// -------------------------------------------------------------
// NORMALIZATION FOR BACKWARD COMPATIBILITY
// -------------------------------------------------------------

export function normalizeDynamicFrame(raw: any): DynamicFrameTemplate {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_DYNAMIC_FRAMES[0];
  }

  const isStory = raw.aspectRatio === '9:16';

  // 1. Header Config
  const rawH = raw.headerConfig || {};
  const headerConfig: HeaderConfig = {
    showLogo: rawH.showLogo !== false,
    logoPosition: rawH.logoPosition || 'top_left',
    logoRect: rawH.logoRect || (isStory ? { x: 6, y: 3, width: 24, height: 6.5 } : { x: 5, y: 3.5, width: 22, height: 9 }),
    logoScalePct: typeof rawH.logoScalePct === 'number' ? rawH.logoScalePct : 100,
    logoPaddingPx: typeof rawH.logoPaddingPx === 'number' ? rawH.logoPaddingPx : 4,
    showLocation: rawH.showLocation !== false,
    locationRect: rawH.locationRect || (isStory ? { x: 6, y: 10.5, width: 30, height: 3.2 } : { x: 5, y: 13.5, width: 28, height: 4.5 }),
    locationStyle: rawH.locationStyle || 'pill',
    locationBgColor: rawH.locationBgColor || '#DC2626',
    locationTextColor: rawH.locationTextColor || '#FFFFFF',
    locationShowIcon: rawH.locationShowIcon !== false,
    locationBadgeMode: rawH.locationBadgeMode || 'dynamic_overlay',
    manualLocationAsset: rawH.manualLocationAsset,
    showDate: Boolean(rawH.showDate),
    dateRect: rawH.dateRect || (isStory ? { x: 6, y: 14.5, width: 34, height: 2.5 } : { x: 5, y: 18.5, width: 34, height: 3.5 }),
    dateFormat: rawH.dateFormat || 'D MMMM YYYY',
    dateRotation: typeof rawH.dateRotation === 'number' ? rawH.dateRotation : 0,
    dateFontSize: typeof rawH.dateFontSize === 'number' ? rawH.dateFontSize : 20,
    dateTextColor: rawH.dateTextColor || '#CBD5E1',
    dateBgColor: rawH.dateBgColor,
    dateStampStyle: rawH.dateStampStyle || 'only_text',
  };

  // 2. Footer Config
  const rawF = raw.footerConfig || {};
  const footerConfig: FooterConfig = {
    footerHeightRatio: typeof rawF.footerHeightRatio === 'number' ? rawF.footerHeightRatio : (isStory ? 0.065 : 0.08),
    enforcePermanentFooter: true,
    footerBgColor: rawF.footerBgColor || (isStory ? '#0F172A' : '#FFFFFF'),
    footerTextColor: rawF.footerTextColor || (isStory ? '#F8FAFC' : '#000000'),
    footerWidthPct: typeof rawF.footerWidthPct === 'number' ? Math.max(70, Math.min(100, rawF.footerWidthPct)) : 100,
    footerAlignment: rawF.footerAlignment || 'center',
    footerInset: rawF.footerInset,
  };

  // 3. Watermark Config
  const rawW = raw.watermarkConfig || {};
  const watermarkConfig: WatermarkConfig = {
    enabled: Boolean(rawW.enabled),
    label: rawW.label === 'प्रतीकात्मक फोटो' ? 'प्रतीकात्मक फोटो' : 'AI GENERATED',
    rect: rawW.rect || (isStory ? { x: 70, y: 3, width: 25, height: 2.8 } : { x: 72, y: 3.5, width: 23, height: 3.5 }),
    fontSize: typeof rawW.fontSize === 'number' ? rawW.fontSize : 18,
    opacity: typeof rawW.opacity === 'number' ? rawW.opacity : 0.8,
    rotation: typeof rawW.rotation === 'number' ? rawW.rotation : 0,
    watermarkStyle: rawW.watermarkStyle || 'badge',
  };

  // 4. Full Story Callout Config
  const rawC = raw.fullStoryCalloutConfig || {};
  const fullStoryCalloutConfig: FullStoryCalloutConfig = {
    enabled: Boolean(rawC.enabled),
    text: rawC.text || 'पूरी खबर डिस्क्रिप्शन में...',
    rect: rawC.rect || (isStory ? { x: 8, y: 88, width: 84, height: 4.5 } : { x: 8, y: 86, width: 84, height: 5 }),
    fontSize: typeof rawC.fontSize === 'number' ? rawC.fontSize : 22,
    bgColor: rawC.bgColor || 'rgba(0,0,0,0.7)',
    borderColor: rawC.borderColor || '#FFE600',
    showIcon: rawC.showIcon !== false,
    manualCalloutAsset: rawC.manualCalloutAsset,
    calloutAssetMode: rawC.calloutAssetMode || 'dynamic_overlay',
    calloutVisibilityPolicy: rawC.calloutVisibilityPolicy || 'optional',
    rotation: typeof rawC.rotation === 'number' ? rawC.rotation : 0,
  };

  // 4b. Optional Powered By Branding Config (Separate from Footer and Watermark)
  const rawP = raw.poweredByConfig || {};
  const poweredByConfig: PoweredByConfig = {
    enabled: Boolean(rawP.enabled),
    text: rawP.text || 'POWERED BY AINEWSMAKER.ONLINE',
    rect: rawP.rect || (isStory ? { x: 25, y: 94.5, width: 50, height: 2.2 } : { x: 25, y: 93.5, width: 50, height: 2.5 }),
    fontSize: typeof rawP.fontSize === 'number' ? rawP.fontSize : 16,
    textColor: rawP.textColor || '#FFFFFF',
    bgColor: rawP.bgColor || 'rgba(0,0,0,0.6)',
    borderColor: rawP.borderColor || 'rgba(255,255,255,0.2)',
    borderWidth: typeof rawP.borderWidth === 'number' ? rawP.borderWidth : 1,
    opacity: typeof rawP.opacity === 'number' ? rawP.opacity : 0.8,
    rotation: typeof rawP.rotation === 'number' ? rawP.rotation : 0,
    alignment: rawP.alignment || 'center',
  };

  // 5. Safe Zone Config
  const rawS = raw.safeZoneConfig || {};
  const safeZoneConfig: SafeZoneConfig = {
    enabled: rawS.enabled !== false,
    topMarginPct: typeof rawS.topMarginPct === 'number' ? rawS.topMarginPct : 5,
    bottomMarginPct: typeof rawS.bottomMarginPct === 'number' ? rawS.bottomMarginPct : 5,
    leftMarginPct: typeof rawS.leftMarginPct === 'number' ? rawS.leftMarginPct : 5,
    rightMarginPct: typeof rawS.rightMarginPct === 'number' ? rawS.rightMarginPct : 5,
    headerSafeAreaPct: typeof rawS.headerSafeAreaPct === 'number' ? rawS.headerSafeAreaPct : 15,
    footerSafeAreaPct: typeof rawS.footerSafeAreaPct === 'number' ? rawS.footerSafeAreaPct : 10,
  };

  // 6. Statement Options
  const isStatementFrame = Boolean(raw.isStatementFrame);
  const rawStmt = raw.statementOptions || {};
  const statementOptions: StatementOptions = {
    solidBackgroundHex: rawStmt.solidBackgroundHex || '#C81E1E',
    backgroundMode: rawStmt.backgroundMode || 'solid',
    curatedBackgroundId: rawStmt.curatedBackgroundId,
    aiPrompt: rawStmt.aiPrompt,
    cutoutPosition: rawStmt.cutoutPosition || 'right',
  };

  // 7. Ribbon Config
  const rawR = raw.ribbonConfig || {};
  const ribbonConfig = {
    ...rawR,
    enabled: Boolean(rawR.enabled),
    rotation: typeof rawR.rotation === 'number' ? rawR.rotation : 0,
  };

  // 8. Rebuild Layers with independent layer registration
  const rawLayers: FrameLayer[] = Array.isArray(raw.layers) ? raw.layers : [];
  const layers: FrameLayer[] = [];

  // Background Layer
  if (isStatementFrame) {
    layers.push({
      id: 'layer_bg',
      name: 'स्टेटमेंट बैकग्राउंड',
      type: 'background',
      rect: { x: 0, y: 0, width: 100, height: 100 - footerConfig.footerHeightRatio * 100 },
      visible: true,
      locked: true,
      zIndex: 1,
    });
  }

  // Photo Layers
  const photoSlots = Array.isArray(raw.photoSlots) ? raw.photoSlots : [];
  photoSlots.forEach((slot: any, idx: number) => {
    layers.push({
      id: `layer_photo_${slot.id || idx}`,
      name: slot.name || `फोटो स्लॉट ${idx + 1}`,
      type: 'photo',
      rect: slot.rect,
      visible: true,
      locked: false,
      zIndex: 5 + idx,
    });
  });

  // Text Layers
  const textSlots = Array.isArray(raw.textSlots) ? raw.textSlots : [];
  textSlots.forEach((slot: any, idx: number) => {
    layers.push({
      id: `layer_text_${slot.id || idx}`,
      name: slot.name || `टेक्स्ट लेयर ${idx + 1}`,
      type: 'text',
      rect: slot.rect,
      visible: true,
      locked: false,
      zIndex: 15 + idx,
    });
  });

  // Ribbon Layer (if enabled)
  if (ribbonConfig.enabled && ribbonConfig.rect) {
    layers.push({
      id: 'layer_ribbon',
      name: 'ब्रेकिंग रिबन (Ribbon)',
      type: 'ribbon',
      rect: ribbonConfig.rect,
      visible: true,
      locked: false,
      zIndex: 25,
    });
  }

  // Logo Layer
  if (headerConfig.showLogo && headerConfig.logoRect) {
    layers.push({
      id: 'layer_logo',
      name: 'चैनल लोगो (Logo)',
      type: 'logo',
      rect: headerConfig.logoRect,
      visible: true,
      locked: false,
      zIndex: 30,
    });
  }

  // Location Badge Layer
  if (headerConfig.showLocation && headerConfig.locationRect) {
    layers.push({
      id: 'layer_location',
      name: 'लोकेशन बैज (Location Badge)',
      type: 'location',
      rect: headerConfig.locationRect,
      visible: true,
      locked: false,
      zIndex: 31,
    });
  }

  // Date Stamp Layer
  if (headerConfig.showDate && headerConfig.dateRect) {
    layers.push({
      id: 'layer_date',
      name: 'दिनांक मुहर (Date Stamp)',
      type: 'date',
      rect: headerConfig.dateRect,
      visible: true,
      locked: false,
      zIndex: 32,
    });
  }

  // AI Watermark Layer
  if (watermarkConfig.enabled && watermarkConfig.rect) {
    layers.push({
      id: 'layer_watermark',
      name: 'वॉटरमार्क (AI Watermark)',
      type: 'watermark',
      rect: watermarkConfig.rect,
      visible: true,
      locked: false,
      zIndex: 33,
    });
  }

  // Callout Layer
  if (fullStoryCalloutConfig.enabled && fullStoryCalloutConfig.rect) {
    layers.push({
      id: 'layer_callout',
      name: 'पूरी खबर कॉलआउट (Callout)',
      type: 'callout',
      rect: fullStoryCalloutConfig.rect,
      visible: true,
      locked: false,
      zIndex: 34,
    });
  }

  // Optional Powered By Branding Layer (Element ID: POWERED_BY_AINEWSMAKER / layer_powered_by)
  if (poweredByConfig.enabled && poweredByConfig.rect) {
    layers.push({
      id: 'layer_powered_by',
      name: 'POWERED BY बैज (Optional)',
      type: 'powered_by',
      rect: poweredByConfig.rect,
      visible: true,
      locked: false,
      zIndex: 35,
    });
  }

  // Footer Layer
  const footerH = footerConfig.footerHeightRatio * 100;
  const footerW = footerConfig.footerWidthPct || 100;
  const footerX = footerConfig.footerAlignment === 'left' ? 0 : footerConfig.footerAlignment === 'right' ? 100 - footerW : (100 - footerW) / 2;
  layers.push({
    id: 'layer_footer',
    name: 'स्थाई फुटर (Permanent Footer)',
    type: 'footer',
    rect: { x: footerX, y: 100 - footerH, width: footerW, height: footerH },
    visible: true,
    locked: true,
    zIndex: 50,
  });

  const isVideo = raw.frameMode === 'video' || raw.frameType === 'video';
  const rawV = raw.videoConfig || {};
  const videoConfig: VideoFrameConfig | undefined = (isVideo || raw.videoConfig) ? {
    displayMode: rawV.displayMode || 'fit',
    videoRect: rawV.videoRect || (raw.aspectRatio === '9:16' ? { x: 0, y: 15, width: 100, height: 75 } : { x: 0, y: 15, width: 100, height: 75 }),
    footerPosition: rawV.footerPosition || 'bottom',
    locationBadgeUrl: rawV.locationBadgeUrl,
    locationBadgeId: rawV.locationBadgeId,
    watermarkTextEnabled: Boolean(rawV.watermarkTextEnabled),
    watermarkText: rawV.watermarkText || 'AI NEWS MAKER',
    watermarkLogoEnabled: Boolean(rawV.watermarkLogoEnabled),
    watermarkLogoUrl: rawV.watermarkLogoUrl,
    watermarkUserAllowed: rawV.watermarkUserAllowed !== false,
    watermarkRect: rawV.watermarkRect || { x: 35, y: 48, width: 30, height: 6 },
  } : undefined;

  const rawT = raw.typographyConfig || {};
  const typographyConfig: TypographyConfig | undefined = raw.typographyConfig ? {
    primaryFontFamily: rawT.primaryFontFamily || 'Noto Sans Devanagari',
    primaryFontSize: typeof rawT.primaryFontSize === 'number' ? rawT.primaryFontSize : 36,
    minFontSize: typeof rawT.minFontSize === 'number' ? rawT.minFontSize : 24,
    fontWeight: rawT.fontWeight || 'bold',
  } : undefined;

  return {
    ...raw,
    frameMode: raw.frameMode || (isVideo ? 'video' : 'photo'),
    frameType: raw.frameType || (isVideo ? 'video' : isStory ? 'story' : 'graphic'),
    canvasWidth: raw.aspectRatio === '4:3' ? 1440 : 1080,
    canvasHeight: isStory ? 1920 : raw.aspectRatio === '1:1' ? 1080 : raw.aspectRatio === '4:3' ? 1080 : 1350,
    primaryBackgroundAsset: raw.primaryBackgroundAsset,
    primaryBackgroundMode: raw.primaryBackgroundMode || 'image',
    primaryBackgroundHex: raw.primaryBackgroundHex,
    photoLayoutVariants: Array.isArray(raw.photoLayoutVariants) ? raw.photoLayoutVariants : [],
    activePhotoLayoutMode: raw.activePhotoLayoutMode || 'single',
    headerConfig,
    footerConfig,
    watermarkConfig,
    fullStoryCalloutConfig,
    calloutAssetUrl: raw.calloutAssetUrl || raw.fullStoryCalloutConfig?.manualCalloutAsset,
    poweredByConfig,
    safeZoneConfig,
    statementOptions,
    ribbonConfig,
    isStatementFrame,
    photoSlots,
    textSlots,
    videoConfig,
    typographyConfig,
    samplePhotoUrl: raw.samplePhotoUrl,
    sampleVideoUrl: raw.sampleVideoUrl,
    layers: rawLayers.length > 0 ? rawLayers : layers,
  };
}

// -------------------------------------------------------------
// DEFAULT SEED DYNAMIC FRAMES (Production-grade 4:5 and 9:16)
// -------------------------------------------------------------

export const DEFAULT_DYNAMIC_FRAMES: DynamicFrameTemplate[] = [
  // 1. Regular 4:5 Frame (Basic)
  normalizeDynamicFrame({
    id: 'df_reg_4_5_clean',
    name: 'रेगुलर क्लासिक 4:5 फ्रेम (Regular Classic)',
    description: 'दैनिक समाचारों के लिए मानक 4:5 पोर्ट्रेट फोटो फ्रेम।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_graphic_preview.png',
    designCategory: 'Regular Frames',
    allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 5, y: 18.5, width: 34, height: 3.2 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 74, y: 3.5, width: 21, height: 3.5 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    fullStoryCalloutConfig: {
      enabled: false,
      text: 'पूरी खबर डिस्क्रिप्शन में...',
      rect: { x: 8, y: 86, width: 84, height: 4.5 },
      fontSize: 22,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    photoSlots: [
      {
        id: 'slot_main_photo',
        name: 'मुख्य समाचार फोटो (Main Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 61.33 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_main_headline',
        name: 'मुख्य हेडलाइन (3 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 7.7, y: 64, width: 84.6, height: 26 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.25,
        backgroundColor: 'transparent',
      },
    ],
  }),

  // 2. Statement / Bayaanbaazi 4:5 Frame (Advanced)
  normalizeDynamicFrame({
    id: 'df_bayaan_4_5_red',
    name: 'बयानबाज़ी रेड कटआउट फ्रेम (Statement Red Cutout)',
    description: 'वक्ता का बैकग्राउंड रिमूव्ड कटआउट व मुख्य बयान/कोटेशन फ्रेम।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_statement_preview.png',
    designCategory: 'बयानबाजी',
    allowedPlans: ['ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    isStatementFrame: true,
    statementOptions: {
      solidBackgroundHex: '#C81E1E',
      backgroundMode: 'solid',
      cutoutPosition: 'right',
    },
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 26, height: 4.5 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 5, y: 18.5, width: 34, height: 3.2 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 74, y: 3.5, width: 21, height: 3.5 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    fullStoryCalloutConfig: {
      enabled: false,
      text: 'पूरी खबर डिस्क्रिप्शन में...',
      rect: { x: 8, y: 86, width: 84, height: 4.5 },
      fontSize: 22,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    photoSlots: [
      {
        id: 'slot_speaker_cutout',
        name: 'वक्ता का फोटो (पारदर्शी कटआउट / Transparent Cutout)',
        slotType: 'cutout',
        rect: { x: 50, y: 44, width: 48, height: 48 },
        required: true,
        bgRemoval: true,
        cropMode: 'contain',
      },
    ],
    textSlots: [
      {
        id: 'slot_statement_quote',
        name: 'वक्ता का मुख्य बयान (Statement Quote)',
        role: 'quote',
        rect: { x: 8, y: 22, width: 84, height: 26 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 66,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 4,
        lineHeight: 1.3,
      },
      {
        id: 'slot_speaker_name',
        name: 'वक्ता का नाम (Speaker Name)',
        role: 'speaker_name',
        rect: { x: 8, y: 72, width: 42, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 42,
        fontWeight: 'bold',
        textColor: '#FFE600',
        alignment: 'left',
        maxLines: 1,
      },
      {
        id: 'slot_speaker_desig',
        name: 'पद / विवरण (Designation)',
        role: 'speaker_designation',
        rect: { x: 8, y: 79.5, width: 42, height: 6 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 28,
        fontWeight: 'normal',
        textColor: '#F8FAFC',
        alignment: 'left',
        maxLines: 2,
      },
    ],
  }),

  // 3. Super Breaking 4:5 Frame (Pro)
  normalizeDynamicFrame({
    id: 'df_super_breaking_4_5',
    name: 'सुपर ब्रेकिंग 3D रिबन फ्रेम (Super Breaking)',
    description: '3D रेड ग्लॉसी ब्रेकिंग रिबन, व्हाइट हेडलाइन बॉक्स और विस्तृत फोटो।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_super_breaking_preview.png',
    designCategory: 'Super Breaking',
    allowedPlans: ['PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 26, height: 4.5 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 5, y: 18.5, width: 34, height: 3.2 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFE600',
      footerTextColor: '#000000',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 74, y: 3.5, width: 21, height: 3.5 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    ribbonConfig: {
      enabled: true,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 15, y: 64, width: 70, height: 9 },
      scalePct: 70,
      rotation: 0,
    },
    photoSlots: [
      {
        id: 'slot_main_photo',
        name: 'समाचार फोटो (Main Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 68 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_main_headline',
        name: 'ब्रेकिंग हेडलाइन (2-3 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 6, y: 74, width: 88, height: 16.5 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 68,
        fontWeight: 'bold',
        textColor: '#0A0A0A',
        alignment: 'center',
        maxLines: 2,
        lineHeight: 1.25,
        backgroundColor: '#FFFFFF',
      },
    ],
  }),

  // -------------------------------------------------------------
  // DEDICATED 9:16 SOCIAL MEDIA STORY FRAMES (1080 x 1920 px)
  // -------------------------------------------------------------

  // 4. Social Media Story Frame 1: Full-Impact Portrait Story (Basic)
  normalizeDynamicFrame({
    id: 'df_story_9_16_standard',
    name: 'स्टैंडर्ड न्यूज़ स्टोरी 9:16 (Standard Story)',
    description: 'सोशल मीडिया इंस्टाग्राम व फेसबुक स्टोरी के लिए 9:16 वर्टिकल न्यूज़ लेआउट।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_standard.png',
    designCategory: 'Story Frames',
    allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 6, y: 14.5, width: 34, height: 2.5 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.065, // ~125px on 1920 height
      enforcePermanentFooter: true,
      footerBgColor: '#0F172A',
      footerTextColor: '#F8FAFC',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 70, y: 3, width: 25, height: 2.8 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    photoSlots: [
      {
        id: 'slot_story_photo',
        name: 'स्टोरी मुख्य फोटो (Story Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 62 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'स्टोरी हेडलाइन (3-4 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 7, y: 66, width: 86, height: 25 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 72,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'left',
        maxLines: 4,
        lineHeight: 1.3,
        backgroundColor: '#0F172A',
      },
    ],
  }),

  // 5. Social Media Story Frame 2: Super Breaking 9:16 Story (Advanced)
  normalizeDynamicFrame({
    id: 'df_story_9_16_breaking',
    name: 'सुपर ब्रेकिंग स्टोरी 9:16 (Super Breaking Story)',
    description: '3D रिबन, बड़ी ब्रेकिंग हेडलाइन और उच्च प्रभाव वाली 9:16 सोशल स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_breaking.png',
    designCategory: 'Story Frames',
    allowedPlans: ['ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 6, y: 14.5, width: 34, height: 2.5 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#FFE600',
      footerTextColor: '#000000',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 70, y: 3, width: 25, height: 2.8 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    ribbonConfig: {
      enabled: true,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 12, y: 60, width: 76, height: 6.8 },
      scalePct: 76,
      rotation: 0,
    },
    photoSlots: [
      {
        id: 'slot_story_photo',
        name: 'स्टोरी फोटो',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 64 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'ब्रेकिंग स्टोरी हेडलाइन',
        role: 'headline',
        rect: { x: 6, y: 68, width: 88, height: 23 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 74,
        fontWeight: 'bold',
        textColor: '#0A0A0A',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.25,
        backgroundColor: '#FFFFFF',
      },
    ],
  }),

  // 6. Social Media Story Frame 3: Statement / Bayaanbaazi 9:16 Story (Pro / VIP)
  normalizeDynamicFrame({
    id: 'df_story_9_16_statement',
    name: 'बयानबाज़ी स्टोरी 9:16 (Statement Story)',
    description: 'वक्ता का 9:16 कटआउट, मुख्य कोटेशन और रॉयल गोल्ड/रेड थीम स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_statement.png',
    designCategory: 'Story Frames',
    allowedPlans: ['PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    isStatementFrame: true,
    statementOptions: {
      solidBackgroundHex: '#991B1B',
      backgroundMode: 'solid',
      cutoutPosition: 'right',
    },
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 6, y: 14.5, width: 34, height: 2.5 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#000000',
      footerTextColor: '#FFE600',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 70, y: 3, width: 25, height: 2.8 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    photoSlots: [
      {
        id: 'slot_speaker_cutout',
        name: 'वक्ता का कटआउट (Speaker Cutout)',
        slotType: 'cutout',
        rect: { x: 42, y: 48, width: 56, height: 45.5 },
        required: true,
        bgRemoval: true,
        cropMode: 'contain',
      },
    ],
    textSlots: [
      {
        id: 'slot_statement_quote',
        name: 'मुख्य बयान (Statement Quote)',
        role: 'quote',
        rect: { x: 8, y: 16, width: 84, height: 32 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 5,
        lineHeight: 1.35,
      },
      {
        id: 'slot_speaker_name',
        name: 'वक्ता का नाम (Speaker Name)',
        role: 'speaker_name',
        rect: { x: 8, y: 76, width: 44, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 44,
        fontWeight: 'bold',
        textColor: '#FFE600',
        alignment: 'left',
        maxLines: 1,
      },
      {
        id: 'slot_speaker_desig',
        name: 'पद / विवरण (Designation)',
        role: 'speaker_designation',
        rect: { x: 8, y: 84, width: 44, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 28,
        fontWeight: 'normal',
        textColor: '#F8FAFC',
        alignment: 'left',
        maxLines: 2,
      },
    ],
  }),

  // 7. Social Media Story Frame 4: Dual Photo Collage 9:16 Story (VIP Desk)
  normalizeDynamicFrame({
    id: 'df_story_9_16_collage',
    name: 'डबल फोटो कोलाज स्टोरी 9:16 (Collage Story VIP)',
    description: 'दो समाचार फोटोग्राफ्स का सुंदर कोलाज और आकर्षक हेडलाइन स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_collage.png',
    designCategory: 'Story Frames',
    allowedPlans: ['VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      logoScalePct: 100,
      logoPaddingPx: 4,
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
      showDate: true,
      dateRect: { x: 6, y: 14.5, width: 34, height: 2.5 },
      dateFormat: 'D MMMM YYYY',
      dateRotation: 0,
      dateFontSize: 20,
      dateTextColor: '#CBD5E1',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#000000',
      footerTextColor: '#FFE600',
      footerWidthPct: 100,
      footerAlignment: 'center',
    },
    watermarkConfig: {
      enabled: true,
      label: 'AI GENERATED',
      rect: { x: 70, y: 3, width: 25, height: 2.8 },
      fontSize: 18,
      opacity: 0.8,
      rotation: 0,
    },
    safeZoneConfig: {
      enabled: true,
      topMarginPct: 5,
      bottomMarginPct: 5,
      leftMarginPct: 5,
      rightMarginPct: 5,
      headerSafeAreaPct: 15,
      footerSafeAreaPct: 10,
    },
    photoSlots: [
      {
        id: 'slot_photo_top',
        name: 'पहली फोटो (ऊपरी फ़्रेम)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 32 },
        required: true,
        cropMode: 'cover',
      },
      {
        id: 'slot_photo_mid',
        name: 'दूसरी फोटो (मध्य फ़्रेम)',
        slotType: 'supporting',
        rect: { x: 0, y: 33, width: 100, height: 32 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'स्टोरी मुख्य हेडलाइन',
        role: 'headline',
        rect: { x: 6, y: 68, width: 88, height: 23 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.3,
        backgroundColor: '#1E293B',
      },
    ],
  }),
];

// -------------------------------------------------------------
// LOCALSTORAGE & SERVER SYNC IMPLEMENTATION
// -------------------------------------------------------------

export function getLocalDynamicFrames(): DynamicFrameTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_DYNAMIC_FRAMES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    if (!raw) return DEFAULT_DYNAMIC_FRAMES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_DYNAMIC_FRAMES;

    // Merge default seeds if missing
    const existingIds = new Set(parsed.map((f: DynamicFrameTemplate) => f.id));
    const merged = [...parsed];
    for (const def of DEFAULT_DYNAMIC_FRAMES) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
      }
    }
    return merged.map(normalizeDynamicFrame);
  } catch {
    return DEFAULT_DYNAMIC_FRAMES;
  }
}

export function getDynamicFrameById(id: string): DynamicFrameTemplate | null {
  if (!id) return null;
  const local = getLocalDynamicFrames();
  const found = local.find((f) => f.id === id);
  if (found) return found;
  const def = DEFAULT_DYNAMIC_FRAMES.find((f) => f.id === id);
  return def || null;
}

export function saveLocalDynamicFrames(frames: DynamicFrameTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = frames.map(normalizeDynamicFrame);
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('ai_news_dynamic_frames_updated', { detail: normalized }));
  } catch (e) {
    console.warn('Failed to save dynamic frames locally:', e);
  }
}

export async function fetchDynamicFramesFromApi(filterAspectRatio?: DynamicAspectRatio): Promise<DynamicFrameTemplate[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const q = filterAspectRatio ? `?aspectRatio=${encodeURIComponent(filterAspectRatio)}` : '';
    const res = await fetch(`${baseUrl}/api/dynamic-frames${q}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.frames)) {
        const normalized = data.frames.map(normalizeDynamicFrame);
        saveLocalDynamicFrames(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Network error fetching dynamic frames from API, falling back to local storage:', err);
  }
  const local = getLocalDynamicFrames();
  return filterAspectRatio ? local.filter((f) => f.aspectRatio === filterAspectRatio) : local;
}

export async function saveDynamicFrameToApi(
  frame: Partial<DynamicFrameTemplate>,
  authToken?: string
): Promise<{ success: boolean; frame?: DynamicFrameTemplate; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const isNew = !frame.id || frame.id.startsWith('temp_');
    const method = isNew ? 'POST' : 'PUT';
    const endpoint = isNew ? `${baseUrl}/api/dynamic-frames` : `${baseUrl}/api/dynamic-frames/${frame.id}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(frame),
    });

    const data = await res.json();
    if (res.ok && data.success && data.frame) {
      const normalizedFrame = normalizeDynamicFrame(data.frame);
      const local = getLocalDynamicFrames();
      const updated = [normalizedFrame, ...local.filter((f) => f.id !== normalizedFrame.id)];
      saveLocalDynamicFrames(updated);
      return { success: true, frame: normalizedFrame };
    }
    return { success: false, error: data.error || 'फ़्रेम सहेजने में विफल' };
  } catch (e: any) {
    return { success: false, error: e.message || 'नेटवर्क त्रुटि' };
  }
}

export async function deleteDynamicFrameFromApi(frameId: string, authToken?: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/dynamic-frames/${frameId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      const local = getLocalDynamicFrames();
      saveLocalDynamicFrames(local.filter((f) => f.id !== frameId));
      return true;
    }
  } catch (e) {
    console.warn('Failed to delete frame:', e);
  }
  return false;
}

// -------------------------------------------------------------
// PRIMARY STORY PREFERENCE ("मेरी प्राथमिक स्टोरी")
// -------------------------------------------------------------

export function getLocalPrimaryStoryFrameId(userId?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_STORY_PREF}_${userId || 'default'}`);
    return raw || 'df_story_9_16_standard';
  } catch {
    return 'df_story_9_16_standard';
  }
}

export function saveLocalPrimaryStoryFrameId(frameId: string, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_STORY_PREF}_${userId || 'default'}`, frameId);
    window.dispatchEvent(new CustomEvent('ai_news_primary_story_updated', { detail: { frameId, userId } }));
  } catch (e) {
    console.warn('Failed to save primary story preference:', e);
  }
}

export async function savePrimaryStoryPreferenceApi(frameId: string, userId: string, authToken?: string): Promise<boolean> {
  saveLocalPrimaryStoryFrameId(frameId, userId);
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/user/story-preference`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, primaryStoryFrameId: frameId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// AI SAMPLE FRAME ANALYSIS
// -------------------------------------------------------------

export interface AiFrameAnalysisResult {
  detectedRatio: DynamicAspectRatio;
  headerRect: { x: number; y: number; width: number; height: number };
  logoRect: { x: number; y: number; width: number; height: number };
  locationRect: { x: number; y: number; width: number; height: number };
  headlineRect: { x: number; y: number; width: number; height: number };
  recommendedPhotoSlots: Array<{
    name: string;
    slotType: 'normal' | 'cutout' | 'supporting';
    rect: { x: number; y: number; width: number; height: number };
  }>;
  statementDetected?: boolean;
  quoteRect?: { x: number; y: number; width: number; height: number };
  speakerNameRect?: { x: number; y: number; width: number; height: number };
  speakerDesigRect?: { x: number; y: number; width: number; height: number };
  ribbonDetected?: boolean;
  ribbonRect?: { x: number; y: number; width: number; height: number };
  footerRect: { x: number; y: number; width: number; height: number };
  dateRect?: { x: number; y: number; width: number; height: number };
  watermarkRect?: { x: number; y: number; width: number; height: number };
}

export async function requestAiFrameAnalysis(
  sampleBase64: string,
  selectedRatio: DynamicAspectRatio,
  authToken?: string
): Promise<{ success: boolean; result?: AiFrameAnalysisResult; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/dynamic-frames/ai-analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sampleBase64, selectedRatio }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.result) {
      return { success: true, result: data.result };
    }
    return { success: false, error: data.error || 'AI विश्लेषण में असमर्थ' };
  } catch (err: any) {
    return { success: false, error: err.message || 'AI विश्लेषण सर्वर से कनेक्ट नहीं हो सका' };
  }
}


// -------------------------------------------------------------
// REUSABLE ASSET LIBRARIES API CLIENT
// -------------------------------------------------------------

export async function fetchAssetLibraries(type?: string): Promise<AssetLibraryItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const qs = type && type !== 'all' ? `?type=${type}` : '';
    const res = await fetch(`${baseUrl}/api/admin/asset-libraries${qs}`);
    if (!res.ok) throw new Error('Failed to fetch asset libraries');
    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch asset libraries from API, returning defaults:', err);
    return [];
  }
}

export async function saveAssetLibraryItem(
  item: Partial<AssetLibraryItem>,
  authToken?: string
): Promise<{ success: boolean; item?: AssetLibraryItem; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/admin/asset-libraries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (res.ok && data.success && data.item) {
      return { success: true, item: data.item };
    }
    return { success: false, error: data.error || 'एसेट सुरक्षित करने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क त्रुटि' };
  }
}

export async function updateAssetLibraryItem(
  id: string,
  updates: Partial<AssetLibraryItem>,
  authToken?: string
): Promise<{ success: boolean; item?: AssetLibraryItem; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && data.success && data.item) {
      return { success: true, item: data.item };
    }
    return { success: false, error: data.error || 'एसेट अपडेट करने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क त्रुटि' };
  }
}

export async function deleteAssetLibraryItem(
  id: string,
  authToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'एसेट हटाने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क त्रुटि' };
  }
}
