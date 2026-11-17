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
 * Calculates token similarity between two headlines using Jaccard index.
 */
export function checkHeadlineSimilarity(h1: string, h2: string): number {
  if (!h1 || !h2) return 0;
  const stopWords = new Set([
    "और", "पर", "में", "से", "को", "का", "की", "के", "ने", "यह", "वह", "कि",
    "भी", "लिए", "नए", "नया", "बड़ा", "बड़ी", "हुए", "हुआ", "है", "हैं", "था", "थी", "थे",
  ]);

  const words1 = new Set(
    normalizeText(h1)
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w))
  );
  const words2 = new Set(
    normalizeText(h2)
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w))
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
} {
  const safe = Array.isArray(headlines) ? headlines.slice(0, 5) : [];
  const results: HeadlineValidationResult[] = [];
  const duplicates: number[] = [];
  const duplicatePairs: [number, number][] = [];

  for (let i = 0; i < 5; i++) {
    const text = safe[i] || "";
    const res = validateHeadline(text, i, sourcePublisherNames);
    results.push(res);
  }

  // Duplicate and similarity check across options
  for (let i = 0; i < safe.length; i++) {
    for (let j = i + 1; j < safe.length; j++) {
      const hA = safe[i] || "";
      const hB = safe[j] || "";
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

  const allValid = results.every((r) => r.valid) && duplicates.length === 0 && safe.length === 5;

  return {
    valid: allValid,
    results,
    duplicates,
    duplicatePairs,
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
 */
export function regenerateHeadlineOptionFromFacts(
  optionIndex: number,
  factsList: string[],
  baseTitle: string,
  location: string = "",
  existingHeadlines: string[] = [],
  sourcePublisherNames: string[] = []
): string {
  const target = HEADLINE_TARGETS[optionIndex] || { min: 80, max: 200 };
  const loc = (location && location !== "विशेष कवरेज") ? location.split(/[\/,]/)[0].trim() : "";

  // 1. Gather clean, untainted fact sentences that do NOT contain blocked publisher names
  const cleanFacts: string[] = [];
  for (const rawFact of factsList) {
    if (!rawFact || typeof rawFact !== "string") continue;
    const cleaned = cleanCandidateClause(rawFact);
    if (cleaned.length < 15) continue;
    if (hasBlockedMediaBrand(cleaned, sourcePublisherNames)) continue;
    if (hasInvalidHeadlineEnding(cleaned)) continue;
    if (!cleanFacts.includes(cleaned)) {
      cleanFacts.push(cleaned);
    }
  }

  // 2. Check base title
  let cleanBase = cleanCandidateClause(baseTitle || "");
  if (hasBlockedMediaBrand(cleanBase, sourcePublisherNames)) {
    // If baseTitle has publisher name, DO NOT just delete the word; replace with cleanest primary fact
    cleanBase = cleanFacts[0] || "महत्वपूर्ण समाचार घटनाक्रम";
  }

  // If cleanBase still has invalid ending, strip it cleanly
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
      if (cleanBase && !cleanBase.includes(f) && !f.includes(cleanBase)) {
        candidates.push(`${cleanBase}, ${f}`);
      }
    }
  }

  // Angle 4: Combinations of verified facts to reach higher tier targets
  for (let i = 0; i < cleanFacts.length; i++) {
    let combined = cleanFacts[i];
    for (let j = 0; j < cleanFacts.length; j++) {
      if (i !== j) {
        const next = `${combined}, ${cleanFacts[j]}`;
        candidates.push(next);
        if (loc && !next.includes(loc)) {
          candidates.push(`${loc}: ${next}`);
        }
        for (let k = 0; k < cleanFacts.length; k++) {
          if (k !== i && k !== j) {
            const next3 = `${next}, ${cleanFacts[k]}`;
            candidates.push(next3);
            if (loc && !next3.includes(loc)) {
              candidates.push(`${loc}: ${next3}`);
            }
          }
        }
      }
    }
  }

  // 4. Test candidates against validation rules and target bounds
  const validCandidates: { text: string; len: number; diff: number }[] = [];

  for (const cand of candidates) {
    let candidate = cleanCandidateClause(cand);
    let charLen = countCharacters(candidate);

    if (charLen > target.max) {
      const sliced = candidate.substring(0, target.max);
      const lastSpace = sliced.lastIndexOf(" ");
      if (lastSpace >= target.min) {
        candidate = cleanCandidateClause(sliced.substring(0, lastSpace));
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

  // Fallback: If no candidate met exact range without duplication, create a clean synthesized variant
  let fallback = cleanBase;
  if (loc && !fallback.includes(loc)) {
    fallback = `${loc}: ${fallback}`;
  }
  fallback = cleanCandidateClause(fallback);

  if (countCharacters(fallback) > target.max) {
    const sliced = fallback.substring(0, target.max);
    const lastSpace = sliced.lastIndexOf(" ");
    if (lastSpace > 20) {
      fallback = cleanCandidateClause(sliced.substring(0, lastSpace));
    }
  }

  return fallback;
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
