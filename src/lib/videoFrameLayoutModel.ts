// AI NEWS MAKER — Authoritative Shared Video Frame Layout Model
// Canonical source of truth for:
// 1. Master Admin Preview (DynamicFrameGeneratorModal)
// 2. Canvas Marking (DynamicFrameGeneratorModal)
// 3. End-User DOM Live Preview (VideoStudioWeb)
// 4. Snapshot Poster (VideoStudioWeb)
// 5. Video Recording Initialization & requestVideoFrameCallback Loop (VideoStudioWeb)
// 6. MP4 Video Export

import {
  VideoFrameConfig,
  NormalizedRect,
  DynamicAspectRatio,
  HeadlineBlockConfig,
  VideoRibbonLayer,
  VideoOverlayAsset,
  calculateDefaultVideoRect,
} from '../types/dynamicFrame';

export interface NormalizedVideoLayout {
  config: VideoFrameConfig;
  canvasAspect: DynamicAspectRatio;
  canvasWidth: number;
  canvasHeight: number;
  layers: VideoLayoutLayer[];
}

export type VideoLayerType =
  | 'video'
  | 'ribbon'
  | 'overlay'
  | 'logo'
  | 'location'
  | 'date'
  | 'headline_single'
  | 'headline_block'
  | 'watermark'
  | 'footer';

export interface VideoLayoutLayer {
  id: string;
  type: VideoLayerType;
  name: string;
  rect: NormalizedRect;
  zIndex: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  data: any;
}

/**
 * Normalizes a raw or partial videoConfig into an authoritative VideoFrameConfig contract,
 * automatically migrating legacy fields (e.g., 'multi' -> 'multiple', flat x/y/width/height -> rect,
 * locationBadgeRect -> locationRect, bgColor -> backgroundColor).
 */
