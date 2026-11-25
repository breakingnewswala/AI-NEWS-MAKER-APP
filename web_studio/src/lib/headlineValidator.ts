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

  // Reject dangling relative conjunctions / particles at the end
  if (/(?:^|\s)(?:जिसमें|जिसके|जिससे|जिसका|जिसकी|तथा|एवं|और|कि|लेकिन|मगर|किंतु|परंतु)\s*$/u.test(text)) {
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

/**
 * Cleans a candidate sentence of terminal punctuation, explanatory endings, and trailing postpositions.
 */
export function cleanCandidateClause(clause: string): string {
  if (!clause || typeof clause !== "string") return "";
  let text = clause
    .replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip explanatory verb endings if present at the end of the clause
  const sentenceEndingRegex =
    /(?:\s+(?:है|हैं|था|थी|थे|थीं|होगा|होगी|होंगे|होंगी|रहेगा|रहेगी|किया गया|किया गया है|किया जाएगा|की जाएगी|उपलब्ध कराई जाएगी|बैठक के दौरान लिया|लिया गया))$/u;

  // Strip dangling postpositions at the end
  const danglingRegex =
    /(?:\s+(?:और|तथा|एवं|व|या|अथवा|कि|जो|का|की|के|में|पर|से|को|ने|तक|हेतु|लिए|हो|हुए|कर|गया|गई|गए|भी|तो|ही|हुई|जारी|चलते|लेकर|कहा\s+कि|बताया\s+कि))$/u;

  let prev = "";
  while (text !== prev) {
    prev = text;
    text = text.replace(sentenceEndingRegex, "").trim();
    text = text.replace(danglingRegex, "").trim();
    text = text.replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "").trim();
  }

  return text
    .replace(/मध्यप्रदेश/g, "मध्य प्रदेश")
    .replace(/उत्तरप्रदेश/g, "उत्तर प्रदेश")
    .trim();
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

  // 3. Generate candidate variations tailored to the tier angle
  const candidates: string[] = [];

  // Angle 1: Direct primary event
  if (cleanBase) candidates.push(cleanBase);

  // Angle 2: Location framed event
  if (loc && cleanBase && !cleanBase.includes(loc)) {
    candidates.push(`${loc}: ${cleanBase}`);
    candidates.push(`${loc} में ${cleanBase}`);
  }

  // Angle 3: Facts from article
  for (const f of cleanFacts) {
    if (f !== cleanBase) {
      candidates.push(f);
      if (loc && !f.includes(loc)) {
        candidates.push(`${loc}: ${f}`);
      }
      if (cleanBase && checkHeadlineSimilarity(cleanBase, f) < 0.35) {
        candidates.push(`${cleanBase}, ${f}`);
      }
    }
  }

  // Angle 4: Combinations of verified facts without echoing/repetitive overlap
  for (let i = 0; i < cleanFacts.length; i++) {
    const fA = cleanFacts[i];
    for (let j = 0; j < cleanFacts.length; j++) {
      if (i !== j) {
        const fB = cleanFacts[j];
        if (checkHeadlineSimilarity(fA, fB) < 0.35) {
          const next = `${fA}, ${fB}`;
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
    let candidate = removeRedundantClauses(cleanCandidateClause(cand));
    let charLen = countCharacters(candidate);

    if (charLen > target.max) {
      const sliced = candidate.substring(0, target.max);
      const lastSpace = sliced.lastIndexOf(" ");
      if (lastSpace >= target.min) {
        candidate = removeRedundantClauses(cleanCandidateClause(sliced.substring(0, lastSpace)));
        charLen = countCharacters(candidate);
      } else {
        continue;
      }
    }

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
    const diff = charLen >= target.min ? Math.abs(charLen - ideal) : (target.min - charLen) * 3;
    validCandidates.push({ text: candidate, len: charLen, diff });
  }

  validCandidates.sort((a, b) => a.diff - b.diff);

  if (validCandidates.length > 0) {
    return validCandidates[0].text;
  }

  // 5. Fallback: If no candidate met exact range without duplication, create a clean synthesized variant
  const opt5Fallback = cleanFacts.length > 1
    ? `${cleanBase}: ${cleanFacts[0]}, ${cleanFacts[1]}`
    : (cleanFacts.length === 1
      ? `${cleanBase}: ${cleanFacts[0]}, मामले में प्रशासनिक स्तर पर विस्तृत समीक्षा के निर्देश दिए गए`
      : (loc ? `${loc} से विशेष कवरेज: ${cleanBase}, क्षेत्र में संपूर्ण घटनाक्रम पर नजर, प्रशासन द्वारा आवश्यक कार्रवाई जारी` : `मुख्य कवरेज: ${cleanBase}, क्षेत्र में संपूर्ण घटनाक्रम पर नजर, प्रशासन द्वारा आवश्यक कार्रवाई जारी`));

  const angleVariants: string[] = [
    cleanBase,
    loc ? `${loc} में प्रशासन अलर्ट, ${cleanBase}` : `मामले में अधिकारियों के निर्देश जारी, ${cleanBase}`,
    loc ? `${loc} से बड़ा अपडेट: ${cleanBase}, क्षेत्र में चर्चा तेज` : `बड़ा असर: ${cleanBase}, लोगों का ध्यान आकर्षित`,
    loc ? `विशेष ग्राउंड रिपोर्ट: ${loc} में ${cleanBase}` : `विशेष पड़ताल: ${cleanBase}, जानिए पूरे मामले से जुड़े तथ्य`,
    opt5Fallback,
  ];

  let chosen = angleVariants[optionIndex % angleVariants.length] || cleanBase;
  if (loc && !chosen.includes(loc) && optionIndex === 0) {
    chosen = `${loc}: ${chosen}`;
  }
  chosen = cleanCandidateClause(chosen);

  const isChosenDup = existingHeadlines.some((ex) => {
    if (!ex) return false;
    return normalizeText(ex) === normalizeText(chosen) || checkHeadlineSimilarity(ex, chosen) >= 0.85;
  });

  if (isChosenDup) {
    for (const alt of angleVariants) {
      const cleanedAlt = cleanCandidateClause(alt);
      const isAltDup = existingHeadlines.some((ex) => {
        if (!ex) return false;
        return normalizeText(ex) === normalizeText(cleanedAlt) || checkHeadlineSimilarity(ex, cleanedAlt) >= 0.85;
      });
      if (!isAltDup) {
        chosen = cleanedAlt;
        break;
      }
    }
  }

  if (countCharacters(chosen) > target.max) {
    const sliced = chosen.substring(0, target.max);
    const lastSpace = sliced.lastIndexOf(" ");
    if (lastSpace > 20) {
      chosen = cleanCandidateClause(sliced.substring(0, lastSpace));
    }
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
