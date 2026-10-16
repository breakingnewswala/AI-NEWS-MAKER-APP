/**
 * AI NEWS MAKER — CANONICAL LAYOUT & SAFE-ZONE ENGINE
 * 
 * Single source of truth for:
 * - Canvas dimensions & aspect ratios
 * - Broadcast Action Safe (90%) and Title Safe (80%) boundaries
 * - Template-specific safe zones (chevrons, bevels, banners, photo areas, footers)
 * - Headline token parsing, font autosizing, word wrapping, and metrics calculation
 * - Location, Logo, Footer, and Custom Text Safe-Zone enforcement
 * 
 * Shared identically between CardPreview (live preview) and CanvasExporter (high-res export)
 * to guarantee 100% visual and geometric consistency.
 */

import { NewsCardData } from '../types';
import { cleanHeadlineText } from './speakerUtils';

export interface WordToken {
  text: string;
  isHighlight: boolean;
}

export interface SafeZoneBox {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface TemplateLayoutSpec {
  templateId: string;
  aspectRatio: '4:5' | '1:1' | '9:16';
  width: number;
  height: number;
  actionSafe: SafeZoneBox;
  titleSafe: SafeZoneBox;
  headlineArea: {
    x: number;
    y: number;
    width: number;
    height: number;
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
    maxWidth: number;
    maxHeight: number;
    maxLines: number;
    supportsFourLines: boolean;
    defaultFontSize: number;
    minFontSize: number;
    maxFontSize: number;
  };
  photoArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  footerArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  locationArea: {
    safeX: number;
    safeY: number;
    maxWidth: number;
    height: number;
  };
  logoArea: {
    safeLeft: number;
    safeTop: number;
    safeRight: number;
    safeBottom: number;
  };
}

export interface CanonicalHeadlineLayout {
  lines: WordToken[][];
  lineMetrics: {
    text: string;
    width: number;
    startX: number;
    y: number;
  }[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
  startY: number;
  centerY: number;
  maxWidth: number;
  maxHeight: number;
  isValid: boolean;
  validationError?: string;
  spec: TemplateLayoutSpec;
}

/**
 * Returns canonical dimensions for any given aspect ratio
 */
export function getCanvasDimensions(aspectRatio?: string): { width: number; height: number; ratio: '4:5' | '1:1' | '9:16' } {
  const width = 1080;
  if (aspectRatio === '1:1') return { width, height: 1080, ratio: '1:1' };
  if (aspectRatio === '9:16') return { width, height: 1920, ratio: '9:16' };
  return { width, height: 1350, ratio: '4:5' };
}

/**
 * Compute official Action Safe (90% width & height, 5% inset)
 */
export function getActionSafeZone(width: number, height: number): SafeZoneBox {
  const insetX = Math.round(width * 0.05);
  const insetY = Math.round(height * 0.05);
  const boxW = Math.round(width * 0.90);
  const boxH = Math.round(height * 0.90);
  return {
    x: insetX,
    y: insetY,
    width: boxW,
    height: boxH,
    right: insetX + boxW,
    bottom: insetY + boxH,
  };
}

/**
 * Compute official Title Safe (80% width & height, 10% inset)
 */
export function getTitleSafeZone(width: number, height: number): SafeZoneBox {
  const insetX = Math.round(width * 0.10);
  const insetY = Math.round(height * 0.10);
  const boxW = Math.round(width * 0.80);
  const boxH = Math.round(height * 0.80);
  return {
    x: insetX,
    y: insetY,
    width: boxW,
    height: boxH,
    right: insetX + boxW,
    bottom: insetY + boxH,
  };
}

/**
 * Returns complete layout specification for any template
 */
export function getTemplateLayoutSpec(
  templateIdOrCard?: string | Partial<NewsCardData>,
  customAspectRatio?: string
): TemplateLayoutSpec {
  let templateId = 'graphic_001';
  let aspectRatioStr = customAspectRatio || '4:5';

  if (typeof templateIdOrCard === 'string') {
    templateId = templateIdOrCard || 'graphic_001';
  } else if (templateIdOrCard && typeof templateIdOrCard === 'object') {
    templateId = templateIdOrCard.frameDesign || 'graphic_001';
    aspectRatioStr = templateIdOrCard.aspectRatio || aspectRatioStr;
  }

  const { width, height, ratio } = getCanvasDimensions(aspectRatioStr);
  const actionSafe = getActionSafeZone(width, height);
  const titleSafe = getTitleSafeZone(width, height);

  // Default Fallback Specs (Strict Safe Zones)
  let photoH = Math.round(height * 0.6133);
  let footerH = Math.round(height * 0.1015);
  let bannerY = photoH;
  let bannerH = height - photoH - footerH;

  // Title safe bounds provide universal baseline
  let headlineSafeLeft = titleSafe.x;
  let headlineSafeRight = titleSafe.right;
  let headlineSafeTop = bannerY + 20;
  let headlineSafeBottom = bannerY + bannerH - 20;
  let maxHeadlineW = titleSafe.width;
  let maxHeadlineH = headlineSafeBottom - headlineSafeTop;
  let maxLines = 3;
  let supportsFourLines = false;
  let defaultFontSize = 66;
  let minFontSize = 36;
  let maxFontSize = 72;

  if (templateId === 'graphic_001') {
    // Graphic 1: Red Headline Banner with Left & Right Chevrons (chevrons occupy x=0..90 and x=990..1080)
    // Headline must comfortably stay inside Title Safe (108..972) and clear chevrons + shadow blur
    photoH = Math.round(height * 0.6133); // ~828px
    bannerY = photoH;
    bannerH = Math.round(height * 0.2852); // ~385px
    footerH = height - (bannerY + bannerH); // ~137px

    // Buffer 12px inside Title Safe to ensure 14px shadow blur never touches chevrons or edge
    headlineSafeLeft = 114;
    headlineSafeRight = 966;
    maxHeadlineW = headlineSafeRight - headlineSafeLeft; // 852px (well inside 864px Title Safe)

    // Vertical safe padding: 22px below top streak glow, 22px above bottom bevel
    headlineSafeTop = bannerY + 22; // ~850px
    headlineSafeBottom = bannerY + bannerH - 22; // ~1191px
    maxHeadlineH = headlineSafeBottom - headlineSafeTop; // ~341px

    maxLines = 4;
    supportsFourLines = true;
    defaultFontSize = 68;
    minFontSize = 38;
    maxFontSize = 74;
  } else if (templateId === 'graphic_002') {
    // Graphic 2: Orange Border, Comment Box CTA, Photo ~54%
    photoH = Math.round(height * 0.54);
    const ctaLineY = Math.round(height * 0.85);
    bannerY = photoH;
    bannerH = ctaLineY - photoH;
    footerH = Math.round(height * 0.098);

    headlineSafeLeft = 114;
    headlineSafeRight = 966;
    maxHeadlineW = 852;
    headlineSafeTop = bannerY + 16;
    headlineSafeBottom = bannerY + bannerH - 16;
    maxHeadlineH = headlineSafeBottom - headlineSafeTop;

    maxLines = 3;
    supportsFourLines = false;
    defaultFontSize = 66;
    minFontSize = 36;
    maxFontSize = 70;
  } else if (templateId === 'graphic_003') {
    // Graphic 3: Modern Minimalist Pro News
    photoH = Math.round(height * 0.58);
    bannerY = photoH;
    bannerH = Math.round(height * 0.31);
    footerH = height - (bannerY + bannerH);

    headlineSafeLeft = 114;
    headlineSafeRight = 966;
    maxHeadlineW = 852;
    headlineSafeTop = bannerY + 20;
    headlineSafeBottom = bannerY + bannerH - 20;
    maxHeadlineH = headlineSafeBottom - headlineSafeTop;

    maxLines = 3;
    supportsFourLines = false;
    defaultFontSize = 68;
    minFontSize = 38;
    maxFontSize = 72;
  } else if (templateId === 'graphic_004') {
    // Graphic 4: Top Headline, Photo Middle, Footer Bottom
    bannerY = actionSafe.y + 10;
    bannerH = Math.round(height * 0.26);
    photoH = Math.round(height * 0.60);
    footerH = height - (bannerY + bannerH + photoH);

    headlineSafeLeft = 114;
    headlineSafeRight = 966;
    maxHeadlineW = 852;
    headlineSafeTop = bannerY + 10;
    headlineSafeBottom = bannerY + bannerH - 10;
    maxHeadlineH = headlineSafeBottom - headlineSafeTop;

    maxLines = 3;
    supportsFourLines = false;
    defaultFontSize = 76;
    minFontSize = 42;
    maxFontSize = 84;
  } else if (templateId === 'jacket-morning') {
    // Morning Jacket (Suvichar / Quotes)
    bannerY = actionSafe.y + 40;
    footerH = Math.round(height * 0.10);
    bannerH = height - bannerY - footerH - 20;

    headlineSafeLeft = 114;
    headlineSafeRight = 966;
    maxHeadlineW = 852;
    headlineSafeTop = bannerY + 10;
    headlineSafeBottom = bannerY + bannerH - 10;
    maxHeadlineH = headlineSafeBottom - headlineSafeTop;

    maxLines = 6;
    supportsFourLines = true;
    defaultFontSize = 64;
    minFontSize = 34;
    maxFontSize = 80;
  } else if (templateId === 'jacket-quote') {
    // Quote Template
    photoH = Math.round(height * 0.52);
    bannerY = photoH;
    bannerH = height - photoH - footerH;

    headlineSafeLeft = 120;
    headlineSafeRight = 960;
    maxHeadlineW = 840;
    headlineSafeTop = bannerY + 16;
    headlineSafeBottom = bannerY + bannerH - 16;
    maxHeadlineH = headlineSafeBottom - headlineSafeTop;

    maxLines = 4;
    supportsFourLines = true;
    defaultFontSize = 60;
    minFontSize = 36;
    maxFontSize = 72;
  }

  return {
    templateId,
    aspectRatio: ratio,
    width,
    height,
    actionSafe,
    titleSafe,
    headlineArea: {
      x: headlineSafeLeft,
      y: bannerY,
      width: maxHeadlineW,
      height: bannerH,
      safeLeft: headlineSafeLeft,
      safeRight: headlineSafeRight,
      safeTop: headlineSafeTop,
      safeBottom: headlineSafeBottom,
      maxWidth: maxHeadlineW,
      maxHeight: maxHeadlineH,
      maxLines,
      supportsFourLines,
      defaultFontSize,
      minFontSize,
      maxFontSize,
    },
    photoArea: {
      x: 0,
      y: 0,
      width,
      height: photoH,
    },
    footerArea: {
      x: 0,
      y: height - footerH,
      width,
      height: footerH,
    },
    locationArea: {
      safeX: actionSafe.right - Math.round(width * 0.46),
      safeY: Math.round(height * 0.066),
      maxWidth: Math.round(width * 0.46),
      height: Math.round(height * 0.045),
    },
    logoArea: {
      safeLeft: actionSafe.x,
      safeTop: actionSafe.y,
      safeRight: actionSafe.right,
      safeBottom: Math.round(height * 0.60),
    },
  };
}

/**
 * Parses headline string with [yellow]...[/yellow] tags or highlight words into WordTokens
 */
export function parseHeadlineTokens(
  rawText: string,
  highlightWords: string[] = []
): WordToken[] {
  if (!rawText) return [];
  const yellowRegex = /\[(?:yellow|highlight)\](.*?)\[\/(?:yellow|highlight)\]/gi;
  const tokens: WordToken[] = [];
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

  while ((match = yellowRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      const regularChunk = rawText.substring(lastIndex, match.index);
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

  if (lastIndex < rawText.length) {
    const tailChunk = rawText.substring(lastIndex);
    for (const w of tailChunk.split(/[ \t]+/)) {
      if (w && w.trim()) tokens.push({ text: w.trim(), isHighlight: checkIsHl(w) });
    }
  }

  return tokens;
}

// Reusable offscreen canvas for browser text measurement
let sharedMeasureCanvas: HTMLCanvasElement | null = null;
let sharedMeasureCtx: CanvasRenderingContext2D | null = null;

function getSharedMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document !== 'undefined') {
    if (!sharedMeasureCanvas) {
      sharedMeasureCanvas = document.createElement('canvas');
      sharedMeasureCanvas.width = 1080;
      sharedMeasureCanvas.height = 200;
      sharedMeasureCtx = sharedMeasureCanvas.getContext('2d');
    }
    return sharedMeasureCtx;
  }
  return null;
}

/**
 * Calibrated fallback measurement for Devanagari in Baloo 2 weight 900
 * when running in headless Node.js tests without a DOM Canvas context
 */
function estimateDevanagariWidth(text: string, fontSize: number): number {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    // Devanagari combining marks / matras
    if ((code >= 0x093E && code <= 0x094D) || code === 0x093C || code === 0x0902) {
      units += 0.25;
    } else if (code >= 0x0900 && code <= 0x097F) {
      units += 0.62; // Consonants / vowels in Baloo 2 900
    } else if (code >= 0x30 && code <= 0x39) {
      units += 0.55; // Digits
    } else if (ch === '₹') {
      units += 0.65;
    } else if (ch === '%' || ch === '@' || ch === '&') {
      units += 0.75;
    } else if (/^[,\.\!\?\:\;।\-]/.test(ch)) {
      units += 0.25;
    } else if (ch === ' ') {
      units += 0.28;
    } else {
      units += 0.55; // Latin characters
    }
  }
  return units * fontSize;
}

/**
 * Measures text width accurately using Canvas 2D when available,
 * or calibrated metrics fallback
 */
export function measureTextWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string = '900',
  ctx?: CanvasRenderingContext2D | null
): number {
  const activeCtx = ctx || getSharedMeasureCtx();
  if (activeCtx) {
    activeCtx.save();
    activeCtx.font = `${fontWeight} ${fontSize}px "${fontFamily}", "Noto Sans Devanagari", sans-serif`;
    const w = activeCtx.measureText(text).width;
    activeCtx.restore();
    return w;
  }
  return estimateDevanagariWidth(text, fontSize);
}

