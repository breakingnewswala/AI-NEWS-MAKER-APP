// Helper utilities to detect and extract leader names and designations from Hindi news headlines

/**
 * Professional News Headline Formatter:
 * - Strips UI loading/processing text like "लोड हो रहा है", "Loading...", "Please wait"
 * - Removes starting fluff like "यह खबर है", "जानिए", "देखिए", "Breaking News:", "ब्रेकिंग न्यूज़:"
 * - Strips accidental location or category tags prepended or appended to headlines (e.g. "नई दिल्ली / राष्ट्रीय:")
 * - Strips trailing punctuation like "." or "।" or commas or colons
 * - Cleans up multiple spaces
 */
export function cleanHeadlineText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove UI status / loading text
  cleaned = cleaned
    .replace(/(?:लोड हो रहा है[\s\.]*)+/gi, '')
    .replace(/(?:loading[\s\.]*)+/gi, '')
    .replace(/(?:please wait[\s\.]*)+/gi, '')
    .replace(/(?:generating[\s\.]*)+/gi, '')
    .replace(/(?:ai is processing[\s\.]*)+/gi, '');

  // 2. Remove scraping artifacts & interactive website buttons
  cleaned = cleaned.replace(
    /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
    ' '
  );

  // 3. Remove publisher, portal, city-news suffixes (e.g. "- Bhopal News", "Bhopal News", "Dainik Bhaskar")
  cleaned = cleaned
    .replace(
      /\s*(?:[|\-–—:,]\s*)?(?:(?:Bhopal|Indore|Dewas|Jabalpur|Gwalior|Ujjain|Raipur|Jaipur|Lucknow|Delhi|Patna|MP|UP|National|State|City|Local)\s*News|News\s*Update[s]?|Latest\s*News|Latest\s*Update[s]?|Breaking\s*News|Dainik\s*Bhaskar|Bhaskar|Aaj\s*Tak|NDTV(?:\s*India)?|Amar\s*Ujala|News18|Zee\s*News|Patrika|Navbharat(?:\s*Times)?|Hindustan|Live\s*Hindustan|Oneindia|ABP\s*News|Dainik\s*Jagran|Jagran|TV9)\b.*$/i,
      ''
    )
    .replace(
      /\s*(?:[|\-–—:,]\s*)?(?:भोपाल\s*न्यूज़|इंदौर\s*न्यूज़|देवास\s*न्यूज़|जबलपुर\s*न्यूज़|ग्वालियर\s*न्यूज़|एमपी\s*न्यूज़|दैनिक\s*भास्कर|भास्कर|आज\s*तक|अमर\s*उजाला|पत्रिका|नवभारत(?:\s*टाइम्स)?|एनडीटीवी|बीबीसी\s*हिंदी|ताज़ा\s*अपडेट|लेटेस्ट\s*अपडेट|बड़ी\s*खबर).*$/i,
      ''
    )
    .replace(/\s*[|\-–—:]\s*[A-Za-z\s]{3,30}$/, '')
    .trim();

  // 4. Remove editorial fluff prefixes and option labels
  cleaned = cleaned
    .replace(
      /^(?:विकल्प|ऑप्शन|Option|Angle)\s*\d+[\s:\-–—.]*\s*/i,
      ''
    )
    .replace(/^\d+[\.:\)\-–—]+\s*(?=[\u0900-\u097F])/u, '')
    .replace(
      /^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|प्रेस नोट|प्रेस विज्ञप्ति|यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*[:\-–—]?\s*/i,
      ''
    )
    .replace(/^[\s:\-–—,;।.]+/g, '')
    .trim();

  // 5. Remove prepended location or category label tags with colons/hyphens
  cleaned = cleaned
    .replace(
      /^(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|नई\s*दिल्ली|भोपाल|इंदौर|रीवा|जबलपुर|ग्वालियर|लखनऊ|पटना|जयपुर|रायपुर|वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय|विदेश|अपराध|क्राइम|सियासत|राजनीति|हादसा|प्रशासन|विकास|बिजनेस|कारोबार|विशेष\s*कवरेज|ताज़ा\s*समाचार|ताज़ा\s*ख़बर)\s*[:\-–—]\s*/i,
      ''
    )
    .trim();

  // 6. Remove appended category/location tags at the end of headlines
  cleaned = cleaned
    .replace(
      /\s*[:\-–—]?\s*(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय)$/i,
      ''
    )
    .trim();

  // 7. Strip URLs, domain names, social handles, hashtags
  cleaned = cleaned
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\b[a-zA-Z0-9.\-]+\.(?:com|in|org|net|co|io)\b/gi, '')
    .replace(/#[\w\u0900-\u097F]+/g, '')
    .replace(/@[\w\u0900-\u097F]+/g, '');

  // 8. Transliterate common abbreviations and acronyms into Devanagari Hindi
  const acronyms: [RegExp, string][] = [
    [/\bAI\b/g, 'एआई'],
    [/\bISRO\b/g, 'इसरो'],
    [/\bNASA\b/g, 'नासा'],
    [/\bFIR\b/g, 'एफआईआर'],
    [/\bIT\b/g, 'आईटी'],
    [/\bOPD\b/g, 'ओपीडी'],
    [/\bVIP\b/g, 'वीआईपी'],
    [/\bBJP\b/g, 'बीजेपी'],
    [/\bPM\b/g, 'पीएम'],
    [/\bCM\b/g, 'सीएम'],
    [/\bDM\b/g, 'डीएम'],
    [/\bSP\b/g, 'एसपी'],
    [/\bSDM\b/g, 'एसडीएम'],
    [/\bBHK\b/g, 'बीएचके'],
    [/\bGST\b/g, 'जीएसटी'],
    [/\bCBI\b/g, 'सीबीआई'],
    [/\bED\b/g, 'ईडी'],
    [/\bNIA\b/g, 'एनआईए'],
    [/\bICU\b/g, 'आईसीयू'],
    [/\bMP\b/g, 'एमपी'],
    [/\bUP\b/g, 'यूपी'],
    [/\bUSA\b/g, 'यूएसए'],
    [/\bUK\b/g, 'यूके'],
    [/\bCEO\b/g, 'सीईओ'],
    [/\bRBI\b/g, 'आरबीआई'],
    [/\bSBI\b/g, 'एसबीआई'],
    [/\bIAS\b/g, 'आईएएस'],
    [/\bIPS\b/g, 'आईपीएस'],
    [/\bRERA\b/g, 'रेरा'],
    [/\bNOC\b/g, 'एनओसी'],
    [/\bFSI\b/g, 'एफएसआई'],
    [/\bFAR\b/g, 'एफएआर'],
    [/\bPWD\b/g, 'पीडब्ल्यूडी'],
    [/\bNHAI\b/g, 'एनएचएआई'],
    [/\bOTP\b/g, 'ओटीपी'],
    [/\bLPG\b/g, 'एलपीजी'],
    [/\bCNG\b/g, 'सीएनजी'],
    [/\bEV\b/g, 'ईवी'],
  ];
  for (const [pattern, devanagari] of acronyms) {
    cleaned = cleaned.replace(pattern, devanagari);
  }

  // 9. Strict English character elimination (protecting [yellow] and [highlight] tags)
  cleaned = cleaned.replace(/\[(yellow|highlight)\]/g, '\uE001');
  cleaned = cleaned.replace(/\[\/(yellow|highlight)\]/g, '\uE002');
  cleaned = cleaned.replace(/[A-Za-z]+/g, '');
  cleaned = cleaned.replace(/\uE001/g, '[yellow]');
  cleaned = cleaned.replace(/\uE002/g, '[/yellow]');

  // 10. Strip leading and trailing punctuation repeatedly (. or । or ! or ? or , or - or : or ;)
  cleaned = cleaned.replace(/^[\s:\-–—,;।.]+/g, '').replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, '').trim();

  // 11. Clean spaces around highlight tags and punctuation
  cleaned = cleaned
    .replace(/\[(highlight|yellow)\]\s+/g, '[$1]')
    .replace(/\s+\[\/(highlight|yellow)\]/g, '[/$1]')
    .replace(/\s+([,\.!\?:;।])/g, '$1');

  // 12. Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // 13. Remove sycophancy and formal honorifics (Part 3)
  cleaned = sanitizePressNoteFlattery(cleaned);

  return cleaned;
}

