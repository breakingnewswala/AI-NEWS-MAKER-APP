import { AIAnalysisResult } from '../types';
import { cleanHeadlineText } from './speakerUtils';
import { TemplateConfig, getGraphicTemplateConfig } from './graphicTemplatesRegistry';

export type HeadlineTemplateMeta = Partial<TemplateConfig> | {
  template_id?: string;
  headline_max_lines?: number;
  headline_area?: string;
  headline_line_count?: number;
};

// Client-side smart news parser and headline generator
// Ensures 100% uninterrupted operation with STRICT 2 or 3 line capacity matching selected template
export function processNewsLocally(
  rawText: string,
  linkUrl?: string,
  templateMeta?: HeadlineTemplateMeta
): AIAnalysisResult {
  const clean = (rawText || '').trim();
  const firstLine = clean.split(/[\n\r]+/)[0]?.trim() || 'ताज़ा समाचार अपडेट';

  const resolvedConfig = (templateMeta?.template_id || (templateMeta as any)?.id)
    ? getGraphicTemplateConfig(templateMeta?.template_id || (templateMeta as any)?.id)
    : undefined;
  const maxLines = templateMeta?.headline_max_lines ?? resolvedConfig?.headline_max_lines ?? 3;
  const targetArea = templateMeta?.headline_area ?? resolvedConfig?.headline_area ?? (maxLines === 2 ? '2-Line Headline Area' : '3-Line Headline Area');

  // Indian / Madhya Pradesh prominent locations
  const locationList = [
    'शहडोल', 'रीवा', 'सीधी', 'सतना', 'भोपाल', 'इंदौर', 'जबलपुर', 'ग्वालियर', 'उज्जैन',
    'सागर', 'छतरपुर', 'दमोह', 'कटनी', 'मंडला', 'डिंडोरी', 'अनूपपुर', 'उमरिया', 'सिंगरौली',
    'निवाड़ी', 'टीकमगढ़', 'दिल्ली', 'नई दिल्ली', 'मध्य प्रदेश', 'उत्तर प्रदेश'
  ];

  let detectedLocation = 'मध्य प्रदेश';
  for (const loc of locationList) {
    if (clean.includes(loc)) {
      detectedLocation = loc;
      break;
    }
  }

  // Create headline (clean up command prefixes and honorifics)
  let rawHeadline = firstLine
    .replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, '')
    .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, ' ')
    .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, ' ')
    .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, '')
    .replace(/\.{2,}/g, '')
    .trim();

  // If text is a link itself, generate a meaningful news headline
  if (rawHeadline.startsWith('http://') || rawHeadline.startsWith('https://')) {
    try {
      const urlObj = new URL(rawHeadline);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const lastSlug = pathParts[pathParts.length - 1] || urlObj.hostname;
      const slugTitle = decodeURIComponent(lastSlug)
        .replace(/[-_]/g, ' ')
        .replace(/\.(html|php|aspx)$/, '');
      rawHeadline = slugTitle || 'वेबसाइट से प्राप्त ताज़ा समाचार अपडेट';
    } catch {
      rawHeadline = 'वेबसाइट से प्राप्त ताज़ा समाचार अपडेट';
    }
  }

  // Enforce STRICT 2 or 3 line capacity
  // 2-line capacity: maximum ~10 words, concise, high-impact news fact
  // 3-line capacity: maximum ~16 words, clear, impactful
  const words = rawHeadline.split(/\s+/).filter(Boolean);
  const maxWords = maxLines === 2 ? 10 : 16;
  let headline = words.length > maxWords ? words.slice(0, maxWords).join(' ') : rawHeadline;
  headline = cleanHeadlineText(headline);

  // Pick highlight words: numbers, quoted words or location
  const highlightWords: string[] = [];
  if (detectedLocation && detectedLocation !== 'मध्य प्रदेश') {
    highlightWords.push(detectedLocation);
  }
  for (const w of words) {
    const cleanW = w.replace(/[.,:;!?'"()]/g, '');
    if (/\d+/.test(cleanW) || cleanW.length >= 6) {
      if (!highlightWords.includes(cleanW) && highlightWords.length < 3) {
        highlightWords.push(cleanW);
      }
    }
  }

  let formattedHeadline = headline;
  if (highlightWords.length > 0) {
    for (const hw of highlightWords) {
      if (formattedHeadline.includes(hw)) {
        formattedHeadline = formattedHeadline.replace(
          new RegExp(`(${hw})`, 'g'),
          '[yellow]$1[/yellow]'
        );
        break;
      }
    }
  }

  // Generate 3 strict template-compliant headline options
  const opt1 = headline;
  const opt2 = words.length > 6 ? words.slice(0, Math.min(words.length, maxLines === 2 ? 8 : 12)).join(' ') : `${detectedLocation}: ${headline}`;
  const opt3 = `${headline}`;

  const cleanHeadlinePure = headline.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, '');
  const locTag = detectedLocation.replace(/\s+/g, '');

  // Detect prominent speaker in headline / input
  let speakerName = '';
  let speakerTitle = '';
  if (/दिग्विजय/.test(clean)) {
    speakerName = 'दिग्विजय सिंह';
    speakerTitle = 'पूर्व मुख्यमंत्री';
  } else if (/मोहन यादव|सीएम मोहन|CM मोहन/.test(clean)) {
    speakerName = 'डॉ. मोहन यादव';
    speakerTitle = 'मुख्यमंत्री, मप्र';
  } else if (/शिवराज/.test(clean)) {
    speakerName = 'शिवराज सिंह चौहान';
    speakerTitle = 'केंद्रीय मंत्री';
  } else if (/कमलनाथ/.test(clean)) {
    speakerName = 'कमलनाथ';
    speakerTitle = 'पूर्व मुख्यमंत्री';
  } else if (/अनिरुद्धाचार्य/.test(clean)) {
    speakerName = 'अनिरुद्धाचार्य महाराज';
    speakerTitle = 'कथावाचक';
  } else if (/धीरेंद्र शास्त्री|बागेश्वर/.test(clean)) {
    speakerName = 'पंडित धीरेंद्र शास्त्री';
    speakerTitle = 'पीठाधीश्वर';
  }

  // Detect Category
  let category = 'ताज़ा ख़बर';
  if (/हादसा|दुर्घटना|टक्कर|पलटी|घायल|मौत/.test(clean)) {
    category = 'हादसा';
  } else if (/अपराध|गिरफ्तार|पुलिस|हत्या|चोरी|रेड/.test(clean)) {
    category = 'क्राइम';
  } else if (/राजनीति|चुनाव|कांग्रेस|बीजेपी|भाजपा|संसद|विधानसभा/.test(clean)) {
    category = 'सियासत';
  } else if (/मौसम|बारिश|ओलावृष्टि|ठंड|गर्मी/.test(clean)) {
    category = 'मौसम';
  }

  const summary = `${headline} को लेकर विस्तृत रिपोर्ट सामने आई है। इस मामले में संबंधित अधिकारियों एवं स्थानीय प्रशासन द्वारा आवश्यक संज्ञान लेकर अग्रिम कार्रवाई की जा रही है।\n\nघटनाक्रम से जुड़ी विस्तृत जानकारी और हर ताजा अपडेट के लिए जुड़े रहें ब्रेकिंग न्यूज़ वाला के साथ।\n\n#breakingnewswala #BreakingNews #HindiNews #${locTag}News #${cleanHeadlinePure.slice(0, 15).replace(/\s+/g, '')} #BNWTV`;

  return {
    headline,
    headlineOptions: [opt1, opt2, opt3],
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary,
    category,
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName,
    speakerTitle,
    isLocalFallback: true,
  };
}
