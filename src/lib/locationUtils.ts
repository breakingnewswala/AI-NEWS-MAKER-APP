// AI NEWS MAKER — Location Utility Functions
// Handles Location Deduplication, Normalization, and Clean Presentation

const COMMON_INDIAN_CITIES = [
  'मुरैना', 'ग्वालियर', 'भोपाल', 'इंदौर', 'जबलपुर', 'उज्जैन', 'रीवा', 'सागर', 'सतना', 'रतलाम',
  'छतरपुर', 'शिवपुरी', 'भिंड', 'दतिया', 'गुना', 'मंदसौर', 'नीमच', 'खंडवा', 'खरगोन', 'बड़वानी',
  'झाबुआ', 'धार', 'देवास', 'शाजापुर', 'आगर मालवा', 'सीहोर', 'रायसेन', 'राजगढ़', 'विदिशा', 'बैतूल',
  'हरदा', 'होशंगाबाद', 'नर्मदापुरम', 'कटनी', 'नरसिंहपुर', 'छिंदवाड़ा', 'सिवनी', 'मंडला', 'डिंडोरी', 'बालाघाट',
  'शहडोल', 'अनूपपुर', 'उमरिया', 'सीधी', 'सिंगरौली', 'पन्ना', 'दमोह', 'टीकमगढ़', 'निवाड़ी', 'अशोकनगर',
  'श्योपुर', 'बुरहानपुर', 'मैहर', 'पांढुर्ना', 'मऊगंज', 'दिल्ली', 'जयपुर', 'लखनऊ', 'वाराणसी', 'प्रयागराज',
  'कानपुर', 'आगरा', 'मेरठ', 'नोएडा', 'गाजियाबाद', 'अयोध्या', 'पटना', 'मुजफ्फरपुर', 'रांची', 'रायपुर',
  'बिलासपुर', 'अहमदाबाद', 'सूरत', 'मुंबई', 'पुणे', 'नागपुर', 'चंडीगढ़', 'शिमला', 'देहरादून', 'हरिद्वार'
];

/**
 * Extracts city/district from news title or summary if post metadata location is missing
 */
export function extractLocationFromNewsText(title?: string, summary?: string): string {
  const combined = `${title || ''} ${summary || ''}`.trim();
  if (!combined) return '';

  for (const city of COMMON_INDIAN_CITIES) {
    // Look for patterns like "मुरैना में", "मुरैना:", "मुरैना से", "मुरैना खबर"
    const regex = new RegExp(`(^|[\\s:।,–—\\(\\[])${city}([\\s:।,–—\\)\\]]|में|से|के|का|की|पर|जिले|शहर)`, 'u');
    if (regex.test(combined)) {
      return city;
    }
  }
  return '';
}

const MP_CITIES = new Set([
  'मुरैना', 'ग्वालियर', 'भोपाल', 'इंदौर', 'जबलपुर', 'उज्जैन', 'रीवा', 'सागर', 'सतना', 'रतलाम',
  'छतरपुर', 'शिवपुरी', 'भिंड', 'दतिया', 'गुना', 'मंदसौर', 'नीमच', 'खंडवा', 'खरगोन', 'बड़वानी',
  'झाबुआ', 'धार', 'देवास', 'शाजापुर', 'आगर मालवा', 'सीहोर', 'रायसेन', 'राजगढ़', 'विदिशा', 'बैतूल',
  'हरदा', 'होशंगाबाद', 'नर्मदापुरम', 'कटनी', 'नरसिंहपुर', 'छिंदवाड़ा', 'सिवनी', 'मंडला', 'डिंडोरी', 'बालाघाट',
  'शहडोल', 'अनूपपुर', 'उमरिया', 'सीधी', 'सिंगरौली', 'पन्ना', 'दमोह', 'टीकमगढ़', 'निवाड़ी', 'अशोकनगर',
  'श्योपुर', 'बुरहानपुर', 'मैहर', 'पांढुर्ना', 'मऊगंज'
]);

const UP_CITIES = new Set([
  'लखनऊ', 'वाराणसी', 'प्रयागराज', 'कानपुर', 'आगरा', 'मेरठ', 'नोएडा', 'गाजियाबाद', 'अयोध्या'
]);

export function resolveCityWithState(rawLocation?: string | null): string {
  if (!rawLocation || typeof rawLocation !== 'string') return '';
  const trimmed = rawLocation.trim();
  if (!trimmed || trimmed === 'लोकेशन') return 'लोकेशन';
  if (trimmed.includes(',') || trimmed.includes('/') || trimmed.includes('|')) {
    return formatCleanLocationText(trimmed);
  }
  if (MP_CITIES.has(trimmed)) {
    return `${trimmed}, म.प्र.`;
  }
  if (UP_CITIES.has(trimmed)) {
    return `${trimmed}, उ.प्र.`;
  }
  return trimmed;
}

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

  // When state is accompanied by a city or district, format cleanly
  // e.g., 'ग्वालियर, मध्य प्रदेश' -> 'ग्वालियर, म.प्र.'; 'वाराणसी, उत्तर प्रदेश' -> 'वाराणसी, उ.प्र.'
  if (uniqueParts.length > 1) {
    return uniqueParts.map((p) => {
      if (p === 'मध्य प्रदेश' || p === 'मध्यप्रदेश' || p === 'मप्र') return 'म.प्र.';
      if (p === 'उत्तर प्रदेश' || p === 'उत्तरप्रदेश' || p === 'उप्र') return 'उ.प्र.';
      if (p === 'हिमाचल प्रदेश' || p === 'हिमाचलप्रदेश' || p === 'हिप्र') return 'हि.प्र.';
      if (p === 'आंध्र प्रदेश' || p === 'आंध्रप्रदेश' || p === 'आप्र') return 'आ.प्र.';
      return p;
    }).join(', ');
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
  actualBx: number;
  actualBxPct: number;
  heightPct: number;
  bh: number;
}

