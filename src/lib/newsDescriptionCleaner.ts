/**
 * News Description Cleaner Utility
 * AI NEWS MAKER — Strict Digital Journalism Protocol
 * 
 * Responsibilities:
 * 1. Strip reporter bylines (e.g., 'विवेक पाराशर,', 'सुनील शर्मा द्वारा')
 * 2. Strip external media brand/publication prefixes (e.g., 'नईदुनिया,', 'दैनिक भास्कर,', 'अमर उजाला,')
 * 3. Strip dateline/location prefixes (e.g., 'खरगोन।', 'भोपाल:', 'नई दिल्ली -')
 * 4. Remove boilerplate trailers (e.g., 'यह खबर भी पढ़ें', 'Follow us on Google News')
 * 5. Clean HTML entities and tags
 * 6. Format into 1-2 clean, substantive, publication-ready paragraphs.
 */

// Known media brands to strip from beginning of descriptions
const KNOWN_PUBLICATION_PREFIXES = [
  'नईदुनिया',
  'नई दुनिया',
  'दैनिक भास्कर',
  'अमर उजाला',
  'नवभारत टाइम्स',
  'नवभारत',
  'हिंदुस्तान',
  'प्रभात खबर',
  'हरिभूमि',
  'आज तक',
  'एबीपी न्यूज़',
  'एबीपी',
  'News18',
  'न्यूज़18',
  'न्यूज 18',
  'Zee News',
  'ज़ी न्यूज़',
  'जी न्यूज',
  'NDTV',
  'एनडीटीवी',
  'India TV',
  'इंडिया टीवी',
  'TV9',
  'टीवी9',
  'Times Now',
  'टाइम्स नाउ',
  'Republic Bharat',
  'रिपब्लिक भारत',
  'News Nation',
  'न्यूज़ नेशन',
  'MP Tak',
  'एमपी तक',
  'Bansal News',
  'बंसल न्यूज़',
  'BBC News',
  'बीबीसी',
  'पत्रिका',
  'Patrika',
  'Jagran',
  'जागरण',
  'Dainik Bhaskar',
  'Nai Dunia',
  'Nai Duniya',
  'भाषा',
  'वार्ता',
  'पीटीआई',
  'PTI',
  'UNI',
  'IANS',
];

export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '--')
    .trim();
}

export function cleanNewsDescription(rawText: string, maxParagraphs: number = 2): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Strip HTML tags and decode entities
  let text = rawText.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);

  // 2. Normalize whitespace
  text = text.replace(/[\r\t]+/g, ' ').replace(/\u00A0/g, ' ').replace(/ +/g, ' ').trim();

  // 3. Remove bylines, publication prefixes, and datelines at the beginning
  const brandRegexPart = KNOWN_PUBLICATION_PREFIXES.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  // Pattern A: [Reporter], [Brand], [Location] [।|:|-]
  const patternA = new RegExp(
    `^(?:[\\p{L}\\p{M}\\s.'"-]{2,30},\\s*)?(?:${brandRegexPart})\\s*,?\\s*(?:[\\p{L}\\p{M}\\s.'"-]{2,30})?[\\s]*[।:–—-][\\s]*`,
    'u'
  );
  text = text.replace(patternA, '');

  // Pattern B: [Reporter], [Location] [।|:|-] where preceded by common Hindi byline patterns
  const patternB = /^(?:विशेष संवाददाता|संवाददाता|ब्यूरो चीफ|प्रतिनिधि|एजेंसी|वार्ताकार|डेस्क)[\s,]+(?:[\p{L}\p{M}\s.'"-]{2,30})?[।:–—-]\s*/u;
  text = text.replace(patternB, '');

  // Pattern C: Common datelines at start (e.g. "भोपाल।", "खरगोन:", "नई दिल्ली:")
  const patternC = /^(?:नई दिल्ली|भोपाल|इंदौर|ग्वालियर|जबलपुर|उज्जैन|खरगोन|रायपुर|जयपुर|लखनऊ|पटना|मुंबई|चंडीगढ़)[\s]*[।:–—-][\s]*/u;
  text = text.replace(patternC, '');

  // Pattern D: Residual publisher prefixes like "दैनिक भास्कर : " or "नईदुनिया -"
  const patternD = new RegExp(`^(?:${brandRegexPart})[\\s]*[।:–—-][\\s]*`, 'u');
  text = text.replace(patternD, '');

  // Pattern E: Generic reporter byline with location prefix ending in danda or colon (e.g., "अमित कुमार, भोपाल। ")
  const patternE = /^[\p{L}\p{M}\s.'"-]{2,25},\s*[\p{L}\p{M}\s.'"-]{2,25}[।:–—-]\s*/u;
  text = text.replace(patternE, '');

  // 4. Strip boilerplate trailing promos
  const trailingBoilerplate = [
    /यह खबर भी पढ़ें[\s\S]*$/i,
    /यह भी पढ़ें[\s\S]*$/i,
    /Follow us on[\s\S]*$/i,
    /गूगल न्यूज़ पर फॉलो करें[\s\S]*$/i,
    /डाउनलोड करें अमर उजाला ऐप[\s\S]*$/i,
    /दैनिक भास्कर ऐप डाउनलोड करें[\s\S]*$/i,
    /स्रोत:[\s\S]*$/i,
  ];
  for (const bPattern of trailingBoilerplate) {
    text = text.replace(bPattern, '').trim();
  }

  // 5. Break into paragraphs and take max 1-2 substantive paragraphs
  const rawParagraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  let paragraphs: string[] = [];

  if (rawParagraphs.length > 1) {
    paragraphs = rawParagraphs.slice(0, maxParagraphs);
  } else {
    // If it's a single huge block, split by sentence endings if it exceeds 350 chars
    if (text.length > 350) {
      const sentences = text.split(/([।!?]\s+)/);
      let p1 = '';
      let p2 = '';
      let currentLen = 0;
      const targetMid = Math.floor(text.length / 2);

      for (let i = 0; i < sentences.length; i++) {
        if (currentLen < targetMid || !p1) {
          p1 += sentences[i];
          currentLen += sentences[i].length;
        } else {
          p2 += sentences[i];
        }
      }
      paragraphs = [p1.trim(), p2.trim()].filter(Boolean).slice(0, maxParagraphs);
    } else {
      paragraphs = [text.trim()];
    }
  }

  return paragraphs.join('\n\n').trim();
}
