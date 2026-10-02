import html2canvas from 'html2canvas';
import { NewsCardData, TextBreakingBadgeStyle } from '../types';
import { getActiveFooterPng } from './footerUtils';
import { getActiveHeaderPng } from './headerUtils';
import { getEffectiveSpeaker, cleanHeadlineText } from './speakerUtils';
import { getFormattedHindiDate } from './dateUtils';
import { shouldShowAppWatermark } from './userPlanManager';
import {
  drawOriginalHeader,
  drawBreakingRedHeader,
  drawInvestigationHeader,
  drawQuoteHeader,
} from './HeaderDesigns';

// Polyfill CanvasRenderingContext2D.prototype.roundRect for all browsers and Android WebViews
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | number[]
  ) {
    if (!radii) radii = 0;
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;
    if (typeof radii === 'number') {
      r1 = r2 = r3 = r4 = radii;
    } else if (Array.isArray(radii)) {
      if (radii.length === 1) {
        r1 = r2 = r3 = r4 = radii[0];
      } else if (radii.length === 2) {
        r1 = r3 = radii[0];
        r2 = r4 = radii[1];
      } else if (radii.length === 4) {
        [r1, r2, r3, r4] = radii;
      }
    }
    r1 = Math.min(r1, Math.abs(w) / 2, Math.abs(h) / 2);
    r2 = Math.min(r2, Math.abs(w) / 2, Math.abs(h) / 2);
    r3 = Math.min(r3, Math.abs(w) / 2, Math.abs(h) / 2);
    r4 = Math.min(r4, Math.abs(w) / 2, Math.abs(h) / 2);

    this.beginPath();
    this.moveTo(x + r1, y);
    this.arcTo(x + w, y, x + w, y + h, r2);
    this.arcTo(x + w, y + h, x, y + h, r3);
    this.arcTo(x, y + h, x, y, r4);
    this.arcTo(x, y, x + w, y, r1);
    this.closePath();
    return this;
  };
}

/**
 * High-resolution canvas renderer for News Graphic Cards (1080x1350 4:5 or 1080x1080 1:1)
 */
