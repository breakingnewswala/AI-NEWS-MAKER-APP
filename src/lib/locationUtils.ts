// AI NEWS MAKER — Location Utility Functions
// Handles Location Deduplication, Normalization, and Clean Presentation

export function formatCleanLocationText(rawLocation?: string | null): string {
  if (!rawLocation || typeof rawLocation !== 'string') return '';
  let cleaned = rawLocation
    .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
    .replace(/[:\-–—]+$/, '')
    .trim();

  if (!cleaned || cleaned === 'लोकेशन') return 'लोकेशन';

  // Canonicalize standard Hindi states with space
  cleaned = cleaned
    .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
    .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
    .replace(/हिमाचलप्रदेश/g, 'हिमाचल प्रदेश')
    .replace(/आंध्रप्रदेश/g, 'आंध्र प्रदेश');

  // Split by comma, slash, pipe or dash
  const parts = cleaned.split(/[,/|]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return cleaned;

  // Deduplicate case-insensitively / normalized
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const canonicalPart = part
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .replace(/हिमाचलप्रदेश/g, 'हिमाचल प्रदेश')
      .replace(/आंध्रप्रदेश/g, 'आंध्र प्रदेश')
      .trim();
    const norm = canonicalPart.toLowerCase().replace(/[\s\-_]/g, '');
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueParts.push(canonicalPart);
    }
  }

  return uniqueParts.join(', ');
}

export interface DynamicLocationOptions {
  locationText?: string | null;
  locationRect?: { x: number; y: number; width: number; height: number };
  sliceConfig?: { leftWidthPct?: number; rightWidthPct?: number };
  typographyConfig?: { fontSize?: number; fontFamily?: string; weight?: number | string };
  locationFontSize?: number;
  hasBadgeAsset?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface DynamicLocationResult {
  dynamicBw: number;
  widthPct: number;
  cleanLocText: string;
  fontSize: number;
  leftDestW: number;
  rightDestW: number;
  finalCenterW: number;
}

/**
 * Calculates dynamic badge width for CanvasExporter and CardPreview
 * using font text metrics, padding, and slice geometry to ensure 100% preview-export parity.
 */
export function calculateDynamicLocationMetrics(options: DynamicLocationOptions): DynamicLocationResult {
  const width = options.canvasWidth || 1080;
  const height = options.canvasHeight || 1350;
  const locRect = options.locationRect || { x: 5, y: 13.5, width: 28, height: 4.5 };
  const bx = (locRect.x / 100) * width;
  const bh = (locRect.height / 100) * height;

  const cleanLocText = formatCleanLocationText(options.locationText || '');
  const typo = options.typographyConfig;
  const fontSize = Math.round((typo?.fontSize || options.locationFontSize || 20) * (width / 1080));
  const fontFamily = typo?.fontFamily || 'Baloo 2';
  const fontWeight = typo?.weight || 800;

  // Accurately measure or approximate text width using canvas if available
  let measuredTextW = Math.round(cleanLocText.length * fontSize * 0.72);
  if (typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", "Noto Sans Devanagari", sans-serif`;
        const m = ctx.measureText(cleanLocText).width;
        if (m > 0) measuredTextW = Math.round(m);
      }
    } catch {}
  }

  let dynamicBw: number;
  let leftDestW = 0;
  let rightDestW = 0;
  let finalCenterW = 0;

  if (options.hasBadgeAsset) {
    const leftSlicePct = options.sliceConfig?.leftWidthPct ?? 0.28;
    const rightSlicePct = options.sliceConfig?.rightWidthPct ?? 0.15;
    const pinW = Math.round(400 * leftSlicePct);
    const capW = Math.round(400 * rightSlicePct);
    leftDestW = Math.round((pinW / 100) * bh);
    rightDestW = Math.round((capW / 100) * bh);

    const neededCenterW = Math.max(10, measuredTextW + 24);
    dynamicBw = Math.min(width - bx - 20, Math.max(100, Math.round(leftDestW + neededCenterW + rightDestW)));
    finalCenterW = Math.max(10, dynamicBw - leftDestW - rightDestW);
  } else {
    dynamicBw = Math.min(width - bx - 20, Math.max(100, Math.round(measuredTextW + 52)));
    finalCenterW = dynamicBw;
  }

  const widthPct = Number(((dynamicBw / width) * 100).toFixed(2));

  return {
    dynamicBw,
    widthPct,
    cleanLocText,
    fontSize,
    leftDestW,
    rightDestW,
    finalCenterW,
  };
}