const CATEGORY_KEYWORDS = [
  'राष्ट्रीय',
  'अंतरराष्ट्रीय',
  'विदेश',
  'अपराध',
  'क्राइम',
  'सियासत',
  'राजनीति',
  'हादसा',
  'प्रशासन',
  'विकास',
  'बिजनेस',
  'कारोबार',
  'टेक',
  'विशेष कवरेज',
  'ताज़ा ख़बर',
  'ताज़ा समाचार',
  'ताज़ा'
];

export interface DistrictStateEntry {
  district: string;
  state: string;
  aliases: string[];
}

export const DISTRICT_STATE_LIST: DistrictStateEntry[] = [
  // Madhya Pradesh
  { district: 'शहडोल', state: 'मध्य प्रदेश', aliases: ['shahdol', 'शहडोल'] },
  { district: 'अनूपपुर', state: 'मध्य प्रदेश', aliases: ['anuppur', 'अनूपपुर'] },
  { district: 'उमरिया', state: 'मध्य प्रदेश', aliases: ['umaria', 'उमरिया'] },
  { district: 'सीधी', state: 'मध्य प्रदेश', aliases: ['sidhi', 'सीधी'] },
  { district: 'सिंगरौली', state: 'मध्य प्रदेश', aliases: ['singrauli', 'सिंगरौली'] },
  { district: 'रीवा', state: 'मध्य प्रदेश', aliases: ['rewa', 'रीवा'] },
  { district: 'सतना', state: 'मध्य प्रदेश', aliases: ['satna', 'सतना'] },
  { district: 'भोपाल', state: 'मध्य प्रदेश', aliases: ['bhopal', 'भोपाल'] },
  { district: 'इंदौर', state: 'मध्य प्रदेश', aliases: ['indore', 'इंदौर'] },
  { district: 'जबलपुर', state: 'मध्य प्रदेश', aliases: ['jabalpur', 'जबलपुर'] },
  { district: 'ग्वालियर', state: 'मध्य प्रदेश', aliases: ['gwalior', 'ग्वालियर'] },
  { district: 'उज्जैन', state: 'मध्य प्रदेश', aliases: ['ujjain', 'उज्जैन'] },
  { district: 'सागर', state: 'मध्य प्रदेश', aliases: ['sagar', 'सागर'] },
  { district: 'छतरपुर', state: 'मध्य प्रदेश', aliases: ['chhatarpur', 'छतरपुर'] },
  { district: 'दमोह', state: 'मध्य प्रदेश', aliases: ['damoh', 'दमोह'] },
  { district: 'पन्ना', state: 'मध्य प्रदेश', aliases: ['panna', 'पन्ना'] },
  { district: 'टीकमगढ़', state: 'मध्य प्रदेश', aliases: ['tikamgarh', 'टीकमगढ़'] },
  { district: 'निवाड़ी', state: 'मध्य प्रदेश', aliases: ['niwari', 'निवाड़ी'] },
  { district: 'कटनी', state: 'मध्य प्रदेश', aliases: ['katni', 'कटनी'] },
  { district: 'मंडला', state: 'मध्य प्रदेश', aliases: ['mandla', 'मंडला'] },
  { district: 'डिंडोरी', state: 'मध्य प्रदेश', aliases: ['dindori', 'डिंडोरी'] },
  { district: 'छिंदवाड़ा', state: 'मध्य प्रदेश', aliases: ['chhindwara', 'छिंदवाड़ा'] },
  { district: 'सिवनी', state: 'मध्य प्रदेश', aliases: ['seoni', 'सिवनी'] },
  { district: 'बालाघाट', state: 'मध्य प्रदेश', aliases: ['balaghat', 'बालाघाट'] },
  { district: 'बैतूल', state: 'मध्य प्रदेश', aliases: ['betul', 'बैतूल'] },
  { district: 'हरदा', state: 'मध्य प्रदेश', aliases: ['harda', 'हरदा'] },
  { district: 'होशंगाबाद', state: 'मध्य प्रदेश', aliases: ['hoshangabad', 'नर्मदापुरम', 'narmadapuram'] },
  { district: 'रायसेन', state: 'मध्य प्रदेश', aliases: ['raisen', 'रायसेन'] },
  { district: 'विदिशा', state: 'मध्य प्रदेश', aliases: ['vidisha', 'विदिशा'] },
  { district: 'सीहोर', state: 'मध्य प्रदेश', aliases: ['sehore', 'सीहोर'] },
  { district: 'राजगढ़', state: 'मध्य प्रदेश', aliases: ['rajgarh', 'राजगढ़'] },
  { district: 'शाजापुर', state: 'मध्य प्रदेश', aliases: ['shajapur', 'शाजापुर'] },
  { district: 'आगर मालवा', state: 'मध्य प्रदेश', aliases: ['agar', 'आगर'] },
  { district: 'देवास', state: 'मध्य प्रदेश', aliases: ['dewas', 'देवास'] },
  { district: 'रतलाम', state: 'मध्य प्रदेश', aliases: ['ratlam', 'रतलाम'] },
  { district: 'मंदसौर', state: 'मध्य प्रदेश', aliases: ['mandsaur', 'मंदसौर'] },
  { district: 'नीमच', state: 'मध्य प्रदेश', aliases: ['neemuch', 'नीमच'] },
  { district: 'धार', state: 'मध्य प्रदेश', aliases: ['dhar', 'धार'] },
  { district: 'झाबुआ', state: 'मध्य प्रदेश', aliases: ['jhabua', 'झाबुआ'] },
  { district: 'अलीराजपुर', state: 'मध्य प्रदेश', aliases: ['alirajpur', 'अलीराजपुर'] },
  { district: 'बड़वानी', state: 'मध्य प्रदेश', aliases: ['barwani', 'बड़वानी'] },
  { district: 'खरगोन', state: 'मध्य प्रदेश', aliases: ['khargone', 'खरगोन'] },
  { district: 'खंडवा', state: 'मध्य प्रदेश', aliases: ['khandwa', 'खंडवा'] },
  { district: 'बुरहानपुर', state: 'मध्य प्रदेश', aliases: ['burhanpur', 'बुरहानपुर'] },
  { district: 'भिंड', state: 'मध्य प्रदेश', aliases: ['bhind', 'भिंड'] },
  { district: 'मुरैना', state: 'मध्य प्रदेश', aliases: ['morena', 'मुरैना'] },
  { district: 'श्योपुर', state: 'मध्य प्रदेश', aliases: ['sheopur', 'श्योपुर'] },
  { district: 'शिवपुरी', state: 'मध्य प्रदेश', aliases: ['shivpuri', 'शिवपुरी'] },
  { district: 'गुना', state: 'मध्य प्रदेश', aliases: ['guna', 'गुना'] },
  { district: 'अशोकनगर', state: 'मध्य प्रदेश', aliases: ['ashoknagar', 'अशोकनगर'] },
  { district: 'मैहर', state: 'मध्य प्रदेश', aliases: ['maihar', 'मैहर'] },

  // Uttar Pradesh
  { district: 'झांसी', state: 'उत्तर प्रदेश', aliases: ['jhansi', 'झांसी'] },
  { district: 'लखनऊ', state: 'उत्तर प्रदेश', aliases: ['lucknow', 'लखनऊ'] },
  { district: 'वाराणसी', state: 'उत्तर प्रदेश', aliases: ['varanasi', 'banaras', 'वाराणसी', 'बनारस', 'काशी'] },
  { district: 'कानपुर', state: 'उत्तर प्रदेश', aliases: ['kanpur', 'कानपुर'] },
  { district: 'प्रयागराज', state: 'उत्तर प्रदेश', aliases: ['prayagraj', 'allahabad', 'प्रयागराज', 'इलाहाबाद'] },
  { district: 'गोरखपुर', state: 'उत्तर प्रदेश', aliases: ['gorakhpur', 'गोरखपुर'] },
  { district: 'आगरा', state: 'उत्तर प्रदेश', aliases: ['agra', 'आगरा'] },
  { district: 'मथुरा', state: 'उत्तर प्रदेश', aliases: ['mathura', 'मथुरा'] },
  { district: 'मेरठ', state: 'उत्तर प्रदेश', aliases: ['meerut', 'मेरठ'] },
  { district: 'बरेली', state: 'उत्तर प्रदेश', aliases: ['bareilly', 'बरेली'] },
  { district: 'अलीगढ़', state: 'उत्तर प्रदेश', aliases: ['aligarh', 'अलीगढ़'] },
  { district: 'मुरादाबाद', state: 'उत्तर प्रदेश', aliases: ['moradabad', 'मुरादाबाद'] },
  { district: 'अयोध्या', state: 'उत्तर प्रदेश', aliases: ['ayodhya', 'faizabad', 'अयोध्या', 'फैजाबाद'] },
  { district: 'सहारनपुर', state: 'उत्तर प्रदेश', aliases: ['saharanpur', 'सहारनपुर'] },
  { district: 'नोएडा', state: 'उत्तर प्रदेश', aliases: ['noida', 'नोएडा', 'गौतमबुद्ध नगर'] },
  { district: 'गाजियाबाद', state: 'उत्तर प्रदेश', aliases: ['ghaziabad', 'गाजियाबाद'] },
  { district: 'मिर्जापुर', state: 'उत्तर प्रदेश', aliases: ['mirzapur', 'मिर्जापुर'] },
  { district: 'बांदा', state: 'उत्तर प्रदेश', aliases: ['banda', 'बांदा'] },
  { district: 'चित्रकूट', state: 'उत्तर प्रदेश', aliases: ['chitrakoot', 'चित्रकूट'] },
  { district: 'महोबा', state: 'उत्तर प्रदेश', aliases: ['mahoba', 'महोबा'] },
  { district: 'हमीरपुर', state: 'उत्तर प्रदेश', aliases: ['hamirpur', 'हमीरपुर'] },
  { district: 'जालौन', state: 'उत्तर प्रदेश', aliases: ['jalaun', 'orai', 'उरई', 'जालौन'] },
  { district: 'ललितपुर', state: 'उत्तर प्रदेश', aliases: ['lalitpur', 'ललितपुर'] },
  { district: 'बस्ती', state: 'उत्तर प्रदेश', aliases: ['basti', 'बस्ती'] },
  { district: 'गोंडा', state: 'उत्तर प्रदेश', aliases: ['gonda', 'गोंडा'] },
  { district: 'बहराइच', state: 'उत्तर प्रदेश', aliases: ['bahraich', 'बहराइच'] },
  { district: 'देवरिया', state: 'उत्तर प्रदेश', aliases: ['deoria', 'देवरिया'] },
  { district: 'बलिया', state: 'उत्तर प्रदेश', aliases: ['ballia', 'बलिया'] },
  { district: 'आजमगढ़', state: 'उत्तर प्रदेश', aliases: ['azamgarh', 'आजमगढ़'] },
  { district: 'जौनपुर', state: 'उत्तर प्रदेश', aliases: ['jaunpur', 'जौनपुर'] },
  { district: 'गाजीपुर', state: 'उत्तर प्रदेश', aliases: ['ghazipur', 'गाजीपुर'] },
  { district: 'सोनभद्र', state: 'उत्तर प्रदेश', aliases: ['sonbhadra', 'सोनभद्र'] },
  { district: 'प्रतापगढ़', state: 'उत्तर प्रदेश', aliases: ['pratapgarh', 'प्रतापगढ़'] },
  { district: 'फतेहपुर', state: 'उत्तर प्रदेश', aliases: ['fatehpur', 'फतेहपुर'] },
  { district: 'उन्नाव', state: 'उत्तर प्रदेश', aliases: ['unnao', 'उन्नाव'] },
  { district: 'रायबरेली', state: 'उत्तर प्रदेश', aliases: ['raebareli', 'रायबरेली'] },
  { district: 'अमेठी', state: 'उत्तर प्रदेश', aliases: ['amethi', 'अमेठी'] },
  { district: 'सुल्तानपुर', state: 'उत्तर प्रदेश', aliases: ['sultanpur', 'सुल्तानपुर'] },
  { district: 'सीतापुर', state: 'उत्तर प्रदेश', aliases: ['sitapur', 'सीतापुर'] },
  { district: 'हरदोई', state: 'उत्तर प्रदेश', aliases: ['hardoi', 'हरदोई'] },
  { district: 'लखीमपुर खीरी', state: 'उत्तर प्रदेश', aliases: ['lakhimpur', 'लखीमपुर'] },
  { district: 'शाहजहांपुर', state: 'उत्तर प्रदेश', aliases: ['shahjahanpur', 'शाहजहांपुर'] },
  { district: 'बुलंदशहर', state: 'उत्तर प्रदेश', aliases: ['bulandshahr', 'बुलंदशहर'] },
  { district: 'हापुड़', state: 'उत्तर प्रदेश', aliases: ['hapur', 'हापुड़'] },
  { district: 'मुजफ्फरनगर', state: 'उत्तर प्रदेश', aliases: ['muzaffarnagar', 'मुजफ्फरनगर'] },
  { district: 'इटावा', state: 'उत्तर प्रदेश', aliases: ['etawah', 'इटावा'] },
  { district: 'कन्नौज', state: 'उत्तर प्रदेश', aliases: ['kannauj', 'कन्नौज'] },

  // Uttarakhand
  { district: 'नैनीताल', state: 'उत्तराखंड', aliases: ['nainital', 'नैनीताल'] },
  { district: 'देहरादून', state: 'उत्तराखंड', aliases: ['dehradun', 'देहरादून'] },
  { district: 'हरिद्वार', state: 'उत्तराखंड', aliases: ['haridwar', 'हरिद्वार'] },
  { district: 'अल्मोड़ा', state: 'उत्तराखंड', aliases: ['almora', 'अल्मोड़ा'] },
  { district: 'ऊधमसिंह नगर', state: 'उत्तराखंड', aliases: ['udhamsingh', 'रुद्रपुर'] },
  { district: 'पौड़ी गढ़वाल', state: 'उत्तराखंड', aliases: ['pauri', 'पौड़ी'] },
  { district: 'टिहरी', state: 'उत्तराखंड', aliases: ['tehri', 'टिहरी'] },
  { district: 'चमोली', state: 'उत्तराखंड', aliases: ['chamoli', 'चमोली'] },
  { district: 'उत्तरकाशी', state: 'उत्तराखंड', aliases: ['uttarkashi', 'उत्तरकाशी'] },
  { district: 'पिथौरागढ़', state: 'उत्तराखंड', aliases: ['pithoragarh', 'पिथौरागढ़'] },

  // Bihar
  { district: 'पटना', state: 'बिहार', aliases: ['patna', 'पटना'] },
  { district: 'गया', state: 'बिहार', aliases: ['gaya', 'गया'] },
  { district: 'मुजफ्फरपुर', state: 'बिहार', aliases: ['muzaffarpur', 'मुजफ्फरपुर'] },
  { district: 'भागलपुर', state: 'बिहार', aliases: ['bhagalpur', 'भागलपुर'] },
  { district: 'दरभंगा', state: 'बिहार', aliases: ['darbhanga', 'दरभंगा'] },
  { district: 'पूर्णिया', state: 'बिहार', aliases: ['purnia', 'पूर्णिया'] },
  { district: 'सहरसा', state: 'बिहार', aliases: ['saharsa', 'सहरसा'] },
  { district: 'बेगूसराय', state: 'बिहार', aliases: ['begusarai', 'बेगूसराय'] },
  { district: 'छपरा', state: 'बिहार', aliases: ['chapra', 'saran', 'सारण', 'छपरा'] },
  { district: 'सीवान', state: 'बिहार', aliases: ['siwan', 'सीवान'] },
  { district: 'गोपालगंज', state: 'बिहार', aliases: ['gopalganj', 'गोपालगंज'] },
  { district: 'मोतिहारी', state: 'बिहार', aliases: ['motihari', 'मोतिहारी', 'चंपारण'] },
  { district: 'समस्तीपुर', state: 'बिहार', aliases: ['samastipur', 'समस्तीपुर'] },
  { district: 'नालंदा', state: 'बिहार', aliases: ['nalanda', 'biharsharif', 'नालंदा', 'बिहारशरीफ'] },
  { district: 'आरा', state: 'बिहार', aliases: ['arrah', 'bhojpur', 'भोजपुर', 'आरा'] },
  { district: 'बक्सर', state: 'बिहार', aliases: ['buxar', 'बक्सर'] },
  { district: 'सासाराम', state: 'बिहार', aliases: ['sasaram', 'rohtas', 'रोहतास', 'सासाराम'] },

  // Rajasthan
  { district: 'जयपुर', state: 'राजस्थान', aliases: ['jaipur', 'जयपुर'] },
  { district: 'जोधपुर', state: 'राजस्थान', aliases: ['jodhpur', 'जोधपुर'] },
  { district: 'उदयपुर', state: 'राजस्थान', aliases: ['udaipur', 'उदयपुर'] },
  { district: 'कोटा', state: 'राजस्थान', aliases: ['kota', 'कोटा'] },
  { district: 'अजमेर', state: 'राजस्थान', aliases: ['ajmer', 'अजमेर'] },
  { district: 'बीकानेर', state: 'राजस्थान', aliases: ['bikaner', 'बीकानेर'] },
  { district: 'भरतपुर', state: 'राजस्थान', aliases: ['bharatpur', 'भरतपुर'] },
  { district: 'भीलवाड़ा', state: 'राजस्थान', aliases: ['bhilwara', 'भीलवाड़ा'] },
  { district: 'अलवर', state: 'राजस्थान', aliases: ['alwar', 'अलवर'] },
  { district: 'सीकर', state: 'राजस्थान', aliases: ['sikar', 'सीकर'] },
  { district: 'पाली', state: 'राजस्थान', aliases: ['pali', 'पाली'] },
  { district: 'बाड़मेर', state: 'राजस्थान', aliases: ['barmer', 'बाड़मेर'] },
  { district: 'जैसलमेर', state: 'राजस्थान', aliases: ['jaisalmer', 'जैसलमेर'] },
  { district: 'नागौर', state: 'राजस्थान', aliases: ['nagaur', 'नागौर'] },
  { district: 'चूरू', state: 'राजस्थान', aliases: ['churu', 'चूरू'] },
  { district: 'झुंझुनूं', state: 'राजस्थान', aliases: ['jhunjhunu', 'झुंझुनूं'] },
  { district: 'चित्तौड़गढ़', state: 'राजस्थान', aliases: ['chittorgarh', 'चित्तौड़गढ़'] },
  { district: 'श्रीगंगानगर', state: 'राजस्थान', aliases: ['ganganagar', 'श्रीगंगानगर'] },

  // Chhattisgarh
  { district: 'रायपुर', state: 'छत्तीसगढ़', aliases: ['raipur', 'रायपुर'] },
  { district: 'बिलासपुर', state: 'छत्तीसगढ़', aliases: ['bilaspur', 'बिलासपुर'] },
  { district: 'दुर्ग', state: 'छत्तीसगढ़', aliases: ['durg', 'bhilai', 'दुर्ग', 'भिलाई'] },
  { district: 'कोरबा', state: 'छत्तीसगढ़', aliases: ['korba', 'कोरबा'] },
  { district: 'रायगढ़', state: 'छत्तीसगढ़', aliases: ['raigarh', 'रायगढ़'] },
  { district: 'राजनांदगांव', state: 'छत्तीसगढ़', aliases: ['rajnandgaon', 'राजनांदगांव'] },
  { district: 'जगदलपुर', state: 'छत्तीसगढ़', aliases: ['jagdalpur', 'bastar', 'बस्तर', 'जगदलपुर'] },
  { district: 'अंबिकापुर', state: 'छत्तीसगढ़', aliases: ['ambikapur', 'surguja', 'सरगुजा', 'अंबिकापुर'] },

  // Maharashtra
  { district: 'मुंबई', state: 'महाराष्ट्र', aliases: ['mumbai', 'bombay', 'मुंबई'] },
  { district: 'पुणे', state: 'महाराष्ट्र', aliases: ['pune', 'पुणे'] },
  { district: 'नागपुर', state: 'महाराष्ट्र', aliases: ['nagpur', 'नागपुर'] },
  { district: 'नासिक', state: 'महाराष्ट्र', aliases: ['nashik', 'नासिक'] },
  { district: 'ठाणे', state: 'महाराष्ट्र', aliases: ['thane', 'ठाणे'] },
  { district: 'छत्रपति संभाजीनगर', state: 'महाराष्ट्र', aliases: ['aurangabad', 'sambhajinagar', 'औरंगाबाद'] },
  { district: 'कोल्हापुर', state: 'महाराष्ट्र', aliases: ['kolhapur', 'कोल्हापुर'] },

  // Jharkhand
  { district: 'रांची', state: 'झारखंड', aliases: ['ranchi', 'रांची'] },
  { district: 'जमशेदपुर', state: 'झारखंड', aliases: ['jamshedpur', 'tatanagar', 'जमशेदपुर'] },
  { district: 'धनबाद', state: 'झारखंड', aliases: ['dhanbad', 'धनबाद'] },
  { district: 'बोकारो', state: 'झारखंड', aliases: ['bokaro', 'बोकारो'] },
  { district: 'देवघर', state: 'झारखंड', aliases: ['deoghar', 'देवघर'] },

  // Gujarat
  { district: 'अहमदाबाद', state: 'गुजरात', aliases: ['ahmedabad', 'अहमदाबाद'] },
  { district: 'सूरत', state: 'गुजरात', aliases: ['surat', 'सूरत'] },
  { district: 'वडोदरा', state: 'गुजरात', aliases: ['vadodara', 'baroda', 'वडोदरा'] },
  { district: 'राजकोट', state: 'गुजरात', aliases: ['rajkot', 'राजकोट'] },

  // West Bengal
  { district: 'कोलकाता', state: 'पश्चिम बंगाल', aliases: ['kolkata', 'calcutta', 'कोलकाता', 'कलकत्ता'] },
  { district: 'हावड़ा', state: 'पश्चिम बंगाल', aliases: ['howrah', 'हावड़ा'] },
  { district: 'सिलीगुड़ी', state: 'पश्चिम बंगाल', aliases: ['siliguri', 'सिलीगुड़ी'] },
  { district: 'आसनसोल', state: 'पश्चिम बंगाल', aliases: ['asansol', 'आसनसोल'] },
  { district: 'दुर्गापुर', state: 'पश्चिम बंगाल', aliases: ['durgapur', 'दुर्गापुर'] },

  // Haryana / Punjab / Delhi
  { district: 'चंडीगढ़', state: 'पंजाब/हरियाणा', aliases: ['chandigarh', 'चंडीगढ़'] },
  { district: 'गुरुग्राम', state: 'हरियाणा', aliases: ['gurugram', 'gurgaon', 'गुरुग्राम', 'गुड़गांव'] },
  { district: 'अमृतसर', state: 'पंजाब', aliases: ['amritsar', 'अमृतसर'] },
  { district: 'लुधियाना', state: 'पंजाब', aliases: ['ludhiana', 'लुधियाना'] },
  { district: 'नई दिल्ली', state: 'दिल्ली', aliases: ['new delhi', 'new-delhi', 'नई दिल्ली'] },
  { district: 'दिल्ली', state: 'दिल्ली', aliases: ['delhi', 'दिल्ली'] },
];