export const loadImage = async (src: string): Promise<HTMLImageElement> => {
  if (!src || !src.trim()) {
    const fallback = new Image();
    fallback.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%231e293b"><rect width="800" height="600"/></svg>';
    await new Promise((r) => { fallback.onload = r; fallback.onerror = r; });
    return fallback;
  }

  let effectiveSrc = src.trim();

  // If source is a remote HTTP/HTTPS URL, convert it to a same-origin Blob URL or proxy to guarantee the canvas is NEVER tainted
  if (
    typeof window !== 'undefined' &&
    (effectiveSrc.startsWith('http://') || effectiveSrc.startsWith('https://')) &&
    !effectiveSrc.startsWith('blob:') &&
    !effectiveSrc.startsWith('data:')
  ) {
    try {
      // 1. Try direct fetch with cors
      const directRes = await fetch(effectiveSrc, { mode: 'cors' }).catch(() => null);
      if (directRes && directRes.ok) {
        const b = await directRes.blob();
        effectiveSrc = URL.createObjectURL(b);
      } else {
        // 2. Fall back to backend image proxy
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(effectiveSrc)}`;
        const proxyRes = await fetch(proxiedUrl).catch(() => null);
        if (proxyRes && proxyRes.ok) {
          const b = await proxyRes.blob();
          effectiveSrc = URL.createObjectURL(b);
        }
      }
    } catch {
      // If fetching fails, continue with original src and crossOrigin='anonymous'
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!effectiveSrc.startsWith('data:') && !effectiveSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    let settled = false;
    const finish = (result: HTMLImageElement) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const timeout = setTimeout(() => {
      const fallback = new Image();
      fallback.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%231e293b"><rect width="800" height="600"/></svg>';
      fallback.onload = () => finish(fallback);
      fallback.onerror = () => finish(fallback);
    }, 4500);

    img.onload = () => {
      clearTimeout(timeout);
      finish(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      const fallback = new Image();
      fallback.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%231e293b"><rect width="800" height="600"/></svg>';
      fallback.onload = () => finish(fallback);
      fallback.onerror = () => finish(fallback);
    };
    img.src = effectiveSrc;
  });
};

// Professional Breaking News Curved Red Pointer Arrow SVG
const DEFAULT_3D_ARROW_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="arrowBodyRed" x1="10%" y1="90%" x2="80%" y2="20%">
      <stop offset="0%" stop-color="#C00000" />
      <stop offset="45%" stop-color="#E50914" />
      <stop offset="100%" stop-color="#FF1E26" />
    </linearGradient>
    <linearGradient id="arrowSpineGloss" x1="10%" y1="90%" x2="60%" y2="30%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.1" />
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <!-- 1. Heavy Black Base Silhouette -->
  <path d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z" fill="#000000" stroke="#000000" stroke-width="22" stroke-linejoin="round" stroke-linecap="round" />
  <!-- 2. Bold White Border (Sticker effect) -->
  <path d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" />
  <!-- 3. Vibrant Red Body -->
  <path d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z" fill="url(#arrowBodyRed)" stroke="#990000" stroke-width="3" stroke-linejoin="round" />
  <!-- 4. Glossy Highlight along Curved Spine -->
  <path d="M 85 300 Q 128 170 230 118" stroke="url(#arrowSpineGloss)" stroke-width="6" stroke-linecap="round" fill="none" />
  <!-- 5. Central Ridge Highlight on Arrowhead -->
  <line x1="240" y1="125" x2="312" y2="66" stroke="rgba(255, 255, 255, 0.85)" stroke-width="4" stroke-linecap="round" />
  <!-- 6. Wing Accent -->
  <line x1="202" y1="108" x2="236" y2="110" stroke="rgba(255, 255, 255, 0.6)" stroke-width="2.5" stroke-linecap="round" />
</svg>`)}`;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof (ctx as any).roundRect === 'function') {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export async function renderCardToCanvas(card: NewsCardData): Promise<HTMLCanvasElement> {
  const selectedFontFamily = card.headlineFontFamily || 'Baloo 2';

  // Ensure selected font, Baloo 2, Devanagari, and Arial fonts are fully ready before measuring or drawing
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
      if (selectedFontFamily !== 'Baloo 2') {
        await document.fonts.load(`800 48px "${selectedFontFamily}"`);
        await document.fonts.load(`800 64px "${selectedFontFamily}"`);
      }
      await document.fonts.load('800 48px "Baloo 2"');
      await document.fonts.load('800 64px "Baloo 2"');
      await document.fonts.load('700 24px "Baloo 2"');
      await document.fonts.load('900 34px Arial');
      await document.fonts.load('800 48px "Noto Sans Devanagari"');
    } catch (e) {
      // Continue if browser does not support font loading API
    }
  }

  const canvas = document.createElement('canvas');
  const width = 1080;
  let height = 1350; // 4:5 Instagram Portrait by default
  if (card.aspectRatio === '1:1') height = 1080;
  if (card.aspectRatio === '9:16') height = 1920;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // Background fallback
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  const footerBarHeight = 78;
  const isSuperBreaking = card.frameDesign === 'jacket-breaking-red';
  const isQuote = card.frameDesign === 'jacket-quote';

  // 0. Pre-calculate Headline Lines in selected font early so we know the exact dimensions
  // For quote template, side margin is 90px (width - 180). For standard templates, 48px (width - 96).
  const maxHeadlineWidth = isQuote ? width - 180 : width - 96;
  const scaleRatio = 2.15; // Maps ~30px editor font to ~65px canvas
  let targetFontSize = Math.round((card.headlineFontSize || 20) * scaleRatio);
  targetFontSize = Math.max(isQuote ? 44 : 52, Math.min(isQuote ? 64 : 80, targetFontSize));

  ctx.save();
  const rawHeadline = cleanHeadlineText(card.formattedHeadline || card.headline || '');
  const manualLines = rawHeadline.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (manualLines.length >= 2) {
    for (let s = targetFontSize; s >= 36; s -= 2) {
      ctx.font = `800 ${s}px "${selectedFontFamily}", "Noto Sans Devanagari", sans-serif`;
      const allFit = manualLines.every((m) => {
        const cleanText = m.replace(/\[yellow\]/g, '').replace(/\[\/yellow\]/g, '');
        return ctx.measureText(cleanText).width <= maxHeadlineWidth;
      });
      if (allFit) {
        targetFontSize = s;
        break;
      }
    }
  } else {
    // Auto-fit headline font size dynamically so entire headline fits cleanly in 3 lines without ellipsis
    for (let s = targetFontSize; s >= 36; s -= 2) {
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineWidth, s, 0);
      if (testLines.length <= 3 || s <= 38) {
        targetFontSize = s;
        break;
      }
    }
  }

  // For Quote Template: Auto-fit headline font size so the entire block fits cleanly in lower 50%
  if (isQuote) {
    const quoteAreaAvailableH = height - footerBarHeight - Math.round(height * 0.50);
    for (let s = targetFontSize; s >= 36; s -= 2) {
      const testLineH = Math.round(s * 1.34);
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineWidth, s);
      const testH = testLines.length * testLineH;
      // 42 (top badge) + 18 (gap) + testH + 18 (gap) + 42 (bottom badge) + 24 (gap) + 42 (speaker) = total
      const totalBlockH = 42 + 18 + testH + 18 + 42 + 24 + 42;
      if (totalBlockH <= quoteAreaAvailableH - 36 || s <= 38) {
        targetFontSize = s;
        break;
      }
    }
  }
  ctx.restore();

  const headlineFontSize = targetFontSize;
  const headlineLineHeight = Math.round(headlineFontSize * 1.34);
  const headlineLines = getHeadlineLines(
    ctx,
    card.formattedHeadline || card.headline,
    card.highlightWords,
    maxHeadlineWidth,
    headlineFontSize
  );
  const totalHeadlineHeight = headlineLines.length * headlineLineHeight;

  // Standard headline positions
  const headlineBottomY = height - footerBarHeight - 22;
  const headlineStartY = headlineBottomY - totalHeadlineHeight;

  // For Super Breaking (jacket-breaking-red):
  // Headline is positioned close to the yellow footer (10px bottom gap), exactly removing unwanted empty space.
  // The white box and ribbon are positioned with clean breathing room above the headline, ensuring words never touch the ribbon.
  const showBreakingRibbon = card.showBreakingRibbon !== false;
  const ribbonW = Math.round(width * 0.70);
  const ribbonH = Math.round(ribbonW * (150 / 960));
  const ribbonHangInsideWhiteBox = Math.round(ribbonH * 0.46);
  const headlineBottomPaddingAboveFooter = 10;
  const superBreakingHeadlineTextY = (height - footerBarHeight - headlineBottomPaddingAboveFooter) - totalHeadlineHeight;
  const gapAboveHeadlineToRibbon = 44;
  const whiteBoxY = showBreakingRibbon
    ? superBreakingHeadlineTextY - gapAboveHeadlineToRibbon - ribbonHangInsideWhiteBox
    : superBreakingHeadlineTextY - 24;
  const whiteBoxH = (height - footerBarHeight) - whiteBoxY;
  const superBreakingRibbonY = whiteBoxY - Math.round(ribbonH * 0.5);

  // Photo bottom boundaries:
  // 1. Super Breaking: stops at top of white box (whiteBoxY), giving more space to the photo
  // 2. Quote (बयान): 54% photo height, leaving lower 46% for quote, speaker & footer without any dead black void
  // 3. Default Breaking News Wala & standard: stops below the middle line of the 3-line text, never touching the footer!
  const photoBottomY = isSuperBreaking
    ? whiteBoxY
    : isQuote
    ? Math.round(height * 0.52)
    : Math.round(headlineStartY + headlineLineHeight * 1.35);

  // Load custom logo image if provided
  let customLogoImg: HTMLImageElement | undefined;
  if (card.customLogoUrl) {
    try {
      customLogoImg = await loadImage(card.customLogoUrl);
    } catch (logoErr) {
      console.warn('Custom logo load warning:', logoErr);
    }
  }

  // 1. Draw Images or Geometric Background
  if (card.frameDesign === 'graphic_001') {
    await drawGraphic001Canvas(ctx, width, height, card, customLogoImg);
    return canvas;
  }
  if (card.frameDesign === 'graphic_002') {
    await drawGraphic002Canvas(ctx, width, height, card, customLogoImg);
    return canvas;
  }
  if (card.frameDesign === 'graphic_003') {
    await drawGraphic003Canvas(ctx, width, height, card, customLogoImg);
    return canvas;
  }
  if (card.frameDesign === 'graphic_004') {
    await drawGraphic004Canvas(ctx, width, height, card, customLogoImg);
    return canvas;
  }
  if (card.frameDesign === 'jacket-default') {
    // Default Frame: Clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (card.frameDesign === 'jacket-morning') {
    await drawMorningJacketBackground(
      ctx,
      width,
      height,
      card.morningBgStyle,
      card.morningCustomBgUrl || card.images.main
    );
  } else if (card.frameDesign === 'jacket-epaper') {
    // E-Paper Jacket: Pure crisp white background between header and footer
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (card.frameDesign === 'jacket-text-breaking') {
    await drawGeometricTextBackground(ctx, width, height, card.textBreakingBgStyle, card.textBreakingCustomBgUrl);
  } else {
  try {
    const photoToLoad = (card.images?.main && card.images.main.trim().length > 0)
      ? card.images.main
      : '/assets/placeholder_news_photo.svg';
    const mainImg = await loadImage(photoToLoad);

    // Read crop settings (defaults to Center: X=50%, Y=50%, Zoom=1)
    const mainCrop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
    const secondCrop = card.imagePositions?.second || { x: 50, y: 50, zoom: 1 };
    const thirdCrop = card.imagePositions?.third || { x: 50, y: 50, zoom: 1 };
    const fourthCrop = card.imagePositions?.fourth || { x: 50, y: 50, zoom: 1 };

    const mCropX = (mainCrop.x ?? 50) / 100;
    const mCropY = (mainCrop.y ?? 50) / 100;
    const mZoom = Math.max(1, mainCrop.zoom || 1);

    const sCropX = (secondCrop.x ?? 50) / 100;
    const sCropY = (secondCrop.y ?? 50) / 100;
    const sZoom = Math.max(1, secondCrop.zoom || 1);

    const tCropX = (thirdCrop.x ?? 50) / 100;
    const tCropY = (thirdCrop.y ?? 50) / 100;
    const tZoom = Math.max(1, thirdCrop.zoom || 1);

    const foCropX = (fourthCrop.x ?? 50) / 100;
    const foCropY = (fourthCrop.y ?? 50) / 100;
    const foZoom = Math.max(1, fourthCrop.zoom || 1);

    const canvasFilterStr = getCanvasFilterString(card.imageFilters);

    if (isQuote) {
      // Quote (बयान) Jacket: Strictly single image restricted to top 50%
      drawImageCover(ctx, mainImg, 0, 0, width, photoBottomY, mCropX, mCropY, mZoom, canvasFilterStr);
    } else if (card.layout === 'full' && !isSuperBreaking) {
      // Full bleed edge-to-edge image across entire card
      drawImageCover(ctx, mainImg, 0, 0, width, height, mCropX, mCropY, mZoom, canvasFilterStr);
    } else if (
      card.layout === 'single' ||
      !card.layout ||
      card.layout === 'inset-circle' ||
      (card.layout === 'full' && isSuperBreaking)
    ) {
      // Single Image / Constrained photo: stops at photoBottomY
      drawImageCover(ctx, mainImg, 0, 0, width, photoBottomY, mCropX, mCropY, mZoom, canvasFilterStr);
    } else if (card.layout === 'split-v') {
      // 2 images: 35% Top, 65% Bottom (35-65 ratio as requested)
      const topH = photoBottomY * 0.35;
      const bottomH = photoBottomY * 0.65;
      drawImageCover(ctx, mainImg, 0, 0, width, topH - 2, mCropX, mCropY, mZoom, canvasFilterStr);

      // Clean white divider line
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, topH - 2, width, 4);

      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, 0, topH + 2, width, bottomH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, 0, topH + 2, width, bottomH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      }
    } else if (card.layout === 'double') {
      // 2 images: 50-50 Up & Down (50% आधी ऊपर, 50% आधी नीचे)
      const topH = photoBottomY * 0.50;
      const bottomH = photoBottomY * 0.50;
      drawImageCover(ctx, mainImg, 0, 0, width, topH - 2, mCropX, mCropY, mZoom, canvasFilterStr);

      // Clean white divider line
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, topH - 2, width, 4);

      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, 0, topH + 2, width, bottomH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, 0, topH + 2, width, bottomH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      }
    } else if (card.layout === 'double-h' || card.layout === 'split-h') {
      // 2 horizontal columns side by side (लेफ्ट-राइट)
      const halfW = width / 2;
      drawImageCover(ctx, mainImg, 0, 0, halfW - 2, photoBottomY, mCropX, mCropY, mZoom, canvasFilterStr);
      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, halfW + 2, 0, halfW - 2, photoBottomY, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, halfW + 2, 0, halfW - 2, photoBottomY, sCropX, sCropY, sZoom, canvasFilterStr);
      }
    } else if (card.layout === 'grid-3') {
      // 3 images: 2 on top, 1 wide at bottom
      const topH = photoBottomY * 0.52;
      const bottomH = photoBottomY * 0.48;
      const halfW = width / 2;

      // Top Left
      drawImageCover(ctx, mainImg, 0, 0, halfW - 3, topH - 3, mCropX, mCropY, mZoom, canvasFilterStr);

      // Top Right
      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, halfW + 3, 0, halfW - 3, topH - 3, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, halfW + 3, 0, halfW - 3, topH - 3, sCropX, sCropY, sZoom, canvasFilterStr);
      }

      // Bottom Wide
      if (card.images.third) {
        const thirdImg = await loadImage(card.images.third);
        drawImageCover(ctx, thirdImg, 0, topH + 3, width, bottomH - 3, tCropX, tCropY, tZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, 0, topH + 3, width, bottomH - 3, tCropX, tCropY, tZoom, canvasFilterStr);
      }
    } else if (card.layout === 'grid-3-bottom') {
      // 3 images: 1 wide on top, 2 on bottom
      const topH = photoBottomY * 0.48;
      const bottomH = photoBottomY * 0.52;
      const halfW = width / 2;

      // Top Wide
      drawImageCover(ctx, mainImg, 0, 0, width, topH - 3, mCropX, mCropY, mZoom, canvasFilterStr);

      // Bottom Left
      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, 0, topH + 3, halfW - 3, bottomH - 3, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, 0, topH + 3, halfW - 3, bottomH - 3, sCropX, sCropY, sZoom, canvasFilterStr);
      }

      // Bottom Right
      if (card.images.third) {
        const thirdImg = await loadImage(card.images.third);
        drawImageCover(ctx, thirdImg, halfW + 3, topH + 3, halfW - 3, bottomH - 3, tCropX, tCropY, tZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, halfW + 3, topH + 3, halfW - 3, bottomH - 3, tCropX, tCropY, tZoom, canvasFilterStr);
      }
    } else if (card.layout === 'grid-4') {
      // 4 images: 2 on top, 2 on bottom (2x2 Grid)
      const topH = photoBottomY * 0.50;
      const bottomH = photoBottomY * 0.50;
      const halfW = width / 2;

      // Top Left (Main)
      drawImageCover(ctx, mainImg, 0, 0, halfW - 2, topH - 2, mCropX, mCropY, mZoom, canvasFilterStr);

      // Top Right (Second)
      if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, halfW + 2, 0, halfW - 2, topH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, halfW + 2, 0, halfW - 2, topH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      }

      // Bottom Left (Third)
      if (card.images.third) {
        const thirdImg = await loadImage(card.images.third);
        drawImageCover(ctx, thirdImg, 0, topH + 2, halfW - 2, bottomH - 2, tCropX, tCropY, tZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, 0, topH + 2, halfW - 2, bottomH - 2, tCropX, tCropY, tZoom, canvasFilterStr);
      }

      // Bottom Right (Fourth)
      if (card.images.fourth) {
        const fourthImg = await loadImage(card.images.fourth);
        drawImageCover(ctx, fourthImg, halfW + 2, topH + 2, halfW - 2, bottomH - 2, foCropX, foCropY, foZoom, canvasFilterStr);
      } else if (card.images.second) {
        const secondImg = await loadImage(card.images.second);
        drawImageCover(ctx, secondImg, halfW + 2, topH + 2, halfW - 2, bottomH - 2, sCropX, sCropY, sZoom, canvasFilterStr);
      } else {
        drawImageCover(ctx, mainImg, halfW + 2, topH + 2, halfW - 2, bottomH - 2, mCropX, mCropY, mZoom, canvasFilterStr);
      }

      // White Grid Dividers
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, topH - 2, width, 4); // Horizontal line
      ctx.fillRect(halfW - 2, 0, 4, photoBottomY); // Vertical line
    }

    // Draw Inset Circle if layout is inset-circle (Round Circle Image)
    if (card.layout === 'inset-circle' && card.images.insetCircle) {
      const insetImg = await loadImage(card.images.insetCircle);
      const cx = (card.insetPosition.x / 100) * width;
      const cy = (card.insetPosition.y / 100) * photoBottomY;
      const radius = width * 0.155; // ~168px radius

      // Inset photo crop & zoom settings
      const icPos = card.imagePositions?.insetCircle;
      const icCropX = (icPos?.x ?? 50) / 100;
      const icCropY = (icPos?.y ?? 50) / 100;
      const icZoom = icPos?.zoom ?? 1.0;

      // Circular shadow background
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Circular clipped photo with custom crop & zoom
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
      ctx.clip();
      drawImageCover(ctx, insetImg, cx - radius, cy - radius, radius * 2, radius * 2, icCropX, icCropY, icZoom);
      ctx.restore();

      // White circular stroke border
      ctx.save();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } catch (imgErr) {
    console.warn('Canvas image load warning:', imgErr);
  }

  // Smooth fade-out at the bottom of the photo into solid black for Quote (बयान) Template
  if (isQuote) {
    const fadeH = 200;
    const fadeStart = photoBottomY - fadeH;
    const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, photoBottomY);
    fadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fadeGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
    fadeGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, fadeStart, width, fadeH + 2);
  }

  // Optional user dark overlay if requested
  if (card.darkOverlayOpacity && card.darkOverlayOpacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${card.darkOverlayOpacity})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle exclusive watermark across photo area
  if (card.showSuperBreakingWatermark || card.showWatermark || shouldShowAppWatermark()) {
    await drawUniversalWatermark(
      ctx,
      width,
      photoBottomY,
      card
    );
  }
  }

  // 4. Render Bottom Section: Morning Jacket vs Text Breaking vs Super Breaking vs Quote vs Standard Original
  if (card.frameDesign === 'jacket-default') {
    // ==========================================
    // DEFAULT FRAME (CLEAN WHITE, PINK LOCATION, YOUR LOGO, 3-LINE HEADLINE, GRAY FOOTER)
    // ==========================================
    await drawDefaultJacketContent(ctx, width, height, card, customLogoImg);
  } else if (card.frameDesign === 'jacket-morning') {
    // ==========================================
    // MORNING JACKET (HEALTH, QUOTE, POSITIVE TIPS)
    // ==========================================
    const headerHeight = 150;
    await drawMorningJacketContent(ctx, card, width, height, footerBarHeight, headerHeight);
  } else if (card.frameDesign === 'jacket-epaper') {
    // ==========================================
    // E-PAPER JACKET (NEWSPAPER FRONT-PAGE 2-COLUMN ARTICLE)
    // ==========================================
    const headerHeight = 150;
    await drawEPaperJacketContent(ctx, card, width, height, footerBarHeight, headerHeight);
  } else if (card.frameDesign === 'jacket-text-breaking') {
    // ==========================================
    // TEXT BREAKING JACKET (NO PHOTO - EXCLUSIVE TEXT ONLY)
    // ==========================================
    const aboveFooterY = height - footerBarHeight - 54;

    // Badges directly above the footer bar:
    // Location (Left) and Callout Tag (Right)
    if (card.showLocation !== false && card.location) {
      drawLocationBadge(ctx, 48, aboveFooterY, card.location);
    }
    if (card.showCallout && card.calloutTag) {
      drawCalloutTag(ctx, width - 48, aboveFooterY, card.calloutTag);
    }

    // 3D Breaking News Badge (Moved upwards closer to header)
    const headerHeight = 110;
    const badgeCenterY = Math.round(headerHeight + (height * 0.082));
    drawTextBreaking3DBadge(ctx, width, badgeCenterY, card.textBreakingStyle, card.textBreakingCustomTitle, card.textBreakingTitleSize);

    // Centered Partition Line below 3D Badge (not full width, elegant centered line)
    const badgeBottomOffset = card.textBreakingStyle === 'breaking-ribbon' ? 48 : 66;
    const dividerY = Math.round(badgeCenterY + badgeBottomOffset);
    const dividerW = Math.round(width * 0.40);
    const dividerX = Math.round((width - dividerW) / 2);

    ctx.save();
    const divGrad = ctx.createLinearGradient(dividerX, 0, dividerX + dividerW, 0);
    divGrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
    divGrad.addColorStop(0.18, 'rgba(220, 38, 38, 0.9)');
    divGrad.addColorStop(0.5, 'rgba(220, 38, 38, 1)');
    divGrad.addColorStop(0.82, 'rgba(220, 38, 38, 0.9)');
    divGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dividerX, dividerY);
    ctx.lineTo(dividerX + dividerW, dividerY);
    ctx.stroke();

    // Subtle central diamond accent
    ctx.fillStyle = '#DC2626';
    ctx.save();
    ctx.translate(width / 2, dividerY);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.restore();

    // Headline Text (Centered between divider and above-footer strip)
    const hlColor = card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626';
    const headlineTopBound = dividerY + 32;
    const headlineBottomBound = aboveFooterY - 24;
    const availableHeadlineSpace = headlineBottomBound - headlineTopBound;
    const scaledLineH = Math.round(headlineLineHeight * 1.08);
    const totalHeadlineH = headlineLines.length * scaledLineH;
    const textBreakingHeadlineY = Math.max(
      headlineTopBound,
      Math.round(headlineTopBound + (availableHeadlineSpace - totalHeadlineH) / 2)
    );

    drawRenderedHeadlineLines(
      ctx,
      headlineLines,
      hlColor,
      width,
      textBreakingHeadlineY,
      Math.round(headlineFontSize * 1.14),
      scaledLineH,
      card.headlineAlign || 'center',
      56,
      true, // isLightBackground = true
      false,
      card.headlineFontFamily || 'Baloo 2'
    );

    drawPhotoDisclaimerWatermark(ctx, width, aboveFooterY - 30, card);
  } else if (card.frameDesign === 'jacket-breaking-red') {
    // Super Breaking Template: Badges above + Centered BREAKING NEWS ribbon + Solid pure white headline + Yellow footer

    // Solid white background plate
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, whiteBoxY, width, height - footerBarHeight - whiteBoxY);

    // Subtle divider at top of white plate
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, whiteBoxY, width, 2);

    if (showBreakingRibbon) {
      // Centered, scaled BREAKING NEWS Ribbon with gentle soft shadow touching border
      const ribbonScalePct = 70;
      await drawSuperBreakingRibbon(
        ctx,
        width,
        superBreakingRibbonY,
        card.customBreakingRibbonPng,
        ribbonScalePct
      );

      // Location Badge & Callout Tag floating ABOVE the ribbon
      const badgeY = superBreakingRibbonY - 48 - 14;
      if (card.location) {
        drawLocationBadge(ctx, 48, badgeY, card.location);
      }
      if (card.showCallout) {
        drawCalloutTag(ctx, width - 48, badgeY, card.calloutTag);
      }
    } else {
      // Ribbon hidden: Location & Callout badges positioned lower, sitting right above the white box plate!
      const badgeY = whiteBoxY - 48 - 12;
      if (card.location) {
        drawLocationBadge(ctx, 48, badgeY, card.location);
      }
      if (card.showCallout) {
        drawCalloutTag(ctx, width - 48, badgeY, card.calloutTag);
      }
    }

    // Photo Disclaimer Watermark if enabled (AI GENERATED or प्रतीकात्मक फोटो)
    drawPhotoDisclaimerWatermark(ctx, width, height, card);

    // 2-Line Headline inside the white box with comfortable top breathing space (never touching ribbon)
    const hlColor = card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626';
    const headlineTextY = superBreakingHeadlineTextY;
    drawRenderedHeadlineLines(
      ctx,
      headlineLines,
      hlColor,
      width,
      headlineTextY,
      headlineFontSize,
      headlineLineHeight,
      card.headlineAlign || 'center',
      48,
      true, // isLightBackground = true
      false,
      card.headlineFontFamily || 'Baloo 2'
    );
  } else if (card.frameDesign === 'jacket-quote') {
    // ==========================================
    // Dedicated Quote (बयान) Template Layout
    // Single image in top 50%, clean solid black lower 50%
    // ==========================================

    // 1. Solid black for the lower 50% area
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, photoBottomY, width, height - photoBottomY);

    // 2. On-photo badges: Location (Left) & Callout Tag (Right) safely padded inwards (72px)
    const badgeY = photoBottomY - 58;
    if (card.showLocation !== false && card.location) {
      drawLocationBadge(ctx, 72, badgeY, card.location);
    }
    if (card.showCallout && card.calloutTag) {
      drawCalloutTag(ctx, width - 72, badgeY, card.calloutTag);
    }

    // Photo Disclaimer Watermark if enabled (AI GENERATED or प्रतीकात्मक फोटो)
    drawPhotoDisclaimerWatermark(ctx, width, Math.round(photoBottomY * 0.5), card);

    // 3. Mathematical vertical balancing for the Quote Block
    const quoteAreaTop = photoBottomY;
    const quoteAreaBottom = height - footerBarHeight;
    const quoteAreaH = quoteAreaBottom - quoteAreaTop;

    const quoteBadgeW = 74;
    const quoteBadgeH = 38;
    const speakerH = 46;

    // Get effective speaker attribution (respecting user entry, or auto-detecting from headline)
    const effectiveSpeaker = getEffectiveSpeaker(card.speakerName, card.speakerTitle, card.headline);
    const hasSpeaker = Boolean(effectiveSpeaker.name);

    // Total content height without gaps
    const totalContentH = quoteBadgeH + totalHeadlineHeight + quoteBadgeH + (hasSpeaker ? speakerH : 0);
    const numGaps = hasSpeaker ? 5 : 4;
    const gap = Math.max(18, Math.floor((quoteAreaH - totalContentH) / numGaps));

    let currentY = quoteAreaTop + gap;

    // A. Top Quote divider line & yellow badge with crisp opening Quote Icon
    const topQuoteY = currentY + Math.round(quoteBadgeH / 2);
    ctx.save();
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, topQuoteY);
    ctx.lineTo(width / 2 - quoteBadgeW / 2 - 12, topQuoteY);
    ctx.moveTo(width / 2 + quoteBadgeW / 2 + 12, topQuoteY);
    ctx.lineTo(width - 100, topQuoteY);
    ctx.stroke();

    // Top Yellow Box
    ctx.fillStyle = '#FFE600';
    ctx.beginPath();
    ctx.roundRect(width / 2 - quoteBadgeW / 2, topQuoteY - quoteBadgeH / 2, quoteBadgeW, quoteBadgeH, 8);
    ctx.fill();

    // Top Quote Vector Icon (Opening: isClosing = false)
    drawQuoteVectorIcon(ctx, width / 2, topQuoteY, 22, false);
    ctx.restore();

    currentY += quoteBadgeH + gap;

    // B. Headline / Statement Text (Respects user's headlineAlign: 'justify' | 'center' | 'left')
    const quoteTextStartY = currentY;
    const effectiveAlign = card.headlineAlign || 'center';
    drawRenderedHeadlineLines(
      ctx,
      headlineLines,
      card.highlightColor || '#FFE600',
      width,
      quoteTextStartY,
      headlineFontSize,
      headlineLineHeight,
      effectiveAlign,
      90, // Side margin 90px (width - 180 = 900px, matches quote divider lines)
      false, // isLightBackground = false
      true, // disableStroke = true (no black stroke artifacts on pure black)
      card.headlineFontFamily || 'Baloo 2'
    );

    currentY += totalHeadlineHeight + gap;

    // C. Bottom Quote divider line & yellow badge with crisp closing Quote Icon
    const bottomQuoteY = currentY + Math.round(quoteBadgeH / 2);
    ctx.save();
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, bottomQuoteY);
    ctx.lineTo(width / 2 - quoteBadgeW / 2 - 12, bottomQuoteY);
    ctx.moveTo(width / 2 + quoteBadgeW / 2 + 12, bottomQuoteY);
    ctx.lineTo(width - 100, bottomQuoteY);
    ctx.stroke();

    // Bottom Yellow Box
    ctx.fillStyle = '#FFE600';
    ctx.beginPath();
    ctx.roundRect(width / 2 - quoteBadgeW / 2, bottomQuoteY - quoteBadgeH / 2, quoteBadgeW, quoteBadgeH, 8);
    ctx.fill();

    // Bottom Quote Vector Icon (Closing: isClosing = true)
    drawQuoteVectorIcon(ctx, width / 2, bottomQuoteY, 22, true);
    ctx.restore();

    currentY += quoteBadgeH + gap;

    // D. Speaker Name & Designation: Symmetrically spaced with generous breathing room above footer
    if (hasSpeaker) {
      const speakerY = currentY + Math.round(speakerH / 2);
      drawSpeakerAttribution(ctx, width, speakerY, effectiveSpeaker.name, effectiveSpeaker.title);
    }
  } else {
    // Standard Original Layout
    const headlineBottomY = height - footerBarHeight - 22;
    const headlineStartY = headlineBottomY - totalHeadlineHeight;
    
    // Badge height is 40px.
    // Devanagari font (Baloo 2) upper matras (ि, ी, े, ै, ं, र्) extend ~24-26px above headlineStartY.
    // Setting badgeBottomGap to 58 ensures a generous, clean 32-34px visible air gap above the highest
    // matra (58px from base text top), matching the live preview screen perfectly.
    const badgeH = 40;
    const badgeBottomGap = 58;
    const topStripY = headlineStartY - badgeH - badgeBottomGap;

    // Compact, gentle headline gradient scrim (so photo remains 65%+ completely visible)
    const scrimTop = topStripY - 55;
    const scrimGradient = ctx.createLinearGradient(0, scrimTop, 0, height - footerBarHeight);
    scrimGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrimGradient.addColorStop(0.20, 'rgba(0, 0, 0, 0.65)');
    scrimGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.92)');
    scrimGradient.addColorStop(1, 'rgba(0, 0, 0, 0.99)');
    ctx.fillStyle = scrimGradient;
    ctx.fillRect(0, scrimTop, width, height - footerBarHeight - scrimTop);

    // Top Strip: Location (Left) & "🔴 पूरी खबर डिस्क्रिप्शन में" (Right)
    if (card.location) {
      drawLocationBadge(ctx, 48, topStripY, card.location);
    }
    if (card.showCallout) {
      drawCalloutTag(ctx, width - 48, topStripY, card.calloutTag);
    }

    // Photo Disclaimer Watermark along Left Edge, Rotated 90°
    drawPhotoDisclaimerWatermark(ctx, width, height, card);

    // 3-Line News Headline Caption in Baloo 2 font - Justified / Center / Left
    drawRenderedHeadlineLines(
      ctx,
      headlineLines,
      card.highlightColor || '#FFE600',
      width,
      headlineStartY,
      headlineFontSize,
      headlineLineHeight,
      card.headlineAlign || 'center',
      48,
      false,
      false,
      card.headlineFontFamily || 'Baloo 2'
    );
  }

  // 7. Render Header / Jacket on the TOPMOST LAYER so it stays pristine, above photos & watermarks
  if (card.frameDesign === 'jacket-default') {
    // jacket-default already handled top bar and footer in drawDefaultJacketContent
  } else if (card.frameDesign === 'jacket-investigation') {
    // Special Investigation Header
    const headH = 64;
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(0.5, '#171717');
    grad.addColorStop(1, '#451a03');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, headH);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, headH - 4, width, 4);

    // Badge: 🔍 विशेष पड़ताल
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, 32, 12, 210, 40, 8);
    ctx.fill();
    ctx.font = '900 22px "Baloo 2", sans-serif';
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔍 विशेष पड़ताल', 48, 32);

    ctx.font = '900 24px "Baloo 2", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(card.investigationCaseNumber || card.brandName || 'INVESTIGATION REPORT', 265, 32);

    ctx.font = '900 18px monospace';
    ctx.fillStyle = '#FBBF24';
    ctx.textAlign = 'right';
    ctx.fillText('EXCLUSIVE', width - 36, 32);
  } else if (card.showMasterBranding !== false) {
    const activeHeaderPng = getActiveHeaderPng(card);
    if (card.frameDesign === 'custom-png') {
      if (!card.hideDefaultHeaderInCustomFrame) {
        if (activeHeaderPng) {
          try {
            const headerImg = await loadImage(activeHeaderPng);
            const headerAspect = headerImg.width / headerImg.height;
            const drawH = width / headerAspect;
            ctx.drawImage(headerImg, 0, 0, width, drawH);
          } catch (err) {
            drawOriginalHeader(ctx, width, card, customLogoImg);
          }
        } else {
          drawOriginalHeader(ctx, width, card, customLogoImg);
        }
      }
    } else if (activeHeaderPng) {
      try {
        const headerImg = await loadImage(activeHeaderPng);
        const headerAspect = headerImg.width / headerImg.height;
        const drawH = width / headerAspect;
        ctx.drawImage(headerImg, 0, 0, width, drawH);
      } catch (err) {
        drawOriginalHeader(ctx, width, card, customLogoImg);
      }
    } else {
      // jacket-original, jacket-breaking-red, jacket-quote & jacket-text-breaking use the official header!
      drawOriginalHeader(ctx, width, card, customLogoImg);
    }
  }

  // Optional full frame transparent overlay PNG ONLY when custom-png template is selected
  if (card.frameDesign === 'custom-png' && card.customFrameOverlayPng) {
    try {
      const overlayImg = await loadImage(card.customFrameOverlayPng);
      ctx.drawImage(overlayImg, 0, 0, width, height);
    } catch (err) {
      console.warn('Frame overlay load error:', err);
    }
  }

  // 7C. Date Stamp: Vertical along Right Wall, Rotated 270° in Hindi
  if (card.showDate !== false && card.frameDesign !== 'jacket-default' && card.frameDesign !== 'jacket-text-breaking' && card.frameDesign !== 'jacket-morning' && card.frameDesign !== 'jacket-epaper') {
    const dateText = card.dateStr || getFormattedHindiDate();
    drawDateStamp(ctx, width, height, dateText);
  }

  // 8. Permanent Theme Footer Bar (Exact reproduction of Footer.png)
  const activeFooter = getActiveFooterPng(card);
  const shouldDrawFooter =
    card.showMasterBranding !== false &&
    card.frameDesign !== 'jacket-default' &&
    !(card.frameDesign === 'custom-png' && card.hideDefaultFooterInCustomFrame);

  if (shouldDrawFooter) {
    await drawThemeFooterBar(
      ctx,
      width,
      height,
      footerBarHeight,
      card.socialHandle,
      card.whatsappNumber,
      activeFooter,
      card.websiteUrl,
      card.activeSocialIcons as any,
      card.showMobileNumber,
      card.footerBgColor || '#FFFFFF',
      card.footerTextColor,
      card.footerIconStyle || 'color'
    );
  }

  // 9. Draw Custom Floating Text Overlays (Custom fonts, colors, badges)
  if (card.customTextOverlays && card.customTextOverlays.length > 0) {
    for (const item of card.customTextOverlays) {
      if (!item.text || !item.text.trim()) continue;
      ctx.save();
      const posX = (width * (item.x ?? 50)) / 100;
      const posY = (height * (item.y ?? 50)) / 100;
      const fontSize = Math.round((item.fontSize || 28) * 1.8);
      const fontFam = item.fontFamily || 'Baloo 2';
      ctx.font = `${item.isBold !== false ? '800' : '600'} ${fontSize}px "${fontFam}", sans-serif`;

      const metrics = ctx.measureText(item.text);
      const textW = metrics.width;
      const textH = fontSize * 1.2;
      const padX = 24;
      const padY = 12;

      if (item.backgroundColor && item.backgroundColor !== 'transparent') {
        ctx.fillStyle = item.backgroundColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        drawRoundedRect(ctx, posX - textW / 2 - padX, posY - textH / 2 - padY, textW + padX * 2, textH + padY * 2, 12);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
      }

      ctx.fillStyle = item.color || '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, posX, posY);
      ctx.restore();
    }
  }

  return canvas;
}

function getCanvasFilterString(filters?: any): string {
  if (!filters) return 'none';
  const { brightness, contrast, saturate, sepia, grayscale } = filters;
  const parts: string[] = [];
  if (brightness !== undefined && brightness !== 100) parts.push(`brightness(${brightness}%)`);
  if (contrast !== undefined && contrast !== 100) parts.push(`contrast(${contrast}%)`);
  if (saturate !== undefined && saturate !== 100) parts.push(`saturate(${saturate}%)`);
  if (sepia !== undefined && sepia > 0) parts.push(`sepia(${sepia}%)`);
  if (grayscale !== undefined && grayscale > 0) parts.push(`grayscale(${grayscale}%)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

// Helper: Draw image with cover aspect ratio, custom crop (X/Y) and zoom
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  cropX: number = 0.5,
  cropY: number = 0.5,
  zoom: number = 1.0,
  filterStr?: string
) {
  const safeZoom = Math.max(1, zoom || 1);
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let baseSWidth: number;
  let baseSHeight: number;

  if (imgRatio > targetRatio) {
    baseSHeight = img.height;
    baseSWidth = img.height * targetRatio;
  } else {
    baseSWidth = img.width;
    baseSHeight = img.width / targetRatio;
  }

  // Calculate scaled sampling area
  const sWidth = baseSWidth / safeZoom;
  const sHeight = baseSHeight / safeZoom;

  // Maximum movable room in source image
  const maxMoveX = Math.max(0, img.width - sWidth);
  const maxMoveY = Math.max(0, img.height - sHeight);

  const safeCropX = Math.max(0, Math.min(1, cropX));
  const safeCropY = Math.max(0, Math.min(1, cropY));

  const sx = maxMoveX * safeCropX;
  const sy = maxMoveY * safeCropY;

  ctx.save();
  if (filterStr && filterStr !== 'none' && (ctx as any).filter !== undefined) {
    (ctx as any).filter = filterStr;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}

// Signature Top-Right Swoosh Arcs
function drawTopRightSwoosh(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const startX = width - 180;
  const endY = 240;

  // Outer Black swoosh
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(startX - 20, 0);
  ctx.quadraticCurveTo(width - 20, 60, width, endY + 40);
  ctx.closePath();
  ctx.fill();

  // Middle Yellow swoosh
  ctx.fillStyle = '#FFDD00';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(startX, 0);
  ctx.quadraticCurveTo(width - 15, 50, width, endY + 20);
  ctx.closePath();
  ctx.fill();

  // Inner Red swoosh
  ctx.fillStyle = '#E50914';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(startX + 30, 0);
  ctx.quadraticCurveTo(width - 10, 40, width, endY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Official Logo Badge at Top-Left
function drawLogoBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brandName: string = 'AI News Maker',
  tagline: string = 'भारत के जिलों से आपके दिलों तक'
) {
  ctx.save();
  const boxW = 280;
  const boxH = 92;
  const radius = 16;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  // Yellow rounded container
  ctx.fillStyle = '#FFEA00';
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Red Border
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D91A2A';
  ctx.stroke();

  // Blue Globe Icon (Left inside badge)
  const globeX = x + 44;
  const globeY = y + 42;
  const globeR = 30;
  ctx.beginPath();
  ctx.arc(globeX, globeY, globeR, 0, Math.PI * 2);
  ctx.fillStyle = '#1D4ED8';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FACC15';
  ctx.stroke();

  // Simple continents on globe in yellow/orange
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(globeX - 6, globeY - 6, 12, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(globeX + 8, globeY + 8, 10, 0, Math.PI);
  ctx.fill();

  // Latitude/longitude lines
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(globeX, globeY, globeR - 2, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Text: "ब्रेकिंग" (Red)
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 30px "Mukta", "Noto Sans Devanagari", sans-serif';
  ctx.fillText('ब्रेकिंग', x + 90, y + 36);

  // Text: "न्यूज़वाला" (Red)
  ctx.font = 'bold 24px "Mukta", "Noto Sans Devanagari", sans-serif';
  ctx.fillText('न्यूज़वाला', x + 90, y + 62);

  // Bottom Tagline bar inside badge
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(x + 88, y + 68, boxW - 96, 18, 4);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(tagline, x + 93, y + 81);

  ctx.restore();
}

// Top Location Badge (Above Headline)
function drawLocationBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  locationText: string
) {
  if (!locationText) return;
  ctx.save();
  ctx.font = '800 22px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(locationText).width;
  const badgeW = textW + 56;
  const badgeH = 40;

  // Red badge background
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.roundRect(x, y, badgeW, badgeH, 6);
  ctx.fill();

  // Highlight stroke
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pin icon (white)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + 19, y + 16, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 17);
  ctx.lineTo(x + 24, y + 17);
  ctx.lineTo(x + 19, y + 27);
  ctx.closePath();
  ctx.fill();

  // Location text in Baloo 2
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(locationText, x + 34, y + badgeH / 2 + 1);

  ctx.restore();
}

// Callout Tag "🔴 पूरी खबर डिस्क्रिप्शन में" (Top Right above Headline)
function drawCalloutTag(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  y: number,
  text: string
) {
  ctx.save();
  ctx.font = '800 22px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const cleanText = text.replace('🔴', '').trim() || 'पूरी खबर डिस्क्रिप्शन में';
  const textWidth = ctx.measureText(cleanText).width;
  const pillW = textWidth + 56;
  const pillH = 40;
  const pillX = rightX - pillW;

  // Background white box
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(pillX, y, pillW, pillH, 6);
  ctx.fill();

  // Yellow accent border
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#FFE600';
  ctx.stroke();

  // Red pulsing dot
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.arc(pillX + 20, y + pillH / 2, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Text in Baloo 2
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanText, pillX + 36, y + pillH / 2 + 1);

  ctx.restore();
}

// Utility: wrap string into array of lines based on maxWidth and current context font
function wrapTextIntoLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/[ \t]+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testW = ctx.measureText(testLine).width;
    if (testW > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Background for Morning Jacket (Health, Quotes, Positive Updates)
async function drawMorningJacketBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgStyle?: 'light-mesh' | 'sunrise' | 'green-nature' | 'pure-white' | 'custom-image',
  customBgUrl?: string
) {
  ctx.save();
  if (customBgUrl && customBgUrl.trim().length > 0) {
    try {
      const bgImg = await loadImage(customBgUrl);
      drawImageCover(ctx, bgImg, 0, 0, width, height, 0.5, 0.5, 1);

      // 1. Subtle soft dark scrim (25% black) for high typography contrast - EXACT match to CardPreview bg-black/25
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle top vignette to protect custom header PNG - EXACT match to CardPreview h-28 from-black/60 via-black/20
      const topVignette = ctx.createLinearGradient(0, 0, 0, 240);
      topVignette.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      topVignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
      topVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topVignette;
      ctx.fillRect(0, 0, width, 240);

      // 3. Subtle bottom vignette to protect custom footer PNG - EXACT match to CardPreview h-32 from-black/70 via-black/30
      const botVignette = ctx.createLinearGradient(0, height - 280, 0, height);
      botVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      botVignette.addColorStop(0.45, 'rgba(0, 0, 0, 0.30)');
      botVignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = botVignette;
      ctx.fillRect(0, height - 280, width, 280);

      ctx.restore();
      return;
    } catch {
      // Fallback to procedural background if custom image fails
    }
  }

  if (bgStyle === 'pure-white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (bgStyle === 'sunrise') {
    const sGrad = ctx.createLinearGradient(0, 0, width, height);
    sGrad.addColorStop(0, '#D97706'); // amber-600
    sGrad.addColorStop(0.5, '#EA580C'); // orange-500
    sGrad.addColorStop(1, '#9A3412'); // amber-800
    ctx.fillStyle = sGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (bgStyle === 'green-nature') {
    const gGrad = ctx.createLinearGradient(0, 0, width, height);
    gGrad.addColorStop(0, '#065F46'); // emerald-800
    gGrad.addColorStop(0.5, '#134E4A'); // teal-900
    gGrad.addColorStop(1, '#052E16'); // green-950
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  // Default: Atmospheric dark morning gradient with ambient glow - EXACT match to CardPreview
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#451A03'); // amber-950/80
  bgGrad.addColorStop(0.5, '#0A0A0A'); // neutral-950
  bgGrad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft warm ambient circular glows
  const rad1 = ctx.createRadialGradient(width - 50, 50, 10, width - 50, 50, 520);
  rad1.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
  rad1.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = rad1;
  ctx.fillRect(0, 0, width, height);

  const rad2 = ctx.createRadialGradient(50, height - 120, 10, 50, height - 120, 520);
  rad2.addColorStop(0, 'rgba(234, 88, 12, 0.22)');
  rad2.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = rad2;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

// ============================================================================
// GRAPHIC 1 — NEWS GRAPHIC TEMPLATE (graphic_001)
// Aspect Ratio: STRICT 4:5 (1080 x 1350)
// Plan: BASIC
// Top Photo (53%), Location Box (top-left), Logo Box (top-right),
// 270° Rotated Date (left), 3-Line Headline on Polygon White,
// "पूरी खबर डिस्क्रिप्शन में" Single Line CTA, Fixed Yellow Footer
// ============================================================================
async function drawGraphic001Canvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  ctx.save();

  // 1. TOP PHOTO AREA (0 to 715px ~53% of 1350)
  const photoH = Math.round(height * 0.53); // ~715px
  let hasValidPhoto = false;
  if (card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg') {
    try {
      const img = await loadImage(card.images.main);
      const crop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      const cropX = (crop.x ?? 50) / 100;
      const cropY = (crop.y ?? 50) / 100;
      const zoom = Math.max(1, crop.zoom || 1);
      drawImageCover(ctx, img, 0, 0, width, photoH, cropX, cropY, zoom);
      hasValidPhoto = true;
    } catch (e) {
      console.warn('Failed to load main image for graphic_001', e);
    }
  }

  if (!hasValidPhoto) {
    // Elegant Placeholder Photo Area matching the sample reference
    const pGrad = ctx.createLinearGradient(0, 0, 0, photoH);
    pGrad.addColorStop(0, '#1E293B');
    pGrad.addColorStop(0.5, '#0F172A');
    pGrad.addColorStop(1, '#020617');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, 0, width, photoH);

    // Subtle photo placeholder center card
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    const phW = 440;
    const phH = 140;
    const phX = (width - phW) / 2;
    const phY = (photoH - phH) / 2 + 30;
    ctx.beginPath();
    ctx.roundRect(phX, phY, phW, phH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR PHOTO', width / 2, phY + 48);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '700 22px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपकी फोटो रहेगी', width / 2, phY + 96);
    ctx.restore();
  }

  // 2. HEADER: If customHeaderPng is uploaded, draw it directly and HIDE default location & logo boxes
  if (card.customHeaderPng) {
    try {
      const headerImg = await loadImage(card.customHeaderPng);
      const headerRatio = headerImg.width / headerImg.height;
      const hH = Math.min(Math.round(width / headerRatio), 160);
      ctx.drawImage(headerImg, 0, 0, width, hH);
    } catch (e) {
      console.warn('Failed to load customHeaderPng', e);
    }
  } else {
    // 2. LOCATION BOX (Upper-Left portion of photo)
    // Rounded white box with red border #DC2626
    if (card.showLocation !== false) {
      const locBoxX = 36;
      const locBoxY = 32;
      const locBoxW = 290;
      const locBoxH = 82;
      const locRadius = 14;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(locBoxX, locBoxY, locBoxW, locBoxH, locRadius);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Red Pin Icon on the left
      const pinCenterX = locBoxX + 36;
      const pinCenterY = locBoxY + locBoxH / 2;
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(pinCenterX, pinCenterY - 4, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pinCenterX - 11, pinCenterY - 2);
      ctx.lineTo(pinCenterX + 11, pinCenterY - 2);
      ctx.lineTo(pinCenterX, pinCenterY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pinCenterX, pinCenterY - 4, 5, 0, Math.PI * 2);
      ctx.fill();

      // Text inside Location Box (Clean actual location only)
      const cleanLoc = (card.location || '')
        .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
        .replace(/[:\-–—]+$/, '')
        .trim();

      ctx.fillStyle = '#111827';
      ctx.font = '900 24px "Noto Sans Devanagari", "Poppins", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cleanLoc.slice(0, 24), locBoxX + 66, locBoxY + locBoxH / 2);
      ctx.restore();
    }

    // 3. LOGO (Upper-Right portion of photo): Transparent / No-Background
    if (customLogoImg) {
      const scale = card.logoScale ?? 1.25;
      const maxW = 300 * scale;
      const maxH = 95 * scale;
      const scaleFactor = Math.min(maxW / customLogoImg.width, maxH / customLogoImg.height, 1);
      const drawW = customLogoImg.width * scaleFactor;
      const drawH = customLogoImg.height * scaleFactor;
      const drawX = width - drawW - 36;
      const drawY = 32 + (95 - drawH) / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(customLogoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Clean subtle placeholder
      const logoBoxW = 270;
      const logoBoxH = 82;
      const logoBoxX = width - logoBoxW - 36;
      const logoBoxY = 32;
      const logoRadius = 14;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.roundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, logoRadius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '900 24px "Poppins", sans-serif';
      ctx.fillText('YOUR LOGO', logoBoxX + logoBoxW / 2, logoBoxY + 38);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 15px "Noto Sans Devanagari", sans-serif';
      ctx.fillText('(पारदर्शी लोगो)', logoBoxX + logoBoxW / 2, logoBoxY + 65);
      ctx.restore();
    }
  }

  // 4. DATE (Left side of photo, 270° ROTATED, LOW OPACITY)
  if (card.showDate !== false) {
    ctx.save();
    const dateText = (card.dateStr && card.dateStr.trim().length > 0)
      ? card.dateStr.trim().toUpperCase()
      : '25 SEP 2026';

    ctx.translate(64, 460);
    ctx.rotate(-Math.PI / 2); // 270 degrees

    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = '900 34px "Poppins", "Baloo 2", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(dateText, 0, 0);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.font = '700 15px "Poppins", sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('(DATE - ROTATE 270°)  LOW OPACITY', 0, 22);

    ctx.restore();
  }

  // 5. BOTTOM SECTION BACKGROUND (Y = 715 to 1350)
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, photoH, width, height - photoH);

  // Subtle geometric polygon watermark texture matching sample
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(0, photoH + 60);
  ctx.lineTo(240, photoH);
  ctx.lineTo(120, photoH + 200);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(width, photoH + 120);
  ctx.lineTo(width - 260, photoH);
  ctx.lineTo(width - 140, photoH + 260);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 180, height - 200);
  ctx.lineTo(width / 2 + 200, height - 140);
  ctx.lineTo(width / 2, height - 80);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. FOOTER: If customFooterPng is uploaded, draw it directly and HIDE default fixed yellow footer
  if (card.customFooterPng) {
    try {
      const footerImg = await loadImage(card.customFooterPng);
      const footerRatio = footerImg.width / footerImg.height;
      const fH = Math.min(Math.round(width / footerRatio), 140);
      const fY = height - fH;
      ctx.drawImage(footerImg, 0, fY, width, fH);
    } catch (e) {
      console.warn('Failed to load customFooterPng', e);
    }
  } else {
    // 6. FIXED FOOTER STRIP AT BOTTOM (Y = 1240 to 1350, Height = 110)
    await drawThemeFooterBar(
      ctx,
      width,
      height,
      110,
      card.socialHandle,
      card.whatsappNumber,
      undefined,
      card.websiteUrl,
      card.activeSocialIcons as any,
      card.showMobileNumber,
      card.footerBgColor || '#FFE600',
      card.footerTextColor || '#000000',
      card.footerIconStyle || 'color'
    );
  }

  // 7. DESCRIPTION CTA (Y = 1172)
  // Horizontal Red Line across with centered pill: [📄 पूरी खबर डिस्क्रिप्शन में]
  const ctaLineY = 1172;
  ctx.save();
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(48, ctaLineY);
  ctx.lineTo(width - 48, ctaLineY);
  ctx.stroke();

  const pillW = 520;
  const pillH = 66;
  const pillX = (width - pillW) / 2;
  const pillY = ctaLineY - pillH / 2;

  ctx.shadowColor = 'rgba(220, 38, 38, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  const docX = pillX + 44;
  const docY = pillY + pillH / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(docX - 16, docY - 16, 28, 32, 4);
  ctx.fill();
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(docX - 11, docY - 9, 18, 3);
  ctx.fillRect(docX - 11, docY - 2, 18, 3);
  ctx.fillRect(docX - 11, docY + 5, 12, 3);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 27px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('पूरी खबर डिस्क्रिप्शन में', pillX + pillW / 2 + 16, docY);
  ctx.restore();

  // 8. HEADLINE AREA (Y = 730 to 1130)
  // Centered, Maximum 3 Lines, Red Highlight support
  const maxHeadlineW = width - 120;
  const headlineAreaCenterY = (photoH + ctaLineY) / 2 - 15;
  const hasUserHeadline = card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार';

  if (!hasUserHeadline) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const yourFont = '900 74px "Poppins", sans-serif';
    ctx.font = yourFont;
    const yourW = ctx.measureText('YOUR ').width;
    const headW = ctx.measureText('HEADLINE').width;
    const line1TotalW = yourW + headW;
    const line1StartX = width / 2 - line1TotalW / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.fillText('YOUR ', line1StartX, headlineAreaCenterY - 80);

    ctx.fillStyle = '#DC2626';
    ctx.fillText('HEADLINE', line1StartX + yourW, headlineAreaCenterY - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#111827';
    ctx.font = '900 58px "Baloo 2", sans-serif';
    ctx.fillText('यहाँ आपकी हेडलाइन आएगी', width / 2, headlineAreaCenterY + 4);

    ctx.fillStyle = '#4B5563';
    ctx.font = '700 36px "Baloo 2", sans-serif';
    ctx.fillText('(अधिकतम 3 लाइन में)', width / 2, headlineAreaCenterY + 76);
    ctx.restore();
  } else {
    ctx.save();
    const rawHeadline = card.formattedHeadline || card.headline;
    const fontFam = card.headlineFontFamily || 'Baloo 2';
    const highlightColor = card.highlightColor || '#DC2626';

    let testFontSize = 66;
    for (let s = 70; s >= 38; s -= 2) {
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, s, 0);
      if (testLines.length <= 3) {
        testFontSize = s;
        break;
      }
    }

    const headlineLineH = Math.round(testFontSize * 1.34);
    const headlineLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, testFontSize, 3);
    const totalHeadH = headlineLines.length * headlineLineH;
    let startY = headlineAreaCenterY - totalHeadH / 2 + Math.round(headlineLineH * 0.45);

    ctx.font = `900 ${testFontSize}px "${fontFam}", "Noto Sans Devanagari", sans-serif`;
    ctx.textBaseline = 'middle';

    for (const line of headlineLines) {
      let lineWidth = 0;
      for (const token of line) {
        lineWidth += ctx.measureText(token.text + ' ').width;
      }

      let curX = width / 2 - lineWidth / 2;
      for (const token of line) {
        ctx.fillStyle = token.isHighlight ? highlightColor : '#111827';
        ctx.fillText(token.text, curX, startY);
        curX += ctx.measureText(token.text + ' ').width;
      }
      startY += headlineLineH;
    }
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// GRAPHIC 2 — NEWS GRAPHIC TEMPLATE (graphic_002)
// Aspect Ratio: STRICT 4:5 (1080 x 1350)
// Plan: ADVANCED
// Outer Thin Orange Border (#EA580C)
// Top Photo (53%), Location Box (top-left), Logo Box (top-right),
// Off-white Textured Headline Area with Orange Keyword Accents (Max 3 lines),
// "पूरी खबर कमेंट बॉक्स में" Single Line CTA with Flanking Red Lines,
// Fixed Yellow Social Footer (#FFE600) with Fixed Footer Badge
// ============================================================================
async function drawGraphic002Canvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  ctx.save();

  const orangeBorderW = 12;
  const photoH = Math.round(height * 0.53); // ~715px

  // 1. TOP PHOTO AREA (12 to photoH, with outer orange border)
  let hasValidPhoto = false;
  if (card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg') {
    try {
      const img = await loadImage(card.images.main);
      const crop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      const cropX = (crop.x ?? 50) / 100;
      const cropY = (crop.y ?? 50) / 100;
      const zoom = Math.max(1, crop.zoom || 1);
      drawImageCover(ctx, img, orangeBorderW, orangeBorderW, width - orangeBorderW * 2, photoH - orangeBorderW, cropX, cropY, zoom);
      hasValidPhoto = true;
    } catch (e) {
      console.warn('Failed to load main image for graphic_002', e);
    }
  }

  if (!hasValidPhoto) {
    // Elegant Placeholder Photo Area matching the sample reference
    const pGrad = ctx.createLinearGradient(0, 0, 0, photoH);
    pGrad.addColorStop(0, '#1E293B');
    pGrad.addColorStop(0.5, '#0F172A');
    pGrad.addColorStop(1, '#020617');
    ctx.fillStyle = pGrad;
    ctx.fillRect(orangeBorderW, orangeBorderW, width - orangeBorderW * 2, photoH - orangeBorderW);

    // Center placeholder card
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    const phW = 440;
    const phH = 140;
    const phX = (width - phW) / 2;
    const phY = (photoH - phH) / 2 + 20;
    ctx.beginPath();
    ctx.roundRect(phX, phY, phW, phH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR PHOTO', width / 2, phY + 48);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '700 22px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपकी फोटो रहेगी', width / 2, phY + 96);
    ctx.restore();
  }

  // 2. LOCATION BOX (Top-Left of photo)
  // Rounded white box with red border #DC2626
  if (card.showLocation !== false) {
    const locBoxX = 36;
    const locBoxY = 32;
    const locBoxW = 290;
    const locBoxH = 82;
    const locRadius = 14;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(locBoxX, locBoxY, locBoxW, locBoxH, locRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Red Pin Icon on the left
    const pinCenterX = locBoxX + 36;
    const pinCenterY = locBoxY + locBoxH / 2;
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(pinCenterX, pinCenterY - 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinCenterX - 11, pinCenterY - 2);
    ctx.lineTo(pinCenterX + 11, pinCenterY - 2);
    ctx.lineTo(pinCenterX, pinCenterY + 14);
    ctx.closePath();
    ctx.fill();

    // White dot inside pin
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pinCenterX, pinCenterY - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Location text (Clean actual location only)
    const locTextX = locBoxX + 66;
    const cleanLoc = (card.location || '')
      .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
      .replace(/[:\-–—]+$/, '')
      .trim();
    ctx.fillStyle = '#000000';
    ctx.font = '900 24px "Noto Sans Devanagari", "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanLoc.slice(0, 24), locTextX, locBoxY + locBoxH / 2);
    ctx.restore();
  }

  // 3. LOGO BOX (Top-Right of photo)
  // Warm ivory/white rounded box with orange/red border #EA580C
  const logoBoxW = 290;
  const logoBoxH = 82;
  const logoBoxX = width - logoBoxW - 36;
  const logoBoxY = 32;
  const logoRadius = 14;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#FFFBEB';
  ctx.beginPath();
  ctx.roundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, logoRadius);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  if (customLogoImg) {
    const scale = card.logoScale ?? 1.25;
    const maxLogoW = (logoBoxW - 24) * scale;
    const maxLogoH = (logoBoxH - 18) * scale;
    const logoRatio = customLogoImg.width / customLogoImg.height;
    let renderW = maxLogoW;
    let renderH = maxLogoW / logoRatio;
    if (renderH > maxLogoH) {
      renderH = maxLogoH;
      renderW = maxLogoH * logoRatio;
    }
    const renderX = logoBoxX + (logoBoxW - renderW) / 2;
    const renderY = logoBoxY + (logoBoxH - renderH) / 2;
    ctx.drawImage(customLogoImg, renderX, renderY, renderW, renderH);
  } else {
    // Globe / Icon circle on left
    const globeCenterX = logoBoxX + 36;
    const globeCenterY = logoBoxY + logoBoxH / 2;

    const gGrad = ctx.createLinearGradient(globeCenterX - 18, globeCenterY - 18, globeCenterX + 18, globeCenterY + 18);
    gGrad.addColorStop(0, '#2563EB');
    gGrad.addColorStop(0.5, '#0284C7');
    gGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Continent silhouettes inside globe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(globeCenterX - 4, globeCenterY - 4, 8, 0, Math.PI * 1.5);
    ctx.fill();

    // Logo text (Line 1: YOUR LOGO in orange-red, Line 2: Hindi subtext)
    const logoTextX = logoBoxX + 66;
    ctx.fillStyle = '#DC2626';
    ctx.font = '900 23px "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('YOUR LOGO', logoTextX, logoBoxY + 38);

    ctx.fillStyle = '#111827';
    ctx.font = '700 16px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपका लोगो रहेगा', logoTextX, logoBoxY + 65);
  }
  ctx.restore();

  // 4. BOTTOM AREA (Headline + CTA + Footer)
  // Background: Warm off-white subtle paper tone (#FAF8F5)
  const bottomY = photoH;
  const bottomH = height - photoH;
  ctx.save();
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(orangeBorderW, bottomY, width - orangeBorderW * 2, bottomH - orangeBorderW);

  // Subtle paper / cement noise lines across headline section
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
  ctx.lineWidth = 1;
  for (let ny = bottomY + 20; ny < height - 120; ny += 28) {
    ctx.beginPath();
    ctx.moveTo(orangeBorderW + 20, ny);
    ctx.lineTo(width - orangeBorderW - 20, ny);
    ctx.stroke();
  }
  ctx.restore();

  // 5. FIXED FOOTER (110px at bottom: Y = 1240 to 1350)
  await drawThemeFooterBar(
    ctx,
    width,
    height,
    110,
    card.socialHandle,
    card.whatsappNumber,
    card.customFooterPng,
    card.websiteUrl,
    card.activeSocialIcons as any,
    card.showMobileNumber,
    card.footerBgColor || '#FFE600',
    card.footerTextColor || '#000000',
    card.footerIconStyle || 'color'
  );

  // 6. DESCRIPTION CTA (Y = 1172)
  // Horizontal Red Line across with centered pill: [📄 पूरी खबर कमेंट बॉक्स में]
  const ctaLineY = 1172;
  ctx.save();
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(48, ctaLineY);
  ctx.lineTo(width - 48, ctaLineY);
  ctx.stroke();

  const pillW = 540;
  const pillH = 66;
  const pillX = (width - pillW) / 2;
  const pillY = ctaLineY - pillH / 2;

  ctx.shadowColor = 'rgba(201, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#C90000';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#990000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Document Icon inside pill
  const docX = pillX + 44;
  const docY = pillY + pillH / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(docX - 16, docY - 16, 28, 32, 4);
  ctx.fill();
  ctx.fillStyle = '#C90000';
  ctx.fillRect(docX - 11, docY - 9, 18, 3);
  ctx.fillRect(docX - 11, docY - 2, 18, 3);
  ctx.fillRect(docX - 11, docY + 5, 12, 3);

  // Exact text: "पूरी खबर कमेंट बॉक्स में" (Strictly single line)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 27px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('पूरी खबर कमेंट बॉक्स में', pillX + pillW / 2 + 16, docY);
  ctx.restore();

  // 7. HEADLINE AREA (Y = 730 to 1130)
  // Centered, Maximum 3 Lines, Black text with Orange Highlight support
  const maxHeadlineW = width - 120;
  const headlineAreaCenterY = (photoH + ctaLineY) / 2 - 15;
  const hasUserHeadline = card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार';

  if (!hasUserHeadline) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Line 1: YOUR (black) HEADLINE (orange #EA580C)
    const yourFont = '900 74px "Poppins", sans-serif';
    ctx.font = yourFont;
    const yourW = ctx.measureText('YOUR ').width;
    const headW = ctx.measureText('HEADLINE').width;
    const line1TotalW = yourW + headW;
    const line1StartX = width / 2 - line1TotalW / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.fillText('YOUR ', line1StartX, headlineAreaCenterY - 80);

    ctx.fillStyle = '#EA580C';
    ctx.fillText('HEADLINE', line1StartX + yourW, headlineAreaCenterY - 80);

    // Line 2: यहाँ आपकी (black) हेडलाइन (orange) आएगी (black)
    ctx.font = '900 58px "Baloo 2", sans-serif';
    const p1W = ctx.measureText('यहाँ आपकी ').width;
    const p2W = ctx.measureText('हेडलाइन ').width;
    const p3W = ctx.measureText('आएगी').width;
    const line2TotalW = p1W + p2W + p3W;
    const line2StartX = width / 2 - line2TotalW / 2;

    ctx.fillStyle = '#111827';
    ctx.fillText('यहाँ आपकी ', line2StartX, headlineAreaCenterY + 4);
    ctx.fillStyle = '#EA580C';
    ctx.fillText('हेडलाइन ', line2StartX + p1W, headlineAreaCenterY + 4);
    ctx.fillStyle = '#111827';
    ctx.fillText('आएगी', line2StartX + p1W + p2W, headlineAreaCenterY + 4);

    // Line 3: Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4B5563';
    ctx.font = '700 32px "Baloo 2", sans-serif';
    ctx.fillText('(अधिकतम 3 लाइन में, आपके टेक्स्ट के अनुसार)', width / 2, headlineAreaCenterY + 76);
    ctx.restore();
  } else {
    ctx.save();
    const rawHeadline = card.formattedHeadline || card.headline;
    const fontFam = card.headlineFontFamily || 'Baloo 2';
    const highlightColor = card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#EA580C';

    let testFontSize = 66;
    for (let s = 70; s >= 38; s -= 2) {
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, s, 0);
      if (testLines.length <= 3) {
        testFontSize = s;
        break;
      }
    }

    const headlineLineH = Math.round(testFontSize * 1.34);
    const headlineLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, testFontSize, 3);
    const totalHeadH = headlineLines.length * headlineLineH;
    let startY = headlineAreaCenterY - totalHeadH / 2 + Math.round(headlineLineH * 0.45);

    ctx.font = `900 ${testFontSize}px "${fontFam}", "Noto Sans Devanagari", sans-serif`;
    ctx.textBaseline = 'middle';

    for (const line of headlineLines) {
      let lineWidth = 0;
      for (const token of line) {
        lineWidth += ctx.measureText(token.text + ' ').width;
      }

      let curX = width / 2 - lineWidth / 2;
      for (const token of line) {
        ctx.fillStyle = token.isHighlight ? highlightColor : '#111827';
        ctx.fillText(token.text, curX, startY);
        curX += ctx.measureText(token.text + ' ').width;
      }
      startY += headlineLineH;
    }
    ctx.restore();
  }

  // 8. FINAL CRISP OUTER ORANGE BORDER (#EA580C)
  ctx.save();
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, width - 14, height - 14);
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// GRAPHIC 3 — NEWS GRAPHIC TEMPLATE (graphic_003)
// Aspect Ratio: STRICT 4:5 (1080 x 1350)
// Plan: PRO
// Full-Bleed Photo with Lower Dark Gradient Readability Overlay
// Top-Left Location & Date Pill, Top-Right Channel Logo Box
// Direct Headline Overlay (Max 3 lines, White + Golden-Yellow Highlight)
// Sleek Dark Bottom Fixed Social Footer Bar
// ============================================================================
async function drawGraphic003Canvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  ctx.save();

  // 1. FULL-BLEED PHOTO (Full Canvas 1080 x 1350)
  let hasValidPhoto = false;
  if (card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg') {
    try {
      const img = await loadImage(card.images.main);
      const crop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      const cropX = (crop.x ?? 50) / 100;
      const cropY = (crop.y ?? 50) / 100;
      const zoom = Math.max(1, crop.zoom || 1);
      drawImageCover(ctx, img, 0, 0, width, height, cropX, cropY, zoom);
      hasValidPhoto = true;
    } catch (e) {
      console.warn('Failed to load main image for graphic_003', e);
    }
  }

  if (!hasValidPhoto) {
    // Elegant Cinematic Full-Canvas Photo Placeholder
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(0.4, '#0F172A');
    bgGrad.addColorStop(0.8, '#020617');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Center photo placeholder badge
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2.5;
    const phW = 460;
    const phH = 150;
    const phX = (width - phW) / 2;
    const phY = height * 0.35;
    ctx.beginPath();
    ctx.roundRect(phX, phY, phW, phH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 38px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR PHOTO', width / 2, phY + 52);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '700 24px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपकी फुल-फ्रेम फोटो रहेगी', width / 2, phY + 104);
    ctx.restore();
  }

  // 2. READABILITY OVERLAYS (Top vignette & Lower strong gradient)
  // Top Vignette for Logo & Location clarity
  const topGrad = ctx.createLinearGradient(0, 0, 0, 240);
  topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  topGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 240);

  // Lower Dark Gradient Overlay for Headline & Footer
  // Starts around Y = 500 (transparent) and gets progressively darker towards bottom
  const botGrad = ctx.createLinearGradient(0, height * 0.42, 0, height);
  botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  botGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
  botGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.88)');
  botGrad.addColorStop(0.95, 'rgba(0, 0, 0, 0.98)');
  botGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, height * 0.42, width, height * 0.58);

  // 3. TOP-LEFT LOCATION & DATE BADGE
  if (card.showLocation !== false) {
    const locBoxX = 36;
    const locBoxY = 36;
    const locBoxW = 320;
    const locBoxH = 84;
    const locRadius = 14;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.beginPath();
    ctx.roundRect(locBoxX, locBoxY, locBoxW, locBoxH, locRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Red Location Pin on Left
    const pinCenterX = locBoxX + 36;
    const pinCenterY = locBoxY + locBoxH / 2;
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(pinCenterX, pinCenterY - 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinCenterX - 11, pinCenterY - 2);
    ctx.lineTo(pinCenterX + 11, pinCenterY - 2);
    ctx.lineTo(pinCenterX, pinCenterY + 14);
    ctx.closePath();
    ctx.fill();

    // White dot inside pin
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pinCenterX, pinCenterY - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Location text & date (Clean actual location only)
    const locTextX = locBoxX + 66;
    const cleanLoc = (card.location || '')
      .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
      .replace(/[:\-–—]+$/, '')
      .trim();
    ctx.fillStyle = '#000000';
    ctx.font = '900 24px "Noto Sans Devanagari", "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanLoc.slice(0, 24), locTextX, locBoxY + locBoxH / 2);
    ctx.restore();
  }

  // 4. TOP-RIGHT LOGO BOX
  const logoBoxW = 290;
  const logoBoxH = 84;
  const logoBoxX = width - logoBoxW - 36;
  const logoBoxY = 36;
  const logoRadius = 14;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.beginPath();
  ctx.roundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, logoRadius);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (customLogoImg) {
    const scale = card.logoScale ?? 1.25;
    const maxLogoW = (logoBoxW - 24) * scale;
    const maxLogoH = (logoBoxH - 18) * scale;
    const logoRatio = customLogoImg.width / customLogoImg.height;
    let renderW = maxLogoW;
    let renderH = maxLogoW / logoRatio;
    if (renderH > maxLogoH) {
      renderH = maxLogoH;
      renderW = maxLogoH * logoRatio;
    }
    const renderX = logoBoxX + (logoBoxW - renderW) / 2;
    const renderY = logoBoxY + (logoBoxH - renderH) / 2;
    ctx.drawImage(customLogoImg, renderX, renderY, renderW, renderH);
  } else {
    // Globe / Icon circle on left
    const globeCenterX = logoBoxX + 36;
    const globeCenterY = logoBoxY + logoBoxH / 2;

    const gGrad = ctx.createLinearGradient(globeCenterX - 18, globeCenterY - 18, globeCenterX + 18, globeCenterY + 18);
    gGrad.addColorStop(0, '#2563EB');
    gGrad.addColorStop(0.5, '#0284C7');
    gGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(globeCenterX - 4, globeCenterY - 4, 8, 0, Math.PI * 1.5);
    ctx.fill();

    const logoTextX = logoBoxX + 66;
    ctx.fillStyle = '#DC2626';
    ctx.font = '900 23px "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('YOUR LOGO', logoTextX, logoBoxY + 38);

    ctx.fillStyle = '#111827';
    ctx.font = '700 16px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपका लोगो रहेगा', logoTextX, logoBoxY + 65);
  }
  ctx.restore();

  // 5. FIXED FOOTER (100px at bottom: Y = 1250 to 1350)
  await drawThemeFooterBar(
    ctx,
    width,
    height,
    100,
    card.socialHandle,
    card.whatsappNumber,
    card.customFooterPng,
    card.websiteUrl,
    card.activeSocialIcons as any,
    card.showMobileNumber,
    card.footerBgColor || 'rgba(10, 15, 29, 0.95)',
    card.footerTextColor || '#FFFFFF',
    card.footerIconStyle || 'color'
  );

  // 6. LARGE BOLD HEADLINE DIRECT OVERLAY ON PHOTO (Y = 820 to 1220)
  // Directly on dark gradient overlay, Max 3 Lines, Crisp White with Golden-Yellow Highlight
  const maxHeadlineW = width - 120;
  const headlineAreaCenterY = (height * 0.58 + footerY) / 2 + 10;
  const hasUserHeadline = card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार';

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;

  if (!hasUserHeadline) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Line 1: YOUR (White) HEADLINE (Golden Yellow #FFE600)
    const yourFont = '900 78px "Poppins", sans-serif';
    ctx.font = yourFont;
    const yourW = ctx.measureText('YOUR ').width;
    const headW = ctx.measureText('HEADLINE').width;
    const line1TotalW = yourW + headW;
    const line1StartX = width / 2 - line1TotalW / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('YOUR ', line1StartX, headlineAreaCenterY - 84);

    ctx.fillStyle = '#FFE600';
    ctx.fillText('HEADLINE', line1StartX + yourW, headlineAreaCenterY - 84);

    // Line 2: यहाँ आपकी (White) हेडलाइन (Yellow) आएगी (White)
    ctx.font = '900 62px "Baloo 2", sans-serif';
    const p1W = ctx.measureText('यहाँ आपकी ').width;
    const p2W = ctx.measureText('हेडलाइन ').width;
    const p3W = ctx.measureText('आएगी').width;
    const line2TotalW = p1W + p2W + p3W;
    const line2StartX = width / 2 - line2TotalW / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('यहाँ आपकी ', line2StartX, headlineAreaCenterY + 6);
    ctx.fillStyle = '#FFE600';
    ctx.fillText('हेडलाइन ', line2StartX + p1W, headlineAreaCenterY + 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('आएगी', line2StartX + p1W + p2W, headlineAreaCenterY + 6);

    // Line 3: Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '700 34px "Baloo 2", sans-serif';
    ctx.fillText('(अधिकतम 3 लाइन में, आपके टेक्स्ट के अनुसार)', width / 2, headlineAreaCenterY + 84);
  } else {
    const rawHeadline = card.formattedHeadline || card.headline;
    const fontFam = card.headlineFontFamily || 'Baloo 2';
    const highlightColor = card.highlightColor && card.highlightColor !== '#DC2626' ? card.highlightColor : '#FFE600';

    let testFontSize = 70;
    for (let s = 76; s >= 38; s -= 2) {
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, s, 0);
      if (testLines.length <= 3) {
        testFontSize = s;
        break;
      }
    }

    const headlineLineH = Math.round(testFontSize * 1.34);
    const headlineLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadlineW, testFontSize, 3);
    const totalHeadH = headlineLines.length * headlineLineH;
    let startY = headlineAreaCenterY - totalHeadH / 2 + Math.round(headlineLineH * 0.45);

    ctx.font = `900 ${testFontSize}px "${fontFam}", "Noto Sans Devanagari", sans-serif`;
    ctx.textBaseline = 'middle';

    for (const line of headlineLines) {
      let lineWidth = 0;
      for (const token of line) {
        lineWidth += ctx.measureText(token.text + ' ').width;
      }

      let curX = width / 2 - lineWidth / 2;
      for (const token of line) {
        ctx.fillStyle = token.isHighlight ? highlightColor : '#FFFFFF';
        ctx.fillText(token.text, curX, startY);
        curX += ctx.measureText(token.text + ' ').width;
      }
      startY += headlineLineH;
    }
  }
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// GRAPHIC 4 — NEWS GRAPHIC TEMPLATE (graphic_004)
// Aspect Ratio: STRICT 4:5 (1080 x 1350)
// Plan: VIP DESK
// White Canvas with Thin Black Outer Border
// Top-Centered Logo Container flanked by Horizontal Black Accent Lines
// Bold High-Impact Centered Headline (Line 1 Black, Line 2 Bright Red)
// Additional Information / Sub-Headline (Black & Red Combo) + Separator Line
// Lower Photo Section (Single Photo or Dual-Photo Side-by-Side Collage)
// Tilted Distressed Red Rubber Stamp ("गिरफ्तार" / Custom) with 3D Gavel
// Fixed Solid Black Social Footer with Yellow Handles & Date Badge
// ============================================================================
async function drawGraphic004Canvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  ctx.save();

  // 1. PURE WHITE CANVAS BACKGROUND
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. TOP CENTER LOGO WITH FLANKING ACCENT LINES (Y: ~16 to ~96)
  const logoBoxW = 310;
  const logoBoxH = 78;
  const logoBoxX = (width - logoBoxW) / 2;
  const logoBoxY = 18;
  const logoRadius = 14;
  const lineY = logoBoxY + logoBoxH / 2;

  // Left & Right Horizontal Black Rules
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(24, lineY);
  ctx.lineTo(logoBoxX - 14, lineY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(logoBoxX + logoBoxW + 14, lineY);
  ctx.lineTo(width - 24, lineY);
  ctx.stroke();

  // Centered Logo Container
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#FFFBEB';
  ctx.beginPath();
  ctx.roundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, logoRadius);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (customLogoImg) {
    const scale = card.logoScale ?? 1.25;
    const maxLogoW = (logoBoxW - 24) * scale;
    const maxLogoH = (logoBoxH - 16) * scale;
    const logoRatio = customLogoImg.width / customLogoImg.height;
    let renderW = maxLogoW;
    let renderH = maxLogoW / logoRatio;
    if (renderH > maxLogoH) {
      renderH = maxLogoH;
      renderW = maxLogoH * logoRatio;
    }
    const renderX = logoBoxX + (logoBoxW - renderW) / 2;
    const renderY = logoBoxY + (logoBoxH - renderH) / 2;
    ctx.drawImage(customLogoImg, renderX, renderY, renderW, renderH);
  } else {
    // Globe / Icon circle on left
    const globeCenterX = logoBoxX + 42;
    const globeCenterY = logoBoxY + logoBoxH / 2;

    const gGrad = ctx.createLinearGradient(globeCenterX - 18, globeCenterY - 18, globeCenterX + 18, globeCenterY + 18);
    gGrad.addColorStop(0, '#2563EB');
    gGrad.addColorStop(0.5, '#0284C7');
    gGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(globeCenterX - 4, globeCenterY - 4, 8, 0, Math.PI * 1.5);
    ctx.fill();

    const logoTextX = logoBoxX + 74;
    ctx.fillStyle = '#DC2626';
    ctx.font = '900 23px "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('YOUR LOGO', logoTextX, logoBoxY + 36);

    ctx.fillStyle = '#111827';
    ctx.font = '700 16px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('यहाँ आपका लोगो रहेगा', logoTextX, logoBoxY + 63);
  }
  ctx.restore();

  // 3. MAIN HEADLINE SECTION (Y: 106 to 340)
  // Very Bold, Dominant Centered Typography (Line 1 Black, Line 2 Bright Red #DC2626)
  const hasUserHeadline = card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (!hasUserHeadline) {
    // Exact sample reference text:
    // Line 1: पन्ना कलेक्टर को (Black, ~88px)
    // Line 2: गिरफ्तार कर पेश करो! (Red, ~102px)
    ctx.fillStyle = '#000000';
    ctx.font = '900 88px "Baloo 2", sans-serif';
    ctx.fillText('पन्ना कलेक्टर को', width / 2, 168);

    ctx.fillStyle = '#DC2626';
    ctx.font = '900 102px "Baloo 2", sans-serif';
    ctx.fillText('गिरफ्तार कर पेश करो!', width / 2, 272);
  } else {
    const rawHeadline = card.formattedHeadline || card.headline;
    const fontFam = card.headlineFontFamily || 'Baloo 2';
    const highlightColor = card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626';

    const maxHeadW = width - 80;
    let headFontSize = 80;
    for (let s = 88; s >= 46; s -= 2) {
      const testLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadW, s, 0);
      if (testLines.length <= 3) {
        headFontSize = s;
        break;
      }
    }

    const headLineH = Math.round(headFontSize * 1.28);
    const headLines = getHeadlineLines(ctx, rawHeadline, card.highlightWords, maxHeadW, headFontSize, 3);
    const totalHeadH = headLines.length * headLineH;
    let startY = 224 - totalHeadH / 2 + Math.round(headLineH * 0.44);

    ctx.font = `900 ${headFontSize}px "${fontFam}", "Noto Sans Devanagari", sans-serif`;

    headLines.forEach((line, lineIdx) => {
      let lineWidth = 0;
      for (const token of line) {
        lineWidth += ctx.measureText(token.text + ' ').width;
      }
      let curX = width / 2 - lineWidth / 2;

      for (const token of line) {
        const defaultColor = lineIdx === 0 ? '#000000' : '#DC2626';
        ctx.fillStyle = token.isHighlight ? highlightColor : defaultColor;
        ctx.fillText(token.text, curX, startY);
        curX += ctx.measureText(token.text + ' ').width;
      }
      startY += headLineH;
    });
  }
  ctx.restore();

  // 4. ADDITIONAL INFORMATION / SUB-HEADLINE (Y: 345 to 440)
  // Centered, Max 2 lines: Line 1 Black, Line 2 Red
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const userAddInfo = card.additionalInfo && card.additionalInfo.trim().length > 0 ? card.additionalInfo.trim() : '';

  if (!userAddInfo) {
    // Exact sample reference text:
    // Line 1: एमपी हाईकोर्ट का सख्त आदेश, (Black, 42px)
    // Line 2: प्रशासनिक महकमे में मचा हड़कंप! (Red, 45px)
    ctx.fillStyle = '#000000';
    ctx.font = '900 42px "Baloo 2", sans-serif';
    ctx.fillText('एमपी हाईकोर्ट का सख्त आदेश,', width / 2, 368);

    ctx.fillStyle = '#DC2626';
    ctx.font = '900 45px "Baloo 2", sans-serif';
    ctx.fillText('प्रशासनिक महकमे में मचा हड़कंप!', width / 2, 418);
  } else {
    const parts = userAddInfo.split('\n');
    if (parts.length === 1) {
      ctx.fillStyle = '#000000';
      ctx.font = '900 40px "Baloo 2", sans-serif';
      ctx.fillText(parts[0], width / 2, 392);
    } else {
      ctx.fillStyle = '#000000';
      ctx.font = '900 40px "Baloo 2", sans-serif';
      ctx.fillText(parts[0], width / 2, 370);

      ctx.fillStyle = '#DC2626';
      ctx.font = '900 42px "Baloo 2", sans-serif';
      ctx.fillText(parts[1], width / 2, 416);
    }
  }
  ctx.restore();

  // 5. HORIZONTAL DIVIDER RULE (Y = 448)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(20, 448);
  ctx.lineTo(width - 20, 448);
  ctx.stroke();

  // 6. PHOTO SECTION (Y: 450 to 1240, Height: 790px)
  // Supports Single Photo OR Dual Photo Collage (Photo 1 + Photo 2 side-by-side)
  const photoY = 452;
  const photoH = 788;
  const photoW = width - 40; // 1040
  const photoX = 20;

  const hasPhoto1 = card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg';
  const secondPhotoUrl = card.secondaryPhoto || card.images?.secondary;
  const hasPhoto2 = secondPhotoUrl && secondPhotoUrl.trim().length > 0;

  if (hasPhoto2 && hasPhoto1) {
    // Dual Photo Collage: Left Photo (50%) + Right Photo (50%) with 6px white separator
    const singleW = (photoW - 6) / 2;
    try {
      const img1 = await loadImage(card.images.main);
      const crop1 = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      drawImageCover(ctx, img1, photoX, photoY, singleW, photoH, (crop1.x ?? 50) / 100, (crop1.y ?? 50) / 100, crop1.zoom || 1);
    } catch (e) {
      console.warn('Failed to load dual photo 1', e);
    }

    try {
      const img2 = await loadImage(secondPhotoUrl);
      drawImageCover(ctx, img2, photoX + singleW + 6, photoY, singleW, photoH, 0.5, 0.5, 1);
    } catch (e) {
      console.warn('Failed to load dual photo 2', e);
    }

    // White dividing vertical line
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(photoX + singleW, photoY, 6, photoH);
  } else if (hasPhoto1) {
    // Single Full-Width Photo
    try {
      const img = await loadImage(card.images.main);
      const crop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      drawImageCover(ctx, img, photoX, photoY, photoW, photoH, (crop.x ?? 50) / 100, (crop.y ?? 50) / 100, crop.zoom || 1);
    } catch (e) {
      console.warn('Failed to load main photo for graphic_004', e);
    }
  } else {
    // Dual-Photo Sample / Placeholder Collage
    const singleW = (photoW - 6) / 2;

    // Left Placeholder
    const lGrad = ctx.createLinearGradient(photoX, photoY, photoX + singleW, photoY + photoH);
    lGrad.addColorStop(0, '#334155');
    lGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = lGrad;
    ctx.fillRect(photoX, photoY, singleW, photoH);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 28px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHOTO 1', photoX + singleW / 2, photoY + photoH / 2 - 20);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '700 18px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('मुख्य संबंधित तस्वीर', photoX + singleW / 2, photoY + photoH / 2 + 18);
    ctx.restore();

    // Right Placeholder
    const rGrad = ctx.createLinearGradient(photoX + singleW + 6, photoY, photoX + photoW, photoY + photoH);
    rGrad.addColorStop(0, '#1E293B');
    rGrad.addColorStop(1, '#020617');
    ctx.fillStyle = rGrad;
    ctx.fillRect(photoX + singleW + 6, photoY, singleW, photoH);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 28px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHOTO 2', photoX + singleW + 6 + singleW / 2, photoY + photoH / 2 - 20);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '700 18px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('संदर्भ / कार्रवाई तस्वीर', photoX + singleW + 6 + singleW / 2, photoY + photoH / 2 + 18);
    ctx.restore();

    // White dividing vertical line
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(photoX + singleW, photoY, 6, photoH);
  }

  // 7. SPECIAL HIGHLIGHT ELEMENT: TILTED RED RUBBER STAMP WITH 3D GAVEL
  if (card.showGraphic004Stamp !== false) {
    ctx.save();
    const stampText = card.graphic004StampText || 'गिरफ्तार';

    // Position of stamp center
    const stampCenterX = 525;
    const stampCenterY = 1010;
    ctx.translate(stampCenterX, stampCenterY);
    ctx.rotate((-11 * Math.PI) / 180);

    const sW = 460;
    const sH = 144;
    const sRadius = 14;

    // Distressed Outer Red Border Box
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = '#C90000';
    ctx.beginPath();
    ctx.roundRect(-sW / 2, -sH / 2, sW, sH, sRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White Inner Frame Line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-sW / 2 + 8, -sH / 2 + 8, sW - 16, sH - 16, sRadius - 4);
    ctx.stroke();

    // Second Thin White Line (Double stamp effect)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-sW / 2 + 15, -sH / 2 + 15, sW - 30, sH - 30, sRadius - 6);
    ctx.stroke();

    // Stamp Hindi Text in Bold White
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 84px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stampText, 0, 4);

    // Grunge stamp overlay speckles
    ctx.fillStyle = 'rgba(201, 0, 0, 0.35)';
    for (let i = 0; i < 15; i++) {
      const rx = (Math.sin(i * 12.3) * sW) / 2.2;
      const ry = (Math.cos(i * 9.7) * sH) / 2.2;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3D JUDGE'S GAVEL ICON (Right of the stamp, resting on sound block)
    ctx.save();
    const gavelBaseX = 850;
    const gavelBaseY = 1060;

    // Sound Block Base
    const sbGrad = ctx.createLinearGradient(gavelBaseX - 110, gavelBaseY, gavelBaseX + 110, gavelBaseY);
    sbGrad.addColorStop(0, '#261108');
    sbGrad.addColorStop(0.5, '#5C2B14');
    sbGrad.addColorStop(1, '#1A0B05');
    ctx.fillStyle = sbGrad;
    ctx.beginPath();
    ctx.ellipse(gavelBaseX, gavelBaseY + 32, 105, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sound Block Top Rim Highlight
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(gavelBaseX, gavelBaseY + 22, 90, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Gavel Head & Handle (Tilted)
    ctx.translate(gavelBaseX + 10, gavelBaseY - 30);
    ctx.rotate((18 * Math.PI) / 180);

    // Handle
    const hGrad = ctx.createLinearGradient(-15, -120, 15, -120);
    hGrad.addColorStop(0, '#3E1C0D');
    hGrad.addColorStop(0.5, '#7C3A1D');
    hGrad.addColorStop(1, '#2E150A');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.roundRect(-9, -135, 18, 140, 8);
    ctx.fill();

    // Gavel Head Cylinder
    const headW = 100;
    const headH = 50;
    const ghGrad = ctx.createLinearGradient(-headW / 2, 0, headW / 2, 0);
    ghGrad.addColorStop(0, '#3E1C0D');
    ghGrad.addColorStop(0.35, '#683118');
    ghGrad.addColorStop(0.5, '#EAB308');
    ghGrad.addColorStop(0.65, '#FACC15');
    ghGrad.addColorStop(0.7, '#683118');
    ghGrad.addColorStop(1, '#2E150A');
    ctx.fillStyle = ghGrad;
    ctx.beginPath();
    ctx.roundRect(-headW / 2, -headH / 2, headW, headH, 10);
    ctx.fill();

    // Brass metal ring accent lines
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -headH / 2);
    ctx.lineTo(-6, headH / 2);
    ctx.moveTo(12, -headH / 2);
    ctx.lineTo(12, headH / 2);
    ctx.stroke();

    ctx.restore();
  }

  // 8. FIXED SOLID BLACK FOOTER (Y: 1240 to 1350, Height: 110px)
  const footerH = 110;
  const footerY = height - footerH;

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, footerY, width, footerH);

  // Top white border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  // Social Icons on Left
  const iconY = footerY + footerH / 2 - 2;
  const iconRadius = 18;
  let curIconX = 40;

  // YouTube Red
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.arc(curIconX, iconY, iconRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(curIconX - 4, iconY - 7);
  ctx.lineTo(curIconX + 7, iconY);
  ctx.lineTo(curIconX - 4, iconY + 7);
  ctx.closePath();
  ctx.fill();

  // Facebook Blue
  curIconX += 44;
  ctx.fillStyle = '#1877F2';
  ctx.beginPath();
  ctx.arc(curIconX, iconY, iconRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 22px "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('f', curIconX, iconY + 2);

  // Instagram Gradient
  curIconX += 44;
  const igGrad = ctx.createLinearGradient(curIconX - iconRadius, iconY + iconRadius, curIconX + iconRadius, iconY - iconRadius);
  igGrad.addColorStop(0, '#FFDC80');
  igGrad.addColorStop(0.3, '#F77737');
  igGrad.addColorStop(0.6, '#F56040');
  igGrad.addColorStop(0.8, '#FD1D1D');
  igGrad.addColorStop(1, '#833AB4');
  ctx.fillStyle = igGrad;
  ctx.beginPath();
  ctx.arc(curIconX, iconY, iconRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(curIconX - 9, iconY - 9, 18, 18, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(curIconX, iconY, 4.5, 0, Math.PI * 2);
  ctx.stroke();

  // WhatsApp Green
  curIconX += 44;
  ctx.fillStyle = '#25D366';
  ctx.beginPath();
  ctx.arc(curIconX, iconY, iconRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(curIconX, iconY - 1, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#25D366';
  ctx.beginPath();
  ctx.arc(curIconX, iconY - 1, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Handle (in Yellow #FFE600 - NO divider between icons and handle)
  curIconX += 16;
  ctx.fillStyle = '#FFE600';
  ctx.font = '900 25px "Poppins", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const handleText = card.socialHandle || '@YourChannel';
  ctx.fillText(handleText, curIconX, iconY);
  curIconX += ctx.measureText(handleText).width + 16;

  // Vertical Separator
  ctx.strokeStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(curIconX, footerY + 24);
  ctx.lineTo(curIconX, footerY + footerH - 26);
  ctx.stroke();

  // Website (in Yellow #FFE600 with Blue Globe)
  curIconX += 16;
  ctx.fillStyle = '#0284C7';
  ctx.font = '24px "Noto Color Emoji", sans-serif';
  ctx.fillText('🌐', curIconX, iconY);
  curIconX += 32;
  ctx.fillStyle = '#FFE600';
  ctx.font = '700 24px "Poppins", sans-serif';
  const siteText = card.websiteUrl || 'yourwebsite.com';
  ctx.fillText(siteText, curIconX, iconY);

  // Right Date Badge: DATE / यहाँ तारीख आएगी (White Rounded Box on Black)
  const badgeW = 160;
  const badgeH = 74;
  const badgeX = width - badgeW - 24;
  const badgeY = footerY + (footerH - badgeH) / 2;

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 18px "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('DATE', badgeX + badgeW / 2, badgeY + 34);

  ctx.fillStyle = '#E5E7EB';
  ctx.font = '700 13px "Noto Sans Devanagari", sans-serif';
  const dateStr = card.date && card.date.trim().length > 0 ? card.date.trim() : 'यहाँ तारीख आएगी';
  ctx.fillText(dateStr, badgeX + badgeW / 2, badgeY + 58);
  ctx.restore();

  // 9. CRISP OUTER BLACK FRAME BORDER (8px)
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, width - 10, height - 10);
  ctx.restore();

  ctx.restore();
}

// Draw Default Jacket Content (Clean White, Pink Location Tag, YOUR LOGO, 3-Line Headline, Gray Footer Bar)
async function drawDefaultJacketContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  ctx.save();

  // 1. Fill canvas with crisp pure white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. If photo is present (not fallback placeholder), draw it in middle area
  if (card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg') {
    try {
      const img = await loadImage(card.images.main);
      const crop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
      const cropX = (crop.x ?? 50) / 100;
      const cropY = (crop.y ?? 50) / 100;
      const zoom = Math.max(1, crop.zoom || 1);
      drawImageCover(ctx, img, 48, 160, width - 96, Math.round(height * 0.46), cropX, cropY, zoom);
    } catch (e) {
      console.warn('Failed to load image in default jacket', e);
    }
  }

  // 3. Top-Left: Location Pill with Pink/Magenta border
  if (card.showLocation !== false) {
    const locText = card.location || 'खबर की लोकेशन';
    ctx.font = '800 28px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(locText).width;
    const boxX = 48;
    const boxY = 48;
    const boxW = textW + 68;
    const boxH = 54;
    const radius = 10;

    // White rounded box
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    // Magenta/Pink border #E11D48
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Magenta Map Pin icon
    const pinX = boxX + 26;
    const pinY = boxY + boxH / 2 - 2;
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinX - 7, pinY + 1);
    ctx.lineTo(pinX + 7, pinY + 1);
    ctx.lineTo(pinX, pinY + 14);
    ctx.closePath();
    ctx.fill();

    // Location text
    ctx.fillStyle = '#111827';
    ctx.fillText(locText, boxX + 46, boxY + boxH / 2 + 1);
  }

  // 4. Top-Right: YOUR LOGO or Custom Logo (with user logoScale) - only if master branding enabled
  if (card.showMasterBranding !== false) {
    const userScale = Math.max(0.5, Math.min(2.0, card.logoScale ?? 1.25));
    if (customLogoImg) {
      const maxLogoW = 240 * userScale;
      const maxLogoH = 100 * userScale;
      const scale = Math.min(maxLogoW / customLogoImg.width, maxLogoH / customLogoImg.height);
      const drawW = customLogoImg.width * scale;
      const drawH = customLogoImg.height * scale;
      ctx.drawImage(customLogoImg, width - 48 - drawW, 48, drawW, drawH);
    } else {
      // "YOUR LOGO" stacked vertically in bold black
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      const logoFontSize = Math.round(48 * userScale);
      ctx.font = `900 ${logoFontSize}px "Mukta", sans-serif`;
      ctx.letterSpacing = '2px';
      ctx.fillText('YOUR', width - 48, 48 + Math.round(38 * userScale));
      ctx.fillText('LOGO', width - 48, 48 + Math.round(86 * userScale));
      ctx.letterSpacing = '0px';
    }
  }

  // 5. Clean Center-Aligned Footer Bar at the bottom
  const footerBarH = 76;
  const footerY = height - footerBarH;
  if (card.showMasterBranding !== false) {
    await drawThemeFooterBar(
      ctx,
      width,
      height,
      footerBarH,
      card.socialHandle,
      card.whatsappNumber,
      card.customFooterPng,
      card.websiteUrl,
      card.activeSocialIcons as any,
      card.showMobileNumber,
      card.footerBgColor || '#FFFFFF',
      card.footerTextColor,
      card.footerIconStyle || 'color'
    );
  }

  // 6. Headline: 2-3 lines centered, bold black, positioned cleanly in lower-middle above footer
  const rawHeadline = card.headline || 'आपकी चुनी गयी खबर को यहां\nपर २-३ लाइन में लिखा जाएगा\nटेम्पलेट्स से पसंदीदा फ्रेम चुनें';
  const headlineLines = rawHeadline.split('\n').filter(Boolean);
  
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.max(36, Math.min(54, Math.round((card.headlineFontSize || 33) * 1.35)));
  const headlineFont = card.headlineFontFamily || 'Baloo 2';
  ctx.font = `800 ${fontSize}px "${headlineFont}", "Noto Sans Devanagari", sans-serif`;
  const lineHeight = Math.round(fontSize * 1.38);

  const totalHeadlineH = headlineLines.length * lineHeight;
  const headlineCenterY = footerY - (totalHeadlineH / 2) - 50;
  const startY = headlineCenterY - ((headlineLines.length - 1) * lineHeight) / 2;

  headlineLines.forEach((line, idx) => {
    ctx.fillText(line.trim(), width / 2, startY + idx * lineHeight);
  });

  ctx.restore();
}

// Draw Morning Jacket Content (Headline, Sub-intro, Section Title, Cards, Takeaway, Note & Centered Callout Tag)
async function drawMorningJacketContent(
  ctx: CanvasRenderingContext2D,
  card: NewsCardData,
  width: number,
  height: number,
  footerBarHeight: number,
  headerHeight: number
) {
  ctx.save();

  // =========================================================================
  // SINGLE SUVICHAR / MORNING JACKET (RICH THEMES & EXPANDABLE SIZING)
  // =========================================================================
  // Safe area between header and footer
  const availableTop = headerHeight + 12;
  const availableBottom = height - footerBarHeight - 14;
  const availableH = availableBottom - availableTop;

  // Box width based on card.morningBoxWidth ('standard' = 90%, 'wide' = 94%, 'expanded' = 97%)
  const widthRatio = card.morningBoxWidth === 'expanded' ? 0.97 : (card.morningBoxWidth === 'wide' ? 0.94 : 0.90);
  const boxW = Math.round(width * widthRatio);
  const boxX = Math.round((width - boxW) / 2);

  // Font calculations - Scales headline font size to 1080px canvas (allows larger text up to 94px)
  let hlFontSize = Math.round((card.headlineFontSize || 26) * 2.2);
  hlFontSize = Math.max(38, Math.min(94, hlFontSize));
  const hlLineH = Math.round(hlFontSize * 1.36);

  // Raw headline containing [yellow]...[/yellow] tags
  const rawHeadline = card.formattedHeadline || card.headline || '';

  ctx.font = `900 ${hlFontSize}px "Baloo 2", "Noto Sans Devanagari", sans-serif`;
  const tokenLines = getHeadlineLines(
    ctx,
    rawHeadline,
    card.highlightWords || [],
    boxW - 90,
    hlFontSize,
    7 // Allow up to 7 lines comfortably
  );
  const totalHlH = tokenLines.length * hlLineH;

  // Sub-quote text calculations
  const subText = card.morningThoughtQuote || card.morningTakeaway || card.morningSubIntro || '';
  let subFontSize = Math.round((card.morningSubQuoteFontSize || 14) * 1.9);
  subFontSize = Math.max(22, Math.min(42, subFontSize));
  const subLineH = Math.round(subFontSize * 1.36);

  ctx.font = `600 ${subFontSize}px "Baloo 2", "Noto Sans Devanagari", sans-serif`;
  const subLines = subText ? wrapTextIntoLines(ctx, subText, boxW - 100) : [];
  const totalSubH = subLines.length > 0 ? (subLines.length * subLineH + 54) : 0;

  // Natural content height calculation
  const quoteMarkH = card.morningShowQuotes !== false ? 50 : 0;
  const topPadding = 56;
  const bottomPadding = 48;
  const contentTotalH = topPadding + quoteMarkH + totalHlH + totalSubH + bottomPadding;

  // Box Height calculation based on morningBoxHeightMode:
  // 'auto': naturally hugs content based on larger font
  // 'expanded': fills at least 72% of safe height
  // 'fill-safe-area': fills up to 84% of safe height so header/footer don't look empty
  let targetBoxH = contentTotalH;
  if (card.morningBoxHeightMode === 'fill-safe-area') {
    targetBoxH = Math.max(contentTotalH, Math.round(availableH * 0.84));
  } else if (card.morningBoxHeightMode === 'expanded') {
    targetBoxH = Math.max(contentTotalH, Math.round(availableH * 0.72));
  }

  const boxH = Math.min(availableH - 8, Math.max(280, targetBoxH));
  const boxY = Math.round(availableTop + (availableH - boxH) / 2);

  // Extra space distribution for vertical centering
  const extraVertical = Math.max(0, boxH - contentTotalH);
  const verticalShift = Math.round(extraVertical / 2);

  const designStyle = card.morningDesignStyle || 'frosted-obsidian';
  const isCinematic = designStyle === 'cinematic-text';
  const isIvory = designStyle === 'editorial-ivory';
  const isRoyal = designStyle === 'royal-gold';
  const isDivine = designStyle === 'spiritual-divine';
  const isEmerald = designStyle === 'emerald-zen';

  if (!isCinematic) {
    // Render the card box according to theme
    if (isRoyal) {
      // 1. Royal Gold Theme (Velvet Dark Obsidian with Double Gold Border & Ornamental Trim)
      ctx.fillStyle = 'rgba(14, 10, 8, 0.90)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.fill();

      // Outer gold border
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.stroke();

      // Inner thin gold border
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, boxX + 8, boxY + 8, boxW - 16, boxH - 16, 22);
      ctx.stroke();

      // Soft amber center glow
      const glow = ctx.createRadialGradient(width / 2, boxY + boxH / 2, 20, width / 2, boxY + boxH / 2, 380);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.fill();
    } else if (isDivine) {
      // 2. Spiritual Divine Theme (Sacred Deep Saffron Amber with Glowing Aura)
      ctx.fillStyle = 'rgba(28, 12, 4, 0.88)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();

      // Saffron to Gold border gradient
      const divineGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      divineGrad.addColorStop(0, '#EA580C');
      divineGrad.addColorStop(0.5, '#F59E0B');
      divineGrad.addColorStop(1, '#EA580C');
      ctx.strokeStyle = divineGrad;
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.stroke();

      const glow = ctx.createRadialGradient(width / 2, boxY + 30, 20, width / 2, boxY + 30, 320);
      glow.addColorStop(0, 'rgba(234, 88, 12, 0.25)');
      glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = glow;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();
    } else if (isIvory) {
      // 3. Editorial Ivory Theme (Frosted Ivory White Card with Luxury Gold & Charcoal)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.fill();

      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.stroke();

      // Soft inner hairline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, boxX + 6, boxY + 6, boxW - 12, boxH - 12, 24);
      ctx.stroke();
    } else if (isEmerald) {
      // 4. Emerald Zen Theme (Deep Forest Jade with Golden Accents)
      ctx.fillStyle = 'rgba(6, 32, 18, 0.88)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.stroke();

      const glow = ctx.createRadialGradient(width / 2, boxY + 20, 15, width / 2, boxY + 20, 280);
      glow.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      glow.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glow;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();
    } else {
      // Default: 'frosted-obsidian'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.stroke();

      const glow = ctx.createRadialGradient(width / 2, boxY + 10, 10, width / 2, boxY + 10, 300);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32);
      ctx.fill();
    }
  } else {
    // 'cinematic-text': Full-width dark ambient scrim (no enclosing card box)
    const scrimGrad = ctx.createLinearGradient(0, availableTop, 0, availableBottom);
    scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    scrimGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.72)');
    scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, availableTop, width, availableH);
  }

  // 2. Top Attached Badge (Golden / Saffron / Jade / Crimson pill)
  const badgeText = card.morningBadgeText || '🌅 आज का विचार';
  ctx.font = '900 24px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = badgeTextW + 68;
  const badgeH = 54;
  const badgeX = Math.round(width / 2 - badgeW / 2);
  const badgeY = Math.round(boxY - badgeH / 2);

  const bGrad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0);
  if (isDivine) {
    bGrad.addColorStop(0, '#EA580C');
    bGrad.addColorStop(0.5, '#F59E0B');
    bGrad.addColorStop(1, '#EA580C');
  } else if (isEmerald) {
    bGrad.addColorStop(0, '#047857');
    bGrad.addColorStop(0.5, '#10B981');
    bGrad.addColorStop(1, '#047857');
  } else if (isRoyal) {
    bGrad.addColorStop(0, '#B45309');
    bGrad.addColorStop(0.5, '#F59E0B');
    bGrad.addColorStop(1, '#B45309');
  } else {
    bGrad.addColorStop(0, '#F59E0B');
    bGrad.addColorStop(0.5, '#FACC15');
    bGrad.addColorStop(1, '#F59E0B');
  }
  ctx.fillStyle = bGrad;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 27);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 27);
  ctx.stroke();

  ctx.fillStyle = isEmerald ? '#FFFFFF' : '#0A0A0A';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, width / 2, badgeY + badgeH / 2 + 2);
  ctx.textBaseline = 'top';

  // 3. Quotation Mark
  let innerY = boxY + topPadding + verticalShift;
  if (card.morningShowQuotes !== false) {
    ctx.font = 'bold 54px serif';
    ctx.fillStyle = isIvory ? '#B45309' : (isEmerald ? '#6EE7B7' : '#FACC15');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('“', width / 2, innerY);
    innerY += quoteMarkH;
  }

  // 4. Headline (White & Yellow or Dark Charcoal & Ruby in Ivory)
  const hlColor = isIvory ? (card.highlightColor || '#B45309') : (isEmerald ? '#FACC15' : (card.highlightColor || '#FFE600'));
  drawRenderedHeadlineLines(
    ctx,
    tokenLines,
    hlColor,
    width,
    innerY,
    hlFontSize,
    hlLineH,
    card.morningTextAlignment || 'center',
    boxX + 45,
    isIvory, // isLightBackground
    false    // disableStroke
  );
  innerY += totalHlH;

  // 5. Sub-quote / Takeaway below divider
  if (subLines.length > 0) {
    innerY += 16;

    // Divider
    const divGrad = ctx.createLinearGradient(boxX + 45, 0, boxX + boxW - 45, 0);
    if (isIvory) {
      divGrad.addColorStop(0, 'rgba(180, 83, 9, 0.1)');
      divGrad.addColorStop(0.5, '#D97706');
      divGrad.addColorStop(1, 'rgba(180, 83, 9, 0.1)');
    } else {
      divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      divGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.65)');
      divGrad.addColorStop(0.5, '#FDE047');
      divGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.65)');
      divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    }

    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 45, innerY);
    ctx.lineTo(boxX + boxW - 45, innerY);
    ctx.stroke();

    innerY += 24;

    ctx.font = `600 ${subFontSize}px "Baloo 2", "Noto Sans Devanagari", sans-serif`;
    ctx.fillStyle = isIvory ? '#374151' : (isEmerald ? '#D1FAE5' : '#FEF08A');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    subLines.forEach((sLine) => {
      ctx.fillText(sLine, width / 2, innerY);
      innerY += subLineH;
    });
  }

  // NOTE: card.showCallout ("पूरी खबर डिस्क्रिप्शन में") is completely deleted from Morning Jacket per user instruction!

  ctx.restore();
}

