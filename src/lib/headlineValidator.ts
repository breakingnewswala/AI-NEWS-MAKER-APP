/**
 * AI NEWS MAKER — CENTRALIZED HEADLINE VALIDATION SYSTEM
 * Single Source of Truth for Editorial Intelligence, 5-Tier Headline Limits,
 * Blocked Media Brands, Explanatory Sentence Endings, and Grapheme Character Counting.
 *
 * Requirements:
 * 1. Centralized TypeScript validator with exact HEADLINE_TARGETS and BLOCKED_MEDIA_BRANDS
 * 2. Grapheme-based character counting with Intl.Segmenter("hi", { granularity: "grapheme" })
 * 3. Prohibited media brands detection (normalized NFC/NFKC matching)
 * 4. Invalid sentence endings and terminal punctuation rejection
 * 5. Batch validation with duplicate / near-duplicate detection
 * 6. Fact-sheet based regeneration helpers without sentence chopping
 */

export interface HeadlineTarget {
  min: number;
  max: number;
}

export const HEADLINE_TARGETS: HeadlineTarget[] = [
  { min: 80, max: 110 },
  { min: 100, max: 130 },
  { min: 125, max: 150 },
  { min: 130, max: 160 },
  { min: 150, max: 200 },
];

/**
 * Known media brands and source-publisher aliases.
 * Dynamically extended at runtime using scraped publisher metadata.
 */
export const BLOCKED_MEDIA_BRANDS: string[] = [
  "नई दुनिया",
  "नईदुनिया",
  "Nai Duniya",
  "Nai Dunia",
  "दैनिक भास्कर",
  "दैनिक जागरण",
  "अमर उजाला",
  "नवभारत टाइम्स",
  "हिंदुस्तान",
  "प्रभात खबर",
  "हरिभूमि",
  "आज तक",
  "ABP News",
  "एबीपी न्यूज़",
  "News18",
  "न्यूज़18",
  "Zee News",
  "ज़ी न्यूज़",
  "NDTV",
  "एनडीटीवी",
  "India TV",
  "इंडिया टीवी",
  "TV9",
  "टीवी9",
  "Times Now",
  "टाइम्स नाउ",
  "Republic Bharat",
  "रिपब्लिक भारत",
  "News Nation",
  "न्यूज़ नेशन",
  "MP Tak",
  "एमपी तक",
  "Bansal News",
  "बंसल न्यूज़",
  "BBC News",
  "बीबीसी न्यूज़",
  "बीबीसी",
  "पत्रिका",
  "Patrika",
  "जनसत्ता",
  "Jansatta",
  "वनइंडिया",
  "OneIndia",
];

/**
 * Normalizes text for brand matching: NFKC, lowercase Hindi, strips non-letters/non-numbers.
 */