/**
 * Ensures district names are always paired with their state in standard "जिला, राज्य" format.
 * e.g. "शहडोल" -> "शहडोल, मध्य प्रदेश"
 * e.g. "झांसी" -> "झांसी, उत्तर प्रदेश"
 * e.g. "नैनीताल" -> "नैनीताल, उत्तराखंड"
 */
export function formatDistrictWithState(loc: string): string {
  if (!loc || typeof loc !== 'string') return '';
  const trimmed = loc.trim();
  if (!trimmed || trimmed === 'विशेष कवरेज') return '';

  // If already contains comma and state (e.g. "शहडोल, मध्य प्रदेश"), verify clean spacing
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.join(', ');
  }

  // Lookup district in mapping table
  for (const item of DISTRICT_STATE_LIST) {
    if (item.district === 'दिल्ली' || item.district === 'नई दिल्ली') {
      if (trimmed === item.district) return 'नई दिल्ली';
      continue;
    }
    if (
      trimmed.toLowerCase() === item.district.toLowerCase() ||
      item.aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())
    ) {
      return `${item.district}, ${item.state}`;
    }
  }

  return trimmed;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if alias matches in text using word boundaries:
 * - English/Latin: \b${alias}\b (avoids "agra" inside "paragraphs", "instagram", etc.)
 * - Devanagari: unicode boundary with guards against common false-positive verbs/multipliers
 */