// Helper: Draw text line with true newspaper justification (spacing out words flush to margins)
function drawJustifiedLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  targetWidth: number,
  isLastLineOfParagraph: boolean = false
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || isLastLineOfParagraph) {
    // Normal left-aligned for last line of paragraph or single word
    ctx.textAlign = 'left';
    ctx.fillText(trimmed, x, y);
    return;
  }

  // Calculate width of each word
  let totalWordsWidth = 0;
  const wordWidths: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = ctx.measureText(words[i]).width;
    wordWidths.push(w);
    totalWordsWidth += w;
  }

  const spaceSlots = words.length - 1;
  const remainingSpace = targetWidth - totalWordsWidth;
  const standardSpaceWidth = ctx.measureText(' ').width;

  // Safeguard: if words are too wide, or if space would stretch absurdly (> 3.2x normal space), fall back to left
  if (remainingSpace <= 0 || (remainingSpace / spaceSlots) > standardSpaceWidth * 3.2) {
    ctx.textAlign = 'left';
    ctx.fillText(trimmed, x, y);
    return;
  }

  const spaceWidth = remainingSpace / spaceSlots;
  let currentX = x;
  ctx.textAlign = 'left';

  for (let i = 0; i < words.length; i++) {
    ctx.fillText(words[i], currentX, y);
    currentX += wordWidths[i] + spaceWidth;
  }
}