/**
 * Calculates dynamic badge width for CanvasExporter and CardPreview
 * using font text metrics, padding, and slice geometry to ensure 100% preview-export parity.
 */
export function calculateDynamicLocationMetrics(options: DynamicLocationOptions): DynamicLocationResult {
  const width = options.canvasWidth || 1080;
  const height = options.canvasHeight || 1350;
  // Sleeker badge height: 3.8% of card height (approx 51px on 1350px canvas) instead of bulky 4.5%
  const targetHeightPct = options.locationRect?.height ? Math.min(options.locationRect.height, 3.8) : 3.8;
  const locRect = options.locationRect
    ? { ...options.locationRect, height: targetHeightPct }
    : { x: 5, y: 13.5, width: 28, height: targetHeightPct };
  const bx = (locRect.x / 100) * width;
  const bh = (locRect.height / 100) * height;

  const cleanLocText = formatCleanLocationText(options.locationText || '');
  const typo = options.typographyConfig;
  const fontSize = Math.round((typo?.fontSize || options.locationFontSize || 22) * (width / 1080));
  const fontFamily = typo?.fontFamily || 'Baloo 2';
  const fontWeight = typo?.weight || 800;

  // Accurately measure or approximate text width using canvas if available
  let measuredTextW = Math.round(cleanLocText.length * fontSize * 0.85);
  if (typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", "Noto Sans Devanagari", sans-serif`;
        const m = ctx.measureText(cleanLocText).width;
        if (m > 0) measuredTextW = Math.round(m * 1.15); // Include safety margin for letter-spacing/tracking and font variants
      }
    } catch {}
  }

  let dynamicBw: number;
  let leftDestW = 0;
  let rightDestW = 0;
  let finalCenterW = 0;

  const isRightAnchored = (locRect.x > 45);
  // Max available width: on right side, allows leftward growth up to 70% of card width
  const maxAvailableW = isRightAnchored
    ? Math.round(width * 0.70)
    : Math.min(Math.round(width * 0.70), width - bx - 20);

  if (options.hasBadgeAsset) {
    const leftSlicePct = options.sliceConfig?.leftWidthPct ?? 0.28;
    const rightSlicePct = options.sliceConfig?.rightWidthPct ?? 0.15;
    const nw = 360;
    const nh = 72;
    const pinW = Math.round(nw * leftSlicePct);
    const capW = Math.round(nw * rightSlicePct);
    leftDestW = Math.round((pinW / nh) * bh);
    rightDestW = Math.round((capW / nh) * bh);

    // Generous internal text padding (+52px) so long location names never touch pin divider or edges
    const neededCenterW = Math.max(10, measuredTextW + 52);
    dynamicBw = Math.min(maxAvailableW, Math.max(130, Math.round(leftDestW + neededCenterW + rightDestW)));
    finalCenterW = Math.max(10, dynamicBw - leftDestW - rightDestW);
  } else {
    // For default pill: pin circle (approx 36px) + gap + text + horizontal padding
    dynamicBw = Math.min(maxAvailableW, Math.max(130, Math.round(measuredTextW + 85)));
    finalCenterW = dynamicBw;
  }

  const widthPct = Number(((dynamicBw / width) * 100).toFixed(2));
  const heightPct = Number(((bh / height) * 100).toFixed(2));

  // If anchored on right, expanding to left keeps right margin intact
  const rightEdge = ((locRect.x + locRect.width) / 100) * width;
  const actualBx = isRightAnchored
    ? Math.max(Math.round(width * 0.30), Math.round(rightEdge - dynamicBw))
    : Math.round(bx);
  const actualBxPct = Number(((actualBx / width) * 100).toFixed(2));

  return {
    dynamicBw,
    widthPct,
    cleanLocText,
    fontSize,
    leftDestW,
    rightDestW,
    finalCenterW,
    actualBx,
    actualBxPct,
    heightPct,
    bh,
  };
}

/**
 * Safely converts any SVG string or data URL to a robust Base64 data URL.
 * Resolves XML fragment '#' and URL '%23' discrepancies, ensuring browser <img>
 * and Canvas loadImage() never fail due to malformed gradient IDs or hex colors.
 */
export function toSafeSvgDataUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (!rawUrl.startsWith('data:image/svg+xml')) return rawUrl;
  if (rawUrl.includes(';base64,')) return rawUrl;

  try {
    let rawContent = rawUrl.replace(/^data:image\/svg\+xml(?:;[a-zA-Z0-9_\-]+)?,/, '');
    // If it was percent-encoded (e.g. starts with %3Csvg)
    if (rawContent.startsWith('%3C') || rawContent.startsWith('%3c')) {
      try {
        rawContent = decodeURIComponent(rawContent);
      } catch {}
    }
    // Replace %23 with # because in XML/SVG colors and gradient hrefs are #hex / #id
    rawContent = rawContent.replace(/%23/g, '#');

    // Safe base64 conversion that NEVER fails on Unicode or browser environment
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      try {
        const utf8Bytes = new TextEncoder().encode(rawContent);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        return `data:image/svg+xml;base64,${window.btoa(binary)}`;
      } catch {}
    }

    if (typeof Buffer !== 'undefined') {
      const base64 = Buffer.from(rawContent, 'utf8').toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    }

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawContent)}`;
  } catch (err) {}
  return rawUrl;
}