export function normalizeVideoConfig(
  rawV: any = {},
  canvasRatio: DynamicAspectRatio = '9:16',
  fallbackTextSlotRect?: NormalizedRect
): VideoFrameConfig {
  const is916 = canvasRatio === '9:16';
  const displayMode: 'fit' | 'crop' = rawV.displayMode === 'crop' ? 'crop' : 'fit';
  const videoWindowAspectRatio = rawV.videoWindowAspectRatio || (is916 ? '9:16' : '16:9');

  // Video Window Rectangle
  const videoRect: NormalizedRect = rawV.videoRect && typeof rawV.videoRect.width === 'number'
    ? {
        x: Number(rawV.videoRect.x || 0),
        y: Number(rawV.videoRect.y || 0),
        width: Number(rawV.videoRect.width || 100),
        height: Number(rawV.videoRect.height || 100),
      }
    : calculateDefaultVideoRect(canvasRatio, videoWindowAspectRatio, 'center');

  // Footer Placement & Rectangle
  const footerPosition = rawV.footerPosition || 'bottom';
  const defaultFooterRect: NormalizedRect = footerPosition === 'top' || footerPosition === 'header'
    ? { x: 0, y: 0, width: 100, height: 8 }
    : { x: 0, y: 92, width: 100, height: 8 };

  const footerRect: NormalizedRect = rawV.footerRect && typeof rawV.footerRect.width === 'number'
    ? {
        x: Number(rawV.footerRect.x ?? defaultFooterRect.x),
        y: Number(rawV.footerRect.y ?? defaultFooterRect.y),
        width: Number(rawV.footerRect.width ?? defaultFooterRect.width),
        height: Number(rawV.footerRect.height ?? defaultFooterRect.height),
      }
    : defaultFooterRect;

  // Headline Mode: Canonical values are strictly 'single' | 'multiple'
  const rawHMode = String(rawV.headlineMode || '').toLowerCase().trim();
  const headlineMode: 'single' | 'multiple' = (rawHMode === 'multiple' || rawHMode === 'multi') ? 'multiple' : 'single';
  const headlineLineCount: 2 | 3 = rawV.headlineLineCount === 3 ? 3 : 2;

  // Authoritative Single Headline Rectangle
  const defaultHeadlineRect: NormalizedRect = footerPosition === 'bottom'
    ? { x: 3, y: Math.max(50, Math.round(footerRect.y - (headlineLineCount === 3 ? 15 : 12) - 2)), width: 94, height: headlineLineCount === 3 ? 14 : 11 }
    : { x: 3, y: 80, width: 94, height: headlineLineCount === 3 ? 14 : 11 };

  const headlineRect: NormalizedRect = rawV.headlineRect && typeof rawV.headlineRect.width === 'number'
    ? {
        x: Number(rawV.headlineRect.x),
        y: Number(rawV.headlineRect.y),
        width: Number(rawV.headlineRect.width),
        height: Number(rawV.headlineRect.height),
      }
    : (fallbackTextSlotRect && typeof fallbackTextSlotRect.width === 'number'
        ? { ...fallbackTextSlotRect }
        : defaultHeadlineRect);

  // Headline Blocks (Multi-headline)
  const rawBlocks = Array.isArray(rawV.headlineBlocks) ? rawV.headlineBlocks : [];
  const headlineBlocks: HeadlineBlockConfig[] = rawBlocks.map((b: any, idx: number) => {
    const rect: NormalizedRect = b.rect && typeof b.rect.width === 'number'
      ? {
          x: Number(b.rect.x || 0),
          y: Number(b.rect.y || 0),
          width: Number(b.rect.width || 86),
          height: Number(b.rect.height || 8),
        }
      : {
          x: Number(b.x ?? 7),
          y: Number(b.y ?? (68 + idx * 9)),
          width: Number(b.width ?? 86),
          height: Number(b.height ?? 8),
        };

    const bg = b.backgroundColor || b.bgColor || (idx === 0 ? '#b91c1c' : idx === 1 ? '#047857' : '#1e3a8a');

    return {
      id: String(b.id || `block_${idx + 1}`),
      name: String(b.name || b.role || `ब्लॉक #${idx + 1}`),
      role: String(b.role || (idx === 0 ? 'headline' : idx === 1 ? 'subheadline' : 'kicker')),
      rect,
      text: String(b.text || ''),
      fontFamily: String(b.fontFamily || 'Noto Sans Devanagari'),
      fontSize: Number(b.fontSize || (idx === 0 ? 32 : 24)),
      fontWeight: String(b.fontWeight || 'bold'),
      textColor: String(b.textColor || '#ffffff'),
      highlightColor: b.highlightColor ? String(b.highlightColor) : undefined,
      backgroundColor: bg,
      bgColor: bg,
      alignment: (b.alignment === 'left' || b.alignment === 'right') ? b.alignment : 'center',
      maxLines: b.maxLines === 3 ? 3 : b.maxLines === 2 ? 2 : 1,
      lineHeight: Number(b.lineHeight || 1.3),
      rotation: Number(b.rotation || 0),
      visible: b.visible !== false,
      zIndex: Number(b.zIndex ?? (20 + idx)),
      // Flat coordinates for backward compatibility
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  // Ribbon Layers
  const rawRibbons = Array.isArray(rawV.ribbonLayers) ? rawV.ribbonLayers : [];
  const ribbonLayers: VideoRibbonLayer[] = rawRibbons.map((r: any, idx: number) => {
    const rect: NormalizedRect = r.rect && typeof r.rect.width === 'number'
      ? {
          x: Number(r.rect.x || 0),
          y: Number(r.rect.y || 0),
          width: Number(r.rect.width || 100),
          height: Number(r.rect.height || 6),
        }
      : {
          x: Number(r.x ?? 0),
          y: Number(r.y ?? (58 + idx * 7)),
          width: Number(r.width ?? 100),
          height: Number(r.height ?? 6),
        };

    return {
      id: String(r.id || `ribbon_${idx + 1}`),
      ribbonId: String(r.ribbonId || r.id || 'ribbon_breaking_red'),
      name: String(r.name || `रिबन #${idx + 1}`),
      customRibbonUrl: r.customRibbonUrl ? String(r.customRibbonUrl) : undefined,
      rect,
      backgroundColor: String(r.backgroundColor || '#dc2626'),
      textColor: String(r.textColor || '#ffffff'),
      text: String(r.text || 'BREAKING NEWS'),
      fontSize: Number(r.fontSize || 14),
      visible: r.visible !== false,
      zIndex: Number(r.zIndex ?? (12 + idx)),
      rotation: Number(r.rotation || 0),
      isAnimatedGif: Boolean(r.isAnimatedGif),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  // Overlay Assets (PNG / GIF)
  const rawOverlays = Array.isArray(rawV.overlayAssets) ? rawV.overlayAssets : [];
  const overlayAssets: VideoOverlayAsset[] = rawOverlays.map((o: any, idx: number) => {
    const rect: NormalizedRect = o.rect && typeof o.rect.width === 'number'
      ? {
          x: Number(o.rect.x || 0),
          y: Number(o.rect.y || 0),
          width: Number(o.rect.width || 20),
          height: Number(o.rect.height || 20),
        }
      : {
          x: Number(o.x ?? 75),
          y: Number(o.y ?? 10),
          width: Number(o.width ?? 20),
          height: Number(o.height ?? 20),
        };

    return {
      id: String(o.id || `overlay_${idx + 1}`),
      name: String(o.name || `ओवरले #${idx + 1}`),
      url: String(o.url || ''),
      mediaType: (o.mediaType === 'gif' || (o.url && String(o.url).endsWith('.gif'))) ? 'gif' : 'png',
      rect,
      visible: o.visible !== false,
      zIndex: Number(o.zIndex ?? (14 + idx)),
      rotation: Number(o.rotation || 0),
      opacity: Number(o.opacity ?? 1),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  // Location Rectangle
  const rawLoc = rawV.locationRect || rawV.locationBadgeRect;
  const locationRect: NormalizedRect = rawLoc && typeof rawLoc.width === 'number'
    ? {
        x: Number(rawLoc.x),
        y: Number(rawLoc.y),
        width: Number(rawLoc.width),
        height: Number(rawLoc.height),
      }
    : { x: 68, y: 3, width: 29, height: 6 };

  // Logo Rectangle & Attributes
  const rawLogoRect = rawV.logoRect;
  const logoRect: NormalizedRect = rawLogoRect && typeof rawLogoRect.width === 'number'
    ? {
        x: Number(rawLogoRect.x),
        y: Number(rawLogoRect.y),
        width: Number(rawLogoRect.width),
        height: Number(rawLogoRect.height),
      }
    : { x: 3, y: 3, width: 22, height: 7 };

  const logoType: 'png' | 'gif' = (rawV.logoType === 'gif' || (rawV.logoUrl && String(rawV.logoUrl).endsWith('.gif'))) ? 'gif' : 'png';

  // Date Stamp
  const rawDateRect = rawV.dateRect;
  const dateRect: NormalizedRect = rawDateRect && typeof rawDateRect.width === 'number'
    ? {
        x: Number(rawDateRect.x),
        y: Number(rawDateRect.y),
        width: Number(rawDateRect.width),
        height: Number(rawDateRect.height),
      }
    : { x: 40, y: 3, width: 25, height: 5 };

  // Watermark
  const rawWatermarkRect = rawV.watermarkRect;
  const watermarkRect: NormalizedRect = rawWatermarkRect && typeof rawWatermarkRect.width === 'number'
    ? {
        x: Number(rawWatermarkRect.x),
        y: Number(rawWatermarkRect.y),
        width: Number(rawWatermarkRect.width),
        height: Number(rawWatermarkRect.height),
      }
    : { x: 35, y: 48, width: 30, height: 6 };

  return {
    displayMode,
    videoRect,
    footerPosition,
    footerRect,
    videoWindowAspectRatio,
    safeZoneEnabled: Boolean(rawV.safeZoneEnabled),
    safeZoneConfig: rawV.safeZoneConfig,
    headlineMode,
    headlineLineCount,
    headlineRect,
    headlineBlocks,
    ribbonLayers,
    overlayAssets,
    locationBadgeUrl: rawV.locationBadgeUrl,
    locationBadgeId: rawV.locationBadgeId,
    locationBadgeStyle: rawV.locationBadgeStyle || 'pill',
    locationRect,
    locationBadgeRect: locationRect, // sync alias
    logoRect,
    logoUrl: rawV.logoUrl,
    logoType,
    logoScalePct: Number(rawV.logoScalePct ?? 100),
    logoOpacity: Number(rawV.logoOpacity ?? 1),
    logoRotation: Number(rawV.logoRotation ?? 0),
    dateRect,
    dateVisible: Boolean(rawV.dateVisible),
    dateRotation: Number(rawV.dateRotation ?? 0),
    dateFontFamily: rawV.dateFontFamily || 'Noto Sans Devanagari',
    dateFontSize: Number(rawV.dateFontSize || 14),
    dateTextColor: rawV.dateTextColor || '#ffffff',
    dateBgColor: rawV.dateBgColor,
    watermarkTextEnabled: Boolean(rawV.watermarkTextEnabled),
    watermarkText: String(rawV.watermarkText || 'AI NEWS MAKER'),
    watermarkLogoEnabled: Boolean(rawV.watermarkLogoEnabled),
    watermarkLogoUrl: rawV.watermarkLogoUrl,
    watermarkUserAllowed: rawV.watermarkUserAllowed !== false,
    watermarkRect,
    cropFocalPoint: rawV.cropFocalPoint || { x: 0.5, y: 0.5 },
  };
}

/**
 * Returns an authoritative sorted list of all active layers for DOM and Canvas composition.
 * Layers are sorted strictly by effective z-index so overlay elements render predictably on top of video.
 */
export function getAuthoritativeVideoLayers(
  vConf: VideoFrameConfig,
  context: {
    headlineText?: string;
    subHeadlineText?: string;
    locationText?: string;
    channelTag?: string;
    profileLogoUrl?: string;
    showLocation?: boolean;
    showWatermark?: boolean;
  } = {}
): VideoLayoutLayer[] {
  const layers: VideoLayoutLayer[] = [];

  // 1. Base Video Window Layer (Z: 0)
  layers.push({
    id: 'layer_main_video',
    type: 'video',
    name: 'मुख्य वीडियो (Main Video)',
    rect: vConf.videoRect,
    zIndex: 0,
    rotation: 0,
    opacity: 1,
    visible: true,
    data: {
      displayMode: vConf.displayMode,
      aspectRatio: vConf.videoWindowAspectRatio,
    },
  });

  // 2. Breaking News Ribbon Layers (Z: 10..14)
  if (vConf.ribbonLayers && vConf.ribbonLayers.length > 0) {
    vConf.ribbonLayers.forEach((r, idx) => {
      if (r.visible === false) return;
      layers.push({
        id: `layer_ribbon_${r.id}`,
        type: 'ribbon',
        name: r.name || `रिबन #${idx + 1}`,
        rect: r.rect,
        zIndex: r.zIndex ?? (10 + idx),
        rotation: r.rotation || 0,
        opacity: 1,
        visible: true,
        data: r,
      });
    });
  }

  // 3. Overlay Assets (PNG / GIF) (Z: 14..18)
  if (vConf.overlayAssets && vConf.overlayAssets.length > 0) {
    vConf.overlayAssets.forEach((o, idx) => {
      if (o.visible === false) return;
      layers.push({
        id: `layer_overlay_${o.id}`,
        type: 'overlay',
        name: o.name || `ओवरले #${idx + 1}`,
        rect: o.rect,
        zIndex: o.zIndex ?? (14 + idx),
        rotation: o.rotation || 0,
        opacity: o.opacity ?? 1,
        visible: true,
        data: o,
      });
    });
  }

  // 4. Channel Logo Layer (Z: 20)
  const resolvedLogoUrl = vConf.logoUrl || context.profileLogoUrl;
  layers.push({
    id: 'layer_logo',
    type: 'logo',
    name: 'चैनल लोगो (Logo)',
    rect: vConf.logoRect || { x: 3, y: 3, width: 22, height: 7 },
    zIndex: 20,
    rotation: vConf.logoRotation || 0,
    opacity: vConf.logoOpacity ?? 1,
    visible: true,
    data: {
      logoUrl: resolvedLogoUrl,
      logoType: vConf.logoType || 'png',
      scalePct: vConf.logoScalePct ?? 100,
      channelTag: context.channelTag || 'AI NEWS',
    },
  });

  // 5. Location Badge Layer (Z: 22)
  if (context.showLocation !== false && (vConf.locationRect || context.locationText)) {
    layers.push({
      id: 'layer_location',
      type: 'location',
      name: 'लोकेशन बैज (Location Badge)',
      rect: vConf.locationRect || { x: 68, y: 3, width: 29, height: 6 },
      zIndex: 22,
      rotation: 0,
      opacity: 1,
      visible: true,
      data: {
        location: context.locationText || 'भोपाल',
        badgeUrl: vConf.locationBadgeUrl,
        badgeStyle: vConf.locationBadgeStyle || 'pill',
      },
    });
  }

  // 6. Date Stamp Layer (Z: 24)
  if (vConf.dateVisible) {
    layers.push({
      id: 'layer_date',
      type: 'date',
      name: 'दिनांक मुहर (Date Stamp)',
      rect: vConf.dateRect || { x: 40, y: 3, width: 25, height: 5 },
      zIndex: 24,
      rotation: vConf.dateRotation || 0,
      opacity: 1,
      visible: true,
      data: {
        fontFamily: vConf.dateFontFamily || 'Noto Sans Devanagari',
        fontSize: vConf.dateFontSize || 14,
        textColor: vConf.dateTextColor || '#ffffff',
        bgColor: vConf.dateBgColor,
      },
    });
  }

  // 7. Headline Layers: Either Multi-Headline Blocks OR Single Headline
  if (vConf.headlineMode === 'multiple' && vConf.headlineBlocks && vConf.headlineBlocks.length > 0) {
    vConf.headlineBlocks.forEach((hb, bIdx) => {
      if (hb.visible === false) return;
      const blockText = (bIdx === 0 ? context.headlineText : bIdx === 1 ? context.subHeadlineText : hb.text) || hb.text || '';
      layers.push({
        id: `layer_headline_${hb.id}`,
        type: 'headline_block',
        name: hb.name || `हेडलाइन #${bIdx + 1} (${hb.role || 'Text'})`,
        rect: hb.rect,
        zIndex: hb.zIndex ?? (26 + bIdx),
        rotation: hb.rotation || 0,
        opacity: 1,
        visible: true,
        data: {
          ...hb,
          text: blockText,
        },
      });
    });
  } else {
    // Single Headline
    const hRect = vConf.headlineRect || { x: 3, y: 76, width: 94, height: vConf.headlineLineCount === 3 ? 14 : 11 };
    layers.push({
      id: 'layer_headline_main',
      type: 'headline_single',
      name: `मुख्य हेडलाइन (${vConf.headlineLineCount || 2} लाइन्स)`,
      rect: hRect,
      zIndex: 26,
      rotation: 0,
      opacity: 1,
      visible: true,
      data: {
        headline: context.headlineText || 'यहाँ आपकी वीडियो की मुख्य हेडलाइन दिखाई देगी',
        maxLines: vConf.headlineLineCount || 2,
      },
    });
  }

  // 8. Watermark Layer (Z: 30)
  if (context.showWatermark !== false && (vConf.watermarkTextEnabled || vConf.watermarkLogoEnabled)) {
    layers.push({
      id: 'layer_watermark',
      type: 'watermark',
      name: 'वॉटरमार्क (AI Watermark)',
      rect: vConf.watermarkRect || { x: 35, y: 48, width: 30, height: 6 },
      zIndex: 30,
      rotation: 0,
      opacity: 0.85,
      visible: true,
      data: {
        textEnabled: vConf.watermarkTextEnabled,
        text: vConf.watermarkText || 'AI NEWS MAKER',
        logoEnabled: vConf.watermarkLogoEnabled,
        logoUrl: vConf.watermarkLogoUrl,
      },
    });
  }

  // 9. Movable Footer Layer (Z: 35)
  const fRect = vConf.footerRect || (vConf.footerPosition === 'top' || vConf.footerPosition === 'header'
    ? { x: 0, y: 0, width: 100, height: 8 }
    : { x: 0, y: 92, width: 100, height: 8 });

  layers.push({
    id: 'layer_footer',
    type: 'footer',
    name: `फुटर (${vConf.footerPosition || 'bottom'})`,
    rect: fRect,
    zIndex: 35,
    rotation: 0,
    opacity: 1,
    visible: true,
    data: {
      position: vConf.footerPosition || 'bottom',
    },
  });

  // Sort visible layers strictly by effective zIndex ascending
  return layers.sort((a, b) => a.zIndex - b.zIndex);
}