// Helper: Wrap story text into lines while remembering which line ends a paragraph
interface WrappedStoryLine {
  text: string;
  isParagraphEnd: boolean;
}

function wrapStoryIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): WrappedStoryLine[] {
  const rawParagraphs = text.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
  const result: WrappedStoryLine[] = [];

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const pText = rawParagraphs[pIdx];
    const words = pText.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const testLine = currentLine ? `${currentLine} ${words[wIdx]}` : words[wIdx];
      const testW = ctx.measureText(testLine).width;

      if (testW <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          result.push({ text: currentLine, isParagraphEnd: false });
        }
        currentLine = words[wIdx];
      }
    }

    if (currentLine) {
      result.push({ text: currentLine, isParagraphEnd: true });
    }
  }

  return result;
}

// Helper: Resolve authentic e-paper font family and background for canvas export
function getCanvasEpaperFont(card: NewsCardData): string {
  switch (card.epaperFontFamily) {
    case 'serif-traditional':
      return '"Noto Serif Devanagari", Georgia, serif';
    case 'serif-martel':
      return '"Martel", Georgia, serif';
    case 'sans-modern':
      return '"Noto Sans Devanagari", sans-serif';
    case 'baloo':
      return '"Baloo 2", cursive, sans-serif';
    default:
      return '"Noto Serif Devanagari", Georgia, serif';
  }
}