export function matchDistrictAlias(text: string, alias: string): boolean {
  if (!alias || !text) return false;
  // If alias is English/Latin
  if (/^[A-Za-z0-9\s\-]+$/.test(alias)) {
    const reg = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'i');
    return reg.test(text);
  }
  // If alias is Devanagari
  if (alias === 'गया') {
    if (/(?:किया|लिया|दिया|हो|चला|आ|गए|गई)\s+गया/u.test(text)) {
      return /(?:गया\s*(?:जिले|में|शहर|से|का|की|के)|बोधगया)/u.test(text);
    }
  }
  if (alias === 'गुना') {
    if (/\d+\s*गुना|चार\s*गुना|दो\s*गुना|तीन\s*गुना|दस\s*गुना|दोगुना|तीनगुना/u.test(text)) {
      return /(?:गुना\s*(?:जिले|में|शहर|से|का|की|के))/u.test(text);
    }
  }
  if (alias === 'धार') {
    if (/(?:तेज|पानी की|हवा की)\s+धार|धारदार/u.test(text)) {
      return /(?:धार\s*(?:जिले|में|शहर|से|का|की|के))/u.test(text);
    }
  }
  if (alias === 'बांदा') {
    if (/बांधा/u.test(text) && !/बांदा\s*(?:जिले|में|शहर|से|का|की|के)/u.test(text)) {
      return false;
    }
  }
  const devReg = new RegExp(`(?:^|[^\\p{L}\\p{M}])${escapeRegExp(alias)}(?=[^\\p{L}\\p{M}]|$)`, 'u');
  return devReg.test(text);
}

