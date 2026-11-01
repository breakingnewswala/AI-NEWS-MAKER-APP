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
    name: 'विकल्प 1: मुख्य समाचार',
    angle: 'मुख्य घटनाक्रम',
    description: 'घटना का सबसे महत्वपूर्ण तथ्य और मुख्य विकास (80-110 अक्षर)',
  },
  {
    tier: 2,
    min: 100,
    max: 130,
    name: 'विकल्प 2: तथ्य एवं संदर्भ',
    angle: 'प्राधिकारी / मुख्य पात्र',
    description: 'घटना के साथ आवश्यक पृष्ठभूमि और संदर्भ (100-130 अक्षर)',
  },
  {
    tier: 3,
    min: 125,
    max: 150,
    name: 'विकल्प 3: विस्तृत विवरण',
    angle: 'कार्रवाई / परिणाम',
    description: 'समाचार का महत्वपूर्ण सहायक तथ्य या घटनाक्रम (125-150 अक्षर)',
  },
  {
    tier: 4,
    min: 130,
    max: 160,
    name: 'विकल्प 4: प्रभाव एवं प्रतिक्रिया',
    angle: 'मुख्य बिंदु / प्रभाव',
    description: 'जनता, प्रशासन या घटना के पुष्ट परिणाम (130-160 अक्षर)',
  },
  {
    tier: 5,
    min: 150,
    max: 200,
    name: 'विकल्प 5: समग्र संपादकीय हेडलाइन',
    angle: 'सारगर्भित संपादकीय',
    description: 'मुख्य घटना, आवश्यक विवरण और संदर्भ का संतुलित संयोजन (150-200 अक्षर)',
  },
];

/**
 * 2. COIN DEDUCTION MATRIX FOR HEADLINE REGENERATION
 */
export const HEADLINE_REGEN_COIN_MATRIX: Record<string, number> = {
  BASIC: 100,
  ADVANCE: 50,
  PRO: 25,
  VIP_DESK: 0,
  VIP: 0,
  ADMIN: 0,
  basic: 100,
  advance: 50,
  pro: 25,
  vip_desk: 0,
  vip: 0,
  admin: 0,
};

export function getRegenCoinCostForPlan(plan: string, role?: string): number {
  const p = (plan || 'basic').toLowerCase().trim();
  // VIP DESK tier exclusively receives 0 coin cost for headline regeneration (admin status alone does not grant free regeneration if on Basic tier)
  if (p.includes('vip') || p.includes('ultra')) return 0;
  if (p.includes('pro')) return 25;
  if (p.includes('advanc')) return 50;
  return 100; // Basic / default (including admin on basic tier)
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
  if (p.includes('advanc')) return 25;
  return 10;
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
दी गई समाचार सामग्री का गहन विश्लेषण करके केवल मुख्य पुष्ट घटना पर आधारित सटीक, तथ्यपरक, प्रभावशाली हिंदी हेडलाइन, उसी एक मुख्य घटना के 5 अलग-अलग निर्धारित लंबाई वाले हेडलाइन विकल्प (विकल्प 1: 80-110, विकल्प 2: 100-130, विकल्प 3: 125-150, विकल्प 4: 130-160, विकल्प 5: 150-200 वर्ण) और 3 अलग-अलग शैलियों के सोशल मीडिया कैप्शन तैयार करें। केवल वैध JSON लौटाएं।`;

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
Generate exactly 5 BRAND NEW, distinct, balanced headline options across the 5 editorial angles of the SAME primary news event in pure Hindi Devanagari script.
MANDATORY 5-TIER GRADUATED LENGTH RULES:
- Option 1: Strictly 80–110 characters (Core event development)
- Option 2: Strictly 100–130 characters (Key person / authority angle)
- Option 3: Strictly 125–150 characters (Action / outcome angle)
- Option 4: Strictly 130–160 characters (Crucial fact / impact angle)
- Option 5: Strictly 150–200 characters (Comprehensive editorial headline)

STRICT RULES:
1. Every option must be strictly within its min and max character bounds.
2. No ending punctuation (. or । or ?).
3. No generic administrative filler ('प्रशासन ने दिए कड़े निर्देश', 'निगरानी', 'सख्त नजर') unless actually present in source facts.
4. Do NOT repeat or paraphrase any of the previous headline options.
5. Do NOT include character counts like '[95/110]' or tier labels in the headline text.
6. Pure Devanagari Hindi only (transliterate foreign terms like BCCI, Supreme Court into देवनागरी).
Return valid JSON: { "headlineOptions": ["...", "...", "...", "...", "..."] }`;

  const prompt = `कृपया निम्नलिखित समाचार के लिए ठीक 5 नए संतुलित हेडलाइन विकल्प तैयार करें।
प्रत्येक विकल्प अपनी निर्धारित लंबाई सीमा में हो, बिना किसी पूर्णविराम के, शुद्ध हिंदी देवनागरी में।

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
    "विकल्प 1: मुख्य समाचार कोण (80-110 अक्षर)",
    "विकल्प 2: तथ्य एवं संदर्भ कोण (100-130 अक्षर)",
    "विकल्प 3: विस्तृत विवरण कोण (125-150 अक्षर)",
    "विकल्प 4: प्रभाव एवं प्रतिक्रिया कोण (130-160 अक्षर)",
    "विकल्प 5: समग्र संपादकीय कोण (150-200 अक्षर)"
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