export function normalizeText(value: string): string {
  if (!value || typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("hi")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Counts user-perceived visible characters (Aksharas/graphemes in Devanagari).
 * Canonical single source of truth across frontend and backend.
 */
export function countCharacters(value: string): number {
  if (!value || typeof value !== "string") return 0;
  const normalized = value.normalize("NFC").trim();
  if (!normalized) return 0;

  try {
    const segmenter = new Intl.Segmenter("hi", {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(normalized)).length;
  } catch {
    return Array.from(normalized).length;
  }
}

/**
 * Checks whether a headline contains any blocked media brand or passed source publisher name.
 */
export function hasBlockedMediaBrand(
  headline: string,
  sourcePublisherNames: string[] = []
): boolean {
  if (!headline || typeof headline !== "string") return false;
  const normalizedHeadline = normalizeText(headline);
  if (!normalizedHeadline) return false;

  const blockedBrands = [
    ...BLOCKED_MEDIA_BRANDS,
    ...(Array.isArray(sourcePublisherNames) ? sourcePublisherNames : []),
  ];

  return blockedBrands.some((brand) => {
    if (!brand || typeof brand !== "string") return false;
    const normalizedBrand = normalizeText(brand);
    return normalizedBrand.length > 0 && normalizedHeadline.includes(normalizedBrand);
  });
}

/**
 * Checks whether a headline has terminal punctuation or an explanatory sentence ending.
 */
export function hasInvalidHeadlineEnding(headline: string): boolean {
  if (!headline || typeof headline !== "string") return false;
  const text = headline.trim();
  if (!text) return false;

  // No terminal punctuation
  if (/[.!?।॥…,:;—–-]+$/u.test(text)) {
    return true;
  }

  // Reject dangling conjunctions, postpositions, prepositions, and particles at the end
  if (
    /(?:^|\s)(?:जिसमें|जिसके|जिससे|जिसका|जिसकी|जिन्हें|जिसे|तथा|एवं|और|व|कि|लेकिन|मगर|किंतु|परंतु|जबकि|क्योंकि|को|के|की|का|में|पर|से|ने|तक|लिए|हेतु|द्वारा|समेत|साथ|खिलाफ|विरुद्ध|लेकर|चलते|अंतर्गत|तहत|दौरान|अनुसार|कर|होकर|हुए|हुई|हुआ|भी|तो|ही)\s*$/u.test(
      text
    )
  ) {
    return true;
  }

  // Reject incomplete pre-object verb participles / cut-off action phrases
  // (e.g. "10 फर्जी किसानों को जारी किए" missing "नोटिस", or "करने", "होने", "दिए गए")
  if (
    /(?:^|\s)(?:(?:को|ने|में|पर|से)\s+(?:जारी\s+किए|जारी\s+किया|जारी\s+की|दिए|दिया|किए|किया|भेजे|भेजा|दर्ज\s+किए|दर्ज\s+किया|दर्ज\s+की|शुरू\s+किए|शुरू\s+किया|शुरू\s+की)|जारी\s+किए|जारी\s+किया|जारी\s+की|दिए\s+गए|दिया\s+गया|दी\s+गई|किए\s+गए|की\s+गई|भेजे\s+गए|भेजा\s+गया|भेजी\s+गई|बनाए\s+गए|बनाया\s+गया|रखे\s+गए|रखा\s+गया|बताया\s+गया|कहा\s+गया|करने|होने|देने|लेने|लगाने|बनाने|चलाने|भेजने|रखने|करते|होते)\s*$/u.test(
      text
    )
  ) {
    return true;
  }

  // Reject dangling oblique-case plural noun at the end (e.g. "...ईओडब्ल्यू के छापे में 10 फर्जी किसानों")
  // In Hindi grammar, oblique plural nouns ending in 'ों' require a following postposition + action/predicate.
  if (/(?:^|\s)(?!(?:सरसों|परसों|बरसों)\s*$)[\u0900-\u097F]{2,}ों\s*$/u.test(text)) {
    return true;
  }

  // Reject explanatory sentence endings
  const sentenceEnding =
    /(?:^|\s)(?:है|हैं|था|थी|थे|थीं|होगा|होगी|होंगे|होंगी|रहेगा|रहेगी|किया गया|किया गया है|किया जाएगा|की जाएगी|उपलब्ध कराई जाएगी|बैठक के दौरान लिया|लिया गया)\s*$/u;

  return sentenceEnding.test(text);
}

export type HeadlineValidationResult = {
  valid: boolean;
  errors: string[];
  characterCount: number;
  wordCount: number;
  belowPreferredMinimum: boolean;
  tier?: number;
  minTarget?: number;
  maxTarget?: number;
};

/**
 * Validates a single headline option against its target tier index (0..4).
 */
export function validateHeadline(
  headline: string,
  optionIndex: number,
  sourcePublisherNames: string[] = []
): HeadlineValidationResult {
  const errors: string[] = [];

  const text = (headline || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  const target = HEADLINE_TARGETS[optionIndex];

  if (!text) {
    errors.push("Headline is empty");
  }

  if (target === undefined) {
    errors.push("Invalid headline option index");
  }

  if (hasBlockedMediaBrand(text, sourcePublisherNames)) {
    errors.push("News publisher or media brand found in headline");
  }

  if (hasInvalidHeadlineEnding(text)) {
    errors.push("Invalid sentence-style ending or trailing punctuation");
  }

  if (/[।.!?…]$/u.test(text)) {
    errors.push("Headline must not end with full stop or danda");
  }

  const characterCount = countCharacters(text);

  const wordCount = text
    .split(/\s+/u)
    .filter(Boolean).length;

  if (target && characterCount > target.max) {
    errors.push("Maximum character limit exceeded");
  }

  // A shorter headline is allowed when editorially complete.
  // Do not add filler words to satisfy the minimum.
  const belowPreferredMinimum = Boolean(target && characterCount < target.min);

  return {
    valid: errors.length === 0,
    errors,
    characterCount,
    wordCount,
    belowPreferredMinimum,
    tier: target !== undefined ? optionIndex + 1 : undefined,
    minTarget: target?.min,
    maxTarget: target?.max,
  };
}

/**
 * Validates an arbitrary or manually edited headline (e.g. in Step 3 editor or before export).
 * Enforces prohibited media name check, sentence endings, danda check, and maximum character bounds (default 200).
 */
export function validateGeneralHeadline(
  headline: string,
  sourcePublisherNames: string[] = [],
  maxChars: number = 200
): HeadlineValidationResult {
  const errors: string[] = [];

  const text = (headline || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    errors.push("Headline is empty");
  }

  if (hasBlockedMediaBrand(text, sourcePublisherNames)) {
    errors.push("News publisher or media brand found in headline");
  }

  if (hasInvalidHeadlineEnding(text)) {
    errors.push("Invalid sentence-style ending or trailing punctuation");
  }

  if (/[।.!?…]$/u.test(text)) {
    errors.push("Headline must not end with full stop or danda");
  }

  const characterCount = countCharacters(text);
  const wordCount = text
    .split(/\s+/u)
    .filter(Boolean).length;

  if (characterCount > maxChars) {
    errors.push(`Maximum character limit exceeded (${characterCount} > ${maxChars})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    characterCount,
    wordCount,
    belowPreferredMinimum: characterCount < 20,
  };
}

/**
 * Tokenizes text into lowercase Hindi words, preserving whitespace for splitting.
 */
export function tokenizeHindiWords(value: string): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("hi")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Calculates token similarity between two headlines using Jaccard index.
 */
export function checkHeadlineSimilarity(h1: string, h2: string): number {
  if (!h1 || !h2) return 0;
  const stopWords = new Set([
    "और", "पर", "में", "से", "को", "का", "की", "के", "ने", "यह", "वह", "कि",
    "भी", "लिए", "नए", "नया", "बड़ा", "बड़ी", "हुए", "हुआ", "है", "हैं", "था", "थी", "थे",
  ]);

  const words1 = new Set(
    tokenizeHindiWords(h1).filter((w) => w.length >= 2 && !stopWords.has(w))
  );
  const words2 = new Set(
    tokenizeHindiWords(h2).filter((w) => w.length >= 2 && !stopWords.has(w))
  );

  // If exact normalized string matches
  if (normalizeText(h1) === normalizeText(h2) && normalizeText(h1).length > 0) {
    return 1.0;
  }

  if (words1.size === 0 || words2.size === 0) return 0;

  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }

  return (2 * common) / (words1.size + words2.size);
}

/**
 * Removes redundant echoing clauses within a single headline.
 * Prevents headlines from repeating the same fact or subject across clauses.
 * E.g., "इंदौर में खाद्य पदार्थों की जांच के लिए लैब को मंजूरी, स्थानीय स्तर पर होगी टेस्टिंग, अब इंदौर में ही हो सकेगी खाद्य पदार्थों की जांच"
 * -> "इंदौर में खाद्य पदार्थों की जांच के लिए लैब को मंजूरी, स्थानीय स्तर पर होगी टेस्टिंग"
 */
export function removeRedundantClauses(headline: string): string {
  if (!headline || typeof headline !== "string") return "";
  let text = headline.replace(/\s+/g, " ").trim();
  if (!text) return "";

  // Strip weak sentence starters like "इस नई व्यवस्था के लागू होने से...", "इससे...", "जिससे..."
  text = text.replace(/^(?:इस\s+(?:नई\s+)?व्यवस्था\s+के\s+लागू\s+होने\s+से|इसके\s+लागू\s+होने\s+से|इसके\s+बाद|इस\s+दौरान)\s*[,:]?\s*/u, "").trim();
  text = text.replace(/^(?:इससे|जिससे)\s+(?:बाजार\s+में|शहर\s+में|नागरिकों\s+को|आम\s+लोगों\s+को)?/u, (match, p1) => (p1 ? `${p1} ` : "")).trim();

  // Split by common clause separators: comma, colon
  const clauses = text.split(/[,:]\s+/).map((c) => c.trim()).filter(Boolean);
  if (clauses.length <= 1) {
    return cleanCandidateClause(text);
  }

  const stopWords = new Set([
    "और", "पर", "में", "से", "को", "का", "की", "के", "ने", "यह", "वह", "कि",
    "भी", "लिए", "नए", "नया", "हुए", "हुआ", "है", "हैं", "था", "थी", "थे",
    "गया", "गई", "गए", "कर", "अब", "ही", "तो", "हो"
  ]);

  const keptClauses: string[] = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const normClause = normalizeText(clause);
    if (!normClause) continue;

    // Check if this clause is largely redundant with any clause already kept
    const isRedundant = keptClauses.some((existing) => {
      const normExisting = normalizeText(existing);
      if (normExisting === normClause) return true;
      if (checkHeadlineSimilarity(existing, clause) >= 0.35) return true;

      // Check word token overlap (e.g. 50% shared content words)
      const wordsA = tokenizeHindiWords(existing).filter((w) => w.length >= 2 && !stopWords.has(w));
      const wordsB = tokenizeHindiWords(clause).filter((w) => w.length >= 2 && !stopWords.has(w));
      if (wordsA.length === 0 || wordsB.length === 0) return false;

      let shared = 0;
      for (const w of wordsB) {
        if (wordsA.includes(w)) shared++;
      }
      return shared / Math.min(wordsA.length, wordsB.length) >= 0.50;
    });

    if (!isRedundant) {
      keptClauses.push(clause);
    }
  }

  const result = keptClauses.join(", ");
  return cleanCandidateClause(result) || cleanCandidateClause(text);
}

/**
 * Validates a batch of 5 headline options against their individual target tiers
 * and ensures no duplicates or near-duplicates (similarity >= 0.85).
 */
export function validateHeadlinesBatch(
  headlines: string[],
  sourcePublisherNames: string[] = []
): {
  valid: boolean;
  results: HeadlineValidationResult[];
  duplicates: number[];
  duplicatePairs: [number, number][];
  sanitizedHeadlines: string[];
  summary: {
    valid: boolean;
    totalErrors: number;
    errorMessages: string[];
  };
} {
  const safe = Array.isArray(headlines) ? headlines.slice(0, 5) : [];
  const results: HeadlineValidationResult[] = [];
  const duplicates: number[] = [];
  const duplicatePairs: [number, number][] = [];
  const sanitizedHeadlines: string[] = [];

  for (let i = 0; i < 5; i++) {
    const raw = safe[i] || "";
    let cleaned = typeof raw === "string" ? cleanCandidateClause(raw) : "";
    cleaned = removeRedundantClauses(cleaned);
    sanitizedHeadlines.push(cleaned);

    const res = validateHeadline(cleaned, i, sourcePublisherNames);
    results.push(res);
  }

  // Duplicate and similarity check across options
  for (let i = 0; i < sanitizedHeadlines.length; i++) {
    for (let j = i + 1; j < sanitizedHeadlines.length; j++) {
      const hA = sanitizedHeadlines[i] || "";
      const hB = sanitizedHeadlines[j] || "";
      if (!hA || !hB) continue;

      const normA = normalizeText(hA);
      const normB = normalizeText(hB);
      const sim = checkHeadlineSimilarity(hA, hB);

      if (normA === normB || sim >= 0.85) {
        if (!duplicates.includes(j)) duplicates.push(j);
        duplicatePairs.push([i, j]);
        const dupMsg = "समान या डुप्लीकेट हेडलाइन विकल्प (Duplicate or substantially similar headline option)";
        if (!results[j].errors.includes(dupMsg)) {
          results[j].errors.push(dupMsg);
          results[j].valid = false;
        }
      }
    }
  }

  const allValid =
    results.every((r) => r.valid) &&
    duplicates.length === 0 &&
    sanitizedHeadlines.filter(Boolean).length === 5;

  return {
    valid: allValid,
    results,
    duplicates,
    duplicatePairs,
    sanitizedHeadlines,
    summary: {
      valid: allValid,
      totalErrors: results.reduce((acc, r) => acc + r.errors.length, 0),
      errorMessages: results.flatMap((r) => r.errors),
    },
  };
}

const VALIDATOR_ACRONYM_MAP: [RegExp, string][] = [
  [/\bEOW\b/gi, "ईओडब्ल्यू"],
  [/\bCBI\b/gi, "सीबीआई"],
  [/\bED\b/gi, "ईडी"],
  [/\bNIA\b/gi, "एनआईए"],
  [/\bACB\b/gi, "एसीबी"],
  [/\bSIT\b/gi, "एसआईटी"],
  [/\bATS\b/gi, "एटीएस"],
  [/\bSTF\b/gi, "एसटीएफ"],
  [/\bNCB\b/gi, "एनसीबी"],
  [/\bDRI\b/gi, "डीआरआई"],
  [/\bLokayukta?\b/gi, "लोकायुक्त"],
  [/\bNDRF\b/gi, "एनडीआरएफ"],
  [/\bSDRF\b/gi, "एसडीआरएफ"],
  [/\bSDERF\b/gi, "एसडीईआरएफ"],
  [/\bFIR\b/gi, "एफआईआर"],
  [/\bSDM\b/gi, "एसडीएम"],
  [/\bDSP\b/gi, "डीएसपी"],
  [/\bASP\b/gi, "एएसपी"],
  [/\bCSP\b/gi, "सीएसपी"],
  [/\bSDOP\b/gi, "एसडीओपी"],
  [/\bDGP\b/gi, "डीजीपी"],
  [/\bDIG\b/gi, "डीआईजी"],
  [/\bIG\b/gi, "आईजी"],
  [/\bSP\b/gi, "एसपी"],
  [/\bDM\b/gi, "डीएम"],
  [/\bCMHO\b/gi, "सीएमएचओ"],
  [/\bCEO\b/gi, "सीईओ"],
  [/\bDFO\b/gi, "डीएफओ"],
  [/\bRTO\b/gi, "आरटीओ"],
  [/\bCollector\b/gi, "कलेक्टर"],
  [/\bRaid\b/gi, "रेड"],
  [/\bDindori\b/gi, "डिंडोरी"],
];

const VALIDATOR_CRITICAL_ENTITIES = [
  "ईओडब्ल्यू", "सीबीआई", "ईडी", "लोकायुक्त", "एसीबी", "एनआईए", "एसआईटी",
  "एटीएस", "एसटीएफ", "एनसीबी", "डीआरआई", "एनडीआरएफ", "एसडीआरएफ", "एसडीईआरएफ",
  "सुप्रीम कोर्ट", "हाई कोर्ट", "एनजीटी", "चुनाव आयोग", "आरबीआई", "सेबी",
  "इसरो", "डीआरडीओ", "एम्स", "यूपीएससी", "एमपीपीएससी",
];

/**
 * Cleans a candidate sentence of terminal punctuation, explanatory endings, and trailing postpositions.
 */
export function cleanCandidateClause(clause: string): string {
  if (!clause || typeof clause !== "string") return "";
  let text = clause
    .replace(/\b([A-Za-z])\.(?:([A-Za-z])\.)+([A-Za-z])?\.?/g, (m) => m.replace(/\./g, "").toUpperCase())
    .replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/[\u0900-\u097F]/.test(text)) {
    for (const [pat, dev] of VALIDATOR_ACRONYM_MAP) {
      text = text.replace(pat, dev);
    }
  }

  // Strip explanatory verb endings if present at the end of the clause
  const sentenceEndingRegex =
    /(?:\s+(?:है|हैं|था|थी|थे|थीं|होगा|होगी|होंगे|होंगी|रहेगा|रहेगी|किया गया|किया गया है|किया जाएगा|की जाएगी|उपलब्ध कराई जाएगी|बैठक के दौरान लिया|लिया गया|दिए गए|दिया गया|दी गई|किए गए|की गई|भेजे गए|भेजा गया|भेजी गई|बताया गया|कहा गया))$/u;

  // Strip incomplete pre-object verb fragments (e.g. "...को जारी किए" where object noun was chopped)
  const incompleteVerbRegex =
    /(?:\s+(?:जारी\s+किए|जारी\s+किया|जारी\s+की|दर्ज\s+किए|दर्ज\s+किया|दर्ज\s+की|शुरू\s+किए|शुरू\s+किया|शुरू\s+की|करने|होने|देने|लेने|लगाने|बनाने|चलाने|भेजने|रखने|करते|होते))$/u;

  // Strip dangling postpositions at the end
  const danglingRegex =
    /(?:\s+(?:और|तथा|एवं|व|या|अथवा|कि|जो|जिसमें|जिसके|जिससे|जिसका|जिसकी|जिन्हें|जिसे|का|की|के|में|पर|से|को|ने|तक|हेतु|लिए|द्वारा|समेत|साथ|खिलाफ|विरुद्ध|अंतर्गत|तहत|दौरान|अनुसार|हो|होकर|हुए|हुआ|कर|गया|गई|गए|भी|तो|ही|हुई|चलते|लेकर|कहा\s+कि|बताया\s+कि))$/u;

  let prev = "";
  while (text !== prev) {
    prev = text;
    text = text.replace(sentenceEndingRegex, "").trim();
    text = text.replace(incompleteVerbRegex, "").trim();
    text = text.replace(danglingRegex, "").trim();
    text = text.replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "").trim();
  }

  // If the trailing clause after a comma/colon still ends in an incomplete phrase or oblique plural (e.g. "...10 फर्जी किसानों"),
  // trim back cleanly to the preceding complete clause so the headline never ends mid-thought.
  if (hasInvalidHeadlineEnding(text)) {
    const clauseSeps = [", ", " — ", " - ", "; ", ": "];
    for (const sep of clauseSeps) {
      const idx = text.lastIndexOf(sep);
      if (idx >= 24) {
        const prefix = text.substring(0, idx).replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "").trim();
        if (prefix.split(/\s+/).filter(Boolean).length >= 5 && !hasInvalidHeadlineEnding(prefix)) {
          text = prefix;
          break;
        }
      }
    }
  }

  return text
    .replace(/मध्यप्रदेश/g, "मध्य प्रदेश")
    .replace(/उत्तरप्रदेश/g, "उत्तर प्रदेश")
    .trim();
}

/**
 * Safely trims a headline to fit within maxWords and maxChars WITHOUT slicing mid-phrase
 * or leaving incomplete verb participles / dangling oblique nouns at the end.
 */
export function trimHeadlineToCompleteClause(
  rawHeadline: string,
  maxWords: number = 22,
  maxChars: number = 200
): string {
  let text = cleanCandidateClause(rawHeadline || "");
  if (!text) return "";

  const fitsCleanly = (s: string): boolean => {
    if (!s) return false;
    const words = s.split(/\s+/).filter(Boolean);
    return words.length <= maxWords && countCharacters(s) <= maxChars && !hasInvalidHeadlineEnding(s);
  };

  if (fitsCleanly(text)) return text;

  // Step 1: Try light non-destructive filler compaction (e.g. ", मामले में " -> ", ") to keep the full ending intact!
  const compacted = text
    .replace(/,\s*(?:पूरे\s+)?मामले\s+में\s+/gu, ", ")
    .replace(/,\s*इस\s+मामले\s+में\s+/gu, ", ")
    .replace(/,\s*घटना\s+के\s+बाद\s+/gu, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (compacted !== text && fitsCleanly(compacted)) {
    return compacted;
  }
  const working = compacted.length < text.length ? compacted : text;

  // Step 2: Prefer trimming cleanly at a complete clause boundary (comma / dash / semicolon / colon) from right to left.
  // Require at least 9 words in the kept prefix so short lead-in labels like "डिंडौरी: ईओडब्ल्यू की कार्रवाई" are never returned alone.
  const clauseDelimiters = [", ", " — ", " - ", "; ", ": "];
  let bestClausePrefix = "";
  for (const sep of clauseDelimiters) {
    let searchFrom = working.length;
    while (searchFrom > 0) {
      const idx = working.lastIndexOf(sep, searchFrom - 1);
      if (idx < 28) break;
      const prefix = cleanCandidateClause(working.substring(0, idx));
      if (fitsCleanly(prefix) && prefix.split(/\s+/).filter(Boolean).length >= 9) {
        if (countCharacters(prefix) > countCharacters(bestClausePrefix)) {
          bestClausePrefix = prefix;
        }
        break;
      }
      searchFrom = idx;
    }
  }
  if (bestClausePrefix) {
    return bestClausePrefix;
  }

  // Step 3: Walk backward word-by-word to the longest grammatically complete ending within limits
  const words = working.split(/\s+/).filter(Boolean);
  const startLen = Math.min(words.length, maxWords);
  for (let len = startLen; len >= 5; len--) {
    const candidate = cleanCandidateClause(words.slice(0, len).join(" "));
    if (fitsCleanly(candidate) && candidate.split(/\s+/).filter(Boolean).length >= 5) {
      return candidate;
    }
  }

  // Final safeguard: return cleaned clause prefix or word slice stripped of invalid endings
  return cleanCandidateClause(words.slice(0, Math.min(words.length, maxWords)).join(" "));
}

/**
 * Regenerates an invalid, duplicate, or rejected headline option from the verified fact sheet.
 * Never simply deletes a publisher's name from a broken sentence; constructs a complete grammatical headline.
 * Accepts both signatures:
 *   (optionIndex, factsList, baseTitle, location, existingHeadlines, sourcePublisherNames)
 *   (factsList, location, optionIndex, baseTitle, existingHeadlines, sourcePublisherNames)
 */
export function regenerateHeadlineOptionFromFacts(
  arg1: number | string[],
  arg2: string[] | string,
  arg3: string | number,
  arg4?: string | any[],
  arg5?: any[] | string[],
  arg6?: string[]
): string {
  let optionIndex = 0;
  let factsList: string[] = [];
  let baseTitle = "";
  let location = "";
  let existingHeadlines: string[] = [];
  let sourcePublisherNames: string[] = [];

  if (typeof arg1 === "number") {
    optionIndex = arg1;
    factsList = Array.isArray(arg2) ? arg2 : [];
    baseTitle = typeof arg3 === "string" ? arg3 : "";
    location = typeof arg4 === "string" ? arg4 : "";
    existingHeadlines = Array.isArray(arg5) ? arg5 : [];
    sourcePublisherNames = Array.isArray(arg6) ? arg6 : [];
  } else if (Array.isArray(arg1)) {
    factsList = arg1;
    location = typeof arg2 === "string" ? arg2 : "";
    optionIndex = typeof arg3 === "number" ? arg3 : 0;
    baseTitle = typeof arg4 === "string" ? arg4 : "";
    existingHeadlines = Array.isArray(arg5) ? arg5 : [];
    sourcePublisherNames = Array.isArray(arg6) ? arg6 : [];
  }

  const target = HEADLINE_TARGETS[optionIndex] || { min: 80, max: 200 };
  const loc = (location && location !== "विशेष कवरेज") ? location.split(/[\/,]/)[0].trim() : "";

  // 1. Gather clean, untainted fact sentences that do NOT contain blocked publisher names
  const cleanFacts: string[] = [];
  for (const rawFact of factsList) {
    if (!rawFact || typeof rawFact !== "string") continue;
    let cleaned = cleanCandidateClause(rawFact);
    cleaned = removeRedundantClauses(cleaned);
    if (cleaned.length < 15) continue;
    if (hasBlockedMediaBrand(cleaned, sourcePublisherNames)) continue;
    if (hasInvalidHeadlineEnding(cleaned)) continue;
    if (!cleanFacts.includes(cleaned)) {
      cleanFacts.push(cleaned);
    }
  }

  // 2. Check base title
  let cleanBase = removeRedundantClauses(cleanCandidateClause(baseTitle || ""));
  if (hasBlockedMediaBrand(cleanBase, sourcePublisherNames)) {
    cleanBase = cleanFacts[0] || "महत्वपूर्ण समाचार घटनाक्रम";
  }

  if (hasInvalidHeadlineEnding(cleanBase)) {
    cleanBase = cleanCandidateClause(cleanBase);
  }

  const baseCriticalEntities = VALIDATOR_CRITICAL_ENTITIES.filter((ent) => cleanBase.includes(ent));
  const ensureCriticalEntities = (cand: string): string => {
    if (!cand || baseCriticalEntities.length === 0) return cand;
    const missing = baseCriticalEntities.filter((ent) => !cand.includes(ent));
    if (missing.length === 0) return cand;
    if (cleanBase && cleanBase.length <= 48 && !cand.includes(cleanBase)) {
      return `${cleanBase}: ${cand}`;
    }
    return `${missing.join(" व ")} की कार्रवाई: ${cand}`;
  };

  // 3. Generate candidate variations tailored to the tier angle
  const candidates: string[] = [];

  // Angle 1: Direct primary event
  if (cleanBase) candidates.push(cleanBase);

  // Angle 2: Location framed event
  if (loc && cleanBase && !cleanBase.includes(loc)) {
    candidates.push(`${loc}: ${cleanBase}`);
    candidates.push(`${loc} में ${cleanBase}`);
  }

  // Angle 3: Facts from article (anchored with critical entities from baseTitle if missing)
  for (const f of cleanFacts) {
    if (f !== cleanBase) {
      if (cleanBase && checkHeadlineSimilarity(cleanBase, f) < 0.65) {
        candidates.push(`${cleanBase}, ${f}`);
        candidates.push(`${cleanBase}: ${f}`);
      }
      const anchoredF = ensureCriticalEntities(f);
      candidates.push(anchoredF);
      if (loc && !anchoredF.includes(loc)) {
        candidates.push(`${loc}: ${anchoredF}`);
      }
    }
  }

  // Angle 4: Combinations of verified facts without echoing/repetitive overlap
  for (let i = 0; i < cleanFacts.length; i++) {
    const fA = cleanFacts[i];
    for (let j = 0; j < cleanFacts.length; j++) {
      if (i !== j) {
        const fB = cleanFacts[j];
        if (checkHeadlineSimilarity(fA, fB) < 0.45) {
          const next = ensureCriticalEntities(`${fA}, ${fB}`);
          candidates.push(next);
          if (loc && !next.includes(loc)) {
            candidates.push(`${loc}: ${next}`);
          }
        }
      }
    }
  }

  // 4. Test candidates against validation rules and target bounds
  const validCandidates: { text: string; len: number; diff: number }[] = [];

  for (const cand of candidates) {
    let candidate = removeRedundantClauses(cleanCandidateClause(ensureCriticalEntities(cand)));
    let charLen = countCharacters(candidate);

    if (charLen > target.max || candidate.split(/\s+/).filter(Boolean).length > 22 || hasInvalidHeadlineEnding(candidate)) {
      candidate = trimHeadlineToCompleteClause(removeRedundantClauses(candidate), 22, target.max);
      charLen = countCharacters(candidate);
      if (charLen > target.max || charLen < Math.min(target.min, 35) || candidate.split(/\s+/).filter(Boolean).length > 22) {
        continue;
      }
    }

    if (candidate.split(/\s+/).filter(Boolean).length < 7) continue;
    if (hasBlockedMediaBrand(candidate, sourcePublisherNames)) continue;
    if (hasInvalidHeadlineEnding(candidate)) continue;

    const isDup = existingHeadlines.some((ex) => {
      if (!ex) return false;
      return (
        normalizeText(ex) === normalizeText(candidate) ||
        checkHeadlineSimilarity(ex, candidate) >= 0.85
      );
    });
    if (isDup) continue;

    const ideal = (target.min + target.max) / 2;
    const missingCriticalPenalty = baseCriticalEntities.some((ent) => !candidate.includes(ent)) ? 120 : 0;
    const diff = (charLen >= target.min ? Math.abs(charLen - ideal) : (target.min - charLen) * 3) + missingCriticalPenalty;
    validCandidates.push({ text: candidate, len: charLen, diff });
  }

  validCandidates.sort((a, b) => a.diff - b.diff);

  if (validCandidates.length > 0) {
    return validCandidates[0].text;
  }

  // 5. Fallback: Create clean, complete, non-duplicate journalistic variants across all facts so 5 + 5 regeneration always yields 10 unique options
  const angleVariants: string[] = [];
  const genericPrefixes = [
    "बड़ी खबर",
    "बड़ा एक्शन",
    "बड़ा खुलासा",
    "ताज़ा अपडेट",
    "प्रशासनिक सख्ती",
    "मामले में नया मोड़",
    "विशेष रिपोर्ट",
    "प्रमुख समाचार",
  ];
  const locPrefixes = loc
    ? [
        `${loc} से बड़ी खबर`,
        `${loc} में बड़ा एक्शन`,
        `${loc} में बड़ा खुलासा`,
        `${loc} से ताज़ा अपडेट`,
        `${loc} में हड़कंप`,
        `${loc} की प्रमुख खबर`,
      ]
    : genericPrefixes;

  // Add distinct fact-driven angles first without repeating location or stacking double colons
  cleanFacts.forEach((f, idx) => {
    const anchored = ensureCriticalEntities(f);
    const hasLoc = Boolean(loc && anchored.includes(loc));
    const hasColon = anchored.includes(":");
    const prefix = hasLoc
      ? genericPrefixes[idx % genericPrefixes.length]
      : locPrefixes[idx % locPrefixes.length];
    if (!hasColon) {
      angleVariants.push(`${prefix}: ${anchored}`);
    } else if (!hasLoc && loc) {
      angleVariants.push(`${loc} में ${anchored}`);
    }
    angleVariants.push(anchored);
  });

  // Add base-title framed angles (skip location prefix if cleanBase already names location)
  const baseHasLoc = Boolean(loc && cleanBase.includes(loc));
  (baseHasLoc ? genericPrefixes : locPrefixes).forEach((prefix) => {
    angleVariants.push(`${prefix}: ${cleanBase}`);
  });
  angleVariants.push(cleanBase);

  const isExactDup = (cand: string) =>
    existingHeadlines.some((ex) => ex && normalizeText(ex) === normalizeText(cand));
  const isNearDup = (cand: string) =>
    existingHeadlines.some(
      (ex) => ex && (normalizeText(ex) === normalizeText(cand) || checkHeadlineSimilarity(ex, cand) >= 0.85)
    );

  let chosen = "";
  const rotatedVariants = [
    ...angleVariants.slice(optionIndex % Math.max(1, angleVariants.length)),
    ...angleVariants.slice(0, optionIndex % Math.max(1, angleVariants.length)),
  ];

  // Pass 1: Prefer strictly non-similar (< 0.85) substantive (>= 8 words) complete headline
  for (const alt of rotatedVariants) {
    const cleanedAlt = trimHeadlineToCompleteClause(ensureCriticalEntities(alt), 22, target.max);
    const wCount = cleanedAlt ? cleanedAlt.split(/\s+/).filter(Boolean).length : 0;
    if (!cleanedAlt || wCount < 8 || hasInvalidHeadlineEnding(cleanedAlt) || hasBlockedMediaBrand(cleanedAlt, sourcePublisherNames)) continue;
    if (!isNearDup(cleanedAlt)) {
      chosen = cleanedAlt;
      break;
    }
  }

  // Pass 2: If story facts are very tight, guarantee zero exact duplicates and substantive length
  if (!chosen) {
    for (const alt of rotatedVariants) {
      const cleanedAlt = trimHeadlineToCompleteClause(ensureCriticalEntities(alt), 22, target.max);
      const wCount = cleanedAlt ? cleanedAlt.split(/\s+/).filter(Boolean).length : 0;
      if (!cleanedAlt || wCount < 8 || hasInvalidHeadlineEnding(cleanedAlt) || hasBlockedMediaBrand(cleanedAlt, sourcePublisherNames)) continue;
      if (!isExactDup(cleanedAlt)) {
        chosen = cleanedAlt;
        break;
      }
    }
  }

  if (!chosen) {
    chosen = trimHeadlineToCompleteClause(cleanBase, 22, target.max);
  }

  return chosen;
}

/**
 * Extracts known publisher aliases from a news article URL hostname.
 */
export function extractPublisherFromDomain(rawUrl: string): string[] {
  if (!rawUrl || typeof rawUrl !== "string") return [];
  try {
    const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();

    const domainMap: Record<string, string[]> = {
      "naidunia.com": ["नई दुनिया", "नईदुनिया", "Nai Dunia", "Nai Duniya"],
      "bhaskar.com": ["दैनिक भास्कर", "Dainik Bhaskar", "भास्कर", "Bhaskar"],
      "jagran.com": ["दैनिक जागरण", "Dainik Jagran", "जागरण", "Jagran"],
      "amarujala.com": ["अमर उजाला", "Amar Ujala"],
      "livehindustan.com": ["हिंदुस्तान", "Hindustan", "Live Hindustan"],
      "hindustantimes.com": ["हिंदुस्तान टाइम्स", "Hindustan Times"],
      "navbharattimes.indiatimes.com": ["नवभारत टाइम्स", "Navbharat Times", "NBT"],
      "aajtak.in": ["आज तक", "Aaj Tak"],
      "ndtv.in": ["NDTV", "एनडीटीवी", "NDTV India"],
      "ndtv.com": ["NDTV", "एनडीटीवी", "NDTV India"],
      "zeenews.india.com": ["Zee News", "ज़ी न्यूज़"],
      "news18.com": ["News18", "न्यूज़18"],
      "abplive.com": ["ABP News", "एबीपी न्यूज़"],
      "tv9hindi.com": ["TV9", "टीवी9", "TV9 Bharatvarsh"],
      "bbc.com": ["BBC News", "BBC Hindi", "बीबीसी"],
      "patrika.com": ["पत्रिका", "Patrika"],
      "haribhoomi.com": ["हरिभूमि", "Haribhoomi"],
      "prabhatkhabar.com": ["प्रभात खबर", "Prabhat Khabar"],
      "bansalnews.com": ["बंसल न्यूज़", "Bansal News"],
      "mptak.in": ["MP Tak", "एमपी तक"],
      "republicbharat.com": ["Republic Bharat", "रिपब्लिक भारत"],
      "jansatta.com": ["जनसत्ता", "Jansatta"],
      "oneindia.com": ["वनइंडिया", "OneIndia"],
    };

    for (const [key, aliases] of Object.entries(domainMap)) {
      if (host.includes(key)) {
        return aliases;
      }
    }
    return [];
  } catch {
    return [];
  }
}