function cleanCorpusForLocation(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:paragraphs?\s+extracted|instagram\.com|facebook\.com|twitter\.com|youtube\.com)/gi, ' ')
    .replace(/(?:Article Content & Facts|Meta Description|Source URL|File Photo|Credit)/gi, ' ')
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Detects genuine event location from news facts, title, and URL.
 * Prioritizes district-level matches over generic states, and never defaults to "आगरा" due to "paragraphs" or generic text.
 */
export function detectDistrictAndState(
  title: string = '',
  desc: string = '',
  content: string = '',
  url: string = ''
): string {
  const cleanTitle = cleanCorpusForLocation(title);
  const cleanDesc = cleanCorpusForLocation(desc);
  const cleanContent = cleanCorpusForLocation(content);

  // 1. Check URL path segments explicitly (e.g. /local/mp/bhopal/news/ -> bhopal)
  if (url) {
    const urlLower = url.toLowerCase();
    for (const d of DISTRICT_STATE_LIST) {
      if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
      for (const a of d.aliases) {
        if (/^[a-z0-9\-]+$/i.test(a) && a.length >= 4) {
          const pathReg = new RegExp(`[/\\-_]${escapeRegExp(a)}[/\\-_.]`, 'i');
          if (pathReg.test(urlLower)) {
            return `${d.district}, ${d.state}`;
          }
        }
      }
    }
  }

  // 2. Check title first (highest editorial priority)
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanTitle, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }

  // 3. Check description
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanDesc, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }

  // 4. Check clean article content
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanContent, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }

  // 5. International places
  const primaryText = `${cleanTitle} ${cleanDesc} ${url}`.toLowerCase();
  if (/(?:वाशिंगटन|व्हाइट\s*हाउस|white\s*house|washington)/i.test(primaryText)) {
    return 'वाशिंगटन';
  }
  if (/(?:मास्को|moscow)/i.test(primaryText)) return 'मास्को';
  if (/(?:लंदन|london)/i.test(primaryText)) return 'लंदन';

  // 6. Genuine Delhi (check primary text and clean content landmarks)
  const delhiLandmarkRegex = /(?:संसद[\s\-]*भवन|राष्ट्रपति[\s\-]*भवन|सुप्रीम[\s\-]*कोर्ट|जंतर[\s\-]*मंतर|राजधानी[\s\-]*दिल्ली|इंडिया[\s\-]*गेट)/i;
  if (delhiLandmarkRegex.test(primaryText) || (cleanContent && delhiLandmarkRegex.test(cleanContent))) {
    return 'नई दिल्ली';
  }
  if (/(?:नई\s*दिल्ली|new\s*delhi)/i.test(primaryText)) {
    return 'नई दिल्ली';
  }

  // 7. State-level match if state is explicitly referenced in title/desc
  const states = [
    { state: 'मध्य प्रदेश', capital: 'भोपाल, मध्य प्रदेश', aliases: ['मध्य प्रदेश', 'madhya pradesh', 'mp'] },
    { state: 'उत्तर प्रदेश', capital: 'लखनऊ, उत्तर प्रदेश', aliases: ['उत्तर प्रदेश', 'uttar pradesh', 'up'] },
    { state: 'बिहार', capital: 'पटना, बिहार', aliases: ['बिहार', 'bihar'] },
    { state: 'राजस्थान', capital: 'जयपुर, राजस्थान', aliases: ['राजस्थान', 'rajasthan'] },
    { state: 'उत्तराखंड', capital: 'देहरादून, उत्तराखंड', aliases: ['उत्तराखंड', 'uttarakhand'] },
    { state: 'छत्तीसगढ़', capital: 'रायपुर, छत्तीसगढ़', aliases: ['छत्तीसगढ़', 'chhattisgarh'] },
    { state: 'महाराष्ट्र', capital: 'मुंबई, महाराष्ट्र', aliases: ['महाराष्ट्र', 'maharashtra'] },
    { state: 'गुजरात', capital: 'गांधीनगर, गुजरात', aliases: ['गुजरात', 'gujarat'] },
    { state: 'झारखंड', capital: 'रांची, झारखंड', aliases: ['झारखंड', 'jharkhand'] },
    { state: 'पश्चिम बंगाल', capital: 'कोलकाता, पश्चिम बंगाल', aliases: ['पश्चिम बंगाल', 'west bengal', 'bengal'] },
    { state: 'पंजाब', capital: 'चंडीगढ़', aliases: ['पंजाब', 'punjab'] },
    { state: 'हरियाणा', capital: 'चंडीगढ़', aliases: ['हरियाणा', 'haryana'] },
  ];

  for (const st of states) {
    for (const a of st.aliases) {
      if (matchDistrictAlias(cleanTitle, a) || matchDistrictAlias(cleanDesc, a)) {
        return st.capital;
      }
    }
  }

  return '';
}

/**
 * Transforms any raw sentence or clause into a punchy, active journalistic Hindi headline title.
 * Eliminates declarative endings like "नहीं बनेंगे", "किए गए", "दी जाएगी", "हुआ", avoiding implied full stops.
 */