export interface HeadlineLayoutOptions {
  headline: string;
  highlightWords?: string[];
  fontFamily?: string;
  templateId?: string;
  aspectRatio?: string;
  customMaxLines?: number;
  userFontSize?: number;
  ctx?: CanvasRenderingContext2D | null;
}

/**
 * The Canonical Headline Layout Calculation
 * 
 * Guarantees:
 * 1. Text wrapping is calculated ONCE using real font metrics.
 * 2. Words wrap cleanly into lines without ever escaping maxWidth.
 * 3. Never merges trailing words onto the final line.
 * 4. Font size iteratively steps down until lines <= maxLines AND height <= maxHeight.
 * 5. Centers each line with verified StartX >= safeLeft and EndX <= safeRight.
 * 6. Returns structured lines for both HTML preview and Canvas 2D export.
 */
export function computeCanonicalHeadlineLayout(options: HeadlineLayoutOptions): CanonicalHeadlineLayout {
  const spec = getTemplateLayoutSpec(options.templateId, options.aspectRatio);
  const rawHeadline = cleanHeadlineText(options.headline || '');
  const fontFam = options.fontFamily || 'Baloo 2';
  const maxLines = options.customMaxLines || spec.headlineArea.maxLines;
  const maxW = spec.headlineArea.maxWidth;
  const maxH = spec.headlineArea.maxHeight;

  if (!rawHeadline.trim()) {
    return {
      lines: [],
      lineMetrics: [],
      fontSize: spec.headlineArea.defaultFontSize,
      lineHeight: Math.round(spec.headlineArea.defaultFontSize * 1.30),
      totalHeight: 0,
      startY: spec.headlineArea.y + spec.headlineArea.height / 2,
      centerY: spec.headlineArea.y + spec.headlineArea.height / 2,
      maxWidth: maxW,
      maxHeight: maxH,
      isValid: true,
      spec,
    };
  }

  const manualLines = rawHeadline.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isManual = manualLines.length > 1;

  // Font size boundary bounds
  const startFontSize = options.userFontSize
    ? Math.min(spec.headlineArea.maxFontSize, Math.max(spec.headlineArea.minFontSize, Math.round(options.userFontSize * 2.1)))
    : spec.headlineArea.maxFontSize;
  const endFontSize = spec.headlineArea.minFontSize;

  let bestFontSize = endFontSize;
  let bestLines: WordToken[][] = [];
  let bestLineH = Math.round(endFontSize * 1.30);
  let bestTotalH = 0;
  let fitsCleanly = false;

  for (let s = startFontSize; s >= endFontSize; s -= 2) {
    const lineH = Math.round(s * 1.30);
    const spaceW = measureTextWidth(' ', fontFam, s, '900', options.ctx);
    const lines: WordToken[][] = [];

    if (isManual) {
      // User pressed Enter: preserve user line intent while wrapping each line inside maxWidth
      let manualOverflow = false;
      for (const mLine of manualLines) {
        const mTokens = parseHeadlineTokens(mLine, options.highlightWords);
        let curLine: WordToken[] = [];
        let curWidth = 0;

        for (const token of mTokens) {
          const w = measureTextWidth(token.text, fontFam, s, '900', options.ctx);
          const needed = curLine.length === 0 ? w : curWidth + spaceW + w;
          if (needed > maxW && curLine.length > 0) {
            lines.push(curLine);
            curLine = [token];
            curWidth = w;
          } else {
            curLine.push(token);
            curWidth = needed;
          }
        }
        if (curLine.length > 0) lines.push(curLine);
        if (lines.length > maxLines) {
          manualOverflow = true;
          break;
        }
      }
      const totalH = lines.length * lineH;
      if (!manualOverflow && lines.length <= maxLines && totalH <= maxH) {
        bestFontSize = s;
        bestLines = lines;
        bestLineH = lineH;
        bestTotalH = totalH;
        fitsCleanly = true;
        break;
      }
    } else {
      // Single continuous headline: auto-wrap tokens inside maxW
      const allTokens = parseHeadlineTokens(rawHeadline, options.highlightWords);
      let curLine: WordToken[] = [];
      let curWidth = 0;

      for (const token of allTokens) {
        const w = measureTextWidth(token.text, fontFam, s, '900', options.ctx);
        const needed = curLine.length === 0 ? w : curWidth + spaceW + w;
        if (needed > maxW && curLine.length > 0) {
          lines.push(curLine);
          curLine = [token];
          curWidth = w;
        } else {
          curLine.push(token);
          curWidth = needed;
        }
      }
      if (curLine.length > 0) lines.push(curLine);

      const totalH = lines.length * lineH;
      if (lines.length <= maxLines && totalH <= maxH) {
        bestFontSize = s;
        bestLines = lines;
        bestLineH = lineH;
        bestTotalH = totalH;
        fitsCleanly = true;
        break;
      }
    }
  }

  // Fallback if headline is excessively long even at minFontSize
  if (!fitsCleanly) {
    const spaceW = measureTextWidth(' ', fontFam, endFontSize, '900', options.ctx);
    const allTokens = parseHeadlineTokens(rawHeadline, options.highlightWords);
    const lines: WordToken[][] = [];
    let curLine: WordToken[] = [];
    let curWidth = 0;

    for (const token of allTokens) {
      const w = measureTextWidth(token.text, fontFam, endFontSize, '900', options.ctx);
      const needed = curLine.length === 0 ? w : curWidth + spaceW + w;
      if (needed > maxW && curLine.length > 0) {
        lines.push(curLine);
        curLine = [token];
        curWidth = w;
        if (lines.length >= maxLines) break; // Strict clamp to prevent overflow
      } else {
        curLine.push(token);
        curWidth = needed;
      }
    }
    if (curLine.length > 0 && lines.length < maxLines) {
      lines.push(curLine);
    }
    bestFontSize = endFontSize;
    bestLines = lines;
    bestLineH = Math.round(endFontSize * 1.30);
    bestTotalH = lines.length * bestLineH;
  }

  // Calculate precise geometric coordinates for every line
  const centerY = spec.headlineArea.y + spec.headlineArea.height / 2;
  const startY = centerY - ((bestLines.length - 1) * bestLineH) / 2;
  const spaceW = measureTextWidth(' ', fontFam, bestFontSize, '900', options.ctx);

  const lineMetrics = bestLines.map((line, idx) => {
    let lw = 0;
    line.forEach((tok, tIdx) => {
      lw += measureTextWidth(tok.text, fontFam, bestFontSize, '900', options.ctx);
      if (tIdx < line.length - 1) lw += spaceW;
    });
    const startX = Math.round(spec.width / 2 - lw / 2);
    const lineY = Math.round(startY + idx * bestLineH);
    return {
      text: line.map((t) => t.text).join(' '),
      width: Math.round(lw),
      startX,
      y: lineY,
    };
  });

  return {
    lines: bestLines,
    lineMetrics,
    fontSize: bestFontSize,
    lineHeight: bestLineH,
    totalHeight: bestTotalH,
    startY,
    centerY,
    maxWidth: maxW,
    maxHeight: maxH,
    isValid: fitsCleanly,
    validationError: fitsCleanly
      ? undefined
      : `हेडलाइन सेफ-ज़ोन सीमा (${maxLines} लाइन) से बड़ी है। कृपया कुछ शब्द संक्षिप्त करें।`,
    spec,
  };
}

