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
import { normalizeVideoConfig } from './videoFrameLayoutModel';
import { getApiBaseUrl, ensureAuthToken, getAuthToken, getAdminAuthHeaders, isTokenExpired, reauthenticateAdmin } from './apiConfig';

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
  const badgeAssetId = rawH.locationBadgeAssetId || raw.locationBadgeAssetId;
  const libBadge = badgeAssetId ? getAssetLibraryItemById(badgeAssetId) : null;
  const manualAsset = rawH.manualLocationAsset || raw.manualLocationAsset || libBadge?.url;
  const isDarkBadge = badgeAssetId === 'loc_style_compact_chip' || rawH.locationStyle === 'compact_chip' || rawH.locationStyle === 'box' || (libBadge && libBadge.styleKey === 'compact_chip');

  const headerConfig: HeaderConfig = {
    ...rawH,
    showLogo: rawH.showLogo !== false,
    logoPosition: rawH.logoPosition || 'top_left',
    logoRect: rawH.logoRect || (isStory ? { x: 6, y: 3, width: 24, height: 6.5 } : { x: 5, y: 3.5, width: 22, height: 9 }),
    logoScalePct: typeof rawH.logoScalePct === 'number' ? rawH.logoScalePct : 100,
    logoPaddingPx: typeof rawH.logoPaddingPx === 'number' ? rawH.logoPaddingPx : 4,
    showLocation: rawH.showLocation !== false,
    locationRect: rawH.locationRect || (isStory ? { x: 6, y: 10.5, width: 30, height: 3.2 } : { x: 5, y: 13.5, width: 28, height: 4.5 }),
    locationStyle: rawH.locationStyle || libBadge?.styleKey || (isDarkBadge ? 'box' : 'pill'),
    locationBgColor: rawH.locationBgColor || (isDarkBadge ? '#18181B' : (libBadge || manualAsset ? 'transparent' : '#DC2626')),
    locationTextColor: rawH.locationTextColor || libBadge?.typographyConfig?.textColor || '#FFFFFF',
    locationShowIcon: rawH.locationShowIcon !== false,
    locationBadgeMode: rawH.locationBadgeMode || (manualAsset ? 'static_image' : 'dynamic_overlay'),
    locationBadgeAssetId: badgeAssetId,
    manualLocationAsset: manualAsset,
    sliceConfig: rawH.sliceConfig || raw.sliceConfig || libBadge?.sliceConfig,
    textRegion: rawH.textRegion || raw.textRegion || libBadge?.textRegion,
    typographyConfig: rawH.typographyConfig || raw.typographyConfig || libBadge?.typographyConfig,
    locationFontSize: typeof rawH.locationFontSize === 'number' ? rawH.locationFontSize : (libBadge?.typographyConfig?.fontSize ? Math.round(libBadge.typographyConfig.fontSize * 0.45) : 20),
    locationPadding: typeof rawH.locationPadding === 'number' ? rawH.locationPadding : 6,
    locationBorderRadius: typeof rawH.locationBorderRadius === 'number' ? rawH.locationBorderRadius : (isDarkBadge ? 6 : 9999),
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
  const rawLayersEarly: any[] = Array.isArray(raw.layers) ? raw.layers : [];
  const calloutLayer = rawLayersEarly.find((l: any) => l.id === 'layer_callout' || l.type === 'callout');
  const rawC = raw.fullStoryCalloutConfig || {};
  const calloutRect = rawC.rect
    ? { ...rawC.rect, height: rawC.rect.height || 3.5 }
    : (calloutLayer?.rect
      ? { ...calloutLayer.rect, height: calloutLayer.rect.height || 3.5 }
      : (isStory ? { x: 8, y: 85, width: 84, height: 3.5 } : { x: 8, y: 83, width: 84, height: 3.5 }));

  const calloutAssetId = rawC.calloutAssetId || raw.calloutAssetId;
  const libCallout = calloutAssetId ? getAssetLibraryItemById(calloutAssetId) : null;
  const manualCallout = rawC.manualCalloutAsset || raw.calloutAssetUrl || libCallout?.url;

  const fullStoryCalloutConfig: FullStoryCalloutConfig = {
    ...rawC,
    enabled: Boolean(rawC.enabled ?? calloutLayer?.visible ?? (calloutLayer ? true : false)),
    text: rawC.text || '',
    rect: calloutRect,
    fontSize: typeof rawC.fontSize === 'number' ? rawC.fontSize : 22,
    bgColor: rawC.bgColor || 'rgba(0,0,0,0.7)',
    borderColor: rawC.borderColor || '#FFE600',
    showIcon: rawC.showIcon !== false,
    calloutAssetId: calloutAssetId,
    manualCalloutAsset: manualCallout,
    calloutAssetMode: rawC.calloutAssetMode || (manualCallout ? 'static_image' : 'dynamic_overlay'),
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
  const videoConfig: VideoFrameConfig | undefined = (isVideo || raw.videoConfig)
    ? normalizeVideoConfig(raw.videoConfig, raw.aspectRatio, textSlots[0]?.rect)
    : undefined;

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
    calloutAssetUrl: manualCallout || raw.calloutAssetUrl,
    locationBadgeAssetId: badgeAssetId,
    calloutAssetId: calloutAssetId,
    sliceConfig: rawH.sliceConfig || raw.sliceConfig || libBadge?.sliceConfig,
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
    primaryFooterColor: raw.primaryFooterColor || raw.footerConfig?.primaryFooterColor,
    bannedFooterColor: raw.bannedFooterColor || raw.footerConfig?.bannedFooterColor,
    bannedFooterColors: Array.isArray(raw.bannedFooterColors)
      ? raw.bannedFooterColors
      : (raw.bannedFooterColor ? [raw.bannedFooterColor] : []),
    footerMode: raw.footerMode || (raw.customFooterId ? 'custom_footer' : 'branding'),
    layers: rawLayers.length > 0 ? rawLayers : layers,
  };
}