function getCanvasEpaperPaperBg(card: NewsCardData): string {
  if (card.epaperTheme === 'pure-white') return '#FFFFFF';
  return '#FAF8F2';
}

// Helper: Draw Leader / Official Quote Callout Box
function drawEpaperQuoteBox(
  ctx: CanvasRenderingContext2D,
  quoteText: string,
  speakerName: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  fontFamily: string = '"Baloo 2", sans-serif'
) {
  ctx.fillStyle = '#FEF2F2';
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.stroke();

  // Left red accent bar
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, 6, boxH, [8, 0, 0, 8]);
  ctx.fill();

  // Large quotation mark & header
  ctx.font = `900 24px ${fontFamily}`;
  ctx.fillStyle = '#DC2626';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('“', boxX + 16, boxY + 8);

  ctx.font = `800 16px ${fontFamily}`;
  ctx.fillStyle = '#991B1B';
  ctx.fillText('बयान / प्रतिक्रिया', boxX + 38, boxY + 12);

  // Quote text wrapped
  ctx.font = `italic 700 16px ${fontFamily}`;
  ctx.fillStyle = '#1F2937';
  const qLines = wrapTextIntoLines(ctx, `"${quoteText}"`, boxW - 32).slice(0, 4);
  let qY = boxY + 36;
  qLines.forEach((line) => {
    ctx.fillText(line, boxX + 16, qY);
    qY += 22;
  });

  // Speaker name
  if (speakerName) {
    ctx.font = `900 15px ${fontFamily}`;
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'right';
    ctx.fillText(`— ${speakerName}`, boxX + boxW - 16, boxY + boxH - 22);
  }
}

// Helper: Draw E-Paper Highlights / Key Points Inset Box
function drawEpaperHighlightsBox(
  ctx: CanvasRenderingContext2D,
  card: NewsCardData,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  fontFamily: string = '"Baloo 2", sans-serif'
) {
  ctx.fillStyle = '#FFFDF5';
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.stroke();

  // Red accent on left border
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, 6, boxH, [8, 0, 0, 8]);
  ctx.fill();

  // Highlights Box Title
  let hlY = boxY + 12;
  ctx.font = `900 19px ${fontFamily}`;
  ctx.fillStyle = '#B91C1C';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`📍 ${card.epaperHighlightsTitle || 'मुख्य बिंदु'}`, boxX + 16, hlY);
  hlY += 28;

  // Hairline separator inside box
  ctx.strokeStyle = '#FEE2E2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 14, hlY);
  ctx.lineTo(boxX + boxW - 14, hlY);
  ctx.stroke();
  hlY += 10;

  // Highlights Bullets
  const highlights = (card.epaperHighlights && card.epaperHighlights.length > 0)
    ? card.epaperHighlights.slice(0, 4)
    : [
        'प्रशासनिक दल ने मौके पर पहुंचकर की त्वरित कार्रवाई',
        'दोषियों के विरुद्ध सख्त वैधानिक धाराओं में केस दर्ज',
      ];

  const hlBulletSpacing = Math.max(4, Math.min(14, Math.floor((boxH - (hlY - boxY) - highlights.length * 40) / highlights.length)));

  highlights.forEach((hlItem) => {
    ctx.font = `700 18px ${fontFamily}`;
    ctx.fillStyle = '#DC2626';
    ctx.fillText('•', boxX + 16, hlY);

    ctx.font = `600 17px ${fontFamily}`;
    ctx.fillStyle = '#1F2937';
    const bulletLines = wrapTextIntoLines(ctx, hlItem, boxW - 42).slice(0, 2);
    bulletLines.forEach((bLine) => {
      ctx.fillText(bLine, boxX + 28, hlY);
      hlY += 23;
    });
    hlY += hlBulletSpacing;
  });
}

// Helper: Draw E-Paper Advertisement / Space-Filling Box
async function drawEpaperAdBox(
  ctx: CanvasRenderingContext2D,
  ad: any,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  fontFamily: string = '"Baloo 2", sans-serif'
) {
  if (boxW <= 20 || boxH <= 20) return;
  ctx.save();

  // If user uploaded a custom graphic / banner
  if (ad?.type === 'image' && ad?.imageUrl) {
    try {
      const adImg = await loadImage(ad.imageUrl);
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
      ctx.fill();

      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
      ctx.stroke();

      const cropX = (ad.crop?.x ?? 50) / 100;
      const cropY = (ad.crop?.y ?? 50) / 100;
      const cropZoom = Math.max(1, ad.crop?.zoom || 1);

      ctx.save();
      drawRoundedRect(ctx, boxX + 2, boxY + 2, boxW - 4, boxH - 4, 4);
      ctx.clip();
      drawImageCover(ctx, adImg, boxX + 2, boxY + 2, boxW - 4, boxH - 4, cropX, cropY, cropZoom);
      ctx.restore();

      // Top right label: "विज्ञापन"
      ctx.fillStyle = 'rgba(220, 38, 38, 0.92)';
      drawRoundedRect(ctx, boxX + boxW - 58, boxY + 3, 55, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 11px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('विज्ञापन', boxX + boxW - 30, boxY + 12);

      ctx.restore();
      return;
    } catch (err) {
      console.warn('Epaper ad image load error:', err);
    }
  }

  // Template Ad (Classified, Wishes, Commercial, Notice)
  const isWishes = ad?.templateType === 'wishes';
  const isCommercial = ad?.templateType === 'commercial';
  const isNotice = ad?.templateType === 'notice';

  // Backdrop: warm off-white / light cream / festive tint
  ctx.fillStyle = isWishes ? '#FFFDF0' : isNotice ? '#F8FAFC' : '#FFF9F5';
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.fill();

  // Outer border
  ctx.strokeStyle = isNotice ? '#334155' : '#DC2626';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.stroke();

  // Inner dashed decorative border
  ctx.strokeStyle = isNotice ? '#94A3B8' : '#F87171';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  drawRoundedRect(ctx, boxX + 4, boxY + 4, boxW - 8, boxH - 8, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Top Badge / Header Pill
  const pillText = isWishes
    ? '💐 हार्दिक शुभकामनाएं'
    : isCommercial
    ? '🏢 व्यावसायिक विज्ञापन'
    : isNotice
    ? '📢 सार्वजनिक सूचना'
    : '📢 स्थान रिक्त है • विज्ञापन';

  ctx.font = '800 13px "Baloo 2", sans-serif';
  const pillW = Math.min(boxW - 20, ctx.measureText(pillText).width + 20);
  const pillH = 22;
  const pillX = boxX + (boxW - pillW) / 2;
  const pillY = boxY + 8;

  ctx.fillStyle = isNotice ? '#1E293B' : '#DC2626';
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 4);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);

  // Main Heading Title
  const rawTitle = ad?.title || (
    isWishes ? 'सफलता एवं उज्ज्वल भविष्य की अनंत बधाई' :
    isCommercial ? 'व्यावसायिक प्रचार-प्रसार हेतु संपर्क करें' :
    isNotice ? 'सर्वसाधारण को सूचित किया जाता है' :
    'स्थान रिक्त है — विज्ञापन हेतु संपर्क करें'
  );

  let contentY = pillY + pillH + 10;
  const titleFontSize = boxH > 160 ? 17 : 14;
  ctx.font = `900 ${titleFontSize}px ${fontFamily}`;
  ctx.fillStyle = isNotice ? '#0F172A' : '#7F1D1D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const titleLines = wrapTextIntoLines(ctx, rawTitle, boxW - 24).slice(0, 2);
  titleLines.forEach((tLine) => {
    ctx.fillText(tLine, boxX + boxW / 2, contentY);
    contentY += titleFontSize + 4;
  });

  // Subtitle / message (if vertical space allows)
  if (boxH > 110 && ad?.subtitle) {
    ctx.font = `600 13px ${fontFamily}`;
    ctx.fillStyle = '#4B5563';
    const subLines = wrapTextIntoLines(ctx, ad.subtitle, boxW - 28).slice(0, 2);
    subLines.forEach((sLine) => {
      ctx.fillText(sLine, boxX + boxW / 2, contentY);
      contentY += 17;
    });
  }

  // Contact Phone Badge (prominent)
  const phoneText = ad?.phone ? `📞 संपर्क: ${ad.phone}` : '📞 संपर्क: 96698-02408';
  if (boxH >= 100) {
    const phoneY = Math.min(boxY + boxH - 32, contentY + 6);
    ctx.font = '800 14px "Baloo 2", sans-serif';
    const phonePillW = Math.min(boxW - 24, ctx.measureText(phoneText).width + 16);
    const phonePillH = 24;
    const phoneX = boxX + (boxW - phonePillW) / 2;

    ctx.fillStyle = isNotice ? '#F1F5F9' : '#FEF2F2';
    drawRoundedRect(ctx, phoneX, phoneY, phonePillW, phonePillH, 4);
    ctx.fill();
    ctx.strokeStyle = isNotice ? '#CBD5E1' : '#FCA5A5';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, phoneX, phoneY, phonePillW, phonePillH, 4);
    ctx.stroke();

    ctx.fillStyle = isNotice ? '#1E293B' : '#DC2626';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phoneText, phoneX + phonePillW / 2, phoneY + phonePillH / 2);
  }

  // Bottom Sponsor / Courtesy Line
  if (boxH > 160 && ad?.sponsorName) {
    ctx.font = `700 12px ${fontFamily}`;
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ad.sponsorName, boxX + boxW / 2, boxY + boxH - 8);
  }

  ctx.restore();
}

// Helper: Draw E-Paper Secondary News / Sidebar Story Box
function drawEpaperSecondaryStoryBox(
  ctx: CanvasRenderingContext2D,
  card: NewsCardData,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  fontFamily: string = '"Baloo 2", sans-serif'
) {
  if (boxW <= 20 || boxH <= 40) return;
  ctx.save();

  // Background
  ctx.fillStyle = '#F9FAFB';
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.fill();

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.stroke();

  // Left solid accent border (Navy blue)
  ctx.fillStyle = '#1E40AF';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, 5, boxH, [6, 0, 0, 6]);
  ctx.fill();

  // Header Title
  const title = card.epaperSecondaryStoryTitle || 'संबंधित खबर / अन्य जानकारी';
  ctx.font = `900 18px ${fontFamily}`;
  ctx.fillStyle = '#1E3A8A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`📰 ${title}`, boxX + 14, boxY + 10);

  // Hairline divider
  ctx.strokeStyle = '#DBEAFE';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 12, boxY + 34);
  ctx.lineTo(boxX + boxW - 12, boxY + 34);
  ctx.stroke();

  // Story Body Lines
  const bodyText = card.epaperSecondaryStoryBody || '';
  if (bodyText) {
    const fontSize = 16;
    const lineH = Math.round(fontSize * 1.38);
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#1F2937';
    const lines = wrapTextIntoLines(ctx, bodyText, boxW - 24);
    const maxLines = Math.floor((boxH - 44) / lineH);
    let curLineY = boxY + 42;
    lines.slice(0, maxLines).forEach((line) => {
      ctx.fillText(line, boxX + 14, curLineY);
      curLineY += lineH;
    });
  }

  ctx.restore();
}

// Helper: Wrap story into lines with authentic Devanagari drop cap
interface DropCapColData {
  lines: { text: string; xOffset: number; width: number; isParagraphEnd: boolean }[];
  dropChar: string | null;
  dropCapW: number;
  dropCapFontSize: number;
}

function wrapStoryIntoDropCapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  colW: number,
  epaperFont: string,
  bodyFontSize: number,
  bodyLineH: number,
  hasDropCap: boolean
): DropCapColData {
  const trimmed = text.trim();
  if (!trimmed) {
    return { lines: [], dropChar: null, dropCapW: 0, dropCapFontSize: 0 };
  }

  if (!hasDropCap) {
    ctx.font = `600 ${bodyFontSize}px ${epaperFont}`;
    const raw = wrapStoryIntoLines(ctx, trimmed, colW);
    return {
      lines: raw.map((r) => ({ text: r.text, xOffset: 0, width: colW, isParagraphEnd: r.isParagraphEnd })),
      dropChar: null,
      dropCapW: 0,
      dropCapFontSize: 0,
    };
  }

  // Authentic Devanagari Newspaper Drop Cap
  const firstCharMatch = trimmed.match(/^[\u0900-\u097F\uA8E0-\uA8FF\w]/);
  const dropChar = firstCharMatch ? firstCharMatch[0] : trimmed.charAt(0);
  const remainingText = trimmed.slice(dropChar.length).trimStart();

  const dropCapFontSize = Math.round(bodyLineH * 2.15);
  ctx.save();
  ctx.font = `900 ${dropCapFontSize}px ${epaperFont}`;
  const dropCapW = Math.round(ctx.measureText(dropChar).width + 10);
  ctx.restore();

  ctx.font = `600 ${bodyFontSize}px ${epaperFont}`;

  const rawParagraphs = remainingText.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const lines: { text: string; xOffset: number; width: number; isParagraphEnd: boolean }[] = [];

  let lineCount = 0;
  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const pText = rawParagraphs[pIdx];
    const words = pText.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const lineW = lineCount < 2 ? colW - dropCapW : colW;
      const testLine = currentLine ? `${currentLine} ${words[wIdx]}` : words[wIdx];
      const testW = ctx.measureText(testLine).width;

      if (testW <= lineW) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          const xOff = lineCount < 2 ? dropCapW : 0;
          lines.push({ text: currentLine, xOffset: xOff, width: lineW, isParagraphEnd: false });
          lineCount++;
        }
        currentLine = words[wIdx];
      }
    }

    if (currentLine) {
      const lineW = lineCount < 2 ? colW - dropCapW : colW;
      const xOff = lineCount < 2 ? dropCapW : 0;
      lines.push({ text: currentLine, xOffset: xOff, width: lineW, isParagraphEnd: true });
      lineCount++;
    }
  }

  return { lines, dropChar, dropCapW, dropCapFontSize };
}

function renderStoryDropCapColumn(
  ctx: CanvasRenderingContext2D,
  colData: DropCapColData,
  startX: number,
  startY: number,
  colW: number,
  bodyFontSize: number,
  bodyLineH: number,
  epaperFont: string,
  startLineIdx: number,
  maxLinesToRender: number
): number {
  if (colData.dropChar && startLineIdx === 0) {
    ctx.save();
    ctx.font = `900 ${colData.dropCapFontSize}px ${epaperFont}`;
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(colData.dropChar, startX, startY - 2);
    ctx.restore();
  }

  ctx.font = `600 ${bodyFontSize}px ${epaperFont}`;
  ctx.fillStyle = '#171717';
  ctx.textBaseline = 'top';

  const linesSlice = colData.lines.slice(startLineIdx, startLineIdx + maxLinesToRender);
  let curLineY = startY;
  linesSlice.forEach((line) => {
    drawJustifiedLine(ctx, line.text, startX + line.xOffset, curLineY, line.width, line.isParagraphEnd);
    curLineY += bodyLineH;
  });

  return linesSlice.length;
}

