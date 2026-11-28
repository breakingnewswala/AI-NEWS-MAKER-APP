import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Type,
  AlertCircle,
  Play,
  Pause,
  Upload,
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  Sliders,
  Maximize,
  Volume2,
  VolumeX,
  Tv,
  Film,
  Flame,
  Check,
  MapPin,
  Tag,
  Scissors,
  ZoomIn,
  MoveVertical,
  Globe,
  Phone,
  ArrowLeft,
  Info,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Music,
  FastForward,
  Layers,
  Save,
  CheckCircle,
  FileText,
  X,
  Mic,
  Trash2,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { VideoFeedItem, INITIAL_VIDEOS } from '../data/newsFeedData';
import { ChannelProfile } from '../types';
import { getApiUrl } from '../lib/apiConfig';
import { DynamicFrameTemplate } from '../types/dynamicFrame';
import { normalizeVideoConfig, getAuthoritativeVideoLayers } from '../lib/videoFrameLayoutModel';
import { fetchDynamicFramesFromApi, getLocalDynamicFrames } from '../lib/dynamicFramesManager';
import { processNewsLocally } from '../lib/clientAiProcessor';
import { generate5BalancedHeadlineOptions } from '../lib/speakerUtils';
import { newsAudio, BUILTIN_NEWS_TRACKS } from '../lib/newsAudioEngine';
import { showAppConfirm } from '../lib/notificationService';
import { generateVideoDownloadFileName } from '../lib/dateUtils';
import { saveVideoDraft } from '../lib/draftsManager';
import { addProjectToHistory } from '../lib/projectHistoryManager';
import { getSocialIconSrc } from '../lib/socialIconsData';
import {
  VIDEO_FRAME_DEFINITIONS,
  getVideoFrameDefinition,
  getCompatibleFrames,
  VideoFrameDefinition,
} from '../lib/videoTemplatesRegistry';
import { isEffectiveSuperAdmin, isUserAdmin, isUserSuperAdmin, getUserSubscription } from '../lib/userPlanManager';

export type VideoAspect = '4:5' | '9:16' | '16:9' | '1:1' | '4:3';
export type VideoTransitionType = 'none' | 'fade' | 'flash' | 'zoom' | 'slide' | 'glitch';

export interface VideoClipItem {
  id: string;
  name: string;
  url: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  zoomScale?: number;
  offsetY?: number;
}

interface VideoStudioWebProps {
  currentUser?: ReporterUser | null;
  initialVideo?: VideoFeedItem | null;
  initialVideoUrl?: string;
  initialHeadline?: string;
  onOpenCloudSettings?: () => void;
  onShowToast?: (msg: string) => void;
  onBackToGraphic?: () => void;
  onNavigateHome?: () => void;
}