// -------------------------------------------------------------
// DEFAULT SEED DYNAMIC FRAMES
// -------------------------------------------------------------

export const DEFAULT_DYNAMIC_FRAMES: DynamicFrameTemplate[] = [];

// -------------------------------------------------------------
// LOCALSTORAGE & SERVER SYNC IMPLEMENTATION
// -------------------------------------------------------------

const TOMBSTONE_STORAGE_KEY = 'deleted_dynamic_frame_ids';

export function getDeletedDynamicFrameIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function recordDeletedDynamicFrameId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedDynamicFrameIds();
    set.add(id);
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getLocalDynamicFrames(): DynamicFrameTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_DYNAMIC_FRAMES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    if (!raw) return DEFAULT_DYNAMIC_FRAMES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_DYNAMIC_FRAMES;

    // Merge default seeds if missing (df_reg_4_5_clean is forbidden, canonical is strictly graphic_001)
    const FORBIDDEN_IDS = new Set([
      'df_reg_4_5_clean',
      'df_testing_1_double',
      'df_bayaan_4_5_red',
      'df_story_9_16_standard',
      'df_story_9_16_breaking',
    ]);
    const tombstones = getDeletedDynamicFrameIds();
    const existingIds = new Set(
      parsed
        .filter((f: any) => !FORBIDDEN_IDS.has(f.id) && f.id !== 'df_reg_4_5_clean' && !tombstones.has(f.id) && !tombstones.has(f.name))
        .map((f: DynamicFrameTemplate) => f.id)
    );
    const merged = parsed.filter(
      (f: any) =>
        !FORBIDDEN_IDS.has(f.id) &&
        f.id !== 'df_reg_4_5_clean' &&
        !tombstones.has(f.id) &&
        !tombstones.has(f.name) &&
        !(f.id !== 'graphic_001' && (f.name?.includes('रेगुलर क्लीन') || f.name?.toLowerCase()?.includes('regular clean')))
    );
    for (const def of DEFAULT_DYNAMIC_FRAMES) {
      if (!existingIds.has(def.id) && !tombstones.has(def.id)) {
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
  const found = local.find((f) => f.id === id || f.name === id);
  if (found) return found;
  const def = DEFAULT_DYNAMIC_FRAMES.find((f) => f.id === id || f.name === id);
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

export async function fetchDynamicFramesFromApi(
  filter?: DynamicAspectRatio | { aspectRatio?: DynamicAspectRatio; frameType?: string; videoTargetMode?: 'quick_video' | 'studio_mode' | 'all' }
): Promise<DynamicFrameTemplate[]> {
  let filterRatio: DynamicAspectRatio | undefined = undefined;
  let q = '';

  if (typeof filter === 'string') {
    filterRatio = filter;
    q = `?aspectRatio=${encodeURIComponent(filter)}`;
  } else if (filter && typeof filter === 'object') {
    const params = new URLSearchParams();
    if (filter.aspectRatio) {
      filterRatio = filter.aspectRatio;
      params.append('aspectRatio', filter.aspectRatio);
    }
    if (filter.frameType) {
      params.append('frameType', filter.frameType);
    }
    if (filter.videoTargetMode && filter.videoTargetMode !== 'all') {
      params.append('videoTargetMode', filter.videoTargetMode);
    }
    const qs = params.toString();
    if (qs) q = `?${qs}`;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/api/dynamic-frames${q}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.frames)) {
        const normalized = data.frames.map(normalizeDynamicFrame);
        // The backend is authoritative: API records take precedence over stale localStorage
        const local = getLocalDynamicFrames();
        const map = new Map<string, DynamicFrameTemplate>();
        local.forEach((f) => {
          if (f.id.startsWith('temp_')) map.set(f.id, f);
        });
        normalized.forEach((f) => map.set(f.id, f));
        const merged = Array.from(map.values());
        saveLocalDynamicFrames(merged);
        return filterRatio ? merged.filter((f) => f.aspectRatio === filterRatio) : merged;
      }
    }
  } catch (err) {
    console.warn('Network error fetching dynamic frames from API, falling back to local storage:', err);
  }
  const local = getLocalDynamicFrames();
  return filterRatio ? local.filter((f) => f.aspectRatio === filterRatio) : local;
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
    recordDeletedDynamicFrameId(frameId);
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/dynamic-frames/${frameId}`, {
      method: 'DELETE',
      headers,
    });
    const local = getLocalDynamicFrames();
    saveLocalDynamicFrames(local.filter((f) => f.id !== frameId && f.name !== frameId && !(frameId === '11111' && f.id.includes('11111')) && !(frameId === '2222' && f.id.includes('2222'))));
    return res.ok;
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
  canvasRatio?: string;
  headlineMaxLines?: number;
  headerRect: { x: number; y: number; width: number; height: number };
  logoRect: { x: number; y: number; width: number; height: number };
  locationRect: { x: number; y: number; width: number; height: number };
  headlineRect: { x: number; y: number; width: number; height: number };
  photoRect?: { x: number; y: number; width: number; height: number };
  videoRect?: { x: number; y: number; width: number; height: number };
  recommendedPhotoSlots: Array<{
    name: string;
    slotType: 'normal' | 'cutout' | 'supporting';
    rect: { x: number; y: number; width: number; height: number };
  }>;
  photoSlots?: Array<{
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
  authToken?: string,
  pngFrameBase64?: string,
  isVideoMode?: boolean
): Promise<{ success: boolean; result?: AiFrameAnalysisResult; error?: string; isFallback?: boolean; warning?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    let token = authToken && !isTokenExpired(authToken) ? authToken : '';
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
      if (!token || isTokenExpired(token)) token = await ensureAuthToken(true).catch(() => '');
      if (!token) token = getAuthToken();
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${baseUrl}/api/dynamic-frames/ai-analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sampleBase64, selectedRatio, pngFrameBase64, isVideoMode }),
    });

    if (res.status === 401) {
      const freshToken = await ensureAuthToken(true).catch(() => '');
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(`${baseUrl}/api/dynamic-frames/ai-analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sampleBase64, selectedRatio, pngFrameBase64, isVideoMode }),
        });
      }
    }

    const data = await res.json();
    if (res.ok && data.success && data.result) {
      return {
        success: true,
        result: data.result,
        isFallback: Boolean(data.isFallback),
        warning: data.warning,
      };
    }
    return {
      success: false,
      error: data.error || data.warning || 'AI विश्लेषण में असमर्थ',
      isFallback: Boolean(data.isFallback),
      warning: data.warning,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'AI विश्लेषण सर्वर से कनेक्ट नहीं हो सका' };
  }
}