// Draw E-Paper Newspaper Jacket Content (Masthead kicker, Bold headline, Sub-headline, Byline with Promo CTA, 0-3 Photos, Space-filling 2-Column Story & Highlights Box)
async function drawEPaperJacketContent(
  ctx: CanvasRenderingContext2D,
  card: NewsCardData,
  width: number,
  height: number,
  footerBarHeight: number,
  headerHeight: number
) {
  ctx.save();

  const epaperFont = getCanvasEpaperFont(card);
  const paperBg = getCanvasEpaperPaperBg(card);

  // Background is pure crisp white (or authentic newsprint / subtle cream)
  ctx.fillStyle = paperBg;
  ctx.fillRect(0, 0, width, height);

  // Margins and layout - 50px safe margins so side swooshes/curves never crop text
  const marginX = 50;
  const contentW = width - marginX * 2;
  const startX = marginX;
  // Header clearance: 30px breathing room below header graphic to prevent top curve collision
  let curY = headerHeight + 30;

  // 1. Top Newspaper Kicker Bar
  const kickerText = card.epaperKicker || 'विशेष रिपोर्ट';
  ctx.font = `900 18px ${epaperFont}`;
  const kickerBadgeW = ctx.measureText(kickerText).width + 24;

  ctx.fillStyle = '#DC2626';
  drawRoundedRect(ctx, startX, curY, kickerBadgeW, 28, 4);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(kickerText, startX + 12, curY + 14);

  // Sub-kicker text
  ctx.fillStyle = '#4B5563';
  ctx.font = `700 18px ${epaperFont}`;
  ctx.fillText('• ई-पेपर विशेष संस्करण', startX + kickerBadgeW + 12, curY + 14);

  // Right date text
  const dateText = card.dateStr || getFormattedHindiDate();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6B7280';
  ctx.font = `700 18px ${epaperFont}`;
  ctx.fillText(dateText, startX + contentW, curY + 14);

  curY += 34;

  // Hairline divider below kicker
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + contentW, curY);
  ctx.stroke();

  curY += 16; // Breathing room below hairline so top vowel signs are never clipped

  // 2. Main Newspaper Headline (Auto-scales to 2 lines, generous line-height for Hindi ascenders)
  const rawHl = card.epaperHeadline || card.headline || '';
  const userHlSize = card.headlineFontSize || 26;
  const hlFontSize = Math.max(28, Math.min(42, Math.round(userHlSize * 1.28)));
  const hlLineH = Math.round(hlFontSize * 1.35);
  ctx.font = `900 ${hlFontSize}px ${epaperFont}`;
  ctx.fillStyle = '#0A0A0A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const headlineLines = wrapTextIntoLines(ctx, rawHl, contentW).slice(0, 2);
  headlineLines.forEach((line) => {
    ctx.fillText(line, startX, curY);
    curY += hlLineH;
  });

  curY += 4;

  // 3. Sub-headline (if present)
  if (card.epaperSubHeadline) {
    ctx.font = `700 22px ${epaperFont}`;
    ctx.fillStyle = '#374151';
    const subLines = wrapTextIntoLines(ctx, card.epaperSubHeadline, contentW).slice(0, 2);
    subLines.forEach((sLine) => {
      ctx.fillText(sLine, startX, curY);
      curY += 30;
    });
    curY += 4;
  }

  // 4. Byline Bar: Left Reporter Name, Right Promotional Line
  curY += 6;
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + contentW, curY);
  ctx.stroke();

  curY += 8;
  ctx.font = `800 20px ${epaperFont}`;
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const reporterByline = card.epaperByline || 'विशेष संवाददाता';
  ctx.fillText(`✍️  ${reporterByline}`, startX, curY + 12);

  // Right Side: Promotional Tagline / Call to Action
  const promoText = card.epaperPromoTagline || '📢 अब आप भी भेजें अपनी खबर हम तक: 96698-02408';
  ctx.textAlign = 'right';
  ctx.font = `700 17px ${epaperFont}`;
  ctx.fillStyle = '#DC2626';
  ctx.fillText(promoText, startX + contentW, curY + 12);

  curY += 24;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + contentW, curY);
  ctx.stroke();

  curY += 14;

  // 5. Layout Configuration & Space Filling Math
  const bottomLimit = height - footerBarHeight - 14;
  const bodyAreaTop = curY;
  const bodyAreaBottom = bottomLimit;
  const bodyAreaH = bodyAreaBottom - bodyAreaTop;
  const bodyAreaW = contentW;
  const availableRemainingH = bottomLimit - curY;

  // Active photo layout
  const photoLayout = card.epaperPhotoLayout || (
    card.epaperPhotoCount === 0 ? '0_none' :
    card.epaperPhotoCount === 2 ? '2_side' :
    card.epaperPhotoCount === 3 ? '3_split' :
    '1_top'
  );

  // Retrieve user crop/pan/zoom settings for all photos
  const mainCrop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
  const secondCrop = card.imagePositions?.second || { x: 50, y: 50, zoom: 1 };
  const thirdCrop = card.imagePositions?.third || { x: 50, y: 50, zoom: 1 };

  const mCropX = (mainCrop.x ?? 50) / 100;
  const mCropY = (mainCrop.y ?? 50) / 100;
  const mZoom = Math.max(1, mainCrop.zoom || 1);

  const sCropX = (secondCrop.x ?? 50) / 100;
  const sCropY = (secondCrop.y ?? 50) / 100;
  const sZoom = Math.max(1, secondCrop.zoom || 1);

  const tCropX = (thirdCrop.x ?? 50) / 100;
  const tCropY = (thirdCrop.y ?? 50) / 100;
  const tZoom = Math.max(1, thirdCrop.zoom || 1);

  // Base Photo Section Height based on user height mode
  let basePhotoH = Math.min(300, Math.max(190, Math.round(availableRemainingH * 0.38)));
  if (card.epaperPhotoHeightMode === 'compact') {
    basePhotoH = 190;
  } else if (card.epaperPhotoHeightMode === 'tall') {
    basePhotoH = 320;
  } else if (card.epaperPhotoHeightMode === 'extra-tall') {
    basePhotoH = 370;
  }

  // 6. Top Photos Rendering (for 1_top, 2_side, 3_split, 1_top_2_bottom)
  if (photoLayout === '1_top' && card.images.main) {
    try {
      const img1 = await loadImage(card.images.main);
      const captionH = card.epaperPhotoCaption ? 26 : 0;
      const imgH = basePhotoH - captionH;

      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, startX, curY, contentW, basePhotoH, 8);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, startX, curY, contentW, basePhotoH, 8);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, startX + 4, curY + 4, contentW - 8, imgH - 4, 6);
      ctx.clip();
      drawImageCover(ctx, img1, startX + 4, curY + 4, contentW - 8, imgH - 4, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = 'italic 600 17px "Baloo 2", sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, startX + 12, curY + imgH + captionH / 2);
      }

      curY += basePhotoH + 14;
    } catch (err) {
      console.warn('Epaper image 1 load error:', err);
    }
  } else if (photoLayout === '2_side' && card.images.main) {
    try {
      const gap = 12;
      const colW = (contentW - gap) / 2;
      const captionH = (card.epaperPhotoCaption || card.epaperPhotoCaption2) ? 26 : 0;
      const imgH = basePhotoH - captionH;

      const [img1, img2] = await Promise.all([
        loadImage(card.images.main),
        loadImage(card.images.second || card.images.main),
      ]);

      // Photo 1
      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, startX, curY, colW, basePhotoH, 8);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, startX, curY, colW, basePhotoH, 8);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, startX + 4, curY + 4, colW - 8, imgH - 4, 6);
      ctx.clip();
      drawImageCover(ctx, img1, startX + 4, curY + 4, colW - 8, imgH - 4, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = 'italic 600 16px "Baloo 2", sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, startX + 8, curY + imgH + captionH / 2);
      }

      // Photo 2
      const col2X = startX + colW + gap;
      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, col2X, curY, colW, basePhotoH, 8);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, col2X, curY, colW, basePhotoH, 8);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, col2X + 4, curY + 4, colW - 8, imgH - 4, 6);
      ctx.clip();
      drawImageCover(ctx, img2, col2X + 4, curY + 4, colW - 8, imgH - 4, sCropX, sCropY, sZoom);
      ctx.restore();

      if (card.epaperPhotoCaption2) {
        ctx.font = 'italic 600 16px "Baloo 2", sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption2}`, col2X + 8, curY + imgH + captionH / 2);
      }

      curY += basePhotoH + 14;
    } catch (err) {
      console.warn('Epaper image 2 load error:', err);
    }
  } else if (photoLayout === '3_split' && card.images.main) {
    try {
      const gap = 12;
      const leftColW = Math.round(contentW * 0.58);
      const rightColW = contentW - leftColW - gap;
      const [img1, img2, img3] = await Promise.all([
        loadImage(card.images.main),
        loadImage(card.images.second || card.images.main),
        loadImage(card.images.third || card.images.main),
      ]);

      // Left Photo
      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, startX, curY, leftColW, basePhotoH, 8);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, startX, curY, leftColW, basePhotoH, 8);
      ctx.stroke();

      const leftCaptionH = card.epaperPhotoCaption ? 26 : 0;
      ctx.save();
      drawRoundedRect(ctx, startX + 4, curY + 4, leftColW - 8, basePhotoH - leftCaptionH - 4, 6);
      ctx.clip();
      drawImageCover(ctx, img1, startX + 4, curY + 4, leftColW - 8, basePhotoH - leftCaptionH - 4, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = 'italic 600 16px "Baloo 2", sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, startX + 8, curY + basePhotoH - leftCaptionH / 2);
      }

      // Right 2 small stacked photos
      const rightColX = startX + leftColW + gap;
      const smallH = (basePhotoH - gap) / 2;

      // Small 1
      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, rightColX, curY, rightColW, smallH, 6);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, rightColX, curY, rightColW, smallH, 6);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, rightColX + 3, curY + 3, rightColW - 6, smallH - 6, 4);
      ctx.clip();
      drawImageCover(ctx, img2, rightColX + 3, curY + 3, rightColW - 6, smallH - 6, sCropX, sCropY, sZoom);
      ctx.restore();

      // Small 2
      const small2Y = curY + smallH + gap;
      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, rightColX, small2Y, rightColW, smallH, 6);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, rightColX, small2Y, rightColW, smallH, 6);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, rightColX + 3, small2Y + 3, rightColW - 6, smallH - 6, 4);
      ctx.clip();
      drawImageCover(ctx, img3, rightColX + 3, small2Y + 3, rightColW - 6, smallH - 6, tCropX, tCropY, tZoom);
      ctx.restore();

      curY += basePhotoH + 14;
    } catch (err) {
      console.warn('Epaper image 3 load error:', err);
    }
  } else if (photoLayout === '1_top_2_bottom' && card.images.main) {
    try {
      const topH = Math.round(basePhotoH * 0.60);
      const img1 = await loadImage(card.images.main);
      const captionH = card.epaperPhotoCaption ? 24 : 0;
      const imgH = topH - captionH;

      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, startX, curY, contentW, topH, 8);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, startX, curY, contentW, topH, 8);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, startX + 4, curY + 4, contentW - 8, imgH - 4, 6);
      ctx.clip();
      drawImageCover(ctx, img1, startX + 4, curY + 4, contentW - 8, imgH - 4, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = 'italic 600 16px "Baloo 2", sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, startX + 12, curY + imgH + captionH / 2);
      }

      curY += topH + 14;
    } catch (err) {
      console.warn('Epaper top image load error:', err);
    }
  }

  // 7. Column Layout: Story Body & Highlights (Handling 1_below_highlights, 1_thumb_left, 2_column_bottom, etc.)
  const articleGap = 16;
  const articleLeftW = Math.round(contentW * 0.58);
  const articleRightW = contentW - articleLeftW - articleGap;
  const boxX = startX + articleLeftW + articleGap;
  const boxW = articleRightW;

  const hasBottomStrip = card.epaperAd?.showAd && card.epaperAd.placement === 'bottom_strip';
  const bottomStripH = hasBottomStrip
    ? Math.min(150, Math.max(75, Math.round(contentW * 0.13 * (card.epaperAd?.height ? card.epaperAd.height / 25 : 1))))
    : 0;
  const bottomStripGap = hasBottomStrip ? 12 : 0;

  const hasBottomInlinePhotos = photoLayout === '1_top_2_bottom' || photoLayout === '2_column_bottom';
  const inlinePhotoH = hasBottomInlinePhotos ? 140 : 0;
  const inlinePhotoGap = hasBottomInlinePhotos ? 12 : 0;

  const bottomPhotoY = bottomLimit - (hasBottomStrip ? (bottomStripH + bottomStripGap) : 0) - inlinePhotoH;
  const reservedBottomH = (hasBottomStrip ? (bottomStripH + bottomStripGap) : 0) +
                          (hasBottomInlinePhotos ? (inlinePhotoH + inlinePhotoGap) : 0);
  const textSectionBottomLimit = bottomLimit - reservedBottomH;

  // Typography for Body Text: user adjustable (default 17-20)
  const bodyFontSize = card.epaperFontSize || 18;
  const bodyLineH = Math.round(bodyFontSize * 1.40);
  const hasDropCap = card.epaperDropCap !== false;
  ctx.font = `600 ${bodyFontSize}px ${epaperFont}`;
  ctx.fillStyle = '#171717';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const fullArticleText = (card.epaperArticleBody || '').trim() ||
    'जिले में प्रशासन और पुलिस की संयुक्त टीम ने बड़ी कार्रवाई करते हुए स्थिति को नियंत्रित किया। ग्रामीणों की शिकायतों के आधार पर वरिष्ठ अधिकारियों ने संयुक्त दल गठित कर मौके पर पहुंचकर जांच की और आवश्यक दिशा-निर्देश दिए।';

  // Branch A: Layout '1_thumb_left' (Small thumbnail in left column, story flows under it)
  if (photoLayout === '1_thumb_left' && card.images.main) {
    const thumbH = 170;
    try {
      const img1 = await loadImage(card.images.main);
      const capH = card.epaperPhotoCaption ? 24 : 0;
      const actualImgH = thumbH - capH;

      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, startX, curY, articleLeftW, thumbH, 6);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, startX, curY, articleLeftW, thumbH, 6);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, startX + 3, curY + 3, articleLeftW - 6, actualImgH - 3, 4);
      ctx.clip();
      drawImageCover(ctx, img1, startX + 3, curY + 3, articleLeftW - 6, actualImgH - 3, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = `italic 600 15px ${epaperFont}`;
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, startX + 8, curY + actualImgH + capH / 2);
      }
    } catch (err) {
      console.warn('Thumb left load error:', err);
    }

    // Story flows below the thumbnail down to textSectionBottomLimit with true newspaper justification
    const storyStartY = curY + thumbH + 12;
    const storyAvailableH = textSectionBottomLimit - storyStartY;
    const maxStoryLines = Math.max(6, Math.floor(storyAvailableH / bodyLineH));

    const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, articleLeftW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);
    renderStoryDropCapColumn(ctx, colData, startX, storyStartY, articleLeftW, bodyFontSize, bodyLineH, epaperFont, 0, maxStoryLines);

    // Right Column: Highlights Box OR Highlights on top + Ad Box on bottom
    const showRightAd = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
    if (showRightAd) {
      const fullRightH = textSectionBottomLimit - curY;
      const hlBoxH = Math.min(230, Math.max(140, Math.round(fullRightH * 0.44)));
      drawEpaperHighlightsBox(ctx, card, boxX, curY, boxW, hlBoxH, epaperFont);

      const adY = curY + hlBoxH + 12;
      const adH = textSectionBottomLimit - adY;
      await drawEpaperAdBox(ctx, card.epaperAd!, boxX, adY, boxW, adH, epaperFont);
    } else {
      const boxH = textSectionBottomLimit - curY;
      drawEpaperHighlightsBox(ctx, card, boxX, curY, boxW, boxH, epaperFont);
    }
  }
  // Branch B: Layout '1_below_highlights' (Full story in left column; Right column has Highlights + Photo 1)
  else if (photoLayout === '1_below_highlights' && card.images.main) {
    const fullColH = textSectionBottomLimit - curY;
    const maxStoryLines = Math.max(10, Math.floor(fullColH / bodyLineH));

    const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, articleLeftW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);
    renderStoryDropCapColumn(ctx, colData, startX, curY, articleLeftW, bodyFontSize, bodyLineH, epaperFont, 0, maxStoryLines);

    // Right Column: Upper section = Highlights Box (50%), Lower section = Photo 1 (50%)
    const rightBoxH = Math.round(fullColH * 0.50);
    drawEpaperHighlightsBox(ctx, card, boxX, curY, boxW, rightBoxH, epaperFont);

    const rightPhotoY = curY + rightBoxH + 10;
    const rightPhotoH = textSectionBottomLimit - rightPhotoY;

    try {
      const img1 = await loadImage(card.images.main);
      const capH = card.epaperPhotoCaption ? 24 : 0;
      const actualImgH = rightPhotoH - capH;

      ctx.fillStyle = '#F3F4F6';
      drawRoundedRect(ctx, boxX, rightPhotoY, boxW, rightPhotoH, 6);
      ctx.fill();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, boxX, rightPhotoY, boxW, rightPhotoH, 6);
      ctx.stroke();

      ctx.save();
      drawRoundedRect(ctx, boxX + 3, rightPhotoY + 3, boxW - 6, actualImgH - 3, 4);
      ctx.clip();
      drawImageCover(ctx, img1, boxX + 3, rightPhotoY + 3, boxW - 6, actualImgH - 3, mCropX, mCropY, mZoom);
      ctx.restore();

      if (card.epaperPhotoCaption) {
        ctx.font = `italic 600 15px ${epaperFont}`;
        ctx.fillStyle = '#4B5563';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📷 ${card.epaperPhotoCaption}`, boxX + 8, rightPhotoY + actualImgH + capH / 2);
      }
    } catch (err) {
      console.warn('Right photo load error:', err);
    }
  }
  // Branch C: 2-Column Story / Highlights / Quote Callout Options
  else {
    const remainingTextH = textSectionBottomLimit - curY;
    const storyLayoutMode = card.epaperStoryLayout || '2_equal_cols';

      // Option C1: 2 Equal Columns (Continuous story flowing directly below both photos, 100% Justified)
    if (storyLayoutMode === '2_equal_cols') {
      const colGap = 24;
      const colW = Math.floor((contentW - colGap) / 2);
      const col1X = startX;
      const col2X = startX + colW + colGap;

      const showCol2Ad = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
      const adH = showCol2Ad ? Math.min(180, Math.max(90, Math.round(remainingTextH * 0.32))) : 0;
      const col2StoryH = showCol2Ad ? (remainingTextH - adH - 12) : remainingTextH;

      const maxLinesCol1 = Math.max(6, Math.floor(remainingTextH / bodyLineH));
      const maxLinesCol2 = Math.max(3, Math.floor(col2StoryH / bodyLineH));
      const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, colW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);

      // Distribute lines between the two columns
      let col1Count = Math.min(maxLinesCol1, Math.ceil(colData.lines.length / 2));
      if (showCol2Ad && colData.lines.length > maxLinesCol1 + maxLinesCol2) {
        col1Count = maxLinesCol1;
      } else if (!showCol2Ad && colData.lines.length > maxLinesCol1 * 2) {
        col1Count = maxLinesCol1;
      }
      if (card.epaperBalanceColumns === false && colData.lines.length <= maxLinesCol1) {
        col1Count = colData.lines.length;
      }

      // Render Column 1 (Under Left Photo with drop cap if enabled) - Justified
      const linesCol1 = renderStoryDropCapColumn(ctx, colData, col1X, curY, colW, bodyFontSize, bodyLineH, epaperFont, 0, col1Count);

      // Render Column 2 (Under Right Photo without drop cap) - Justified
      const linesCol2 = renderStoryDropCapColumn(ctx, colData, col2X, curY, colW, bodyFontSize, bodyLineH, epaperFont, col1Count, maxLinesCol2);

      // Vertical newspaper column hairline separator
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX + colW + colGap / 2, curY + 2);
      ctx.lineTo(startX + colW + colGap / 2, textSectionBottomLimit - 4);
      ctx.stroke();

      if (showCol2Ad && card.epaperAd) {
        const adY = textSectionBottomLimit - adH;
        await drawEpaperAdBox(ctx, card.epaperAd, col2X, adY, colW, adH, epaperFont);
      } else {
        // Check remaining empty space in Column 2 below text
        const col2UsedH = linesCol2 * bodyLineH;
        const col2GapStartY = curY + col2UsedH + (linesCol2 > 0 ? 12 : 0);
        const col2GapH = textSectionBottomLimit - col2GapStartY;

        if (col2GapH >= 70 && card.epaperSecondaryStoryBody) {
          drawEpaperSecondaryStoryBox(ctx, card, col2X, col2GapStartY, colW, col2GapH, epaperFont);
        }
      }
    }
    // Option C2: 2 Columns with Leader / Official Quote Callout Box
    else if (storyLayoutMode === '2_cols_with_quote') {
      const colGap = 24;
      const colW = Math.floor((contentW - colGap) / 2);
      const col1X = startX;
      const col2X = startX + colW + colGap;

      const maxLinesCol1 = Math.max(6, Math.floor(remainingTextH / bodyLineH));
      const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, colW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);

      // Top Quote Box
      const quoteBoxH = 150;
      const quoteText = card.epaperQuoteText || 'जनहित और पारदर्शी प्रशासनिक व्यवस्था के लिए हम पूरी तरह प्रतिबद्ध हैं। किसी भी स्तर पर लापरवाही बर्दाश्त नहीं की जाएगी।';
      const speakerName = card.epaperQuoteSpeaker || card.epaperByline?.split('/')[0]?.trim() || 'प्रशासनिक प्रवक्ता';
      drawEpaperQuoteBox(ctx, quoteText, speakerName, col2X, curY, colW, quoteBoxH, epaperFont);

      const col2StoryStartY = curY + quoteBoxH + 12;
      const col2RemainingH = textSectionBottomLimit - col2StoryStartY;
      const maxLinesCol2 = Math.max(3, Math.floor(col2RemainingH / bodyLineH));

      // Intelligent column balancing so Column 2 under the quote isn't left empty
      let col1Count = maxLinesCol1;
      const totalLines = colData.lines.length;
      if (card.epaperBalanceColumns !== false) {
        if (totalLines <= maxLinesCol2 + 6) {
          col1Count = Math.min(maxLinesCol1, Math.max(4, Math.ceil(totalLines * 0.58)));
        } else if (totalLines < maxLinesCol1 + maxLinesCol2) {
          col1Count = Math.min(maxLinesCol1, totalLines - Math.min(maxLinesCol2, Math.floor((totalLines - maxLinesCol1 * 0.3) / 2)));
        }
      }

      // Render Column 1 (Full or balanced story down left side)
      const linesCol1 = renderStoryDropCapColumn(ctx, colData, col1X, curY, colW, bodyFontSize, bodyLineH, epaperFont, 0, col1Count);

      // Render Column 2 below the quote box
      const linesCol2 = renderStoryDropCapColumn(ctx, colData, col2X, col2StoryStartY, colW, bodyFontSize, bodyLineH, epaperFont, col1Count, maxLinesCol2);

      // Hairline separator
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX + colW + colGap / 2, curY + 2);
      ctx.lineTo(startX + colW + colGap / 2, textSectionBottomLimit - 4);
      ctx.stroke();

      // Check remaining empty space in Column 2 below the story
      const col2UsedH = linesCol2 * bodyLineH;
      const col2GapStartY = col2StoryStartY + col2UsedH + (linesCol2 > 0 ? 12 : 0);
      const col2GapH = textSectionBottomLimit - col2GapStartY;

      if (col2GapH >= 70) {
        if (card.epaperSecondaryStoryBody) {
          drawEpaperSecondaryStoryBox(ctx, card, col2X, col2GapStartY, colW, col2GapH, epaperFont);
        } else if (card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column')) {
          await drawEpaperAdBox(ctx, card.epaperAd, col2X, col2GapStartY, colW, col2GapH, epaperFont);
        } else if (card.epaperAd?.showAd === true || (card.epaperAd?.showAd === undefined && linesCol2 === 0)) {
          // Automatic fill with classified ad space filler
          const defaultAd = card.epaperAd || {
            type: 'template',
            templateType: 'classified',
            title: 'स्थान रिक्त है - विज्ञापन हेतु संपर्क करें',
            subtitle: 'ई-पेपर विशेष संस्करण में प्रचार प्रसार के लिए',
            phone: card.whatsappNumber || '96698-02408',
            sponsorName: card.channelNameHi || card.brandName || 'डिजिटल न्यूज़ नेटवर्क',
          };
          await drawEpaperAdBox(ctx, defaultAd, col2X, col2GapStartY, colW, col2GapH, epaperFont);
        }
      }
    }
    // Option C3: 2 Columns with Story + Bottom Highlights Box
    else if (storyLayoutMode === '2_cols_with_highlights') {
      const colGap = 24;
      const colW = Math.floor((contentW - colGap) / 2);
      const col1X = startX;
      const col2X = startX + colW + colGap;

      const maxLinesCol1 = Math.max(6, Math.floor(remainingTextH / bodyLineH));
      const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, colW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);

      // Render Column 1 (Left side)
      renderStoryDropCapColumn(ctx, colData, col1X, curY, colW, bodyFontSize, bodyLineH, epaperFont, 0, maxLinesCol1);

      // Column 2: Story top + Highlights Box bottom
      const hlBoxH = Math.min(220, Math.max(160, Math.round(remainingTextH * 0.52)));
      const col2StoryH = remainingTextH - hlBoxH - 12;
      const maxLinesCol2 = Math.max(2, Math.floor(col2StoryH / bodyLineH));

      renderStoryDropCapColumn(ctx, colData, col2X, curY, colW, bodyFontSize, bodyLineH, epaperFont, maxLinesCol1, maxLinesCol2);

      const hlBoxY = textSectionBottomLimit - hlBoxH;
      drawEpaperHighlightsBox(ctx, card, col2X, hlBoxY, colW, hlBoxH, epaperFont);

      // Hairline separator
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX + colW + colGap / 2, curY + 2);
      ctx.lineTo(startX + colW + colGap / 2, textSectionBottomLimit - 4);
      ctx.stroke();
    }
    // Option C4: Classic (Left Main Story ~58% width, Right Inset Highlights Box + Optional Ad)
    else {
      const maxPossibleLines = Math.max(6, Math.floor(remainingTextH / bodyLineH));
      const colData = wrapStoryIntoDropCapLines(ctx, fullArticleText, articleLeftW, epaperFont, bodyFontSize, bodyLineH, hasDropCap);
      renderStoryDropCapColumn(ctx, colData, startX, curY, articleLeftW, bodyFontSize, bodyLineH, epaperFont, 0, maxPossibleLines);

      // Right Column: Inset Highlights Box (📍 मुख्य बिंदु) OR Highlights on top + Ad on bottom
      const showRightAd = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
      if (showRightAd) {
        const fullRightH = textSectionBottomLimit - curY;
        const hlBoxH = Math.min(230, Math.max(140, Math.round(fullRightH * 0.44)));
        drawEpaperHighlightsBox(ctx, card, boxX, curY, boxW, hlBoxH, epaperFont);

        const adY = curY + hlBoxH + 12;
        const adH = textSectionBottomLimit - adY;
        await drawEpaperAdBox(ctx, card.epaperAd!, boxX, adY, boxW, adH, epaperFont);
      } else {
        const boxH = Math.max(160, remainingTextH);
        drawEpaperHighlightsBox(ctx, card, boxX, curY, boxW, boxH, epaperFont);
      }
    }
  }

  // Movable or Bottom Strip Advertisement (if enabled)
  if (card.epaperAd?.showAd) {
    const ad = card.epaperAd;
    if (ad.placement === 'movable') {
      const adX = startX + (bodyAreaW * (ad.x ?? 50)) / 100;
      const adY = bodyAreaTop + (bodyAreaH * (ad.y ?? 60)) / 100;
      const adW = (bodyAreaW * (ad.width ?? 45)) / 100;
      const adH = (bodyAreaH * (ad.height ?? 25)) / 100;
      await drawEpaperAdBox(ctx, ad, adX, adY, adW, adH, epaperFont);
    } else if (hasBottomStrip) {
      const stripY = bottomLimit - bottomStripH;
      await drawEpaperAdBox(ctx, ad, startX, stripY, contentW, bottomStripH, epaperFont);
    }
  }

  // Second Advertisement (Auto-Fill or Movable or Right Column - if enabled)
  if (card.epaperSecondAd?.showAd) {
    const ad2 = card.epaperSecondAd;
    const rightColGap = 24;
    const rightColW = Math.floor((contentW - rightColGap) / 2);
    const rightColX = startX + rightColW + rightColGap;

    if (ad2.placement === 'movable') {
      const ad2X = startX + (bodyAreaW * (ad2.x ?? 52)) / 100;
      const ad2Y = bodyAreaTop + (bodyAreaH * (ad2.y ?? 68)) / 100;
      const ad2W = (bodyAreaW * (ad2.width ?? 44)) / 100;
      const ad2H = (bodyAreaH * (ad2.height ?? 22)) / 100;
      await drawEpaperAdBox(ctx, ad2, ad2X, ad2Y, ad2W, ad2H, epaperFont);
    } else if (ad2.placement === 'bottom_strip') {
      const stripY = bottomLimit - (hasBottomStrip ? bottomStripH * 2 : bottomStripH);
      await drawEpaperAdBox(ctx, ad2, startX, stripY, contentW, bottomStripH, epaperFont);
    } else if (ad2.placement === 'right_column') {
      const ad2Y = curY;
      const ad2H = Math.max(160, bottomLimit - curY);
      await drawEpaperAdBox(ctx, ad2, rightColX, ad2Y, rightColW, ad2H, epaperFont);
    } else if (ad2.placement === 'auto_fill') {
      const ad2Y = Math.max(curY, bodyAreaTop + bodyAreaH * 0.55);
      const ad2H = Math.max(140, bottomLimit - ad2Y);
      await drawEpaperAdBox(ctx, ad2, rightColX, ad2Y, rightColW, ad2H, epaperFont);
    }
  }

  // 8. Render Bottom Inline Photos (if 1_top_2_bottom or 2_column_bottom)
  // Strictly placed at bottomPhotoY right above the footer so they NEVER get cut off or disappear!
  if (hasBottomInlinePhotos) {
    // Bottom Photo 1 (under left column)
    const imgSecondSrc = card.images.second || card.images.main;
    if (imgSecondSrc) {
      try {
        const bImg1 = await loadImage(imgSecondSrc);
        const bCapH = card.epaperPhotoCaption2 ? 22 : 0;
        const bImgH = inlinePhotoH - bCapH;

        ctx.fillStyle = '#F3F4F6';
        drawRoundedRect(ctx, startX, bottomPhotoY, articleLeftW, inlinePhotoH, 6);
        ctx.fill();
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, startX, bottomPhotoY, articleLeftW, inlinePhotoH, 6);
        ctx.stroke();

        ctx.save();
        drawRoundedRect(ctx, startX + 3, bottomPhotoY + 3, articleLeftW - 6, bImgH - 3, 4);
        ctx.clip();
        drawImageCover(ctx, bImg1, startX + 3, bottomPhotoY + 3, articleLeftW - 6, bImgH - 3, sCropX, sCropY, sZoom);
        ctx.restore();

        if (card.epaperPhotoCaption2) {
          ctx.font = `italic 600 15px ${epaperFont}`;
          ctx.fillStyle = '#4B5563';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`📷 ${card.epaperPhotoCaption2}`, startX + 8, bottomPhotoY + bImgH + bCapH / 2);
        }
      } catch (err) {
        console.warn('Epaper bottom image 1 load error:', err);
      }
    }

    // Bottom Photo 2 (under right highlights column)
    const imgThirdSrc = card.images.third || card.images.second || card.images.main;
    if (imgThirdSrc) {
      try {
        const bImg2 = await loadImage(imgThirdSrc);
        const bCapH = card.epaperPhotoCaption3 ? 22 : 0;
        const bImgH = inlinePhotoH - bCapH;

        ctx.fillStyle = '#F3F4F6';
        drawRoundedRect(ctx, boxX, bottomPhotoY, boxW, inlinePhotoH, 6);
        ctx.fill();
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, boxX, bottomPhotoY, boxW, inlinePhotoH, 6);
        ctx.stroke();

        ctx.save();
        drawRoundedRect(ctx, boxX + 3, bottomPhotoY + 3, boxW - 6, bImgH - 3, 4);
        ctx.clip();
        drawImageCover(ctx, bImg2, boxX + 3, bottomPhotoY + 3, boxW - 6, bImgH - 3, tCropX, tCropY, tZoom);
        ctx.restore();

        if (card.epaperPhotoCaption3) {
          ctx.font = `italic 600 15px ${epaperFont}`;
          ctx.fillStyle = '#4B5563';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`📷 ${card.epaperPhotoCaption3}`, boxX + 8, bottomPhotoY + bImgH + bCapH / 2);
        }
      } catch (err) {
        console.warn('Epaper bottom image 2 load error:', err);
      }
    }
  }

  // 9. Watermark Overlay (Text or uploaded PNG Logo)
  if (card.showWatermark || card.showSuperBreakingWatermark || shouldShowAppWatermark()) {
    await drawUniversalWatermark(ctx, width, height - footerBarHeight, card);
  }

  ctx.restore();
}

// Background for Text Breaking Jacket: Subtle 3D Isometric Geometric Hexagonal Mesh on Crisp Off-White
async function drawGeometricTextBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgStyle?: 'light-geo' | 'pure-white' | 'dark-news' | 'custom-image',
  customBgUrl?: string
) {
  ctx.save();
  if (bgStyle === 'custom-image' && customBgUrl) {
    try {
      const bgImg = await loadImage(customBgUrl);
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.restore();
      return;
    } catch {
      // Fallback to light-geo if custom image fails to load
    }
  }

  if (bgStyle === 'pure-white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (bgStyle === 'dark-news') {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  // Default: subtle isometric hexagonal / triangular pattern on crisp off-white
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.4, '#F8FAFC');
  bgGrad.addColorStop(1, '#EEF2F6');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;

  const hexR = 52;
  const hexH = hexR * Math.sqrt(3);

  for (let y = -hexH; y < height + hexH * 2; y += hexH) {
    for (let x = -hexR * 2; x < width + hexR * 3; x += hexR * 3) {
      // Hexagon outline
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const rad = (Math.PI / 3) * i;
        const hx = x + hexR * Math.cos(rad);
        const hy = y + hexR * Math.sin(rad);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Triangles inside hexagon
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + hexR, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x + hexR * Math.cos((Math.PI * 2) / 3), y + hexR * Math.sin((Math.PI * 2) / 3));
      ctx.moveTo(x, y);
      ctx.lineTo(x + hexR * Math.cos((Math.PI * 4) / 3), y + hexR * Math.sin((Math.PI * 4) / 3));
      ctx.stroke();
    }
  }

  ctx.restore();
}

// 3D Breaking News Badge for Text Breaking Jacket (9 Variations: 3D, Flat, Solid, Hindi)
function drawTextBreaking3DBadge(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  badgeCenterY: number,
  style: TextBreakingBadgeStyle = 'breaking-3d-en',
  customTitle?: string,
  titleSize: 'sm' | 'md' | 'lg' = 'md'
) {
  ctx.save();
  const centerX = Math.round(canvasWidth / 2);

  // Apply scaling based on titleSize & text length
  const baseScale = titleSize === 'sm' ? 0.8 : titleSize === 'lg' ? 1.15 : 1.0;
  const textLen = customTitle ? customTitle.length : 12;
  const lengthFactor = textLen > 18 ? 0.72 : textLen > 14 ? 0.82 : textLen > 10 ? 0.92 : 1.0;
  const finalScale = baseScale * lengthFactor;

  if (finalScale !== 1.0) {
    ctx.translate(centerX, badgeCenterY);
    ctx.scale(finalScale, finalScale);
    ctx.translate(-centerX, -badgeCenterY);
  }

  // New Style 1: FLAT MODERN RED (Clean, Less 3D, High Readability)
  if (style === 'breaking-flat-red') {
    const word1 = customTitle ? customTitle.split(' ')[0] : 'BREAKING';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'NEWS' : 'NEWS';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '900 62px "Impact", "Arial Black", "Montserrat", sans-serif';
    const y1 = badgeCenterY - 38;
    ctx.fillStyle = '#DC2626';
    ctx.fillText(word1, centerX, y1);

    ctx.font = '900 110px "Impact", "Arial Black", "Montserrat", sans-serif';
    const y2 = badgeCenterY + 42;
    ctx.fillStyle = '#B91C1C';
    ctx.fillText(word2, centerX, y2);
  } else if (style === 'breaking-solid-bar') {
    // New Style 2: SOLID RED TV BAR (Solid Plate with crisp white text)
    const text = customTitle || 'BREAKING NEWS';
    ctx.font = '900 52px "Impact", "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(text).width;
    const barW = Math.max(520, textW + 120);
    const barH = 82;
    const barX = centerX - barW / 2;
    const barY = badgeCenterY - barH / 2;

    // Drop shadow
    ctx.shadowColor = 'rgba(185, 28, 28, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Solid red plate
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#991B1B');
    barGrad.addColorStop(0.5, '#DC2626');
    barGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 12);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pulse dot + text
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(barX + 36, badgeCenterY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(text, centerX + 16, badgeCenterY + 2);
  } else if (style === 'breaking-simple-hi') {
    // New Style 3: SIMPLE HINDI BOLD (Clean Non-3D Hindi)
    const word1 = customTitle ? customTitle.split(' ')[0] : 'ब्रेकिंग';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'न्यूज़' : 'न्यूज़';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '900 70px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    const y1 = badgeCenterY - 40;
    ctx.fillStyle = '#DC2626';
    ctx.fillText(word1, centerX, y1);

    ctx.font = '900 114px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    const y2 = badgeCenterY + 44;
    ctx.fillStyle = '#991B1B';
    ctx.fillText(word2, centerX, y2);
  } else if (style === 'breaking-3d-en') {
    // 1. 3D BOLD RED ENGLISH (BREAKING / NEWS) - Matches User's Sample!
    const word1 = customTitle ? customTitle.split(' ')[0] : 'BREAKING';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'NEWS' : 'NEWS';

    // Word 1: BREAKING
    ctx.font = '900 66px "Impact", "Arial Black", "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const y1 = badgeCenterY - 48;
    // 3D Shadow Layers
    for (let o = 5; o >= 1; o--) {
      ctx.fillStyle = o <= 2 ? '#940c0c' : o <= 4 ? '#780909' : '#5c0707';
      ctx.fillText(word1, centerX, y1 + o);
    }
    // Front Face
    ctx.fillStyle = '#E01414';
    ctx.fillText(word1, centerX, y1);

    // Word 2: NEWS (Giant 3D Extruded)
    ctx.font = '900 118px "Impact", "Arial Black", "Montserrat", sans-serif';
    const y2 = badgeCenterY + 44;

    // Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    // 3D Extrusion
    for (let o = 7; o >= 1; o--) {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = o <= 2 ? '#990c0c' : o <= 4 ? '#800909' : '#4d0505';
      ctx.fillText(word2, centerX, y2 + o);
    }

    // Front Face with vibrant gradient
    const newsGrad = ctx.createLinearGradient(0, y2 - 60, 0, y2 + 60);
    newsGrad.addColorStop(0, '#FF2020');
    newsGrad.addColorStop(0.5, '#E31212');
    newsGrad.addColorStop(1, '#B90D0D');
    ctx.fillStyle = newsGrad;
    ctx.fillText(word2, centerX, y2);

    // Subtle specular highlight on top bevel
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeText(word2, centerX, y2 - 1);
    ctx.restore();
  } else if (style === 'breaking-3d-hi') {
    // 2. 3D BOLD RED HINDI (ब्रेकिंग / न्यूज़)
    const word1 = customTitle ? customTitle.split(' ')[0] : 'ब्रेकिंग';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'न्यूज़' : 'न्यूज़';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word 1: ब्रेकिंग
    ctx.font = '900 74px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    const y1 = badgeCenterY - 48;
    for (let o = 5; o >= 1; o--) {
      ctx.fillStyle = o <= 2 ? '#940c0c' : '#5c0707';
      ctx.fillText(word1, centerX, y1 + o);
    }
    ctx.fillStyle = '#E01414';
    ctx.fillText(word1, centerX, y1);

    // Word 2: न्यूज़
    ctx.font = '900 120px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    const y2 = badgeCenterY + 46;
    for (let o = 7; o >= 1; o--) {
      ctx.fillStyle = o <= 2 ? '#990c0c' : '#4d0505';
      ctx.fillText(word2, centerX, y2 + o);
    }
    const hiGrad = ctx.createLinearGradient(0, y2 - 60, 0, y2 + 60);
    hiGrad.addColorStop(0, '#FF2020');
    hiGrad.addColorStop(1, '#B90D0D');
    ctx.fillStyle = hiGrad;
    ctx.fillText(word2, centerX, y2);
  } else if (style === 'breaking-ribbon') {
    // 3. 3D GLOSSY RED RIBBON
    const ribbonText = customTitle || 'BREAKING NEWS';
    ctx.font = '900 48px "Impact", "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(ribbonText).width;
    const bannerW = Math.max(500, textW + 120);
    const bannerH = 78;
    const bannerX = centerX - bannerW / 2;
    const bannerY = badgeCenterY - bannerH / 2;

    // Outer Drop Shadow
    ctx.shadowColor = 'rgba(200, 0, 0, 0.4)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    // Crimson gradient
    const grad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    grad.addColorStop(0, '#FF1A1A');
    grad.addColorStop(0.5, '#C80000');
    grad.addColorStop(1, '#7A0000');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
    ctx.fill();

    // Gold border trim
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Text with Stars
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`★ ${ribbonText} ★`, centerX, badgeCenterY + 2);
  } else if (style === 'breaking-gold') {
    // 4. ⚡ बड़ी ख़बर / BIG BREAKING
    const titleText = customTitle || 'बड़ी ख़बर';

    // Top Pill
    const pillW = 260;
    const pillH = 38;
    const pillX = centerX - pillW / 2;
    const pillY = badgeCenterY - 58;
    const pillGrad = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
    pillGrad.addColorStop(0, '#991B1B');
    pillGrad.addColorStop(0.5, '#DC2626');
    pillGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 19);
    ctx.fill();
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '900 20px "Baloo 2", sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ BIG BREAKING', centerX, pillY + pillH / 2 + 1);

    // Giant Golden Text
    ctx.font = '900 96px "Baloo 2", "Noto Sans Devanagari", sans-serif';
    const y2 = badgeCenterY + 34;
    const goldGrad = ctx.createLinearGradient(0, y2 - 50, 0, y2 + 50);
    goldGrad.addColorStop(0, '#FFDE00');
    goldGrad.addColorStop(1, '#E65100');
    ctx.fillStyle = goldGrad;
    ctx.fillText(titleText, centerX, y2);
  } else if (style === 'breaking-duotone') {
    // 5. RED & BLACK DUOTONE
    const word1 = customTitle ? customTitle.split(' ')[0] : 'BREAKING';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'NEWS' : 'NEWS';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '900 70px "Impact", "Arial Black", sans-serif';
    const y1 = badgeCenterY - 44;
    ctx.fillStyle = '#DC2626';
    ctx.fillText(word1, centerX, y1);

    ctx.font = '900 120px "Impact", "Arial Black", sans-serif';
    const y2 = badgeCenterY + 48;
    ctx.fillStyle = '#0F172A';
    ctx.fillText(word2, centerX, y2);
  } else {
    // 6. EXCLUSIVE BREAKING
    const pillW = 200;
    const pillH = 34;
    const pillX = centerX - pillW / 2;
    const pillY = badgeCenterY - 54;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 6);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 18px "Montserrat", sans-serif';
    ctx.fillStyle = '#FBBF24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXCLUSIVE', centerX, pillY + pillH / 2);

    ctx.font = '900 86px "Impact", "Arial Black", sans-serif';
    const y2 = badgeCenterY + 36;
    ctx.fillStyle = '#E01414';
    ctx.fillText(customTitle || 'BREAKING NEWS', centerX, y2);
  }

  ctx.restore();
}

// Speaker Attribution for Quote (बयान) template: Single Line Centered
// Speaker Name (larger, bold white) + separator in yellow + Designation/Title (crisp light tone)
function drawSpeakerAttribution(
  ctx: CanvasRenderingContext2D,
  width: number,
  speakerY: number,
  speakerName: string,
  speakerTitle?: string
) {
  if (!speakerName && !speakerTitle) return;
  ctx.save();
  ctx.textBaseline = 'middle';

  let cleanName = speakerName.trim();
  if (cleanName && !cleanName.startsWith('—') && !cleanName.startsWith('-')) {
    cleanName = `— ${cleanName}`;
  }

  const cleanTitle = speakerTitle ? speakerTitle.trim() : '';

  const nameFont = '900 36px "Baloo 2", sans-serif';
  const sepFont = '800 30px "Baloo 2", sans-serif';
  const titleFont = '700 28px "Baloo 2", sans-serif';

  ctx.font = nameFont;
  const nameW = ctx.measureText(cleanName).width;

  let sepW = 0;
  let titleW = 0;
  const sepText = ' | ';

  if (cleanTitle) {
    ctx.font = sepFont;
    sepW = ctx.measureText(sepText).width;
    ctx.font = titleFont;
    titleW = ctx.measureText(cleanTitle).width;
  }

  const totalW = nameW + sepW + titleW;
  let startX = Math.round((width - totalW) / 2);

  // Open text layout per user request (no round box/pill), with clean drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Draw Speaker Name (slightly bigger, bold white)
  ctx.font = nameFont;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(cleanName, startX, speakerY);
  startX += nameW;

  // Draw Separator and Designation / Title
  if (cleanTitle) {
    ctx.font = sepFont;
    ctx.fillStyle = '#FFE600';
    ctx.fillText(sepText, startX, speakerY);
    startX += sepW;

    ctx.font = titleFont;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(cleanTitle, startX, speakerY);
  }

  ctx.restore();
}

// Vertical Photo Disclaimer Watermark along Left Edge/Wall, Rotated 90° (AI GENERATED or प्रतीकात्मक फोटो)
function drawPhotoDisclaimerWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData
) {
  const isDisclaimerActive =
    card.photoDisclaimerType === 'ai' ||
    card.photoDisclaimerType === 'representative' ||
    (card.showAiGenerated && card.photoDisclaimerType !== 'none');

  if (!isDisclaimerActive) return;

  const disclaimerText =
    card.photoDisclaimerType === 'representative'
      ? card.representativePhotoText || 'प्रतीकात्मक फोटो'
      : card.aiGeneratedText || 'AI GENERATED';

  ctx.save();
  // Placed right along the left wall of the photo area
  const x = 22;
  const y = height * 0.44;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);

  ctx.font = '800 14px "Baloo 2", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = '2px';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Generous horizontal space (44px padding) before and after text
  const textWidth = ctx.measureText(disclaimerText).width + 44;
  const pillH = 26;

  // Translucent dark backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.roundRect(-textWidth / 2, -pillH / 2, textWidth, pillH, 4);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Low opacity white text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.fillText(disclaimerText, 0, 1);

  ctx.restore();
}

function drawAiGeneratedWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string = 'AI GENERATED'
) {
  ctx.save();
  // Safe Zone enforced position on left wall
  const safeLeft = Math.max(34, Math.round(width * 0.038));
  const x = safeLeft;
  const y = height * 0.44;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);

  ctx.font = '800 14px "Baloo 2", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = '2px';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width + 44;
  const pillH = 26;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.roundRect(-textWidth / 2, -pillH / 2, textWidth, pillH, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.fillText(text, 0, 1);

  ctx.restore();
}

// Vertical Date Stamp along Right Edge, Rotated 90°, Positioned near header without box
function drawDateStamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dateText: string
) {
  ctx.save();
  // Safe Zone enforced position along the right wall near header area
  const safeRight = Math.max(36, Math.round(width * 0.038));
  const x = width - safeRight;
  const y = Math.round(height * 0.22);
  ctx.translate(x, y);
  ctx.rotate((90 * Math.PI) / 180); // 90° clockwise

  ctx.font = '700 20px "Baloo 2", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtle shadow for readability without any background box
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(dateText, 0, 0);

  ctx.restore();
}

// Professional Breaking News Curved Red Pointer Arrow
// Placed to the bottom-left of the circle, pointing UP-RIGHT directly into the circle
function drawRed3DPointerArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  arrowImg: HTMLImageElement
) {
  ctx.save();
  const arrowW = radius * 1.55;
  const arrowH = radius * 1.55;

  // In 400x400 viewBox, arrowhead tip is at (320, 60) => 80% X, 15% Y.
  // We align the tip to touch the lower-left perimeter of the circle (angle 225°: cx - 0.707*R, cy + 0.707*R)
  const targetTipX = cx - radius * 0.707;
  const targetTipY = cy + radius * 0.707;

  const arrowX = targetTipX - 0.80 * arrowW;
  const arrowY = targetTipY - 0.15 * arrowH;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(arrowImg, arrowX, arrowY, arrowW, arrowH);
  ctx.restore();
}

interface WordToken {
  text: string;
  isHighlight: boolean;
}

// Parse words and break into lines (supports 3 lines for standard breaking news, or 4-6 lines for quotes/jackets)
function getHeadlineLines(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  highlightWords: string[],
  maxWidth: number,
  fontSize: number,
  maxLines: number = 3
): WordToken[][] {
  ctx.save();
  ctx.font = `800 ${fontSize}px "Baloo 2", "Noto Sans Devanagari", sans-serif`;

  const parseTokensFromChunk = (chunk: string): WordToken[] => {
    const tokens: WordToken[] = [];
    const yellowRegex = /\[yellow\](.*?)\[\/yellow\]/g;
    let lastIndex = 0;
    let match;

    const checkIsHl = (word: string): boolean => {
      if (!highlightWords || highlightWords.length === 0) return false;
      const cleanW = word.trim().toLowerCase();
      return highlightWords.some((hw) => {
        if (!hw) return false;
        const cleanHw = hw.trim().toLowerCase();
        return cleanW.includes(cleanHw) || cleanHw.includes(cleanW);
      });
    };

    while ((match = yellowRegex.exec(chunk)) !== null) {
      if (match.index > lastIndex) {
        const regularChunk = chunk.substring(lastIndex, match.index);
        for (const w of regularChunk.split(/[ \t]+/)) {
          if (w && w.trim()) tokens.push({ text: w.trim(), isHighlight: checkIsHl(w) });
        }
      }
      const highlightChunk = match[1];
      for (const w of highlightChunk.split(/[ \t]+/)) {
        if (w && w.trim()) tokens.push({ text: w.trim(), isHighlight: true });
      }
      lastIndex = yellowRegex.lastIndex;
    }

    if (lastIndex < chunk.length) {
      const tailChunk = chunk.substring(lastIndex);
      for (const w of tailChunk.split(/[ \t]+/)) {
        if (w && w.trim()) tokens.push({ text: w.trim(), isHighlight: checkIsHl(w) });
      }
    }

    return tokens;
  };

  const manualLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const spaceWidth = ctx.measureText(' ').width;
  const lines: WordToken[][] = [];

  if (manualLines.length > 1) {
    // User explicitly created lines using Enter in the editor
    for (const mLine of manualLines) {
      const lineTokens = parseTokensFromChunk(mLine);
      if (lineTokens.length === 0) continue;

      let curLine: WordToken[] = [];
      let curWidth = 0;

      for (const token of lineTokens) {
        const wordWidth = ctx.measureText(token.text).width;
        if (curWidth + wordWidth > maxWidth && curLine.length > 0) {
          lines.push(curLine);
          curLine = [token];
          curWidth = wordWidth + spaceWidth;
        } else {
          curLine.push(token);
          curWidth += wordWidth + spaceWidth;
        }
      }
      if (curLine.length > 0) {
        lines.push(curLine);
      }
    }
  } else {
    // Single block of text: wrap automatically based on maxWidth
    const allTokens = parseTokensFromChunk(rawText);
    let currentLine: WordToken[] = [];
    let currentLineWidth = 0;

    for (const token of allTokens) {
      const wordWidth = ctx.measureText(token.text).width;
      if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [token];
        currentLineWidth = wordWidth + spaceWidth;
      } else {
        currentLine.push(token);
        currentLineWidth += wordWidth + spaceWidth;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }

  // Cap lines cleanly without appending '...' (preserves full proper 3 lines)
  if (maxLines > 0 && lines.length > maxLines) {
    const excessTokens: WordToken[] = [];
    while (lines.length >= maxLines) {
      const popped = lines.pop();
      if (popped) excessTokens.unshift(...popped);
    }
    lines.push(excessTokens);
  }

  ctx.restore();
  return lines;
}

// Render BREAKING NEWS Ribbon (Centered, scaled nicely, subtle shadow, matches uploaded PNG)
async function drawSuperBreakingRibbon(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  ribbonY: number,
  customRibbonUrl?: string,
  scalePercent: number = 70
) {
  ctx.save();
  const clampedScale = Math.max(0.50, Math.min(0.95, scalePercent / 100));
  const ribbonW = Math.round(canvasWidth * clampedScale); // User configured scale
  const ribbonH = Math.round(ribbonW * (150 / 960)); // Proportional to SVG aspect ratio
  const startX = Math.round((canvasWidth - ribbonW) / 2);

  // Softer shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  try {
    const imgUrl = customRibbonUrl || '/assets/breaking_news_ribbon.svg';
    const ribbonImg = await loadImage(imgUrl);
    ctx.drawImage(ribbonImg, startX, ribbonY, ribbonW, ribbonH);
    ctx.restore();
    return;
  } catch (err) {
    console.warn('Could not load ribbon image, using vector fallback', err);
  }

  // Vector fallback matching uploaded BREAKING NEWS WALA.png
  const slantOffset = Math.round(ribbonH * 0.28);
  const leftW = Math.round(ribbonW * 0.48);

  // Top speed lines
  ctx.fillStyle = '#E50914';
  ctx.fillRect(startX + Math.round(ribbonW * 0.25), ribbonY - 6, Math.round(ribbonW * 0.58), 6);
  ctx.fillStyle = '#2244E8';
  ctx.fillRect(startX + 18, ribbonY + 6, Math.round(ribbonW * 0.45), 5);

  // Left Blue Parallelogram: BREAKING
  ctx.beginPath();
  ctx.moveTo(startX + slantOffset, ribbonY + 16);
  ctx.lineTo(startX + leftW + slantOffset, ribbonY + 16);
  ctx.lineTo(startX + leftW, ribbonY + ribbonH - 16);
  ctx.lineTo(startX, ribbonY + ribbonH - 16);
  ctx.closePath();
  ctx.fillStyle = '#2244E8';
  ctx.fill();

  // Right Red Parallelogram: NEWS
  const rightStartX = startX + leftW + 6;
  ctx.beginPath();
  ctx.moveTo(rightStartX + slantOffset, ribbonY + 14);
  ctx.lineTo(startX + ribbonW + slantOffset, ribbonY + 14);
  ctx.lineTo(startX + ribbonW, ribbonY + ribbonH - 14);
  ctx.lineTo(rightStartX, ribbonY + ribbonH - 14);
  ctx.closePath();
  ctx.fillStyle = '#E50914';
  ctx.fill();

  // Text BREAKING
  ctx.shadowColor = 'transparent';
  ctx.font = 'italic 900 48px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BREAKING', startX + leftW / 2 + slantOffset / 2, ribbonY + ribbonH / 2);

  // Text NEWS
  ctx.font = 'italic 900 52px sans-serif';
  ctx.fillText('NEWS', rightStartX + (ribbonW - (rightStartX - startX)) / 2 + slantOffset / 2, ribbonY + ribbonH / 2);

  // Bottom speed lines
  ctx.fillStyle = '#E50914';
  ctx.fillRect(startX + Math.round(ribbonW * 0.16), ribbonY + ribbonH - 8, Math.round(ribbonW * 0.32), 5);
  ctx.fillStyle = '#2244E8';
  ctx.fillRect(startX + Math.round(ribbonW * 0.30), ribbonY + ribbonH + 2, Math.round(ribbonW * 0.52), 6);

  ctx.restore();
}

// Crisp Double Quotation Mark Vector Icon (Opening or Closing)
function drawQuoteVectorIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number = 22,
  isClosing: boolean = false
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  if (!isClosing) {
    ctx.rotate(Math.PI);
  }
  ctx.fillStyle = '#000000';

  const scale = size / 24;
  const drawSingleComma = (ox: number) => {
    ctx.save();
    ctx.translate(ox, 0);

    // 1. Head circle
    ctx.beginPath();
    ctx.arc(0, -3.5 * scale, 4.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 2. Smooth curved tail pointing down and curving left
    ctx.beginPath();
    ctx.moveTo(3.5 * scale, -2.5 * scale);
    ctx.bezierCurveTo(3.5 * scale, 2.5 * scale, 1 * scale, 6.5 * scale, -4 * scale, 8.5 * scale);
    ctx.lineTo(-3.8 * scale, 6.5 * scale);
    ctx.bezierCurveTo(-0.5 * scale, 4 * scale, 1 * scale, 1.5 * scale, 1 * scale, -2.5 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  drawSingleComma(-6 * scale);
  drawSingleComma(6 * scale);
  ctx.restore();
}

// Render Subtle Watermark across canvas/photo area with Text or uploaded PNG Image Logo
async function drawUniversalWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  card: NewsCardData
) {
  const isImageWatermark = card.watermarkType === 'image' && !!card.watermarkImage;
  const opacity = card.watermarkOpacity ?? (card.breakingWatermarkOpacity ?? 0.12);
  const color = card.watermarkColor || (card.breakingWatermarkColor ?? 'white');

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  if (isImageWatermark && card.watermarkImage) {
    try {
      const wmImg = await loadImage(card.watermarkImage);
      ctx.globalAlpha = opacity;

      // Small logo width repeated in a neat diagonal staggered grid
      const logoW = card.watermarkScale || 96;
      const logoH = (wmImg.height / (wmImg.width || 1)) * logoW;
      const stepX = logoW + 90;
      const stepY = logoH + 70;

      ctx.translate(width / 2, height / 2);
      ctx.rotate((-22 * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      for (let y = -height * 0.8; y < height * 1.8; y += stepY) {
        // Stagger every other row
        const rowOffset = (Math.round(y / stepY) % 2 === 0) ? 0 : stepX / 2;
        for (let x = -width * 0.8; x < width * 1.8; x += stepX) {
          ctx.drawImage(wmImg, x + rowOffset, y, logoW, logoH);
        }
      }
    } catch (err) {
      console.warn('Universal watermark image load error:', err);
    }
  } else {
    // Text Watermark
    ctx.rotate((-22 * Math.PI) / 180);
    const fontSize = card.watermarkScale || 32;
    ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;

    if (color === 'black') {
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    } else if (color === 'red') {
      ctx.fillStyle = `rgba(220, 38, 38, ${opacity})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textToDraw = (
      card.watermarkText ||
      card.breakingWatermarkText ||
      (shouldShowAppWatermark() ? 'AI NEWS MAKER APP' : 'BREAKING NEWS WALA')
    ).toUpperCase();

    const stepX = Math.max(320, textToDraw.length * (fontSize * 0.65) + 110);
    const stepY = fontSize * 3.4;

    for (let y = -height * 1.5; y < height * 2.5; y += stepY) {
      const rowOffset = (Math.round(y / stepY) % 2 === 0) ? 0 : stepX / 2;
      for (let x = -width * 1.5; x < width * 2.5; x += stepX) {
        ctx.fillText(textToDraw, x + rowOffset, y);
      }
    }
  }

  ctx.restore();
}