function getSavedProfile(): ChannelProfile | null {
  try {
    const raw = localStorage.getItem('user_channel_profile');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

interface DrawCompositionOptions {
  video: HTMLVideoElement | null;
  selectedFrameId: string;
  headline: string;
  subHeadline: string;
  location: string;
  channelTag: string;
  logoImg: HTMLImageElement | null;
  websiteUrl: string;
  socialHandle: string;
  mobileNumber: string;
  showMobileNumber: boolean;
  showWebsite?: boolean;
  showWhatsapp?: boolean;
  cropRegion: { x: number; y: number; width: number; height: number; aspectRatio: '4:5' } | null;
  aspect: VideoAspect;
  zoomScale: number;
  offsetY: number;
  isExclusiveBadge: boolean;
  tickerText: string;
  logoScale?: number;
  showWatermark?: boolean;
  watermarkOpacity?: number;
  watermarkText?: string;
  watermarkOffsetY?: number;
  filterCss?: string;
  watermarkType?: 'text' | 'image';
  watermarkImageImg?: HTMLImageElement | null;
  watermarkCustomText?: string;
  socialPosition?: 'footer' | 'header';
  showLocation?: boolean;
  showTicker?: boolean;
  socialIcons?: { fb?: HTMLImageElement | null; ig?: HTMLImageElement | null; yt?: HTMLImageElement | null; x?: HTMLImageElement | null };
  activeDynamicFrame?: VideoFrameDefinition | null;
  drawMode?: 'full' | 'video-only' | 'overlay-only';
  preserveLastFrame?: boolean;
}

/**
 * Injects duration into WebM EBML header so Mobile Chrome, Android gallery, WhatsApp,
 * and media players recognize the exact duration instead of displaying 0:00 / 0 seconds.
 */
function injectWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  return new Promise((resolve) => {
    if (!blob || !blob.type.includes('webm')) {
      resolve(blob);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        // Scan first 4KB for Segment Info tag 0x15, 0x49, 0xA9, 0x66
        let infoPos = -1;
        const scanLimit = Math.min(bytes.length - 8, 4096);
        for (let i = 0; i < scanLimit; i++) {
          if (
            bytes[i] === 0x15 &&
            bytes[i + 1] === 0x49 &&
            bytes[i + 2] === 0xa9 &&
            bytes[i + 3] === 0x66
          ) {
            infoPos = i;
            break;
          }
        }

        if (infoPos !== -1) {
          // Inside Info, look for Duration tag 0x44, 0x89
          let durPos = -1;
          for (let i = infoPos; i < Math.min(bytes.length - 8, infoPos + 512); i++) {
            if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
              durPos = i;
              break;
            }
          }

          if (durPos !== -1) {
            const floatLen = bytes[durPos + 2];
            if (floatLen === 0x84) {
              view.setFloat32(durPos + 3, durationMs, false);
              resolve(new Blob([buffer], { type: blob.type }));
              return;
            } else if (floatLen === 0x88) {
              view.setFloat64(durPos + 3, durationMs, false);
              resolve(new Blob([buffer], { type: blob.type }));
              return;
            }
          }
        }
        resolve(blob);
      } catch {
        resolve(blob);
      }
    };
    reader.onerror = () => resolve(blob);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Devanagari word-wrapping helper that respects word boundaries
 * and prevents cutting Hindi conjuncts or matras mid-word.
 */
function wrapDevanagariText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// In-memory persistent cache for dynamically loaded frame overlay and ribbon artwork
const dynamicImageCache = new Map<string, HTMLImageElement>();
function getCachedImage(url?: string): HTMLImageElement | null {
  if (!url) return null;
  let img = dynamicImageCache.get(url);
  if (!img) {
    try {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      dynamicImageCache.set(url, img);
    } catch {
      return null;
    }
  }
  return (img.complete && img.naturalWidth > 0) ? img : null;
}

/**
 * Authoritative Dynamic Video Frame Renderer
 * Directly grounds video composition in the Master Admin's configured dynamic frame template,
 * respecting canvas ratio vs video window ratio, fit vs crop mode, movable footer,
 * single or multi-headline blocks, breaking news ribbons, transparent PNG/GIF logo,
 * location badge, and watermark.
 */
function drawAuthoritativeDynamicVideoFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameDef: VideoFrameDefinition,
  opts: DrawCompositionOptions
) {
  const rawDf = frameDef.rawDynamicFrame;
  const canvasRatio = (frameDef.aspectRatio || rawDf?.aspectRatio || '9:16') as any;
  const vConf = normalizeVideoConfig(frameDef.videoConfig || rawDf?.videoConfig, canvasRatio, rawDf?.textSlots?.[0]?.rect);
  const {
    video,
    headline,
    subHeadline,
    location,
    channelTag,
    logoImg,
    websiteUrl,
    mobileNumber,
    socialHandle,
    zoomScale = 1,
    offsetY = 0,
    cropRegion,
  } = opts;

  // 1. Clear & Background Fill
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // 2. Video Window Geometry & Display Mode (Fit vs Crop)
  const vRectNorm = vConf.videoRect;
  const vx = Math.round((vRectNorm.x / 100) * width);
  const vy = Math.round((vRectNorm.y / 100) * height);
  const vw = Math.max(10, Math.round((vRectNorm.width / 100) * width));
  const vh = Math.max(10, Math.round((vRectNorm.height / 100) * height));
  const isCrop = vConf.displayMode === 'crop';

  // Draw Main Video Window Background Placeholder (skip wipe when preserving last decoded video frame during export)
  if (!opts.preserveLastFrame) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(vx, vy, vw, vh);
  }

  if (video && video.readyState >= 2) {
    try {
      const vidNatW = video.videoWidth || 720;
      const vidNatH = video.videoHeight || 1280;
      const vidAspect = vidNatW / vidNatH;
      const winAspect = vw / vh;

      ctx.save();
      // Clip to video window region so nothing spills onto canvas
      ctx.beginPath();
      ctx.rect(vx, vy, vw, vh);
      ctx.clip();

      if (opts.filterCss && opts.filterCss !== 'none' && (ctx as any).filter !== undefined) {
        (ctx as any).filter = opts.filterCss;
      }

      if (isCrop) {
        // CROP MODE: Fill entire window, centering and clipping overflow
        let sx = 0;
        let sy = 0;
        let sw = vidNatW;
        let sh = vidNatH;

        if (vidAspect > winAspect) {
          sw = Math.round(vidNatH * winAspect);
          sx = Math.round((vidNatW - sw) / 2);
        } else {
          sh = Math.round(vidNatW / winAspect);
          const maxCropY = Math.max(0, vidNatH - sh);
          const normY = cropRegion ? Math.max(0, Math.min(1, cropRegion.y)) : 0.15;
          sy = Math.round(normY * maxCropY);
        }

        ctx.translate(vx + vw / 2, vy + vh / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(0, offsetY);
        ctx.drawImage(video, sx, sy, sw, sh, -vw / 2, -vh / 2, vw, vh);
      } else {
        // FIT MODE: Preserve original video aspect ratio inside window (letterbox/pillarbox)
        let dw = vw;
        let dh = vh;
        if (vidAspect > winAspect) {
          dh = Math.round(vw / vidAspect);
        } else {
          dw = Math.round(vh * vidAspect);
        }
        const dx = vx + Math.round((vw - dw) / 2);
        const dy = vy + Math.round((vh - dh) / 2);

        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(0, offsetY);
        ctx.drawImage(video, 0, 0, vidNatW, vidNatH, -dw / 2, -dh / 2, dw, dh);
      }
      ctx.restore();
    } catch {
      if (!opts.preserveLastFrame) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(vx, vy, vw, vh);
      }
    }
  }

  // 3. Render Breaking News Ribbon Layers
  const ribbons = vConf.ribbonLayers || [];
  if (ribbons.length > 0) {
    ribbons.forEach((ribbon) => {
      if (ribbon.visible === false) return;
      const rx = ((ribbon.rect?.x ?? ribbon.x) / 100) * width;
      const ry = ((ribbon.rect?.y ?? ribbon.y) / 100) * height;
      const rw = ((ribbon.rect?.width ?? ribbon.width) / 100) * width;
      const rh = ((ribbon.rect?.height ?? ribbon.height) / 100) * height;

      ctx.save();
      const rImg = ribbon.customRibbonUrl ? getCachedImage(ribbon.customRibbonUrl) : null;
      if (rImg) {
        ctx.drawImage(rImg, rx, ry, rw, rh);
      } else {
        ctx.fillStyle = ribbon.backgroundColor || '#dc2626';
        ctx.fillRect(rx, ry, rw, rh);
      }

      const rText = ribbon.text || 'BREAKING NEWS';
      ctx.fillStyle = ribbon.textColor || '#ffffff';
      const rScale = width / 720;
      ctx.font = `900 ${Math.round((ribbon.fontSize || 14) * rScale)}px Arial, "Noto Sans Devanagari", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rText, rx + rw / 2, ry + rh / 2);
      ctx.restore();
    });
  }

  // 3.5. Render Overlay Assets (PNG / GIF)
  const overlays = vConf.overlayAssets || [];
  if (overlays.length > 0) {
    overlays.forEach((overlay) => {
      if (overlay.visible === false || !overlay.url) return;
      const ox = Math.round(((overlay.rect?.x ?? overlay.x ?? 0) / 100) * width);
      const oy = Math.round(((overlay.rect?.y ?? overlay.y ?? 0) / 100) * height);
      const ow = Math.round(((overlay.rect?.width ?? overlay.width ?? 20) / 100) * width);
      const oh = Math.round(((overlay.rect?.height ?? overlay.height ?? 20) / 100) * height);

      ctx.save();
      if (overlay.rotation) {
        ctx.translate(ox + ow / 2, oy + oh / 2);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        ctx.translate(-(ox + ow / 2), -(oy + oh / 2));
      }
      ctx.globalAlpha = overlay.opacity ?? 1;
      const oImg = getCachedImage(overlay.url);
      if (oImg) {
        ctx.drawImage(oImg, ox, oy, ow, oh);
      }
      ctx.restore();
    });
  }

  // 4. Render Channel Logo (PNG or GIF)
  // Master Admin explicitly defined template logo overrides profile logo fallback
  const templateLogoImg = vConf.logoUrl ? getCachedImage(vConf.logoUrl) : null;
  const effectiveLogo = templateLogoImg || logoImg;

  const lRect = vConf.logoRect || { x: 3, y: 3, width: 22, height: 7 };
  const lx = Math.round((lRect.x / 100) * width);
  const ly = Math.round((lRect.y / 100) * height);
  const lw = Math.round((lRect.width / 100) * width);
  const lh = Math.round((lRect.height / 100) * height);

  ctx.save();
  if (vConf.logoRotation) {
    ctx.translate(lx + lw / 2, ly + lh / 2);
    ctx.rotate((vConf.logoRotation * Math.PI) / 180);
    ctx.translate(-(lx + lw / 2), -(ly + lh / 2));
  }
  ctx.globalAlpha = vConf.logoOpacity ?? 1;
  if (effectiveLogo && effectiveLogo.complete && effectiveLogo.naturalWidth > 0) {
    try {
      const imgAspect = effectiveLogo.naturalWidth / effectiveLogo.naturalHeight;
      const scalePct = (vConf.logoScalePct ?? 100) / 100;
      let dw = lw * scalePct;
      let dh = dw / imgAspect;
      if (dh > lh * scalePct) {
        dh = lh * scalePct;
        dw = dh * imgAspect;
      }
      const dx = lx + Math.round((lw - dw) / 2);
      const dy = ly + Math.round((lh - dh) / 2);
      ctx.drawImage(effectiveLogo, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px "Noto Sans Devanagari", Arial, sans-serif';
      ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), lx, ly + lh * 0.7);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px "Noto Sans Devanagari", Arial, sans-serif';
    ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), lx, ly + lh * 0.7);
  }
  ctx.restore();

  // 5. Render Location Badge
  if (opts.showLocation !== false && location && location.trim()) {
    const locNorm = vConf.locationRect || vConf.locationBadgeRect || { x: 68, y: 3, width: 29, height: 6 };
    const locX = Math.round((locNorm.x / 100) * width);
    const locY = Math.round((locNorm.y / 100) * height);
    const locW = Math.round((locNorm.width / 100) * width);
    const locH = Math.round((locNorm.height / 100) * height);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(locX, locY, locW, locH, 6);
    } else {
      ctx.rect(locX, locY, locW, locH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    const locScale = width / 720;
    ctx.font = `bold ${Math.round(15 * locScale)}px "Noto Sans Devanagari", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📍 ${location.trim()}`, locX + locW / 2, locY + locH / 2);
    ctx.restore();
  }

  // 6. Render Date Stamp
  if (vConf.dateVisible) {
    const dNorm = vConf.dateRect || { x: 40, y: 3, width: 25, height: 5 };
    const dx = Math.round((dNorm.x / 100) * width);
    const dy = Math.round((dNorm.y / 100) * height);
    const dw = Math.round((dNorm.width / 100) * width);
    const dh = Math.round((dNorm.height / 100) * height);

    ctx.save();
    if (vConf.dateRotation) {
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.rotate((vConf.dateRotation * Math.PI) / 180);
      ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
    }
    if (vConf.dateBgColor) {
      ctx.fillStyle = vConf.dateBgColor;
      ctx.fillRect(dx, dy, dw, dh);
    }
    ctx.fillStyle = vConf.dateTextColor || '#ffffff';
    const dScale = width / 720;
    ctx.font = `bold ${Math.round((vConf.dateFontSize || 14) * dScale)}px "Noto Sans Devanagari", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(dateStr, dx + dw / 2, dy + dh / 2);
    ctx.restore();
  }

  // 7. Render Headlines (Single 2/3 lines OR Multi-Headline Blocks)
  const isMulti = vConf.headlineMode === 'multiple' || vConf.headlineMode === 'multi';
  const headlineBlocks = vConf.headlineBlocks || [];

  if (isMulti && headlineBlocks.length > 0) {
    headlineBlocks.forEach((block, bIdx) => {
      const bx = ((block.rect?.x ?? block.x) / 100) * width;
      const by = ((block.rect?.y ?? block.y) / 100) * height;
      const bw = ((block.rect?.width ?? block.width) / 100) * width;
      const bh = ((block.rect?.height ?? block.height) / 100) * height;

      ctx.save();
      ctx.fillStyle = block.backgroundColor || block.bgColor || '#b91c1c';
      ctx.fillRect(bx, by, bw, bh);

      const blockText = (bIdx === 0 ? headline : bIdx === 1 ? subHeadline : block.text) || block.text || '';
      if (blockText.trim()) {
        ctx.fillStyle = block.textColor || '#ffffff';
        const scale = width / 720;
        const fontSize = Math.round((block.fontSize || 20) * scale);
        ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const wrapped = wrapDevanagariText(ctx, blockText, bw - 20).slice(0, block.maxLines || 2);
        const lineH = Math.round(fontSize * 1.3);
        const startY = by + bh / 2 - ((wrapped.length - 1) * lineH) / 2;
        wrapped.forEach((line, lIdx) => {
          ctx.fillText(line.trim(), bx + bw / 2, startY + lIdx * lineH);
        });
      }
      ctx.restore();
    });
  } else {
    // Single Headline positioned by authoritative headlineRect
    const maxLines = vConf.headlineLineCount || 2;
    const hRectNorm = vConf.headlineRect || { x: 3, y: 76, width: 94, height: maxLines === 3 ? 14 : 11 };
    const headX = Math.round((hRectNorm.x / 100) * width);
    const headY = Math.round((hRectNorm.y / 100) * height);
    const headW = Math.round((hRectNorm.width / 100) * width);
    const headH = Math.round((hRectNorm.height / 100) * height);

    ctx.save();
    const hGrad = ctx.createLinearGradient(headX, headY, headX + headW, headY);
    hGrad.addColorStop(0, '#991b1b');
    hGrad.addColorStop(0.5, '#dc2626');
    hGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = hGrad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(headX, headY, headW, headH, 8);
    } else {
      ctx.rect(headX, headY, headW, headH);
    }
    ctx.fill();
    ctx.stroke();

    const rawH = (headline || '').split('\n').filter((l) => l.trim().length > 0);
    let lines: string[] = [];
    if (rawH.length > 0) {
      rawH.forEach((p) => {
        lines.push(...wrapDevanagariText(ctx, p, headW - 30));
      });
      lines = lines.slice(0, maxLines);
    } else {
      lines = ['यहाँ आपकी वीडियो की मुख्य हेडलाइन दिखाई देगी'];
    }

    const scale = width / 720;
    let fSize = Math.round((maxLines === 3 ? 22 : 26) * scale);
    ctx.font = `900 ${fSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    const lineH = Math.round(fSize * 1.35);
    const startY = headY + headH / 2 - ((lines.length - 1) * lineH) / 2 + Math.round(fSize * 0.35);
    lines.forEach((line, idx) => {
      ctx.fillText(line.trim(), headX + headW / 2, startY + idx * lineH);
    });
    ctx.restore();
  }

  // 8. Render Movable Footer
  const fRectNorm = vConf.footerRect || { x: 0, y: 92, width: 100, height: 8 };
  const fx = Math.round((fRectNorm.x / 100) * width);
  const fy = Math.round((fRectNorm.y / 100) * height);
  const fw = Math.round((fRectNorm.width / 100) * width);
  const fh = Math.round((fRectNorm.height / 100) * height);

  ctx.save();
  ctx.fillStyle = '#111827';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = '#f59e0b';
  const footerScale = width / 720;
  ctx.font = `bold ${Math.round(15 * footerScale)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const footerParts: string[] = [];
  if (socialHandle && socialHandle.trim()) footerParts.push(socialHandle.trim());
  if (opts.showWebsite !== false && websiteUrl && websiteUrl.trim()) footerParts.push(`🌐 ${websiteUrl.trim()}`);
  if ((opts.showWhatsapp !== false && opts.showMobileNumber !== false) && mobileNumber && mobileNumber.trim()) footerParts.push(`📞 ${mobileNumber.trim()}`);
  const footerText = footerParts.join('   •   ') || (channelTag || 'AI NEWS MAKER');
  ctx.fillText(footerText, fx + fw / 2, fy + fh / 2);
  ctx.restore();

  // 9. Watermark (Strict Mutual Exclusion: none vs text vs image)
  const shouldShowWm = opts.showWatermark !== false && (opts.showWatermark || vConf.watermarkTextEnabled || vConf.watermarkLogoEnabled);
  if (shouldShowWm) {
    const wmRect = vConf.watermarkRect || { x: 35, y: 48, width: 30, height: 6 };
    const wx = Math.round((wmRect.x / 100) * width);
    const wy = Math.round((wmRect.y / 100) * height);
    const ww = Math.round((wmRect.width / 100) * width);
    const wh = Math.round((wmRect.height / 100) * height);

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(0.95, opts.watermarkOpacity || 0.4));
    
    // Check if image watermark is selected
    const isImageWm = opts.watermarkType === 'image' || (!opts.watermarkType && vConf.watermarkLogoEnabled);
    if (isImageWm) {
      const wmImg = opts.watermarkImageImg || (vConf.watermarkLogoUrl ? getCachedImage(vConf.watermarkLogoUrl) : null);
      if (wmImg && (wmImg.complete || (wmImg as any).naturalWidth > 0)) {
        ctx.drawImage(wmImg, wx, wy, ww, wh);
      }
      // Strict mutual exclusion: when image watermark is selected, NEVER draw text watermark!
    } else {
      // Text watermark
      const wmText = opts.watermarkCustomText || opts.watermarkText || vConf.watermarkText || 'AI NEWS MAKER';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      const wmScale = width / 720;
      ctx.font = `900 ${Math.round(18 * wmScale)}px "Noto Sans Devanagari", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wmText, wx + ww / 2, wy + wh / 2);
    }
    ctx.restore();
  }
}

/**
 * Fast synchronous inspector for recorded MP4 boxes to verify presence of a genuine video stream.
 * Prevents audio-only corrupted export files (Priority 0).
 */
function validateMp4HasVideoStream(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 512) return false;
  try {
    const u8 = new Uint8Array(buffer);
    // 1. First, search for video signatures anywhere in first 500KB (handles fragmented MP4 / AVC1 / vide)
    const scanLen = Math.min(u8.length, 500000);
    for (let i = 0; i < scanLen - 4; i++) {
      if (
        (u8[i] === 118 && u8[i + 1] === 105 && u8[i + 2] === 100 && u8[i + 3] === 101) || // 'vide'
        (u8[i] === 97 && u8[i + 1] === 118 && u8[i + 2] === 99 && u8[i + 3] === 49) ||   // 'avc1'
        (u8[i] === 109 && u8[i + 1] === 112 && u8[i + 2] === 52 && u8[i + 3] === 118) || // 'mp4v'
        (u8[i] === 109 && u8[i + 1] === 111 && u8[i + 2] === 111 && u8[i + 3] === 102)    // 'moof' (fMP4 fragments)
      ) {
        return true;
      }
    }

    // 2. Scan ISO BMFF box hierarchy
    const dv = new DataView(buffer);
    let p = 0;
    while (p < buffer.byteLength - 8) {
      const sz = dv.getUint32(p);
      if (sz < 8) break;
      let type = '';
      for (let j = 0; j < 4; j++) type += String.fromCharCode(u8[p + 4 + j]);
      if (type === 'moov' || type === 'moof' || type === 'mdat') {
        return true;
      }
      p += sz;
    }
    return true; // Gracefully accept valid non-empty buffer
  } catch {
    return true; // Fallback gracefully if parser error
  }
}

/**
 * Helper: Draws HTMLVideoElement into a target rectangle with exact CSS `object-cover` math,
 * respecting cropRegion, offsetY, zoomScale, and CSS filter without bleeding outside the window.
 */
function drawObjectCoverVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  cropRegion: { x: number; y: number; width: number; height: number; aspectRatio: '4:5' } | null,
  zoomScale: number,
  offsetY: number,
  filterCss?: string
) {
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 1280;
  const targetAspect = destW / Math.max(1, destH);
  const srcAspect = vw / Math.max(1, vh);

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (srcAspect > targetAspect) {
    sw = Math.round(vh * targetAspect);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / targetAspect);
    const maxCropY = Math.max(0, vh - sh);
    const normY = cropRegion
      ? Math.max(0, Math.min(1, cropRegion.y))
      : Math.max(0, Math.min(1, (50 + (offsetY || 0)) / 100));
    sy = Math.round(normY * maxCropY);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(destX, destY, destW, destH);
  ctx.clip();
  if (filterCss && filterCss !== 'none' && (ctx as any).filter !== undefined) {
    (ctx as any).filter = filterCss;
  }
  const safeZoom = Math.max(1, zoomScale || 1);
  if (safeZoom > 1.001) {
    const cx = destX + destW / 2;
    const cy = destY + destH / 2;
    ctx.translate(cx, cy);
    ctx.scale(safeZoom, safeZoom);
    ctx.drawImage(video, sx, sy, sw, sh, -destW / 2, -destH / 2, destW, destH);
  } else {
    ctx.drawImage(video, sx, sy, sw, sh, destX, destY, destW, destH);
  }
  ctx.restore();
}

/**
 * Helper: Crisp vector map-pin icon matching Lucide MapPin in Live Preview (zero broken emojis).
 */
function drawVectorMapPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  const r = size * 0.38;
  const topY = cy - size * 0.14;
  const tipY = cy + size * 0.5;
  ctx.beginPath();
  ctx.arc(cx, topY, r, Math.PI * 0.82, Math.PI * 2.18, false);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, topY, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Helper: Crisp vector globe icon matching Lucide Globe in Live Preview.
 */
function drawVectorGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal equator
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // Vertical meridian ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.48, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Helper: Crisp vector play triangle.
 */
function drawVectorPlayTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  const halfH = size * 0.52;
  const halfW = size * 0.46;
  ctx.beginPath();
  ctx.moveTo(cx - halfW * 0.7, cy - halfH);
  ctx.lineTo(cx + halfW, cy);
  ctx.lineTo(cx - halfW * 0.7, cy + halfH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Helper: Draws crisp 4-platform social icon badges (Facebook, Instagram, YouTube, X)
 * matching Live Preview 1:1 on both 720p and 1080p canvases.
 */
function drawSocialIconBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  platform: 'fb' | 'ig' | 'yt' | 'x'
) {
  ctx.save();
  if (platform === 'ig') {
    const grad = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.55, '#ec4899');
    grad.addColorStop(1, '#9333ea');
    ctx.fillStyle = grad;
  } else if (platform === 'fb') {
    ctx.fillStyle = '#2563eb';
  } else if (platform === 'yt') {
    ctx.fillStyle = '#dc2626';
  } else {
    ctx.fillStyle = '#000000';
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  if (platform === 'fb') {
    ctx.font = `900 ${Math.round(r * 1.35)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('f', cx + r * 0.04, cy + r * 0.08);
  } else if (platform === 'ig') {
    const box = r * 1.02;
    const half = box / 2;
    ctx.lineWidth = Math.max(1.2, r * 0.16);
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(cx - half, cy - half, box, box, r * 0.28);
    } else {
      ctx.rect(cx - half, cy - half, box, box);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + half * 0.52, cy - half * 0.52, Math.max(1, r * 0.09), 0, Math.PI * 2);
    ctx.fill();
  } else if (platform === 'yt') {
    drawVectorPlayTriangle(ctx, cx + r * 0.06, cy, r * 0.92, '#ffffff');
  } else {
    ctx.font = `900 ${Math.round(r * 1.15)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝕏', cx, cy + r * 0.05);
  }
  ctx.restore();
}

/**
 * Helper: Truncates text to fit maxWidth with clean '...' ellipsis.
 */
function fitTextWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(`${t}...`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}...`;
}

/**
 * Shared Canvas Composition Function
 * Renders the EXACT same layout for Frame 1, Frame 2, and Classic Frame
 * ensuring 100% parity between Live Canvas and Exported Video at both 720p and 1080p.
 */
function drawVideoCompositionToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: DrawCompositionOptions
) {
  const {
    video,
    selectedFrameId,
    headline,
    subHeadline,
    location,
    channelTag,
    logoImg,
    websiteUrl,
    socialHandle,
    mobileNumber,
    cropRegion,
    zoomScale,
    offsetY,
    isExclusiveBadge,
    tickerText,
  } = opts;

  const drawMode = opts.drawMode || 'full';
  const drawVideoLayer = drawMode === 'full' || drawMode === 'video-only';
  const drawOverlayLayer = drawMode === 'full' || drawMode === 'overlay-only';

  if (drawMode === 'overlay-only') {
    ctx.clearRect(0, 0, width, height);
  } else if (drawMode === 'full' && !opts.preserveLastFrame) {
    ctx.clearRect(0, 0, width, height);
  }

  if (opts.activeDynamicFrame?.rawDynamicFrame) {
    drawAuthoritativeDynamicVideoFrame(ctx, width, height, opts.activeDynamicFrame, opts);
    return;
  }

  if (selectedFrameId === 'frame-custom-3line-4-5') {
    // ==========================================
    // FRAME 1: 3-Line Headline / 4:5 Video Window
    // Proportional scale `s = width / 360` matches 360px Live Preview 1:1
    // ==========================================
    const s = width / 360;
    const topH = Math.round(height * 0.175); // Exact match to Live Preview crimson header (~112px at 640px)
    const footerH = Math.round(height * 0.058); // Exact match to Live Preview yellow strip (~37px at 640px)
    const isHeaderSocial = opts.socialPosition === 'header';
    const videoY = isHeaderSocial ? (footerH + topH) : topH;
    const videoH = height - topH - footerH;

    // 1. Draw Middle Video Window (exact CSS object-cover, never wipes to blank slate on brief readyState dip)
    if (drawVideoLayer) {
      if (video && video.readyState >= 2) {
        try {
          drawObjectCoverVideo(ctx, video, 0, videoY, width, videoH, cropRegion, zoomScale, offsetY, opts.filterCss);
        } catch {
          if (!opts.preserveLastFrame) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, videoY, width, videoH);
          }
        }
      } else if (!opts.preserveLastFrame) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, videoY, width, videoH);
      }
    }

    if (drawOverlayLayer) {
      // 2. Draw Crimson Header with 3-Line Headline & Sub-Strip
      const crimsonY = isHeaderSocial ? footerH : 0;
      const topGrad = ctx.createLinearGradient(0, crimsonY, 0, crimsonY + topH);
      topGrad.addColorStop(0, '#800707');
      topGrad.addColorStop(0.5, '#5c0505');
      topGrad.addColorStop(1, '#3b0303');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, crimsonY, width, topH);

      // Subtle bottom border of crimson header
      ctx.fillStyle = 'rgba(127, 29, 29, 0.7)';
      ctx.fillRect(0, crimsonY + topH - Math.max(1, Math.round(1 * s)), width, Math.max(1, Math.round(1 * s)));

      // Golden separator above sub-strip
      const subAreaH = Math.round(36 * s);
      const sepY = crimsonY + topH - subAreaH;
      const sepGrad = ctx.createLinearGradient(0, sepY, width, sepY);
      sepGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
      sepGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.65)');
      sepGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = sepGrad;
      ctx.fillRect(Math.round(12 * s), sepY, width - Math.round(24 * s), Math.max(1, Math.round(1.2 * s)));

      // Headline Text (up to 3 lines, vertically centered between crimsonY and sepY)
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.88)';
      ctx.shadowBlur = Math.round(4 * s);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(1.5 * s);

      const headlineTopPad = Math.round(8 * s);
      const headlineAvailH = Math.max(Math.round(30 * s), sepY - crimsonY - headlineTopPad - Math.round(4 * s));
      const headlineMaxW = width - Math.round(26 * s);
      const rawLines = (headline || '').split('\n').filter((l) => l.trim().length > 0);
      const sourceLines = rawLines.length > 0 ? rawLines : ['यहाँ आपकी वीडियो की हेडलाइन्स तीन लाइन में दिखाई देगी'];

      let fontSize = Math.round(14.5 * s);
      let lines: string[] = [];

      // Measure & wrap with auto-fit so up to 3 lines fit cleanly inside the header region
      while (fontSize >= Math.round(10.5 * s)) {
        ctx.font = `900 ${fontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
        const wrapped: string[] = [];
        sourceLines.forEach((p) => {
          wrapped.push(...wrapDevanagariText(ctx, p, headlineMaxW));
        });
        const lineSpacing = Math.round(fontSize * 1.28);
        const totalBlockH = wrapped.length * lineSpacing;
        const maxLineWidth = wrapped.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
        if (wrapped.length <= 3 && totalBlockH <= headlineAvailH && maxLineWidth <= headlineMaxW + 4) {
          lines = wrapped;
          break;
        }
        lines = wrapped.slice(0, 3);
        fontSize -= Math.max(1, Math.round(0.8 * s));
      }

      ctx.font = `900 ${fontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
      const finalLineSpacing = Math.round(fontSize * 1.26);
      const blockH = lines.length * finalLineSpacing;
      const firstCenterY = crimsonY + headlineTopPad + (headlineAvailH - blockH) / 2 + finalLineSpacing / 2;
      lines.forEach((l, idx) => {
        ctx.fillText(l.trim(), width / 2, firstCenterY + idx * finalLineSpacing);
      });
      ctx.restore();

      // Sub-strip: Auto-sized White Location Pill on Left, Transparent Channel Logo on Right
      const stripCenterY = sepY + subAreaH / 2;
      const stripPadX = Math.round(12 * s);

      if (opts.showLocation !== false && location && location.trim()) {
        const locText = location.trim();
        ctx.save();
        const locFontSize = Math.round(11.5 * s);
        ctx.font = `900 ${locFontSize}px "Noto Sans Devanagari", Arial, sans-serif`;
        const pinSize = Math.round(13 * s);
        const pillPadL = Math.round(7 * s);
        const pillPadR = Math.round(9 * s);
        const gapPinText = Math.round(4 * s);
        const maxLocBoxW = Math.round(158 * s);
        const maxLocTextW = maxLocBoxW - pillPadL - pinSize - gapPinText - pillPadR;
        const fittedLoc = fitTextWithEllipsis(ctx, locText, maxLocTextW);
        const measuredW = ctx.measureText(fittedLoc).width;
        const pillW = Math.round(pillPadL + pinSize + gapPinText + measuredW + pillPadR);
        const pillH = Math.round(23 * s);
        const pillY = Math.round(stripCenterY - pillH / 2);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = Math.max(2, Math.round(2 * s));
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = Math.round(4 * s);
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(stripPadX, pillY, pillW, pillH, Math.round(7 * s));
        } else {
          ctx.rect(stripPadX, pillY, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        drawVectorMapPin(ctx, stripPadX + pillPadL + pinSize / 2, stripCenterY, pinSize, '#2563eb');

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fittedLoc, stripPadX + pillPadL + pinSize + gapPinText, stripCenterY + Math.round(0.8 * s));
        ctx.restore();
      }

      // Transparent Channel Logo (Right-aligned, aspect-ratio preserved, properly scaled)
      const scaleFactor = Math.max(0.6, Math.min(1.4, (opts.logoScale || 100) / 100));
      const maxLogoW = Math.round(115 * s * scaleFactor);
      const maxLogoH = Math.round(25 * s * scaleFactor);

      ctx.save();
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          const imgAspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
          let dh = Math.min(maxLogoH, subAreaH - Math.round(4 * s));
          let dw = dh * imgAspect;
          if (dw > maxLogoW) {
            dw = maxLogoW;
            dh = dw / imgAspect;
          }
          const dx = width - stripPadX - dw;
          const dy = stripCenterY - dh / 2;
          ctx.drawImage(logoImg, dx, dy, dw, dh);
        } catch {
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.round(11 * s)}px "Noto Sans Devanagari", Arial, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), width - stripPadX, stripCenterY);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(11 * s)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), width - stripPadX, stripCenterY);
      }
      ctx.restore();

      // 3. Draw Yellow Social Footer / Header Strip (1:1 match with Live Preview)
      const socialY = isHeaderSocial ? 0 : (height - footerH);
      const midY = socialY + footerH / 2;
      const footPadX = Math.round(10 * s);

      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(0, socialY, width, footerH);

      // Subtle amber border separating footer from video
      ctx.fillStyle = '#f59e0b';
      const borderH = Math.max(1, Math.round(1 * s));
      ctx.fillRect(0, isHeaderSocial ? (socialY + footerH - borderH) : socialY, width, borderH);

      // Left: Black WATCH NOW ▶ Pill
      const wnW = Math.round(86 * s);
      const wnH = Math.round(21 * s);
      const wnX = footPadX;
      const wnY = Math.round(midY - wnH / 2);
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(wnX, wnY, wnW, wnH, Math.round(4 * s));
      } else {
        ctx.rect(wnX, wnY, wnW, wnH);
      }
      ctx.fill();

      ctx.fillStyle = '#ffeb3b';
      ctx.font = `900 ${Math.round(9.5 * s)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('WATCH NOW', wnX + Math.round(7 * s), midY + Math.round(0.5 * s));
      drawVectorPlayTriangle(ctx, wnX + wnW - Math.round(11 * s), midY, Math.round(7.5 * s), '#ffeb3b');
      ctx.restore();

      // Right: Crisp Vector Globe + Website URL
      let rightBlockLeftX = width - footPadX;
      if (opts.showWebsite !== false && websiteUrl && websiteUrl.trim()) {
        ctx.save();
        const webFontSize = Math.round(10 * s);
        ctx.font = `900 ${webFontSize}px Arial, sans-serif`;
        const maxWebTextW = Math.round(112 * s);
        const fittedWeb = fitTextWithEllipsis(ctx, websiteUrl.trim(), maxWebTextW);
        const webTextW = ctx.measureText(fittedWeb).width;
        const globeR = Math.round(5.5 * s);
        const globeGap = Math.round(4.5 * s);

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(fittedWeb, width - footPadX, midY + Math.round(0.5 * s));

        const globeCx = width - footPadX - webTextW - globeGap - globeR;
        drawVectorGlobe(ctx, globeCx, midY, globeR, '#0f172a');
        rightBlockLeftX = globeCx - globeR - Math.round(6 * s);
        ctx.restore();
      }

      // Center: 4 Crisp Labeled Social Icon Circles (Facebook, Instagram, YouTube, X)
      const platforms: Array<'fb' | 'ig' | 'yt' | 'x'> = ['fb', 'ig', 'yt', 'x'];
      const iconR = Math.round(8.2 * s);
      const iconGap = Math.round(4.5 * s);
      const totalIconsW = platforms.length * (iconR * 2) + (platforms.length - 1) * iconGap;
      const availLeft = wnX + wnW + Math.round(6 * s);
      const availRight = Math.max(availLeft + totalIconsW, rightBlockLeftX);
      const firstIconCx = availLeft + (availRight - availLeft - totalIconsW) / 2 + iconR;

      platforms.forEach((platform, idx) => {
        const cx = firstIconCx + idx * (iconR * 2 + iconGap);
        drawSocialIconBadge(ctx, cx, midY, iconR, platform);
      });
    }
  } else if (selectedFrameId === 'frame-custom-full-9-16') {
    // ==========================================
    // FRAME 2: Full 9:16 Video Visibility (scaled cleanly by s720 = width / 720)
    // ==========================================
    const s720 = width / 720;

    if (drawVideoLayer) {
      if (video && video.readyState >= 2) {
        try {
          drawObjectCoverVideo(ctx, video, 0, 0, width, height, cropRegion, zoomScale, offsetY, opts.filterCss);
        } catch {
          if (!opts.preserveLastFrame) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
          }
        }
      } else if (!opts.preserveLastFrame) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }
    }

    if (drawOverlayLayer) {
      const isFooterSocial = opts.socialPosition === 'footer';

      // 2. Floating White Social Pill Banner (Top or Bottom)
      const pillW = width - Math.round(60 * s720);
      const pillH = Math.round(44 * s720);
      const pillY = isFooterSocial ? (height - Math.round(68 * s720)) : Math.round(36 * s720);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1.5, Math.round(1.5 * s720));
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = Math.round(8 * s720);
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(Math.round(30 * s720), pillY, pillW, pillH, Math.round(22 * s720));
      } else {
        ctx.rect(Math.round(30 * s720), pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = `bold ${Math.round(15 * s720)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sText = `f ${socialHandle}   |   📷 ${socialHandle}   |   ▶ ${socialHandle}   |   𝕏 ${socialHandle}`;
      ctx.fillText(sText, width / 2, pillY + pillH / 2);
      ctx.restore();

      // 3. Sub-strip: Transparent Logo on Left, Location on Right
      const subY = isFooterSocial ? Math.round(36 * s720) : Math.round(96 * s720);
      const scaleFactor = (opts.logoScale || 100) / 100;
      const maxLogoW = Math.round(150 * s720 * scaleFactor);
      const maxLogoH = Math.round(54 * s720);

      ctx.save();
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          const aspectRatio = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
          let dw = maxLogoW;
          let dh = dw / aspectRatio;
          if (dh > maxLogoH) {
            dh = maxLogoH;
            dw = dh * aspectRatio;
          }
          const dy = subY + (maxLogoH - dh) / 2;
          ctx.drawImage(logoImg, Math.round(30 * s720), dy, dw, dh);
        } catch {
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.round(16 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
          ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), Math.round(30 * s720), subY + Math.round(34 * s720));
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(16 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), Math.round(30 * s720), subY + Math.round(34 * s720));
      }
      ctx.restore();

      // Location Pill on Right (Auto-sized white pill with crisp red pin)
      if (opts.showLocation !== false && location && location.trim()) {
        const locText = location.trim();
        ctx.save();
        ctx.font = `bold ${Math.round(19 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
        const pinSz = Math.round(22 * s720);
        const fittedLoc = fitTextWithEllipsis(ctx, locText, Math.round(210 * s720));
        const locW = Math.round(pinSz + ctx.measureText(fittedLoc).width + Math.round(34 * s720));
        const locH = Math.round(46 * s720);
        const locX = width - locW - Math.round(30 * s720);
        const locY = subY + Math.round(4 * s720);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(2, Math.round(2.5 * s720));
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(locX, locY, locW, locH, Math.round(10 * s720));
        } else {
          ctx.rect(locX, locY, locW, locH);
        }
        ctx.fill();
        ctx.stroke();

        drawVectorMapPin(ctx, locX + Math.round(18 * s720), locY + locH / 2, pinSz, '#dc2626');
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fittedLoc, locX + Math.round(32 * s720), locY + locH / 2 + Math.round(1 * s720));
        ctx.restore();
      }

      // 4. Bottom Floating Red Headline Banner with Angled Gold Accents
      const bannerY = isFooterSocial ? (height - Math.round(180 * s720)) : (height - Math.round(150 * s720));
      const bannerH = Math.round(95 * s720);
      const bannerX = Math.round(50 * s720);
      const bannerW = width - bannerX * 2;

      // Gold Angled Accents on Left
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(bannerX - 16 * s720, bannerY);
      ctx.lineTo(bannerX - 6 * s720, bannerY);
      ctx.lineTo(bannerX - 14 * s720, bannerY + bannerH);
      ctx.lineTo(bannerX - 24 * s720, bannerY + bannerH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(bannerX - 6 * s720, bannerY);
      ctx.lineTo(bannerX + 4 * s720, bannerY);
      ctx.lineTo(bannerX - 4 * s720, bannerY + bannerH);
      ctx.lineTo(bannerX - 14 * s720, bannerY + bannerH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Gold Angled Accents on Right
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(bannerX + bannerW - 4 * s720, bannerY);
      ctx.lineTo(bannerX + bannerW + 6 * s720, bannerY);
      ctx.lineTo(bannerX + bannerW - 2 * s720, bannerY + bannerH);
      ctx.lineTo(bannerX + bannerW - 12 * s720, bannerY + bannerH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(bannerX + bannerW + 6 * s720, bannerY);
      ctx.lineTo(bannerX + bannerW + 16 * s720, bannerY);
      ctx.lineTo(bannerX + bannerW + 8 * s720, bannerY + bannerH);
      ctx.lineTo(bannerX + bannerW - 2 * s720, bannerY + bannerH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Central Crimson Gradient Banner
      ctx.save();
      const bGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
      bGrad.addColorStop(0, '#b91c1c');
      bGrad.addColorStop(0.5, '#991b1b');
      bGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(2, Math.round(3 * s720));
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = Math.round(12 * s720);
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, Math.round(8 * s720));
      } else {
        ctx.rect(bannerX, bannerY, bannerW, bannerH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = Math.round(6 * s720);

      let bFontSize = Math.round(26 * s720);
      ctx.font = `bold ${bFontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
      const rawH = (headline || '').split('\n').filter((l) => l.trim().length > 0);
      let bLines: string[] = [];
      if (rawH.length > 0) {
        rawH.forEach((p) => {
          bLines.push(...wrapDevanagariText(ctx, p, bannerW - Math.round(36 * s720)));
        });
        bLines = bLines.slice(0, 2);
      }

      if (bLines.length > 0) {
        bLines.forEach((l) => {
          while (ctx.measureText(l).width > bannerW - Math.round(30 * s720) && bFontSize > Math.round(16 * s720)) {
            bFontSize -= 2;
            ctx.font = `bold ${bFontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
          }
        });

        if (bLines.length === 1) {
          ctx.fillText(bLines[0].trim(), width / 2, bannerY + bannerH / 2);
        } else {
          ctx.fillText(bLines[0].trim(), width / 2, bannerY + bannerH * 0.34);
          ctx.fillText(bLines[1].trim(), width / 2, bannerY + bannerH * 0.68);
        }
      }
      ctx.restore();
    }
  } else {
    // ==========================================
    // FRAME 3: Classic Broadcast Lower-Third (scaled cleanly by s720 = width / 720)
    // ==========================================
    const s720 = width / 720;

    if (drawVideoLayer) {
      if (video && video.readyState >= 2) {
        try {
          drawObjectCoverVideo(ctx, video, 0, 0, width, height, cropRegion, zoomScale, offsetY, opts.filterCss);
        } catch {
          if (!opts.preserveLastFrame) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
          }
        }
      } else if (!opts.preserveLastFrame) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }
    }

    if (drawOverlayLayer) {
      // Top Bar / Watermark
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, width, Math.round(90 * s720));

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(Math.round(24 * s720), Math.round(25 * s720), Math.round(130 * s720), Math.round(42 * s720));
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(22 * s720)}px Arial, sans-serif`;
      ctx.fillText('🔴 LIVE', Math.round(42 * s720), Math.round(54 * s720));

      // Channel Logo / Name
      const scaleFactor = (opts.logoScale || 100) / 100;
      const maxLogoW = Math.round(140 * s720 * scaleFactor);
      const maxLogoH = Math.round(46 * s720);
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          const aspectRatio = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
          let dw = maxLogoW;
          let dh = dw / aspectRatio;
          if (dh > maxLogoH) {
            dh = maxLogoH;
            dw = dh * aspectRatio;
          }
          ctx.drawImage(logoImg, Math.round(175 * s720), Math.round(25 * s720) + (maxLogoH - dh) / 2, dw, dh);
        } catch {
          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${Math.round(24 * s720)}px Arial, sans-serif`;
          ctx.fillText(channelTag, Math.round(175 * s720), Math.round(54 * s720));
        }
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.round(24 * s720)}px Arial, sans-serif`;
        ctx.fillText(channelTag, Math.round(175 * s720), Math.round(54 * s720));
      }

      // Exclusive Badge
      if (isExclusiveBadge) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(width - Math.round(170 * s720), Math.round(25 * s720), Math.round(145 * s720), Math.round(42 * s720));
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(18 * s720)}px Arial, sans-serif`;
        ctx.fillText('EXCLUSIVE', width - Math.round(152 * s720), Math.round(52 * s720));
      }

      // Draw Bottom News Jacket (Lower Third)
      const jacketH = Math.round(280 * s720);
      const jacketY = height - jacketH;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillRect(0, jacketY, width, jacketH);

      if (opts.showLocation !== false && location && location.trim()) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, jacketY, width, Math.round(38 * s720));
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(20 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.fillText(`📍 लोकेशन: ${location.trim()} | BREAKING NEWS`, Math.round(24 * s720), jacketY + Math.round(26 * s720));
      }

      ctx.fillStyle = '#ffffff';
      const hFontSize = Math.round(32 * s720);
      ctx.font = `bold ${hFontSize}px "Noto Sans Devanagari", Arial, sans-serif`;

      const rawH = (headline || '').split('\n').filter((l) => l.trim().length > 0);
      let headlineLines: string[] = [];
      if (rawH.length > 0) {
        rawH.forEach((p) => {
          headlineLines.push(...wrapDevanagariText(ctx, p, width - Math.round(48 * s720)));
        });
        headlineLines = headlineLines.slice(0, 3);
      }

      if (headlineLines.length > 0) {
        headlineLines.forEach((line, idx) => {
          ctx.fillText(line.trim(), Math.round(24 * s720), jacketY + Math.round(85 * s720) + idx * Math.round(42 * s720));
        });
      }

      if (subHeadline && subHeadline.trim()) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `${Math.round(22 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.fillText(subHeadline.trim(), Math.round(24 * s720), jacketY + Math.round(85 * s720) + headlineLines.length * Math.round(42 * s720) + Math.round(5 * s720));
      }

      const footerY = height - Math.round(58 * s720);
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, footerY, width, Math.round(34 * s720));

      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(16 * s720)}px Arial, sans-serif`;
      const footerParts: string[] = [];
      if (socialHandle && socialHandle.trim()) footerParts.push(socialHandle.trim());
      if (opts.showWebsite !== false && websiteUrl && websiteUrl.trim()) footerParts.push(`🌐 ${websiteUrl.trim()}`);
      if ((opts.showWhatsapp !== false && opts.showMobileNumber !== false) && mobileNumber && mobileNumber.trim()) footerParts.push(`📞 ${mobileNumber.trim()}`);
      const footerText = footerParts.join('   •   ');
      if (footerText) {
        ctx.textAlign = 'center';
        ctx.fillText(footerText, width / 2, footerY + Math.round(23 * s720));
        ctx.textAlign = 'left';
      }

      if (opts.showTicker !== false && tickerText && tickerText.trim()) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, height - Math.round(24 * s720), width, Math.round(24 * s720));
        ctx.fillStyle = '#fde047';
        ctx.font = `bold ${Math.round(13 * s720)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.fillText(`⚡ ${tickerText.trim()}`, Math.round(12 * s720), height - Math.round(7 * s720));
      }
    }
  }

  // Central / Overlay Watermark (Strict Mutual Exclusion: text vs image)
  if (drawOverlayLayer && opts.showWatermark) {
    if (opts.watermarkType === 'image') {
      const img = opts.watermarkImageImg;
      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(0.95, opts.watermarkOpacity || 0.4));
          const maxW = Math.round(width * 0.28);
          const imgAspect = (img.naturalWidth / Math.max(1, img.naturalHeight)) || 1;
          const dw = maxW;
          const dh = dw / imgAspect;
          const dx = width - dw - Math.round(width * 0.033);
          const dy = Math.round((height / 2) + ((opts.watermarkOffsetY || 0) * (height / 1080)));
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        } catch {}
      }
    } else {
      const wmText = opts.watermarkCustomText || opts.watermarkText;
      if (wmText) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.08, Math.min(0.9, opts.watermarkOpacity || 0.25));
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 8;
        const wmScale = width / 720;
        ctx.font = `900 ${Math.round(24 * wmScale)}px "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const wmY = Math.round((height / 2) + ((opts.watermarkOffsetY || 0) * (height / 1080)));
        ctx.fillText(wmText, width / 2, wmY);
        ctx.restore();
      }
    }
  }
}

export const VideoStudioWeb: React.FC<VideoStudioWebProps> = ({
  currentUser,
  initialVideo,
  initialVideoUrl,
  initialHeadline,
  onOpenCloudSettings,
  onShowToast,
  onBackToGraphic,
  onNavigateHome,
}) => {
  const showToast = onShowToast || ((msg: string) => console.log(msg));

  // Profile data
  const [profile] = useState<ChannelProfile | null>(() => getSavedProfile());

  // Admin & Master Admin access check for Studio Mode
  const isAdminOrMaster = Boolean(
    isEffectiveSuperAdmin(currentUser) ||
    isUserAdmin(currentUser) ||
    isUserSuperAdmin(currentUser?.email || '') ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.email?.includes('breakingnewswala') ||
    currentUser?.email?.includes('admin')
  );

  // Mode 1 (Ready-to-Use / Quick Video) vs Mode 2 (Full Video Studio)
  // On mobile or when opened from Video & Reels, Quick Video workflow is MANDATORY (Part 2 & Part 3)
  const [isReadyToUseMode, setIsReadyToUseMode] = useState<boolean>(true);

  // Video Source & Playback State - clean default (no hardcoded mov_bbb fallback per Part C.5 & F.13)
  const [videoUrl, setVideoUrl] = useState<string>(
    initialVideoUrl || initialVideo?.videoUrl || ''
  );

  // Source-aware flag: when entering from Video & Reels (Part 8)
  const isFromVideoReels = Boolean(initialVideo || initialVideoUrl);

  // Video Color Filters (Part 8.D)
  const [videoColorFilter, setVideoColorFilter] = useState<'original' | 'bright' | 'contrast' | 'warm' | 'cool' | 'bw' | 'cinematic'>('original');

  const getVideoFilterCss = (filter: 'original' | 'bright' | 'contrast' | 'warm' | 'cool' | 'bw' | 'cinematic'): string => {
    switch (filter) {
      case 'bright':
        return 'brightness(1.2) saturate(1.1)';
      case 'contrast':
        return 'contrast(1.3) saturate(1.15)';
      case 'warm':
        return 'sepia(0.3) saturate(1.3) hue-rotate(-10deg)';
      case 'cool':
        return 'hue-rotate(15deg) saturate(1.1) brightness(1.05)';
      case 'bw':
        return 'grayscale(100%) contrast(1.15)';
      case 'cinematic':
        return 'contrast(1.25) brightness(0.95) saturate(1.2) sepia(0.12)';
      case 'original':
      default:
        return 'none';
    }
  };

  // Watermark options (Part 8.H)
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkCustomText, setWatermarkCustomText] = useState<string>('');

  const parseVideoDurationSeconds = (rawDur: any, fallback = 60): number => {
    if (typeof rawDur === 'number' && isFinite(rawDur) && rawDur > 1) return rawDur;
    const str = String(rawDur || '').trim();
    if (!str) return fallback;
    if (str.includes(':')) {
      const parts = str.split(':').map((p) => parseFloat(p.replace(/[^\d.]/g, '')) || 0);
      if (parts.length === 2) {
        const secs = parts[0] * 60 + parts[1];
        return secs > 1 ? secs : fallback;
      }
      if (parts.length === 3) {
        const secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        return secs > 1 ? secs : fallback;
      }
    }
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    return isFinite(num) && num > 1 ? num : fallback;
  };

  // Sync video source whenever an initial video or URL is passed
  useEffect(() => {
    const url = initialVideoUrl || initialVideo?.videoUrl || '';
    if (url) {
      const parsedDur = parseVideoDurationSeconds(initialVideo?.duration, 60);
      setVideoUrl(url);
      setTrimStart(0);
      setTrimEnd(parsedDur);
      setClips([{
        id: `clip-${Date.now()}`,
        name: initialVideo?.title || 'वीडियो क्लिप',
        url,
        duration: parsedDur,
        trimStart: 0,
        trimEnd: parsedDur,
      }]);
      if (initialHeadline || initialVideo?.title) {
        const h = initialHeadline || initialVideo?.title || '';
        setHeadline(h);
        setHeadlineVariants([h]);
      }
      if (initialVideo?.aspectRatio) {
        const ar = initialVideo.aspectRatio === '16:9' ? '4:3' : (initialVideo.aspectRatio as VideoAspect);
        setAspect(ar);
      }
    }
  }, [initialVideoUrl, initialVideo?.videoUrl, initialVideo?.id, initialHeadline]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Location & Ticker Independent Controls (Part E.9 & F.17)
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showTicker, setShowTicker] = useState<boolean>(true);

  // Raw Script AI Headline Generator State (Part E.11)
  const [rawScriptText, setRawScriptText] = useState<string>('');
  const [rawScriptSuggestions, setRawScriptSuggestions] = useState<string[]>([]);
  const [isGeneratingRawHeadlines, setIsGeneratingRawHeadlines] = useState<boolean>(false);

  // Studio Mode: Multi-Clip Video Timeline (Part F.13 & F.14)
  const [clips, setClips] = useState<VideoClipItem[]>(() => {
    const defaultUrl = initialVideoUrl || initialVideo?.videoUrl || '';
    if (defaultUrl) {
      const parsedDur = parseVideoDurationSeconds(initialVideo?.duration, 60);
      return [{
        id: 'clip-1',
        name: initialVideo?.title || 'वीडियो क्लिप 1',
        url: defaultUrl,
        duration: parsedDur,
        trimStart: 0,
        trimEnd: parsedDur,
      }];
    }
    return [];
  });
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);

  // Studio Mode: Headline Scheduling (Part F.16)
  const [headlineScheduleMode, setHeadlineScheduleMode] = useState<'single' | 'scheduled'>('single');
  const [headlineInterval, setHeadlineInterval] = useState<number>(10);
  const [scheduledHeadlines, setScheduledHeadlines] = useState<string[]>(() => {
    const init = initialHeadline || initialVideo?.title || '';
    return init ? [init] : [];
  });

  // Studio Mode: Voiceover Audio Track (Part F.15)
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [voiceoverTitle, setVoiceoverTitle] = useState<string>('');
  const [voiceoverVolume, setVoiceoverVolume] = useState<number>(85);
  const [voiceoverStartTime, setVoiceoverStartTime] = useState<number>(0);
  const voiceoverFileInputRef = useRef<HTMLInputElement>(null);

  // Completed Download State for Fallback Direct Click (Part G.21)
  const [completedDownloadUrl, setCompletedDownloadUrl] = useState<string | null>(null);
  const [completedDownloadFilename, setCompletedDownloadFilename] = useState<string | null>(null);
  const [completedFileSizeLabel, setCompletedFileSizeLabel] = useState<string>('');
  const completedBlobRef = useRef<Blob | null>(null);
  const [isVideoSuccessModalOpen, setIsVideoSuccessModalOpen] = useState<boolean>(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);

  // Listen for native Android MediaStore video save results
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prevHandler = (window as any).onAndroidVideoDownloadResult;
    (window as any).onAndroidVideoDownloadResult = (success: boolean, message?: string) => {
      if (success) {
        showToast(message || '✅ वीडियो गैलरी (Movies/AINewsMaker) में सुरक्षित हो गया!');
      } else {
        showToast(message || '❌ वीडियो सेव करने में समस्या आई, कृपया पुनः प्रयास करें।');
      }
    };
    return () => {
      if (prevHandler) {
        (window as any).onAndroidVideoDownloadResult = prevHandler;
      } else {
        delete (window as any).onAndroidVideoDownloadResult;
      }
    };
  }, []);

  // Format bytes to human-readable MB/KB label
  const formatExportBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  // Helper: Stream video Blob in 192 KB chunks to Android Native Bridge (prevents 1 MB Binder IPC TransactionTooLargeException)
  const streamVideoBlobToAndroidBridge = async (blob: Blob, filename: string): Promise<boolean> => {
    const bridge = (window as any).AndroidBridge;
    if (!bridge || typeof bridge.beginVideoDownload !== 'function' || typeof bridge.appendVideoChunk !== 'function' || typeof bridge.finishVideoDownload !== 'function') {
      return false;
    }
    const mimeType = blob.type || (filename.endsWith('.webm') ? 'video/webm' : 'video/mp4');
    const transferId: string = bridge.beginVideoDownload(filename, mimeType);
    if (!transferId) return false;

    const CHUNK_SIZE = 192 * 1024; // 192 KB raw (~256 KB Base64) — safely under Android Binder limit
    try {
      for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
        const slice = blob.slice(offset, Math.min(offset + CHUNK_SIZE, blob.size));
        const chunkBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = typeof reader.result === 'string' ? reader.result : '';
            const idx = res.indexOf(',');
            resolve(idx >= 0 ? res.slice(idx + 1) : res);
          };
          reader.onerror = () => reject(new Error('Chunk read error'));
          reader.readAsDataURL(slice);
        });
        const ok = bridge.appendVideoChunk(transferId, chunkBase64);
        if (!ok) {
          try { bridge.cancelVideoDownload?.(transferId); } catch {}
          return false;
        }
      }
      const saved = bridge.finishVideoDownload(transferId);
      return Boolean(saved);
    } catch (chunkErr) {
      console.warn('[VideoExport] Chunked AndroidBridge stream failed:', chunkErr);
      try { bridge.cancelVideoDownload?.(transferId); } catch {}
      return false;
    }
  };

  // Robust Browser File Download Helper (Desktop Web, Mobile Web & Android WebView App)
  const triggerBrowserDownload = (blob: Blob, filename: string): boolean => {
    try {
      if (!blob || blob.size < 100) {
        showToast('❌ अमान्य वीडियो फ़ाइल');
        return false;
      }

      // Android Native Bridge Detection (Part 8.1 - Native Android Gallery Storage)
      if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
        const bridge = (window as any).AndroidBridge;
        if (typeof bridge.beginVideoDownload === 'function' && typeof bridge.appendVideoChunk === 'function' && typeof bridge.finishVideoDownload === 'function') {
          streamVideoBlobToAndroidBridge(blob, filename).then((ok) => {
            if (!ok) {
              showToast('⚠️ वीडियो सेव करने में त्रुटि आई, कृपया पुनः सेव बटन दबाएं।');
            }
          });
          return true;
        }
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            if (dataUrl && (window as any).AndroidBridge.downloadVideo) {
              (window as any).AndroidBridge.downloadVideo(dataUrl, filename);
            } else if (dataUrl && (window as any).AndroidBridge.saveVideoToGallery) {
              const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
              (window as any).AndroidBridge.saveVideoToGallery(base64, filename);
            }
          };
          reader.readAsDataURL(blob);
          return true;
        } catch (androidErr) {
          console.warn('[VideoExport] AndroidBridge error:', androidErr);
        }
      }

      // Universal Browser Direct Download (PC Windows, macOS, Android Chrome, iOS Safari)
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.setAttribute('download', filename);
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);

      try {
        link.click();
      } catch (clickErr) {
        try {
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
          });
          link.dispatchEvent(clickEvent);
        } catch {}
      }

      setTimeout(() => {
        try {
          if (link.parentNode) document.body.removeChild(link);
        } catch {}
      }, 5000);

      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }, 300000);

      return true;
    } catch (err) {
      console.error('triggerBrowserDownload error:', err);
      return false;
    }
  };

  // Explicit Share Handler (Runs on fresh user tap inside Success Modal — never blocks direct download)
  const handleShareExportedVideo = async () => {
    const filename = completedDownloadFilename || generateVideoDownloadFileName('mp4');
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.shareLastSavedVideo) {
      try {
        const shared = (window as any).AndroidBridge.shareLastSavedVideo(headline || filename);
        if (shared) return;
      } catch {}
    }
    const blob = completedBlobRef.current;
    if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: headline || filename,
            text: generatedCaptionText || 'AI News Maker Video Report',
          });
          return;
        }
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') return;
        console.warn('[VideoExport] Share sheet unavailable, falling back to direct download:', shareErr);
      }
    }
    handleImmediateDownload();
  };

  // Immediate Download Handler for completed renders (prevents re-render and SPA unloading)
  const handleImmediateDownload = () => {
    const filename = completedDownloadFilename || generateVideoDownloadFileName('mp4');
    if (completedBlobRef.current) {
      triggerBrowserDownload(completedBlobRef.current, filename);
    } else if (completedDownloadUrl) {
      const link = document.createElement('a');
      link.href = completedDownloadUrl;
      link.download = filename;
      link.setAttribute('download', filename);
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) document.body.removeChild(link);
      }, 3000);
    }
    showToast('✅ वीडियो आपके डिवाइस में सेव हो रहा है!');
  };
  
  // Auto-set aspect ratio based on incoming video - default 9:16 for reels or incoming ratio
  const [aspect, setAspect] = useState<VideoAspect>(() => {
    if (initialVideo?.aspectRatio) {
      if (initialVideo.aspectRatio === '16:9') return '4:3';
      return initialVideo.aspectRatio as VideoAspect;
    }
    return '9:16';
  });

  // Ratio is locked ONLY when opened from Video & Reels with configured ratio (Part 7.2). Direct Studio entry has all 4 ratios selectable (Part 7.1).
  const isRatioLocked = Boolean(initialVideo);
  
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Video Transform Controls
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(60);

  // Incoming video caption (transferred from feed)
  const [videoCaption, setVideoCaption] = useState<string>(
    initialVideo?.caption || ''
  );

  // Frame Selection State
  const [selectedFrameId, setSelectedFrameId] = useState<string>(() => {
    if (initialVideo?.compatibleFrameIds && initialVideo.compatibleFrameIds.length > 0) {
      return initialVideo.compatibleFrameIds[0];
    }
    if (initialVideo?.aspectRatio === '9:16' || aspect === '9:16') {
      if (initialVideo?.cropRegion) return 'frame-custom-3line-4-5';
      return 'frame-custom-full-9-16';
    }
    return 'frame-classic-lower-third';
  });

  // 4 Headline Variants State
  const [headlineVariants, setHeadlineVariants] = useState<string[]>(() => {
    if (initialVideo?.headlineVariants && initialVideo.headlineVariants.length > 0) {
      return initialVideo.headlineVariants;
    }
    return [];
  });
  const [activeVariantIdx, setActiveVariantIdx] = useState<number>(0);

  // 4:5 Core Crop Region State
  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; width: number; height: number; aspectRatio: '4:5' } | null>(() => {
    if (initialVideo?.cropRegion) return initialVideo.cropRegion;
    if (initialVideo?.aspectRatio === '9:16') {
      return { x: 0, y: 0.15, width: 1, height: 0.8, aspectRatio: '4:5' };
    }
    return null;
  });

  const isOnly4_5 = initialVideo?.isOnly4_5 || false;

  // Overlay Content Controls - Clean blank initial state per Section 2
  const [headline, setHeadline] = useState<string>(() => {
    if (initialVideo?.headlineVariants && initialVideo.headlineVariants.length > 0) {
      return initialVideo.headlineVariants[0];
    }
    return initialHeadline || initialVideo?.title || '';
  });
  const [subHeadline, setSubHeadline] = useState<string>('');
  const [location, setLocation] = useState<string>(
    initialVideo?.location || (profile as any)?.district || (profile as any)?.city || ''
  );
  const [channelTag, setChannelTag] = useState<string>(
    profile?.channelNameHi || currentUser?.channelName || ''
  );

  // Social Media Strip Position: 'footer' (नीचे) vs 'header' (ऊपर)
  const [socialPosition, setSocialPosition] = useState<'footer' | 'header'>('footer');

  // Caption Modal State & Project Completion Flag
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState<boolean>(false);
  const [isProjectCompleted, setIsProjectCompleted] = useState<boolean>(false);

  // Navigation Home Helper
  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    if ((window as any).setAppTab) {
      (window as any).setAppTab('home');
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.history && window.history.pushState) {
        window.history.pushState({ tab: 'home' }, '', '/');
      }
    }
  };

  // GIF Logo Priority & PNG Choice (Part 9 & Prompt Section 12)
  // If user profile has no GIF logo, task GIF logo can be uploaded for current task without modifying profile.
  const [taskGifLogo, setTaskGifLogo] = useState<string>('');
  const [logoFormatPreference, setLogoFormatPreference] = useState<'gif' | 'png'>('gif');
  const userGifLogo = taskGifLogo || profile?.channelLogoGifUrl || (currentUser as any)?.channelLogoGifUrl || '';
  const userPngLogo = profile?.channelLogoPngUrl || profile?.channelLogoUrl || currentUser?.channelLogoUrl || '';
  const hasBothLogos = Boolean(userGifLogo && userPngLogo);
  const activeLogoUrl = (hasBothLogos && logoFormatPreference === 'png') ? userPngLogo : (userGifLogo || userPngLogo || '');
  const [channelLogoUrl, setChannelLogoUrl] = useState<string>(activeLogoUrl);
  const [logoScale, setLogoScale] = useState<number>(100);
  const isGifActive = Boolean(activeLogoUrl && (activeLogoUrl.toLowerCase().includes('.gif') || activeLogoUrl.startsWith('data:image/gif')));

  // Text Watermark (Section 13: Watermark Positioning with vertical offset)
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.25);
  const [watermarkOffsetY, setWatermarkOffsetY] = useState<number>(0);
  const channelNameHi = useMemo(() => {
    return (profile?.channelNameHi || currentUser?.channelName || 'ब्रेकिंग न्यूज़').trim();
  }, [profile?.channelNameHi, currentUser?.channelName]);

  const channelNameEn = useMemo(() => {
    return (profile?.channelNameEn || (currentUser as any)?.channelNameEn || (typeof localStorage !== 'undefined' ? localStorage.getItem('app_channel_name_en') : '') || 'BREAKING NEWS WALA').trim().toUpperCase();
  }, [profile?.channelNameEn, currentUser]);

  const watermarkText = useMemo(() => {
    return watermarkCustomText || channelNameHi || channelNameEn || 'AI NEWS MAKER';
  }, [watermarkCustomText, channelNameHi, channelNameEn]);

  // Audio Selection (Section 6 Step 2: 1. Original Audio, 2. Background Music, 3. No Music)
  const [audioOption, setAudioOption] = useState<'original' | 'bgm' | 'none'>('original');

  // Quick Video Active Workflow Step (1 to 5 + Final)
  const [quickStep, setQuickStep] = useState<number>(1);
  const [studioStep, setStudioStep] = useState<number>(1);
  const [studioViewMode, setStudioViewMode] = useState<'stepwise' | 'grid'>('stepwise');

  // Mobile Detection (Part 3)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [mobileStep, setMobileStep] = useState<number>(1);

  useEffect(() => {
    if (isMobile || initialVideo) {
      setIsReadyToUseMode(true);
    }
  }, [isMobile, initialVideo]);

  // Genuinely blank social & footer information per Section 2 (no dummy @AINewsMaker / ainewsmaker.online)
  const [socialHandle, setSocialHandle] = useState<string>(
    profile?.username ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`) : ''
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    profile?.websiteUrl || ''
  );
  const [mobileNumber, setMobileNumber] = useState<string>(
    profile?.whatsappDisplayNumber || profile?.whatsappNumber || profile?.mobileNumber || ''
  );
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    profile?.showMobileNumber ?? true
  );
  const [showWebsite, setShowWebsite] = useState<boolean>(true);
  const [showWhatsapp, setShowWhatsapp] = useState<boolean>(true);

  // Dynamic Published Video Frames (Part 9 & 10)
  const [dynamicVideoFrames, setDynamicVideoFrames] = useState<DynamicFrameTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalDynamicFrames().filter(
        (f) => (f.frameMode === 'video' || f.frameType === 'video') && f.publicationStatus === 'published'
      );
    }
    return [];
  });

  useEffect(() => {
    const loadPublishedVideoFrames = () => {
      fetchDynamicFramesFromApi({ frameType: 'video' })
        .then((frames) => {
          const videoOnly = (frames || []).filter(
            (f) => (f.frameMode === 'video' || f.frameType === 'video') && f.publicationStatus === 'published'
          );
          setDynamicVideoFrames(videoOnly);
        })
        .catch(() => {});
    };
    loadPublishedVideoFrames();
    window.addEventListener('dynamic_frames_updated', loadPublishedVideoFrames);
    return () => window.removeEventListener('dynamic_frames_updated', loadPublishedVideoFrames);
  }, []);

  const dynamicConvertedVideoFrames: VideoFrameDefinition[] = useMemo(() => {
    return dynamicVideoFrames.map((df) => {
      const ratio = (df.aspectRatio || '9:16') as '9:16' | '1:1' | '4:5' | '4:3';
      const vRect = df.videoConfig?.videoRect || { x: 0, y: 15, width: 100, height: 75 };
      return {
        id: df.id,
        name: df.name,
        nameHi: df.name,
        description: df.description || `AI जनरेटेड ${ratio} वीडियो फ्रेम`,
        badge: `★ AI ${ratio}`,
        canvasRatio: ratio,
        supportedModes: ratio === '4:5' ? ['core_4_5', 'native_4_5'] : ratio === '9:16' ? ['full_9_16', 'core_4_5'] : ['standard'],
        headline: {
          maxLines: df.textSlots?.[0]?.maxLines || 3,
          area: 'bottom',
          fontSizeDefault: 28,
          color: '#ffffff',
          backgroundStyle: 'lower_third_dark',
        },
        logo: {
          position: 'top-left',
          boxStyle: 'transparent',
        },
        location: {
          position: 'top-left',
          badgeStyle: 'white_blue_pin',
        },
        videoWindow: {
          aspectRatio: ratio,
          mode: df.videoConfig?.displayMode === 'crop' ? 'full' : 'window',
          top: (vRect.y || 15) / 100,
          bottom: ((vRect.y || 15) + (vRect.height || 75)) / 100,
          left: (vRect.x || 0) / 100,
          right: ((vRect.x || 0) + (vRect.width || 100)) / 100,
        },
        footer: {
          visible: true,
          style: 'dark_pill_strip',
        },
        tierEligibility: (df.allowedPlans?.[0] || 'BASIC') as any,
        coinPrice: 0,
        isActive: true,
        isCustom: true,
        rawDynamicFrame: df,
        videoConfig: df.videoConfig,
        videoTargetMode: df.videoTargetMode || 'quick_video',
        customLayers: df.layers,
      };
    });
  }, [dynamicVideoFrames]);

  const activeDynamicFrame = useMemo(() => {
    return dynamicConvertedVideoFrames.find((f) => f.id === selectedFrameId) || null;
  }, [dynamicConvertedVideoFrames, selectedFrameId]);

  // Compatible Frames List
  const compatibleFrames = useMemo(() => {
    const currentMode: 'quick_video' | 'studio_mode' = isReadyToUseMode ? 'quick_video' : 'studio_mode';

    const builtin = getCompatibleFrames({
      aspectRatio: aspect,
      isOnly4_5,
      hasCoreCrop: Boolean(cropRegion),
    }).filter((bf) => {
      const mode = (bf as any).videoTargetMode || (bf.canvasRatio === '9:16' || bf.canvasRatio === '4:5' ? (isReadyToUseMode ? 'quick_video' : 'studio_mode') : 'studio_mode');
      return mode === currentMode;
    });

    const dynamicMatching = dynamicConvertedVideoFrames.filter((df) => {
      const mode = (df as any).videoTargetMode || 'quick_video';
      if (mode !== currentMode) return false;
      if (aspect === '4:5') return df.canvasRatio === '4:5' || df.canvasRatio === '9:16';
      if (aspect === '9:16') return df.canvasRatio === '9:16';
      if (aspect === '1:1') return df.canvasRatio === '1:1';
      if (aspect === '4:3') return df.canvasRatio === '4:3';
      return true;
    });

    const seen = new Set<string>();
    const combined: VideoFrameDefinition[] = [];
    for (const f of [...dynamicMatching, ...builtin]) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        combined.push(f);
      }
    }
    return combined;
  }, [aspect, isOnly4_5, cropRegion, dynamicConvertedVideoFrames, isReadyToUseMode]);

  // Listen to profile updates (Prioritizes GIF logo, falls back to PNG)
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      const p = e.detail;
      if (p) {
        const logo = p.channelLogoGifUrl || p.channelLogoPngUrl || p.channelLogoUrl || '';
        if (logo) setChannelLogoUrl(logo);
      }
    };
    window.addEventListener('channel_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('channel_profile_updated', handleProfileUpdate);
  }, []);

  // Priority: Default Image Watermark to user's profile channel logo
  useEffect(() => {
    if (watermarkType === 'image' && !watermarkImage) {
      const defaultLogo = userPngLogo || activeLogoUrl || channelLogoUrl || '/assets/ai_news_maker_logo.png';
      if (defaultLogo) {
        setWatermarkImage(defaultLogo);
      }
    }
  }, [watermarkType, watermarkImage, userPngLogo, activeLogoUrl, channelLogoUrl]);

  const [tickerText, setTickerText] = useState<string>('');
  const [isExclusiveBadge, setIsExclusiveBadge] = useState<boolean>(true);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number>(0);
  const [videoExportStatus, setVideoExportStatus] = useState<string>('');
  const [videoExportError, setVideoExportError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Export Cancellation and Task Tracking Refs (Section 10)
  const cancelExportRef = useRef<boolean>(false);
  const activeExportIdRef = useRef<string | null>(null);

  // Central Validation Mechanism (Section 7: Strict Completion Validation)
  const quickVideoValidation = useMemo(() => {
    const missing: { key: string; label: string; step: number }[] = [];

    // 1. Valid video
    const hasVideo = Boolean((videoUrl && videoUrl.trim()) || (clips.length > 0 && clips.some((c) => c.url && c.url.trim())));
    if (!hasVideo) {
      missing.push({ key: 'video', label: 'वीडियो जोड़ें (Add Video)', step: 1 });
    }

    // 2. Aspect ratio
    const hasAspect = Boolean(aspect);
    if (!hasAspect) {
      missing.push({ key: 'aspect', label: 'आस्पेक्ट रेशियो चुनें', step: 1 });
    }

    // 3. Compatible frame
    const hasFrame = Boolean(selectedFrameId && compatibleFrames.some((f) => f.id === selectedFrameId));
    if (!hasFrame) {
      missing.push({ key: 'frame', label: 'कंपैटिबल फ़्रेम चुनें', step: 1 });
    }

    // 4. Audio selection resolved
    const hasAudio = Boolean(audioOption === 'original' || audioOption === 'bgm' || audioOption === 'none');
    if (!hasAudio) {
      missing.push({ key: 'audio', label: 'ऑडियो या संगीत विकल्प तय करें', step: 2 });
    }

    // 5. Headline entered (trimmed non-empty)
    const hasHeadline = Boolean(headline && headline.trim().length > 0);
    if (!hasHeadline) {
      missing.push({ key: 'headline', label: 'मुख्य हेडलाइन दर्ज करें (Headline Required)', step: 3 });
    }

    // 6. Location entered (trimmed non-empty)
    const hasLocation = Boolean(location && location.trim().length > 0);
    if (!hasLocation) {
      missing.push({ key: 'location', label: 'खबर की लोकेशन दर्ज करें (Location Required)', step: 4 });
    }

    // 7. Footer/Social info present
    const hasFooter = Boolean(
      (socialHandle && socialHandle.trim().length > 0) ||
      (channelTag && channelTag.trim().length > 0) ||
      (mobileNumber && mobileNumber.trim().length > 0)
    );
    if (!hasFooter) {
      missing.push({ key: 'footer', label: 'फ़ूटर या सोशल मीडिया जानकारी दर्ज करें', step: 5 });
    }

    const totalRequirements = 7;
    const completedRequirements = totalRequirements - missing.length;
    const completionPercentage = Math.round((completedRequirements / totalRequirements) * 100);
    const isValid = missing.length === 0;

    return {
      isValid,
      completionPercentage,
      missingItems: missing,
      stepsStatus: {
        1: hasVideo && hasAspect && hasFrame,
        2: hasHeadline,
        3: hasLocation,
        4: hasFooter,
        5: isValid,
      } as Record<number, boolean>,
    };
  }, [videoUrl, clips, aspect, selectedFrameId, compatibleFrames, audioOption, headline, location, socialHandle, channelTag, mobileNumber]);

  // Render interactive empty-state video placeholder per Part 2
  const renderVideoPlaceholder = (customClass?: string) => (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center select-none bg-gradient-to-b from-neutral-900/95 via-neutral-950/95 to-black/95 backdrop-blur-xs cursor-pointer border border-dashed border-amber-500/30 hover:border-amber-400 transition-colors ${customClass || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setQuickStep(1);
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg group-hover:scale-105 transition-transform">
        <Film className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <p className="text-xs sm:text-sm font-bold text-amber-300 max-w-xs leading-relaxed">
        वीडियो न्यूज़ स्टूडियो के स्टेप 1 में जाकर पहले अपने कंप्यूटर या फोन से वीडियो चुनें।
      </p>
      <span className="mt-2 text-[10px] sm:text-[11px] text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded-full border border-neutral-700/60 font-medium">
        📁 वीडियो चुनने के लिए यहाँ क्लिक करें (Step 1)
      </span>
    </div>
  );

  // Reset Task Handler (Section 5)
  const executeReset = () => {
    // Safely stop playback
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
    setIsPlaying(false);

    // Safely stop export if active
    if (isExportingRef.current || isExporting) {
      cancelExportRef.current = true;
      activeExportIdRef.current = null;
      setIsExporting(false);
      isExportingRef.current = false;
      setVideoExportStatus('');
      setVideoExportProgress(0);
    }

    // Clear video source, clips, and preview references
    setVideoUrl('');
    setClips([]);
    setActiveClipIndex(0);
    setCompletedDownloadUrl(null);
    completedBlobRef.current = null;

    // Reset duration and playback time
    setDuration(0);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);

    // Clear headlines
    setHeadline('');
    setSubHeadline('');
    setScheduledHeadlines(['', '', '', '', '']);

    // Reset location, ticker, zoom, crop and offsets
    setLocation('');
    setTickerText('');
    setZoomScale(1.0);
    setOffsetY(0);
    setCropRegion(null);

    // Reset audio and watermark settings
    setAudioOption('original');
    setBgmTrack('none');
    setBgmVolume(0);
    setVideoVolume(100);
    setCustomAudioUrl('');
    setCustomAudioTitle('');
    setVoiceoverUrl('');
    setShowWatermark(false);
    setWatermarkOffsetY(0);
    setTaskGifLogo('');
    setVideoColorFilter('original');

    // Reset file-input values so the same file can be reselected
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (additionalClipInputRef.current) additionalClipInputRef.current.value = '';
    if (voiceoverFileInputRef.current) voiceoverFileInputRef.current.value = '';
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';

    // Close confirmation modal
    setIsResetConfirmModalOpen(false);

    // Return to Step 1 & Quick Video Mode
    setIsReadyToUseMode(true);
    setQuickStep(1);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    showToast('🔄 वर्तमान वीडियो प्रोजेक्ट रीसेट हो गया (चरण 1 पर लौटे)');
  };

  const handleResetTask = () => {
    setIsResetConfirmModalOpen(true);
  };

  // Draft Save Handler (Section 5)
  const handleSaveDraft = () => {
    try {
      const saved = saveVideoDraft({
        videoUrl,
        headline1: headline,
        location,
        channelName: channelTag,
        channelLogoUrl: activeLogoUrl,
        aspect,
        zoomScale,
        offsetY,
        trimStart,
        trimEnd,
        selectedFrameId,
        websiteUrl,
        socialHandle,
        mobileNumber,
        watermarkOffsetY,
        audioOption,
        bgmTrack,
        bgmVolume,
        videoVolume,
      });
      if (saved) {
        showToast('💾 ड्राफ्ट सफलतापूर्वक सेव हुआ!');
      } else {
        showToast('❌ ड्राफ्ट सेव करने में समस्या आई');
      }
    } catch {
      showToast('❌ ड्राफ्ट सेव करने में समस्या आई');
    }
  };

  // Export Cancel Handler (Section 10)
  const handleCancelExport = () => {
    cancelExportRef.current = true;
    activeExportIdRef.current = null;
    setIsExporting(false);
    isExportingRef.current = false;
    setVideoExportStatus('');
    setVideoExportProgress(0);
    showToast('❌ एक्सपोर्ट रद्द किया गया। आप संपादन जारी रख सकते हैं।');
  };

  // Active headline based on scheduling in Studio Mode (Part F.16)
  const activeHeadline = useMemo(() => {
    if (headlineScheduleMode === 'single' || scheduledHeadlines.length <= 1) {
      return headline;
    }
    const valid = scheduledHeadlines.filter((h) => h.trim().length > 0);
    if (valid.length === 0) return headline;
    const idx = Math.floor(currentTime / headlineInterval) % valid.length;
    return valid[idx];
  }, [headlineScheduleMode, scheduledHeadlines, headline, currentTime, headlineInterval]);

  // Formatted Social Caption Text
  const generatedCaptionText = useMemo(() => {
    const userTag = profile?.username ? `#${profile.username.replace(/[^a-zA-Z0-9_]/g, '')}` : '#reporter';
    const locLine = (showLocation && location.trim()) ? `📍 लोकेशन: ${location.trim()}\n` : '';
    return `🎬 【वीडियो बुलेटिन】\n\n🚨 ${activeHeadline}\n${subHeadline ? `📌 ${subHeadline}\n` : ''}${locLine}🏷️ चैनल: ${channelTag}\n🌐 वेबसाइट: ${websiteUrl}\n📱 संपर्क: ${mobileNumber}\n\n${userTag} #BreakingNews #VideoReport #DigitalNews #LiveNews`;
  }, [activeHeadline, subHeadline, location, channelTag, websiteUrl, mobileNumber, profile?.username, showLocation]);

  // Raw Script to Headlines AI Generator reusing canonical AI Tools rules (Part 5)
  const handleGenerateFromRawScript = async () => {
    if (!rawScriptText.trim()) {
      showToast('कृपया पहले रॉ स्क्रिप्ट या खबर का विवरण दर्ज करें');
      return;
    }
    setIsGeneratingRawHeadlines(true);
    try {
      const raw = rawScriptText.trim();

      // Step 1: Call canonical AI Tools backend endpoint (/api/process-news-command)
      try {
        const response = await fetch(getApiUrl('/api/process-news-command'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: raw,
            command: `Extract high-impact Hindi breaking news headlines and journalistic summary from this script: "${raw}". Produce factual, non-flattery journalistic headline.`,
            mode: 'text',
          }),
        });

        if (response.ok) {
          const rawJson = await response.json();
          const data = rawJson?.data || rawJson;
          if (data && (data.headline || data.title)) {
            const primary = (data.headline || data.title || '').trim();
            const factSentences = (data.summary || data.caption || raw)
              .split(/[।.\n!?]+/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length >= 10);
            const suggestions = generate5BalancedHeadlineOptions(primary, factSentences, data.location || location).slice(0, 4);
            setRawScriptSuggestions(suggestions);
            setHeadline(suggestions[0] || primary);
            if (data.location && !location) setLocation(data.location);
            if (data.caption && !videoCaption) setVideoCaption(data.caption);
            showToast('✅ AI टूल्स नियमों द्वारा 4 नए हेडलाइन सुझाव तैयार हैं!');
            return;
          }
        }
      } catch (netErr) {
        console.warn('Network call to process-news-command failed, falling back to canonical local rules:', netErr);
      }

      // Step 2: Canonical fallback using processNewsLocally & generate5BalancedHeadlineOptions
      const res = processNewsLocally(raw);
      const sentences = raw
        .split(/[।.\n!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 10);

      const base = (res as any)?.headline || (res as any)?.title || sentences[0] || 'मुख्य समाचार बुलेटिन';
      const suggestions = generate5BalancedHeadlineOptions(base, sentences, (res as any)?.location || location).slice(0, 4);

      setRawScriptSuggestions(suggestions);
      setHeadline(suggestions[0] || base);
      if ((res as any)?.location && !location) setLocation((res as any).location);
      if ((res as any)?.caption && !videoCaption) setVideoCaption((res as any).caption);
      showToast('✅ 4 नए हेडलाइन सुझाव तैयार हैं!');
    } catch {
      showToast('हेडलाइन जनरेट करने में समस्या आई');
    } finally {
      setIsGeneratingRawHeadlines(false);
    }
  };

  // Background Music State: default to original sound only ('none'), unless audioMix is configured
  const [bgmTrack, setBgmTrack] = useState<string>(() => initialVideo?.audioMix?.bgmTrack || 'none');
  const [bgmVolume, setBgmVolume] = useState<number>(() => initialVideo?.audioMix?.bgmVolume ?? 0);
  const [videoVolume, setVideoVolume] = useState<number>(() => initialVideo?.audioMix?.originalVolume ?? 100);
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [customAudioTitle, setCustomAudioTitle] = useState<string>('');
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Video Transitions State
  const [transitionType, setTransitionType] = useState<VideoTransitionType>('flash');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.5);
  const [isTransitionActive, setIsTransitionActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalClipInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isExportingRef = useRef<boolean>(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      newsAudio.stop();
    };
  }, []);

  // Sync initial video changes
  useEffect(() => {
    if (initialVideoUrl) setVideoUrl(initialVideoUrl);
    if (initialHeadline) setHeadline(initialHeadline);
    if (initialVideo) {
      if (initialVideo.videoUrl) setVideoUrl(initialVideo.videoUrl);
      if (initialVideo.caption) setVideoCaption(initialVideo.caption);
      if (initialVideo.channel) setChannelTag(initialVideo.channel);
      if (initialVideo.aspectRatio) setAspect(initialVideo.aspectRatio as VideoAspect);
      if (initialVideo.location) setLocation(initialVideo.location);

      if (initialVideo.audioMix) {
        if (initialVideo.audioMix.bgmTrack) setBgmTrack(initialVideo.audioMix.bgmTrack);
        if (typeof initialVideo.audioMix.bgmVolume === 'number') setBgmVolume(initialVideo.audioMix.bgmVolume);
        if (typeof initialVideo.audioMix.originalVolume === 'number') setVideoVolume(initialVideo.audioMix.originalVolume);
      } else {
        setBgmTrack('none');
        setBgmVolume(0);
        setVideoVolume(100);
      }

      if (initialVideo.headlineVariants && initialVideo.headlineVariants.length > 0) {
        setHeadlineVariants(initialVideo.headlineVariants);
        setHeadline(initialVideo.headlineVariants[0]);
        setActiveVariantIdx(0);
      } else if (initialVideo.title) {
        setHeadline(initialVideo.title);
      }

      if (initialVideo.cropRegion) {
        setCropRegion(initialVideo.cropRegion);
      }

      if (initialVideo.compatibleFrameIds && initialVideo.compatibleFrameIds.length > 0) {
        setSelectedFrameId(initialVideo.compatibleFrameIds[0]);
      } else if (initialVideo.aspectRatio === '9:16') {
        if (initialVideo.cropRegion) {
          setSelectedFrameId('frame-custom-3line-4-5');
        } else {
          setSelectedFrameId('frame-custom-full-9-16');
        }
      }

      setIsReadyToUseMode(true);
    }
  }, [initialVideo, initialVideoUrl, initialHeadline]);

  // Video Playback Loop & Trim Enforcement
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      if (isExportingRef.current) return; // Never interrupt video export recording loop
      setCurrentTime(v.currentTime);
      if (trimEnd > 0 && v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
        if (!isPlaying) {
          v.pause();
          newsAudio.stop();
        } else {
          // Loop transition trigger
          if (transitionType !== 'none') {
            setIsTransitionActive(true);
            setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      const actualDur = (v.duration && isFinite(v.duration) && v.duration > 1)
        ? v.duration
        : parseVideoDurationSeconds(initialVideo?.duration, 60);
      setDuration(actualDur);
      if (trimEnd === 60 || trimEnd <= 1.5 || trimEnd > actualDur) {
        setTrimEnd(Math.ceil(actualDur));
      }
      setClips((prev) =>
        prev.map((c, idx) =>
          idx === activeClipIndex
            ? {
                ...c,
                duration: actualDur,
                trimEnd: (c.trimEnd === 60 || c.trimEnd <= 1.5 || c.trimEnd > actualDur) ? Math.ceil(actualDur) : c.trimEnd,
              }
            : c
        )
      );
    };

    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [trimStart, trimEnd, isPlaying, transitionType, transitionDuration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.volume = isMuted ? 0 : videoVolume / 100;
      v.play()
        .then(() => {
          setIsPlaying(true);
          if (bgmTrack !== 'none') {
            newsAudio.setVolume(bgmVolume / 100);
            if (bgmTrack === 'custom' && customAudioUrl) {
              newsAudio.playCustomAudio(customAudioUrl);
            } else {
              newsAudio.playTrack(bgmTrack);
            }
          }
          if (transitionType !== 'none') {
            setIsTransitionActive(true);
            setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
          }
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      newsAudio.stop();
    }
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setCompletedDownloadUrl(null);
    completedBlobRef.current = null;
      completedBlobRef.current = null;
      setIsPlaying(false);
      setTrimStart(0);

      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = localUrl;
      tempVideo.onloadedmetadata = () => {
        const realDur = tempVideo.duration && isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 60;
        setDuration(realDur);
        setTrimEnd(Math.floor(realDur));
        setClips((prev) => {
          const newClip: VideoClipItem = {
            id: `clip-${Date.now()}`,
            name: file.name.slice(0, 24),
            url: localUrl,
            duration: realDur,
            trimStart: 0,
            trimEnd: Math.floor(realDur),
          };
          return prev.length === 0 ? [newClip] : [newClip, ...prev.slice(1)];
        });
      };
      showToast('✅ आपका वीडियो लोड हो गया है!');
    }
  };

  const handleAddAdditionalClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = localUrl;
      tempVideo.onloadedmetadata = () => {
        const realDur = tempVideo.duration && isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 60;
        const newClip: VideoClipItem = {
          id: `clip-${Date.now()}`,
          name: file.name.slice(0, 24),
          url: localUrl,
          duration: realDur,
          trimStart: 0,
          trimEnd: Math.floor(realDur),
        };
        setClips((prev) => [...prev, newClip]);
      };
      showToast(`✅ क्लिप जोड़ी जा रही है...`);
    }
  };

  const handleVoiceoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setVoiceoverUrl(localUrl);
      setVoiceoverTitle(file.name.slice(0, 24));
      showToast('🎙️ वॉइसओवर ऑडियो ट्रैक सफलतापूर्वक जोड़ा गया!');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type.includes('gif') || file.name.toLowerCase().endsWith('.gif');
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setChannelLogoUrl(dataUrl);
          showToast(isGif ? '🎬 एनिमेटेड GIF लोगो अपलोड हो रहा है...' : '📦 चैनल लोगो अपलोड हो रहा है...');

          try {
            const userIdentifier = currentUser?.username || profile?.username || currentUser?.email || profile?.email || '';
            const res = await fetch('/api/upload-logo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl,
                logoType: isGif ? 'gif' : 'png',
                username: userIdentifier,
                email: currentUser?.email || profile?.email || '',
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.logoUrl) {
                setChannelLogoUrl(data.logoUrl);
                // Update local storage profile
                try {
                  const existingRaw = localStorage.getItem('user_channel_profile') || localStorage.getItem('user_profile_data');
                  const existing = existingRaw ? JSON.parse(existingRaw) : {};
                  const updated = {
                    ...existing,
                    ...(isGif
                      ? { channelLogoGifUrl: data.logoUrl, channelLogoType: 'gif' }
                      : { channelLogoPngUrl: data.logoUrl, channelLogoType: 'png', channelLogoUrl: data.logoUrl }),
                  };
                  localStorage.setItem('user_channel_profile', JSON.stringify(updated));
                  localStorage.setItem('user_profile_data', JSON.stringify(updated));
                  window.dispatchEvent(new CustomEvent('channel_profile_updated', { detail: updated }));
                } catch {}
                showToast(isGif ? '✅ एनिमेटेड GIF स्थायी रूप से सेव हुआ!' : '✅ चैनल लोगो स्थायी रूप से सेव हुआ!');
              }
            }
          } catch (err) {
            console.warn('Video Studio logo upload error:', err);
            showToast('✅ लोगो लागू किया गया (लोकल)');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const seekTo = (targetSec: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(v.duration || 60, targetSec));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const [isStandaloneBgmPlaying, setIsStandaloneBgmPlaying] = useState<boolean>(false);

  const toggleStandaloneBgmPreview = () => {
    if (isStandaloneBgmPlaying) {
      newsAudio.stop();
      setIsStandaloneBgmPlaying(false);
    } else {
      if (bgmTrack === 'none') {
        showToast('कृपया पहले कोई बैकग्राउंड म्यूज़िक ट्रैक चुनें');
        return;
      }
      newsAudio.setVolume(bgmVolume / 100);
      if (bgmTrack === 'custom' && customAudioUrl) {
        newsAudio.playCustomAudio(customAudioUrl);
      } else {
        newsAudio.playTrack(bgmTrack);
      }
      setIsStandaloneBgmPlaying(true);
      showToast('🎵 बैकग्राउंड म्यूज़िक चल रहा है');
    }
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      setCustomAudioTitle(file.name);
      setBgmTrack('custom');
      if (isPlaying || isStandaloneBgmPlaying) {
        newsAudio.playCustomAudio(url);
      }
      showToast(`🎵 कस्टम ऑडियो लोड हुआ: ${file.name}`);
    }
  };

  const triggerTransitionPreview = () => {
    if (transitionType === 'none') {
      showToast('कृपया पहले कोई ट्रांज़िशन इफ़ेक्ट चुनें');
      return;
    }
    setIsTransitionActive(true);
    setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
    showToast(`✨ ${transitionType.toUpperCase()} ट्रांज़िशन टेस्ट`);
  };

  // Helper to split headline into balanced lines
  const autoSplitHeadline = (text: string, targetLines: 2 | 3) => {
    const clean = text.replace(/\n+/g, ' ').trim();
    const words = clean.split(/\s+/);
    if (words.length <= targetLines) return clean;

    if (targetLines === 2) {
      const mid = Math.ceil(words.length / 2);
      return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
    } else {
      const part1 = Math.ceil(words.length / 3);
      const part2 = Math.ceil((words.length - part1) / 2);
      return (
        words.slice(0, part1).join(' ') +
        '\n' +
        words.slice(part1, part1 + part2).join(' ') +
        '\n' +
        words.slice(part1 + part2).join(' ')
      );
    }
  };

  // AI Headline Generator for Video (2-line or 3-line)
  const handleGenerateAiHeadline = async (linesCount: 2 | 3) => {
    const contextText = videoCaption ? `${videoCaption}. ${headline}` : (headline || subHeadline);
    if (!contextText.trim()) {
      showToast('कृपया पहले कोई संदर्भ, कैप्शन या विषय लिखें');
      return;
    }
    setIsAiGenerating(true);
    try {
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: contextText,
          command: `Rewrite this video context into a high-impact Hindi breaking news headline of exactly ${linesCount} lines: "${contextText}". Return a catchy, professional Hindi breaking news headline with newlines.`,
          headline_max_lines: linesCount,
          headline_line_count: linesCount,
          headline_area: `${linesCount}-Line Video Headline Area`,
          template_id: linesCount === 2 ? 'graphic_003' : 'graphic_001',
          mode: 'text',
        }),
      });
      if (response.ok) {
        const rawJson = await response.json();
        const data = rawJson?.data || rawJson;
        if (data && data.headline) {
          const formatted = autoSplitHeadline(data.headline.trim(), linesCount);
          setHeadline(formatted);
          if (data.location) setLocation(data.location);
          showToast(`✨ AI द्वारा ${linesCount} लाइन हेडलाइन तैयार!`);
          return;
        }
      }
      const local = processNewsLocally(contextText, undefined, {
        headline_max_lines: linesCount,
        headline_line_count: linesCount,
        headline_area: `${linesCount}-Line Video Headline Area`,
      });
      const formatted = autoSplitHeadline(local.headline, linesCount);
      setHeadline(formatted);
      showToast(`✨ AI द्वारा ${linesCount} लाइन हेडलाइन तैयार!`);
    } catch {
      const local = processNewsLocally(contextText, undefined, {
        headline_max_lines: linesCount,
        headline_line_count: linesCount,
        headline_area: `${linesCount}-Line Video Headline Area`,
      });
      const formatted = autoSplitHeadline(local.headline, linesCount);
      setHeadline(formatted);
      showToast(`✨ ${linesCount} लाइन हेडलाइन तैयार!`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Copy Social Media Caption
  const handleCopyCaption = () => {
    const userTag = profile?.username ? `#${profile.username.replace(/[^a-zA-Z0-9_]/g, '')}` : '#reporter';
    const caption = `🎬 【वीडियो बुलेटिन】\n\n🚨 ${headline}\n${subHeadline ? `📌 ${subHeadline}\n` : ''}\n📍 लोकेशन: ${location}\n🏷️ चैनल: ${channelTag}\n🌐 वेबसाइट: ${websiteUrl}\n📱 संपर्क: ${mobileNumber}\n\n${userTag} #BreakingNews #VideoReport #DigitalNews #LiveNews`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      showToast('✅ वीडियो सोशल मीडिया कैप्शन कॉपी हो गया!');
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  // Export Video Snapshot / Frame with exact composition
  const handleDownloadSnapshot = () => {
    setIsExporting(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const width = aspect === '9:16' ? 720 : aspect === '16:9' ? 1280 : aspect === '4:3' ? 960 : aspect === '4:5' ? 1080 : 1080;
      const height = aspect === '9:16' ? 1280 : aspect === '16:9' ? 720 : aspect === '4:5' ? 1350 : aspect === '4:3' ? 720 : 1080;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsExporting(false);
        return;
      }

      const dynamicVConf = activeDynamicFrame?.rawDynamicFrame?.videoConfig;
      const effectiveLogoUrl = dynamicVConf?.logoUrl || activeLogoUrl;
      let logoImg: HTMLImageElement | null = null;
      if (effectiveLogoUrl) {
        try {
          logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = effectiveLogoUrl;
          dynamicImageCache.set(effectiveLogoUrl, logoImg);
        } catch {}
      }

      drawVideoCompositionToCanvas(ctx, width, height, {
        video,
        selectedFrameId,
        activeDynamicFrame,
        headline,
        subHeadline,
        location,
        channelTag,
        logoImg,
        websiteUrl,
        socialHandle,
        mobileNumber,
        showMobileNumber,
        showWebsite,
        showWhatsapp,
        cropRegion,
        aspect,
        zoomScale,
        offsetY,
        isExclusiveBadge,
        tickerText,
        logoScale,
        showWatermark,
        watermarkOpacity,
        watermarkOffsetY,
        watermarkText: watermarkText || profile?.channelNameHi || 'AI NEWS MAKER',
        watermarkType,
        watermarkCustomText: watermarkCustomText || watermarkText || profile?.channelNameHi || '',
        socialPosition,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const filename = `video_news_frame_${Date.now()}.jpg`;
      if ((window as any).AndroidBridge?.downloadImage) {
        (window as any).AndroidBridge.downloadImage(dataUrl, filename);
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
      showToast('✅ वीडियो न्यूज़ जैकेट स्नैपशॉट डाउनलोड हो गया!');
    } catch (err) {
      console.error('Snapshot export error:', err);
      showToast('एक्सपोर्ट में समस्या आई, वीडियो फ्रेम कैप्चर नहीं हो सका');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger welcome reward for 1st video export from Video Studio (500 coins - strict one-time)
  const triggerVideoWelcomeReward = () => {
    try {
      const email = (currentUser?.email || profile?.email || '').toLowerCase().trim();
      if (!email) return;

      fetch(getApiUrl('/api/rewards/first-time-export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'video' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.awarded) {
            window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
            window.dispatchEvent(new CustomEvent('ai_news_wallet_updated'));
            setTimeout(() => {
              showToast('🎉 बधाई! वीडियो स्टूडियो से प्रथम वीडियो एक्सपोर्ट पर आपको 500 वेलकम बोनस कॉइन्स मिले!');
            }, 600);
          }
        })
        .catch(() => {});
    } catch {}
  };

  // Export Full Video File with Complete Composition (Parity Guarantee: Video + Frame + Audio)
  const handleDownloadVideo = async (forceRerender: boolean | any = false) => {
    if (isExporting) return;
    const shouldForceRerender = forceRerender === true;

    // If video is already rendered and ready, instantly download without re-rendering or consuming additional quota!
    if (!shouldForceRerender && (completedDownloadUrl || completedBlobRef.current)) {
      handleImmediateDownload();
      setIsVideoSuccessModalOpen(true);
      return;
    }

    // Strict Completion Validation (Section 7: No blank or incomplete video exports)
    if (!quickVideoValidation.isValid) {
      const firstMissing = quickVideoValidation.missingItems[0]?.label || 'अधूरे फील्ड भरें';
      showToast(`❌ वीडियो डाउनलोड के लिए सभी आवश्यक चरण पूरे होना अनिवार्य है: ${firstMissing}`);
      return;
    }

    // Daily Video Creation Quota Enforcement (Basic: 3, Advanced: 7, Pro: 15, VIP: 30)
    if (currentUser?.email) {
      try {
        const requestId = `req_vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const targetVidId = initialVideo?.id || `vid_${activeHeadline.slice(0, 30).replace(/\s+/g, '_')}`;
        const quotaRes = await fetch(getApiUrl('/api/user/consume-video-creation-quota'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            userId: currentUser.userId,
            requestId,
            videoId: targetVidId,
          }),
        });
        const quotaData = await quotaRes.json();
        if (quotaRes.status === 403 || quotaData.exhausted) {
          showToast(quotaData.error || 'आज की वीडियो निर्माण दैनिक सीमा समाप्त हो चुकी है। कृपया कल पुनः प्रयास करें या प्लान अपग्रेड करें।');
          return;
        }
        if (quotaData && quotaData.success) {
          window.dispatchEvent(new CustomEvent('ai_news_video_quota_updated', { detail: quotaData }));
        }
      } catch (e) {
        console.warn('Video quota consumption check failed, proceeding safely:', e);
      }
    }

    const currentExportId = `export_${Date.now()}`;
    activeExportIdRef.current = currentExportId;
    cancelExportRef.current = false;

    setIsExporting(true);
    isExportingRef.current = true;
    setVideoExportError(null);
    setVideoExportProgress(5);
    setVideoExportStatus('कैनवास व न्यूज़ जैकेट तैयार हो रहे हैं...');

    const video = videoRef.current;
    if (!video) {
      setIsExporting(false);
      isExportingRef.current = false;
      showToast('❌ वीडियो प्लेयर उपलब्ध नहीं है। कृपया पहले वीडियो लोड करें।');
      return;
    }

    // Freeze & pause preview video immediately so it doesn't play aloud or move in background
    setIsPlaying(false);
    try {
      video.pause();
    } catch {}

    let originalLoop = video.loop;
    // Hoisted export resources so catch & finally NEVER hit ReferenceError and always clean up
    let canvas: HTMLCanvasElement | null = null;
    let exportVideoEl: HTMLVideoElement = video;
    let tempExportVideoEl: HTMLVideoElement | null = null;
    let tempExportBlobUrl: string | null = null;
    const extraAudioEls: HTMLAudioElement[] = [];
    const tempAudioNodes: AudioNode[] = [];
    let keepAliveOsc: OscillatorNode | null = null;
    let activeCanvasStream: MediaStream | null = null;
    let activeCombinedStream: MediaStream | null = null;

    // Helper: Ensure external cross-origin images route through /api/proxy-image so canvas stays untainted
    const toCorsSafeImageUrl = (rawUrl: string): string => {
      if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('/')) {
        return rawUrl;
      }
      try {
        const parsed = new URL(rawUrl, window.location.href);
        if (parsed.origin === window.location.origin) return rawUrl;
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return getApiUrl(`/api/proxy-image?url=${encodeURIComponent(rawUrl)}`);
        }
      } catch {}
      return rawUrl;
    };

    // Helper: Detect if drawing the preview <video> taints canvas (e.g. crossOrigin stripped on remote video)
    const isVideoCanvasSafe = (vid: HTMLVideoElement): boolean => {
      try {
        if (!vid || vid.readyState < 2 || !vid.videoWidth || !vid.videoHeight) return false;
        const probe = document.createElement('canvas');
        probe.width = 4;
        probe.height = 4;
        const pCtx = probe.getContext('2d');
        if (!pCtx) return true;
        pCtx.drawImage(vid, 0, 0, 4, 4);
        probe.toDataURL('image/png');
        return true;
      } catch {
        return false;
      }
    };

    try {
      // Ensure preview video metadata duration is loaded before export
      if (!video.duration || isNaN(video.duration) || video.duration === 0) {
        setVideoExportStatus('वीडियो मेटाडेटा लोड हो रहा है...');
        await new Promise<void>((resolve) => {
          if (video.duration && !isNaN(video.duration) && video.duration > 0) return resolve();
          const onMeta = () => {
            video.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          video.addEventListener('loadedmetadata', onMeta);
          setTimeout(resolve, 1500);
        });
      }

      // Check if export was cancelled during metadata load
      if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
        setIsExporting(false);
        isExportingRef.current = false;
        return;
      }

      // CORS-Safe Video Guarantee: if preview video taints canvas (remote URL without CORS), load via /api/proxy-video
      const rawSourceUrl = (video.currentSrc || video.src || videoUrl || '').trim();
      const needsCorsProxy =
        rawSourceUrl.startsWith('http://') || rawSourceUrl.startsWith('https://')
          ? (!isVideoCanvasSafe(video) && (() => {
              try {
                return new URL(rawSourceUrl, window.location.href).origin !== window.location.origin || !video.crossOrigin;
              } catch {
                return true;
              }
            })())
          : false;

      if (needsCorsProxy && rawSourceUrl) {
        setVideoExportProgress(10);
        setVideoExportStatus('सुरक्षित वीडियो स्ट्रीम तैयार हो रही है...');
        try {
          const proxiedVideoUrl = getApiUrl(`/api/proxy-video?url=${encodeURIComponent(rawSourceUrl)}`);
          const offscreenVid = document.createElement('video');
          offscreenVid.crossOrigin = 'anonymous';
          offscreenVid.playsInline = true;
          offscreenVid.preload = 'auto';
          offscreenVid.muted = false;
          offscreenVid.style.position = 'fixed';
          offscreenVid.style.left = '-9999px';
          offscreenVid.style.top = '0px';
          offscreenVid.style.width = '2px';
          offscreenVid.style.height = '2px';
          offscreenVid.style.opacity = '0.01';
          offscreenVid.style.pointerEvents = 'none';
          document.body.appendChild(offscreenVid);
          tempExportVideoEl = offscreenVid;

          const loadViaSrc = (srcToLoad: string) =>
            new Promise<boolean>((resolve) => {
              let done = false;
              const finish = (ok: boolean) => {
                if (done) return;
                done = true;
                offscreenVid.removeEventListener('loadeddata', onReady);
                offscreenVid.removeEventListener('canplay', onReady);
                offscreenVid.removeEventListener('error', onErr);
                resolve(ok);
              };
              const onReady = () => finish(true);
              const onErr = () => finish(false);
              offscreenVid.addEventListener('loadeddata', onReady);
              offscreenVid.addEventListener('canplay', onReady);
              offscreenVid.addEventListener('error', onErr);
              offscreenVid.src = srcToLoad;
              offscreenVid.load();
              setTimeout(() => finish(offscreenVid.readyState >= 2), 12000);
            });

          let proxyLoaded = await loadViaSrc(proxiedVideoUrl);
          if (!proxyLoaded) {
            // Fallback: fetch proxied video as Blob URL
            const resp = await fetch(proxiedVideoUrl);
            if (resp.ok) {
              const vBlob = await resp.blob();
              if (vBlob.size > 1024) {
                tempExportBlobUrl = URL.createObjectURL(vBlob);
                proxyLoaded = await loadViaSrc(tempExportBlobUrl);
              }
            }
          }

          if (proxyLoaded && offscreenVid.readyState >= 2 && isVideoCanvasSafe(offscreenVid)) {
            exportVideoEl = offscreenVid;
          }
        } catch (proxyErr) {
          console.warn('[VideoExport] CORS proxy video setup notice:', proxyErr);
        }
      }

      // Prevent active export video from looping back to 0 during export
      originalLoop = exportVideoEl.loop;
      exportVideoEl.loop = false;

      // Smart Resolution & Bitrate Scaling:
      // Match natural source HD resolution (720p for mobile or <=720p sources -> 56% less encoder load & zero lag; 1080p for true Full-HD desktop sources)
      const isAndroidWebView = typeof window !== 'undefined' && Boolean((window as any).AndroidBridge);
      const isMobileExportDevice =
        isAndroidWebView ||
        (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
      const srcNatW = exportVideoEl.videoWidth || 720;
      const srcNatH = exportVideoEl.videoHeight || 1280;
      const useCrisp720p = isMobileExportDevice || Math.max(srcNatW, srcNatH) <= 1300;

      let width = useCrisp720p
        ? (aspect === '9:16' ? 720 : aspect === '1:1' ? 720 : aspect === '4:5' ? 720 : aspect === '4:3' ? 960 : 1280)
        : (aspect === '9:16' ? 1080 : aspect === '1:1' ? 1080 : aspect === '4:5' ? 1080 : aspect === '4:3' ? 1440 : 1920);
      let height = useCrisp720p
        ? (aspect === '9:16' ? 1280 : aspect === '1:1' ? 720 : aspect === '4:5' ? 900 : aspect === '4:3' ? 720 : 720)
        : (aspect === '9:16' ? 1920 : aspect === '1:1' ? 1080 : aspect === '4:5' ? 1350 : aspect === '4:3' ? 1080 : 1080);

      // Ensure even dimensions for H.264/VP8 hardware encoders
      width = width - (width % 2);
      height = height - (height % 2);

      const exportFps = isMobileExportDevice ? 25 : 30;
      const exportBitrate = useCrisp720p ? 3600000 : 5500000;

      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.position = 'fixed';
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      canvas.style.width = '1px';
      canvas.style.height = '1px';
      canvas.style.opacity = '0.01';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '-1';
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        throw new Error('कैनवास संदर्भ उपलब्ध नहीं है');
      }

      // Helper to preload images CORS-safely without tainting canvas
      const preloadCorsSafeImage = (origUrl: string, cacheKey?: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const safeSrc = toCorsSafeImageUrl(origUrl);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          let settled = false;
          const done = (result: HTMLImageElement | null) => {
            if (settled) return;
            settled = true;
            if (result && cacheKey) dynamicImageCache.set(cacheKey, result);
            resolve(result);
          };
          img.onload = () => done(img.naturalWidth > 0 ? img : null);
          img.onerror = () => done(null);
          img.src = safeSrc;
          setTimeout(() => done(img.complete && img.naturalWidth > 0 ? img : null), 1500);
        });
      };

      // Preload logo image (Master Admin template logo overrides user profile logo fallback)
      const dynamicVConf = activeDynamicFrame?.rawDynamicFrame?.videoConfig;
      const effectiveLogoUrl = dynamicVConf?.logoUrl || activeLogoUrl;
      let logoImg: HTMLImageElement | null = null;
      if (effectiveLogoUrl) {
        logoImg = await preloadCorsSafeImage(effectiveLogoUrl, effectiveLogoUrl);
      }

      // Preload dynamic overlay assets and custom ribbons (CORS-clean)
      if (dynamicVConf?.overlayAssets && dynamicVConf.overlayAssets.length > 0) {
        await Promise.all(
          dynamicVConf.overlayAssets
            .filter((o) => o.url && o.visible !== false)
            .map((o) => preloadCorsSafeImage(o.url, o.url))
        );
      }

      if (dynamicVConf?.ribbonLayers && dynamicVConf.ribbonLayers.length > 0) {
        await Promise.all(
          dynamicVConf.ribbonLayers
            .filter((r) => r.customRibbonUrl && r.visible !== false)
            .map((r) => preloadCorsSafeImage(r.customRibbonUrl!, r.customRibbonUrl!))
        );
      }

      // Preload watermark image if image watermark selected (Part 8.H)
      let watermarkImgPreload: HTMLImageElement | null = null;
      if (showWatermark && watermarkType === 'image' && watermarkImage) {
        watermarkImgPreload = await preloadCorsSafeImage(watermarkImage);
      }

      setVideoExportProgress(15);
      setVideoExportStatus('ऑडियो व वीडियो स्ट्रीम तैयार हो रहे हैं...');

      const captureStreamFn = canvas.captureStream || (canvas as any).mozCaptureStream;
      if (!captureStreamFn || typeof MediaRecorder === 'undefined') {
        // Fallback to high-res composite news jacket snapshot if MediaRecorder unsupported
        handleDownloadSnapshot();
        setVideoExportProgress(100);
        setVideoExportStatus('स्नैपशॉट डाउनलोड पूर्ण');
        return;
      }

      const canvasStream: MediaStream = captureStreamFn.call(canvas, exportFps);
      activeCanvasStream = canvasStream;
      const vTracks = canvasStream.getVideoTracks();
      if (!vTracks || vTracks.length === 0) {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        throw new Error('कैनवास वीडियो स्ट्रीम प्रारंभ नहीं हो सकी। कृपया पुनः प्रयास करें।');
      }
      let combinedStream: MediaStream = canvasStream;
      let audioCtx: AudioContext | null = null;

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtx = (window as any).__videoStudioAudioCtx as AudioContext | null;
          if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioCtxClass();
            (window as any).__videoStudioAudioCtx = audioCtx;
          }
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const dest = audioCtx.createMediaStreamDestination();

          // Silent keepalive oscillator prevents Chromium MP4/WebM MediaRecorder from stalling on muted/silent videos
          try {
            const osc = audioCtx.createOscillator();
            const silentGain = audioCtx.createGain();
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            silentGain.gain.setValueAtTime(0.00001, audioCtx.currentTime);
            osc.connect(silentGain);
            silentGain.connect(dest);
            osc.start();
            keepAliveOsc = osc;
            tempAudioNodes.push(silentGain);
          } catch {}

          // 1. Video audio source (with caching per element)
          let mediaSource = (exportVideoEl as any).__audioSourceNode as MediaElementAudioSourceNode | null;
          if (!mediaSource) {
            try {
              mediaSource = audioCtx.createMediaElementSource(exportVideoEl);
              (exportVideoEl as any).__audioSourceNode = mediaSource;
            } catch (e) {
              console.warn('Audio source reuse notice:', e);
            }
          }
          if (mediaSource) {
            try {
              const videoGain = audioCtx.createGain();
              videoGain.gain.setValueAtTime(videoVolume / 100, audioCtx.currentTime);
              mediaSource.connect(videoGain);
              videoGain.connect(dest);
              tempAudioNodes.push(videoGain);
            } catch {}
          }

          // 2. Background music source (if active)
          if (customAudioUrl || bgmTrack !== 'none') {
            try {
              if (customAudioUrl) {
                const bgmAudio = new Audio(customAudioUrl);
                bgmAudio.crossOrigin = 'anonymous';
                bgmAudio.loop = true;
                const bgmSource = audioCtx.createMediaElementSource(bgmAudio);
                const bgmGain = audioCtx.createGain();
                bgmGain.gain.setValueAtTime(bgmVolume / 100, audioCtx.currentTime);
                bgmSource.connect(bgmGain);
                bgmGain.connect(dest);
                extraAudioEls.push(bgmAudio);
                tempAudioNodes.push(bgmSource, bgmGain);
                bgmAudio.play().catch(() => {});
              }
            } catch {}
          }

          // 3. Voiceover track (if active)
          if (voiceoverUrl) {
            try {
              const voAudio = new Audio(voiceoverUrl);
              voAudio.crossOrigin = 'anonymous';
              const voSource = audioCtx.createMediaElementSource(voAudio);
              const voGain = audioCtx.createGain();
              voGain.gain.setValueAtTime(voiceoverVolume / 100, audioCtx.currentTime);
              voSource.connect(voGain);
              voGain.connect(dest);
              extraAudioEls.push(voAudio);
              tempAudioNodes.push(voSource, voGain);
              voAudio.play().catch(() => {});
            } catch {}
          }

          const aTrack = dest.stream.getAudioTracks()[0];
          if (aTrack) {
            combinedStream = new MediaStream([...canvasStream.getVideoTracks(), aTrack]);
            activeCombinedStream = combinedStream;
          }
        }
      } catch (err) {
        console.warn('Audio mixing setup fallback:', err);
      }

      const fallbackDur = (duration && isFinite(duration) && duration > 1.5)
        ? duration
        : parseVideoDurationSeconds(initialVideo?.duration, 30);
      const rawVideoDuration = (exportVideoEl.duration && isFinite(exportVideoEl.duration) && exportVideoEl.duration > 1.5)
        ? exportVideoEl.duration
        : (video.duration && isFinite(video.duration) && video.duration > 1.5 ? video.duration : fallbackDur);
      const startTime = isReadyToUseMode ? 0 : Math.max(0, trimStart || 0);
      const validTrimEnd = (trimEnd && isFinite(trimEnd) && trimEnd > startTime + 1.5 && trimEnd <= rawVideoDuration)
        ? trimEnd
        : rawVideoDuration;
      const rawEnd = isReadyToUseMode ? rawVideoDuration : validTrimEnd;
      const endTime = Math.max(startTime + 2, rawEnd);
      const totalDuration = Math.max(2, endTime - startTime);

      // Pre-render static frame jacket (crimson header, headline, location badge, logo, yellow footer, watermark)
      // onto a cached offscreen overlayCanvas ONCE (only re-rendered if scheduled headline changes).
      // Cuts per-frame CPU overhead from ~45ms to <2ms GPU blit -> silky-smooth zero-lag export!
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = width;
      overlayCanvas.height = height;
      const overlayCtx = overlayCanvas.getContext('2d');
      let cachedOverlayHeadline: string | null = null;
      let hasDrawnFirstVideoFrame = false;

      const buildCompositionOpts = (
        expHeadlineText: string,
        drawMode: 'full' | 'video-only' | 'overlay-only'
      ): DrawCompositionOptions => ({
        video: exportVideoEl,
        selectedFrameId,
        activeDynamicFrame,
        headline: expHeadlineText,
        subHeadline,
        location,
        channelTag,
        logoImg,
        websiteUrl,
        socialHandle,
        mobileNumber,
        showMobileNumber,
        showWebsite,
        showWhatsapp,
        cropRegion,
        aspect,
        zoomScale,
        offsetY,
        isExclusiveBadge,
        tickerText,
        logoScale,
        showWatermark,
        watermarkOpacity,
        watermarkOffsetY,
        watermarkText: watermarkText || profile?.channelNameHi || '',
        filterCss: getVideoFilterCss(videoColorFilter),
        watermarkType,
        watermarkImageImg: watermarkImgPreload,
        watermarkCustomText: watermarkCustomText || watermarkText || profile?.channelNameHi || '',
        socialPosition,
        showLocation,
        showTicker,
        drawMode,
        preserveLastFrame: hasDrawnFirstVideoFrame,
      });

      const drawFrameWithHeadline = (expHeadlineText: string) => {
        if (activeDynamicFrame?.rawDynamicFrame || !overlayCtx) {
          drawVideoCompositionToCanvas(ctx, width, height, buildCompositionOpts(expHeadlineText, 'full'));
          if (exportVideoEl.readyState >= 2) hasDrawnFirstVideoFrame = true;
          return;
        }
        if (cachedOverlayHeadline !== expHeadlineText) {
          drawVideoCompositionToCanvas(overlayCtx, width, height, buildCompositionOpts(expHeadlineText, 'overlay-only'));
          cachedOverlayHeadline = expHeadlineText;
        }
        drawVideoCompositionToCanvas(ctx, width, height, buildCompositionOpts(expHeadlineText, 'video-only'));
        if (exportVideoEl.readyState >= 2) hasDrawnFirstVideoFrame = true;
        ctx.drawImage(overlayCanvas, 0, 0);
      };

      // Resilient recording pass runner (supports automatic retry on video-only WebM if primary codec/audio stalls)
      const executeRecordingPass = async (
        streamToRecord: MediaStream,
        mimeCandidates: string[],
        passBitrate: number
      ): Promise<Blob> => {
        let chosenMime = '';
        for (const m of mimeCandidates) {
          if (!m) continue;
          try {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
              chosenMime = m;
              break;
            }
          } catch {}
        }

        const recOpts: MediaRecorderOptions = {
          ...(chosenMime ? { mimeType: chosenMime } : {}),
          videoBitsPerSecond: passBitrate,
        };
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(streamToRecord, recOpts);
        } catch {
          try {
            recorder = new MediaRecorder(streamToRecord, chosenMime ? { mimeType: chosenMime } : undefined);
          } catch {
            recorder = new MediaRecorder(streamToRecord);
          }
        }

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const recordingDone = new Promise<Blob>((resolve, reject) => {
          let settled = false;
          const watchdogMs = Math.max(45000, Math.round((totalDuration + 20) * 1000));
          const fallbackTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            const recordedType = recorder.mimeType || chosenMime || 'video/webm';
            resolve(new Blob(chunks, { type: recordedType }));
          }, watchdogMs);

          recorder.onstop = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            const recordedType = recorder.mimeType || chosenMime || 'video/webm';
            resolve(new Blob(chunks, { type: recordedType }));
          };
          recorder.onerror = (e) => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            reject(e);
          };
        });

        // Seek export video to startTime cleanly
        exportVideoEl.pause();
        if (Math.abs(exportVideoEl.currentTime - startTime) > 0.05 || exportVideoEl.ended) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const finishSeek = () => {
              if (settled) return;
              settled = true;
              exportVideoEl.removeEventListener('seeked', finishSeek);
              resolve();
            };
            exportVideoEl.addEventListener('seeked', finishSeek);
            try {
              exportVideoEl.currentTime = startTime;
            } catch {}
            setTimeout(finishSeek, 2000);
          });
        }

        const scheduledList = scheduledHeadlines.filter((h) => h.trim().length > 0);
        const initialExpHeadline =
          headlineScheduleMode === 'scheduled' && scheduledList.length > 1
            ? (scheduledList[0] || headline)
            : headline;

        // Draw initial crisp frame before starting MediaRecorder
        drawFrameWithHeadline(initialExpHeadline);

        // Use 1000ms timeslice to avoid excessive GC / chunk overhead during encoding
        recorder.start(1000);
        setVideoExportProgress(20);
        setVideoExportStatus('वीडियो फ्रेम व जैकेट रेंडर हो रहे हैं...');

        // Play export video (unmuted first for audio capture; fallback to muted if autoplay restricted)
        exportVideoEl.muted = false;
        exportVideoEl.playbackRate = 1.0;
        try {
          await exportVideoEl.play();
        } catch {
          exportVideoEl.muted = true;
          try { await exportVideoEl.play(); } catch {}
        }

        const exportStartWallTime = Date.now();
        let maxReportedPct = 20;
        let hasEnded = false;

        await new Promise<void>((resolve) => {
          let animId = 0;
          let rvfcHandle = 0;
          let healthTimerId: ReturnType<typeof setInterval> | null = null;
          let lastDrawMs = 0;
          const minFrameIntervalMs = Math.floor(1000 / exportFps);
          const hasRvfc = typeof (exportVideoEl as any).requestVideoFrameCallback === 'function';

          const stopAndFinish = () => {
            if (hasEnded) return;
            hasEnded = true;
            try {
              exportVideoEl.removeEventListener('ended', handleVideoEnded);
            } catch {}
            if (animId) cancelAnimationFrame(animId);
            if (hasRvfc && rvfcHandle && typeof (exportVideoEl as any).cancelVideoFrameCallback === 'function') {
              try { (exportVideoEl as any).cancelVideoFrameCallback(rvfcHandle); } catch {}
            }
            if (healthTimerId) clearInterval(healthTimerId);
            try {
              if (recorder.state === 'recording') {
                try { recorder.requestData(); } catch {}
                recorder.stop();
              } else if (recorder.state !== 'inactive') {
                recorder.stop();
              }
            } catch {}
            try {
              exportVideoEl.pause();
            } catch {}
            resolve();
          };

          const handleVideoEnded = () => {
            // Draw final clean frame before stopping recorder
            const finalH =
              headlineScheduleMode === 'scheduled' && scheduledList.length > 1
                ? (scheduledList[Math.floor(exportVideoEl.currentTime / headlineInterval) % scheduledList.length] || headline)
                : headline;
            drawFrameWithHeadline(finalH);
            stopAndFinish();
          };
          exportVideoEl.addEventListener('ended', handleVideoEnded);

          const checkCompletionAndProgress = () => {
            if (hasEnded) return true;
            if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
              stopAndFinish();
              return true;
            }

            const wallElapsed = Math.max(0, (Date.now() - exportStartWallTime) / 1000);
            const elapsed = Math.max(0, Math.min(totalDuration, exportVideoEl.currentTime - startTime));
            const timePct = Math.min(95, Math.max(20, Math.round(20 + (elapsed / totalDuration) * 75)));
            maxReportedPct = Math.max(maxReportedPct, timePct);
            setVideoExportProgress(maxReportedPct);

            const minElapsedBeforeStop = Math.min(0.8, totalDuration * 0.35);
            const isVideoAtEnd =
              exportVideoEl.ended ||
              (exportVideoEl.currentTime >= endTime - 0.08 && exportVideoEl.currentTime <= endTime + 5);
            const isTimeComplete = wallElapsed >= minElapsedBeforeStop && !exportVideoEl.seeking && isVideoAtEnd;
            const isHardTimeout = wallElapsed >= totalDuration + 15.0;

            if (isTimeComplete || isHardTimeout) {
              stopAndFinish();
              return true;
            }
            return false;
          };

          const drawCurrentVideoFrame = () => {
            if (hasEnded) return;
            const currentExpH =
              headlineScheduleMode === 'scheduled' && scheduledList.length > 1
                ? (scheduledList[Math.floor(exportVideoEl.currentTime / headlineInterval) % scheduledList.length] || headline)
                : headline;
            drawFrameWithHeadline(currentExpH);
          };

          if (hasRvfc) {
            // Hardware-synced decoded frame callback: 1:1 lockstep with video decoder, ZERO lag or duplicate draws!
            const onVideoFrame = () => {
              if (hasEnded) return;
              drawCurrentVideoFrame();
              if (!checkCompletionAndProgress() && !hasEnded) {
                rvfcHandle = (exportVideoEl as any).requestVideoFrameCallback(onVideoFrame);
              }
            };
            rvfcHandle = (exportVideoEl as any).requestVideoFrameCallback(onVideoFrame);
          } else {
            // Single clean throttled rAF loop fallback when requestVideoFrameCallback is unavailable
            const renderLoop = (nowMs: number) => {
              if (hasEnded) return;
              if (nowMs - lastDrawMs >= minFrameIntervalMs - 2) {
                lastDrawMs = nowMs;
                drawCurrentVideoFrame();
                checkCompletionAndProgress();
              }
              if (!hasEnded) {
                animId = requestAnimationFrame(renderLoop);
              }
            };
            animId = requestAnimationFrame(renderLoop);
          }

          // Gentle non-destructive health check: only updates progress / resumes if accidentally paused (NEVER seeks currentTime!)
          healthTimerId = setInterval(() => {
            if (hasEnded) return;
            if (checkCompletionAndProgress()) return;
            if (exportVideoEl.paused && !exportVideoEl.ended && exportVideoEl.currentTime < endTime - 0.15) {
              exportVideoEl.play().catch(() => {});
            }
          }, 400);
        });

        return await recordingDone;
      };

      const primaryMimes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
      ];

      let rawBlob: Blob | null = null;
      try {
        rawBlob = await executeRecordingPass(combinedStream, primaryMimes, exportBitrate);
      } catch (pass1Err) {
        console.warn('[VideoExport] Pass 1 failed, preparing safe fallback pass:', pass1Err);
      }

      // Automatic Pass 2 Recovery: if combined audio+video MP4 stalled/returned 0 bytes, retry cleanly with video-only safe stream
      if ((!rawBlob || rawBlob.size < 1024) && !cancelExportRef.current && activeExportIdRef.current === currentExportId) {
        setVideoExportProgress(25);
        setVideoExportStatus('कम्पैटिबल वीडियो फॉर्मेट में पुनः रेंडर हो रहा है...');
        const safeFallbackMimes = [
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
          '',
        ];
        rawBlob = await executeRecordingPass(canvasStream, safeFallbackMimes, Math.min(exportBitrate, 2800000));
      }

      // Cancellation check before finalizing
      if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
        setIsExporting(false);
        isExportingRef.current = false;
        setVideoExportStatus('');
        setVideoExportProgress(0);
        return;
      }

      setVideoExportProgress(96);
      setVideoExportStatus('अंतिम वीडियो फाइल प्रोसेस हो रही है...');

      try {
        canvasStream.getTracks().forEach((t) => t.stop());
        combinedStream.getTracks().forEach((t) => t.stop());
      } catch {}

      if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
        setIsExporting(false);
        isExportingRef.current = false;
        setVideoExportStatus('');
        setVideoExportProgress(0);
        return;
      }

      if (!rawBlob || rawBlob.size < 1024) {
        throw new Error('रेंडरिंग फ़ाइल शून्य या बहुत छोटी प्राप्त हुई।');
      }

      // Fix WebM duration header so Mobile Chrome & Android players display exact duration
      let finalBlob = rawBlob;
      try {
        finalBlob = await Promise.race([
          injectWebmDuration(rawBlob, totalDuration * 1000),
          new Promise<Blob>((res) => setTimeout(() => res(rawBlob!), 2500)),
        ]);
      } catch {
        finalBlob = rawBlob;
      }

      // Validate video stream existence before download (Priority 0)
      const isMp4 = finalBlob.type.includes('mp4') || finalBlob.type.includes('avc1');
      if (isMp4) {
        const ab = await finalBlob.arrayBuffer();
        const hasVideo = validateMp4HasVideoStream(ab);
        if (!hasVideo && ab.byteLength < 1024) {
          throw new Error('वीडियो रेंडरिंग सत्यापन विफल: MP4 में वीडियो स्ट्रीम अनुपस्थित पाई गई। कृपया पुनः प्रयास करें।');
        }
      }

      setVideoExportProgress(100);
      setVideoExportStatus('सफलतापूर्वक डाउनलोड!');
      setIsProjectCompleted(true);

      const ext = isMp4 ? 'mp4' : 'webm';
      const filename = generateVideoDownloadFileName(ext);
      // Revoke previous completedDownloadUrl to free browser memory
      if (completedDownloadUrl && completedDownloadUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(completedDownloadUrl); } catch {}
      }
      const downloadUrl = URL.createObjectURL(finalBlob);
      try {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: initialVideo?.id || filename,
            type: 'video',
            event: 'video_gen',
          }),
        }).catch(() => {});
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: initialVideo?.id || filename,
            type: 'video',
            event: 'video_download',
          }),
        }).catch(() => {});
      } catch {}

      // Automatically record Video in Local-Only Project History (Module 2)
      try {
        const headlineText = headline || initialVideo?.title || 'वीडियो न्यूज़ बुलेटिन';
        await addProjectToHistory(currentUser?.uid || currentUser?.email, {
          id: 'proj_vid_' + Date.now(),
          title: headlineText,
          type: 'video',
          category: 'वीडियो न्यूज़',
          thumbnailUrl: activeDynamicFrame?.samplePhotoUrl || sampleVideoPreview || '',
          createdAt: Date.now(),
          status: 'exported',
          data: {
            filename,
            duration: totalDuration,
            aspect,
            headline: headlineText,
            exportedAt: new Date().toISOString(),
          },
        });
      } catch (vHistErr) {
        console.warn('Saving video to local project history failed:', vHistErr);
      }

      completedBlobRef.current = finalBlob;
      setCompletedDownloadUrl(downloadUrl);
      setCompletedDownloadFilename(filename);
      setCompletedFileSizeLabel(formatExportBytes(finalBlob.size));

      // Trigger file download using unified Desktop / Mobile Web / Android Native Bridge helper
      triggerBrowserDownload(finalBlob, filename);

      // Open Success Modal directly so the user has an immediate preview, 1-click Save & Share button
      setIsVideoSuccessModalOpen(true);

      showToast(`✅ ${ext.toUpperCase()} वीडियो पूरी न्यूज़ जैकेट के साथ तैयार हुआ (${Math.round(totalDuration)}s)!`);
      triggerVideoWelcomeReward();
    } catch (err: any) {
      console.error('Video download error:', err);
      try {
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch {}
      setVideoExportError(err?.message || 'वीडियो डाउनलोड करने में समस्या आई');
      try {
        handleDownloadSnapshot();
        showToast('⚠️ वीडियो रिकॉर्डिंग में समस्या आई, उच्च-गुणवत्ता फ्रेम स्नैपशॉट सेव किया गया — कृपया पुनः प्रयास करें');
      } catch {
        showToast('❌ वीडियो डाउनलोड में समस्या आई');
      }
    } finally {
      try {
        if (keepAliveOsc) {
          keepAliveOsc.stop();
          keepAliveOsc.disconnect();
        }
      } catch {}
      tempAudioNodes.forEach((n) => {
        try { n.disconnect(); } catch {}
      });
      extraAudioEls.forEach((a) => {
        try {
          a.pause();
          a.src = '';
        } catch {}
      });
      try {
        activeCanvasStream?.getTracks().forEach((t) => t.stop());
        activeCombinedStream?.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch {}
      try {
        if (tempExportVideoEl) {
          tempExportVideoEl.pause();
          tempExportVideoEl.src = '';
          if (tempExportVideoEl.parentNode) tempExportVideoEl.parentNode.removeChild(tempExportVideoEl);
        }
        if (tempExportBlobUrl) URL.revokeObjectURL(tempExportBlobUrl);
      } catch {}
      try {
        video.loop = originalLoop;
        video.pause();
      } catch {}
      setIsPlaying(false);
      isExportingRef.current = false;
      setTimeout(() => {
        setIsExporting(false);
        if (completedBlobRef.current || completedDownloadUrl) {
          setVideoExportStatus('✅ वीडियो रेंडर 100% पूर्ण');
          setVideoExportProgress(100);
        } else {
          setVideoExportStatus('');
          setVideoExportProgress(0);
        }
      }, 1500);
    }
  };

  // Aspect ratio container styles
  const aspectClass =
    aspect === '4:5'
      ? 'aspect-[4/5] max-w-[420px]'
      : aspect === '9:16'
      ? 'aspect-[9/16] max-w-[360px]'
      : aspect === '16:9'
      ? 'aspect-video max-w-[560px]'
      : aspect === '4:3'
      ? 'aspect-[4/3] max-w-[480px]'
      : 'aspect-square max-w-[420px]';

  const renderModeSwitcherBar = () => (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-neutral-900 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-md mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            वीडियो मोड (Editing Mode):
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsReadyToUseMode(true);
              showToast('⚡ क्विक वीडियो मोड (Quick Video Mode) सक्रिय');
            }}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isReadyToUseMode
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>⚡ Quick Video Mode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsReadyToUseMode(false);
              if (isAdminOrMaster) {
                showToast('🎬 एडमिन स्टूडियो मोड (Studio Mode) सक्रिय');
              } else {
                showToast('ℹ️ स्टूडियो मोड (Studio Mode) - Coming Soon');
              }
            }}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isReadyToUseMode
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>🎬 Studio Mode</span>
            {!isAdminOrMaster ? (
              <span className="text-[9px] bg-amber-400/30 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-400/40">
                Coming Soon
              </span>
            ) : (
              <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-black border border-purple-400/40">
                Admin
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAspectRatioAndFramesContent = () => (
    <div className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-3 sm:p-4 space-y-3 shadow-inner">
      {/* Row: Aspect Ratio Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>आस्पेक्ट रेशियो (Aspect Ratio):</span>
          </span>
          {isRatioLocked && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
              🔒 9:16 रील्स रेशियो लॉक
            </span>
          )}
        </div>

        {isRatioLocked ? (
          <div className="p-2.5 bg-slate-900 border border-amber-500/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-xs">🔒 9:16 रील्स / शॉर्ट्स (लॉक)</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">(रील्स वीडियो का रेशियो 9:16 पर सुरक्षित है)</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-black">
              9:16
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {[
              { id: '9:16', label: '9:16', desc: 'रील्स / शॉर्ट्स' },
              { id: '1:1', label: '1:1', desc: 'स्क्वायर' },
              { id: '4:5', label: '4:5', desc: 'फ़ीड / पोस्ट' },
              { id: '4:3', label: '4:3', desc: 'क्लासिक टीवी' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  const newAspect = r.id as VideoAspect;
                  setAspect(newAspect);
                  const newCompatible = getCompatibleFrames({
                    aspectRatio: newAspect,
                    isOnly4_5,
                    hasCoreCrop: Boolean(cropRegion),
                  });
                  if (newCompatible.length > 0 && !newCompatible.some((f) => f.id === selectedFrameId)) {
                    setSelectedFrameId(newCompatible[0].id);
                  }
                  showToast(`रेशियो ${r.label} चुना गया`);
                }}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  aspect === r.id
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md ring-2 ring-amber-300/60'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-black">{r.label}</div>
                <div className="text-[9px] opacity-80 truncate">{r.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row: Frame Selection */}
      <div className="space-y-2 pt-2.5 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>फ़्रेम डिज़ाइन ({compatibleFrames.length} कंपैटिबल फ़्रेम):</span>
          </span>
          <span className="text-[10px] text-amber-400 font-mono">
            {aspect} के अनुकूल
          </span>
        </div>

        <div className="grid grid-rows-2 grid-flow-col auto-cols-[250px] sm:auto-cols-[280px] gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-amber-500/40">
          {compatibleFrames.map((f) => {
            const isSel = selectedFrameId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFrameId(f.id);
                  showToast(`✅ ${f.nameHi} चुना गया`);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 w-full shrink-0 ${
                  isSel
                    ? 'bg-amber-400/20 border-amber-400 text-white ring-2 ring-amber-400/60 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-lg p-1.5 bg-slate-950 rounded-lg shrink-0">
                  {f.canvasRatio === '9:16' ? '📱' : f.canvasRatio === '4:5' ? '📰' : '📺'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-amber-300 flex items-center justify-between gap-1">
                    <span className="truncate">{f.nameHi}</span>
                    <span className="text-[9px] font-bold bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 shrink-0">
                      {f.canvasRatio}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {f.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full overflow-x-clip flex flex-col gap-4 pb-24 text-slate-100">
      {initialVideo && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white">फ़ीड से प्राप्त वीडियो लोड हुआ ({aspect})</span>
          </div>
          <span className="px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-black rounded-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {aspect} Studio Active
          </span>
        </div>
      )}

      <div className="w-full flex flex-col lg:flex-row items-start gap-4 sm:gap-6 pb-28 lg:pb-0">
        {/* LEFT COLUMN (36% Desktop / 34% XL): Live Video Canvas with Sticky Jacket Overlay */}
        <aside className="w-full lg:w-[36%] xl:w-[34%] lg:sticky lg:top-[72px] self-start lg:max-h-[calc(100vh-85px)] z-20 flex flex-col gap-3 lg:overflow-y-auto">
          <div className="w-full bg-black p-3 sm:p-4 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col items-center">
            {/* Top Status: Live Canvas, stable indicator (no ping), adjacent Reset & Draft buttons */}
            <div className="w-full flex items-center justify-between mb-2 px-1 gap-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm" />
                <span className="text-red-400 font-black">लाइव कैनवास</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Adjacent Reset Button (Section 5) */}
                <button
                  type="button"
                  onClick={handleResetTask}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-bold rounded-lg border border-neutral-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
                  title="वर्तमान संपादन रीसेट करें"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span className="hidden sm:inline">रीसेट</span>
                </button>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-neutral-900 border border-neutral-700 text-amber-400 flex items-center gap-1 shrink-0">
                  {isRatioLocked ? '🔒 9:16' : `📺 ${aspect}`}
                </span>
              </div>
            </div>

            {/* Video Preview Container with Jacket Overlay */}
            <div
              className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden shadow-2xl bg-black border border-neutral-800 flex items-center justify-center group select-none`}
              onClick={togglePlay}
            >
              {/* Still Overlay during video export to keep preview still and reduce CPU/GPU load */}
              {isExporting && (
                <div
                  className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 text-center select-none pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sparkles className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                  <span className="text-sm sm:text-base font-black text-white">🎬 वीडियो रेंडरिंग व एन्कोडिंग जारी है...</span>
                  <span className="text-xs text-amber-300 font-bold mt-1.5">{videoExportProgress}% पूर्ण</span>
                  <span className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    {videoExportStatus || 'रेंडरिंग के दौरान प्रीव्यू सुरक्षित पॉज़/स्टिल रखा गया है'}
                  </span>
                  <div className="w-44 bg-slate-800 rounded-full h-2 mt-3 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(5, videoExportProgress)}%` }}
                    />
                  </div>
                </div>
              )}
              {selectedFrameId === 'frame-custom-3line-4-5' ? (
                // ==========================================
                // FRAME 1: 3-Line Headline / 4:5 Video Window
                // ==========================================
                <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none">
                  {/* Top Yellow Header (when socialPosition === 'header') */}
                  {socialPosition === 'header' && (
                    <div className="w-full shrink-0 bg-[#ffeb3b] text-neutral-950 px-2.5 py-1.5 border-b border-amber-400 flex items-center justify-between shadow-md z-10">
                      {/* Watch Now Badge */}
                      <div className="bg-black text-[#ffeb3b] px-2 py-0.5 rounded flex items-center gap-1 font-black text-[10px] shrink-0">
                        <span>WATCH NOW</span>
                        <Play className="w-2.5 h-2.5 fill-[#ffeb3b]" />
                      </div>

                      {/* Social Icons row */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">f</span>
                        <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center text-[8px] font-black">📷</span>
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black">▶</span>
                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[8px] font-black">𝕏</span>
                      </div>

                      {/* Website / Handle */}
                      {websiteUrl ? (
                        <div className="flex items-center gap-1 text-[10px] font-black text-neutral-950 truncate max-w-[120px]">
                          <Globe className="w-3 h-3 text-neutral-950 shrink-0" />
                          <span className="truncate">{websiteUrl}</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Crimson Header with 3-Line Headline & Sub-Strip */}
                  <div className="w-full shrink-0 bg-gradient-to-b from-[#800707] via-[#5c0505] to-[#3b0303] text-white px-3 pt-3 pb-2 border-b border-red-900/60 shadow-lg flex flex-col justify-between z-10">
                    {/* 3-Line Headline */}
                    <div className="space-y-0.5 text-center min-h-[50px] flex flex-col justify-center">
                      {(activeHeadline.split('\n').filter((l) => l.trim().length > 0).length > 0
                        ? activeHeadline.split('\n').filter((l) => l.trim().length > 0).slice(0, 3)
                        : ['यहाँ आपकी वीडियो की हेडलाइन्स तीन लाइन में दिखाई देगी']
                      ).map((line, idx) => (
                        <h3
                          key={idx}
                          className="font-black text-xs sm:text-sm tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1 leading-snug"
                        >
                          {line}
                        </h3>
                      ))}
                    </div>

                    {/* Separator Line */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent my-1" />

                    {/* Sub-strip: Location on Left, Logo Box on Right */}
                    <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                      {/* Location Badge (White background, blue pin, blue border) */}
                      {showLocation && location.trim() ? (
                        <div className="bg-white border-2 border-blue-600 rounded-lg px-2 py-0.5 shadow-md flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
                          <span className="text-slate-900 font-black text-[11px] sm:text-xs tracking-tight truncate max-w-[120px]">
                            {location.trim()}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Logo Container (Transparent background, no yellow box or red border per Part 9) */}
                      <div className="rounded-lg px-1.5 py-0.5 flex items-center justify-center min-w-[60px] max-w-[130px] h-7 overflow-hidden">
                        {(activeLogoUrl || channelLogoUrl) ? (
                          <img
                            src={activeLogoUrl || channelLogoUrl}
                            alt="Channel Logo"
                            className="max-h-6 max-w-[120px] object-contain drop-shadow-md"
                            style={{ transform: `scale(${logoScale / 100})` }}
                          />
                        ) : (
                          <div className="text-center leading-none text-white font-black text-[9px] drop-shadow-xs">
                            {channelTag || 'LOGO'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle 4:5 Video Window (renders real video cropped to safe region, NO green chroma) */}
                  <div className="relative w-full flex-1 min-h-0 bg-neutral-950 overflow-hidden flex items-center justify-center">
                    {videoUrl && videoUrl.trim() ? (
                      <>
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          playsInline
                          loop
                          muted={isMuted}
                          crossOrigin="anonymous" onError={(e) => { const el = e.currentTarget; if (el.crossOrigin) { el.removeAttribute("crossOrigin"); el.load(); } }}
                          className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                          style={{
                            objectPosition: cropRegion ? `center ${cropRegion.y * 100}%` : `center ${Math.min(100, Math.max(0, 50 + offsetY))}%`,
                            transform: `scale(${zoomScale})`,
                            filter: getVideoFilterCss(videoColorFilter),
                          }}
                        />

                        {/* Transition simulation overlay */}
                        {isTransitionActive && transitionType !== 'none' && (
                          <div className="absolute inset-0 pointer-events-none z-20 bg-white/80 animate-ping" />
                        )}

                        {/* Play indicator */}
                        {!isPlaying && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 scale-100 group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      renderVideoPlaceholder()
                    )}
                  </div>

                  {/* Bottom Yellow Footer (when socialPosition === 'footer') */}
                  {socialPosition === 'footer' && (
                    <div className="w-full shrink-0 bg-[#ffeb3b] text-neutral-950 px-2.5 py-1.5 border-t border-amber-400 flex items-center justify-between shadow-md z-10">
                      {/* Watch Now Badge */}
                      <div className="bg-black text-[#ffeb3b] px-2 py-0.5 rounded flex items-center gap-1 font-black text-[10px] shrink-0">
                        <span>WATCH NOW</span>
                        <Play className="w-2.5 h-2.5 fill-[#ffeb3b]" />
                      </div>

                      {/* Social Icons row */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">f</span>
                        <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center text-[8px] font-black">📷</span>
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black">▶</span>
                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[8px] font-black">𝕏</span>
                      </div>

                      {/* Website / Handle */}
                      {websiteUrl ? (
                        <div className="flex items-center gap-1 text-[10px] font-black text-neutral-950 truncate max-w-[120px]">
                          <Globe className="w-3 h-3 text-neutral-950 shrink-0" />
                          <span className="truncate">{websiteUrl}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : selectedFrameId === 'frame-custom-full-9-16' ? (
                // ==========================================
                // FRAME 2: Full 9:16 Video Visibility
                // ==========================================
                <div className="relative w-full h-full overflow-hidden bg-black select-none">
                  {videoUrl && videoUrl.trim() ? (
                    <>
                      {/* Full-Bleed Video in Background */}
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        playsInline
                        loop
                        muted={isMuted}
                        crossOrigin="anonymous" onError={(e) => { const el = e.currentTarget; if (el.crossOrigin) { el.removeAttribute("crossOrigin"); el.load(); } }}
                        className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                        style={{
                          transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                          filter: getVideoFilterCss(videoColorFilter),
                        }}
                      />

                      {/* Transition Simulation */}
                      {isTransitionActive && transitionType !== 'none' && (
                        <div className="absolute inset-0 pointer-events-none z-20 bg-white/80 animate-ping" />
                      )}

                      {/* Play/Pause Center Indicator */}
                      {!isPlaying && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 scale-100 group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    renderVideoPlaceholder()
                  )}

                  {/* Floating White Social Pill Banner (Top or Bottom based on socialPosition) */}
                  <div className={`absolute ${socialPosition === 'footer' ? 'bottom-2.5' : 'top-2.5'} left-3 right-3 z-10 pointer-events-none flex justify-center`}>
                    <div className="bg-white/95 backdrop-blur-xs text-neutral-900 border border-slate-200 shadow-lg rounded-full px-3 py-1 flex items-center justify-center gap-2 text-[9px] font-bold max-w-full overflow-hidden whitespace-nowrap">
                      <span className="flex items-center gap-0.5 text-blue-600"><span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">f</span> {socialHandle}</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-0.5 text-pink-600"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center text-[7px]">📷</span> {socialHandle}</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-0.5 text-red-600"><span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[7px]">▶</span> {socialHandle}</span>
                    </div>
                  </div>

                  {/* Sub-strip: Logo on Left, Location on Right */}
                  <div className={`absolute ${socialPosition === 'footer' ? 'top-3' : 'top-11'} left-3 right-3 z-10 pointer-events-none flex items-center justify-between`}>
                    {/* Logo Container (Transparent background, no yellow box or red border per Part 9) */}
                    <div className="rounded-lg px-1.5 py-0.5 flex items-center justify-center min-w-[60px] max-w-[130px] h-7 overflow-hidden">
                      {(activeLogoUrl || channelLogoUrl) ? (
                        <img
                          src={activeLogoUrl || channelLogoUrl}
                          alt="Channel Logo"
                          className="max-h-6 max-w-[110px] object-contain drop-shadow-md"
                          style={{ transform: `scale(${logoScale / 100})` }}
                        />
                      ) : (
                        <div className="text-center leading-none text-white font-black text-[9px] drop-shadow-xs">
                          {channelTag || 'LOGO'}
                        </div>
                      )}
                    </div>

                    {/* Location Badge (White with Red Pin) */}
                    {showLocation && location.trim() ? (
                      <div className="bg-white border-2 border-red-600 rounded-lg px-2 py-0.5 shadow-md flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-600 fill-red-600 shrink-0" />
                        <span className="text-slate-900 font-black text-[11px] sm:text-xs tracking-tight truncate max-w-[120px]">
                          {location.trim()}
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  {/* Floating Red Headline Banner with Angled Gold Accents */}
                  <div className={`absolute ${socialPosition === 'footer' ? 'bottom-12' : 'bottom-6'} left-3 right-3 z-10 pointer-events-none flex items-center justify-center`}>
                    <div className="relative flex items-center w-full max-w-[94%]">
                      {/* Left Angled Gold Chevrons */}
                      <div className="flex gap-0.5 shrink-0 transform -skew-x-12 z-10 -mr-1">
                        <span className="w-1.5 h-10 bg-yellow-400 rounded-xs shadow" />
                        <span className="w-1.5 h-10 bg-amber-500 rounded-xs shadow" />
                      </div>

                      {/* Center Crimson Banner */}
                      <div className="flex-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800 border-2 border-yellow-400 rounded-md px-3 py-2 shadow-2xl text-center">
                        {(activeHeadline.split('\n').filter((l) => l.trim().length > 0).length > 0
                          ? activeHeadline.split('\n').filter((l) => l.trim().length > 0).slice(0, 2)
                          : ['यहाँ आपकी वीडियो की हेडलाइन्स दिखाई देंगी']
                        ).map((line, idx) => (
                          <h3
                            key={idx}
                            className="font-black text-xs sm:text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1 leading-snug"
                          >
                            {line}
                          </h3>
                        ))}
                      </div>

                      {/* Right Angled Gold Chevrons */}
                      <div className="flex gap-0.5 shrink-0 transform -skew-x-12 z-10 -ml-1">
                        <span className="w-1.5 h-10 bg-amber-500 rounded-xs shadow" />
                        <span className="w-1.5 h-10 bg-yellow-400 rounded-xs shadow" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeDynamicFrame?.rawDynamicFrame ? (
                // ==========================================
                // DYNAMIC VIDEO FRAME PRO (Master Admin Defined)
                // ==========================================
                (() => {
                  const rawDf = activeDynamicFrame.rawDynamicFrame;
                  const canvasRatio = (activeDynamicFrame.aspectRatio || rawDf?.aspectRatio || '9:16') as any;
                  const vConf = normalizeVideoConfig(activeDynamicFrame.videoConfig || rawDf?.videoConfig, canvasRatio, rawDf?.textSlots?.[0]?.rect);
                  const vRect = vConf.videoRect;
                  const fRect = vConf.footerRect;
                  const isCrop = vConf.displayMode === 'crop';
                  const lRect = vConf.logoRect;
                  const locRect = vConf.locationRect;
                  const isMultiHeadline = vConf.headlineMode === 'multiple' || vConf.headlineMode === 'multi';
                  const maxHeadLines = vConf.headlineLineCount || 2;
                  const headlineBlocks = vConf.headlineBlocks || [];
                  const ribbonLayers = vConf.ribbonLayers || [];
                  const hRect = vConf.headlineRect || { x: 3, y: 76, width: 94, height: maxHeadLines === 3 ? 14 : 11 };

                  return (
                    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] select-none">
                      {/* Main Video Window */}
                      <div
                        className="absolute overflow-hidden bg-slate-900 flex items-center justify-center"
                        style={{
                          left: `${vRect.x}%`,
                          top: `${vRect.y}%`,
                          width: `${vRect.width}%`,
                          height: `${vRect.height}%`,
                        }}
                      >
                        {videoUrl && videoUrl.trim() ? (
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            playsInline
                            loop
                            muted={isMuted}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const el = e.currentTarget;
                              if (el.crossOrigin) {
                                el.removeAttribute("crossOrigin");
                                el.load();
                              }
                            }}
                            className="w-full h-full transition-transform duration-100 cursor-pointer"
                            style={{
                              objectFit: isCrop ? 'cover' : 'contain',
                              transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                              filter: getVideoFilterCss(videoColorFilter),
                            }}
                          />
                        ) : (
                          renderVideoPlaceholder()
                        )}
                      </div>

                      {/* Transition Simulation */}
                      {isTransitionActive && transitionType !== 'none' && (
                        <div className="absolute inset-0 pointer-events-none z-20 bg-white/80 animate-ping" />
                      )}

                      {/* Play/Pause Center Indicator */}
                      {!isPlaying && videoUrl && videoUrl.trim() && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 scale-100 group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Breaking News Ribbon Layers */}
                      {ribbonLayers.filter((r) => r.visible !== false).map((ribbon) => (
                        <div
                          key={ribbon.id}
                          className="absolute z-10 flex items-center justify-center font-black tracking-wider uppercase shadow-md pointer-events-none"
                          style={{
                            left: `${ribbon.rect?.x ?? ribbon.x}%`,
                            top: `${ribbon.rect?.y ?? ribbon.y}%`,
                            width: `${ribbon.rect?.width ?? ribbon.width}%`,
                            height: `${ribbon.rect?.height ?? ribbon.height}%`,
                            backgroundColor: ribbon.backgroundColor || '#dc2626',
                            color: ribbon.textColor || '#ffffff',
                            fontSize: `${Math.max(9, Math.round((ribbon.fontSize || 14) * 0.75))}px`,
                          }}
                        >
                          {ribbon.text || 'BREAKING NEWS'}
                        </div>
                      ))}

                      {/* Overlay Assets (PNG / GIF) */}
                      {vConf.overlayAssets && vConf.overlayAssets.filter(o => o.visible !== false && o.url).map((overlay) => (
                        <div
                          key={overlay.id}
                          className="absolute z-10 pointer-events-none"
                          style={{
                            left: `${overlay.rect?.x ?? overlay.x}%`,
                            top: `${overlay.rect?.y ?? overlay.y}%`,
                            width: `${overlay.rect?.width ?? overlay.width}%`,
                            height: `${overlay.rect?.height ?? overlay.height}%`,
                            opacity: overlay.opacity ?? 1,
                            transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
                          }}
                        >
                          <img src={overlay.url} alt={overlay.name} className="w-full h-full object-contain" />
                        </div>
                      ))}

                      {/* Logo Container */}
                      <div
                        className="absolute z-10 pointer-events-none flex items-center overflow-hidden"
                        style={{
                          left: `${lRect.x}%`,
                          top: `${lRect.y}%`,
                          width: `${lRect.width}%`,
                          height: `${lRect.height}%`,
                          opacity: vConf.logoOpacity ?? 1,
                          transform: vConf.logoRotation ? `rotate(${vConf.logoRotation}deg)` : undefined,
                        }}
                      >
                        {(vConf.logoUrl || activeLogoUrl || channelLogoUrl) ? (
                          <img
                            src={vConf.logoUrl || activeLogoUrl || channelLogoUrl}
                            alt="Channel Logo"
                            className="max-h-full max-w-full object-contain drop-shadow-md"
                            style={{ transform: `scale(${(vConf.logoScalePct ?? logoScale) / 100})` }}
                          />
                        ) : (
                          <div className="font-black text-[10px] text-amber-300 drop-shadow-md">
                            {channelTag || 'AI NEWS'}
                          </div>
                        )}
                      </div>

                      {/* Location Badge */}
                      {showLocation && location.trim() && (
                        <div
                          className="absolute z-10 pointer-events-none flex items-center justify-center"
                          style={{
                            left: `${locRect.x}%`,
                            top: `${locRect.y}%`,
                            width: `${locRect.width}%`,
                            height: `${locRect.height}%`,
                          }}
                        >
                          <div className="bg-white border border-red-600 rounded-md px-1.5 py-0.5 shadow-md flex items-center gap-1 max-w-full">
                            <MapPin className="w-3 h-3 text-red-600 fill-red-600 shrink-0" />
                            <span className="text-slate-900 font-black text-[10px] truncate">
                              {location.trim()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Date Stamp */}
                      {vConf.dateVisible && (
                        <div
                          className="absolute z-10 pointer-events-none flex items-center justify-center font-bold text-white text-[9px] whitespace-nowrap"
                          style={{
                            left: `${vConf.dateRect.x}%`,
                            top: `${vConf.dateRect.y}%`,
                            width: `${vConf.dateRect.width}%`,
                            height: `${vConf.dateRect.height}%`,
                            backgroundColor: vConf.dateBgColor || 'rgba(0,0,0,0.5)',
                            color: vConf.dateTextColor || '#ffffff',
                            transform: vConf.dateRotation ? `rotate(${vConf.dateRotation}deg)` : undefined,
                          }}
                        >
                          {new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}

                      {/* Headline Section */}
                      {isMultiHeadline && headlineBlocks.length > 0 ? (
                        headlineBlocks.map((block, bIdx) => {
                          const blockText = (bIdx === 0 ? activeHeadline : bIdx === 1 ? subHeadline : block.text) || block.text || '';
                          return (
                            <div
                              key={block.id}
                              className="absolute z-10 pointer-events-none flex items-center justify-center px-2 shadow-lg"
                              style={{
                                left: `${block.rect?.x ?? block.x}%`,
                                top: `${block.rect?.y ?? block.y}%`,
                                width: `${block.rect?.width ?? block.width}%`,
                                height: `${block.rect?.height ?? block.height}%`,
                                backgroundColor: block.backgroundColor || block.bgColor || '#b91c1c',
                                color: block.textColor || '#ffffff',
                              }}
                            >
                              <span
                                className="font-black text-center line-clamp-2 leading-tight"
                                style={{ fontSize: `${Math.max(10, Math.round((block.fontSize || 18) * 0.75))}px` }}
                              >
                                {blockText}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        /* Single Headline Banner (2 or 3 lines) positioned by authoritative headlineRect */
                        <div
                          className="absolute z-10 pointer-events-none flex justify-center"
                          style={{
                            left: `${hRect.x}%`,
                            top: `${hRect.y}%`,
                            width: `${hRect.width}%`,
                            height: `${hRect.height}%`,
                          }}
                        >
                          <div className="w-full bg-gradient-to-r from-red-800 via-red-600 to-red-800 border border-yellow-400 rounded-lg px-2.5 py-1.5 shadow-2xl text-center flex flex-col justify-center">
                            {(activeHeadline.split('\n').filter((l) => l.trim().length > 0).length > 0
                              ? activeHeadline.split('\n').filter((l) => l.trim().length > 0).slice(0, maxHeadLines)
                              : ['यहाँ आपकी वीडियो की मुख्य हेडलाइन दिखाई देगी']
                            ).map((line, idx) => (
                              <h3
                                key={idx}
                                className={`font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate leading-snug ${
                                  maxHeadLines === 3 ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                                }`}
                              >
                                {line}
                              </h3>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Watermark in dynamic frame (Only if dynamic frame template specifies it and central watermark is off) */}
                      {!showWatermark && (vConf.watermarkTextEnabled || vConf.watermarkLogoEnabled) && (
                        <div
                          className="absolute z-10 pointer-events-none flex items-center justify-center font-bold text-white/80 text-[10px]"
                          style={{
                            left: `${vConf.watermarkRect.x}%`,
                            top: `${vConf.watermarkRect.y}%`,
                            width: `${vConf.watermarkRect.width}%`,
                            height: `${vConf.watermarkRect.height}%`,
                          }}
                        >
                          {vConf.watermarkLogoEnabled && vConf.watermarkLogoUrl ? (
                            <img src={vConf.watermarkLogoUrl} alt="Watermark" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="bg-black/50 px-2 py-0.5 rounded border border-white/20">
                              {vConf.watermarkText || 'AI NEWS MAKER'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Movable Footer Bar */}
                      <div
                        className="absolute z-10 pointer-events-none bg-neutral-900 border-t border-neutral-700 flex items-center justify-center px-2 text-amber-400 font-bold text-[10px] shadow-md truncate"
                        style={{
                          left: `${fRect.x}%`,
                          top: `${fRect.y}%`,
                          width: `${fRect.width}%`,
                          height: `${fRect.height}%`,
                        }}
                      >
                        {(() => {
                          const footerParts: string[] = [];
                          if (socialHandle && socialHandle.trim()) footerParts.push(socialHandle.trim());
                          if (showWebsite !== false && websiteUrl && websiteUrl.trim()) footerParts.push(`🌐 ${websiteUrl.trim()}`);
                          if ((showWhatsapp !== false && showMobileNumber !== false) && mobileNumber && mobileNumber.trim()) footerParts.push(`📞 ${mobileNumber.trim()}`);
                          return footerParts.join('  •  ') || (channelTag || 'AI NEWS MAKER');
                        })()}
                      </div>
                    </div>
                  );
                })()
              ) : (
                // ==========================================
                // FRAME 3: Classic Broadcast Lower-Third
                // ==========================================
                <>
                  {/* The Video Element */}
                  {videoUrl && videoUrl.trim() ? (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        playsInline
                        loop
                        muted={isMuted}
                        crossOrigin="anonymous" onError={(e) => { const el = e.currentTarget; if (el.crossOrigin) { el.removeAttribute("crossOrigin"); el.load(); } }}
                        className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                        style={{
                          transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                          filter: getVideoFilterCss(videoColorFilter),
                        }}
                      />

                      {/* Transition Effect Simulation Overlay */}
                      {isTransitionActive && transitionType !== 'none' && (
                        <div
                          className={`absolute inset-0 pointer-events-none z-20 transition-all ${
                            transitionType === 'fade'
                              ? 'bg-black animate-pulse opacity-95'
                              : transitionType === 'flash'
                              ? 'bg-white opacity-95 animate-ping'
                              : transitionType === 'zoom'
                              ? 'bg-black/50 backdrop-blur-sm'
                              : transitionType === 'slide'
                              ? 'bg-gradient-to-r from-red-600/80 via-yellow-400/80 to-transparent animate-pulse'
                              : 'bg-emerald-950/70'
                          }`}
                          style={{ transitionDuration: `${transitionDuration}s` }}
                        />
                      )}

                      {/* Play/Pause Center Indicator */}
                      {!isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                          <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 backdrop-blur-xs scale-100 group-hover:scale-110 transition-transform">
                            <Play className="w-7 h-7 fill-white ml-1" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    renderVideoPlaceholder()
                  )}

                  {/* Top Branding Overlay */}
                  <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase tracking-wider animate-pulse flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                      
                      {channelLogoUrl ? (
                        <img
                          src={channelLogoUrl}
                          alt="Logo"
                          className="h-7 object-contain transition-transform origin-left drop-shadow-md"
                          style={{ transform: `scale(${logoScale / 100})` }}
                        />
                      ) : (
                        <span
                          className="font-black text-xs sm:text-sm text-amber-300 drop-shadow-md transition-transform origin-left inline-block"
                          style={{ transform: `scale(${logoScale / 100})` }}
                        >
                          {channelTag}
                        </span>
                      )}
                    </div>

                    {isExclusiveBadge && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-[10px] font-black rounded uppercase tracking-wider shadow">
                        EXCLUSIVE
                      </span>
                    )}
                  </div>

                  {/* Lower-Third News Jacket Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 flex flex-col">
                    {/* Location Strip */}
                    {showLocation && location.trim() && (
                      <div className="bg-amber-500/95 text-neutral-950 font-black text-[11px] sm:text-xs px-4 sm:px-6 py-1.5 flex items-center justify-between border-t border-amber-400 shadow-md">
                        <span className="flex items-center gap-1 tracking-wide">
                          <MapPin className="w-3 h-3 text-red-700" />
                          {location.trim()}
                        </span>
                        <span className="text-[10px] uppercase font-black text-red-950">
                          BREAKING NEWS
                        </span>
                      </div>
                    )}

                    {/* Red Headline Band */}
                    <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white px-4 sm:px-6 py-2 border-t border-red-500/40 shadow-xl space-y-0.5">
                      {activeHeadline.split('\n').map((line, idx) => (
                        <h3 key={idx} className="font-black text-xs sm:text-sm leading-snug drop-shadow-md line-clamp-1">
                          {line}
                        </h3>
                      ))}
                      {subHeadline && (
                        <p className="text-[10px] sm:text-[11px] text-amber-200 font-bold pt-0.5 line-clamp-1">
                          {subHeadline}
                        </p>
                      )}
                    </div>

                    {/* Bottom Center-Aligned Footer Bar */}
                    <div className="bg-neutral-950/95 text-neutral-200 px-4 sm:px-6 py-1 text-[10px] border-t border-neutral-800 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap shadow-inner">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Youtube className="w-2.5 h-2.5 text-red-500" />
                        <Facebook className="w-2.5 h-2.5 text-blue-500" />
                        <Instagram className="w-2.5 h-2.5 text-pink-500" />
                        <Twitter className="w-2.5 h-2.5 text-sky-400" />
                      </div>
                      <span className="font-bold text-amber-300">{socialHandle}</span>
                      {showWebsite && websiteUrl && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-neutral-300 flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5 text-amber-400" />
                            {websiteUrl}
                          </span>
                        </>
                      )}
                      {showWhatsapp && showMobileNumber && mobileNumber && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-neutral-300 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-emerald-400" />
                            {mobileNumber}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Scrolling Bottom Ticker */}
                    {showTicker && tickerText.trim() && (
                      <div className="bg-slate-950 text-amber-300 px-4 sm:px-6 py-0.5 text-[9px] sm:text-[10px] font-bold border-t border-slate-800 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="px-1.5 py-0.2 bg-red-600 text-white text-[8px] font-black rounded shrink-0">
                          ताज़ा
                        </span>
                        <span className="truncate flex-1">{tickerText.trim()}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Live Watermark Overlay (Strict Mutual Exclusion: text vs image) */}
              {showWatermark && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center select-none"
                  style={{ opacity: watermarkOpacity, transform: `translateY(${watermarkOffsetY}px)` }}
                >
                  {watermarkType === 'image' ? (
                    watermarkImage ? (
                      <img
                        src={watermarkImage}
                        alt="Watermark"
                        className="max-w-[40%] max-h-[25%] object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                      />
                    ) : null
                  ) : (
                    <span className="text-white text-sm sm:text-lg font-black uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                      {watermarkCustomText || watermarkText || profile?.channelNameHi || 'AI NEWS MAKER'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Playback Bar Underneath Canvas (Part 3: Only Play, Time & Audio controls) */}
            <div className="w-full mt-2.5 flex items-center justify-between px-1 text-xs text-neutral-400">
              <button
                type="button"
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-yellow-400" /> : <Play className="w-3.5 h-3.5 text-yellow-400" />}
                <span>{isPlaying ? 'पॉज़ करें' : 'प्ले करें'}</span>
              </button>

              {/* Time Counter */}
              <div className="text-[11px] font-mono font-bold text-amber-300 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Mute / Unmute Button */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer transition-colors"
                title={isMuted ? 'आवाज़ चालू करें' : 'म्यूट करें'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            {/* Progress / Status / Error Indicator with Visible Cancel Control (Section 10) */}
            {isExporting && (
              <div className="w-full mt-2.5 p-3 bg-neutral-900 border border-amber-500/60 rounded-xl space-y-2 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-black text-amber-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">{videoExportStatus || 'तैयार हो रहा है...'}</span>
                  </span>
                  <span className="font-mono text-white text-xs shrink-0 ml-2">{videoExportProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-700">
                  <div
                    className="bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 h-full transition-[width] duration-75 ease-linear"
                    style={{ width: `${videoExportProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-400">
                    रेंडरिंग जारी...
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelExport}
                    className="px-2.5 py-1 bg-red-900/80 hover:bg-red-800 text-red-100 font-bold text-[11px] rounded-lg border border-red-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
                    title="एक्सपोर्ट रद्द करें"
                  >
                    <X className="w-3.5 h-3.5 text-red-300" />
                    <span>रद्द करें (Cancel)</span>
                  </button>
                </div>
              </div>
            )}

            {videoExportError && (
              <div className="w-full mt-2 p-2 bg-red-950/80 border border-red-800 rounded-xl flex items-center justify-between text-xs text-red-200">
                <span className="truncate">{videoExportError}</span>
                <button
                  type="button"
                  onClick={() => handleDownloadVideo(true)}
                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg text-[10px] shrink-0 ml-2 cursor-pointer"
                >
                  पुनः प्रयास करें
                </button>
              </div>
            )}

            {/* Action Buttons Underneath Preview: Visible on Desktop, OR on Mobile when quickStep === 7 (R2) */}
            {(!isMobile || quickStep === 7) && (
              <div className="w-full mt-3 pt-2.5 border-t border-neutral-800/80 space-y-2">
                {!quickVideoValidation.isValid && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-600/40 rounded-xl text-[11px] text-amber-300 space-y-1.5">
                    <div className="flex items-center justify-between font-black">
                      <span>अधूरे चरण ({quickVideoValidation.completionPercentage}% पूर्ण):</span>
                      <span className="text-[10px] font-mono text-amber-400">100% अनिवार्य</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {quickVideoValidation.missingItems.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setQuickStep(m.step)}
                          className="px-2 py-0.5 bg-neutral-900/90 hover:bg-amber-900/60 border border-amber-500/40 rounded text-[10px] text-amber-200 cursor-pointer flex items-center gap-1"
                        >
                          <span>⚠️ {m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 7 Layout Hierarchy: Download Button directly below preview, Captions beneath it */}
                {quickStep === 7 ? (
                  <div className="flex flex-col gap-2.5 w-full">
                    {/* Primary Download Video Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadVideo(false)}
                      disabled={isExporting || !quickVideoValidation.isValid}
                      className={`w-full py-3 px-3 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                        completedDownloadUrl
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white cursor-pointer active:scale-95 animate-pulse'
                          : quickVideoValidation.isValid && !isExporting
                          ? 'bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white cursor-pointer active:scale-95'
                          : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      }`}
                      title={quickVideoValidation.isValid ? 'वीडियो डाउनलोड करें' : 'डाउनलोड के लिए सभी आवश्यक चरण पूरे करें'}
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>
                        {isExporting
                          ? 'वीडियो रेंडर हो रहा है...'
                          : completedDownloadUrl
                          ? '✅ तैयार वीडियो डाउनलोड करें (Save Video)'
                          : quickVideoValidation.isValid
                          ? '🚀 फुल HD वीडियो डाउनलोड करें (1080p)'
                          : `❌ डाउनलोड लॉक है (${quickVideoValidation.missingItems.length} चरण बाकी)`}
                      </span>
                    </button>

                    {/* Social Media Captions Display (Beneath Download Button on Step 7) */}
                    <div className="w-full p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>सोशल मीडिया कैप्शन</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCaptionText);
                            setCopiedCaption(true);
                            showToast('✅ सोशल कैप्शन क्लिपबोर्ड पर कॉपी हो गया!');
                            setTimeout(() => setCopiedCaption(false), 2500);
                          }}
                          className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedCaption ? 'कॉपी हो गया!' : 'कॉपी करें'}</span>
                        </button>
                      </div>
                      <div className="p-2.5 bg-black/60 border border-neutral-800 rounded-lg text-[11px] text-neutral-300 leading-relaxed font-sans max-h-32 overflow-y-auto whitespace-pre-wrap select-all">
                        {generatedCaptionText}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {/* Download Video Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadVideo(false)}
                      disabled={isExporting || !quickVideoValidation.isValid}
                      className={`py-2.5 px-2 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all ${
                        quickVideoValidation.isValid && !isExporting
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white cursor-pointer active:scale-95'
                          : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      }`}
                      title={quickVideoValidation.isValid ? 'वीडियो डाउनलोड करें' : 'डाउनलोड के लिए सभी आवश्यक चरण पूरे करें'}
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span className="truncate">{isExporting ? 'रेंडरिंग जारी...' : completedDownloadUrl ? 'तैयार वीडियो डाउनलोड' : 'वीडियो डाउनलोड'}</span>
                    </button>

                    {/* Caption Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (quickVideoValidation.isValid) {
                          setIsCaptionModalOpen(true);
                        } else {
                          showToast('कृपया पहले वीडियो के सभी आवश्यक चरण पूरे करें');
                        }
                      }}
                      disabled={!quickVideoValidation.isValid}
                      className={`py-2.5 px-2 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all ${
                        quickVideoValidation.isValid
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-95'
                          : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      }`}
                      title={quickVideoValidation.isValid ? 'कैप्शन देखें' : 'कैप्शन के लिए सभी आवश्यक चरण पूरे करें'}
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">कैप्शन देखें</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Clickable Download Card (Part G.21) */}
            {completedDownloadUrl && (
              <div className="w-full mt-2.5 p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>वीडियो डाउनलोड तैयार है!</span>
                  </span>
                  <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-mono">
                    100% रेंडर पूर्ण
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleImmediateDownload();
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>यहाँ क्लिक करके वीडियो डाउनलोड करें</span>
                </button>
              </div>
            )}

            {/* Project Completion Banner with Prominent Back to Home Page Button */}
            {isProjectCompleted && (
              <div className="w-full mt-3 p-3 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500/70 rounded-2xl shadow-xl flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-300">
                      वीडियो डाउनलोड पूर्ण! (Project Ready)
                    </div>
                    <div className="text-[10px] text-slate-300">
                      आपका वीडियो डिवाइस में सेव हो चुका है।
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCaptionModalOpen(true)}
                    className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>कैप्शन देखें</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNavigateHome}
                    className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>होम पेज पर लौटें</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN (64% Desktop / 66% XL): Video Controls & Overlay Customization Form */}
        <section className="w-full lg:w-[64%] xl:w-[66%] flex flex-col gap-4 min-w-0">
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*"
            className="hidden"
            onChange={handleVideoFileUpload}
          />
          <input
            type="file"
            ref={additionalClipInputRef}
            accept="video/*"
            className="hidden"
            onChange={handleAddAdditionalClip}
          />
          <input
            type="file"
            ref={voiceoverFileInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleVoiceoverUpload}
          />
          <input
            type="file"
            ref={logoInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <input
            type="file"
            ref={audioFileInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleCustomAudioUpload}
          />

          {/* Desktop Editing Mode Switcher Bar */}
          <div className="hidden lg:block">
            {renderModeSwitcherBar()}
          </div>

          {/* ============================================================ */}
          {/* WORKFLOW DISPATCH: Quick Video Mode vs Studio Mode           */}
          {/* ============================================================ */}
          {isReadyToUseMode ? (
            /* ============================================================ */
            /* UNIFIED QUICK VIDEO WORKFLOW (Web & Mobile - 7 Steps)        */
            /* ============================================================ */
            <div className="w-full flex flex-col gap-3 sm:gap-4">
              {/* Stepper Header Card (Frozen at sticky top-14 z-30) */}
              <div className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl">
                <div className="flex flex-col gap-1 pb-2 mb-2 border-b border-slate-800 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>त्वरित वीडियो निर्माण (चरण {quickStep}/7)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          quickVideoValidation.completionPercentage === 100
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                        }`}
                      >
                        {quickVideoValidation.completionPercentage}% पूर्ण
                      </span>
                    </div>
                  </div>
                  {/* Mobile swipe hint */}
                  <div className="sm:hidden flex items-center justify-between text-[10px] text-amber-300/90 font-medium">
                    <span>👉 और चरण देखने के लिए दाईं ओर स्वाइप करें</span>
                  </div>
                </div>

                {/* Horizontal Step Navigation Pills (Horizontally scrollable with full Hindi labels) */}
                <div className="flex items-center gap-1.5 sm:gap-2 w-full text-xs font-bold overflow-x-auto no-scrollbar scroll-smooth py-1">
                  {[
                    { step: 1, label: 'वीडियो व फ्रेम्स', icon: Film, ok: Boolean((videoUrl && videoUrl.trim()) || clips.length > 0) },
                    { step: 2, label: 'संगीत व ऑडियो', icon: Music, ok: Boolean(audioOption === 'original' || audioOption === 'none' || (audioOption === 'bgm' && (bgmTrack || customAudioUrl))) },
                    { step: 3, label: 'हेडलाइन', icon: Type, ok: Boolean(headline && headline.trim().length > 0) },
                    { step: 4, label: 'लोकेशन', icon: MapPin, ok: Boolean(location && location.trim().length > 0) },
                    { step: 5, label: 'लोगो व ब्रांडिंग', icon: Sparkles, ok: Boolean((socialHandle && socialHandle.trim().length > 0) || (channelTag && channelTag.trim().length > 0) || (mobileNumber && mobileNumber.trim().length > 0)) },
                    { step: 6, label: 'वॉटरमार्क', icon: Shield, ok: Boolean(!showWatermark || watermarkType === 'none' || watermarkCustomText || watermarkText || watermarkImage) },
                    { step: 7, label: 'डाउनलोड व कैप्शन', icon: Download, ok: quickVideoValidation.isValid },
                  ].map((s) => {
                    const isActive = quickStep === s.step;
                    const IconComp = s.icon;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setQuickStep(s.step)}
                        title={`चरण ${s.step}: ${s.label}`}
                        className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap text-xs ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white font-black shadow-md ring-1 ring-white/30'
                            : s.ok
                            ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
                            : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isActive
                            ? 'bg-white text-red-600'
                            : s.ok
                            ? 'bg-emerald-400 text-slate-950 font-black'
                            : 'bg-amber-400 text-neutral-950'
                        }`}>
                          {s.step}
                        </span>
                        <IconComp className="w-3.5 h-3.5 shrink-0" />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================ */}
              {/* STEP 1: VIDEO & FRAMES (Aspect Ratio + Frames + Video Media) */}
              {/* ============================================================ */}
              {quickStep === 1 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" />
                      1. वीडियो व फ़्रेम्स डिज़ाइन (Video & Frames)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {isFromVideoReels ? '🔒 ओरिजिनल वीडियो लॉक' : `क्लिप्स: ${clips.length}/3`}
                    </span>
                  </div>

                  {/* Aspect Ratio and Frames selection rendered directly inside Step 1 */}
                  {renderAspectRatioAndFramesContent()}

                  {/* If entering from Video & Reels: Locked Video status & Color Filters (Part 8.A, 8.B, 8.C, 8.D, 8.E) */}
                  {isFromVideoReels && (
                    <div className="space-y-4">
                      {/* Video Lock Banner */}
                      <div className="p-3.5 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                            🔒
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                              <span>चुनी हुई वीडियो सुरक्षित है</span>
                              <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">9:16 रील्स</span>
                            </div>
                            <div className="text-[11px] text-slate-300 truncate font-semibold mt-0.5">
                              {initialVideo?.title || 'Video & Reels से प्राप्त ओरिजिनल वीडियो'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-black text-amber-400">
                            {formatTime(duration || 30)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">मूल अवधि</div>
                        </div>
                      </div>

                      {/* Video Playback & Audio Preservation Notice (Part 8.E) */}
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-2 font-bold">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span>ओरिजिनल ऑडियो सुरक्षित है</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          100% ओरिजिनल साउंड
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Standard upload and trim controls (Hidden when isFromVideoReels per Part 8.A, 8.D) */}
                  {!isFromVideoReels && (
                    <>
                      {/* Upload Main Video / Add Clips Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition active:scale-95"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{clips.length > 0 ? 'नया मुख्य वीडियो चुनें' : 'कंप्यूटर या फोन से वीडियो चुनें'}</span>
                    </button>

                    {clips.length > 0 && clips.length < 3 && (
                      <button
                        type="button"
                        onClick={() => additionalClipInputRef.current?.click()}
                        className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>+ और क्लिप जोड़ें ({clips.length}/3)</span>
                      </button>
                    )}
                  </div>

                  {/* Clip Selection Tabs if multiple clips */}
                  {clips.length > 1 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400">सक्रिय क्लिप चुनें:</span>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {clips.map((c, idx) => (
                          <button
                            key={c.id || idx}
                            type="button"
                            onClick={() => {
                              setActiveClipIndex(idx);
                              if (c.url) setVideoUrl(c.url);
                              if (typeof c.trimStart === 'number') setTrimStart(c.trimStart);
                              if (typeof c.trimEnd === 'number') setTrimEnd(c.trimEnd);
                              if (typeof c.zoomScale === 'number') setZoomScale(c.zoomScale);
                              if (typeof c.offsetY === 'number') setOffsetY(c.offsetY);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              activeClipIndex === idx
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>क्लिप {idx + 1}</span>
                            {clips.length > 1 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = clips.filter((_, i) => i !== idx);
                                  setClips(updated);
                                  if (activeClipIndex >= updated.length) {
                                    setActiveClipIndex(Math.max(0, updated.length - 1));
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 ml-1 cursor-pointer font-black"
                                title="क्लिप हटाएँ"
                              >
                                ×
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video Trimming Controls */}
                  {clips.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5 text-amber-300">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>क्लिप {activeClipIndex + 1} ट्रिमिंग:</span>
                        </span>
                        <span className="font-mono text-amber-400">
                          {Math.max(0, Math.round(trimEnd - trimStart))}s (स्टार्ट: {Math.round(trimStart)}s, अंत: {Math.round(trimEnd)}s)
                        </span>
                      </div>

                      {/* Quick Duration Preset Cuts */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">त्वरित अवधि:</span>
                        {[
                          { label: '10s', sec: 10 },
                          { label: '30s', sec: 30 },
                          { label: '60s', sec: 60 },
                          { label: 'पूरी क्लिप', sec: Math.max(10, Math.floor(duration || 60)) },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const maxD = Math.max(15, Math.floor(duration || 60));
                              const newEnd = Math.min(maxD, trimStart + preset.sec);
                              setTrimEnd(newEnd);
                              setClips((prev) =>
                                prev.map((c, i) =>
                                  i === activeClipIndex ? { ...c, trimStart, trimEnd: newEnd } : c
                                )
                              );
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>शुरुआत (Start):</span>
                            <span className="font-mono text-amber-300">{Math.round(trimStart)}s</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(1, Math.floor(duration || 60) - 1)}
                            value={trimStart}
                            onChange={(e) => {
                              const val = Math.min(parseFloat(e.target.value), trimEnd - 1);
                              setTrimStart(val);
                              setClips((prev) =>
                                prev.map((c, i) =>
                                  i === activeClipIndex ? { ...c, trimStart: val } : c
                                )
                              );
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>अंत (End):</span>
                            <span className="font-mono text-amber-300">{Math.round(trimEnd)}s</span>
                          </div>
                          <input
                            type="range"
                            min={trimStart + 1}
                            max={Math.max(trimStart + 1, Math.floor(duration || 60))}
                            value={trimEnd}
                            onChange={(e) => {
                              const val = Math.max(parseFloat(e.target.value), trimStart + 1);
                              setTrimEnd(val);
                              setClips((prev) =>
                                prev.map((c, i) =>
                                  i === activeClipIndex ? { ...c, trimEnd: val } : c
                                )
                              );
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Zoom and Vertical Positioning Controls */}
                      <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1 text-amber-300">
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>ज़ूम (स्केल):</span>
                            </span>
                            <span className="text-amber-400 font-mono">{zoomScale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="2.5"
                            step="0.05"
                            value={zoomScale}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setZoomScale(val);
                              setClips((prev) =>
                                prev.map((c, i) =>
                                  i === activeClipIndex ? { ...c, zoomScale: val } : c
                                )
                              );
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1 text-amber-300">
                              <MoveVertical className="w-3.5 h-3.5" />
                              <span>ऊर्ध्वाधर स्थिति:</span>
                            </span>
                            <span className="text-amber-400 font-mono">{offsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min="-150"
                            max="150"
                            step="5"
                            value={offsetY}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setOffsetY(val);
                              setClips((prev) =>
                                prev.map((c, i) =>
                                  i === activeClipIndex ? { ...c, offsetY: val } : c
                                )
                              );
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="p-2 bg-blue-950/40 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 flex items-center gap-2">
                        <Info className="w-4 h-4 flex-shrink-0 text-blue-400" />
                        <span>वीडियो का मूल आस्पेक्ट रेशियो सुरक्षित रखा जाता है (Never stretched)। व्यूपोर्ट में परफेक्ट फिटिंग।</span>
                      </div>
                    </div>
                  )}

                  {clips.length === 0 && (
                    <div className="p-4 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-center space-y-1">
                      <p className="text-xs text-slate-400">कोई वीडियो लोड नहीं है। आगे बढ़ने के लिए कृपया वीडियो अपलोड करें।</p>
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: MUSIC AND AUDIO                                      */}
              {/* ============================================================ */}
              {quickStep === 2 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Music className="w-4 h-4 text-amber-400" />
                      2. संगीत व ऑडियो विकल्प (Music & Audio)
                    </span>
                    <button
                      type="button"
                      onClick={toggleStandaloneBgmPreview}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1 border border-slate-700"
                    >
                      {isStandaloneBgmPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isStandaloneBgmPlaying ? 'म्यूज़िक रोकें' : 'म्यूज़िक सुनें'}</span>
                    </button>
                  </div>

                  {/* 3 Clear Options: Original Audio, Background Music, No Music */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'original',
                        title: '1. मूल वीडियो ऑडियो',
                        sub: 'केवल वीडियो की अपनी आवाज़',
                        icon: Volume2,
                      },
                      {
                        id: 'bgm',
                        title: '2. बैकग्राउंड संगीत',
                        sub: 'BGM + मूल आवाज़ मिक्स',
                        icon: Music,
                      },
                      {
                        id: 'none',
                        title: '3. कोई म्यूज़िक नहीं',
                        sub: 'म्यूट (No Music)',
                        icon: VolumeX,
                      },
                    ].map((opt) => {
                      const isSel = audioOption === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setAudioOption(opt.id as any);
                            if (opt.id === 'original') {
                              setBgmTrack('none');
                              setBgmVolume(0);
                              setVideoVolume(100);
                              newsAudio.stop();
                              setIsStandaloneBgmPlaying(false);
                            } else if (opt.id === 'bgm') {
                              if (bgmTrack === 'none') {
                                setBgmTrack(BUILTIN_NEWS_TRACKS[0]?.id || 'breaking-1');
                              }
                              setBgmVolume(35); // 35-50% relative to original audio per Section 6
                              setVideoVolume(100);
                            } else if (opt.id === 'none') {
                              setBgmTrack('none');
                              setBgmVolume(0);
                              setVideoVolume(0);
                              newsAudio.stop();
                              setIsStandaloneBgmPlaying(false);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                            isSel
                              ? 'bg-amber-400/10 border-amber-400 text-amber-300 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-amber-400" />
                              {opt.title}
                            </span>
                            {isSel && <Check className="w-4 h-4 text-amber-400" />}
                          </div>
                          <span className="text-[10px] text-slate-400">{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume Sliders */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    {/* Original Video Volume Slider */}
                    {audioOption !== 'none' && (
                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5 text-amber-300">
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>मूल वीडियो आवाज़ (Original Video Audio):</span>
                          </span>
                          <span className="text-amber-400 font-mono">{videoVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={videoVolume}
                          onChange={(e) => setVideoVolume(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Background Music Volume Slider & Track Selection */}
                    {audioOption === 'bgm' && (
                      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <Music className="w-3.5 h-3.5" />
                              <span>बैकग्राउंड म्यूज़िक वॉल्यूम (BGM Volume - 50% या कम अनुशंसित):</span>
                            </span>
                            <span className="text-amber-400 font-mono">{bgmVolume}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={bgmVolume}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setBgmVolume(val);
                              newsAudio.setVolume(val / 100);
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>

                        {/* Track List */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400">सत्यापित रॉयल्टी-फ्री ट्रैक्स:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {BUILTIN_NEWS_TRACKS.map((track) => (
                              <button
                                key={track.id}
                                type="button"
                                onClick={() => {
                                  setBgmTrack(track.id);
                                  newsAudio.playTrack(track.id);
                                }}
                                className={`p-2 rounded-lg text-xs font-bold text-left border transition truncate ${
                                  bgmTrack === track.id
                                    ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {track.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom MP3 Upload */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => audioFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>{customAudioTitle ? 'MP3 बदलें' : 'अपना MP3 ट्रैक अपलोड करें'}</span>
                          </button>
                          {customAudioTitle && (
                            <span className="text-xs text-amber-400 truncate max-w-[200px]">
                              🎵 {customAudioTitle}
                            </span>
                          )}
                        </div>

                        <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-[10px] text-emerald-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>✅ सत्यापित कॉपीराइट-मुक्त संगीत (Verified Royalty-Free Audio)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 3: HEADLINES                                            */}
              {/* ============================================================ */}
              {quickStep === 3 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-400" />
                      3. आपकी हेडलाइंस (News Headlines)
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                      आवश्यक (Required)
                    </span>
                  </div>

                  {/* Priority 1: Clean Vertical Single-Column Layout for Headline Selection */}
                  <div className="space-y-2.5 p-3 sm:p-4 bg-slate-950/90 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>उपलब्ध हेडलाइंस चुनें</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        (किसी एक पर क्लिक करके चुनें)
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {((headlineVariants && headlineVariants.filter(Boolean).length > 0)
                        ? headlineVariants.filter(Boolean).slice(0, 4)
                        : [
                            headline || initialVideo?.title || 'देश की बड़ी खबर: घटनाक्रम पर सीधी नजर',
                            'विशेष रिपोर्ट: मुख्य बिंदुओं का पूरा विश्लेषण',
                            'बड़ी जानकारी: प्रशासन का अहम फैसला',
                            'ग्राउंड रिपोर्ट: मौके से ताज़ा अपडेट',
                          ]
                      ).map((hVariant, hIdx) => {
                        const isSelected = headline.trim() === hVariant.trim();
                        return (
                          <button
                            key={hIdx}
                            type="button"
                            onClick={() => {
                              const cleanH = hVariant.trim();
                              setHeadline(cleanH);
                              showToast(`हेडलाइन ${hIdx + 1} चुनी गई`);
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400/15 text-white border-amber-400 ring-2 ring-amber-400/50 shadow-md font-black'
                                : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-800'
                            }`}
                          >
                            {/* Radio Circle & Number Indicator */}
                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-amber-400 bg-amber-400'
                                    : 'border-slate-600 bg-transparent'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : 'bg-slate-800 text-amber-400 font-mono'
                                }`}
                              >
                                {hIdx + 1}
                              </span>
                            </div>

                            {/* Headline Text */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[11px] font-bold text-amber-400/90">
                                  हेडलाइन {hIdx + 1}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> चयनित
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-100 break-words whitespace-normal">
                                {hVariant.trim()}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Headline Input (Genuinely blank by default) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>मुख्य हेडलाइन लिखें:</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {headline.length} वर्ण
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="यहाँ अपनी ब्रेकिंग न्यूज़ हेडलाइन दर्ज करें..."
                      className="w-full p-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none transition resize-none leading-relaxed"
                    />
                  </div>

                  {/* Sub-Headline Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      उप-शीर्षक / टैगलाइन (वैकल्पिक):
                    </label>
                    <input
                      type="text"
                      value={subHeadline}
                      onChange={(e) => setSubHeadline(e.target.value)}
                      placeholder="जैसे: देखें विशेष रिपोर्ट..."
                      className="w-full p-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none transition"
                    />
                  </div>

                  {/* Single Manual AI Generation Button */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400">AI सहायता:</span>
                    <button
                      type="button"
                      disabled={isAiGenerating || (!headline.trim() && !rawScriptText.trim())}
                      onClick={async () => {
                        setIsAiGenerating(true);
                        try {
                          await handleGenerateAiHeadline(2);
                        } finally {
                          setIsAiGenerating(false);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 disabled:opacity-40 transition cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiGenerating ? 'AI हेडलाइन बना रहा है...' : 'AI से हेडलाइन जनरेट करें'}</span>
                    </button>
                  </div>

                  {/* Raw Script / Facts Helper Box */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>रॉ स्क्रिप्ट या घटना के तथ्यों से हेडलाइन बनाएँ:</span>
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rawScriptText}
                        onChange={(e) => setRawScriptText(e.target.value)}
                        placeholder="घटना के मुख्य बिंदु यहाँ पेस्ट करें..."
                        className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isGeneratingRawHeadlines || !rawScriptText.trim()}
                        onClick={handleGenerateFromRawScript}
                        className="px-3 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>हेडलाइन बनाएँ</span>
                      </button>
                    </div>

                    {rawScriptSuggestions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-amber-300 font-bold">सुझाव (क्लिक करके चुनें):</span>
                        <div className="flex flex-col gap-1.5">
                          {rawScriptSuggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setHeadline(sug)}
                              className="text-left text-xs p-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 hover:border-amber-400 hover:text-white transition"
                            >
                              💡 {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 4: LOCATION                                             */}
              {/* ============================================================ */}
              {quickStep === 4 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      4. खबर की लोकेशन (News Location)
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                      आवश्यक (Required)
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>स्थान / शहर / ज़िला दर्ज करें:</span>
                      <span className="text-[10px] text-slate-400">यह स्क्रीन पर लोकेशन बैज में दिखेगा</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="जैसे: नई दिल्ली, लखनऊ, भोपाल, पटना, मुंबई..."
                      className="w-full p-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none transition"
                    />
                  </div>

                  {/* Location ON/OFF toggle respecting frame location rules */}
                  <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-white block">लोकेशन प्रदर्शित करें (Show Location)</span>
                      <span className="text-[10px] text-slate-400">फ्रेम पर स्थान / लोकेशन स्ट्रिप चालू या बंद करें</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLocation}
                        onChange={(e) => setShowLocation(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 5: LOGO & BRANDING                                      */}
              {/* ============================================================ */}
              {quickStep === 5 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      5. लोगो व ब्रांडिंग (Logo & Branding)
                    </span>
                  </div>

                  {/* Logo Controls (Section 12: Uses profile logo, scale, task GIF fallback) */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">चैनल लोगो (Profile Logo):</span>
                      {hasBothLogos && (
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setLogoFormatPreference('gif')}
                            className={`px-2 py-0.5 rounded font-bold ${logoFormatPreference === 'gif' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
                          >
                            GIF एनिमेटेड
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoFormatPreference('png')}
                            className={`px-2 py-0.5 rounded font-bold ${logoFormatPreference === 'png' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
                          >
                            PNG स्थिर
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {activeLogoUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={activeLogoUrl}
                            alt="Logo preview"
                            className="h-10 w-16 object-contain bg-black/40 rounded p-1 border border-slate-700"
                          />
                          {isGifActive && (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-black rounded border border-emerald-800">
                              🎬 एनिमेटेड GIF
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">कोई प्रोफ़ाइल लोगो सेट नहीं है</span>
                      )}

                      {/* GIF Fallback Upload for this task only (Section 12) */}
                      <label className="ml-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>GIF लोगो चुनें (केवल इस वीडियो के लिए)</span>
                        <input
                          type="file"
                          accept="image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const localUrl = URL.createObjectURL(file);
                              setTaskGifLogo(localUrl);
                              setLogoFormatPreference('gif');
                              showToast('🎬 एनिमेटेड GIF लोगो इस वीडियो के लिए सेट हो गया!');
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Logo Size Control */}
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-bold text-slate-300">
                        <span>लोगो साइज़:</span>
                        <span className="text-amber-400 font-mono">{logoScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="180"
                        step="5"
                        value={logoScale}
                        onChange={(e) => setLogoScale(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Footer Branding & Social Media Info */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">फ़ूटर व संपर्क जानकारी:</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <img src={getSocialIconSrc('youtube')} alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                          <span>यूट्यूब / सोशल हैंडल:</span>
                        </label>
                        <input
                          type="text"
                          value={socialHandle}
                          onChange={(e) => setSocialHandle(e.target.value)}
                          placeholder="@apnachannel"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>व्हाट्सएप / मोबाइल नंबर:</span>
                        </label>
                        <input
                          type="text"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span>वेबसाइट URL:</span>
                        </label>
                        <input
                          type="text"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="www.apnanews.com"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-400" />
                          <span>चैनल टैग / नाम:</span>
                        </label>
                        <input
                          type="text"
                          value={channelTag}
                          onChange={(e) => setChannelTag(e.target.value)}
                          placeholder="BREAKING NEWS WALA"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Independent Footer Element Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-slate-200">वेबसाइट पता दिखाएं</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showWebsite}
                            onChange={(e) => setShowWebsite(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-200">व्हाट्सएप / नंबर दिखाएं</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showWhatsapp}
                            onChange={(e) => {
                              setShowWhatsapp(e.target.checked);
                              setShowMobileNumber(e.target.checked);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 6: WATERMARK SETTINGS                                   */}
              {/* ============================================================ */}
              {quickStep === 6 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      6. वॉटरमार्क सेटिंग्स (Watermark)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWatermark(!showWatermark)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                        showWatermark
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {showWatermark ? 'वॉटरमार्क चालू है' : 'वॉटरमार्क बंद है'}
                    </button>
                  </div>

                  {showWatermark ? (
                    <div className="space-y-4 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                      {/* Two clear radio choices: Text vs Image Watermark */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWatermarkType('text')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            watermarkType === 'text'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>📝 टेक्स्ट वॉटरमार्क</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWatermarkType('image');
                            if (!watermarkImage) {
                              const defaultLogo = userPngLogo || activeLogoUrl || channelLogoUrl || '/assets/ai_news_maker_logo.png';
                              if (defaultLogo) setWatermarkImage(defaultLogo);
                            }
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            watermarkType === 'image'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>🖼️ इमेज वॉटरमार्क</span>
                        </button>
                      </div>

                      {watermarkType === 'text' ? (
                        /* Text Watermark Field: Touch English or Hindi channel name (no arbitrary text editing) */
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 block">
                            वॉटरमार्क के लिए चैनल का नाम चुनें (Touch to Select):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Hindi Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setWatermarkCustomText(channelNameHi);
                                showToast('✓ हिन्दी चैनल नाम वॉटरमार्क पर लागू किया गया');
                              }}
                              className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                (watermarkCustomText === channelNameHi || (!watermarkCustomText && watermarkText === channelNameHi))
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                                  : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] text-amber-400 block font-bold uppercase">1. हिन्दी नाम</span>
                                <span className="text-sm font-black truncate block mt-0.5">{channelNameHi}</span>
                              </div>
                              {(watermarkCustomText === channelNameHi || (!watermarkCustomText && watermarkText === channelNameHi)) && (
                                <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                              )}
                            </button>

                            {/* English Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setWatermarkCustomText(channelNameEn);
                                showToast('✓ English Channel Name Watermark Applied');
                              }}
                              className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                watermarkCustomText === channelNameEn
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                                  : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] text-amber-400 block font-bold uppercase">2. English Name</span>
                                <span className="text-sm font-black font-mono tracking-wider truncate block mt-0.5">{channelNameEn}</span>
                              </div>
                              {watermarkCustomText === channelNameEn && (
                                <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Image Watermark: Locked to User Profile Logo Only (Upload button removed as per requirements) */
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 block">वॉटरमार्क इमेज (आधिकारिक चैनल लोगो):</label>
                          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={watermarkImage || userPngLogo || activeLogoUrl || channelLogoUrl || '/assets/ai_news_maker_logo.png'}
                                alt="Watermark preview"
                                className="h-10 w-16 object-contain bg-black/40 rounded p-1 border border-slate-700"
                              />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>✓ आधिकारिक चैनल लोगो (प्रोफाइल से)</span>
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  यह लोगो आपकी प्रोफाइल से स्वतः लिया गया है। आप नीचे से इसकी पारदर्शिता व स्थिति बदल सकते हैं।
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Opacity Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span>पारदर्शिता (Opacity):</span>
                            <span className="text-amber-400 font-mono">{Math.round(watermarkOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.05"
                            value={watermarkOpacity}
                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>

                        {/* Vertical Movement Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span>ऊर्ध्वाधर स्थिति (Vertical Position):</span>
                            <span className="text-amber-400 font-mono">{watermarkOffsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min="-150"
                            max="150"
                            step="5"
                            value={watermarkOffsetY}
                            onChange={(e) => setWatermarkOffsetY(parseInt(e.target.value, 10))}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                      वॉटरमार्क अभी बंद है। वीडियो पर वॉटरमार्क जोड़ने के लिए ऊपर दिए गए बटन से इसे चालू करें।
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 7: DOWNLOAD & SHARE                                     */}
              {/* ============================================================ */}
              {quickStep === 7 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Download className="w-4 h-4 text-amber-400" />
                      7. डाउनलोड (Download & Export)
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        quickVideoValidation.isValid
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                      }`}
                    >
                      {quickVideoValidation.isValid ? '✅ तैयार (100%)' : `${quickVideoValidation.missingItems.length} विवरण बाकी`}
                    </span>
                  </div>

                  {/* Clean Status Banner */}
                  {quickVideoValidation.isValid ? (
                    <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold">सभी आवश्यक विवरण पूर्ण हैं - आपकी वीडियो फुल HD में डाउनलोड के लिए तैयार है!</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>कृपया डाउनलोड से पहले ये विवरण पूर्ण करें:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {quickVideoValidation.missingItems.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setQuickStep(item.step)}
                            className="text-[11px] bg-red-950/80 hover:bg-red-900 text-red-200 px-2.5 py-1 rounded-lg border border-red-800/80 font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                          >
                            <span>⚠️ {item.label}</span>
                            <span className="text-[10px] bg-red-900 px-1 rounded text-red-300">चरण {item.step} →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caption Action */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCaptionModalOpen(true)}
                      disabled={!headline.trim() || !location.trim()}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow transition"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{copiedCaption ? '✓ कैप्शन कॉपी हो गया!' : '📋 सोशल कैप्शन देखें व कॉपी करें'}</span>
                    </button>
                  </div>

                  {/* Completed Download Card - Show immediately when completed */}
                  {completedDownloadUrl && (
                    <div className="p-3.5 bg-emerald-950/90 border border-emerald-500 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="text-xs font-bold text-emerald-300 flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>वीडियो सफलतापूर्वक 100% रेंडर हो गया है!</span>
                        </span>
                        {completedFileSizeLabel && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 shrink-0">
                            {completedFileSizeLabel}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleImmediateDownload}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow cursor-pointer transition active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>✅ सीधे वीडियो फाइल सेव करें (Save Video Now)</span>
                      </button>
                    </div>
                  )}

                  {/* Download Video Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadVideo(false)}
                    disabled={!quickVideoValidation.isValid || isExporting}
                    className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 ${
                      completedDownloadUrl
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white animate-pulse'
                        : quickVideoValidation.isValid && !isExporting
                        ? 'bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isExporting
                        ? 'वीडियो रेंडर हो रहा है...'
                        : completedDownloadUrl
                        ? '✅ तैयार वीडियो डाउनलोड करें (Save 1080p Video)'
                        : quickVideoValidation.isValid
                        ? '🚀 फुल HD वीडियो डाउनलोड करें (Download 1080p)'
                        : `❌ डाउनलोड लॉक है (${quickVideoValidation.missingItems.length} आवश्यक फ़ील्ड बाकी)`}
                    </span>
                  </button>

                  {/* Export Progress Interface with Visible X / Cancel Button (Section 10) */}
                  {isExporting && (
                    <div className="p-3.5 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 shadow-2xl">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>{videoExportStatus || 'एक्सपोर्ट प्रगति पर है...'}</span>
                        </span>
                        <span className="font-mono text-sm">{videoExportProgress}%</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-[width] duration-75 ease-linear"
                          style={{ width: `${videoExportProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          1080p फुल रिज़ॉल्यूशन रेंडरिंग...
                        </span>
                        {/* VISIBLE CANCEL BUTTON */}
                        <button
                          type="button"
                          onClick={handleCancelExport}
                          className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <X className="w-3.5 h-3.5 text-red-400" />
                          <span>✕ एक्सपोर्ट रद्द करें (Cancel)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stepper Navigation Footer (Prev / Next Buttons) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-bold gap-2">
                <button
                  type="button"
                  onClick={() => setQuickStep((s) => Math.max(1, s - 1))}
                  disabled={quickStep === 1}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer hover:bg-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                  <span>पिछला चरण</span>
                </button>

                {quickStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => setQuickStep((s) => Math.min(7, s + 1))}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white cursor-pointer shadow hover:from-red-500 hover:to-amber-400 transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>अगला चरण (स्टेप {quickStep + 1})</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDownloadVideo(false)}
                    disabled={!quickVideoValidation.isValid || isExporting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white cursor-pointer shadow hover:from-emerald-500 hover:to-teal-400 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>{isExporting ? 'रेंडरिंग जारी...' : completedDownloadUrl ? '✅ तैयार वीडियो डाउनलोड' : 'फुल HD वीडियो डाउनलोड करें'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : !isAdminOrMaster ? (
            /* ============================================================ */
            /* CLEAN COMING SOON CARD FOR NORMAL USERS                      */
            /* ============================================================ */
            <div className="w-full flex items-center justify-center py-10 sm:py-16 px-2">
              <div className="max-w-md w-full bg-slate-900/95 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-5 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20 text-amber-400">
                  🎬
                </div>

                <div className="space-y-1.5">
                  <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black rounded-full uppercase tracking-wider inline-block">
                    Coming Soon · जल्द आ रहा है
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    एडवांस्ड वीडियो स्टूडियो मोड
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <strong className="text-amber-300">Studio Mode</strong> में आप अपनी पूरी खबर, मल्टीपल वीडियो क्लिप्स, टाइमलाइन व एडवांस्ड वीडियो एडिटिंग एक ही जगह आसानी से कर सकेंगे।
                </p>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                  🛠️ यह एडवांस्ड मॉड्यूल वर्तमान में डेवलपमेंट व टेस्टिंग मोड में है। एडमिन व मास्टर एडमिन इस पर वर्किंग कर रहे हैं। जल्द ही यह सभी साथियों के लिए लाइव कर दिया जाएगा।
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReadyToUseMode(true);
                      showToast('⚡ क्विक वीडियो मोड (Quick Video Mode) पर वापस लौटे');
                    }}
                    className="w-full py-3 px-5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-xl shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition active:scale-95"
                  >
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
                      <span>⚡</span>
                      <span>क्विक वीडियो मोड (Quick Video Mode)</span>
                    </div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-900/90">
                      पर वापस जाएं
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* WORKFLOW 2: STUDIO MODE (100% Active for Admin/Master Admin) */
            /* ============================================================ */
            /* Systematic Step-Wise Workflow or Responsive Grid View Mode  */
            <div className="relative space-y-4">
              <div className="space-y-4">
                  {/* Studio Mode Systematic Step Navigation Bar */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          सिस्टमैटिक वीडियो स्टूडियो (चरण {studioStep}/7):
                        </span>
                        <span className="text-[11px] font-bold text-slate-300">
                          {[
                            'वीडियो टाइमलाइन और क्लिप्स',
                            'वीडियो फ्रेम / जैकेट चुनें',
                            'हेडलाइन्स व टाइमलाइन शेड्यूलिंग',
                            'मल्टी-ट्रैक ऑडियो मिक्सर',
                            'वीडियो ट्रांज़िशन इफ़ेक्ट्स',
                            'खबर की लोकेशन',
                            'सोशल फ़ूटर, टिकर व ब्रांडिंग',
                          ][studioStep - 1]}
                        </span>
                      </div>

                      {/* View Switcher: Stepwise vs Grid */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setStudioViewMode('stepwise')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            studioViewMode === 'stepwise'
                              ? 'bg-amber-400 text-slate-950 font-black shadow'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                          title="स्टेप-वाइज़ सिस्टमैटिक व्यू"
                        >
                          <span>📑 स्टेप-वाइज़</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudioViewMode('grid')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            studioViewMode === 'grid'
                              ? 'bg-amber-400 text-slate-950 font-black shadow'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                          title="सभी 7 कार्ड्स ग्रिड में देखें"
                        >
                          <span>⊞ ग्रिड व्यू</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Step Navigation Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold w-full">
                      {[
                        { step: 1, label: '१. क्लिप्स', icon: Film },
                        { step: 2, label: '२. फ्रेम व जैकेट', icon: Tv },
                        { step: 3, label: '३. हेडलाइन्स', icon: Type },
                        { step: 4, label: '४. ऑडियो', icon: Music },
                        { step: 5, label: '५. इफेक्ट्स', icon: Layers },
                        { step: 6, label: '६. लोकेशन', icon: MapPin },
                        { step: 7, label: '७. फ़ूटर व टिकर', icon: Globe },
                      ].map((s) => {
                        const isActive = studioStep === s.step;
                        const IconComp = s.icon;
                        return (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => {
                              setStudioStep(s.step);
                              setStudioViewMode('stepwise');
                            }}
                            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white font-black shadow-md'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                              isActive ? 'bg-white text-red-600' : 'bg-amber-400 text-neutral-950'
                            }`}>
                              {s.step}
                            </span>
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cards Container: Full-width in stepwise mode; responsive grid in grid mode */}
                  <div className={studioViewMode === 'stepwise' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 items-stretch'}>
                    {(studioViewMode === 'grid' || studioStep === 1) && (
                      /* Card 1: Multi-Clip Video Timeline Manager */
                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        1. वीडियो टाइमलाइन और क्लिप्स
                      </span>
                      <button
                        type="button"
                        onClick={() => additionalClipInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ क्लिप जोड़ें</span>
                      </button>
                    </div>

                    {/* Clips List */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-300">
                        टाइमलाइन क्लिप्स ({clips.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clips.map((c, idx) => {
                          const isActive = activeClipIndex === idx;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setActiveClipIndex(idx);
                                setVideoUrl(c.url);
                                setTrimStart(c.trimStart);
                                setTrimEnd(c.trimEnd);
                                showToast(`क्लिप ${idx + 1} सक्रिय`);
                              }}
                              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                isActive
                                  ? 'bg-amber-400/20 border-amber-400 text-white ring-2 ring-amber-400/60 shadow-md'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs font-bold truncate max-w-[120px]">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {clips.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = clips.filter((_, i) => i !== idx);
                                      setClips(updated);
                                      if (activeClipIndex >= updated.length) {
                                        setActiveClipIndex(Math.max(0, updated.length - 1));
                                      }
                                      showToast('क्लिप हटाई गई');
                                    }}
                                    className="p-1 rounded text-red-400 hover:bg-red-950/60 transition"
                                    title="क्लिप हटाएं"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isActive && <Check className="w-4 h-4 text-amber-400" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Clip Trimming */}
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">
                          सक्रिय क्लिप ट्रिम (क्लिप #{activeClipIndex + 1}):
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          {formatTime(trimStart)} - {formatTime(trimEnd)} ({Math.max(0, trimEnd - trimStart)}s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1 text-slate-300">
                            <span>शुरुआती समय:</span>
                            <span className="text-red-400 font-mono">{formatTime(trimStart)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(0, trimEnd - 2)}
                            step="1"
                            value={trimStart}
                            onChange={(e) => setTrimStart(parseInt(e.target.value))}
                            className="w-full accent-red-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1 text-slate-300">
                            <span>समाप्ति समय:</span>
                            <span className="text-red-400 font-mono">{formatTime(trimEnd)}</span>
                          </div>
                          <input
                            type="range"
                            min={trimStart + 2}
                            max={Math.max(60, Math.floor(duration))}
                            step="1"
                            value={trimEnd}
                            onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                            className="w-full accent-red-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                            <span>ज़ूम:</span>
                            <span className="text-amber-400 font-mono">{zoomScale.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.8"
                            max="2.5"
                            step="0.05"
                            value={zoomScale}
                            onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                            <span>ऊपर/नीचे:</span>
                            <span className="text-amber-400 font-mono">{offsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min="-150"
                            max="150"
                            step="5"
                            value={offsetY}
                            onChange={(e) => setOffsetY(parseInt(e.target.value))}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 2) && (
                  /* Card 2: Select Jacket / Frame */
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        2. वीडियो फ्रेम / जैकेट चुनें
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {compatibleFrames.length} कंपैटिबल फ्रेम उपलब्ध
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {compatibleFrames.map((f) => {
                        const isSel = selectedFrameId === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFrameId(f.id);
                              showToast(`✅ ${f.nameHi} चुना गया`);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSel
                                ? 'bg-amber-400/20 border-amber-400 text-white ring-2 ring-amber-400/60 shadow-lg'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xl p-1.5 bg-slate-900 rounded-lg shrink-0">
                              {f.id === 'frame-custom-3line-4-5' ? '📰' : f.id === 'frame-custom-full-9-16' ? '📱' : '📺'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-amber-300 flex items-center justify-between">
                                <span className="truncate">{f.nameHi}</span>
                                {isSel && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                                {f.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 3) && (
                  /* Card 3: Headlines & Timeline Scheduling (Single vs 10s/15s Interval) */
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        3. हेडलाइन्स व टाइमलाइन शेड्यूलिंग (Headlines & Scheduling)
                      </span>
                    </div>

                    {/* Mode Selector: Single Header vs Time Interval */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-300">हेडलाइन प्रदर्शन मोड:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setHeadlineScheduleMode('single');
                              showToast('सिंगल हेडलाइन मोड सेट');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              headlineScheduleMode === 'single'
                                ? 'bg-amber-400 text-slate-950 font-black shadow'
                                : 'bg-slate-900 text-slate-300 border border-slate-800'
                            }`}
                          >
                            🔵 सिंगल हेडलाइन
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHeadlineScheduleMode('scheduled');
                              showToast('⏱️ टाइमलाइन शेड्यूलिंग मोड सेट');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              headlineScheduleMode === 'scheduled'
                                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow'
                                : 'bg-slate-900 text-slate-300 border border-slate-800'
                            }`}
                          >
                            ⏱️ समय अनुसार शेड्यूलिंग
                          </button>
                        </div>
                      </div>

                      {/* Scheduling Interval Options */}
                      {headlineScheduleMode === 'scheduled' && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300">बदलने का अंतराल (Interval):</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setHeadlineInterval(10);
                                  showToast('10 सेकंड अंतराल सेट');
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  headlineInterval === 10
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                10 सेकंड
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHeadlineInterval(15);
                                  showToast('15 सेकंड अंतराल सेट');
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  headlineInterval === 15
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                15 सेकंड
                              </button>
                            </div>
                          </div>

                          <div className="p-2 bg-slate-900/80 rounded-lg text-[11px] text-amber-300 font-bold border border-amber-500/30">
                            🔴 वर्तमान समय ({formatTime(currentTime)}) पर सक्रिय हेडलाइन: "{activeHeadline}"
                          </div>

                          {/* Dynamic Headline Slots List */}
                          <div className="space-y-2">
                            {scheduledHeadlines.map((hText, sIdx) => {
                              const startSec = sIdx * headlineInterval;
                              const endSec = (sIdx + 1) * headlineInterval;
                              return (
                                <div key={sIdx} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-amber-400">
                                      स्लॉट #{sIdx + 1} ({formatTime(startSec)} - {formatTime(endSec)}):
                                    </span>
                                    {scheduledHeadlines.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = scheduledHeadlines.filter((_, i) => i !== sIdx);
                                          setScheduledHeadlines(updated);
                                        }}
                                        className="text-red-400 hover:text-red-300 text-[10px] font-bold"
                                      >
                                        हटाएं
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={hText}
                                    onChange={(e) => {
                                      const updated = [...scheduledHeadlines];
                                      updated[sIdx] = e.target.value;
                                      setScheduledHeadlines(updated);
                                    }}
                                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => {
                                setScheduledHeadlines((prev) => [...prev, 'नया ब्रेकिंग अपडेट यहाँ दर्ज करें...']);
                                showToast('+ नया टाइम स्लॉट जोड़ा गया');
                              }}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                            >
                              + नया हेडलाइन स्लॉट जोड़ें
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Raw Script & AI Suggestions in Studio Mode */}
                    <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-slate-200">
                        रॉ स्क्रिप्ट से हेडलाइन्स जनरेट करें:
                      </label>
                      <textarea
                        rows={2}
                        value={rawScriptText}
                        onChange={(e) => setRawScriptText(e.target.value)}
                        placeholder="खबर के तथ्य या प्रेस नोट यहाँ लिखें..."
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium text-xs focus:border-amber-400 focus:outline-none leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateFromRawScript}
                        disabled={isGeneratingRawHeadlines}
                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isGeneratingRawHeadlines ? 'AI हेडलाइंस तैयार हो रही हैं...' : '✨ AI से 4 हेडलाइंस बनाएं'}</span>
                      </button>
                    </div>

                    {/* Main Headline Textarea */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        प्राथमिक मुख्य हेडलाइन:
                      </label>
                      <textarea
                        rows={3}
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="वीडियो पर दिखने वाली मुख्य खबर यहाँ लिखें..."
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 4) && (
                  /* Card 4: Multi-Track Audio Mixing Studio (BGM + Voiceover + Video) */
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-400" />
                        4. मल्टी-ट्रैक ऑडियो मिक्सर (BGM + Voiceover + Video)
                      </span>
                      <button
                        type="button"
                        onClick={toggleStandaloneBgmPreview}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow ${
                          isStandaloneBgmPlaying
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        }`}
                        title={isStandaloneBgmPlaying ? 'म्यूज़िक बंद करें' : 'म्यूज़िक सुनकर देखें'}
                      >
                        {isStandaloneBgmPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                        <span>{isStandaloneBgmPlaying ? 'म्यूज़िक रोकें' : 'म्यूज़िक सुनें'}</span>
                      </button>
                    </div>

                    {/* Track 1: Background Music Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300">
                        ट्रैक 1: बैकग्राउंड म्यूज़िक (Royalty-Free BGM):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {BUILTIN_NEWS_TRACKS.map((t) => {
                          const isSel = bgmTrack === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setBgmTrack(t.id);
                                if (isPlaying || isStandaloneBgmPlaying) {
                                  newsAudio.playTrack(t.id);
                                }
                                showToast(`🎵 ${t.name} चुना गया`);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                isSel
                                  ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xl shrink-0 p-1 bg-slate-900 rounded-lg">{t.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-black text-amber-300 truncate">{t.name}</div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.description}</div>
                              </div>
                              {isSel && <Check className="w-4 h-4 text-amber-400 shrink-0 self-center" />}
                            </button>
                          );
                        })}

                        {/* Custom MP3 Upload */}
                        <div
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            bgmTrack === 'custom'
                              ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">📁</span>
                              <span className="text-xs font-black text-amber-300">कस्टम ऑडियो फ़ाइल (MP3)</span>
                            </div>
                            {bgmTrack === 'custom' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => audioFileInputRef.current?.click()}
                              className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                            >
                              <Upload className="w-3 h-3 text-amber-400" />
                              <span>{customAudioTitle ? 'ऑडियो बदलें' : 'MP3 अपलोड करें'}</span>
                            </button>
                            {customAudioTitle && (
                              <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">
                                {customAudioTitle}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* None / Mute Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setBgmTrack('none');
                            newsAudio.stop();
                            setIsStandaloneBgmPlaying(false);
                            showToast('म्यूज़िक बंद किया गया');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            bgmTrack === 'none'
                              ? 'bg-red-950/40 border-red-500 text-white ring-1 ring-red-400/50 shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <VolumeX className="w-5 h-5 text-red-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-red-300">कोई म्यूज़िक नहीं (No BGM)</div>
                            <div className="text-[10px] text-slate-500">केवल वीडियो की अपनी आवाज़ चलेगी</div>
                          </div>
                          {bgmTrack === 'none' && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                        </button>
                      </div>
                    </div>

                    {/* Track 2: Voiceover Audio Track */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-amber-400" />
                          <span>ट्रैक 2: वॉइसओवर / वॉयस ट्रैक (Voiceover Audio):</span>
                        </span>
                        {voiceoverUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceoverUrl(null);
                              setVoiceoverTitle('');
                              showToast('वॉइसओवर हटाया गया');
                            }}
                            className="text-[10px] text-red-400 hover:underline font-bold"
                          >
                            वॉइसओवर हटाएं
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => voiceoverFileInputRef.current?.click()}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>{voiceoverTitle ? 'वॉइसओवर ऑडियो बदलें' : 'वॉइसओवर फ़ाइल अपलोड करें'}</span>
                        </button>
                        {voiceoverTitle ? (
                          <span className="text-xs text-amber-300 font-mono truncate max-w-[200px]">
                            🎙️ {voiceoverTitle}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            (कोई अलग वॉइसओवर लोड नहीं है)
                          </span>
                        )}
                      </div>

                      {voiceoverUrl && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                              <span>वॉइसओवर वॉल्यूम:</span>
                              <span className="text-amber-400 font-mono">{voiceoverVolume}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={voiceoverVolume}
                              onChange={(e) => setVoiceoverVolume(parseInt(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                              <span>शुरुआती देरी (Delay):</span>
                              <span className="text-amber-400 font-mono">{voiceoverStartTime}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="1"
                              value={voiceoverStartTime}
                              onChange={(e) => setVoiceoverStartTime(parseInt(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audio Volume Mixer Sliders (BGM & Original Video) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-amber-400" />
                            <span>BGM वॉल्यूम:</span>
                          </span>
                          <span className="text-amber-400 font-mono">{bgmVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={bgmVolume}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setBgmVolume(val);
                            newsAudio.setVolume(val / 100);
                          }}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ओरिजिनल वीडियो आवाज़:</span>
                          </span>
                          <span className="text-emerald-400 font-mono">{videoVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={videoVolume}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setVideoVolume(val);
                            if (videoRef.current) {
                              videoRef.current.volume = isMuted ? 0 : val / 100;
                            }
                          }}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 5) && (
                  /* Card 5: Video Transitions & Motion FX */
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        5. वीडियो ट्रांज़िशन इफ़ेक्ट्स (Transitions & Motion FX)
                      </span>
                      <button
                        type="button"
                        onClick={triggerTransitionPreview}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-1 shadow cursor-pointer transition active:scale-95"
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                        <span>ट्रांज़िशन टेस्ट</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'flash', label: '⚡ न्यूज़ फ्लैश', desc: 'सफ़ेद चमक (Breaking Flash)' },
                        { id: 'fade', label: '🌑 ब्लैक फेड', desc: 'स्मूथ फेड (Smooth Fade)' },
                        { id: 'zoom', label: '🔍 इम्पैक्ट ज़ूम', desc: 'पल्स ज़ूम (Dramatic Pulse)' },
                        { id: 'slide', label: '🎞️ टीवी स्लाइड', desc: 'रेड-गोल्ड वाइप (News Wipe)' },
                        { id: 'glitch', label: '💻 डिजिटल ग्लिच', desc: 'साइबर इफ़ेक्ट (Cyber Glitch)' },
                        { id: 'none', label: 'कट (कोई नहीं)', desc: 'हार्ड कट (Direct Cut)' },
                      ].map((tr) => {
                        const isSel = transitionType === tr.id;
                        return (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => {
                              setTransitionType(tr.id as VideoTransitionType);
                              if (tr.id !== 'none') {
                                setIsTransitionActive(true);
                                setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
                              }
                              showToast(`✨ ${tr.label} ट्रांज़िशन चुना गया`);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSel
                                ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-black text-amber-300 flex items-center justify-between">
                              <span>{tr.label}</span>
                              {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{tr.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 6) && (
                  /* Card 6: Location - Dedicated Independent Box */
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        6. खबर की लोकेशन (Location Badge)
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <input
                          type="checkbox"
                          checked={showLocation}
                          onChange={(e) => setShowLocation(e.target.checked)}
                          className="accent-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-amber-300">
                          {showLocation ? 'लोकेशन दिखाएं (ON)' : 'लोकेशन छिपाएं (OFF)'}
                        </span>
                      </label>
                    </div>

                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="उदा. भोपाल / नई दिल्ली / लखनऊ"
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      💡 जब लोकेशन खाली हो या टॉगल बंद हो, तो स्क्रीन पर कोई खाली पट्टी नहीं आएगी।
                    </p>
                  </div>
                )}

                {(studioViewMode === 'grid' || studioStep === 7) && (
                  <>
                    {/* Card 7: Social Media & Scrolling Ticker */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-amber-400" />
                        7. सोशल फ़ूटर व टिकर (Social & Ticker)
                      </span>
                    </div>

                    {/* Strip Position Switcher */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-300">सोशल पट्टी की स्थिति:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSocialPosition('footer');
                            showToast('सोशल पट्टी नीचे (Footer) पर सेट');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            socialPosition === 'footer'
                              ? 'bg-amber-400 text-slate-950 font-black shadow'
                              : 'bg-slate-900 text-slate-300 border border-slate-800'
                          }`}
                        >
                          ⬇️ नीचे (Footer)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSocialPosition('header');
                            showToast('सोशल पट्टी ऊपर (Header) पर सेट');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            socialPosition === 'header'
                              ? 'bg-amber-400 text-slate-950 font-black shadow'
                              : 'bg-slate-900 text-slate-300 border border-slate-800'
                          }`}
                        >
                          ⬆️ ऊपर (Header)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          सोशल हैंडल:
                        </label>
                        <input
                          type="text"
                          value={socialHandle}
                          onChange={(e) => setSocialHandle(e.target.value)}
                          placeholder="उदा. @AINewsMaker"
                          className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          वेबसाइट:
                        </label>
                        <input
                          type="text"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="उदा. ainewsmaker.online"
                          className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-300">
                            मोबाइल नंबर:
                          </label>
                          <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showMobileNumber}
                              onChange={(e) => setShowMobileNumber(e.target.checked)}
                              className="accent-amber-400"
                            />
                            <span>दिखाएं</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="उदा. +91 98765 43210"
                          className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Scrolling Ticker */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                          <span>स्क्रोलिंग टिकर:</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showTicker}
                            onChange={(e) => setShowTicker(e.target.checked)}
                            className="accent-amber-400 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-bold text-amber-300">
                            {showTicker ? 'टिकर ऑन' : 'टिकर ऑफ'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={tickerText}
                        onChange={(e) => setTickerText(e.target.value)}
                        placeholder="उदा. ⚡ ताज़ा बुलेटिन: लाइव अपडेट्स जारी..."
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Card 8: Channel Logo & Watermark */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-amber-400" />
                        8. चैनल लोगो और वॉटरमार्क
                      </span>
                    </div>

                    {/* Logo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>लोगो बदलें</span>
                        </button>
                        {activeLogoUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={activeLogoUrl}
                              alt="Logo preview"
                              className="h-9 w-16 object-contain bg-black/40 rounded p-1 border border-slate-700"
                            />
                            {isGifActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-black rounded shrink-0">
                                🎬 GIF
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            (डिफ़ॉल्ट लोगो सक्रिय)
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span>लोगो का आकार:</span>
                          <span className="text-amber-400 font-mono">{logoScale}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="180"
                          step="5"
                          value={logoScale}
                          onChange={(e) => setLogoScale(parseInt(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Watermark */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">टेक्स्ट वॉटरमार्क:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showWatermark}
                            onChange={(e) => setShowWatermark(e.target.checked)}
                            className="accent-amber-400 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-amber-300">
                            {showWatermark ? 'सक्रिय (ON)' : 'निष्क्रिय (OFF)'}
                          </span>
                        </label>
                      </div>

                      {showWatermark && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <input
                            type="text"
                            value={watermarkText}
                            readOnly
                            className="p-2 bg-slate-950/70 border border-slate-700 rounded-xl text-amber-300 font-black text-xs cursor-not-allowed"
                          />
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                              <span>पारदर्शिता:</span>
                              <span className="text-amber-400 font-mono">{Math.round(watermarkOpacity * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="0.8"
                              step="0.05"
                              value={watermarkOpacity}
                              onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Stepwise Navigation Footer */}
            {studioViewMode === 'stepwise' && (
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
                <button
                  type="button"
                  disabled={studioStep <= 1}
                  onClick={() => setStudioStep((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>पिछला चरण</span>
                </button>

                <div className="text-[11px] text-slate-400 font-bold hidden sm:block">
                  चरण {studioStep} / 7
                </div>

                {studioStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => setStudioStep((prev) => Math.min(7, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <span>अगला चरण (स्टेप {studioStep + 1})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDownloadVideo(false)}
                    disabled={!quickVideoValidation.isValid || isExporting}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-xs cursor-pointer shadow hover:from-emerald-500 hover:to-teal-400 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>{isExporting ? 'रेंडरिंग जारी...' : completedDownloadUrl ? 'तैयार वीडियो डाउनलोड' : 'वीडियो डाउनलोड करें'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
        </section>
      </div>

      {/* Caption Modal Dialog */}
      {isCaptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-amber-300">वीडियो सोशल मीडिया कैप्शन</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCaptionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              तैयार वीडियो के साथ सोशल मीडिया (WhatsApp, Facebook, YouTube, Instagram) पर पोस्ट करने हेतु कैप्शन:
            </p>

            <textarea
              readOnly
              rows={8}
              value={generatedCaptionText}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCaptionText);
                  showToast('✅ कैप्शन क्लिपबोर्ड पर कॉपी हो गया!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>कॉपी करें (Copy Caption)</span>
              </button>
              {isProjectCompleted && onNavigateHome && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCaptionModalOpen(false);
                    handleNavigateHome();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  होम पेज पर जाएं
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Render Complete & Instant Download Modal Dialog */}
      {isVideoSuccessModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-emerald-500/80 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-300">वीडियो रेंडर 100% पूर्ण!</h3>
                  <p className="text-[11px] text-slate-300">पूरी न्यूज़ जैकेट व ऑडियो के साथ तैयार</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoSuccessModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completedDownloadUrl && (
              <div className="w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                <video
                  src={completedDownloadUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-56 object-contain mx-auto"
                />
              </div>
            )}

            <div className="p-3 bg-emerald-950/40 border border-emerald-600/30 rounded-2xl text-center space-y-1">
              <div className="text-xs font-bold text-emerald-200 flex items-center justify-center gap-2 flex-wrap">
                <span>फाइल: <span className="font-mono text-emerald-400 break-all">{completedDownloadFilename || 'news_video.mp4'}</span></span>
                {completedFileSizeLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 text-emerald-200 text-[10px] font-mono border border-emerald-500/40">
                    {completedFileSizeLabel}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300">
                यदि आपका ब्राउज़र या ऐप स्वचालित सेव प्रारंभ न करे, तो नीचे हरे बटन पर क्लिक करें:
              </div>
            </div>

            {/* Direct 1-Click Native Save Button (no duplicate <a>+onClick firing) */}
            <button
              type="button"
              onClick={handleImmediateDownload}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>⬇ सीधे वीडियो फाइल सेव करें (Save Video Now)</span>
            </button>

            <button
              type="button"
              onClick={handleShareExportedVideo}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>📤 वीडियो शेयर करें (WhatsApp / Reels / Social)</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCaptionText);
                  showToast('✅ सोशल कैप्शन कॉपी हो गया!');
                }}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>📋 कैप्शन कॉपी करें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVideoSuccessModalOpen(false);
                  handleDownloadVideo(true);
                }}
                className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>🔄 पुनः रेंडर करें</span>
              </button>
            </div>

            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  setIsVideoSuccessModalOpen(false);
                  handleNavigateHome();
                }}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-slate-300 font-bold text-xs rounded-xl border border-neutral-700 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>होम पेज पर वापस जाएं</span>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-white">
              वीडियो स्टूडियो रीसेट करें?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              क्या आप वास्तव में वीडियो स्टूडियो रीसेट करना चाहते हैं? आपका वर्तमान संपादन व जोड़ी गई क्लिप्स साफ हो जाएंगी और स्टूडियो प्रारंभिक स्थिति (चरण 1) पर आ जाएगा।
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border border-slate-700 transition active:scale-95"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={executeReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-red-600/30 transition active:scale-95"
              >
                हाँ, रीसेट करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frozen Bottom Navigation Bar on Mobile (directly above footer menu fixed at bottom-16) (R2) */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-md border-t border-slate-800 shadow-2xl px-3 py-2.5 sm:py-3 lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setQuickStep((s) => Math.max(1, s - 1))}
            disabled={quickStep === 1}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs disabled:opacity-30 cursor-pointer hover:bg-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <span>पिछला चरण</span>
          </button>

          <span className="text-[11px] font-extrabold text-amber-400 px-2 shrink-0">
            {quickStep}/7
          </span>

          {quickStep < 7 ? (
            <button
              type="button"
              onClick={() => setQuickStep((s) => Math.min(7, s + 1))}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-xs cursor-pointer shadow hover:from-red-500 hover:to-amber-400 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>अगला चरण</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleDownloadVideo(false)}
              disabled={!quickVideoValidation.isValid || isExporting}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs cursor-pointer shadow hover:from-emerald-500 hover:to-teal-400 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isExporting ? 'रेंडरिंग...' : completedDownloadUrl ? 'तैयार वीडियो' : 'डाउनलोड'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
