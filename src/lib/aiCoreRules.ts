/**
 * AI NEWS MAKER — CENTRAL AI TOOLS CORE ENGINE RULES
 * Single Source of Truth for Editorial Intelligence, 5-Tier Headline Limits,
 * 3 Caption Styles, Hashtag Hierarchy, and Coin-Based Single-Use Regeneration.
 *
 * Version: 3.0.0-core-lock
 */

export const AI_CORE_RULES_VERSION = '3.0.0-core-lock';

/**
 * 1. FIVE-TIER GRADUATED HEADLINE CHARACTER LIMITS
 * Strict bounds: [min, max]
 */
export interface HeadlineTierRule {
  tier: number;
  min: number;
  max: number;
  name: string;
  angle: string;
  description: string;
}

export const FIVE_HEADLINE_TIERS: HeadlineTierRule[] = [
  {
    tier: 1,
    min: 80,
    max: 110,
    name: 'विकल्प 1',
    angle: 'सीधी मुख्य खबर',
    description: 'सीधी मुख्य खबर (80-110 अक्षर)',
  },
  {
    tier: 2,
    min: 100,
    max: 130,
    name: 'विकल्प 2',
    angle: 'तथ्य-केंद्रित हेडलाइन',
    description: 'तथ्य-केंद्रित हेडलाइन (100-130 अक्षर)',
  },
  {
    tier: 3,
    min: 125,
    max: 150,
    name: 'विकल्प 3',
    angle: 'परिणाम-केंद्रित हेडलाइन',
    description: 'परिणाम-केंद्रित हेडलाइन (125-150 अक्षर)',
  },
  {
    tier: 4,
    min: 130,
    max: 160,
    name: 'विकल्प 4',
    angle: 'प्रमुख विवरण वाली हेडलाइन',
    description: 'प्रमुख विवरण वाली हेडलाइन (130-160 अक्षर)',
  },
  {
    tier: 5,
    min: 150,
    max: 200,
    name: 'विकल्प 5',
    angle: 'प्रभावशाली समाचार हेडलाइन',
    description: 'प्रभावशाली समाचार हेडलाइन (150-200 अक्षर)',
  },
];

export interface CaptionStyleRule {
  key: 'detailed' | 'bullet' | 'short';
  name: string;
  description: string;
  paragraphCount?: number;
  bulletCount?: string;
  sentenceCount?: string;
}

export const THREE_CAPTION_STYLES: CaptionStyleRule[] = [
  {
    key: 'detailed',
    name: 'विस्तृत कैप्शन',
    description: 'लगभग 3 अर्थपूर्ण पैराग्राफ, तथ्य व संदर्भ सहित।',
    paragraphCount: 3,
  },
  {
    key: 'bullet',
    name: 'बुलेट कैप्शन',
    description: 'संक्षिप्त परिचयात्मक वाक्य के बाद 3-5 तथ्यात्मक बुलेट पॉइंट्स (• से शुरू, । पर समाप्त)।',
    bulletCount: '3-5 बुलेट्स',
  },
  {
    key: 'short',
    name: 'संक्षिप्त कैप्शन',
    description: 'लगभग 1-3 संक्षिप्त वाक्य, सटीक व समाचार-केंद्रित।',
    sentenceCount: '1-3 वाक्य',
  },
];

export const LOCKED_HASHTAG_RULES = {
  firstTag: 'यूज़र का सत्यापित सोशल मीडिया यूज़रनेम (उपलब्ध होने पर)',
  middleTags: '4-6 समाचार, विषय व स्थान से जुड़े प्रासंगिक हैशटैग',
  finalTag: '#AINewsMaker',
  forbiddenTags: ['#BNWTV', '#breakingnewswala'],
};

/**
 * 2. COIN DEDUCTION MATRIX FOR HEADLINE REGENERATION
 */
export const HEADLINE_REGEN_COIN_MATRIX: Record<string, number> = {
  BASIC: 100,
  ADVANCE: 50,
  ADVANCED: 50,
  PRO: 25,
  VIP_DESK: 0,
  VIP: 0,
  ULTRA: 0,
  ADMIN: 0,
  SUPERADMIN: 0,
  basic: 100,
  advance: 50,
  advanced: 50,
  pro: 25,
  vip_desk: 0,
  vip: 0,
  ultra: 0,
  admin: 0,
  superadmin: 0,
};