/**
 * Re-validates complete card data before download (Requirement 6)
 */
export function validateCardBeforeDownload(card: NewsCardData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  layout: CanonicalHeadlineLayout;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const spec = getTemplateLayoutSpec(card);
  const layout = computeCanonicalHeadlineLayout({
    headline: card.formattedHeadline || card.headline,
    highlightWords: card.highlightWords,
    fontFamily: card.headlineFontFamily,
    templateId: card.frameDesign,
    aspectRatio: card.aspectRatio,
  });

  // 1. Headline safe-zone validation
  if (!layout.isValid) {
    errors.push(layout.validationError || 'हेडलाइन सेफ-ज़ोन से बाहर जा रही है।');
  }

  for (let i = 0; i < layout.lineMetrics.length; i++) {
    const metric = layout.lineMetrics[i];
    if (metric.startX < spec.headlineArea.safeLeft) {
      errors.push(`हेडलाइन लाइन ${i + 1} बाईं सेफ-ज़ोन सीमा से बाहर है।`);
    }
    if (metric.startX + metric.width > spec.headlineArea.safeRight) {
      errors.push(`हेडलाइन लाइन ${i + 1} दाईं सेफ-ज़ोन सीमा से बाहर है।`);
    }
  }

  // 2. Vertical safe-zone validation
  if (layout.lineMetrics.length > 0) {
    const topMetric = layout.lineMetrics[0];
    const bottomMetric = layout.lineMetrics[layout.lineMetrics.length - 1];
    if (topMetric.y - layout.lineHeight * 0.45 < spec.headlineArea.safeTop) {
      errors.push('हेडलाइन का ऊपरी भाग सुरक्षित सीमा से बाहर है।');
    }
    if (bottomMetric.y + layout.lineHeight * 0.45 > spec.headlineArea.safeBottom) {
      errors.push('हेडलाइन का निचला भाग सुरक्षित सीमा से बाहर है।');
    }
  }

  // 3. Location safe-zone check
  if (card.showLocation !== false && card.location) {
    const cleanLoc = card.location.trim();
    if (cleanLoc.length > 45) {
      warnings.push('स्थान का नाम लंबा है, कृपया सुनिश्चित करें कि यह सेफ-ज़ोन में रहे।');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    layout,
  };
}
