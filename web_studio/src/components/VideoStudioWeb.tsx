import React, { useState, useRef, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { VideoFeedItem, INITIAL_VIDEOS } from '../data/newsFeedData';
import { ChannelProfile } from '../types';
import { getApiUrl } from '../lib/apiConfig';
import { processNewsLocally } from '../lib/clientAiProcessor';
import { newsAudio, BUILTIN_NEWS_TRACKS } from '../lib/newsAudioEngine';
import { generateVideoDownloadFileName } from '../lib/dateUtils';
import { saveVideoDraft } from '../lib/draftsManager';
import { getSocialIconSrc } from '../lib/socialIconsData';
import {
  VIDEO_FRAME_DEFINITIONS,
  getVideoFrameDefinition,
  getCompatibleFrames,
  VideoFrameDefinition,
} from '../lib/videoTemplatesRegistry';
import { isEffectiveSuperAdmin, getUserSubscription } from '../lib/userPlanManager';

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
  socialPosition?: 'footer' | 'header';
  showLocation?: boolean;
  showTicker?: boolean;
  socialIcons?: { fb?: HTMLImageElement | null; ig?: HTMLImageElement | null; yt?: HTMLImageElement | null; x?: HTMLImageElement | null };
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

/**
 * Shared Canvas Composition Function
 * Renders the EXACT same layout for Frame 1, Frame 2, and Classic Frame
 * ensuring 100% parity between Live Canvas and Exported Video.
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
    showMobileNumber,
    cropRegion,
    zoomScale,
    offsetY,
    isExclusiveBadge,
    tickerText,
  } = opts;

  ctx.clearRect(0, 0, width, height);

  if (selectedFrameId === 'frame-custom-3line-4-5') {
    // ==========================================
    // FRAME 1: 3-Line Headline / 4:5 Video Window
    // Canvas: 9:16 (e.g. 720 x 1280)
    // ==========================================
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const topH = Math.round(height * 0.22); // ~281px at 1280
    const footerH = Math.round(height * 0.08); // ~102px at 1280
    const isHeaderSocial = opts.socialPosition === 'header';
    const videoY = isHeaderSocial ? (footerH + topH) : topH;
    const videoH = isHeaderSocial ? (height - footerH - topH) : (height - topH - footerH); // ~897px at 1280 (approx 4:5 with 720 width)

    // 1. Draw Middle 4:5 Video Window (NO green chroma, cropped to 4:5 safe region)
    if (video && video.readyState >= 2) {
      try {
        const vw = video.videoWidth || 720;
        const vh = video.videoHeight || 1280;
        const targetCropH = Math.min(vh, Math.round(vw * 1.25));
        const maxCropY = Math.max(0, vh - targetCropH);
        const normY = cropRegion ? Math.max(0, Math.min(1, cropRegion.y)) : 0.15;
        const sy = Math.round(normY * maxCropY);
        const sx = 0;
        const sw = vw;
        const sh = targetCropH;

        ctx.save();
        ctx.drawImage(video, sx, sy, sw, sh, 0, videoY, width, videoH);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, videoY, width, videoH);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, videoY, width, videoH);
    }

    // 2. Draw Crimson Header with 3-Line Headline & Sub-Strip
    const crimsonY = isHeaderSocial ? footerH : 0;
    const topGrad = ctx.createLinearGradient(0, crimsonY, 0, crimsonY + topH);
    topGrad.addColorStop(0, '#7f0909');
    topGrad.addColorStop(0.5, '#5c0505');
    topGrad.addColorStop(1, '#3b0303');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, crimsonY, width, topH);

    // Headline Text (up to 3 lines, centered, Devanagari word-wrapped)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    const rawLines = (headline || '').split('\n').filter((l) => l.trim().length > 0);
    let lines: string[] = [];
    if (rawLines.length > 0) {
      rawLines.forEach((p) => {
        lines.push(...wrapDevanagariText(ctx, p, width - 60));
      });
      lines = lines.slice(0, 3);
    }

    if (lines.length > 0) {
      const scale = width / 720;
      let fontSize = Math.round(28 * scale);
      ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
      lines.forEach((l) => {
        while (ctx.measureText(l).width > width - 50 && fontSize > Math.round(18 * scale)) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
        }
      });

      const startY = crimsonY + (lines.length === 1 ? Math.round(75 * scale) : lines.length === 2 ? Math.round(55 * scale) : Math.round(44 * scale));
      const lineSpacing = fontSize + Math.round(8 * scale);
      lines.forEach((l, idx) => {
        ctx.fillText(l.trim(), width / 2, startY + idx * lineSpacing);
      });
    }
    ctx.restore();

    // Subtle golden separator
    const sepY = crimsonY + topH - 68;
    const sepGrad = ctx.createLinearGradient(0, sepY, width, sepY);
    sepGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    sepGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.7)');
    sepGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sepGrad;
    ctx.fillRect(20, sepY, width - 40, 2);

    // Sub-strip: Location on Left, Transparent Logo on Right
    const stripY = crimsonY + topH - 58;
    const stripH = 46;

    // Location Badge (White background, blue pin, blue border) - rendered ONLY when showLocation is not false and location has content
    if (opts.showLocation !== false && location && location.trim()) {
      const locText = location.trim();
      const locW = 200;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(20, stripY, locW, stripH, 8);
      } else {
        ctx.rect(20, stripY, locW, stripH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Noto Sans Devanagari", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`📍 | ${locText}`, 30, stripY + 30);
      ctx.restore();
    }

    // Transparent Channel Logo (NO yellow box, preserves aspect ratio)
    const scaleFactor = (opts.logoScale || 100) / 100;
    const maxLogoW = Math.round(150 * scaleFactor);
    const maxLogoH = stripH + 4;
    const logoX = width - maxLogoW - 20;

    ctx.save();
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      try {
        const imgAspect = logoImg.naturalWidth / logoImg.naturalHeight;
        let dw = maxLogoW;
        let dh = dw / imgAspect;
        if (dh > maxLogoH) {
          dh = maxLogoH;
          dw = dh * imgAspect;
        }
        const dx = logoX + (maxLogoW - dw);
        const dy = stripY - 2 + (maxLogoH - dh) / 2;
        ctx.drawImage(logoImg, dx, dy, dw, dh);
      } catch {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px "Noto Sans Devanagari", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), width - 20, stripY + 28);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px "Noto Sans Devanagari", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), width - 20, stripY + 28);
    }
    ctx.restore();

    // 3. Draw Yellow Footer / Header Strip
    const socialY = isHeaderSocial ? 0 : (height - footerH);
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(0, socialY, width, footerH);

    // Watch Now Pill (Black)
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(20, socialY + 24, 150, 48, 6);
    } else {
      ctx.rect(20, socialY + 24, 150, 48);
    }
    ctx.fill();

    ctx.fillStyle = '#ffeb3b';
    ctx.font = '900 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WATCH NOW ▶', 20 + 75, socialY + 54);
    ctx.restore();

    // Circular social icons in middle
    const iconColors = ['#1877f2', '#e1306c', '#ff0000', '#000000', '#0a66c2'];
    const startIconX = 205;
    const iconY = socialY + 48;
    iconColors.forEach((col, idx) => {
      ctx.save();
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startIconX + idx * 34, iconY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Website text (Right-aligned)
    if (websiteUrl && websiteUrl.trim()) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`🌐 ${websiteUrl.trim()}`, width - 24, socialY + 55);
      ctx.restore();
    }
  } else if (selectedFrameId === 'frame-custom-full-9-16') {
    // ==========================================
    // FRAME 2: Full 9:16 Video Visibility
    // Canvas: 9:16 (720 x 1280)
    // ==========================================
    // 1. Draw Full Bleed Video in Background (NO green chroma)
    if (video && video.readyState >= 2) {
      try {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(0, offsetY);
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
    }

    const isFooterSocial = opts.socialPosition === 'footer';

    // 2. Floating White Social Pill Banner (Top or Bottom)
    const pillW = width - 60;
    const pillH = 44;
    const pillY = isFooterSocial ? (height - 68) : 36;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(30, pillY, pillW, pillH, 22);
    } else {
      ctx.rect(30, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    const sText = `f ${socialHandle}   |   📷 ${socialHandle}   |   ▶ ${socialHandle}   |   𝕏 ${socialHandle}`;
    ctx.fillText(sText, width / 2, pillY + 28);
    ctx.restore();

    // 3. Sub-strip: Transparent Logo on Left, Location on Right
    const subY = isFooterSocial ? 36 : 96;
    const scaleFactor = (opts.logoScale || 100) / 100;
    const maxLogoW = Math.round(150 * scaleFactor);
    const maxLogoH = 54;

    ctx.save();
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      try {
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        let dw = maxLogoW;
        let dh = dw / aspect;
        if (dh > maxLogoH) {
          dh = maxLogoH;
          dw = dh * aspect;
        }
        const dy = subY + (maxLogoH - dh) / 2;
        ctx.drawImage(logoImg, 30, dy, dw, dh);
      } catch {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px "Noto Sans Devanagari", Arial, sans-serif';
        ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), 30, subY + 34);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px "Noto Sans Devanagari", Arial, sans-serif';
      ctx.fillText((channelTag || 'AI NEWS').trim().slice(0, 16), 30, subY + 34);
    }
    ctx.restore();

    // Location Pill on Right (White with Red Pin) - rendered ONLY when showLocation is not false and location has content
    if (opts.showLocation !== false && location && location.trim()) {
      const locW = 180;
      const locX = width - locW - 30;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(locX, subY + 2, locW, maxLogoH - 4, 8);
      } else {
        ctx.rect(locX, subY + 2, locW, maxLogoH - 4);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px "Noto Sans Devanagari", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`📍 | ${location.trim()}`, locX + 16, subY + 32);
      ctx.restore();
    }

    // 4. Bottom Floating Red Headline Banner with Angled Gold Accents
    const bannerY = isFooterSocial ? (height - 180) : (height - 150);
    const bannerH = 95;
    const bannerW = width - 100;
    const bannerX = 50;

    // Gold Angled Accents on Left
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(bannerX - 16, bannerY);
    ctx.lineTo(bannerX - 6, bannerY);
    ctx.lineTo(bannerX - 14, bannerY + bannerH);
    ctx.lineTo(bannerX - 24, bannerY + bannerH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(bannerX - 6, bannerY);
    ctx.lineTo(bannerX + 4, bannerY);
    ctx.lineTo(bannerX - 4, bannerY + bannerH);
    ctx.lineTo(bannerX - 14, bannerY + bannerH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Gold Angled Accents on Right
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - 4, bannerY);
    ctx.lineTo(bannerX + bannerW + 6, bannerY);
    ctx.lineTo(bannerX + bannerW - 2, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW - 12, bannerY + bannerH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW + 6, bannerY);
    ctx.lineTo(bannerX + bannerW + 16, bannerY);
    ctx.lineTo(bannerX + bannerW + 8, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW - 2, bannerY + bannerH);
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
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, 8);
    } else {
      ctx.rect(bannerX, bannerY, bannerW, bannerH);
    }
    ctx.fill();
    ctx.stroke();

    // Headline Text inside Banner (Devanagari word-wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;

    const rawH = (headline || '').split('\n').filter((l) => l.trim().length > 0);
    let bLines: string[] = [];
    if (rawH.length > 0) {
      rawH.forEach((p) => {
        bLines.push(...wrapDevanagariText(ctx, p, bannerW - 40));
      });
      bLines = bLines.slice(0, 2);
    }

    if (bLines.length > 0) {
      const scale = width / 720;
      let bFontSize = Math.round(26 * scale);
      ctx.font = `bold ${bFontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
      bLines.forEach((l) => {
        while (ctx.measureText(l).width > bannerW - 30 && bFontSize > Math.round(18 * scale)) {
          bFontSize -= 2;
          ctx.font = `bold ${bFontSize}px "Noto Sans Devanagari", "Baloo 2", Arial, sans-serif`;
        }
      });

      if (bLines.length === 1) {
        ctx.fillText(bLines[0].trim(), width / 2, bannerY + Math.round(56 * scale));
      } else {
        ctx.fillText(bLines[0].trim(), width / 2, bannerY + Math.round(38 * scale));
        ctx.fillText(bLines[1].trim(), width / 2, bannerY + Math.round(74 * scale));
      }
    }
    ctx.restore();
  } else {
    // ==========================================
    // FRAME 3: Classic Broadcast Lower-Third
    // ==========================================
    if (video && video.readyState >= 2) {
      try {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(0, offsetY);
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
    }

    // Top Bar / Watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, width, 90);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(24, 25, 130, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('🔴 LIVE', 42, 54);

    // Channel Logo / Name (Transparent, aspect ratio preserved)
    const scaleFactor = (opts.logoScale || 100) / 100;
    const maxLogoW = Math.round(140 * scaleFactor);
    const maxLogoH = 46;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      try {
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        let dw = maxLogoW;
        let dh = dw / aspect;
        if (dh > maxLogoH) {
          dh = maxLogoH;
          dw = dh * aspect;
        }
        ctx.drawImage(logoImg, 175, 25 + (maxLogoH - dh) / 2, dw, dh);
      } catch {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(channelTag, 175, 54);
      }
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(channelTag, 175, 54);
    }

    // Exclusive Badge
    if (isExclusiveBadge) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(width - 170, 25, 145, 42);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('EXCLUSIVE', width - 152, 52);
    }

    // Draw Bottom News Jacket (Lower Third)
    const jacketY = height - 280;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
    ctx.fillRect(0, jacketY, width, 280);

    // Yellow Location / Tag Strip - rendered ONLY when showLocation is not false and location has content
    if (opts.showLocation !== false && location && location.trim()) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, jacketY, width, 38);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(`📍 लोकेशन: ${location.trim()} | BREAKING NEWS`, 24, jacketY + 26);
    }

    // Red Headline Box (Devanagari word-wrapped, never truncated mid-word)
    ctx.fillStyle = '#ffffff';
    let hFontSize = 32;
    ctx.font = `bold ${hFontSize}px Arial, "Noto Sans Devanagari", sans-serif`;

    const rawH = (headline || '').split('\n').filter((l) => l.trim().length > 0);
    let headlineLines: string[] = [];
    if (rawH.length > 0) {
      rawH.forEach((p) => {
        headlineLines.push(...wrapDevanagariText(ctx, p, width - 48));
      });
      headlineLines = headlineLines.slice(0, 3);
    }

    if (headlineLines.length > 0) {
      const scale = width / 720;
      let hFontSize = Math.round(32 * scale);
      ctx.font = `bold ${hFontSize}px Arial, "Noto Sans Devanagari", sans-serif`;
      headlineLines.forEach((line, idx) => {
        ctx.fillText(line.trim(), 24, jacketY + Math.round(85 * scale) + idx * Math.round(42 * scale));
      });
    }

    // Sub-headline (Only if provided by compatible layout)
    if (subHeadline && subHeadline.trim()) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '22px Arial, "Noto Sans Devanagari", sans-serif';
      ctx.fillText(subHeadline.trim(), 24, jacketY + 85 + headlineLines.length * 42 + 5);
    }

    // Footer Bar (Socials, Website, Mobile) - clean non-overlapping layout
    const footerY = height - 58;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, footerY, width, 34);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px Arial, sans-serif';
    const footerParts: string[] = [];
    if (socialHandle && socialHandle.trim()) footerParts.push(socialHandle.trim());
    if (websiteUrl && websiteUrl.trim()) footerParts.push(`🌐 ${websiteUrl.trim()}`);
    if (showMobileNumber && mobileNumber && mobileNumber.trim()) footerParts.push(`📞 ${mobileNumber.trim()}`);
    const footerText = footerParts.join('   •   ');
    if (footerText) {
      ctx.textAlign = 'center';
      ctx.fillText(footerText, width / 2, footerY + 23);
      ctx.textAlign = 'left';
    }

    // Scrolling Ticker Text - clean separate strip at bottom (rendered only if showTicker is not false and has content)
    if (opts.showTicker !== false && tickerText && tickerText.trim()) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, height - 24, width, 24);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 13px Arial, "Noto Sans Devanagari", sans-serif';
      ctx.fillText(`⚡ ${tickerText.trim()}`, 12, height - 7);
    }
  }

  // Central Text Watermark (Part 11 & Vertical offset)
  if (opts.showWatermark && opts.watermarkText) {
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
    ctx.fillText(opts.watermarkText, width / 2, wmY);
    ctx.restore();
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

  // Mode 1 (Ready-to-Use / Quick Video) vs Mode 2 (Full Video Studio)
  // On mobile or when opened from Video & Reels, Quick Video workflow is MANDATORY (Part 2 & Part 3)
  const [isReadyToUseMode, setIsReadyToUseMode] = useState<boolean>(() => Boolean(initialVideo) || (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));

  // Video Source & Playback State - clean default (no hardcoded mov_bbb fallback per Part C.5 & F.13)
  const [videoUrl, setVideoUrl] = useState<string>(
    initialVideoUrl || initialVideo?.videoUrl || ''
  );
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
      return [{
        id: 'clip-1',
        name: initialVideo?.title || 'वीडियो क्लिप 1',
        url: defaultUrl,
        duration: parseFloat(String(initialVideo?.duration || '60')) || 60,
        trimStart: 0,
        trimEnd: parseFloat(String(initialVideo?.duration || '60')) || 60,
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
  const watermarkText = useMemo(() => {
    return (profile?.channelNameHi || currentUser?.channelName || '').toUpperCase();
  }, [profile?.channelNameHi, currentUser?.channelName]);

  // Audio Selection (Section 6 Step 2: 1. Original Audio, 2. Background Music, 3. No Music)
  const [audioOption, setAudioOption] = useState<'original' | 'bgm' | 'none'>('original');

  // Quick Video Active Workflow Step (1 to 5 + Final)
  const [quickStep, setQuickStep] = useState<number>(1);

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
    profile?.mobileNumber || ''
  );
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    profile?.showMobileNumber ?? true
  );

  // Compatible Frames List
  const compatibleFrames = useMemo(() => {
    return getCompatibleFrames({
      aspectRatio: aspect,
      isOnly4_5,
      hasCoreCrop: Boolean(cropRegion),
    });
  }, [aspect, isOnly4_5, cropRegion]);

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
        2: hasAudio,
        3: hasHeadline,
        4: hasLocation,
        5: hasFooter,
      } as Record<number, boolean>,
    };
  }, [videoUrl, clips, aspect, selectedFrameId, compatibleFrames, audioOption, headline, location, socialHandle, channelTag, mobileNumber]);

  // Reset Task Handler (Section 5)
  const handleResetTask = () => {
    if (headline.trim() || videoUrl || location.trim()) {
      if (!window.confirm('क्या आप वर्तमान संपादन को रीसेट करना चाहते हैं? इससे सभी अनसेव्ड बदलाव हट जाएंगे।')) {
        return;
      }
    }
    setHeadline('');
    setSubHeadline('');
    setLocation('');
    setTickerText('');
    setZoomScale(1.0);
    setOffsetY(0);
    setTrimStart(0);
    setTrimEnd(Math.floor(duration) || 60);
    setAudioOption('original');
    setBgmTrack('none');
    setBgmVolume(0);
    setVideoVolume(100);
    setShowWatermark(false);
    setWatermarkOffsetY(0);
    setTaskGifLogo('');
    setQuickStep(1);
    showToast('🔄 वर्तमान वीडियो प्रोजेक्ट रीसेट हो गया');
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

  // Raw Script to Headlines AI Generator (Part E.11)
  const handleGenerateFromRawScript = async () => {
    if (!rawScriptText.trim()) {
      showToast('कृपया पहले रॉ स्क्रिप्ट या खबर का विवरण दर्ज करें');
      return;
    }
    setIsGeneratingRawHeadlines(true);
    try {
      const raw = rawScriptText.trim();
      const res = await processNewsLocally(raw);
      const sentences = raw
        .split(/[।.\n!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      const base = (res as any)?.title || (res as any)?.headline || sentences[0] || 'बड़ा खुलासा: मुख्य समाचार';
      const cleanBase = base.replace(/^(बड़ा अपडेट:|ब्रेकिंग:|खुलासा:)\s*/, '');
      const s1 = cleanBase.length > 58 ? cleanBase.slice(0, 55) + '...' : cleanBase;
      const s2 = `बड़ा फैसला: ${s1}`;
      const s3 = sentences[1] && sentences[1].length > 8
        ? (sentences[1].length > 55 ? sentences[1].slice(0, 52) + '...' : sentences[1])
        : `विशेष रिपोर्ट: ${s1}`;
      const s4 = sentences[2] && sentences[2].length > 8
        ? (sentences[2].length > 55 ? sentences[2].slice(0, 52) + '...' : sentences[2])
        : `न्यूज़रूम बुलेटिन: ${s1}`;

      const suggestions = [s1, s2, s3, s4];
      setRawScriptSuggestions(suggestions);
      setHeadline(s1);
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
      setDuration(v.duration || 60);
      if (trimEnd === 60 || trimEnd > (v.duration || 60)) {
        setTrimEnd(Math.floor(v.duration || 60));
      }
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
      setIsPlaying(false);
      setTrimStart(0);
      setClips((prev) => {
        const newClip: VideoClipItem = {
          id: `clip-${Date.now()}`,
          name: file.name.slice(0, 24),
          url: localUrl,
          duration: 60,
          trimStart: 0,
          trimEnd: 60,
        };
        return prev.length === 0 ? [newClip] : [newClip, ...prev.slice(1)];
      });
      showToast('✅ आपका वीडियो लोड हो गया है!');
    }
  };

  const handleAddAdditionalClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      const newClip: VideoClipItem = {
        id: `clip-${Date.now()}`,
        name: file.name.slice(0, 24),
        url: localUrl,
        duration: 60,
        trimStart: 0,
        trimEnd: 60,
      };
      setClips((prev) => [...prev, newClip]);
      showToast(`✅ क्लिप ${clips.length + 1} जोड़ी गई!`);
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

      let logoImg: HTMLImageElement | null = null;
      if (activeLogoUrl) {
        try {
          logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = activeLogoUrl;
        } catch {}
      }

      drawVideoCompositionToCanvas(ctx, width, height, {
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
        showMobileNumber,
        cropRegion,
        aspect,
        zoomScale,
        offsetY,
        isExclusiveBadge,
        tickerText,
        logoScale,
        showWatermark,
        watermarkOpacity,
        watermarkText: watermarkText || profile?.channelNameHi || 'AI NEWS MAKER',
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

  // Trigger welcome reward for 1st video export from Video Studio (500 coins)
  const triggerVideoWelcomeReward = () => {
    try {
      const email = (currentUser?.email || profile?.email || '').toLowerCase().trim();
      if (!email) return;
      fetch(getApiUrl('/api/wallet/claim-welcome-reward'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rewardType: 'video' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.awarded || (data.claimed && !data.alreadyClaimed))) {
            window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
            window.dispatchEvent(new CustomEvent('ai_news_wallet_updated'));
            setTimeout(() => {
              alert('🎉 बधाई! वीडियो स्टूडियो से प्रथम वीडियो एक्सपोर्ट पर आपको 500 वेलकम बोनस कॉइन्स मिले!');
            }, 600);
          }
        })
        .catch(() => {});
    } catch {}
  };

  // Export Full Video File with Complete Composition (Parity Guarantee: Video + Frame + Audio)
  const handleDownloadVideo = async () => {
    if (isExporting) return;

    // Strict Completion Validation (Section 7: No blank or incomplete video exports)
    if (!quickVideoValidation.isValid) {
      const firstMissing = quickVideoValidation.missingItems[0]?.label || 'अधूरे फील्ड भरें';
      showToast(`❌ वीडियो डाउनलोड के लिए सभी आवश्यक चरण पूरे होना अनिवार्य है: ${firstMissing}`);
      return;
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

    let originalLoop = video.loop;

    try {
      // Ensure video metadata duration is loaded before export
      if (!video.duration || isNaN(video.duration) || video.duration === 0) {
        setVideoExportStatus('वीडियो मेटाडेटा लोड हो रहा है...');
        await new Promise<void>((resolve) => {
          if (video.duration && !isNaN(video.duration) && video.duration > 0) return resolve();
          const onMeta = () => {
            video.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          video.addEventListener('loadedmetadata', onMeta);
          setTimeout(resolve, 1200);
        });
      }

      // Check if export was cancelled during metadata load
      if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
        setIsExporting(false);
        isExportingRef.current = false;
        return;
      }

      // Prevent video from looping back to 0 during export
      originalLoop = video.loop;
      video.loop = false;

      // Full Resolution Dimensions (Section 9: Export at exact intended output dimensions)
      const width = aspect === '9:16' ? 1080 : aspect === '1:1' ? 1080 : aspect === '4:5' ? 1080 : aspect === '4:3' ? 1440 : 1080;
      const height = aspect === '9:16' ? 1920 : aspect === '1:1' ? 1080 : aspect === '4:5' ? 1350 : aspect === '4:3' ? 1080 : 1080;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('कैनवास संदर्भ उपलब्ध नहीं है');

      // Preload logo image
      let logoImg: HTMLImageElement | null = null;
      if (activeLogoUrl) {
        try {
          logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = activeLogoUrl;
          await new Promise<void>((resolve) => {
            if (logoImg!.complete && logoImg!.naturalWidth > 0) return resolve();
            logoImg!.onload = () => resolve();
            logoImg!.onerror = () => resolve();
            setTimeout(resolve, 800);
          });
        } catch {}
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

      const canvasStream = captureStreamFn.call(canvas, 30); // 30 FPS stream
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

          // 1. Video audio source (with caching)
          let mediaSource = (video as any).__audioSourceNode as MediaElementAudioSourceNode | null;
          if (!mediaSource) {
            try {
              mediaSource = audioCtx.createMediaElementSource(video);
              (video as any).__audioSourceNode = mediaSource;
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
            } catch {}
          }

          // 2. Background music source (if active)
          if (customAudioUrl || bgmTrack !== 'none') {
            try {
              if (customAudioUrl) {
                const bgmAudio = new Audio(customAudioUrl);
                bgmAudio.crossOrigin = 'anonymous';
                const bgmSource = audioCtx.createMediaElementSource(bgmAudio);
                const bgmGain = audioCtx.createGain();
                bgmGain.gain.setValueAtTime(bgmVolume / 100, audioCtx.currentTime);
                bgmSource.connect(bgmGain);
                bgmGain.connect(dest);
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
              voAudio.play().catch(() => {});
            } catch {}
          }

          const aTrack = dest.stream.getAudioTracks()[0];
          if (aTrack) {
            combinedStream = new MediaStream([...canvasStream.getVideoTracks(), aTrack]);
          }
        }
      } catch (err) {
        console.warn('Audio mixing setup fallback:', err);
      }

      let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(combinedStream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(combinedStream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const recordedType = recorder.mimeType || mimeType || 'video/webm';
          resolve(new Blob(chunks, { type: recordedType }));
        };
        recorder.onerror = (e) => reject(e);
      });

      const rawVideoDuration = (video.duration && !isNaN(video.duration) && video.duration > 0) ? video.duration : 60;
      const startTime = isReadyToUseMode ? 0 : Math.max(0, trimStart || 0);
      const rawEnd = isReadyToUseMode
        ? rawVideoDuration
        : (trimEnd > startTime ? trimEnd : rawVideoDuration);
      const endTime = Math.max(startTime + 0.5, rawEnd);
      const totalDuration = Math.max(0.5, endTime - startTime);

      // Seek to start position and wait for seeked event
      video.pause();
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener('seeked', onSeek);
          resolve();
        };
        video.addEventListener('seeked', onSeek);
        video.currentTime = startTime;
        setTimeout(resolve, 500); // 500ms safety timeout
      });

      const initialExpHeadline = (headlineScheduleMode === 'scheduled' && scheduledHeadlines.filter((h) => h.trim().length > 0).length > 1)
        ? (scheduledHeadlines.filter((h) => h.trim().length > 0)[0] || headline)
        : headline;

      // Draw initial frame before starting recorder
      drawVideoCompositionToCanvas(ctx, width, height, {
        video,
        selectedFrameId,
        headline: initialExpHeadline,
        subHeadline,
        location,
        channelTag,
        logoImg,
        websiteUrl,
        socialHandle,
        mobileNumber,
        showMobileNumber,
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
        socialPosition,
        showLocation,
        showTicker,
      });

      recorder.start(100);
      setVideoExportProgress(20);
      setVideoExportStatus('वीडियो फ्रेम व जैकेट रेंडर हो रहे हैं...');

      // Attempt to play with audio; fallback to muted if browser autoplay blocks
      video.muted = false;
      try {
        await video.play();
      } catch {
        video.muted = true;
        try { await video.play(); } catch {}
      }

      const exportStartWallTime = Date.now();
      let lastVideoCurrentTime = video.currentTime;
      let lastProgressWallTime = Date.now();
      let maxReportedPct = 20;
      let hasEnded = false;

      // Deterministic Loop with Active Nudging Watchdog
      await new Promise<void>((resolve) => {
        let animId: number;

        const stopAndFinish = () => {
          if (hasEnded) return;
          hasEnded = true;
          cancelAnimationFrame(animId);
          try {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          } catch {}
          try {
            video.pause();
          } catch {}
          resolve();
        };

        const renderFrame = () => {
          if (hasEnded) return;

          // Immediate Cancellation Check (Section 10)
          if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
            stopAndFinish();
            return;
          }

          const currentExpH = (headlineScheduleMode === 'scheduled' && scheduledHeadlines.filter((h) => h.trim().length > 0).length > 1)
            ? (scheduledHeadlines.filter((h) => h.trim().length > 0)[Math.floor(video.currentTime / headlineInterval) % scheduledHeadlines.filter((h) => h.trim().length > 0).length] || headline)
            : headline;

          // Draw composited frame with active jacket
          drawVideoCompositionToCanvas(ctx, width, height, {
            video,
            selectedFrameId,
            headline: currentExpH,
            subHeadline,
            location,
            channelTag,
            logoImg,
            websiteUrl,
            socialHandle,
            mobileNumber,
            showMobileNumber,
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
            socialPosition,
            showLocation,
            showTicker,
          });

          // Watchdog: detect stall and nudge video forward
          const now = Date.now();
          if (video.currentTime !== lastVideoCurrentTime) {
            lastVideoCurrentTime = video.currentTime;
            lastProgressWallTime = now;
          } else if (now - lastProgressWallTime > 350) {
            // Nudge forward so playback NEVER freezes
            if (video.paused && !video.ended) {
              video.play().catch(() => {});
            }
            video.currentTime = Math.min(endTime, video.currentTime + 0.1);
            lastProgressWallTime = now;
          }

          // Progress calculation: 20% to 95% (strictly monotonic)
          const elapsed = Math.max(0, video.currentTime - startTime);
          const timePct = Math.min(95, Math.max(20, Math.round(20 + (elapsed / totalDuration) * 75)));
          const wallElapsed = Math.max(0, (now - exportStartWallTime) / 1000);
          const wallPct = Math.min(95, Math.max(20, Math.round(20 + (wallElapsed / totalDuration) * 75)));
          maxReportedPct = Math.max(maxReportedPct, Math.max(timePct, wallPct));
          setVideoExportProgress(maxReportedPct);

          const isTimeComplete = video.currentTime >= (endTime - 0.08) || video.ended;
          const isHardTimeout = (now - exportStartWallTime) >= ((totalDuration + 1.2) * 1000);

          if (isTimeComplete || isHardTimeout) {
            stopAndFinish();
            return;
          }

          animId = requestAnimationFrame(renderFrame);
        };

        animId = requestAnimationFrame(renderFrame);
      });

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

      const rawBlob = await recordingPromise;

      if (cancelExportRef.current || activeExportIdRef.current !== currentExportId) {
        setIsExporting(false);
        isExportingRef.current = false;
        setVideoExportStatus('');
        setVideoExportProgress(0);
        return;
      }

      if (!rawBlob || rawBlob.size < 1024) {
        throw new Error('रेंडरिंग फ़ाइल शून्य या बहुत छोटी प्राप्त हुई। स्नैपशॉट मोड पर स्विच किया जा रहा है।');
      }

      // Fix WebM duration header so Mobile Chrome & Android players display exact duration
      const finalBlob = await injectWebmDuration(rawBlob, totalDuration * 1000);

      setVideoExportProgress(100);
      setVideoExportStatus('सफलतापूर्वक डाउनलोड!');
      setIsProjectCompleted(true);

      const isMp4 = finalBlob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const filename = generateVideoDownloadFileName(ext);
      const downloadUrl = URL.createObjectURL(finalBlob);
      setCompletedDownloadUrl(downloadUrl);
      setCompletedDownloadFilename(filename);

      if ((window as any).AndroidBridge?.downloadVideo) {
        (window as any).AndroidBridge.downloadVideo(downloadUrl, filename);
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }, 60000);
      }

      showToast(`✅ ${ext.toUpperCase()} वीडियो पूरी न्यूज़ जैकेट के साथ डाउनलोड हुआ (${Math.round(totalDuration)}s)!`);
      triggerVideoWelcomeReward();
    } catch (err: any) {
      console.error('Video download error:', err);
      try {
        handleDownloadSnapshot();
        showToast('⚠️ वीडियो रिकॉर्डिंग में समस्या, उच्च-गुणवत्ता फ्रेम स्नैपशॉट डाउनलोड किया गया');
      } catch {
        setVideoExportError(err?.message || 'वीडियो डाउनलोड करने में समस्या आई');
        showToast('❌ वीडियो डाउनलोड में समस्या आई');
      }
    } finally {
      try {
        video.loop = originalLoop;
      } catch {}
      isExportingRef.current = false;
      setTimeout(() => {
        setIsExporting(false);
        setVideoExportStatus('');
        setVideoExportProgress(0);
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

  return (
    <div className="w-full max-w-full overflow-x-clip flex flex-col gap-4 pb-24 text-slate-900">
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

      <div className="w-full flex flex-col lg:flex-row items-start gap-4 sm:gap-6">
        {/* LEFT COLUMN (42%): Live Video Canvas with Sticky Jacket Overlay */}
        <aside className="w-full lg:w-[42%] lg:sticky lg:top-4 z-20 flex flex-col gap-3 self-start">
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

                {/* Adjacent Draft Button (Section 5) */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-2 py-0.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-600/50 flex items-center gap-1 cursor-pointer transition active:scale-95"
                  title="ड्राफ्ट सेव करें"
                >
                  <Save className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">ड्राफ्ट</span>
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
                      <div className="flex items-center gap-1 text-[10px] font-black text-neutral-950 truncate max-w-[120px]">
                        <Globe className="w-3 h-3 text-neutral-950 shrink-0" />
                        <span className="truncate">{websiteUrl || 'ainewsmaker.online'}</span>
                      </div>
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
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      playsInline
                      loop
                      muted={isMuted}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                      style={{
                        objectPosition: cropRegion ? `center ${cropRegion.y * 100}%` : `center ${Math.min(100, Math.max(0, 50 + offsetY))}%`,
                        transform: `scale(${zoomScale})`,
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
                      <div className="flex items-center gap-1 text-[10px] font-black text-neutral-950 truncate max-w-[120px]">
                        <Globe className="w-3 h-3 text-neutral-950 shrink-0" />
                        <span className="truncate">{websiteUrl || 'ainewsmaker.online'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedFrameId === 'frame-custom-full-9-16' ? (
                // ==========================================
                // FRAME 2: Full 9:16 Video Visibility
                // ==========================================
                <div className="relative w-full h-full overflow-hidden bg-black select-none">
                  {/* Full-Bleed Video in Background */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    loop
                    muted={isMuted}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                    style={{
                      transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
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
              ) : (
                // ==========================================
                // FRAME 3: Classic Broadcast Lower-Third
                // ==========================================
                <>
                  {/* The Video Element */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    loop
                    muted={isMuted}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                    style={{
                      transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
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
                      <span>•</span>
                      <span className="font-bold text-neutral-300 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5 text-amber-400" />
                        {websiteUrl}
                      </span>
                      {showMobileNumber && mobileNumber && (
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

              {/* Live Watermark Overlay (Part 11) */}
              {showWatermark && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center select-none"
                  style={{ opacity: watermarkOpacity }}
                >
                  <span className="text-white text-sm sm:text-lg font-black uppercase tracking-widest border border-white/30 px-3 py-1 rounded bg-black/20 backdrop-blur-2xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    {watermarkText || profile?.channelNameHi || 'AI NEWS MAKER'}
                  </span>
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
                    className="bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 h-full transition-all duration-300"
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
                  onClick={handleDownloadVideo}
                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg text-[10px] shrink-0 ml-2 cursor-pointer"
                >
                  पुनः प्रयास करें
                </button>
              </div>
            )}

            {/* Web-Only Action Buttons Underneath Preview (Section 8: Strictly disabled until 100% completion) */}
            {!isMobile && (
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

                <div className="grid grid-cols-2 gap-2 w-full">
                  {/* Download Video Button */}
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    disabled={isExporting || !quickVideoValidation.isValid}
                    className={`py-2.5 px-2 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all ${
                      quickVideoValidation.isValid && !isExporting
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white cursor-pointer active:scale-95'
                        : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    }`}
                    title={quickVideoValidation.isValid ? 'वीडियो डाउनलोड करें' : 'डाउनलोड के लिए सभी आवश्यक चरण पूरे करें'}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="truncate">{isExporting ? 'रेंडरिंग जारी...' : 'वीडियो डाउनलोड'}</span>
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
                <a
                  href={completedDownloadUrl}
                  download={completedDownloadFilename || 'news_video.mp4'}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>यहाँ क्लिक करके वीडियो डाउनलोड करें</span>
                </a>
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

        {/* RIGHT COLUMN (58%): Video Controls & Overlay Customization Form */}
        <section className="w-full lg:w-[58%] flex flex-col gap-4 min-w-0">
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

          {/* ============================================================ */}
          {/* TOP BAR: MODE SWITCHER & PRIMARY RATIO SELECTOR             */}
          {/* Available on both Mobile & Desktop (Part D.6, E.7, F.13)     */}
          {/* ============================================================ */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-neutral-900 border-2 border-amber-500/60 rounded-2xl p-3 sm:p-5 space-y-3.5 shadow-xl mb-4">
            {/* Row 1: Mode Switcher (Web only, hidden on Mobile per Section 1) */}
            {!isMobile && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
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
                      showToast('🎬 स्टूडियो मोड (Studio Mode) सक्रिय');
                    }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isReadyToUseMode
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>🎬 Studio Mode</span>
                  </button>
                </div>
              </div>
            )}

            {/* Row 2: Aspect Ratio Selector (Section 3: Single horizontal row: 9:16, 1:1, 4:5, 4:3) */}
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
                <div className="p-2.5 bg-slate-950 border border-amber-500/40 rounded-xl flex items-center justify-between">
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
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">{r.label}</div>
                      <div className="text-[9px] opacity-80 truncate">{r.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 3: Frame Selection (Section 4: Placed immediately after Aspect Ratio selector) */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSel
                          ? 'bg-amber-400/20 border-amber-400 text-white ring-2 ring-amber-400/60 shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-lg p-1 bg-slate-900 rounded-lg shrink-0">
                        {f.id === 'frame-custom-3line-4-5' ? '📰' : f.id === 'frame-custom-full-9-16' ? '📱' : '📺'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-amber-300 flex items-center justify-between">
                          <span className="truncate">{f.nameHi}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
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

          {/* ============================================================ */}
          {/* WORKFLOW DISPATCH: Quick Video Mode vs Studio Mode           */}
          {/* ============================================================ */}
          {isReadyToUseMode ? (
            /* ============================================================ */
            /* UNIFIED QUICK VIDEO WORKFLOW (Web & Mobile - 5 Steps + Final) */
            /* ============================================================ */
            <div className="w-full flex flex-col gap-3 sm:gap-4">
              {/* Stepper Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>त्वरित वीडियो निर्माण (चरण {quickStep}/6)</span>
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

                {/* Horizontal Step Navigation Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                  {[
                    { step: 1, label: '1. वीडियो', icon: Film, ok: quickVideoValidation.stepsStatus[1] },
                    { step: 2, label: '2. ऑडियो', icon: Music, ok: quickVideoValidation.stepsStatus[2] },
                    { step: 3, label: '3. हेडलाइन', icon: Type, ok: quickVideoValidation.stepsStatus[3] },
                    { step: 4, label: '4. लोकेशन', icon: MapPin, ok: quickVideoValidation.stepsStatus[4] },
                    { step: 5, label: '5. फ़ूटर व ब्रांड', icon: Tag, ok: quickVideoValidation.stepsStatus[5] },
                    { step: 6, label: '6. डाउनलोड', icon: Download, ok: quickVideoValidation.isValid },
                  ].map((s) => {
                    const isActive = quickStep === s.step;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setQuickStep(s.step)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white font-black shadow-md'
                            : s.ok
                            ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                            : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{s.label}</span>
                        {s.ok && !isActive && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================ */}
              {/* STEP 1: ADD VIDEO (Max 3 clips, trim, zoom, vertical offset) */}
              {/* ============================================================ */}
              {quickStep === 1 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" />
                      1. वीडियो जोड़ें व ट्रिम (Add Video & Clips)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      क्लिप्स: {clips.length}/3
                    </span>
                  </div>

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
                      <span className="text-[11px] font-bold text-slate-400">सक्रिय क्लिप चुनें (Active Clip):</span>
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
                          <span>क्लिप {activeClipIndex + 1} ट्रिमिंग (Trimming):</span>
                        </span>
                        <span className="font-mono text-amber-400">
                          {Math.max(0, Math.round(trimEnd - trimStart))}s (स्टार्ट: {Math.round(trimStart)}s, अंत: {Math.round(trimEnd)}s)
                        </span>
                      </div>

                      {/* Quick Duration Preset Cuts */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">त्वरित अवधि:</span>
                        {[
                          { label: '15s', sec: 15 },
                          { label: '30s', sec: 30 },
                          { label: '60s', sec: 60 },
                          { label: 'पूरी क्लिप', sec: Math.max(15, Math.floor(duration || 60)) },
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
                              <span>ज़ूम (Zoom Scale):</span>
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
                              <span>ऊर्ध्वाधर स्थिति (Vertical Position):</span>
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
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: MUSIC AND AUDIO (Original, Background, No Music)      */}
              {/* ============================================================ */}
              {quickStep === 2 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Music className="w-4 h-4 text-amber-400" />
                      2. संगीत व ऑडियो (Music & Audio)
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
              {/* STEP 3: HEADLINE (Strictly blank initial state, AI tools)    */}
              {/* ============================================================ */}
              {quickStep === 3 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-400" />
                      3. मुख्य हेडलाइन (Main News Headline)
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                      आवश्यक (Required)
                    </span>
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

                  {/* AI Rewrite Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400">AI सहायता:</span>
                    <button
                      type="button"
                      disabled={isAiGenerating || !headline.trim()}
                      onClick={async () => {
                        setIsAiGenerating(true);
                        try {
                          await handleGenerateAiHeadline(2);
                        } finally {
                          setIsAiGenerating(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 disabled:opacity-40 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isAiGenerating ? 'AI लिख रहा है...' : '⚡ 2-लाइन AI रीराइट'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isAiGenerating || !headline.trim()}
                      onClick={async () => {
                        setIsAiGenerating(true);
                        try {
                          await handleGenerateAiHeadline(3);
                        } finally {
                          setIsAiGenerating(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 disabled:opacity-40 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚡ 3-लाइन AI रीराइट</span>
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
              {/* STEP 4: LOCATION (Strictly blank initial state, no dummy text)*/}
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

                  <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400">त्वरित लोकेशन सुझाव (वैकल्पिक):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['नई दिल्ली', 'लखनऊ', 'भोपाल', 'पटना', 'जयपुर', 'मुंबई', 'चंडीगढ़', 'रायपुर'].map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setLocation(city)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 5: FOOTER & BRANDING (Socials, Logo, Watermark vertical) */}
              {/* ============================================================ */}
              {quickStep === 5 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-400" />
                      5. फ़ूटर, लोगो व वॉटरमार्क (Footer & Branding)
                    </span>
                  </div>

                  {/* Frame Footer Awareness */}
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">फ़्रेम फ़ूटर प्रकार:</span>
                    <span className="font-bold text-amber-300">
                      {selectedFrameId.includes('custom') ? 'मानक स्थिर फ़ूटर (Fixed Standard)' : 'एडजस्टेबल फ़ूटर'}
                    </span>
                  </div>

                  {/* Social Handles with Graphic Photo Studio Icons */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300">सोशल मीडिया व संपर्क जानकारी:</span>

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
                  </div>

                  {/* Logo Controls (Section 12: Uses profile logo, scale, task GIF fallback) */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
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

                  {/* Watermark Controls with Vertical Offset Control (Section 13) */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">वॉटरमार्क (Watermark):</span>
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

                    {showWatermark && (
                      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Opacity Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                              <span>पारदर्शिता (Opacity):</span>
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

                          {/* Vertical Movement Slider (Section 13) */}
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

                        <span className="text-[10px] text-slate-400 block">
                          टेक्स्ट: <strong className="text-amber-300">{watermarkText || 'चैनल नाम'}</strong> (क्षैतिज स्थिति फ़्रेम के अनुसार सुरक्षित रहती है)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 6 / FINAL STEP: DOWNLOAD VIDEO & CAPTION (100% Validated)*/}
              {/* ============================================================ */}
              {quickStep === 6 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Download className="w-4 h-4 text-amber-400" />
                      6. वीडियो डाउनलोड व कैप्शन (Download & Caption)
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        quickVideoValidation.completionPercentage === 100
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {quickVideoValidation.completionPercentage}% पूर्ण
                    </span>
                  </div>

                  {/* Completion Status Checklist */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">
                      आवश्यक चेकलिस्ट (Strict 100% Validation):
                    </span>

                    <div className="space-y-1.5 text-xs">
                      {[
                        { key: 'video', label: '1. वीडियो क्लिप जोड़ी गई', ok: Boolean((videoUrl && videoUrl.trim()) || clips.length > 0), step: 1 },
                        { key: 'aspect', label: '2. आस्पेक्ट रेशियो चयनित', ok: Boolean(aspect), step: 1 },
                        { key: 'frame', label: '3. कंपैटिबल फ़्रेम चयनित', ok: Boolean(selectedFrameId), step: 1 },
                        { key: 'audio', label: '4. ऑडियो / म्यूज़िक विकल्प तय', ok: Boolean(audioOption), step: 2 },
                        { key: 'headline', label: '5. मुख्य हेडलाइन दर्ज (Headline)', ok: Boolean(headline && headline.trim()), step: 3 },
                        { key: 'location', label: '6. खबर की लोकेशन दर्ज (Location)', ok: Boolean(location && location.trim()), step: 4 },
                        { key: 'footer', label: '7. सोशल/फ़ूटर जानकारी उपलब्ध', ok: Boolean((socialHandle && socialHandle.trim()) || (channelTag && channelTag.trim()) || (mobileNumber && mobileNumber.trim())), step: 5 },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                          <span className="flex items-center gap-2">
                            {item.ok ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span className={item.ok ? 'text-slate-300' : 'text-red-300 font-bold'}>
                              {item.label}
                            </span>
                          </span>

                          {!item.ok && (
                            <button
                              type="button"
                              onClick={() => setQuickStep(item.step)}
                              className="text-[10px] bg-red-950 text-red-300 hover:text-white px-2 py-0.5 rounded border border-red-800 font-bold cursor-pointer"
                            >
                              चरण {item.step} पर जाएँ →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

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

                  {/* Download Video Button (Strictly Disabled until 100% complete) */}
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    disabled={!quickVideoValidation.isValid || isExporting}
                    className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 ${
                      quickVideoValidation.isValid && !isExporting
                        ? 'bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isExporting
                        ? 'वीडियो रेंडर हो रहा है...'
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
                          className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300"
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

                  {/* Completed Download Card */}
                  {completedDownloadUrl && (
                    <div className="p-3.5 bg-emerald-950/80 border border-emerald-500 rounded-xl space-y-2.5">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>वीडियो सफलतापूर्वक रेंडर हो गया है!</span>
                      </div>
                      <a
                        href={completedDownloadUrl}
                        download={completedDownloadFilename || 'breaking_news_video.mp4'}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow cursor-pointer transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>सीधे वीडियो फाइल सेव करें</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Stepper Navigation Footer (Prev / Next Buttons) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQuickStep((s) => Math.max(1, s - 1))}
                  disabled={quickStep === 1}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer hover:bg-slate-700 transition"
                >
                  ◀ पिछला चरण
                </button>

                <button
                  type="button"
                  onClick={() => setQuickStep((s) => Math.min(6, s + 1))}
                  disabled={quickStep === 6}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white disabled:opacity-30 cursor-pointer shadow hover:from-red-500 hover:to-amber-400 transition"
                >
                  अगला चरण ▶
                </button>
              </div>
            </div>
          ) : (
                /* WORKFLOW 2: STUDIO MODE (!isReadyToUseMode)                 */
                /* ============================================================ */
                <div className="space-y-4">
                  {/* Card 1: Multi-Clip Video Timeline Manager */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        1. वीडियो टाइमलाइन व क्लिप्स (Multi-Clip Timeline)
                      </span>
                      <button
                        type="button"
                        onClick={() => additionalClipInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ क्लिप जोड़ें (Add Clip)</span>
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

                  {/* Card 2: Select Jacket / Frame */}
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

                  {/* Card 3: Headlines & Timeline Scheduling (Single vs 10s/15s Interval) */}
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

                  {/* Card 4: Multi-Track Audio Mixing Studio (BGM + Voiceover + Video) */}
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

                  {/* Card 5: Video Transitions & Motion FX */}
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

                  {/* Card 6: Location - Dedicated Independent Box */}
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
                        8. चैनल लोगो व वॉटरमार्क (Logo & Watermark)
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
                </div>
              )}
        </section>
      </div>

      {/* Caption Modal Dialog */}
      {isCaptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
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
    </div>
  );
};