export function getRegenCoinCostForPlan(plan: string, role?: string): number {
  const p = (plan || '').toLowerCase().trim();
  const r = (role || '').toLowerCase().trim();
  if (p.includes('vip') || p.includes('ultra')) return 0;
  if (p.includes('pro')) return 25;
  if (p.includes('advanc')) return 50;
  if (p === 'basic' || p === 'free') return 100;
  if (p.includes('admin') || p.includes('superadmin') || r.includes('admin') || r.includes('superadmin')) return 0;
  return 100; // Default Basic
}

/**
 * 2B. DAILY GRAPHIC DOWNLOAD LIMIT MATRIX
 * Mandated Limits: BASIC: 10, ADVANCE: 25, PRO: 40, VIP DESK: 75
 */
export const DAILY_GRAPHIC_DOWNLOAD_LIMITS: Record<string, number> = {
  BASIC: 10,
  ADVANCE: 25,
  PRO: 40,
  VIP_DESK: 75,
  VIP: 75,
  basic: 10,
  advance: 25,
  pro: 40,
  ultra: 75,
  vip_desk: 75,
  vip: 75,
};

export function getDailyGraphicDownloadLimitForPlan(plan: string): number {
  const p = (plan || 'basic').toLowerCase().trim();
  if (p.includes('vip') || p.includes('ultra')) return 75;
  if (p.includes('pro')) return 40;
  if (p.includes('advanc')) return 50 >= 25 ? 25 : 25;
  return 10;
}

/**
 * 2C. DAILY VIDEO CREATION LIMIT MATRIX
 * Basic: 2 Videos/day, Advanced: 5 Videos/day, Pro: 15 Videos/day, VIP: Unlimited (30 Videos/day)
 */
export const DAILY_VIDEO_CREATION_LIMITS: Record<string, number> = {
  BASIC: 2,
  ADVANCE: 5,
  ADVANCED: 5,
  PRO: 15,
  VIP: 30,
  VIP_DESK: 30,
  ULTRA: 30,
  basic: 2,
  advance: 5,
  advanced: 5,
  pro: 15,
  vip: 30,
  vip_desk: 30,
  ultra: 30,
};

export function getDailyVideoLimitForPlan(plan: string): { limit: number; displayLabel: string; isUnlimitedDisplay: boolean } {
  const p = (plan || 'basic').toLowerCase().trim();
  if (p.includes('vip') || p.includes('ultra') || p.includes('enterprise') || p.includes('desk')) {
    return { limit: 30, displayLabel: 'असीमित (अधिकतम 30 वीडियो/दिन)', isUnlimitedDisplay: true };
  }
  if (p.includes('pro')) {
    return { limit: 15, displayLabel: '15 वीडियो/दिन', isUnlimitedDisplay: false };
  }
  if (p.includes('advance')) {
    return { limit: 5, displayLabel: '5 वीडियो/दिन', isUnlimitedDisplay: false };
  }
  return { limit: 2, displayLabel: '2 वीडियो/दिन', isUnlimitedDisplay: false };
}


/**
 * 3. HONORIFIC & FLATTERY PURGE LIST
 */
export const FORBIDDEN_HONORIFICS = [
  'माननीय',
  'सम्माननीय',
  'सम्मानीय',
  'आदरणीय',
  'महोदय',
  'श्रीमान',
  'श्रीमती',
  'सुश्री',
  'परम पूज्य',
  'पूज्य',
  'श्री',
  'जी',
];