// -------------------------------------------------------------
// REUSABLE ASSET LIBRARIES API CLIENT & BUILT-IN FALLBACKS
// -------------------------------------------------------------

export function getDefaultAssetLibrariesFallback(type?: string): AssetLibraryItem[] {
  const defaults: AssetLibraryItem[] = [
  {
    "id": "loc_style_classic_ribbon_pin",
    "name": "Classic Ribbon Pin (क्लासिक रिबन पिन)",
    "type": "location_badge",
    "category": "ribbon",
    "styleKey": "classic_ribbon",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><defs><linearGradient id='crpGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23DC2626'/><stop offset='70%' stop-color='%23B91C1C'/><stop offset='100%' stop-color='%23991B1B'/></linearGradient></defs><rect x='3' y='4' width='354' height='64' rx='12' fill='url(%23crpGrad)' stroke='%23FACC15' stroke-width='2.5'/><circle cx='38' cy='36' r='18' fill='%23FACC15'/><path d='M38 23 C32 23 27 28 27 34 C27 41 38 50 38 50 C38 50 49 41 49 34 C49 28 44 23 38 23 Z' fill='%23DC2626'/><circle cx='38' cy='33' r='4' fill='%23FFFFFF'/><line x1='66' y1='14' x2='66' y2='58' stroke='%23FACC15' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_glassmorphism_pill",
    "name": "Glassmorphism Pill (ग्लासमॉर्फिज्म पिल)",
    "type": "location_badge",
    "category": "modern",
    "styleKey": "glass_pill",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='32' fill='%230F172AE6' stroke='%2306B6D4' stroke-width='2.5'/><circle cx='38' cy='36' r='16' fill='%2306B6D4'/><path d='M38 25 C33 25 29 29 29 34 C29 40 38 47 38 47 C38 47 47 40 47 34 C47 29 43 25 38 25 Z' fill='%230F172A'/><circle cx='38' cy='33' r='3.5' fill='%23FFFFFF'/><line x1='64' y1='16' x2='64' y2='56' stroke='%2306B6D4' stroke-width='1.5' stroke-dasharray='3 3'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#38BDF8",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.1,
      "centerMinPct": 0.68
    }
  },
  {
    "id": "loc_style_3d_bevel_plate",
    "name": "3D Bevel Plate (3D बेवेल प्लेट)",
    "type": "location_badge",
    "category": "3d",
    "styleKey": "3d_bevel",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><defs><linearGradient id='bevelGrad' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='%23334155'/><stop offset='50%' stop-color='%231E293B'/><stop offset='100%' stop-color='%230F172A'/></linearGradient></defs><rect x='3' y='4' width='354' height='64' rx='10' fill='url(%23bevelGrad)' stroke='%2364748B' stroke-width='3'/><polygon points='16,36 34,18 52,36 34,54' fill='%23E2E8F0'/><circle cx='34' cy='36' r='6' fill='%23DC2626'/><line x1='66' y1='14' x2='66' y2='58' stroke='%23F59E0B' stroke-width='2.5'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_minimal_tag",
    "name": "Minimal Tag (मिनिमल टैग)",
    "type": "location_badge",
    "category": "minimal",
    "styleKey": "minimal_tag",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='6' width='354' height='60' rx='8' fill='%23000000' stroke='%23E2E8F0' stroke-width='1.5'/><circle cx='36' cy='36' r='14' fill='%23EF4444'/><circle cx='36' cy='36' r='5' fill='%23FFFFFF'/><line x1='60' y1='18' x2='60' y2='54' stroke='%23475569' stroke-width='1.5'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 20,
      "y": 15,
      "width": 76,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.2,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.72
    }
  },
  {
    "id": "loc_style_gradient_flare",
    "name": "Gradient Flare (ग्रेडिएंट फ्लेयर)",
    "type": "location_badge",
    "category": "vibrant",
    "styleKey": "gradient_flare",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><defs><linearGradient id='flareGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23EA580C'/><stop offset='50%' stop-color='%23DC2626'/><stop offset='100%' stop-color='%237F1D1D'/></linearGradient></defs><rect x='3' y='4' width='354' height='64' rx='16' fill='url(%23flareGrad)' stroke='%23FED7AA' stroke-width='2'/><circle cx='38' cy='36' r='17' fill='%23FFF7ED'/><path d='M38 24 C33 24 28 29 28 35 C28 42 38 49 38 49 C38 49 48 42 48 35 C48 29 43 24 38 24 Z' fill='%23EA580C'/><circle cx='38' cy='34' r='3.5' fill='%23FFFFFF'/><line x1='66' y1='14' x2='66' y2='58' stroke='%23FED7AA' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_dark_neon_outline",
    "name": "Dark Neon Outline (डार्क नियॉन आउटलाइन)",
    "type": "location_badge",
    "category": "neon",
    "styleKey": "dark_neon",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='14' fill='%23050811' stroke='%2322D3EE' stroke-width='3'/><rect x='16' y='18' width='36' height='36' rx='8' fill='%2322D3EE22' stroke='%2322D3EE' stroke-width='2'/><circle cx='34' cy='36' r='7' fill='%2322D3EE'/><line x1='64' y1='14' x2='64' y2='58' stroke='%2322D3EE' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#22D3EE",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_dual_tone_split",
    "name": "Dual Tone Split (ड्यूअल टोन स्प्लिट)",
    "type": "location_badge",
    "category": "dualtone",
    "styleKey": "dual_tone",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='12' fill='%231E3A8A' stroke='%23FACC15' stroke-width='2'/><path d='M3 16 C3 9.4 8.4 4 15 4 L72 4 L56 68 L15 68 C8.4 68 3 62.6 3 56 Z' fill='%23DC2626'/><circle cx='32' cy='36' r='14' fill='%23FACC15'/><circle cx='32' cy='36' r='6' fill='%23DC2626'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_vintage_stamp",
    "name": "Vintage Stamp (विंटेज स्टैम्प)",
    "type": "location_badge",
    "category": "vintage",
    "styleKey": "vintage_stamp",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='4' y='5' width='352' height='62' rx='6' fill='%23450A0A' stroke='%23FBBF24' stroke-width='2' stroke-dasharray='6 3'/><rect x='10' y='11' width='340' height='50' rx='4' fill='none' stroke='%23FBBF24' stroke-width='1'/><circle cx='38' cy='36' r='16' fill='%23FBBF24'/><circle cx='38' cy='36' r='12' fill='none' stroke='%23450A0A' stroke-width='2'/><circle cx='38' cy='36' r='4' fill='%23450A0A'/><line x1='66' y1='14' x2='66' y2='58' stroke='%23FBBF24' stroke-width='1.5'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FDE68A",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_modern_floating_capsule",
    "name": "Modern Floating Capsule (मॉडर्न फ्लोटिंग कैप्सूल)",
    "type": "location_badge",
    "category": "modern",
    "styleKey": "floating_capsule",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='32' fill='%23111827' stroke='%2310B981' stroke-width='2.5'/><circle cx='38' cy='36' r='16' fill='%2310B981'/><circle cx='38' cy='36' r='6' fill='%23111827'/><line x1='64' y1='16' x2='64' y2='56' stroke='%2310B981' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.1,
      "centerMinPct": 0.68
    }
  },
  {
    "id": "loc_style_metallic_badge",
    "name": "Metallic Badge (मेटैलिक बैज)",
    "type": "location_badge",
    "category": "metallic",
    "styleKey": "metallic_badge",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><defs><linearGradient id='metalGrad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23CBD5E1'/><stop offset='50%' stop-color='%2394A3B8'/><stop offset='100%' stop-color='%2364748B'/></linearGradient></defs><rect x='3' y='4' width='354' height='64' rx='10' fill='url(%23metalGrad)' stroke='%23F1F5F9' stroke-width='2.5'/><circle cx='38' cy='36' r='16' fill='%230F172A'/><circle cx='38' cy='36' r='7' fill='%23EF4444'/><line x1='66' y1='14' x2='66' y2='58' stroke='%230F172A' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#0F172A",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.7
    }
  },
  {
    "id": "loc_style_compact_chip",
    "name": "Compact Chip (कॉम्पैक्ट चिप)",
    "type": "location_badge",
    "category": "compact",
    "styleKey": "compact_chip",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='6' width='354' height='60' rx='6' fill='%2318181B' stroke='%23FFFFFF' stroke-width='2.5'/><circle cx='36' cy='36' r='16' fill='%23DC2626'/><path d='M36 26 C32 26 29 29 29 33 C29 38 36 44 36 44 C36 44 43 38 43 33 C43 29 40 26 36 26 Z' fill='%23FFFFFF'/><circle cx='36' cy='33' r='2.5' fill='%23DC2626'/><line x1='60' y1='14' x2='60' y2='58' stroke='%23FFFFFF' stroke-width='1.5' stroke-opacity='0.6'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 20,
      "y": 15,
      "width": 76,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.2,
      "rightWidthPct": 0.08,
      "centerMinPct": 0.72
    }
  },
  {
    "id": "loc_style_elegant_outline_pill",
    "name": "Elegant Outline Pill (एलिगेंट आउटलाइन पिल)",
    "type": "location_badge",
    "category": "elegant",
    "styleKey": "elegant_pill",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='32' fill='%23172554' stroke='%23EAB308' stroke-width='2.5'/><circle cx='38' cy='36' r='16' fill='none' stroke='%23EAB308' stroke-width='2.5'/><circle cx='38' cy='36' r='6' fill='%23EAB308'/><line x1='64' y1='16' x2='64' y2='56' stroke='%23EAB308' stroke-width='2'/></svg>",
    "enabled": true,
    "textRegion": {
      "x": 22,
      "y": 15,
      "width": 74,
      "height": 70
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 48,
      "fontWeight": "bold",
      "textColor": "#FEF08A",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.22,
      "rightWidthPct": 0.1,
      "centerMinPct": 0.68
    }
  },
  {
    "id": "asset_1794132101671_u0g9s",
    "name": "Red Map Pin Badge with Divider",
    "type": "location_badge",
    "category": "general",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='72' viewBox='0 0 360 72'><rect x='3' y='4' width='354' height='64' rx='32' fill='%23DC2626' stroke='%23FFFFFF' stroke-width='2.5'/><circle cx='38' cy='36' r='16' fill='%23FFFFFF'/><path d='M38 27 C34 27 31 30 31 34 C31 39 38 45 38 45 C38 45 45 39 45 34 C45 30 42 27 38 27 Z' fill='%23DC2626'/><circle cx='38' cy='34' r='2.5' fill='%23FFFFFF'/><line x1='64' y1='16' x2='64' y2='56' stroke='%23FFFFFF' stroke-width='2'/></svg>",
    "enabled": true,
    "createdAt": 1794132101671,
    "updatedAt": 1794132144005,
    "textRegion": {
      "x": 32,
      "y": 24,
      "width": 58,
      "height": 55
    },
    "typographyConfig": {
      "fontFamily": "Mukta",
      "fontSize": 50,
      "fontWeight": "bold",
      "textColor": "#FFFFFF",
      "textAlign": "center"
    },
    "sliceConfig": {
      "leftWidthPct": 0.28,
      "rightWidthPct": 0.15,
      "centerMinPct": 0.57
    }
  },
  {
    "id": "callout_bully_forward_story",
    "name": "पूरी खबर विवरण कॉलआउट (Full Story Callout)",
    "category": "general",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23DC2626'/><stop offset='60%' stop-color='%23991B1B'/><stop offset='100%' stop-color='%231E293B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23bgGrad)' stroke='%23FACC15' stroke-width='3'/><polygon points='38,24 54,36 38,48' fill='%23FACC15'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FACC15'/><polygon points='436,28 448,36 436,44' fill='%23000000'/></svg>",
    "enabled": true,
    "createdAt": 1793880000000,
    "updatedAt": 1793880000000
  },
  {
    "id": "footer_regular_gold",
    "name": "रेगुलर क्लीन फ़ुटर (White & Gold)",
    "type": "custom_footer",
    "category": "regular",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "footerConfig": {
      "footerBgColor": "#FFFFFF",
      "footerTextColor": "#000000",
      "footerHeightPct": 8,
      "elements": {
        "showChannelName": false,
        "showWebsite": true,
        "showPhone": true,
        "showSocialIcons": true
      },
      "alignment": "center",
      "channelNameAlign": "left",
      "websiteAlign": "center",
      "socialIconsAlign": "left",
      "phoneAlign": "right",
      "iconSize": 20,
      "elementSpacing": 12,
      "paddingX": 16,
      "separator": "|"
    },
    "createdAt": 1794100000000,
    "updatedAt": 1794100000000
  },
  {
    "id": "footer_branding_navy",
    "name": "ब्रांडिंग डार्क फ़ुटर (Navy & Gold Accent)",
    "type": "custom_footer",
    "category": "branding",
    "enabled": true,
    "allowedPlans": [
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "footerConfig": {
      "footerBgColor": "#0F172A",
      "footerTextColor": "#FACC15",
      "footerHeightPct": 8,
      "elements": {
        "showChannelName": false,
        "showWebsite": true,
        "showPhone": true,
        "showSocialIcons": true
      },
      "alignment": "center",
      "channelNameAlign": "left",
      "websiteAlign": "center",
      "socialIconsAlign": "left",
      "phoneAlign": "right",
      "iconSize": 20,
      "elementSpacing": 12,
      "paddingX": 16,
      "separator": "|"
    },
    "createdAt": 1794100000000,
    "updatedAt": 1794100000000
  },
  {
    "id": "footer_social_blue",
    "name": "सोशल मीडिया हाइलाइट फ़ुटर (Royal Blue)",
    "type": "custom_footer",
    "category": "social",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "footerConfig": {
      "footerBgColor": "#1E40AF",
      "footerTextColor": "#FFFFFF",
      "footerHeightPct": 8,
      "elements": {
        "showChannelName": false,
        "showWebsite": true,
        "showPhone": true,
        "showSocialIcons": true
      },
      "alignment": "center",
      "channelNameAlign": "left",
      "websiteAlign": "center",
      "socialIconsAlign": "left",
      "phoneAlign": "right",
      "iconSize": 20,
      "elementSpacing": 12,
      "paddingX": 16,
      "separator": "|"
    },
    "createdAt": 1794100000000,
    "updatedAt": 1794100000000
  },
  {
    "id": "footer_news_breaking_red",
    "name": "न्यूज़ अलर्ट रेड फ़ुटर (Breaking Red)",
    "type": "custom_footer",
    "category": "news",
    "enabled": true,
    "allowedPlans": [
      "PRO",
      "VIP DESK"
    ],
    "footerConfig": {
      "footerBgColor": "#DC2626",
      "footerTextColor": "#FFFFFF",
      "footerHeightPct": 8.5,
      "elements": {
        "showChannelName": false,
        "showWebsite": true,
        "showPhone": true,
        "showSocialIcons": true
      },
      "alignment": "center",
      "channelNameAlign": "left",
      "websiteAlign": "center",
      "socialIconsAlign": "left",
      "phoneAlign": "right",
      "iconSize": 20,
      "elementSpacing": 12,
      "paddingX": 16,
      "separator": "|"
    },
    "createdAt": 1794100000000,
    "updatedAt": 1794100000000
  },
  {
    "id": "footer_special_vip_gold",
    "name": "स्पेशल वीआईपी गोल्ड फ़ुटर (VIP Gold Special)",
    "type": "custom_footer",
    "category": "special",
    "enabled": true,
    "allowedPlans": [
      "VIP DESK"
    ],
    "footerConfig": {
      "footerBgColor": "#FACC15",
      "footerTextColor": "#000000",
      "footerHeightPct": 9,
      "elements": {
        "showChannelName": false,
        "showWebsite": true,
        "showPhone": true,
        "showSocialIcons": true
      },
      "alignment": "center",
      "channelNameAlign": "left",
      "websiteAlign": "center",
      "socialIconsAlign": "left",
      "phoneAlign": "right",
      "iconSize": 22,
      "elementSpacing": 14,
      "paddingX": 18,
      "separator": "•"
    },
    "createdAt": 1794100000000,
    "updatedAt": 1794100000000
  },
  {
    "id": "callout_special_gold",
    "name": "गोल्डन वीआईपी स्टोरी कॉलआउट (Gold VIP)",
    "category": "special",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='gGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%2378350F'/><stop offset='50%' stop-color='%23B45309'/><stop offset='100%' stop-color='%231E293B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23gGrad)' stroke='%23FDE047' stroke-width='3'/><polygon points='38,24 54,36 38,48' fill='%23FDE047'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FEF08A'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FDE047'/><polygon points='436,28 448,36 436,44' fill='%2378350F'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794280000000,
    "updatedAt": 1794280000000
  },
  {
    "id": "callout_breaking_red",
    "name": "ब्रेकिंग न्यूज़ रेड कॉलआउट (Breaking Red)",
    "category": "breaking",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='rGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23B91C1C'/><stop offset='70%' stop-color='%23DC2626'/><stop offset='100%' stop-color='%23991B1B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23rGrad)' stroke='%23FFFFFF' stroke-width='2.5'/><polygon points='38,24 54,36 38,48' fill='%23FFFFFF'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FFFFFF'/><polygon points='436,28 448,36 436,44' fill='%23DC2626'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794280000000,
    "updatedAt": 1794280000000
  },
  {
    "id": "callout_story_details_hindi",
    "name": "पूरी खबर विवरण में पढ़ें (Crimson & Gold Ribbon)",
    "category": "general",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='cgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23BE123C'/><stop offset='50%' stop-color='%23E11D48'/><stop offset='100%' stop-color='%239F1239'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23cgGrad)' stroke='%23FBBF24' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23FBBF24'/><polygon points='36,28 48,36 36,44' fill='%23881337'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23FFFFFF'>पूरी खबर विवरण में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FBBF24'/><path d='M434 36 L446 36 M442 30 L448 36 L442 42' stroke='%23881337' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794350000000,
    "updatedAt": 1794350000000
  },
  {
    "id": "callout_story_info_below",
    "name": "पूरी जानकारी नीचे पढ़ें (Navy & Cyan Editorial Badge)",
    "category": "general",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='ncGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%230F172A'/><stop offset='70%' stop-color='%231E293B'/><stop offset='100%' stop-color='%230284C7'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23ncGrad)' stroke='%2338BDF8' stroke-width='2'/><circle cx='40' cy='36' r='20' fill='%230284C7'/><path d='M34 36 L46 36 M42 30 L48 36 L42 42' stroke='%23FFFFFF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23F0F9FF'>पूरी जानकारी नीचे पढ़ें</text><circle cx='440' cy='36' r='16' fill='%2338BDF8'/><polygon points='436,28 446,36 436,44' fill='%230F172A'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794350000000,
    "updatedAt": 1794350000000
  },
  {
    "id": "callout_story_detail_read",
    "name": "विस्तृत खबर के लिए पढ़ें (Emerald & Amber Pill)",
    "category": "general",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='eaGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23065F46'/><stop offset='60%' stop-color='%23047857'/><stop offset='100%' stop-color='%23064E3B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23eaGrad)' stroke='%23F59E0B' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23F59E0B'/><polygon points='36,28 48,36 36,44' fill='%23064E3B'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23ECFDF5'>विस्तृत खबर के लिए पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23F59E0B'/><path d='M434 36 L446 36 M442 30 L448 36 L442 42' stroke='%23064E3B' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794350000000,
    "updatedAt": 1794350000000
  },
  {
    "id": "callout_story_live_update",
    "name": "ताजा अपडेट — विवरण में देखें (Ruby Live Pulse)",
    "category": "breaking",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='lpGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23991B1B'/><stop offset='50%' stop-color='%23DC2626'/><stop offset='100%' stop-color='%237F1D1D'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23lpGrad)' stroke='%23FEF08A' stroke-width='2.5'/><circle cx='40' cy='36' r='12' fill='%23EF4444' stroke='%23FFFFFF' stroke-width='2'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='21' fill='%23FFFFFF'>ताजा अपडेट — विवरण में देखें</text><circle cx='440' cy='36' r='16' fill='%23FEF08A'/><polygon points='436,28 446,36 436,44' fill='%23991B1B'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "BASIC",
      "ADVANCED",
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794350000000,
    "updatedAt": 1794350000000
  },
  {
    "id": "callout_story_full_read",
    "name": "विस्तृत विवरण नीचे उपलब्ध है (Royal Indigo & Gold Pill)",
    "category": "special",
    "type": "callout_png",
    "url": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='riGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23312E81'/><stop offset='50%' stop-color='%234338CA'/><stop offset='100%' stop-color='%231E1B4B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23riGrad)' stroke='%23FCD34D' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23FCD34D'/><path d='M34 36 L46 36 M42 30 L48 36 L42 42' stroke='%23312E81' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='21' fill='%23FEF3C7'>विस्तृत विवरण नीचे उपलब्ध है</text><circle cx='440' cy='36' r='16' fill='%23FCD34D'/><polygon points='436,28 446,36 436,44' fill='%23312E81'/></svg>",
    "enabled": true,
    "allowedPlans": [
      "PRO",
      "VIP DESK"
    ],
    "createdAt": 1794350000000,
    "updatedAt": 1794350000000
  }
];

  if (!type || type === 'all') return defaults;
  return defaults.filter((item) => item.type === type);
}

