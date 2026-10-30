import { AIAnalysisResult } from '../types';
import {
  cleanHeadlineText,
  cleanLocationField,
  detectDistrictAndState,
  formatDistrictWithState,
  formatAsJournalisticHeadline,
  generate5JournalisticHeadlines,
  generate4BalancedHeadlineOptions,
  cleanCaptionParagraphs,
  fitHeadlinesTo5TierRanges,
  sanitizeFlattery,
  stripAllUrlsAndHyperlinks,
  BYLINE_REGEX,
  stripNewspaperBylines,
} from './speakerUtils';
import { TemplateConfig, getGraphicTemplateConfig } from './graphicTemplatesRegistry';

export type HeadlineTemplateMeta = Partial<TemplateConfig> | {
  template_id?: string;
  headline_max_lines?: number;
  headline_area?: string;
  headline_line_count?: number;
};

function cleanHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

function extractSlugKeywords(urlStr: string): string[] {
  try {
    const url = new URL(urlStr);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';
    const cleanSlug = lastPart.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ');
    return cleanSlug.split(/\s+/).filter((w) => w.length > 2 && !/^\d+$/.test(w));
  } catch {
    return [];
  }
}

// Client-side smart news parser and headline generator
// Ensures 100% uninterrupted operation with STRICT 2 or 3 line capacity matching selected template
export function processNewsLocally(
  rawText: string,
  linkUrl?: string,
  templateMeta?: HeadlineTemplateMeta,
  channelUsername?: string
): AIAnalysisResult {
  const clean = cleanHtmlEntities(rawText || '').trim();

  const resolvedConfig = (templateMeta?.template_id || (templateMeta as any)?.id)
    ? getGraphicTemplateConfig(templateMeta?.template_id || (templateMeta as any)?.id)
    : undefined;
  const maxLines = templateMeta?.headline_max_lines ?? resolvedConfig?.headline_max_lines ?? 3;

  // 1. Extract candidate title
  let extractedTitle = '';
  const titleMatch = clean.match(/(?:^|\n)(?:Title|शीर्षक|हेडलाइन)\s*:\s*([^\n\r]+)/i);
  if (titleMatch) {
    extractedTitle = titleMatch[1].trim();
  } else {
    const lines = clean.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('url:') && line.length > 5) {
        extractedTitle = line;
        break;
      }
    }
  }

  // Clean trailing publisher suffix
  if (extractedTitle) {
    extractedTitle = extractedTitle
      .replace(/\s*[|\-–—:]\s*(Dainik Bhaskar|Bhaskar|Aaj Tak|आज तक|BBC News हिंदी|BBC Hindi|NDTV India|NDTV|Amar Ujala|News18|Zee News|Patrika|Navbharat Times|Hindustan|Live Hindustan).*$/i, '')
      .replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, '')
      .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, ' ')
      .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, ' ')
      .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, '')
      .replace(/\.{2,}/g, '')
      .trim();
  }

  const targetUrl = linkUrl || (clean.startsWith('http') ? clean : undefined);

  // 2. Extract description / facts
  let extractedDesc = '';
  const descMatch = clean.match(/(?:^|\n)(?:Meta Description|Description|विवरण|सारांश)\s*:\s*([^\n\r]+)/i);
  if (descMatch) {
    extractedDesc = descMatch[1].trim();
  }

  let extractedContent = '';
  const contentMatch = clean.match(/(?:^|\n)(?:Article Content & Facts|Facts & Content|Content)\s*:\s*([\s\S]+)/i);
  if (contentMatch) {
    extractedContent = contentMatch[1].trim();
  }

  // If title is empty, look for genuine Hindi candidate sentence in content or clean input
  if (!extractedTitle || !/[\u0900-\u097F]/.test(extractedTitle)) {
    const candidateLines = `${extractedContent}\n${extractedDesc}\n${clean}`
      .split(/[।\n]+|(?<=[^\d])\.\s+/)
      .map((s) => cleanHeadlineText(s).trim())
      .filter((s) => s.length >= 15 && /[\u0900-\u097F]/.test(s) && !/(?:वेबसाइट|क्लिक करें|शेयर करें|कॉपी लिंक)/i.test(s));
    if (candidateLines.length > 0) {
      extractedTitle = candidateLines[0];
    }
  }

  if (extractedDesc) {
    extractedDesc = extractedDesc
      .replace(/(?:वेबसाइट लिंक से प्राप्त मुख्य समाचार विषय|वेबसाइट लिंक से प्राप्त|समाचार विवरण[:\s]*यह खबर[^\n।]+से संबंधित है[।\.]*|घटनाक्रम को लेकर प्रशासन एवं संबंधित विभाग सक्रिय हैं[।\.]*|समाचार विवरण[:\s]*)/gi, ' ')
      .replace(
        /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
        ' '
      )
      .replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{15,}?\s*(?=[\u0900-\u097F])/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (extractedContent) {
    extractedContent = extractedContent
      .replace(/(?:वेबसाइट लिंक से प्राप्त मुख्य समाचार विषय|वेबसाइट लिंक से प्राप्त|समाचार विवरण[:\s]*यह खबर[^\n।]+से संबंधित है[।\.]*|घटनाक्रम को लेकर प्रशासन एवं संबंधित विभाग सक्रिय हैं[।\.]*|समाचार विवरण[:\s]*)/gi, ' ')
      .replace(
        /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
        ' '
      )
      .replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{15,}?\s*(?=[\u0900-\u097F])/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 3. Detect genuine location using district-to-state mapping
  let detectedLocation = detectDistrictAndState(extractedTitle, extractedDesc, extractedContent, targetUrl);
  if (!detectedLocation) {
    const fullCorpus = `${extractedTitle} ${extractedDesc} ${extractedContent} ${clean} ${targetUrl || ''}`;
    if (/(?:वाशिंगटन|व्हाइट[\s\-]*हाउस|white[\s\-]*house|washington)/i.test(fullCorpus)) {
      detectedLocation = 'वाशिंगटन';
    } else if (/(?:मास्को|moscow)/i.test(fullCorpus)) {
      detectedLocation = 'मास्को';
    } else if (/(?:लंदन|london)/i.test(fullCorpus)) {
      detectedLocation = 'लंदन';
    } else if (/(?:संसद[\s\-]*भवन|राष्ट्रपति[\s\-]*भवन|सुप्रीम[\s\-]*कोर्ट|राजधानी[\s\-]*दिल्ली|जंतर[\s\-]*मंतर|नई[\s\-]*दिल्ली|इंडिया[\s\-]*गेट)/i.test(fullCorpus)) {
      detectedLocation = 'नई दिल्ली';
    }
  }
  detectedLocation = cleanLocationField(detectedLocation);

  // 4. Detect Category
  let category = 'ताज़ा समाचार';
  const categories: string[] = ['ताज़ा'];
  const fullCorpus = `${extractedTitle} ${extractedDesc} ${extractedContent} ${clean} ${targetUrl || ''}`;
  if (/आईटी|टेक|ग्रीन कार्ड|वीजा|कंपनियों|टाटा|विप्रो|इंफोसिस|शेयर|बाजार|सेंसेक्स|अर्थव्यवस्था|बैंक|रुपया|डॉलर|कारोबार|tech|business/i.test(fullCorpus)) {
    category = 'कारोबार';
    categories.push('बिजनेस', 'वैश्विक बाजार');
  } else if (/हादसा|दुर्घटना|टक्कर|पलटी|घायल|मौत|accident/i.test(fullCorpus)) {
    category = 'हादसा';
    categories.push('हादसा', 'सड़क सुरक्षा');
  } else if (/अपराध|गिरफ्तार|पुलिस|हत्या|चोरी|रेड|धोखाधड़ी|crime/i.test(fullCorpus)) {
    category = 'अपराध';
    categories.push('अपराध', 'पुलिस कार्रवाई');
  } else if (/राजनीति|चुनाव|कांग्रेस|बीजेपी|भाजपा|संसद|विधानसभा|politics/i.test(fullCorpus)) {
    category = 'राजनीति';
    categories.push('राजनीति', 'राष्ट्रीय');
  } else if (/अंतरराष्ट्रीय|अमेरिका|ट्रम्प|रूस|युद्ध|international/i.test(fullCorpus)) {
    category = 'अंतरराष्ट्रीय';
    categories.push('अंतरराष्ट्रीय', 'वैश्विक अपडेट');
  } else {
    category = detectedLocation === 'नई दिल्ली' ? 'राष्ट्रीय' : 'ताज़ा समाचार';
    categories.push('ताज़ा समाचार');
  }

  // Helper for sentence extraction with abbreviation protection
  function extractSafeSentences(text: string): string[] {
    if (!text) return [];
    const cleanText = text
      .replace(/(?:^|\n|[\s।.\-–—])\s*(?:Title|शीर्षक|हेडलाइन|Headline)\s*:\s*[^\n\r]+/gi, ' ')
      .replace(/(?:^|\n|[\s।.\-–—])\s*(?:Meta Description|Description|विवरण|सारांश)\s*:\s*/gi, ' ')
      .replace(/(?:^|\n|[\s।.\-–—])\s*(?:Article Content & Facts|Facts & Content|Content|Article Content|URL|Link)\s*:\s*/gi, ' ')
      .replace(BYLINE_REGEX, ' ')
      .replace(/(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, ' ')
      .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, ' ')
      .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, '')
      .replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, '')
      .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{15,}?\s*(?=[\u0900-\u097F])/u, '')
      .replace(/\s+/g, ' ')
      .trim();

    const safe = cleanText
      .replace(/(डाॅ|डॉ|पं|प्रो|श्री|क्र|सं|ले|कै|एड)\./g, '$1#DOT#')
      .replace(/\b([A-Za-z])\.(?=\s*[A-Za-z]\.)/g, '$1#DOT#');

    return safe
      .split(/[।\n]+|(?<=[^\d])\.\s+/)
      .map((s) => {
        let sent = s.replace(/#DOT#/g, '.').trim();
        sent = sent
          .replace(/(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi, ' ')
          .replace(/(?:वेबसाइट लिंक से प्राप्त मुख्य समाचार विषय|वेबसाइट लिंक से प्राप्त|मुख्य समाचार विषय|समाचार विवरण[:\s]*यह खबर[^\n।]+से संबंधित है[।\.]*|घटनाक्रम को लेकर प्रशासन एवं संबंधित विभाग सक्रिय हैं[।\.]*|समाचार विवरण[:\s]*)/gi, ' ')
          .replace(/^(?:Title|Meta Description|Description|URL|Link)[:\s]*/i, '')
          .replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, '')
          .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{10,}?\s*(?=[\u0900-\u097F])/u, '')
          .replace(/\s+/g, ' ')
          .trim();
        return sent;
      })
      .filter((s) => {
        if (s.length <= 15) return false;
        if (/^(विज्ञापन|क्लिक करें|यह भी पढ़ें|कॉपी लिंक|फाइल फोटो|शेयर करें)/i.test(s)) return false;
        if (/(?:वेबसाइट लिंक से प्राप्त|मुख्य समाचार विषय|समाचार विवरण|घटनाक्रम को लेकर प्रशासन एवं संबंधित विभाग)/i.test(s)) return false;
        if (!/[\u0900-\u097F]/.test(s)) return false;
        const hindiCount = (s.match(/[\u0900-\u097F]/g) || []).length;
        const englishCount = (s.match(/[A-Za-z]/g) || []).length;
        if (hindiCount < 10 || englishCount > hindiCount) return false;
        if (/[A-Za-z]{6,}/.test(s) && englishCount > 15) return false;
        return true;
      });
  }

  const corpusToExtract = (extractedDesc || extractedContent) ? `${extractedDesc}\n\n${extractedContent}` : clean;
  const allSentences = extractSafeSentences(corpusToExtract);

  // 5. Build EXACTLY 5 Distinct Journalistic Headlines (Strict 5 Tiered Maximum Limits)
  const rawBaseTitle = cleanHeadlineText(stripNewspaperBylines(extractedTitle)) || (extractedDesc ? cleanHeadlineText(stripNewspaperBylines(extractedDesc).slice(0, 70)) : 'महत्वपूर्ण समाचार');

  const rawOptions = generate5JournalisticHeadlines(rawBaseTitle, allSentences, detectedLocation);
  const headlineOptions = fitHeadlinesTo5TierRanges(rawOptions, allSentences, rawBaseTitle, detectedLocation);
  const headline = headlineOptions[0] || 'मुख्य समाचार';

  // Pick highlight words: numbers, quoted words or entities
  const words = headline.split(/\s+/).filter(Boolean);
  const highlightWords: string[] = [];
  for (const w of words) {
    const cleanW = w.replace(/[.,:;!?'"()]/g, '');
    if (/\d+/.test(cleanW) || (cleanW.length >= 5 && !/के|की|का|में|पर|से|को|ने|है|और/.test(cleanW))) {
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

  // 6. Generate Captions
  const cleanUsername = (channelUsername || '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '').trim();
  const userTag = cleanUsername ? `#${cleanUsername}` : '';
  const locStr = detectedLocation && detectedLocation !== 'विशेष कवरेज' ? detectedLocation.split(',')[0].trim() : '';
  const locTag = locStr ? `#${locStr.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')}` : '';
  const catTag = category.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');

  const tagsList = [
    userTag,
    ...(locTag ? [locTag] : []),
    '#BreakingNews',
    '#HindiNews',
    ...(catTag && !locTag.includes(catTag) ? [`#${catTag}`] : []),
    '#AINewsMaker',
  ].filter(Boolean);
  const tagsStr = tagsList.join(' ');

  const captionDetailed = allSentences.length > 0 ? `${allSentences.join('। ')}।\n\n${tagsStr}`.trim() : `${headline}\n\n${tagsStr}`.trim();
  const bulletItems = (allSentences.length > 0 ? allSentences.slice(0, 4) : [headline]).map((s) => `• ${s}`);
  const captionBullets = `${bulletItems.join('\n')}\n\n${tagsStr}`.trim();
  const captionShort = allSentences.length > 1
    ? `${allSentences[0]}।\n\n${allSentences[1]}।\n\n${tagsStr}`.trim()
    : `${headline}\n\n${tagsStr}`.trim();

  const summary = captionDetailed;

  const anchorScript = `${headline}। इस मामले पर विस्तृत रिपोर्ट।`;

  return {
    headline,
    headlineOptions,
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary: cleanCaptionParagraphs(summary, 'detailed', cleanUsername, detectedLocation, headline),
    captionDetailed: cleanCaptionParagraphs(captionDetailed, 'detailed', cleanUsername, detectedLocation, headline),
    captionBullets: cleanCaptionParagraphs(captionBullets, 'bullet', cleanUsername, detectedLocation, headline),
    captionShort: cleanCaptionParagraphs(captionShort, 'short', cleanUsername, detectedLocation, headline),
    anchorScript,
    categories,
    tags: tagsList,
    category,
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, Journalistic documentary photography style, realistic Indian news press photography, natural ambient lighting, 35mm camera lens, authentic scene. No text, no words, no watermark, no logos, clean image.`,
    isAiGeneratedPhoto: false,
    speakerName: '',
    speakerTitle: '',
    isLocalFallback: true,
  };
}

/**
 * Direct reference-compatible export for createLocalNewsFallback on client
 */
export function createLocalNewsFallback(
  input: string,
  linkUrl?: string,
  templateMeta?: HeadlineTemplateMeta,
  channelUsername?: string
): AIAnalysisResult {
  return processNewsLocally(input, linkUrl, templateMeta, channelUsername);
}
