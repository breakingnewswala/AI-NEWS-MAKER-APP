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

  // 2. Remove editorial fluff prefixes
  cleaned = cleaned
    .replace(/^(यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*/i, '')
    .trim();

  // 3. Remove prepended location or category label tags with colons/hyphens e.g. "नई दिल्ली / राष्ट्रीय: ..." or "भोपाल: ..."
  cleaned = cleaned
    .replace(/^(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|नई\s*दिल्ली|भोपाल|इंदौर|रीवा|जबलपुर|ग्वालियर|लखनऊ|पटना|जयपुर|रायपुर|वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय|विदेश|अपराध|क्राइम|सियासत|राजनीति|हादसा|प्रशासन|विकास|बिजनेस|कारोबार|विशेष\s*कवरेज|ताज़ा\s*समाचार|ताज़ा\s*ख़बर)\s*[:\-–—]\s*/i, '')
    .trim();

  // 4. Remove appended category/location tags at the end of headlines
  cleaned = cleaned
    .replace(/\s*[:\-–—]?\s*(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय)$/i, '')
    .trim();

  // 5. Strip trailing punctuation (. or । or ! or ? or , or - or :) repeatedly until clean
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();

  // 6. Clean spaces around highlight tags and punctuation (prevent "रेस्टोरेंट , किचन" spaces before commas)
  cleaned = cleaned
    .replace(/\[(highlight|yellow)\]\s+/g, '[$1]')
    .replace(/\s+\[\/(highlight|yellow)\]/g, '[/$1]')
    .replace(/\s+([,\.!\?:;।])/g, '$1');

  // 7. Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

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

/**
 * Detects genuine event location from news facts, title, and URL.
 * Prioritizes district-level matches over generic states, and never defaults to "नई दिल्ली" due to site categories.
 */
export function detectDistrictAndState(
  title: string = '',
  desc: string = '',
  content: string = '',
  url: string = ''
): string {
  const primaryText = `${title} ${desc} ${url}`.toLowerCase();
  const allText = `${title} ${desc} ${content} ${url}`.toLowerCase();

  // 1. Check title/URL/desc first for specific district
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
    for (const a of d.aliases) {
      if (primaryText.includes(a.toLowerCase())) {
        return `${d.district}, ${d.state}`;
      }
    }
  }

  // 2. Check full content for specific district
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === 'दिल्ली' || d.district === 'नई दिल्ली') continue;
    for (const a of d.aliases) {
      if (allText.includes(a.toLowerCase())) {
        return `${d.district}, ${d.state}`;
      }
    }
  }

  // 3. Check for international places
  if (/वाशिंगटन|व्हाइट हाउस|अमेरिका|trump|व्हाइटहाउस|us|usa/i.test(primaryText)) {
    return 'वाशिंगटन';
  }
  if (/रूस|मास्को|moscow/i.test(primaryText)) return 'मास्को';
  if (/ब्रिटेन|लंदन|london/i.test(primaryText)) return 'लंदन';

  // 4. Genuine Delhi only when explicitly in title/event context (not just navigation/portal keywords)
  if (/(?:संसद\s*भवन|राष्ट्रपति\s*भवन|सुप्रीम\s*कोर्ट|नई\s*दिल्ली|राजधानी\s*दिल्ली)/i.test(primaryText)) {
    return 'नई दिल्ली';
  }

  // 5. State-level fallback if explicitly referenced
  const states = ['मध्य प्रदेश', 'उत्तर प्रदेश', 'बिहार', 'राजस्थान', 'उत्तराखंड', 'छत्तीसगढ़', 'महाराष्ट्र', 'गुजरात', 'झारखंड', 'पंजाब', 'हरियाणा'];
  for (const st of states) {
    if (primaryText.includes(st.toLowerCase())) {
      return st;
    }
  }

  return '';
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