// Render the 3-line headline caption - Justified (Default) or Center or Left
function drawRenderedHeadlineLines(
  ctx: CanvasRenderingContext2D,
  lines: WordToken[][],
  highlightColor: string,
  canvasWidth: number,
  startY: number,
  fontSize: number,
  lineHeight: number,
  align: 'justify' | 'center' | 'left' = 'justify',
  margin: number = 48,
  isLightBackground: boolean = false,
  disableStroke: boolean = false,
  fontFamily: string = 'Baloo 2'
) {
  ctx.save();
  ctx.font = `800 ${fontSize}px "${fontFamily}", "Noto Sans Devanagari", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const spaceWidth = ctx.measureText(' ').width;
  const targetLineWidth = canvasWidth - margin * 2;

  lines.forEach((line, lineIdx) => {
    const isLastLine = lineIdx === lines.length - 1;
    const gaps = line.length - 1;

    // Calculate total pure word width
    let totalWordWidth = 0;
    line.forEach((token) => {
      totalWordWidth += ctx.measureText(token.text).width;
    });

    const naturalLineWidth = totalWordWidth + gaps * spaceWidth;

    let curX: number;
    let currentSpaceWidth = spaceWidth;

    if (align === 'justify') {
      if (gaps > 0) {
        const extraSpace = targetLineWidth - totalWordWidth;
        const justifiedSpace = extraSpace / gaps;

        // In Justify mode:
        // If not the last line, or if the last line is substantially filled (>= 58% of width)
        if (!isLastLine || (naturalLineWidth / targetLineWidth >= 0.58 && justifiedSpace <= spaceWidth * 2.8)) {
          currentSpaceWidth = Math.max(spaceWidth, justifiedSpace);
          curX = margin;
        } else {
          // If the last line has very few words, center it with slightly enhanced word spacing
          const lastLineSpace = Math.min(spaceWidth * 1.5, Math.max(spaceWidth, justifiedSpace));
          const adjustedWidth = totalWordWidth + gaps * lastLineSpace;
          curX = Math.round((canvasWidth - adjustedWidth) / 2);
          currentSpaceWidth = lastLineSpace;
        }
      } else {
        // Single word on the line: center it
        curX = Math.round((canvasWidth - totalWordWidth) / 2);
      }
    } else if (align === 'left') {
      curX = margin;
      currentSpaceWidth = spaceWidth;
    } else {
      // Center
      curX = Math.round((canvasWidth - naturalLineWidth) / 2);
      currentSpaceWidth = spaceWidth;
    }

    const curY = startY + lineIdx * lineHeight;

    line.forEach((token) => {
      const wordW = ctx.measureText(token.text).width;

      if (!isLightBackground && !disableStroke) {
        // Heavy stroke shadow for punchy readability
        ctx.lineWidth = Math.min(6, Math.max(3, fontSize * 0.08));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.strokeText(token.text, curX, curY);
      }

      // Fill color
      ctx.fillStyle = token.isHighlight
        ? highlightColor
        : isLightBackground
        ? '#0A0A0A'
        : '#FFFFFF';
      ctx.fillText(token.text, curX, curY);

      curX += wordW + currentSpaceWidth;
    });
  });

  ctx.restore();
}

// Theme Footer Bar (Exact reproduction of Center-Aligned Profile Footer)
async function drawThemeFooterBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barH: number,
  socialHandle?: string,
  whatsappNumber?: string,
  customFooterPng?: string,
  websiteUrl?: string,
  activeSocialIcons?: ('youtube' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp')[],
  showMobileNumber?: boolean,
  footerBgColor: string = '#FFFFFF',
  footerTextColor?: string,
  footerIconStyle: 'color' | 'dark' | 'neutral' = 'color'
) {
  // If user uploaded custom Footer.png, draw it directly
  if (customFooterPng) {
    try {
      const footerImg = await loadImage(customFooterPng);
      const footerAspect = footerImg.width / footerImg.height;
      const drawH = width / footerAspect;
      ctx.drawImage(footerImg, 0, height - drawH, width, drawH);
      return;
    } catch (err) {
      console.warn('Custom footer load error:', err);
    }
  }

  ctx.save();
  const barY = height - barH;

  // Background color
  const bgColor = footerBgColor || '#FFFFFF';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, barY, width, barH);

  // Determine contrast
  const hex = bgColor.replace('#', '').trim();
  let luminance = 1.0;
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16) / 255;
    const g = parseInt(hex[1] + hex[1], 16) / 255;
    const b = parseInt(hex[2] + hex[2], 16) / 255;
    luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const isLightBg = luminance >= 0.5;
  const textColor = (footerTextColor && footerTextColor.trim())
    ? footerTextColor
    : (isLightBg ? '#0F172A' : '#FFFFFF');
  const separatorColor = isLightBg ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.4)';

  // Top subtle border line
  ctx.strokeStyle = isLightBg ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(width, barY);
  ctx.stroke();

  const iconY = barY + barH / 2;

  // 1. Sanitize social handle (strictly max 15 chars, no fallback to @BreakingNewsWala)
  let rawHandle = (socialHandle || '').trim();
  if (rawHandle.startsWith('@') || rawHandle.startsWith('/')) {
    rawHandle = rawHandle.replace(/^[@/]+/, '').trim();
  }
  if (rawHandle.length > 15) {
    rawHandle = rawHandle.slice(0, 15);
  }
  const displayHandle = rawHandle ? `@${rawHandle}` : '';

  // 2. Sanitize website
  const cleanWebsite = (websiteUrl || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');

  // 3. Sanitize phone number (only if showMobileNumber !== false)
  const shouldShowPhone = showMobileNumber !== false && Boolean(whatsappNumber && whatsappNumber.trim());
  let cleanPhone = shouldShowPhone ? whatsappNumber.replace(/^\/+/, '').trim() : '';
  if (cleanPhone && !cleanPhone.startsWith('+') && cleanPhone.length === 10) {
    cleanPhone = `+91 ${cleanPhone}`;
  }

  // Active social icons to display
  const icons: ('youtube' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp')[] =
    activeSocialIcons && activeSocialIcons.length > 0
      ? activeSocialIcons
      : ['youtube', 'facebook', 'instagram', 'whatsapp'];

  // Base typography & sizing - prominent and bold
  let baseFontSize = 24;
  let iconRadius = 14;
  let iconSpacing = 6;
  const dividerMargin = 16;
  const dividerWidth = 2;
  const dividerHeight = Math.round(barH * 0.38);

  ctx.font = `700 ${baseFontSize}px Arial, Helvetica, sans-serif`;
  const rawHandleWidth = displayHandle ? ctx.measureText(displayHandle).width : 0;
  const rawIconsWidth = icons.length > 0
    ? icons.length * (iconRadius * 2) + Math.max(0, icons.length - 1) * iconSpacing
    : 0;

  // Element 1 Width (Social icons + Handle, strictly NO partition between them)
  const rawElem1Width = rawIconsWidth + (displayHandle ? (rawIconsWidth > 0 ? 8 : 0) + rawHandleWidth : 0);

  // Element 2 Width (Globe Icon + Website)
  const rawGlobeWidth = cleanWebsite ? 24 : 0;
  const rawWebTextWidth = cleanWebsite ? ctx.measureText(cleanWebsite).width : 0;
  const rawElem2Width = cleanWebsite ? (rawGlobeWidth + 8 + rawWebTextWidth) : 0;

  // Element 3 Width (Phone Icon + Contact Number)
  const rawPhoneWidth = cleanPhone ? 24 : 0;
  const rawPhoneTextWidth = cleanPhone ? ctx.measureText(cleanPhone).width : 0;
  const rawElem3Width = cleanPhone ? (rawPhoneWidth + 8 + rawPhoneTextWidth) : 0;

  const hasDiv1 = rawElem1Width > 0 && rawElem2Width > 0;
  const hasDiv2 = rawElem3Width > 0 && (rawElem1Width > 0 || rawElem2Width > 0);
  const divSpace = dividerMargin * 2 + dividerWidth;

  const rawTotalWidth =
    rawElem1Width +
    (hasDiv1 ? divSpace : 0) +
    rawElem2Width +
    (hasDiv2 ? divSpace : 0) +
    rawElem3Width;

  // Adaptive scale to strictly fit in one line
  const maxAllowedWidth = width - 48;
  const scale = rawTotalWidth > maxAllowedWidth ? Math.max(0.65, maxAllowedWidth / rawTotalWidth) : 1;

  if (scale < 1) {
    baseFontSize = Math.max(14, Math.round(baseFontSize * scale));
    iconRadius = Math.max(9, Math.round(iconRadius * scale));
    iconSpacing = Math.max(3, Math.round(iconSpacing * scale));
  }

  // Recalculate with final scaled values
  const finalIconDiam = iconRadius * 2;
  const finalIconsWidth = icons.length > 0
    ? icons.length * finalIconDiam + Math.max(0, icons.length - 1) * iconSpacing
    : 0;

  ctx.font = `700 ${baseFontSize}px Arial, Helvetica, sans-serif`;
  const finalHandleWidth = displayHandle ? ctx.measureText(displayHandle).width : 0;
  const finalElem1Width = finalIconsWidth + (displayHandle ? (finalIconsWidth > 0 ? Math.round(8 * scale) : 0) + finalHandleWidth : 0);

  const finalGlobeWidth = cleanWebsite ? Math.round(24 * scale) : 0;
  const finalWebTextWidth = cleanWebsite ? ctx.measureText(cleanWebsite).width : 0;
  const finalElem2Width = cleanWebsite ? (finalGlobeWidth + Math.round(8 * scale) + finalWebTextWidth) : 0;

  const finalPhoneWidth = cleanPhone ? Math.round(24 * scale) : 0;
  const finalPhoneTextWidth = cleanPhone ? ctx.measureText(cleanPhone).width : 0;
  const finalElem3Width = cleanPhone ? (finalPhoneWidth + Math.round(8 * scale) + finalPhoneTextWidth) : 0;

  const finalDivMargin = Math.round(dividerMargin * scale);
  const finalDivSpace = finalDivMargin * 2 + dividerWidth;

  const finalTotalWidth =
    finalElem1Width +
    (hasDiv1 ? finalDivSpace : 0) +
    finalElem2Width +
    (hasDiv2 ? finalDivSpace : 0) +
    finalElem3Width;

  // STRICT CENTER ALIGNMENT: perfectly centered whether 2 or 3 elements are shown
  let curX = Math.round((width - finalTotalWidth) / 2);

  // Helper to draw circular social icon
  const drawCircleIcon = (x: number, type: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + iconRadius, iconY, iconRadius, 0, Math.PI * 2);

    if (footerIconStyle === 'dark') {
      ctx.fillStyle = '#000000';
    } else if (footerIconStyle === 'neutral') {
      ctx.fillStyle = isLightBg ? '#E2E8F0' : 'rgba(255, 255, 255, 0.2)';
    } else {
      if (type === 'youtube') ctx.fillStyle = '#FF0000';
      else if (type === 'facebook') ctx.fillStyle = '#1877F2';
      else if (type === 'instagram') {
        const igGrad = ctx.createLinearGradient(x, iconY - iconRadius, x + finalIconDiam, iconY + iconRadius);
        igGrad.addColorStop(0, '#833AB4');
        igGrad.addColorStop(0.5, '#FD1D1D');
        igGrad.addColorStop(1, '#FCB045');
        ctx.fillStyle = igGrad;
      } else if (type === 'twitter') ctx.fillStyle = '#000000';
      else if (type === 'telegram') ctx.fillStyle = '#24A1DE';
      else if (type === 'whatsapp') ctx.fillStyle = '#25D366';
      else ctx.fillStyle = '#000000';
    }
    ctx.fill();

    const glyphColor = footerIconStyle === 'neutral'
      ? (isLightBg ? '#334155' : '#FFFFFF')
      : '#FFFFFF';

    ctx.fillStyle = glyphColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const sz = iconRadius;
    if (type === 'instagram') {
      ctx.strokeStyle = glyphColor;
      ctx.lineWidth = Math.max(1.2, sz * 0.16);
      ctx.beginPath();
      ctx.roundRect(x + iconRadius - sz * 0.48, iconY - sz * 0.48, sz * 0.96, sz * 0.96, Math.max(2, sz * 0.25));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + iconRadius, iconY, sz * 0.25, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'facebook') {
      ctx.font = `bold ${Math.round(sz * 1.35)}px Arial, sans-serif`;
      ctx.fillText('f', x + iconRadius, iconY + 1);
    } else if (type === 'twitter') {
      ctx.font = `bold ${Math.round(sz * 1.1)}px Arial, sans-serif`;
      ctx.fillText('𝕏', x + iconRadius, iconY);
    } else if (type === 'youtube') {
      ctx.beginPath();
      ctx.moveTo(x + iconRadius - sz * 0.35, iconY - sz * 0.4);
      ctx.lineTo(x + iconRadius + sz * 0.45, iconY);
      ctx.lineTo(x + iconRadius - sz * 0.35, iconY + sz * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'telegram') {
      ctx.font = `bold ${Math.round(sz * 1.15)}px Arial, sans-serif`;
      ctx.fillText('✈', x + iconRadius, iconY - 1);
    } else if (type === 'whatsapp') {
      ctx.font = `bold ${Math.round(sz * 1.05)}px Arial, sans-serif`;
      ctx.fillText('📞', x + iconRadius, iconY);
    }
    ctx.restore();
  };

  // Helper to draw crisp vector globe icon
  const drawGlobeIcon = (x: number, y: number, size: number) => {
    ctx.save();
    const r = size / 2;
    const cx = x + r;
    const cy = y;
    ctx.strokeStyle = isLightBg ? '#0284C7' : '#38BDF8';
    ctx.lineWidth = Math.max(1.6, size * 0.08);

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Inner vertical ellipse
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, r * 0.45), r - 1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal equator line
    ctx.beginPath();
    ctx.moveTo(cx - r + 1, cy);
    ctx.lineTo(cx + r - 1, cy);
    ctx.stroke();
    ctx.restore();
  };

  // Helper to draw phone icon
  const drawPhonePillIcon = (x: number, y: number, size: number) => {
    ctx.save();
    const r = size / 2;
    const cx = x + r;
    const cy = y;

    // Green circular badge
    ctx.fillStyle = '#25D366';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Phone glyph
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(size * 0.65)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📞', cx, cy);
    ctx.restore();
  };

  // Helper to draw crisp vertical partition line
  const drawPartitionLine = (x: number) => {
    ctx.save();
    ctx.strokeStyle = separatorColor;
    ctx.lineWidth = dividerWidth;
    ctx.beginPath();
    ctx.moveTo(x, iconY - dividerHeight / 2);
    ctx.lineTo(x, iconY + dividerHeight / 2);
    ctx.stroke();
    ctx.restore();
  };

  // ================= 1. DRAW ELEMENT 1 (Social Icons + Handle, NO Partition inside) =================
  if (finalElem1Width > 0) {
    for (const iconType of icons) {
      drawCircleIcon(curX, iconType);
      curX += finalIconDiam + iconSpacing;
    }
    if (displayHandle) {
      if (icons.length > 0) curX += Math.round(8 * scale);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.font = `700 ${baseFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillText(displayHandle, curX, iconY);
      curX += finalHandleWidth;
    }
  }

  // ================= 2. DRAW PARTITION LINE 1 (Between Social and Website) =================
  if (hasDiv1) {
    curX += finalDivMargin;
    drawPartitionLine(curX);
    curX += finalDivMargin + dividerWidth;
  }

  // ================= 3. DRAW ELEMENT 2 (Website Icon + Address) =================
  if (finalElem2Width > 0) {
    drawGlobeIcon(curX, iconY, finalGlobeWidth);
    curX += finalGlobeWidth + Math.round(8 * scale);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `700 ${baseFontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillText(cleanWebsite, curX, iconY);
    curX += finalWebTextWidth;
  }

  // ================= 4. DRAW PARTITION LINE 2 (Between Website and Contact, only if Contact shown) =================
  if (hasDiv2) {
    curX += finalDivMargin;
    drawPartitionLine(curX);
    curX += finalDivMargin + dividerWidth;
  }

  // ================= 5. DRAW ELEMENT 3 (Contact Icon + Number) =================
  if (finalElem3Width > 0) {
    drawPhonePillIcon(curX, iconY, finalPhoneWidth);
    curX += finalPhoneWidth + Math.round(8 * scale);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `700 ${baseFontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillText(cleanPhone, curX, iconY);
    curX += finalPhoneTextWidth;
  }

  ctx.restore();
}

