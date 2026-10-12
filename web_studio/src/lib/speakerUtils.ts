// Helper utilities to detect and extract leader names and designations from Hindi news headlines

/**
 * Professional News Headline Formatter:
 * - Removes starting fluff like "यह खबर है", "जानिए", "देखिए", "Breaking News:", "ब्रेकिंग न्यूज़:"
 * - Strips trailing punctuation like "." or "।" or commas
 * - Cleans up multiple spaces
 */
export function cleanHeadlineText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/^(यह खबर है|जानिए|देखिए|Breaking News[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*)\s*/i, '')
    .trim();
  // Strip trailing punctuation (. or । or ! or ? or , or - or :) repeatedly until clean
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();
  return cleaned;
}

export interface DetectedSpeaker {
  name: string;
  title: string;
}

const KNOWN_LEADERS: { keywords: string[]; name: string; title: string }[] = [
  {
    keywords: ['दिग्विजय', 'दिग्विजय सिंह'],
    name: 'दिग्विजय सिंह',
    title: 'पूर्व मुख्यमंत्री',
  },
  {
    keywords: ['मोहन यादव', 'डॉ मोहन', 'डॉ. मोहन', 'सीएम मोहन', 'CM मोहन'],
    name: 'डॉ. मोहन यादव',
    title: 'मुख्यमंत्री, मप्र',
  },
  {
    keywords: ['शिवराज', 'शिवराज सिंह', 'शिवराज सिंह चौहान'],
    name: 'शिवराज सिंह चौहान',
    title: 'केंद्रीय मंत्री',
  },
  {
    keywords: ['कमलनाथ', 'कमल नाथ'],
    name: 'कमलनाथ',
    title: 'पूर्व मुख्यमंत्री',
  },
  {
    keywords: ['नरेंद्र मोदी', 'पीएम मोदी', 'PM मोदी', 'प्रधानमंत्री मोदी'],
    name: 'नरेंद्र मोदी',
    title: 'प्रधानमंत्री',
  },
  {
    keywords: ['राहुल गांधी'],
    name: 'राहुल गांधी',
    title: 'नेता प्रतिपक्ष',
  },
  {
    keywords: ['अमित शाह'],
    name: 'अमित शाह',
    title: 'केंद्रीय गृह मंत्री',
  },
  {
    keywords: ['अनिरुद्धाचार्य', 'अनिरुद्धाचार्य महाराज'],
    name: 'अनिरुद्धाचार्य महाराज',
    title: 'कथावाचक',
  },
  {
    keywords: ['धीरेंद्र शास्त्री', 'बागेश्वर', 'धीरेंद्र कृष्ण'],
    name: 'पंडित धीरेंद्र शास्त्री',
    title: 'पीठाधीश्वर, बागेश्वर धाम',
  },
  {
    keywords: ['नरोत्तम मिश्रा'],
    name: 'डॉ. नरोत्तम मिश्रा',
    title: 'वरिष्ठ भाजपा नेता',
  },
  {
    keywords: ['जीतू पटवारी'],
    name: 'जीतू पटवारी',
    title: 'प्रदेश कांग्रेस अध्यक्ष',
  },
  {
    keywords: ['वीडी शर्मा', 'वी.डी. शर्मा'],
    name: 'वी.डी. शर्मा',
    title: 'भाजपा प्रदेशाध्यक्ष',
  },
  {
    keywords: ['अखिलेश यादव'],
    name: 'अखिलेश यादव',
    title: 'राष्ट्रीय अध्यक्ष, सपा',
  },
  {
    keywords: ['योगी आदित्यनाथ', 'CM योगी'],
    name: 'योगी आदित्यनाथ',
    title: 'मुख्यमंत्री, उप्र',
  },
];

/**
 * Smart detection of political leader / speaker from Hindi news headline text
 */
export function extractLeaderFromHeadline(headline: string): DetectedSpeaker {
  if (!headline) return { name: '', title: '' };

  const cleanHeadline = headline.replace(/\[\/?yellow\]/g, '').trim();

  // 1. Check known political leaders & prominent speakers
  for (const leader of KNOWN_LEADERS) {
    for (const kw of leader.keywords) {
      if (cleanHeadline.includes(kw)) {
        // If headline specifically mentions their title like "पूर्व मुख्यमंत्री", refine title
        if (cleanHeadline.includes('पूर्व मुख्यमंत्री') && !leader.title.includes('पूर्व मुख्यमंत्री')) {
          return { name: leader.name, title: 'पूर्व मुख्यमंत्री' };
        }
        return { name: leader.name, title: leader.title };
      }
    }
  }

  // 2. Pattern matching for generic Hindi official titles + Name
  // e.g. "पूर्व मुख्यमंत्री [नाम]", "मुख्यमंत्री [नाम]", "कलेक्टर [नाम]", "एसपी [नाम]"
  const titlePatterns: { regex: RegExp; defaultTitle: string }[] = [
    {
      regex: /(?:पूर्व\s+मुख्यमंत्री)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'पूर्व मुख्यमंत्री',
    },
    {
      regex: /(?:मुख्यमंत्री|CM)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'मुख्यमंत्री',
    },
    {
      regex: /(?:केंद्रीय\s+मंत्री)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'केंद्रीय मंत्री',
    },
    {
      regex: /(?:नेता\s+प्रतिपक्ष)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'नेता प्रतिपक्ष',
    },
    {
      regex: /(?:प्रदेशाध्यक्ष|प्रदेश\s+अध्यक्ष)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'प्रदेशाध्यक्ष',
    },
    {
      regex: /(?:कथावाचक)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'कथावाचक',
    },
    {
      regex: /(?:कलेक्टर|Collector)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'कलेक्टर',
    },
    {
      regex: /(?:एसपी|SP|पुलिस अधीक्षक)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'पुलिस अधीक्षक',
    },
    {
      regex: /(?:सांसद|MP)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'सांसद',
    },
    {
      regex: /(?:विधायक|MLA)\s+([^\s,;।:]+(?:\s+[^\s,;।:]+){1,2})/i,
      defaultTitle: 'विधायक',
    },
  ];

  for (const p of titlePatterns) {
    const match = cleanHeadline.match(p.regex);
    if (match && match[1]) {
      const extractedName = match[1].replace(/[.,:;!?'"()]/g, '').trim();
      if (extractedName.length >= 3 && !['ने', 'का', 'की', 'के', 'पर', 'से', 'को'].includes(extractedName)) {
        return { name: extractedName, title: p.defaultTitle };
      }
    }
  }

  return { name: '', title: '' };
}

/**
 * Returns effective speaker name and title for a card, avoiding false default
 */
export function getEffectiveSpeaker(
  speakerName?: string,
  speakerTitle?: string,
  headline?: string
): { name: string; title: string } {
  const trimmedName = (speakerName || '').trim();
  const trimmedTitle = (speakerTitle || '').trim();

  if (trimmedName) {
    return { name: trimmedName, title: trimmedTitle };
  }

  if (headline) {
    const detected = extractLeaderFromHeadline(headline);
    if (detected.name) {
      return {
        name: detected.name,
        title: trimmedTitle || detected.title,
      };
    }
  }

  return { name: '', title: trimmedTitle };
}