export function getAssetLibraryItemById(id?: string): AssetLibraryItem | undefined {
  if (!id) return undefined;
  const items = getDefaultAssetLibrariesFallback();
  return items.find((item) => item.id === id);
}

export async function fetchAssetLibraries(type?: string): Promise<AssetLibraryItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const qs = type && type !== 'all' ? `?type=${type}` : '';
    let token = getAuthToken();
    if (!token || isTokenExpired(token)) {
      token = await ensureAuthToken().catch(() => '');
      if (!token || isTokenExpired(token)) token = await ensureAuthToken(true).catch(() => '');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${baseUrl}/api/asset-libraries${qs}`, { headers });
    if (!res.ok && res.status !== 404) {
      // Fallback check to admin endpoint only if authorized
      res = await fetch(`${baseUrl}/api/admin/asset-libraries${qs}`, { headers });
    }
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return data.items;
      }
    }
    return getDefaultAssetLibrariesFallback(type);
  } catch (err) {
    console.warn('Failed to fetch asset libraries from API, returning defaults:', err);
    return getDefaultAssetLibrariesFallback(type);
  }
}

export async function saveAssetLibraryItem(
  item: Partial<AssetLibraryItem>,
  authToken?: string
): Promise<{ success: boolean; item?: AssetLibraryItem; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    let token = authToken && !isTokenExpired(authToken) ? authToken : '';
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
      if (!token || isTokenExpired(token)) token = await ensureAuthToken(true).catch(() => '');
      if (!token) token = getAuthToken();
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${baseUrl}/api/admin/asset-libraries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });

    if (res.status === 401) {
      const freshToken = await ensureAuthToken(true).catch(() => '');
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(`${baseUrl}/api/admin/asset-libraries`, {
          method: 'POST',
          headers,
          body: JSON.stringify(item),
        });
      }
    }

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
    let token = authToken && !isTokenExpired(authToken) ? authToken : '';
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
      if (!token || isTokenExpired(token)) token = await ensureAuthToken(true).catch(() => '');
      if (!token) token = getAuthToken();
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (res.status === 401) {
      const freshToken = await ensureAuthToken(true).catch(() => '');
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates),
        });
      }
    }

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
    let token = authToken && !isTokenExpired(authToken) ? authToken : '';
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
      if (!token || isTokenExpired(token)) token = await ensureAuthToken(true).catch(() => '');
      if (!token) token = getAuthToken();
    }
    const headers: Record<string, string> = {
      ...getAdminAuthHeaders(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (res.status === 401) {
      const freshToken = await ensureAuthToken(true).catch(() => '');
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(`${baseUrl}/api/admin/asset-libraries/${id}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'एसेट हटाने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क त्रुटि' };
  }
}