export function formatAsJournalisticHeadline(raw: string): string {
  if (!raw) return '';
  let h = cleanHeadlineText(raw);

  // 1. Strip conversational starter words that make it sound like spoken narrative
  h = h.replace(/^(?:अब|वहीं|इसके अलावा|साथ ही|प्राप्त जानकारी के अनुसार|सूत्रों के मुताबिक|गौरतलब है कि|बता दें कि|दरअसल|इस दौरान|इसके तहत|सभी|मामले में|इधर)[,\s]*/gi, '');

  // 2. Strip leading English junk (without stripping numbers like 40 or 250)
  h = h.replace(/^[A-Za-z\s,.\-–—:;'"()\/&|!_]+(?=[\u0900-\u097F])/u, '');

  // 3. Strip trailing interrogative/question clauses
  h = h.replace(/[,;–—\-]?\s*(?:अब तक क्या-क्या पता है|क्या है पूरा मामला|जानिए पूरी बात|कौन था|क्यों हुआ|कैसे हुआ|क्या है वजह|क्या हुआ था|किसने किया)[?।.\s]*$/u, '');

  // 4. Transform inline declarative phrases like "अब नहीं बनेंगे X" -> "X पर रोक"
  h = h.replace(/(?:अब\s+)?नहीं\s*(?:बनेंगे|बनेगा|बन सकेंगे)\s+([^,:।\n]+)/gu, '$1 पर रोक');
  h = h.replace(/(?:अब\s+)?नहीं\s*(?:होगा|होंगे)\s+([^,:।\n]+)/gu, '$1 पर पाबंदी');

  // 5. Transform declarative closing verb phrases into journalistic headline nouns/action tags
  h = h
    .replace(/(?:अब\s+)?नहीं\s*(?:बनेंगे|बनेगा|बन सकेंगे|होगा|होंगे)(?:\s*हैं|\s*है)?$/u, ' पर रोक')
    .replace(/(?:की\s*अनुमति\s*होगी|अनुमति\s*दी\s*गई|अनुमति\s*होगी|मंजूरी\s*दी\s*गई|मंजूर\s*किया\s*गया|मंजूरी\s*मिली|को\s*मंजूरी\s*दी\s*है)(?:\s*हैं|\s*है)?$/u, ' को मंजूरी')
    .replace(/(?:का\s+)?(?:तय\s*की\s*गई\s*है|तय\s*किए\s*गए|तय\s*किया\s*गया)(?:\s*हैं|\s*है)?$/u, ' तय')
    .replace(/(?:का\s+)?(?:निर्णय\s*लिया\s*गया|फैसला\s*लिया\s*गया)(?:\s*हैं|\s*है)?$/u, ' का निर्णय')
    .replace(/(?:लागू\s*किए\s*गए\s*हैं|लागू\s*किया\s*गया|लागू\s*होगा)(?:\s*हैं|\s*है)?$/u, ' लागू')
    .replace(/(?:\s*अतिरिक्त)?\s*(?:सहायता|छूट|राहत)\s*(?:दी\s*जाएगी|मिलेगी|का\s*प्रावधान)(?:\s*हैं|\s*है)?$/u, ' का ऐलान')
    .replace(/(?:दी\s*जाएगी|छूट\s*मिलेगी|प्रावधान\s*किया\s*गया)(?:\s*हैं|\s*है)?$/u, ' का ऐलान')
    .replace(/(?:\s*सीधा)?\s*(?:लाभ|फायदा)\s*(?:मिलेगा|होगा)(?:\s*हैं|\s*है)?$/u, ' को सीधा फायदा')
    .replace(/(?:पूरे\s*किए|रन\s*बनाए)(?:\s*हैं|\s*है)?$/u, ' ठोके')
    .replace(/(?:शतक|अर्धशतक)\s*(?:लगाया|जड़ा|बनाया)(?:\s*हैं|\s*है)?$/u, ' जड़ा')
    .replace(/(?:बनाए\s*जा\s*सकेंगे|बनाए\s*जाएंगे)(?:\s*हैं|\s*है)?$/u, ' को हरी झंडी')
    .replace(/(?:गिरफ्तार\s*किया\s*गया|गिरफ्तार\s*किया)(?:\s*हैं|\s*है)?$/u, ' गिरफ्तार')
    .replace(/(?:बरामद\s*की\s*गई|बरामद\s*किए\s*गए|बरामद\s*हुए)(?:\s*हैं|\s*है)?$/u, ' बरामद')
    .replace(/(?:\s*की)?\s*(?:मौत\s*हो\s*गई|जान\s*गंवाई|दम\s*तोड़\s*दिया)(?:\s*हैं|\s*है)?$/u, ' की मौत')
    .replace(/(?:घायल\s*हो\s*गए|घायल\s*हुए)(?:\s*हैं|\s*है)?$/u, ' घायल')
    .replace(/(?:आदेश\s*दिए\s*गए|आदेश\s*जारी\s*किए|निर्देश\s*दिए)(?:\s*हैं|\s*है)?$/u, ' के सख्त आदेश')
    .replace(/(?:निधन\s*हो\s*गया)(?:\s*हैं|\s*है)?$/u, ' का निधन')
    .replace(/(?:जांच\s*शुरू\s*कर\s*दी\s*गई|जांच\s*के\s*निर्देश\s*दिए)(?:\s*हैं|\s*है)?$/u, ' की जांच शुरू')
    .replace(/(?:घोषणा\s*की\s*गई|ऐलान\s*किया\s*गया|ऐलान\s*किया)(?:\s*हैं|\s*है)?$/u, ' का ऐलान')
    .replace(/(?:के\s*तहत\s*होगा|के\s*तहत\s*होंगे)$/u, ' के नए नियम');

  if (!h.includes('का मामला')) {
    h = h.replace(/(?:सामने\s*आया\s*है|सामने\s*आई\s*है|सामने\s*आए\s*हैं)$/u, ' का मामला');
  }
  if (!h.includes('आरोप')) {
    h = h.replace(/(?:आरोप\s*लगाए\s*हैं|आरोप\s*लगाया\s*है|आरोप\s*लगाया)$/u, ' के आरोप');
  }
  h = h.replace(/(?:साझा\s*किए\s*हैं|साझा\s*किया)$/u, ' की जानकारी दी');

  // 6. INTELLIGENT REPAIR OF HANGING/TRUNCATED AUXILIARY VERBS (NEVER LEAVE DANGLING VERB STEMS)
  // Fix "सामना करना पड़ रहा है" -> "सामना करना पड़ा" (NOT truncated to "सामना करना पड़")
  h = h.replace(/(?:का\s+)?सामना\s*करना\s*पड़(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रहा\s*था|\s*रही\s*थी)?$/u, ' का सामना करना पड़ा');
  h = h.replace(/(?:^|\s)पड़(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रहा\s*था|\s*रही\s*थी)?$/u, ' पड़ा');
  h = h.replace(/का सामना करना पड़ा का सामना करना पड़ा/g, 'का सामना करना पड़ा');

  // Fix "रोकी जा रही थी / रोकी जा" -> "रोकी गई"
  h = h.replace(/(?:रोकी|रोका|रोके)\s*जा(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रही\s*थी|\s*रहा\s*था)?$/u, ' रोकी गई');

  // Fix "किए जा रहे हैं / किए जा" -> "किए गए"
  h = h.replace(/(?:किए|किया)\s*जा(?:\s*रहे\s*हैं|\s*रहा\s*है|\s*रहे\s*थे)?$/u, ' किए गए');

  // Fix "दी जा रही है / दी जा" -> "दी गई"
  h = h.replace(/(?:दी|दिया)\s*जा(?:\s*रही\s*है|\s*रहा\s*है|\s*रही\s*थी)?$/u, ' दी गई');

  // Fix "मांगी गई है / मांगी" -> "मांगी रिपोर्ट"
  h = h.replace(/विस्तृत\s*रिपोर्ट\s*मांगी(?:\s*गई\s*है|\s*है)?$/u, 'विस्तृत रिपोर्ट मांगी');

  // Fix hanging participles like "करते", "होते", "आते", "जाते"
  h = h.replace(/\s+करते$/u, ' करने का मामला');
  h = h.replace(/\s+होते$/u, ' होने पर विवाद');
  h = h.replace(/\s+आते$/u, ' आने पर हंगामा');
  h = h.replace(/\s+जाते$/u, ' जाने पर विवाद');

  // Fix trailing prepositions/connectives that leave an incomplete sentence fragment
  h = h.replace(/\s+(?:ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|ग्रामीण|शहरी|एक|यह|वह)$/u, '');

  // Clean duplicate particles
  h = h
    .replace(/\b(का|के|की|को|में|पर|से|ने)\s+\1\b/gu, '$1')
    .replace(/\s+/g, ' ');

  // Strip surrounding quotes & final cleanup of trailing punctuation
  h = h.replace(/^['"‘“]+|['"’”]+$/g, '').trim();
  h = h.replace(/[।\.\,\!\?\:\-]+$/g, '').trim();

  return h;
}

export function calculateHeadlineSimilarity(h1: string, h2: string): number {
  const stopWords = new Set(['और', 'पर', 'में', 'से', 'को', 'का', 'की', 'के', 'ने', 'यह', 'वह', 'कि', 'भी', 'लिए', 'नए', 'नया', 'बड़ा', 'बड़ी', 'हुए', 'हुआ', 'है', 'हैं', 'था', 'थी', 'थे']);
  const words1 = new Set(h1.toLowerCase().replace(/[^\u0900-\u097Fa-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
  const words2 = new Set(h2.toLowerCase().replace(/[^\u0900-\u097Fa-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
  if (words1.size === 0 || words2.size === 0) return 0;
  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }
  return (2 * common) / (words1.size + words2.size);
}

/**
 * Sanitizes flattering and honorific words from text (Part 3)
 */
export function sanitizePressNoteFlattery(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let cleaned = text;
  cleaned = cleaned.replace(/^(यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*/i, '');
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम पूज्य|पूज्य)\s+/gu,
    ' '
  );
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu,
    ' '
  );
  cleaned = cleaned.replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, '');
  cleaned = cleaned.replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, '');

  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();
  return cleaned;
}

/**
 * Validates a single headline option against strict editorial rules (Part 13).
 */
export interface HeadlineValidationResult {
  valid: boolean;
  reasons: string[];
  cleanText: string;
  charCount: number;
  wordCount: number;
}

export function validateHeadlineOption(headline: string, index: number = 0): HeadlineValidationResult {
  const reasons: string[] = [];
  const clean = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();

  if (!clean) {
    return { valid: false, reasons: ['हेडलाइन खाली नहीं हो सकती'], cleanText: '', charCount: 0, wordCount: 0 };
  }

  // Visible text for character count excluding [yellow]...[/yellow] and [highlight]...[/highlight] tags
  const visibleText = clean.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
  const charCount = visibleText.length;
  const words = visibleText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Pure Devanagari Hindi check (no Latin characters)
  if (/[a-zA-Z]/.test(visibleText)) {
    reasons.push('हेडलाइन में अंग्रेजी अक्षर शामिल हैं');
  }

  // 2. Character count check (Part 7: 100-250 characters, target 150-200)
  if (charCount < 100) {
    reasons.push(`हेडलाइन बहुत छोटी है (${charCount} अक्षर, कम से कम 100 अक्षर अनिवार्य)`);
  }
  if (charCount > 250) {
    reasons.push(`हेडलाइन बहुत लंबी है (${charCount} अक्षर, अधिकतम 250 अक्षर अनुमत)`);
  }

  // 3. Completeness check: MUST NOT end in dangling verbs or postpositions
  if (/(?:पड़|जा|रहा|रहे|रही|करते|होते|आते|जाते|ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|यह|वह|एक)$/u.test(clean)) {
    reasons.push('हेडलाइन अपूर्ण क्रिया या परसर्ग पर समाप्त हो रही है');
  }

  // 4. Formulaic cliché template rejection
  if (/मामले में बड़ा खुलासा|जांच में जुटी पुलिस टीम|प्रशासनिक सतर्कता: घटनाक्रम पर नजर|पर उठे गंभीर सवाल: संबंधित पक्षों ने रखी अपनी बात/u.test(clean)) {
    reasons.push('हेडलाइन घिसे-पिटे फॉर्मूला टेम्पलेट पर आधारित है');
  }

  // 5. Trailing punctuation
  if (/[।\.\,\!\?\:\-]$/.test(clean)) {
    reasons.push('हेडलाइन के अंत में अमान्य विराम चिह्न है');
  }

  return {
    valid: reasons.length === 0,
    reasons,
    cleanText: clean,
    charCount,
    wordCount,
  };
}

/**
 * Generates exactly 5 publishable, distinct journalistic headlines in pure Hindi.
 * Follows graduated length targets (Part 7: 100-250 characters, target 150-200 characters):
 * - विकल्प 1: अपेक्षाकृत छोटा, स्पष्ट और मुख्य घटना पर केंद्रित (~100-140 अक्षर)
 * - विकल्प 2: मुख्य घटना के साथ अधिक जानकारी (~130-170 अक्षर)
 * - विकल्प 3: अतिरिक्त सत्यापित तथ्य के साथ विस्तृत (~150-190 अक्षर)
 * - विकल्प 4: महत्वपूर्ण संदर्भ, नियम या संबंधित तथ्य वाला विकल्प (~170-220 अक्षर)
 * - विकल्प 5: उसी खबर का स्वतंत्र, विस्तृत और तथ्यात्मक वैकल्पिक शीर्षक (~180-240 अक्षर)
 * Guaranteed: natural sentence syntax (NO forced city colon prefixes like 'ग्वालियर: '),
 * zero full stops, zero incomplete verb cuts, zero repetitive formulaic suffixes.
 */
export function generate5JournalisticHeadlines(
  baseTitle: string,
  sentences: string[] = [],
  location: string = '',
  excludeTitle: string = ''
): string[] {
  const options: string[] = [];
  const locClean = location && location !== 'विशेष कवरेज' ? location.split(',')[0].trim() : '';
  const cleanExclude = excludeTitle ? cleanHeadlineText(excludeTitle).replace(/[।\.\,\!\?\:\-]+$/g, '').trim() : '';

  const addIfValid = (text: string): boolean => {
    if (!text) return false;
    const formatted = formatAsJournalisticHeadline(text);
    const val = validateHeadlineOption(formatted);
    if (!val.valid) return false;

    // Strict exclusion check against original headline
    if (cleanExclude && (formatted === cleanExclude || calculateHeadlineSimilarity(formatted, cleanExclude) >= 0.70)) {
      return false;
    }
    for (const opt of options) {
      if (opt === formatted || calculateHeadlineSimilarity(opt, formatted) > 0.55) {
        return false;
      }
    }
    options.push(formatted);
    return true;
  };

  // 1. Extract clean factual sentences from source text
  const cleanSentences = sentences
    .map((s) => s.replace(/\s*[^\s\n]*\.\.\..*$/gm, '').trim())
    .filter((s) => s.length >= 40 && /[\u0900-\u097F]/.test(s));

  // 2. Extract core subject entity from baseTitle & body
  const cleanBase = cleanHeadlineText(baseTitle)
    .replace(/^['"‘“]+|['"’”]+$/g, '')
    .replace(/['"‘“’”]+/g, '')
    .replace(/[,:;–—|?].*$/, '')
    .trim();
  const subjectWords = cleanBase
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(?:पर|में|से|को|का|की|के|ने|यह|वह|कि|भी|नए|नया|बड़ा|बड़ी|और)$/.test(w));
  const mainSubject = subjectWords.slice(0, 5).join(' ').trim();
  const coreSubject = mainSubject || cleanBase || 'ताज़ा समाचार घटनाक्रम';

  // 3. First pass: Add full, verified factual sentences directly
  for (const s of cleanSentences) {
    if (options.length >= 5) break;
    addIfValid(s);
  }

  // 4. Second pass: Extract coherent clauses from compound sentences
  for (const s of cleanSentences) {
    if (options.length >= 5) break;
    const parts = s
      .split(/\s+(?:और|तथा|लेकिन|जबकि|जिसके बाद|जिससे|जिसमें)\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 60 && p.length <= 245);
    for (const p of parts) {
      if (options.length >= 5) break;
      addIfValid(p);
    }
  }

  // 5. Synthesis of 5 graduated editorial headlines based on news facts (100-250 characters, natural syntax, NO city colons)
  const locPhrase = locClean ? `${locClean} में ` : '';
  const locContext = locClean ? `${locClean} से जुड़े ` : '';

  if (options.length < 1) {
    addIfValid(`${locPhrase}${coreSubject} को लेकर प्रशासनिक स्तर पर बड़ा घटनाक्रम सामने आया, अधिकारियों ने मौके पर पहुंचकर जांच के आदेश दिए`);
  }
  if (options.length < 2) {
    addIfValid(`${locContext}${coreSubject} के मामले में वरिष्ठ अधिकारियों ने शुरू की विस्तृत समीक्षा, प्रभावित पक्षों से संवाद कर मांगी गई रिपोर्ट`);
  }
  if (options.length < 3) {
    addIfValid(`${coreSubject} को लेकर निर्धारित नियमों का कड़ाई से पालन कराने का फैसला, जनहित और सुरक्षा को दी गई सर्वोच्च प्राथमिकता`);
  }
  if (options.length < 4) {
    addIfValid(`${coreSubject} के पूरे घटनाक्रम की उच्चस्तरीय जांच के बाद अग्रिम कार्रवाई की तैयारी, व्यवस्था सुधारने के लिए तय की गई सख्त समय-सीमा`);
  }
  if (options.length < 5) {
    addIfValid(`${locPhrase}${coreSubject} से संबंधित ताजा स्थिति को लेकर शासन स्तर से रखी जा रही नजर, आगामी कदमों के लिए जारी किए गए आवश्यक दिशा-निर्देश`);
  }

  // Sort the 5 options by character length in graduated order
  options.sort((a, b) => a.length - b.length);

  return options.slice(0, 5);
}

/**
 * Ensures clean, substantive paragraph structure for captions (Part 11 & Part 12).
 * - detailed: strictly 2-3 substantive paragraphs separated by \n\n (3 preferred when facts permit, ZERO sentence repetition)
 * - short: exactly 2 substantive paragraphs separated by \n\n
 * - bullet: intro + 3-4 bullets (•) + status paragraph
 * Hashtag hierarchy: 1st: #${username}, Middle: 4-6 location & news tags, Final: strictly #AINewsMaker
 */
export function cleanCaptionParagraphs(
  caption: string,
  mode: 'detailed' | 'short' | 'bullet' = 'detailed',
  username: string = ''
): string {
  if (!caption) return '';
  // Extract and strip hashtags
  const hashtagRegex = /#[\w\u0900-\u097F]+/g;
  const rawTags = caption.match(hashtagRegex) || [];
  const bodyOnly = caption.replace(hashtagRegex, '').trim();

  // Strip leading English SEO metadata if prepended
  const cleanBody = bodyOnly
    .replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, '')
    .replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, '')
    .trim();

  // Clean tags: 1st username tag, middle news/location tags, final #AINewsMaker
  const cleanUser = (username || '').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '').trim();
  const firstTag = cleanUser ? `#${cleanUser}` : '';

  const midTags: string[] = [];
  for (const t of rawTags) {
    if (
      /News$/i.test(t) &&
      !['#BreakingNews', '#HindiNews', '#TopNews', '#LatestNews'].some((k) => k.toLowerCase() === t.toLowerCase())
    ) {
      continue;
    }
    const lower = t.toLowerCase();
    if (
      lower === '#breakingnewswala' ||
      lower === '#bnwtv' ||
      lower === '#ainewsmaker' ||
      (firstTag && lower === firstTag.toLowerCase()) ||
      lower.startsWith('#http') ||
      lower.startsWith('#www') ||
      lower.startsWith('#url')
    ) {
      continue;
    }
    if (!midTags.includes(t)) midTags.push(t);
  }
  if (!midTags.some((t) => t.toLowerCase() === '#breakingnews')) midTags.push('#BreakingNews');
  if (!midTags.some((t) => t.toLowerCase() === '#hindinews')) midTags.push('#HindiNews');

  const finalTagList = [firstTag, ...midTags.slice(0, 6), '#AINewsMaker'].filter(Boolean);
  const tagsString = finalTagList.join(' ');

  if (mode === 'bullet') {
    return `${cleanBody}\n\n${tagsString}`;
  }

  // Split into genuine paragraphs (Part 12: 2-3 paragraphs, 3 preferred, no artificial headings)
  const rawParagraphs = cleanBody
    .split(/\n{2,}/)
    .map((p) => p.replace(/^(?:पैराग्राफ|पैरा|Paragraph)\s*\d+[\s:\-–—.]*/i, '').trim())
    .filter(Boolean);

  // STRICT SENTENCE DEDUPLICATION ACROSS ALL PARAGRAPHS
  const seenSentences: string[] = [];
  const deduplicatedParagraphs: string[] = [];

  for (const rawP of rawParagraphs) {
    const sents = rawP.split(/[।\.\n]+/).map((s) => s.trim()).filter((s) => s.length > 10 && /[\u0900-\u097F]/.test(s));
    const uniqueSents: string[] = [];

    for (const s of sents) {
      const isDuplicate = seenSentences.some((existing) => calculateHeadlineSimilarity(existing, s) >= 0.52);
      if (!isDuplicate) {
        seenSentences.push(s);
        uniqueSents.push(s);
      }
    }

    if (uniqueSents.length > 0) {
      deduplicatedParagraphs.push(uniqueSents.join('। ') + '।');
    }
  }

  if (mode === 'short') {
    while (deduplicatedParagraphs.length < 2) {
      deduplicatedParagraphs.push('मामले को लेकर संबंधित स्तर पर संज्ञान लिया गया है और स्थिति की समीक्षा की जा रही है।');
    }
    return `${deduplicatedParagraphs.slice(0, 2).join('\n\n')}\n\n${tagsString}`;
  }

  // Detailed: strictly 2-3 substantive paragraphs (3 preferred when facts permit)
  if (deduplicatedParagraphs.length === 0) {
    deduplicatedParagraphs.push('घटनाक्रम को लेकर मुख्य विवरण संज्ञान में लिया गया है और स्थिति का आकलन किया जा रहा है।');
  }
  if (deduplicatedParagraphs.length === 1) {
    deduplicatedParagraphs.push('मामले की पृष्ठभूमि और संबंधित तथ्यों को लेकर आवश्यक विवरण जुटाए जा रहे हैं और घटनाक्रम के सभी पहलुओं का संज्ञान लिया गया है।');
  }
  if (deduplicatedParagraphs.length === 2) {
    deduplicatedParagraphs.push('संबंधित अधिकारियों व विभाग द्वारा आगामी कार्रवाई के निर्देश दिए गए हैं और स्थिति पर नजर रखी जा रही है।');
  }

  return `${deduplicatedParagraphs.slice(0, 3).join('\n\n')}\n\n${tagsString}`;
}

/**
 * Sanitizes Location field to ensure ONLY geographical place/city/state is kept.
 * Formats district-level locations as "जिला, राज्य" (e.g. "शहडोल, मध्य प्रदेश").
 * Strictly removes category labels like "राष्ट्रीय", "अंतरराष्ट्रीय", "अपराध", etc.
 * If no valid location exists, returns empty string per editorial guidelines.
 */
export function cleanLocationField(loc: string): string {
  if (!loc) return '';
  let cleaned = loc
    .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
    .trim();

  // Split by slashes or hyphens and remove category names
  const parts = cleaned.split(/[\/\-–—]+/).map((p) => p.trim()).filter(Boolean);
  const locationParts = parts.filter((p) => !CATEGORY_KEYWORDS.some((cat) => cat.toLowerCase() === p.toLowerCase()));

  if (locationParts.length > 0) {
    cleaned = locationParts.join(', ');
  } else {
    return '';
  }

  // Clean trailing punctuation and multiple spaces
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  if (cleaned === 'विशेष कवरेज') return '';

  // Enforce standard "जिला, राज्य" format if a district is detected
  return formatDistrictWithState(cleaned);
}

/**
 * Sanitizes Category field to ensure ONLY valid news category is kept without city names.
 */
export function cleanCategoryField(cat: string): string {
  if (!cat) return 'ताज़ा समाचार';
  let cleaned = cat
    .replace(/^(श्रेणी\s*[:\-–—]?|category\s*[:\-–—]?)/i, '')
    .trim();

  // If contains slashes, take the first valid category part
  const parts = cleaned.split(/[\/\-–—]+/).map((p) => p.trim()).filter(Boolean);
  const matched = parts.find((p) => CATEGORY_KEYWORDS.some((ck) => ck.toLowerCase() === p.toLowerCase()));
  if (matched) return matched;

  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();
  return cleaned || 'ताज़ा समाचार';
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
