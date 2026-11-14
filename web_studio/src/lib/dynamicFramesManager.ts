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
import { getApiBaseUrl, ensureAuthToken, getAuthToken, getAdminAuthHeaders } from './apiConfig';

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
  filter?: DynamicAspectRatio | { aspectRatio?: DynamicAspectRatio; frameType?: string }
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
    const qs = params.toString();
    if (qs) q = `?${qs}`;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/dynamic-frames${q}`);
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
    let token = authToken;
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
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
      body: JSON.stringify({ sampleBase64, selectedRatio }),
    });

    if (res.status === 401 || res.status === 403) {
      const freshToken = await ensureAuthToken(true).catch(() => '');
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(`${baseUrl}/api/dynamic-frames/ai-analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sampleBase64, selectedRatio }),
        });
      }
    }

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
// REUSABLE ASSET LIBRARIES API CLIENT & BUILT-IN FALLBACKS
// -------------------------------------------------------------

export function getDefaultAssetLibrariesFallback(type?: string): AssetLibraryItem[] {
  const defaults: AssetLibraryItem[] = [
    {
      id: "asset_1794132101671_u0g9s",
      name: "Red Map Pin Badge with Divider",
      category: "general",
      type: "location_badge",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='36' viewBox='0 0 160 36'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23E11D48'/><stop offset='100%' stop-color='%23BE123C'/></linearGradient></defs><rect width='156' height='36' rx='6' fill='url(%23bgGrad)'/><path d='M18 10c-3.3 0-6 2.7-6 6 0 4.5 6 11 6 11s6-6.5 6-11c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z' fill='%23FFFFFF'/><line x1='34' y1='6' x2='34' y2='30' stroke='%23FFFFFF' stroke-width='1.5' stroke-opacity='0.4'/><text x='42' y='23' font-family='Arial, sans-serif' font-weight='bold' font-size='14' fill='%23FFFFFF' letter-spacing='0.5'>LOCATION</text></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794132101671,
      updatedAt: 1794132101671,
    },
    {
      id: "callout_bully_forward_story",
      name: "आगे पढ़ें बुलेटिन स्टोरी (Bully Forward)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='goldGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23F59E0B'/><stop offset='50%' stop-color='%23FBBF24'/><stop offset='100%' stop-color='%23D97706'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23goldGrad)' stroke='%23FFFFFF' stroke-width='2'/><circle cx='40' cy='36' r='24' fill='%231E293B'/><polygon points='34,26 50,36 34,46' fill='%23FBBF24'/><text x='76' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%230F172A'>आगे पढ़ें बुलेटिन स्टोरी</text><circle cx='438' cy='36' r='18' fill='%231E293B'/><path d='M432 36 L444 36 M440 30 L446 36 L440 42' stroke='%23FBBF24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794280000000,
      updatedAt: 1794280000000,
    },
    {
      id: "callout_special_gold",
      name: "विशेष बुलेटिन (Special Gold Header)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='440' height='64' viewBox='0 0 440 64'><defs><linearGradient id='gGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23D97706'/><stop offset='100%' stop-color='%2392400E'/></linearGradient></defs><rect x='2' y='4' width='436' height='56' rx='28' fill='url(%23gGrad)' stroke='%23FDE68A' stroke-width='2'/><text x='32' y='38' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>★ विशेष बुलेटिन कवरेज</text><circle cx='400' cy='32' r='14' fill='%23FDE68A'/><polygon points='396,26 406,32 396,38' fill='%2392400E'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794280000000,
      updatedAt: 1794280000000,
    },
    {
      id: "callout_breaking_red",
      name: "ब्रेकिंग न्यूज़ रेड पट्टी (Breaking Red Strip)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='rGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23DC2626'/><stop offset='100%' stop-color='%23991B1B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23rGrad)' stroke='%23FFFFFF' stroke-width='2.5'/><polygon points='38,24 54,36 38,48' fill='%23FFFFFF'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='20' fill='%23FFFFFF'>पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FFFFFF'/><polygon points='436,28 448,36 436,44' fill='%23DC2626'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794280000000,
      updatedAt: 1794280000000,
    },
    {
      id: "callout_story_details_hindi",
      name: "पूरी खबर विवरण में पढ़ें (Crimson & Gold Ribbon)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='cgGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23BE123C'/><stop offset='50%' stop-color='%23E11D48'/><stop offset='100%' stop-color='%239F1239'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23cgGrad)' stroke='%23FBBF24' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23FBBF24'/><polygon points='36,28 48,36 36,44' fill='%23881337'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23FFFFFF'>पूरी खबर विवरण में पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23FBBF24'/><path d='M434 36 L446 36 M442 30 L448 36 L442 42' stroke='%23881337' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794350000000,
      updatedAt: 1794350000000,
    },
    {
      id: "callout_story_info_below",
      name: "पूरी जानकारी नीचे पढ़ें (Navy & Cyan Editorial Badge)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='ncGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%230F172A'/><stop offset='70%' stop-color='%231E293B'/><stop offset='100%' stop-color='%230284C7'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23ncGrad)' stroke='%2338BDF8' stroke-width='2'/><circle cx='40' cy='36' r='20' fill='%230284C7'/><path d='M34 36 L46 36 M42 30 L48 36 L42 42' stroke='%23FFFFFF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23F0F9FF'>पूरी जानकारी नीचे पढ़ें</text><circle cx='440' cy='36' r='16' fill='%2338BDF8'/><polygon points='436,28 446,36 436,44' fill='%230F172A'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794350000000,
      updatedAt: 1794350000000,
    },
    {
      id: "callout_story_detail_read",
      name: "विस्तृत खबर के लिए पढ़ें (Emerald & Amber Pill)",
      category: "general",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='eaGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23065F46'/><stop offset='60%' stop-color='%23047857'/><stop offset='100%' stop-color='%23064E3B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23eaGrad)' stroke='%23F59E0B' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23F59E0B'/><polygon points='36,28 48,36 36,44' fill='%23064E3B'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%23ECFDF5'>विस्तृत खबर के लिए पढ़ें</text><circle cx='440' cy='36' r='16' fill='%23F59E0B'/><path d='M434 36 L446 36 M442 30 L448 36 L442 42' stroke='%23064E3B' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794350000000,
      updatedAt: 1794350000000,
    },
    {
      id: "callout_story_live_update",
      name: "ताजा अपडेट — विवरण में देखें (Ruby Live Pulse)",
      category: "breaking",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='lpGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23991B1B'/><stop offset='50%' stop-color='%23DC2626'/><stop offset='100%' stop-color='%237F1D1D'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23lpGrad)' stroke='%23FEF08A' stroke-width='2.5'/><circle cx='40' cy='36' r='12' fill='%23EF4444' stroke='%23FFFFFF' stroke-width='2'/><text x='66' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='21' fill='%23FFFFFF'>ताजा अपडेट — विवरण में देखें</text><circle cx='440' cy='36' r='16' fill='%23FEF08A'/><polygon points='436,28 446,36 436,44' fill='%23991B1B'/></svg>",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      createdAt: 1794350000000,
      updatedAt: 1794350000000,
    },
    {
      id: "callout_story_full_read",
      name: "विस्तृत विवरण नीचे उपलब्ध है (Royal Indigo & Gold Pill)",
      category: "special",
      type: "callout_png",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='72' viewBox='0 0 480 72'><defs><linearGradient id='riGrad' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23312E81'/><stop offset='50%' stop-color='%234338CA'/><stop offset='100%' stop-color='%231E1B4B'/></linearGradient></defs><rect x='2' y='4' width='476' height='64' rx='32' fill='url(%23riGrad)' stroke='%23FCD34D' stroke-width='2.5'/><circle cx='40' cy='36' r='20' fill='%23FCD34D'/><path d='M34 36 L46 36 M42 30 L48 36 L42 42' stroke='%23312E81' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/><text x='74' y='44' font-family='Arial, sans-serif' font-weight='900' font-size='21' fill='%23FEF3C7'>विस्तृत विवरण नीचे उपलब्ध है</text><circle cx='440' cy='36' r='16' fill='%23FCD34D'/><polygon points='436,28 446,36 436,44' fill='%23312E81'/></svg>",
      enabled: true,
      allowedPlans: ["PRO", "VIP DESK"],
      createdAt: 1794350000000,
      updatedAt: 1794350000000,
    },
    {
      id: "footer_regular_gold",
      name: "रेगुलर क्लीन फ़ुटर (White & Gold)",
      category: "regular",
      type: "custom_footer",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      footerConfig: {
        footerBgColor: "#FFFFFF",
        footerTextColor: "#000000",
        footerHeightPct: 8,
        elements: { showChannelName: false, showWebsite: true, showPhone: true, showSocialIcons: true },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 20,
        elementSpacing: 12,
        paddingX: 16,
        separator: "|",
      },
      createdAt: 1794100000000,
      updatedAt: 1794100000000,
    },
    {
      id: "footer_branding_navy",
      name: "ब्रांडिंग डार्क फ़ुटर (Navy & Gold Accent)",
      category: "branding",
      type: "custom_footer",
      enabled: true,
      allowedPlans: ["ADVANCED", "PRO", "VIP DESK"],
      footerConfig: {
        footerBgColor: "#0F172A",
        footerTextColor: "#FACC15",
        footerHeightPct: 8,
        elements: { showChannelName: false, showWebsite: true, showPhone: true, showSocialIcons: true },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 20,
        elementSpacing: 12,
        paddingX: 16,
        separator: "|",
      },
      createdAt: 1794100000000,
      updatedAt: 1794100000000,
    },
    {
      id: "footer_social_blue",
      name: "सोशल मीडिया हाइलाइट फ़ुटर (Royal Blue)",
      category: "social",
      type: "custom_footer",
      enabled: true,
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      footerConfig: {
        footerBgColor: "#1E40AF",
        footerTextColor: "#FFFFFF",
        footerHeightPct: 8,
        elements: { showChannelName: false, showWebsite: true, showPhone: true, showSocialIcons: true },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 20,
        elementSpacing: 12,
        paddingX: 16,
        separator: "|",
      },
      createdAt: 1794100000000,
      updatedAt: 1794100000000,
    },
    {
      id: "footer_news_breaking_red",
      name: "न्यूज़ अलर्ट रेड फ़ुटर (Breaking Red)",
      category: "news",
      type: "custom_footer",
      enabled: true,
      allowedPlans: ["PRO", "VIP DESK"],
      footerConfig: {
        footerBgColor: "#DC2626",
        footerTextColor: "#FFFFFF",
        footerHeightPct: 8.5,
        elements: { showChannelName: false, showWebsite: true, showPhone: true, showSocialIcons: true },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 20,
        elementSpacing: 12,
        paddingX: 16,
        separator: "|",
      },
      createdAt: 1794100000000,
      updatedAt: 1794100000000,
    },
    {
      id: "footer_special_vip_gold",
      name: "स्पेशल वीआईपी गोल्ड फ़ुटर (VIP Gold Special)",
      category: "special",
      type: "custom_footer",
      enabled: true,
      allowedPlans: ["VIP DESK"],
      footerConfig: {
        footerBgColor: "#FACC15",
        footerTextColor: "#000000",
        footerHeightPct: 9,
        elements: { showChannelName: false, showWebsite: true, showPhone: true, showSocialIcons: true },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 22,
        elementSpacing: 14,
        paddingX: 18,
        separator: "•",
      },
      createdAt: 1794100000000,
      updatedAt: 1794100000000,
    },
  ];

  if (!type || type === 'all') return defaults;
  return defaults.filter((item) => item.type === type);
}

export async function fetchAssetLibraries(type?: string): Promise<AssetLibraryItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const qs = type && type !== 'all' ? `?type=${type}` : '';
    let token = getAuthToken();
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
    }
    const headers: Record<string, string> = {
      ...getAdminAuthHeaders(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/api/admin/asset-libraries${qs}`, { headers });
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
    let token = authToken;
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
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

    if (res.status === 401 || res.status === 403) {
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
    let token = authToken;
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
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

    if (res.status === 401 || res.status === 403) {
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
    let token = authToken;
    if (!token) {
      token = await ensureAuthToken().catch(() => '');
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

    if (res.status === 401 || res.status === 403) {
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