/**
 * html2canvas 1080x1350 Card Exporter
 * Generates an ultra-crisp 1080x1350 canvas directly from the DOM preview
 */
export async function generateCardCanvas(
  elementId: string = 'news-card-preview'
): Promise<HTMLCanvasElement> {
  const element =
    document.getElementById(elementId) ||
    document.getElementById('news-card-container') ||
    document.querySelector('[data-card-preview="true"]');
  if (!element) throw new Error('Preview element not found');

  const htmlElement = element as HTMLElement;
  const origTransform = htmlElement.style.transform;
  htmlElement.style.transform = 'none';

  try {
    const canvas = await html2canvas(htmlElement, {
      width: 1080,
      height: 1350,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0a',
      logging: false,
    });
    return canvas;
  } finally {
    htmlElement.style.transform = origTransform;
  }
}

/**
 * Downloads a canvas as high-quality PNG or JPG, with blob support and routing to Android Gallery if running in Android app
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string = 'breaking-news.png',
  format: 'png' | 'jpeg' = 'png'
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1.0;
      const finalExt = format === 'jpeg' ? '.jpg' : '.png';
      let cleanFilename = filename;
      if (!cleanFilename.toLowerCase().endsWith(finalExt)) {
        cleanFilename = cleanFilename.replace(/\.[^/.]+$/, '') + finalExt;
      }

      // Safe Data URL generator with fallback
      const getSafeDataUrl = (): string | null => {
        try {
          return canvas.toDataURL(mime, quality);
        } catch (e) {
          console.warn('Canvas toDataURL direct call warning:', e);
          try {
            // If direct call fails, try PNG format as fallback
            return canvas.toDataURL('image/png');
          } catch (e2) {
            console.warn('Canvas toDataURL fallback failed:', e2);
            return null;
          }
        }
      };

      // 1. Android Native Bridge integration (saves directly into Android MediaStore / Pictures Gallery)
      if (
        typeof window !== 'undefined' &&
        (window as any).AndroidBridge &&
        typeof (window as any).AndroidBridge.downloadImage === 'function'
      ) {
        try {
          const dataUrl = getSafeDataUrl();
          if (dataUrl) {
            (window as any).AndroidBridge.downloadImage(dataUrl, cleanFilename);
            resolve(true);
            return;
          }
        } catch (bridgeErr) {
          console.warn('AndroidBridge call failed, falling back to browser download', bridgeErr);
        }
      }

      // 2. Blob-based object URL download (Primary Web strategy)
      let downloadTriggered = false;
      if (typeof canvas.toBlob === 'function') {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                downloadTriggered = true;
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = cleanFilename;
                link.href = objectUrl;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                  if (link.parentNode) {
                    document.body.removeChild(link);
                  }
                  URL.revokeObjectURL(objectUrl);
                  resolve(true);
                }, 400);
              } else {
                fallbackDirectDownload();
              }
            },
            mime,
            quality
          );
        } catch (blobErr) {
          console.warn('canvas.toBlob threw, trying direct dataUrl fallback:', blobErr);
          fallbackDirectDownload();
        }
      } else {
        fallbackDirectDownload();
      }

      function fallbackDirectDownload() {
        if (downloadTriggered) return;
        try {
          const dataUrl = getSafeDataUrl();
          if (dataUrl) {
            downloadTriggered = true;
            const link = document.createElement('a');
            link.download = cleanFilename;
            link.href = dataUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (link.parentNode) {
                document.body.removeChild(link);
              }
              resolve(true);
            }, 300);
            return;
          }
        } catch (fallbackErr) {
          console.warn('Direct fallback failed:', fallbackErr);
        }
        resolve(true);
      }
    } catch (err) {
      console.error('downloadCanvas error:', err);
      reject(err);
    }
  });
}

