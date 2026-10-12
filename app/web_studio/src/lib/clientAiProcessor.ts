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

  // Reject URL strings or slugs as headline - URL is NEVER a headline
  const isUrlLike = (txt: string) => {
    const l = txt.toLowerCase();
    return l.startsWith('http://') || l.startsWith('https://') || l.startsWith('www.') ||
      l.includes('http://') || l.includes('https://') || l.includes('.com') || l.includes('.in') ||
      l.includes('.org') || l.includes('url:') || l.includes('url to reference');
  };

  if (isUrlLike(rawHeadline)) {
    rawHeadline = detectedLocation !== 'मध्य प्रदेश'
      ? `${detectedLocation}: मामले में प्रशासन का बड़ा एक्शन, निष्पक्ष जांच के आदेश जारी`
      : 'प्रशासनिक कार्रवाई से क्षेत्र में मचा हड़कंप, निष्पक्ष जांच के आदेश';
  }

  // Enforce STRICT 2 or 3 line capacity
  // 2-line capacity: maximum ~10 words, concise, high-impact news fact
  // 3-line capacity: maximum ~16 words, clear, impactful
  const words = rawHeadline.split(/\s+/).filter(Boolean);
  const maxWords = maxLines === 2 ? 10 : 16;
  let headline = words.length > maxWords ? words.slice(0, maxWords).join(' ') : rawHeadline;
  headline = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();

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

  // Generate 4 strict template-compliant headline options (12-22 words, natural Hindi, no trailing period)
  const opt1 = headline;
  const opt2 = `${detectedLocation}: प्रशासनिक अमले ने लिया त्वरित संज्ञान, जांच शुरू`;
  const opt3 = `बड़ा एक्शन: ${detectedLocation} में मामले को लेकर प्रशासन सख्त`;
  const opt4 = `ग्राउंड रिपोर्ट: घटनाक्रम को लेकर आमजन में आक्रोश, निष्पक्ष कार्रवाई की मांग`;
  const headlineOptions = [opt1, opt2, opt3, opt4].map((h) => h.replace(/[।\.\,\!\?\:\-]+$/g, '').trim());

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

  // Detect Category and Categories array
  let category = 'ताज़ा ख़बर';
  const categories: string[] = ['ताज़ा'];
  if (/हादसा|दुर्घटना|टक्कर|पलटी|घायल|मौत/.test(clean)) {
    category = 'हादसा';
    categories.push('हादसा', 'सड़क सुरक्षा');
  } else if (/अपराध|गिरफ्तार|पुलिस|हत्या|चोरी|रेड/.test(clean)) {
    category = 'क्राइम';
    categories.push('अपराध', 'पुलिस कार्रवाई');
  } else if (/राजनीति|चुनाव|कांग्रेस|बीजेपी|भाजपा|संसद|विधानसभा/.test(clean)) {
    category = 'सियासत';
    categories.push('राजनीति', 'विधानसभा');
  } else if (/मौसम|बारिश|ओलावृष्टि|ठंड|गर्मी/.test(clean)) {
    category = 'मौसम';
    categories.push('मौसम अपडेट', 'पर्यावरण');
  } else if (/विकास|योजना|सड़क|पुल|उद्घाटन|बजट/.test(clean)) {
    category = 'विकास';
    categories.push('विकास कार्य', 'सरकारी योजना');
  } else {
    categories.push('राष्ट्रीय', 'मध्य प्रदेश');
  }
  if (detectedLocation && !categories.includes(detectedLocation)) {
    categories.push(detectedLocation);
  }

  // Hashtag hierarchy: 1st: #${username}, Middle: topics/location, Last: #AINewsMaker
  const cleanUsername = (channelUsername || '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '').trim();
  const userTag = cleanUsername ? `#${cleanUsername}` : '#AINews';

  const tags = [
    userTag,
    `#${locTag}News`,
    '#BreakingNews',
    '#HindiNews',
    `#${category.replace(/\s+/g, '')}`,
    '#AINewsMaker',
  ];

  // Professional Hindi TV News Anchor Script
  const anchorScript = `नमस्कार, मैं एआई न्यूज़ से। इस समय की बड़ी और महत्वपूर्ण खबर ${detectedLocation} से सामने आ रही है। ${headline}। प्रशासनिक अधिकारियों और संबंधित विभाग ने इस मामले में तत्काल संज्ञान लेते हुए आवश्यक दिशा-निर्देश जारी किए हैं। आइए देखते हैं इस पूरे घटनाक्रम पर ग्राउंड रिपोर्ट।`;

  const summaryPara1 = `${headline} को लेकर बड़ी और महत्वपूर्ण खबर सामने आई है। ${detectedLocation} में इस पूरे घटनाक्रम के बाद प्रशासनिक व संबंधित विभागों में हलचल तेज हो गई है।`;
  const summaryPara2 = `प्राप्त जानकारी के अनुसार मामले की पृष्ठभूमि में कई अहम तथ्य और कारण सामने आ रहे हैं। प्रत्यक्षदर्शियों व सूत्रों के अनुसार इस घटनाक्रम से जनजीवन व क्षेत्र में व्यापक चर्चा है तथा तथ्यों की गहराई से पड़ताल की जा रही है।`;
  const summaryPara3 = `पुलिस व प्रशासन की ओर से त्वरित संज्ञान लेते हुए आवश्यक दिशा-निर्देश जारी कर दिए गए हैं। स्थिति पर लगातार नजर रखी जा रही है और अग्रिम वैधानिक प्रक्रिया अमल में लाई जा रही है।`;

  const summary = `${summaryPara1}\n\n${summaryPara2}\n\n${summaryPara3}\n\n${tags.join(' ')}`;

  return {
    headline: headlineOptions[0],
    headlineOptions,
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary,
    anchorScript,
    categories,
    tags,
    category,
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName,
    speakerTitle,
    isLocalFallback: true,
  };
}