export function sanitizePressNoteFlattery(text: any, isHeadline: boolean = false): string {
  if (!text) return '';
  let cleaned = typeof text === 'string'
    ? text
    : (Array.isArray(text) ? text.filter(Boolean).map(String).join(' ') : String(text || ''));
  if (!cleaned || typeof cleaned.replace !== 'function') return '';

  // Purge sycophantic titles and honorifics
  cleaned = cleaned
    .replace(/(?:परम\s*पूज्य|पूज्य)\s+/gu, '')
    .replace(/(?:माननीय|सम्माननीय|सम्मानीय|आदरणीय)\s+/gu, '')
    .replace(/(?:श्रीमान|श्रीमती|सुश्री)\s+/gu, '')
    .replace(/(?:^|\s)श्री\s+([^\s,।\.]+)/gu, ' $1')
    .replace(/([^\s,।\.]+)\s+जी(?=[\s,|।\.]|$)/gu, '$1')
    .replace(/(?:^|\s)महोदय(?=[\s,|।\.]|$)/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * 4. SYSTEM EDITORIAL PROMPT INSTRUCTION
 */
export const CHIEF_EDITOR_SYSTEM_INSTRUCTION = `आप BREAKING NEWS WALA संपादकीय मानकों के तहत एक प्रमुख डिजिटल हिंदी न्यूज़ नेटवर्क के मुख्य संपादक (Chief Editor) हैं।
दी गई समाचार सामग्री का गहन विश्लेषण करके केवल मूल समाचार में उपलब्ध वास्तविक तथ्यों और मुख्य घटना पर आधारित सटीक, तथ्यपरक, प्रभावशाली हिंदी हेडलाइन, उसी मुख्य घटना के 5 अलग-अलग हेडलाइन विकल्प (विकल्प 1: 80-110, विकल्प 2: 100-130, विकल्प 3: 125-150, विकल्प 4: 130-160, विकल्प 5: 150-200 अक्षर; अधिकतम सीमा 200 अक्षर) और 3 अलग-अलग शैलियों के सोशल मीडिया कैप्शन तैयार करें।
किसी भी हेडलाइन की लंबाई बढ़ाने के लिए अपनी ओर से कोई कृत्रिम प्रशासनिक वाक्य ('शासन स्तर पर आवश्यक निर्देश दिए गए', 'मामले में नया घटनाक्रम सामने आया है', 'प्रशासनिक व विभागीय स्तर पर जरूरी कदम उठाए जा रहे हैं', 'विशेष डेस्क' आदि) बिल्कुल न जोड़ें। यदि मूल खबर संक्षिप्त है, तो छोटी लेकिन सटीक हेडलाइन रखें। केवल वैध JSON लौटाएं।`;

/**
 * 5. HEADLINE REGENERATION PROMPT BUILDER
 */
export function buildHeadlineRegenerationPrompt(params: {
  sourceTitle: string;
  sourceText: string;
  sourceLoc?: string;
  customPrompt?: string;
  previousHeadlines?: string[];
}): { systemInstruction: string; prompt: string } {
  const { sourceTitle, sourceText, sourceLoc, customPrompt, previousHeadlines = [] } = params;

  const systemInstruction = `You are the Chief Hindi News Editor for AI NEWS MAKER (BREAKING NEWS WALA Editorial Standard).
Generate exactly 5 BRAND NEW, distinct, balanced headline options of the SAME primary news event in pure Hindi Devanagari script.
MANDATORY 5-TIER CHARACTER LIMITS (Absolute Maximum: 200 characters):
- Option 1 (विकल्प 1): 80–110 characters
- Option 2 (विकल्प 2): 100–130 characters
- Option 3 (विकल्प 3): 125–150 characters
- Option 4 (विकल्प 4): 130–160 characters
- Option 5 (विकल्प 5): 150–200 characters

STRICT EDITORIAL RULES:
1. No headline may exceed 200 characters under any circumstance.
2. Never add artificial administrative filler or unsupported statements merely to increase length (strictly prohibited: 'शासन स्तर पर आवश्यक निर्देश दिए गए', 'संबंधित पक्षों को निर्देश जारी किए गए', 'मामले में नया घटनाक्रम सामने आया है', 'पूरे मामले को लेकर कार्रवाई की जा रही है', 'प्रशासनिक व विभागीय स्तर पर जरूरी कदम उठाए जा रहे हैं', 'इस घटना के बाद प्रशासन अलर्ट', 'मामले को लेकर विभागीय स्तर पर समीक्षा', 'विशेष डेस्क', 'विशेष डैश').
3. If the original news contains limited information, keep a shorter accurate headline rather than adding filler.
4. No ending punctuation (. or । or ?).
5. Do NOT repeat or paraphrase any of the previous headline options.
6. Do NOT include character counts like '[95/110]' or tier labels in the headline text.
7. Pure Devanagari Hindi only (transliterate foreign terms like BCCI, Supreme Court into देवनागरी).
Return valid JSON: { "headlineOptions": ["...", "...", "...", "...", "..."] }`;

  const prompt = `कृपया निम्नलिखित समाचार के लिए ठीक 5 नए संतुलित हेडलाइन विकल्प तैयार करें।
प्रत्येक विकल्प अधिकतम 200 अक्षर की सीमा के भीतर हो, बिना किसी पूर्णविराम के, शुद्ध हिंदी देवनागरी में, और केवल मूल खबर के वास्तविक तथ्यों पर आधारित हो।

शीर्षक संदर्भ: ${sourceTitle}
समाचार सामग्री/तथ्य: ${sourceText.slice(0, 3000)}
${sourceLoc ? `स्थान: ${sourceLoc}\n` : ''}${customPrompt ? `यूज़र का विशेष निर्देश: ${customPrompt}\n` : ''}
${
  previousHeadlines.length > 0
    ? `पिछले 5 विकल्प (इन्हें बिल्कुल न दोहराएं, नए कोण बनाएं):\n${previousHeadlines.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}\n`
    : ''
}
JSON Output Schema:
{
  "headlineOptions": [
    "विकल्प 1 (80-110 अक्षर)",
    "विकल्प 2 (100-130 अक्षर)",
    "विकल्प 3 (125-150 अक्षर)",
    "विकल्प 4 (130-160 अक्षर)",
    "विकल्प 5 (150-200 अक्षर)"
  ]
}`;

  return { systemInstruction, prompt };
}

/**
 * 6. EDITOR STEP COMPLETION VALIDATOR
 */
export interface StepCompletionStatus {
  step1: boolean; // Template
  step2: boolean; // AI Tools
  step3: boolean; // Headline
  step4: boolean; // Photo & Watermark
  step5: boolean; // Location
  step6: boolean; // Header & Footer
  step7: boolean; // Elements & Review
  completedCount: number;
  completedSteps: number[];
  percentage: number;
  is100Percent: boolean;
  missingSteps: string[];
}

export function calculateEditorProgress(card: any, activeStep?: number): StepCompletionStatus {
  if (!card) {
    return {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
      step7: false,
      completedCount: 0,
      completedSteps: [],
      percentage: 0,
      is100Percent: false,
      missingSteps: ['1. टेम्पलेट', '2. एआई टूल्स', '3. हेडलाइन', '4. फोटो व वॉटरमार्क', '5. स्थान', '6. हेडर व फुटर', '7. डाउनलोड व कैप्शन'],
    };
  }

  // Step 1: Template selected
  const step1 = Boolean(card.frameDesign || card.templateId);

  // Step 2: AI Tools data available
  const step2 = Boolean(
    card.summary ||
    card.originalHeadline ||
    card.sourceUrl ||
    card.sourceNewsId ||
    card.aiGenerated ||
    (card.headline && card.headline.length > 15)
  );

  // Step 3: Valid headline present (> 20 chars)
  const step3 = Boolean(card.headline && card.headline.trim().length >= 20);

  // Step 4: Photo or photo mode configured
  const step4 = Boolean(
    card.images?.main ||
    card.images?.bg ||
    card.photoUrl ||
    card.backgroundPhoto ||
    card.photoMode === 'ai' ||
    card.photoMode === 'website' ||
    card.photoMode === 'manual' ||
    card.frameDesign === 'jacket-text-breaking'
  );

  // Step 5: Location set (at least 2 chars)
  const step5 = Boolean(card.location && card.location.trim().length >= 2);

  // Step 6: Header & Footer configuration
  const step6 = Boolean(
    card.channelNameHi ||
    card.channelNameEn ||
    card.brandName ||
    card.logoUrl ||
    card.footerText ||
    card.headerText ||
    card.customHeaderPng ||
    card.customFooterPng
  );

  // Step 7: Final review / elements (active step 7 or element badges or all previous 6 steps complete)
  const step7 = Boolean(
    (step1 && step2 && step3 && step4 && step5 && step6) &&
    (activeStep === 7 || card.elementsReviewed || card.elementBadges || card.breakingUrgencyBadge || card.headline)
  );

  const steps = [
    { num: 1, key: 'step1', name: '1. टेम्पलेट', done: step1 },
    { num: 2, key: 'step2', name: '2. एआई टूल्स', done: step2 },
    { num: 3, key: 'step3', name: '3. हेडलाइन', done: step3 },
    { num: 4, key: 'step4', name: '4. फोटो व वॉटरमार्क', done: step4 },
    { num: 5, key: 'step5', name: '5. स्थान', done: step5 },
    { num: 6, key: 'step6', name: '6. हेडर व फुटर', done: step6 },
    { num: 7, key: 'step7', name: '7. डाउनलोड व कैप्शन', done: step7 },
  ];

  const completedSteps = steps.filter((s) => s.done).map((s) => s.num);
  const completedCount = completedSteps.length;
  // Each step ~14.2857%, exactly 100% when 7 steps are done
  const percentage = completedCount === 7 ? 100 : Math.round((completedCount / 7) * 100);
  const is100Percent = completedCount === 7;
  const missingSteps = steps.filter((s) => !s.done).map((s) => s.name);

  return {
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
    step7,
    completedCount,
    completedSteps,
    percentage,
    is100Percent,
    missingSteps,
  };
}
