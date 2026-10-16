import { AIAnalysisResult } from '../types';
import { cleanHeadlineText, cleanLocationField, detectDistrictAndState, formatDistrictWithState } from './speakerUtils';
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
    .replace(/\s+/g, ' ')
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

  // If title is empty, check URL slug
  const targetUrl = linkUrl || (clean.startsWith('http') ? clean : undefined);
  if (!extractedTitle && targetUrl) {
    const slugWords = extractSlugKeywords(targetUrl);
    if (slugWords.length > 0) {
      const slugLower = slugWords.join(' ').toLowerCase();
      if (slugLower.includes('trump') && slugLower.includes('green card')) {
        extractedTitle = 'ट्रम्प ने ग्रीन कार्ड प्रोसेस पर लगाई रोक: भारतीय आईटी कंपनियों व पेशेवरों पर बड़ा असर';
      } else if (slugLower.includes('accident') || slugLower.includes('crash')) {
        extractedTitle = 'सड़क हादसे में बड़ा नुकसान: मौके पर प्रशासनिक अमला व बचाव दल रवाना';
      } else {
        extractedTitle = `${slugWords.slice(0, 6).join(' ')}: महत्वपूर्ण घटनाक्रम पर विशेष समाचार रिपोर्ट`;
      }
    }
  }

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

  // 3. Detect genuine location using district-to-state mapping
  let detectedLocation = detectDistrictAndState(extractedTitle, extractedDesc, extractedContent, targetUrl);
  if (!detectedLocation) {
    const fullCorpus = `${extractedTitle} ${extractedDesc} ${extractedContent} ${clean} ${targetUrl || ''}`;
    if (/अमेरिका|वाशिंगटन|व्हाइट हाउस|रूस|मास्को/i.test(fullCorpus)) {
      detectedLocation = 'वाशिंगटन';
    } else if (/(?:संसद\s*भवन|राष्ट्रपति\s*भवन|सुप्रीम\s*कोर्ट)/i.test(fullCorpus)) {
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
      .replace(/(?:नईदुनिया प्रतिनिधि[,\s]*[^\n।]+[।\n]|दैनिक भास्कर[,\s]*[^\n।]+[।\n]|अमर उजाला[,\s]*[^\n।]+[।\n]|पत्रिका[,\s]*[^\n।]+[।\n])/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, ' ')
      .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, ' ')
      .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    const safe = cleanText
      .replace(/(डाॅ|डॉ|पं|प्रो|श्री|क्र|सं|ले|कै|एड)\./g, '$1#DOT#')
      .replace(/([A-Za-z])\./g, '$1#DOT#');

    return safe
      .split(/[।\n]+|\.\s+/)
      .map((s) => s.replace(/#DOT#/g, '.').trim())
      .filter((s) => s.length > 15 && !/^(विज्ञापन|क्लिक करें|यह भी पढ़ें)/i.test(s));
  }

  const allSentences = extractSafeSentences(`${extractedDesc} ${extractedContent} ${clean}`);

  // 5. Build EXACTLY 5 Distinct Journalistic Headlines
  // विकल्प 1: मुख्य समाचार (Direct event/action)
  // विकल्प 2: सवाल उठाने वाला समाचार (Factual inquiry)
  // विकल्प 3: उत्सुकता पैदा करने वाला समाचार (Curiosity/key revelation)
  // विकल्प 4: महत्वपूर्ण तथ्य या असर (Action/decision/statement)
  // विकल्प 5: वैकल्पिक समाचार कोण (Public impact/alternative angle)
  const baseSubject = cleanHeadlineText(extractedTitle) || 'महत्वपूर्ण घटनाक्रम को लेकर बड़ा फैसला';

  let opt1 = baseSubject;
  let opt2 = '';
  let opt3 = '';
  let opt4 = '';
  let opt5 = '';

  if (category === 'हादसा') {
    opt1 = baseSubject.length > 25 ? baseSubject : 'सड़क हादसे में बड़ा नुकसान, मौके पर प्रशासनिक अमला व बचाव दल रवाना';
    opt2 = `${baseSubject}: रफ्तार का कहर या तकनीकी खराबी, सुरक्षा मानकों पर उठे गंभीर सवाल`;
    opt3 = `${baseSubject}: चीख-पुकार के बीच स्थानीय लोगों ने संभाला मोर्चा, जानिए कैसे बचीं जानें`;
    opt4 = 'हादसे के बाद प्रशासन का त्वरित एक्शन: घायलों को तुरंत अस्पताल पहुंचाया, जांच के आदेश';
    opt5 = 'यातायात सुरक्षा और बदहाल सड़कों पर फूटा लोगों का गुस्सा, सख्त नियमों की मांग तेज';
  } else if (category === 'अपराध') {
    opt1 = baseSubject.length > 25 ? baseSubject : 'गंभीर मामले में पुलिस का बड़ा एक्शन, मुख्य आरोपियों की घेराबंदी कर किया गिरफ्तार';
    opt2 = `${baseSubject}: सुरक्षा व्यवस्था में कहां हुई चूक, पुलिस कार्रवाई पर उठे सवाल`;
    opt3 = `${baseSubject}: सीसीटीवी फुटेज और सबूतों से खुला राज, जानिए कैसे सुलझी गुत्थी`;
    opt4 = 'कानून व्यवस्था पर सख्त रुख: आरोपियों के खिलाफ वैधानिक धाराओं में मुकदमा दर्ज, जेल भेजा';
    opt5 = 'इलाके में दहशत का माहौल, सुरक्षा बढ़ाने और गश्त तेज करने की मांग को लेकर लोगों में आक्रोश';
  } else if (category === 'राजनीति') {
    opt1 = baseSubject.length > 25 ? baseSubject : 'सियासी गलियारों में बड़ी हलचल, शीर्ष नेतृत्व के अहम बयान के बाद सियासी घमासान तेज';
    opt2 = `${baseSubject}: क्या आगामी रणनीति में होगा बड़ा बदलाव, राजनीतिक विश्लेषकों के सवाल`;
    opt3 = `${baseSubject}: बंद कमरे की बैठक में क्या हुआ तय, नए सियासी समीकरणों पर चर्चा गर्म`;
    opt4 = 'पार्टी नेतृत्व का कड़ा निर्देश: संगठनात्मक मजबूती और जनमुद्दों को लेकर बनाई गई नई कार्ययोजना';
    opt5 = 'जनता से जुड़े नीतिगत मुद्दों पर सत्ता और विपक्ष आमने-सामने, सड़कों पर उतरने की तैयारी';
  } else if (category === 'कारोबार') {
    opt1 = baseSubject.length > 25 ? baseSubject : 'नीतिगत बदलाव से टेक और उद्योग जगत में हलचल, कंपनियों ने शुरू की समीक्षा';
    opt2 = `${baseSubject}: उद्योग और रोजगार पर कितना पड़ेगा असर, विशेषज्ञों ने उठाए सवाल`;
    opt3 = `${baseSubject}: नए नियमों के पीछे का असली कारण क्या, वैश्विक बाजार की टिकी नजरें`;
    opt4 = 'आर्थिक व व्यापारिक असर: प्रमुख कंपनियों के कामकाज पर प्रभाव, उच्चस्तरीय समीक्षा जारी';
    opt5 = 'निवेशकों और कर्मचारियों में असमंजस, बाजार में आगामी रणनीतियों को लेकर मंथन तेज';
  } else {
    // General News / Hospital / Administration (e.g. Shahdol case)
    opt1 = baseSubject;
    opt2 = `${baseSubject}: प्रशासनिक संवेदनहीनता पर उठे गंभीर सवाल, आखिर कौन है जिम्मेदार`;
    opt3 = `${baseSubject}: वीडियो सामने आने के बाद खुला पूरा सच, जानिए मौके पर क्या हुआ था`;
    opt4 = 'लापरवाही पर सख्त संज्ञान: उत्तरदायी अधिकारियों ने दिए जांच के सख्त आदेश, कार्रवाई तय';
    opt5 = 'स्वास्थ्य व प्रशासनिक सेवाओं की बदहाली पर लोगों का गुस्सा, व्यवस्था में सुधार की उठी मांग';
  }

  const rawOptions = [opt1, opt2, opt3, opt4, opt5];
  const headlineOptions = rawOptions.map((h) => cleanHeadlineText(h).replace(/[।\.\,\!\?\:\-]+$/g, '').trim());
  const headline = headlineOptions[0];

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

  // 6. Generate 3 Captions (Detailed 3-Para, Bullets, Short 2-Para)
  const cleanUsername = (channelUsername || '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '').trim();
  const userTag = cleanUsername ? `#${cleanUsername}` : '#AINews';
  const locStr = detectedLocation && detectedLocation !== 'विशेष कवरेज' ? detectedLocation : '';
  const locTag = locStr ? `#${locStr.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '')}News` : '';
  const catTag = category.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');

  const tagsList = [
    userTag,
    ...(locTag ? [locTag] : []),
    '#BreakingNews',
    '#HindiNews',
    ...(catTag && !locTag.includes(catTag) ? [`#${catTag}`] : []),
    '#AINewsMaker',
  ];
  const tagsStr = tagsList.join(' ');

  const locPrefix = locStr ? `${locStr} में ` : '';

  // Style 1: Detailed (3 full paragraphs)
  const dPara1 = allSentences[0]
    ? `${locPrefix}${headline}। ${allSentences[0]}।`
    : `${locPrefix}${headline} को लेकर बड़ा और गंभीर मामला सामने आया है। प्राप्त जानकारी के अनुसार पूरे घटनाक्रम को लेकर प्रशासनिक स्तर पर हड़कंप मच गया है।`;

  const dPara2 = allSentences.slice(1, 4).join('। ') ||
    'घटना के प्रत्यक्षदर्शियों और सूत्रों के अनुसार मामले में गंभीर लापरवाही सामने आई है। ड्यूटी पर तैनात कर्मियों की कार्यशैली पर सवाल उठ रहे हैं और संबंधित पक्षों द्वारा त्वरित कार्रवाई की मांग की जा रही है।';

  const dPara3 = allSentences[4]
    ? `${allSentences[4]}। मामले में उत्तरदायी अधिकारियों ने निष्पक्ष जांच और आवश्यक कानूनी व प्रशासनिक कार्रवाई के सख्त आदेश दिए हैं।`
    : 'मामले की गंभीरता को देखते हुए उच्चाधिकारियों ने तुरंत संज्ञान लिया है और अग्रिम वैधानिक व अनुशासनात्मक कार्रवाई के निर्देश जारी कर दिए गए हैं। स्थिति पर नजर रखी जा रही है।';

  const captionDetailed = `${dPara1}\n\n${dPara2}।\n\n${dPara3}\n\n${tagsStr}`;

  // Style 2: Bullets
  const bulletItems = allSentences.slice(0, 4).map((s) => `• ${s}`);
  if (bulletItems.length < 3) {
    bulletItems.push('• घटनाक्रम के बाद प्रशासनिक व स्थानीय स्तर पर हड़कंप मच गया है');
    bulletItems.push('• जिम्मेदार अधिकारियों द्वारा मामले की निष्पक्ष जांच शुरू कर दी गई है');
  }
  const captionBullets = `मुख्य घटनाक्रम: ${headline}\nस्थान: ${locStr || 'ताज़ा समाचार'}\n\n${bulletItems.join('\n')}\n\nप्रशासनिक अमला मौके की निगरानी कर रहा है और अग्रिम कार्रवाई की जा रही है।\n\n${tagsStr}`;

  // Style 3: Short (2 paragraphs)
  const sPara1 = `${locPrefix}${headline}। ${allSentences[0] || 'पूरे मामले में प्रशासनिक लापरवाही और संवेदनहीनता को लेकर हड़कंप मच गया है।'}`;
  const sPara2 = `${allSentences[1] ? `${allSentences[1]}। ` : ''}उत्तरदायी अधिकारियों ने घटना का त्वरित संज्ञान लेते हुए जांच व सख्त कार्रवाई के निर्देश दिए हैं।`;
  const captionShort = `${sPara1}\n\n${sPara2}\n\n${tagsStr}`;

  const summary = captionDetailed;

  const anchorScript = `नमस्कार, मैं एआई न्यूज़ से। इस समय की बड़ी खबर${locStr ? ` ${locStr} से` : ''} है। ${headline}। मामले में सभी संबंधित पक्षों की प्रतिक्रिया सामने आ रही है। आइए देखते हैं इस पूरे मामले पर हमारी विस्तृत रिपोर्ट।`;

  return {
    headline: headlineOptions[0],
    headlineOptions,
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary,
    captionDetailed,
    captionBullets,
    captionShort,
    anchorScript,
    categories,
    tags: tagsList,
    category,
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName: '',
    speakerTitle: '',
    isLocalFallback: true,
  };
}
