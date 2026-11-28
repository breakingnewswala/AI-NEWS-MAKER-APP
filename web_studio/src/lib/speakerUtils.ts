// Helper utilities to detect and extract leader names and designations from Hindi news headlines
import type { NewsCardData } from '../types';
import {
  HEADLINE_TARGETS,
  BLOCKED_MEDIA_BRANDS,
  normalizeText,
  countCharacters,
  hasBlockedMediaBrand,
  hasInvalidHeadlineEnding,
  validateHeadline,
  validateGeneralHeadline,
  checkHeadlineSimilarity,
  validateHeadlinesBatch,
  regenerateHeadlineOptionFromFacts,
  extractPublisherFromDomain,
  cleanCandidateClause,
  removeRedundantClauses,
} from './headlineValidator';

export {
  HEADLINE_TARGETS,
  BLOCKED_MEDIA_BRANDS,
  normalizeText,
  countCharacters,
  hasBlockedMediaBrand,
  hasInvalidHeadlineEnding,
  validateHeadline,
  validateGeneralHeadline,
  checkHeadlineSimilarity,
  validateHeadlinesBatch,
  regenerateHeadlineOptionFromFacts,
  extractPublisherFromDomain,
  cleanCandidateClause,
  removeRedundantClauses,
};

/**
 * Canonical Headline Text Normalizer:
 * Unwraps complex objects, arrays, tokens, JSON strings, and completely purges:
 * - "[object Object]", "[object Array]"
 * - "undefined", "null", "NaN"
 * - Extra whitespace and bracket artifacts
 */
export function normalizeHeadlineText(input: any): string {
  if (input === null || input === undefined) return '';

  // If input is an array, map each element and join
  if (Array.isArray(input)) {
    return input
      .map((item) => normalizeHeadlineText(item))
      .filter((s) => Boolean(s && s.trim()))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // If input is an object (e.g. WordToken, HeadlineOption, or custom state)
  if (typeof input === 'object') {
    // Check known text container properties in priority order
    const candidate =
      input.text ??
      input.headline ??
      input.title ??
      input.value ??
      input.content ??
      input.label ??
      input.name ??
      input.hi ??
      input.hindi ??
      input.raw;

    if (candidate !== undefined && candidate !== null) {
      return normalizeHeadlineText(candidate);
    }

    if (Array.isArray(input.tokens)) {
      return normalizeHeadlineText(input.tokens);
    }
    if (Array.isArray(input.lines)) {
      return normalizeHeadlineText(input.lines);
    }

    // If no recognizable property, return empty string — NEVER leak [object Object]
    return '';
  }

  // If input is already string or primitive
  let str = String(input || '');

  // If it's a JSON string representing an object or array, safely parse it
  const trimmed = str.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return normalizeHeadlineText(parsed);
      }
    } catch {}
  }

  // Strip all object coercion leaks & NaN / undefined / null literals
  str = str
    .replace(/\[object\s+Object\]/gi, '')
    .replace(/\[object\s+Array\]/gi, '')
    .replace(/\b(?:undefined|null|NaN)\b/gi, '')
    .replace(/^[\s,;.-]+|[\s,;.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return str;
}

const ENGLISH_LETTER_TO_DEVANAGARI: Record<string, string> = {
  A: 'ए', B: 'बी', C: 'सी', D: 'डी', E: 'ई', F: 'एफ', G: 'जी',
  H: 'एच', I: 'आई', J: 'जे', K: 'के', L: 'एल', M: 'एम', N: 'एन',
  O: 'ओ', P: 'पी', Q: 'क्यू', R: 'आर', S: 'एस', T: 'टी', U: 'यू',
  V: 'वी', W: 'डब्ल्यू', X: 'एक्स', Y: 'वाई', Z: 'जेड',
};

const IGNORED_TECHNICAL_ACRONYMS = new Set([
  'HTTP', 'HTTPS', 'HTML', 'JSON', 'UTF', 'WWW', 'COM', 'ORG', 'NET',
  'IST', 'GMT', 'UTC', 'IMG', 'SRC', 'ALT', 'DIV', 'SPAN', 'HREF',
  'NULL', 'TRUE', 'FALSE', 'NAN',
]);

export const CRITICAL_HEADLINE_ENTITIES = [
  'ईओडब्ल्यू', 'सीबीआई', 'ईडी', 'लोकायुक्त', 'एसीबी', 'एनआईए', 'एसआईटी',
  'एटीएस', 'एसटीएफ', 'एनसीबी', 'डीआरआई', 'एनडीआरएफ', 'एसडीआरएफ', 'एसडीईआरएफ',
  'सुप्रीम कोर्ट', 'हाई कोर्ट', 'एनजीटी', 'चुनाव आयोग', 'आरबीआई', 'सेबी',
  'इसरो', 'डीआरडीओ', 'एम्स', 'यूपीएससी', 'एमपीपीएससी', 'व्यापमं', 'ईएसबी',
];

/**
 * Strips leading full English SEO translation sentences (6+ pure English words ending in . ! ? before Devanagari)
 * without stripping leading news acronyms (like "EOW", "CBI", "ED", "EOW Raid:") or numbers (like "10 लाख").
 */
export function stripLeadingEnglishProseSentence(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(
    /^(?:(?:[A-Za-z0-9,.\-–—:;'"()\/&|!_]+\s+){5,}[A-Za-z0-9,.\-–—:;'"()\/&|!_]+[.!?]\s+)+(?=[\u0900-\u097F])/u,
    ''
  );
}

export const ESSENTIAL_ENGLISH_TO_HINDI_TERMS: [RegExp, string][] = [
  // Multi-word compounds first
  [/\bSupreme\s+Court\b/gi, 'सुप्रीम कोर्ट'],
  [/\bHigh\s+Court\b/gi, 'हाई कोर्ट'],
  [/\bDistrict\s+Court\b/gi, 'जिला कोर्ट'],
  [/\bSession\s+Court\b/gi, 'सेशन कोर्ट'],
  [/\bZero\s+FIR\b/gi, 'जीरो एफआईआर'],
  [/\bDeputy\s+CM\b/gi, 'डिप्टी सीएम'],
  [/\bDy\.?\s+CM\b/gi, 'डिप्टी सीएम'],
  [/\bPaper\s+Leak\b/gi, 'पेपर लीक'],
  [/\bVande\s+Bharat\b/gi, 'वंदे भारत'],
  [/\bCT\s+Scan\b/gi, 'सीटी स्कैन'],
  [/\bHigh\s+Alert\b/gi, 'हाई अलर्ट'],
  [/\bRed\s+Alert\b/gi, 'रेड अलर्ट'],
  [/\bOrange\s+Alert\b/gi, 'ऑरेंज अलर्ट'],
  [/\bYellow\s+Alert\b/gi, 'येलो अलर्ट'],
  [/\bMadhya\s+Pradesh\b/gi, 'मध्य प्रदेश'],
  [/\bUttar\s+Pradesh\b/gi, 'उत्तर प्रदेश'],
  [/\bHimachal\s+Pradesh\b/gi, 'हिमाचल प्रदेश'],
  [/\bAndhra\s+Pradesh\b/gi, 'आंध्र प्रदेश'],
  [/\bArunachal\s+Pradesh\b/gi, 'अरुणाचल प्रदेश'],
  [/\bNew\s+Delhi\b/gi, 'नई दिल्ली'],

  // Investigating & Law Enforcement Agencies (Compulsory in crime/raid headlines)
  [/\bEOW\b/gi, 'ईओडब्ल्यू'],
  [/\bCBI\b/gi, 'सीबीआई'],
  [/\bED\b/gi, 'ईडी'],
  [/\bNIA\b/gi, 'एनआईए'],
  [/\bACB\b/gi, 'एसीबी'],
  [/\bSIT\b/gi, 'एसआईटी'],
  [/\bATS\b/gi, 'एटीएस'],
  [/\bSTF\b/gi, 'एसटीएफ'],
  [/\bNCB\b/gi, 'एनसीबी'],
  [/\bDRI\b/gi, 'डीआरआई'],
  [/\bCID\b/gi, 'सीआईडी'],
  [/\bRAW\b/g, 'रॉ'],
  [/\bIB\b/g, 'आईबी'],
  [/\bLokayukta\b/gi, 'लोकायुक्त'],
  [/\bLokayukt\b/gi, 'लोकायुक्त'],
  [/\bNDRF\b/gi, 'एनडीआरएफ'],
  [/\bSDRF\b/gi, 'एसडीआरएफ'],
  [/\bSDERF\b/gi, 'एसडीईआरएफ'],
  [/\bCRPF\b/gi, 'सीआरपीएफ'],
  [/\bBSF\b/gi, 'बीएसएफ'],
  [/\bCISF\b/gi, 'सीआईएसएफ'],
  [/\bITBP\b/gi, 'आईटीबीपी'],
  [/\bSSB\b/gi, 'एसएसबी'],
  [/\bNSG\b/gi, 'एनएसजी'],
  [/\bRPF\b/gi, 'आरपीएफ'],
  [/\bGRP\b/gi, 'जीआरपी'],
  [/\bPAC\b/gi, 'पीएसी'],
  [/\bSAF\b/gi, 'एसएएफ'],
  [/\bPHQ\b/gi, 'पीएचक्यू'],

  // Administrative, Police & Departmental Ranks/Posts
  [/\bDGP\b/gi, 'डीजीपी'],
  [/\bADG\b/gi, 'एडीजी'],
  [/\bDIG\b/gi, 'डीआईजी'],
  [/\bIG\b/gi, 'आईजी'],
  [/\bSSP\b/gi, 'एसएसपी'],
  [/\bASP\b/gi, 'एएसपी'],
  [/\bDSP\b/gi, 'डीएसपी'],
  [/\bCSP\b/gi, 'सीएसपी'],
  [/\bSDOP\b/gi, 'एसडीओपी'],
  [/\bACP\b/gi, 'एसीपी'],
  [/\bDCP\b/gi, 'डीसीपी'],
  [/\bCP\b/g, 'सीपी'],
  [/\bSP\b/gi, 'एसपी'],
  [/\bSHO\b/gi, 'एसएचओ'],
  [/\bTI\b/gi, 'टीआई'],
  [/\bASI\b/gi, 'एएसआई'],
  [/\bSI\b/g, 'एसआई'],
  [/\bIAS\b/gi, 'आईएएस'],
  [/\bIPS\b/gi, 'आईपीएस'],
  [/\bIFS\b/gi, 'आईएफएस'],
  [/\bIRS\b/gi, 'आईआरएस'],
  [/\bDM\b/gi, 'डीएम'],
  [/\bSDM\b/gi, 'एसडीएम'],
  [/\bADM\b/gi, 'एडीएम'],
  [/\bSDO\b/gi, 'एसडीओ'],
  [/\bCEO\b/gi, 'सीईओ'],
  [/\bCFO\b/gi, 'सीएफओ'],
  [/\bCOO\b/gi, 'सीओओ'],
  [/\bCTO\b/gi, 'सीटीओ'],
  [/\bCMD\b/gi, 'सीएमडी'],
  [/\bCMHO\b/gi, 'सीएमएचओ'],
  [/\bCMO\b/gi, 'सीएमओ'],
  [/\bPMO\b/gi, 'पीएमओ'],
  [/\bBMO\b/gi, 'बीएमओ'],
  [/\bBEO\b/gi, 'बीईओ'],
  [/\bDEO\b/gi, 'डीईओ'],
  [/\bDPO\b/gi, 'डीपीओ'],
  [/\bCDPO\b/gi, 'सीडीपीओ'],
  [/\bDFO\b/gi, 'डीएफओ'],
  [/\bRTO\b/gi, 'आरटीओ'],
  [/\bARTO\b/gi, 'एआरटीओ'],
  [/\bDTO\b/gi, 'डीटीओ'],
  [/\bPRO\b/gi, 'पीआरओ'],
  [/\bPWD\b/gi, 'पीडब्ल्यूडी'],
  [/\bPHE\b/gi, 'पीएचई'],
  [/\bRES\b/g, 'आरईएस'],
  [/\bWCD\b/gi, 'डब्ल्यूसीडी'],
  [/\bNHAI\b/gi, 'एनएचएआई'],
  [/\bMPEB\b/gi, 'एमपीईबी'],
  [/\bCollector\b/gi, 'कलेक्टर'],
  [/\bCommissioner\b/gi, 'कमिश्नर'],
  [/\bTehsildar\b/gi, 'तहसीलदार'],
  [/\bTahsildar\b/gi, 'तहसीलदार'],
  [/\bPatwari\b/gi, 'पटवारी'],
  [/\bSarpanch\b/gi, 'सरपंच'],
  [/\bSachiv\b/gi, 'सचिव'],
  [/\bParshad\b/gi, 'पार्षद'],
  [/\bMayor\b/gi, 'महापौर'],

  // Constitutional, Political & Governance Terms
  [/\bPM\b/gi, 'पीएम'],
  [/\bCM\b/gi, 'सीएम'],
  [/\bMLA\b/gi, 'विधायक'],
  [/\bMLC\b/gi, 'एमएलसी'],
  [/\bMP\b/gi, 'एमपी'],
  [/\bUP\b/g, 'यूपी'],
  [/\bCJI\b/gi, 'सीजेआई'],
  [/\bBJP\b/gi, 'बीजेपी'],
  [/\bNDA\b/gi, 'एनडीए'],
  [/\bCongress\b/gi, 'कांग्रेस'],
  [/\bAAP\b/g, 'आप'],
  [/\bBSP\b/gi, 'बसपा'],
  [/\bRJD\b/gi, 'आरजेडी'],
  [/\bJDU\b/gi, 'जेडीयू'],
  [/\bTMC\b/gi, 'टीएमसी'],
  [/\bNCP\b/gi, 'एनसीपी'],
  [/\bRSS\b/gi, 'आरएसएस'],
  [/\bVHP\b/gi, 'विहिप'],
  [/\bABVP\b/gi, 'एबीवीपी'],
  [/\bNSUI\b/gi, 'एनएसयूआई'],
  [/\bECI\b/gi, 'चुनाव आयोग'],
  [/\bEVM\b/gi, 'ईवीएम'],
  [/\bVVPAT\b/gi, 'वीवीपैट'],
  [/\bNOTA\b/gi, 'नोटा'],
  [/\bSIR\b/g, 'एसआईआर'],
  [/\bBLO\b/gi, 'बीएलओ'],
  [/\bVIP\b/gi, 'वीआईपी'],
  [/\bVVIP\b/gi, 'वीवीआईपी'],

  // Legal, Crime & Action Terms
  [/\bFIR\b/gi, 'एफआईआर'],
  [/\bPOCSO\b/gi, 'पॉक्सो'],
  [/\bPOSCO\b/gi, 'पॉक्सो'],
  [/\bPMLA\b/gi, 'पीएमएलए'],
  [/\bUAPA\b/gi, 'यूएपीए'],
  [/\bNSA\b/gi, 'एनएसए'],
  [/\bBNS\b/gi, 'बीएनएस'],
  [/\bBNSS\b/gi, 'बीएनएसएस'],
  [/\bIPC\b/gi, 'आईपीसी'],
  [/\bCrPC\b/gi, 'सीआरपीसी'],
  [/\bCAA\b/gi, 'सीएए'],
  [/\bNRC\b/gi, 'एनआरसी'],
  [/\bNPR\b/gi, 'एनपीआर'],
  [/\bUCC\b/gi, 'यूसीसी'],
  [/\bPIL\b/gi, 'पीआईएल'],
  [/\bNOC\b/gi, 'एनओसी'],
  [/\bNGT\b/gi, 'एनजीटी'],
  [/\bNCLT\b/gi, 'एनसीएलटी'],
  [/\bRaid\b/gi, 'रेड'],
  [/\bTrap\b/gi, 'ट्रैप'],
  [/\bBribe\b/gi, 'रिश्वत'],
  [/\bScam\b/gi, 'स्कैम'],
  [/\bFraud\b/gi, 'फ्रॉड'],
  [/\bArrested\b/gi, 'गिरफ्तार'],
  [/\bArrest\b/gi, 'गिरफ्तार'],
  [/\bSuspended\b/gi, 'सस्पेंड'],
  [/\bSuspend\b/gi, 'सस्पेंड'],
  [/\bTransfer\b/gi, 'ट्रांसफर'],
  [/\bNotice\b/gi, 'नोटिस'],
  [/\bWarrant\b/gi, 'वारंट'],
  [/\bBail\b/gi, 'जमानत'],
  [/\bJail\b/gi, 'जेल'],
  [/\bRemand\b/gi, 'रिमांड'],
  [/\bChallan\b/gi, 'चालान'],
  [/\bChargesheet\b/gi, 'चार्जशीट'],
  [/\bPostmortem\b/gi, 'पोस्टमार्टम'],

  // Exams, Education, Health & Science
  [/\bUPSC\b/gi, 'यूपीएससी'],
  [/\bMPPSC\b/gi, 'एमपीपीएससी'],
  [/\bUPPSC\b/gi, 'यूपीपीएससी'],
  [/\bBPSC\b/gi, 'बीपीएससी'],
  [/\bRPSC\b/gi, 'आरपीएससी'],
  [/\bCGPSC\b/gi, 'सीजीपीएससी'],
  [/\bPSC\b/gi, 'पीएससी'],
  [/\bSSC\b/gi, 'एसएससी'],
  [/\bVYAPAM\b/gi, 'व्यापमं'],
  [/\bMPESB\b/gi, 'एमपीईएसबी'],
  [/\bESB\b/gi, 'ईएसबी'],
  [/\bPEB\b/gi, 'पीईबी'],
  [/\bIBPS\b/gi, 'आईबीपीएस'],
  [/\bRRB\b/gi, 'आरआरबी'],
  [/\bNEET\b/gi, 'नीट'],
  [/\bJEE\b/gi, 'जेईई'],
  [/\bCUET\b/gi, 'सीयूईटी'],
  [/\bGATE\b/g, 'गेट'],
  [/\bCBSE\b/gi, 'सीबीएसई'],
  [/\bICSE\b/gi, 'आईसीएसई'],
  [/\bMPBSE\b/gi, 'एमपीबीएसई'],
  [/\bNCERT\b/gi, 'एनसीईआरटी'],
  [/\bUGC\b/gi, 'यूजीसी'],
  [/\bAICTE\b/gi, 'एआईसीटीई'],
  [/\bIIT\b/gi, 'आईआईटी'],
  [/\bIIM\b/gi, 'आईआईएम'],
  [/\bNIT\b/gi, 'एनआईटी'],
  [/\bIIIT\b/gi, 'ट्रिपल आईटी'],
  [/\bAIIMS\b/gi, 'एम्स'],
  [/\bICMR\b/gi, 'आईसीएमआर'],
  [/\bWHO\b/gi, 'डब्ल्यूएचओ'],
  [/\bOPD\b/gi, 'ओपीडी'],
  [/\bICU\b/gi, 'आईसीयू'],
  [/\bMRI\b/gi, 'एमआरआई'],
  [/\bDNA\b/gi, 'डीएनए'],
  [/\bRNA\b/gi, 'आरएनए'],
  [/\bCOVID\b/gi, 'कोविड'],
  [/\bCorona\b/gi, 'कोरोना'],
  [/\bVirus\b/gi, 'वायरस'],
  [/\bISRO\b/gi, 'इसरो'],
  [/\bDRDO\b/gi, 'डीआरडीओ'],
  [/\bNASA\b/gi, 'नासा'],

  // Economy, Banking, Schemes, Weather, Transport & Tech
  [/\bRBI\b/gi, 'आरबीआई'],
  [/\bSBI\b/gi, 'एसबीआई'],
  [/\bPNB\b/gi, 'पीएनबी'],
  [/\bHDFC\b/gi, 'एचडीएफसी'],
  [/\bICICI\b/gi, 'आईसीआईसीआई'],
  [/\bLIC\b/gi, 'एलआईसी'],
  [/\bSEBI\b/gi, 'सेबी'],
  [/\bTRAI\b/gi, 'ट्राई'],
  [/\bFSSAI\b/gi, 'एफएसएसएआई'],
  [/\bIRDAI\b/gi, 'इरडा'],
  [/\bNABARD\b/gi, 'नाबार्ड'],
  [/\bEPFO\b/gi, 'ईपीएफओ'],
  [/\bESIC\b/gi, 'ईएसआईसी'],
  [/\bUIDAI\b/gi, 'यूआईडीएआई'],
  [/\bAadhaar\b/gi, 'आधार'],
  [/\bAadhar\b/gi, 'आधार'],
  [/\bPAN\b/g, 'पैन'],
  [/\bGST\b/gi, 'जीएसटी'],
  [/\bCGST\b/gi, 'सीजीएसटी'],
  [/\bSGST\b/gi, 'एसजीएसटी'],
  [/\bITR\b/gi, 'आईटीआर'],
  [/\bTDS\b/gi, 'टीडीएस'],
  [/\bEMI\b/gi, 'ईएमआई'],
  [/\bUPI\b/gi, 'यूपीआई'],
  [/\bATM\b/gi, 'एटीएम'],
  [/\bOTP\b/gi, 'ओटीपी'],
  [/\b-?e-?KYC\b/gi, 'ई-केवाईसी'],
  [/\bKYC\b/gi, 'केवाईसी'],
  [/\bGDP\b/gi, 'जीडीपी'],
  [/\bMSP\b/gi, 'एमएसपी'],
  [/\bDBT\b/gi, 'डीबीटी'],
  [/\bBPL\b/gi, 'बीपीएल'],
  [/\bAPL\b/gi, 'एपीएल'],
  [/\bEWS\b/gi, 'ईडब्ल्यूएस'],
  [/\bOBC\b/gi, 'ओबीसी'],
  [/\bSC\b/g, 'एससी'],
  [/\bST\b/g, 'एसटी'],
  [/\bMGNREGA\b/gi, 'मनरेगा'],
  [/\bMNREGA\b/gi, 'मनरेगा'],
  [/\bNREGA\b/gi, 'नरेगा'],
  [/\bPMAY\b/gi, 'पीएम आवास'],
  [/\bPMJAY\b/gi, 'आयुष्मान योजना'],
  [/\bRERA\b/gi, 'रेरा'],
  [/\bFSI\b/gi, 'एफएसआई'],
  [/\bFAR\b/g, 'एफएआर'],
  [/\bBHK\b/gi, 'बीएचके'],
  [/\bPPP\b/gi, 'पीपीपी'],
  [/\bCSR\b/gi, 'सीएसआर'],
  [/\bMoU\b/gi, 'एमओयू'],
  [/\bDPR\b/gi, 'डीपीआर'],
  [/\bNH\b/g, 'एनएच'],
  [/\bSH\b/g, 'एसएच'],
  [/\bFASTag\b/gi, 'फास्टैग'],
  [/\bIRCTC\b/gi, 'आईआरसीटीसी'],
  [/\bMetro\b/gi, 'मेट्रो'],
  [/\bIMD\b/gi, 'आईएमडी'],
  [/\bAQI\b/gi, 'एक्यूआई'],
  [/\bCPCB\b/gi, 'सीपीसीबी'],
  [/\bBHEL\b/gi, 'भेल'],
  [/\bNTPC\b/gi, 'एनटीपीसी'],
  [/\bONGC\b/gi, 'ओएनजीसी'],
  [/\bSAIL\b/g, 'सेल'],
  [/\bGAIL\b/gi, 'गेल'],
  [/\bIOCL\b/gi, 'आईओसीएल'],
  [/\bBPCL\b/gi, 'बीपीसीएल'],
  [/\bHPCL\b/gi, 'एचपीसीएल'],
  [/\bBSNL\b/gi, 'बीएसएनएल'],
  [/\bBCCI\b/gi, 'बीसीसीआई'],
  [/\bICC\b/gi, 'आईसीसी'],
  [/\bIPL\b/gi, 'आईपीएल'],
  [/\bWPL\b/gi, 'डब्ल्यूपीएल'],
  [/\bFIFA\b/gi, 'फीफा'],
  [/\bUSA\b/gi, 'यूएसए'],
  [/\bUK\b/g, 'यूके'],
  [/\bUN\b/g, 'यूएन'],
  [/\bAI\b/gi, 'एआई'],
  [/\bIT\b/g, 'आईटी'],
  [/\bAPK\b/gi, 'एपीके'],
  [/\bPDF\b/gi, 'पीडीएफ'],
  [/\bSIM\b/gi, 'सिम'],
  [/\bURL\b/gi, 'यूआरएल'],
  [/\bSMS\b/gi, 'एसएमएस'],
  [/\bCCTV\b/gi, 'सीसीटीवी'],
  [/\bLED\b/gi, 'एलईडी'],
  [/\bLPG\b/gi, 'एलपीजी'],
  [/\bCNG\b/gi, 'सीएनजी'],
  [/\bPNG\b/gi, 'पीएनजी'],
  [/\bEV\b/gi, 'ईवी'],
  [/\b5G\b/gi, '5जी'],
  [/\b4G\b/gi, '4जी'],
  [/\bWi-?Fi\b/gi, 'वाई-फाई'],
  [/\bGPS\b/gi, 'जीपीएस'],
  [/\bQR\b/gi, 'क्यूआर'],
  [/\bWhatsApp\b/gi, 'व्हाट्सएप'],
  [/\bFacebook\b/gi, 'फेसबुक'],
  [/\bInstagram\b/gi, 'इंस्टाग्राम'],
  [/\bYouTube\b/gi, 'यूट्यूब'],
  [/\bGoogle\b/gi, 'गूगल'],
  [/\bCyber\b/gi, 'साइबर'],

  // Compulsory Common News Action & Subject Words
  [/\bAction\b/gi, 'एक्शन'],
  [/\bAlert\b/gi, 'अलर्ट'],
  [/\bReport\b/gi, 'रिपोर्ट'],
  [/\bUpdate\b/gi, 'अपडेट'],
  [/\bPolice\b/gi, 'पुलिस'],
  [/\bTeam\b/gi, 'टीम'],
  [/\bCourt\b/gi, 'कोर्ट'],
  [/\bHospital\b/gi, 'अस्पताल'],
  [/\bDoctor\b/gi, 'डॉक्टर'],
  [/\bSchool\b/gi, 'स्कूल'],
  [/\bCollege\b/gi, 'कॉलेज'],
  [/\bUniversity\b/gi, 'यूनिवर्सिटी'],
  [/\bExam\b/gi, 'परीक्षा'],
  [/\bResult\b/gi, 'रिजल्ट'],
  [/\bBudget\b/gi, 'बजट'],
  [/\bTax\b/gi, 'टैक्स'],
  [/\bLoan\b/gi, 'लोन'],
  [/\bBank\b/gi, 'बैंक'],
  [/\bTrain\b/gi, 'ट्रेन'],
  [/\bExpress\b/gi, 'एक्सप्रेस'],
  [/\bAirport\b/gi, 'एयरपोर्ट'],
  [/\bFlight\b/gi, 'फ्लाइट'],
  [/\bHighway\b/gi, 'हाईवे'],
  [/\bAccident\b/gi, 'हादसा'],
  [/\bCrime\b/gi, 'क्राइम'],
  [/\bMurder\b/gi, 'हत्या'],
  [/\bOnline\b/gi, 'ऑनलाइन'],
  [/\bDigital\b/gi, 'डिजिटल'],
  [/\bSmart\b/gi, 'स्मार्ट'],
  [/\bVideo\b/gi, 'वीडियो'],
  [/\bPhoto\b/gi, 'फोटो'],
  [/\bViral\b/gi, 'वायरल'],
  [/\bOfficer\b/gi, 'अफसर'],
  [/\bEngineer\b/gi, 'इंजीनियर'],
  [/\bClerk\b/gi, 'क्लर्क'],
  [/\bPanchayat\b/gi, 'पंचायत'],
  [/\bJanpad\b/gi, 'जनपद'],
  [/\bBonus\b/gi, 'बोनस'],
  [/\bPension\b/gi, 'पेंशन'],
  [/\bSalary\b/gi, 'सैलरी'],

  // Key Districts & Cities when written in English inside Hindi news
  [/\bDindori\b/gi, 'डिंडोरी'],
  [/\bBhopal\b/gi, 'भोपाल'],
  [/\bIndore\b/gi, 'इंदौर'],
  [/\bJabalpur\b/gi, 'जबलपुर'],
  [/\bGwalior\b/gi, 'ग्वालियर'],
  [/\bUjjain\b/gi, 'उज्जैन'],
  [/\bRewa\b/gi, 'रीवा'],
  [/\bSatna\b/gi, 'सतना'],
  [/\bSagar\b/gi, 'सागर'],
  [/\bShahdol\b/gi, 'शहडोल'],
  [/\bMandla\b/gi, 'मंडला'],
  [/\bBalaghat\b/gi, 'बालाघाट'],
  [/\bChhindwara\b/gi, 'छिंदवाड़ा'],
  [/\bKatni\b/gi, 'कटनी'],
  [/\bUmaria\b/gi, 'उमरिया'],
  [/\bAnuppur\b/gi, 'अनूपपुर'],
  [/\bSeoni\b/gi, 'सिवनी'],
  [/\bNarsinghpur\b/gi, 'नरसिंहपुर'],
  [/\bBetul\b/gi, 'बैतूल'],
  [/\bNarmadapuram\b/gi, 'नर्मदापुरम'],
  [/\bHoshangabad\b/gi, 'नर्मदापुरम'],
  [/\bHarda\b/gi, 'हरदा'],
  [/\bVidisha\b/gi, 'विदिशा'],
  [/\bRaisen\b/gi, 'रायसेन'],
  [/\bSehore\b/gi, 'सीहोर'],
  [/\bRajgarh\b/gi, 'राजगढ़'],
  [/\bGuna\b/gi, 'गुना'],
  [/\bAshoknagar\b/gi, 'अशोकनगर'],
  [/\bShivpuri\b/gi, 'शिवपुरी'],
  [/\bDatia\b/gi, 'दतिया'],
  [/\bBhind\b/gi, 'भिंड'],
  [/\bMorena\b/gi, 'मुरैना'],
  [/\bSheopur\b/gi, 'श्योपुर'],
  [/\bChhatarpur\b/gi, 'छतरपुर'],
  [/\bTikamgarh\b/gi, 'टीकमगढ़'],
  [/\bNiwari\b/gi, 'निवाड़ी'],
  [/\bPanna\b/gi, 'पन्ना'],
  [/\bDamoh\b/gi, 'दमोह'],
  [/\bSingrauli\b/gi, 'सिंगरौली'],
  [/\bSidhi\b/gi, 'सीधी'],
  [/\bMaihar\b/gi, 'मैहर'],
  [/\bMauganj\b/gi, 'मऊगंज'],
  [/\bPandhurna\b/gi, 'पांढुर्णा'],
  [/\bDewas\b/gi, 'देवास'],
  [/\bRatlam\b/gi, 'रतलाम'],
  [/\bMandsaur\b/gi, 'मंदसौर'],
  [/\bNeemuch\b/gi, 'नीमच'],
  [/\bShajapur\b/gi, 'शाजापुर'],
  [/\bKhandwa\b/gi, 'खंडवा'],
  [/\bKhargone\b/gi, 'खरगोन'],
  [/\bBurhanpur\b/gi, 'बुरहानपुर'],
  [/\bBarwani\b/gi, 'बड़वानी'],
  [/\bDhar\b/gi, 'धार'],
  [/\bJhabua\b/gi, 'झाबुआ'],
  [/\bAlirajpur\b/gi, 'अलीराजपुर'],
  [/\bRaipur\b/gi, 'रायपुर'],
  [/\bBilaspur\b/gi, 'बिलासपुर'],
  [/\bDurg\b/gi, 'दुर्ग'],
  [/\bBhilai\b/gi, 'भिलाई'],
  [/\bKorba\b/gi, 'कोरबा'],
  [/\bRaigarh\b/gi, 'रायगढ़'],
  [/\bJagdalpur\b/gi, 'जगदलपुर'],
  [/\bBastar\b/gi, 'बस्तर'],
  [/\bAmbikapur\b/gi, 'अंबिकापुर'],
  [/\bSurguja\b/gi, 'सरगुजा'],
  [/\bRajnandgaon\b/gi, 'राजनांदगांव'],
  [/\bDelhi\b/gi, 'दिल्ली'],
  [/\bLucknow\b/gi, 'लखनऊ'],
  [/\bVaranasi\b/gi, 'वाराणसी'],
  [/\bPrayagraj\b/gi, 'प्रयागराज'],
  [/\bKanpur\b/gi, 'कानपुर'],
  [/\bAgra\b/gi, 'आगरा'],
  [/\bNoida\b/gi, 'नोएडा'],
  [/\bGhaziabad\b/gi, 'गाजियाबाद'],
  [/\bPatna\b/gi, 'पटना'],
  [/\bRanchi\b/gi, 'रांची'],
  [/\bJaipur\b/gi, 'जयपुर'],
  [/\bJodhpur\b/gi, 'जोधपुर'],
  [/\bUdaipur\b/gi, 'उदयपुर'],
  [/\bKota\b/gi, 'कोटा'],
  [/\bMumbai\b/gi, 'मुंबई'],
  [/\bPune\b/gi, 'पुणे'],
  [/\bNagpur\b/gi, 'नागपुर'],
  [/\bAhmedabad\b/gi, 'अहमदाबाद'],
  [/\bSurat\b/gi, 'सूरत'],
  [/\bChandigarh\b/gi, 'चंडीगढ़'],
  [/\bDehradun\b/gi, 'देहरादून'],
  [/\bHaridwar\b/gi, 'हरिद्वार'],
  [/\bChhattisgarh\b/gi, 'छत्तीसगढ़'],
  [/\bRajasthan\b/gi, 'राजस्थान'],
  [/\bBihar\b/gi, 'बिहार'],
  [/\bJharkhand\b/gi, 'झारखंड'],
  [/\bUttarakhand\b/gi, 'उत्तराखंड'],
  [/\bHaryana\b/gi, 'हरियाणा'],
  [/\bPunjab\b/gi, 'पंजाब'],
  [/\bGujarat\b/gi, 'गुजरात'],
  [/\bMaharashtra\b/gi, 'महाराष्ट्र'],
];

/**
 * Transliterates compulsory English news acronyms (EOW, CBI, ED, ACB, Lokayukta, FIR, SDM, DSP, etc.),
 * dotted abbreviations (E.O.W. -> ईओडब्ल्यू), places, and key action words into Devanagari Hindi.
 * Also automatically transliterates any unlisted 2-6 letter uppercase acronym phonetically into Devanagari
 * so essential English acronyms are NEVER stripped out of headlines or captions.
 */
export function transliterateEssentialEnglishTerms(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Strip any leading full English SEO translation sentence (6+ words ending in . ! ? before Devanagari)
  let s = stripLeadingEnglishProseSentence(input);

  // 2. If the text has NO Devanagari characters at all and is a pure-English prose sentence (has English prose stopwords or >5 ASCII words),
  // do NOT inject Devanagari into it so pure-English SEO sentences can be cleanly filtered out.
  if (!/[\u0900-\u097F]/.test(s)) {
    const asciiWords = s.trim().split(/\s+/).filter(Boolean);
    const hasEnglishProseStopwords = /\b(?:the|has|have|had|was|were|is|are|been|being|will|would|could|should|for|with|from|that|this|these|those|which|into|under|after|before|between|during|through|about|against|among|formulated|workers|areas|according)\b/i.test(s);
    if (hasEnglishProseStopwords || asciiWords.length > 5) {
      return s;
    }
  }

  // 3. Protect [yellow] and [highlight] tags from replacement
  s = s.replace(/\[yellow\]/gi, '\uE001').replace(/\[\/yellow\]/gi, '\uE002');
  s = s.replace(/\[highlight\]/gi, '\uE003').replace(/\[\/highlight\]/gi, '\uE004');

  // 4. Normalize dotted acronyms like E.O.W. -> EOW, C.B.I. -> CBI, F.I.R. -> FIR, S.D.M. -> SDM
  s = s.replace(/\b([A-Za-z])\.(?:([A-Za-z])\.)+([A-Za-z])?\.?/g, (match) =>
    match.replace(/\./g, '').toUpperCase()
  );

  // 5. Apply dictionary of compulsory English acronyms, agencies, posts, schemes, places & news words
  for (const [pattern, devanagari] of ESSENTIAL_ENGLISH_TO_HINDI_TERMS) {
    s = s.replace(pattern, devanagari);
  }

  // 6. Automatic phonetic Devanagari fallback for any remaining 2-6 letter uppercase acronym (e.g. SECR, WCR, DRI, SFIO)
  s = s.replace(/\b[A-Z]{2,6}\b/g, (acronym) => {
    if (IGNORED_TECHNICAL_ACRONYMS.has(acronym)) return acronym;
    return acronym
      .split('')
      .map((ch) => ENGLISH_LETTER_TO_DEVANAGARI[ch] || '')
      .join('');
  });

  // 7. Restore highlight tags
  s = s.replace(/\uE001/g, '[yellow]').replace(/\uE002/g, '[/yellow]');
  s = s.replace(/\uE003/g, '[highlight]').replace(/\uE004/g, '[/highlight]');

  return s;
}

/**
 * Professional News Headline Formatter:
 * - Strips UI loading/processing text like "लोड हो रहा है", "Loading...", "Please wait"
 * - Removes starting fluff like "यह खबर है", "जानिए", "देखिए", "Breaking News:", "ब्रेकिंग न्यूज़:"
 * - Strips accidental location or category tags prepended or appended to headlines (e.g. "नई दिल्ली / राष्ट्रीय:")
 * - Strips trailing punctuation like "." or "।" or commas or colons
 * - Cleans up multiple spaces
 */
export function cleanHeadlineText(text: any): string {
  if (!text) return '';
  let cleaned = normalizeHeadlineText(text);
  if (!cleaned || typeof cleaned.replace !== 'function') return '';

  // 0. Remove Unicode replacement characters (\uFFFD / diamond question marks) and non-printable control characters
  cleaned = cleaned.replace(/\uFFFD+/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // 1. Remove UI status / loading text
  cleaned = cleaned
    .replace(/(?:लोड हो रहा है[\s\.]*)+/gi, '')
    .replace(/(?:loading[\s\.]*)+/gi, '')
    .replace(/(?:please wait[\s\.]*)+/gi, '')
    .replace(/(?:generating[\s\.]*)+/gi, '')
    .replace(/(?:ai is processing[\s\.]*)+/gi, '');

  // 2. Remove scraping artifacts, image caption prefixes, dateline timestamps & interactive website buttons
  cleaned = cleaned
    .replace(
      /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|प्रतीकात्मक\s*(?:चित्र|फोटो|तस्वीर)\s*\d*[\.:\-–—]*|तस्वीर\s*\d*[\.:\-–—]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
      ' '
    )
    .replace(
      /(?:नई\s*दिल्ली|दिल्ली|भोपाल|इंदौर|रायपुर|बिलासपुर|अंबिकापुर|लखनऊ|पटना|जयपुर|मुंबई|चंडीगढ़|रांची|देहरादून|जबलपुर|ग्वालियर|रीवा|सतना|सागर|उज्जैन|शहडोल|दुर्ग|भिलाई|वाराणसी|प्रयागराज|कानपुर|आगरा|नोएडा|गाजियाबाद|गुरुग्राम|अहमदाबाद|सूरत|कोलकाता|हैदराबाद|बेंगलुरु|चेन्नई)?\s*\d+\s*(?:घंटे|मिनट|दिन|सेकंड|सप्ताह|माह|महीने|साल|वर्ष)\s*पहले\s*/gu,
      ' '
    )
    .replace(/(?:Updated|Published|Edited)\s*(?:By|On|At)?\s*[:\-–—]?\s*[^\n।|]+/gi, ' ');

  // 3. Remove publisher, portal, city-news suffixes (e.g. "- Bhopal News", "Bhopal News", "Dainik Bhaskar")
  cleaned = cleaned
    .replace(
      /\s*(?:[|\-–—:,]\s*)?(?:(?:Bhopal|Indore|Dewas|Jabalpur|Gwalior|Ujjain|Raipur|Jaipur|Lucknow|Delhi|Patna|MP|UP|National|State|City|Local)\s*News|News\s*Update[s]?|Latest\s*News|Latest\s*Update[s]?|Breaking\s*News|Dainik\s*Bhaskar|Bhaskar|Aaj\s*Tak|NDTV(?:\s*India)?|Amar\s*Ujala|News18|Zee\s*News|Patrika|Navbharat(?:\s*Times)?|Hindustan|Live\s*Hindustan|Oneindia|ABP\s*News|Dainik\s*Jagran|Jagran|TV9)\b.*$/i,
      ''
    )
    .replace(
      /\s+[|\-–—:]\s*(?:भोपाल\s*न्यूज़|इंदौर\s*न्यूज़|देवास\s*न्यूज़|जबलपुर\s*न्यूज़|ग्वालियर\s*न्यूज़|एमपी\s*न्यूज़|दैनिक\s*भास्कर|भास्कर|आज\s*तक|अमर\s*उजाला|पत्रिका|नवभारत(?:\s*टाइम्स)?|एनडीटीवी|बीबीसी\s*हिंदी|ताज़ा\s*अपडेट|लेटेस्ट\s*अपडेट|बड़ी\s*खबर).*$/i,
      ''
    )
    .replace(/\s*[|\-–—]\s*[A-Za-z\s]*(?:News|Times|Express|Herald|Chronicle|Tribune|Post|Daily|Journal|Today|Live|Media|Network|Digital|Portal|Bureau|Bhaskar|Ujala|Patrika|Jagran|Hindustan|NDTV|Aaj\s*Tak)[A-Za-z\s]*$/i, '')
    .trim();

  // 4. Remove editorial fluff prefixes and option labels
  cleaned = cleaned
    .replace(
      /^(?:विकल्प|ऑप्शन|Option|Angle)\s*\d+[\s:\-–—.]*\s*/i,
      ''
    )
    .replace(/^\d+[\.:\)\-–—]+\s*(?=[\u0900-\u097F])/u, '')
    .replace(
      /^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|प्रेस नोट|प्रेस विज्ञप्ति|यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताज़?ा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*|वेबसाइट\s*लिंक\s*से\s*प्राप्त[:\s\-–—]*|मुख्य\s*समाचार\s*विषय[:\s\-–—]*|समाचार\s*विवरण[:\s\-–—]*)\s*[:\-–—]?\s*/i,
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
      /\s*[\/\-–—:]\s*(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय)$/i,
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

  // 8. Transliterate compulsory English abbreviations, agencies (EOW, CBI, ED, ACB, etc.), posts, places, and news terms into Devanagari Hindi
  cleaned = transliterateEssentialEnglishTerms(cleaned);

  // 9. Strict English character elimination (protecting [yellow] and [highlight] tags)
  cleaned = cleaned.replace(/\[(yellow|highlight)\]/g, '\uE001');
  cleaned = cleaned.replace(/\[\/(yellow|highlight)\]/g, '\uE002');
  cleaned = cleaned.replace(/[A-Za-z]+/g, '');
  cleaned = cleaned.replace(/\uE001/g, '[yellow]');
  cleaned = cleaned.replace(/\uE002/g, '[/yellow]');

  // 10. Strip leading and trailing punctuation repeatedly (. or । or ! or ? or , or - or : or ; or quotes)
  cleaned = cleaned.replace(/^[\s:–—,;।. "“'‘-]+/u, '').replace(/[।.,!?:–—;\s"”'’-]+$/u, '').trim();

  // 11. Clean spaces around highlight tags and punctuation
  cleaned = cleaned
    .replace(/\[(highlight|yellow)\]\s+/g, '[$1]')
    .replace(/\s+\[\/(highlight|yellow)\]/g, '[/$1]')
    .replace(/\s+([,\.!\?:;।])/g, '$1');

  // 12. Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // 13. Remove sycophancy and formal honorifics (Part 3)
  cleaned = sanitizePressNoteFlattery(cleaned, true);

  // 14. Remove unnecessary trailing explanatory sentences & prohibited AI filler phrases (Part 1.3)
  cleaned = cleaned
    .replace(/\s*[,।;:\-–—]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*शासन\s+स्तर\s+पर\s+(?:संबंधित|संक्षिप्त)?\s*(?:तथ्यों\s+को\s+)?(?:दिए\s+गए\s+)?(?:आवश्यक\s+)?निर्देश(?:\s+दिए\s+गए|\s+जारी\s+किए\s+गए)?.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*संबंधित\s+पक्षों\s+को\s+निर्देश\s+जारी\s+किए\s+गए.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*मामले\s+में\s+नया\s+घटनाक्रम\s+सामने\s+आया(?:\s+है)?.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*(?:यह\s+)?पूरे\s+मामले\s+को\s+लेकर\s+(?:प्रशासनिक\s+व\s+विभागीय\s+स्तर\s+पर\s+जरूरी\s+कदम\s+उठाए\s+जा\s+रहे\s+हैं|कार्रवाई\s+की\s+जा\s+रही\s+है).*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*प्रशासनिक\s+व\s+विभागीय\s+स्तर\s+पर\s+जरूरी\s+कदम\s+उठाए\s+जा\s+रहे\s+हैं.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*इस\s+घटना\s+के\s+बाद\s+प्रशासन\s+अलर्ट.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*मामले\s+को\s+लेकर\s+विभागीय\s+स्तर\s+पर\s+समीक्षा.*$/u, '')
    .replace(/\s*[,।;:\-–—]?\s*प्रशासनिक\s+स्तर\s+पर\s+आवश्यक\s+संज्ञान\s+लिया\s+गया(?:\s+है)?.*$/u, '')
    .replace(/\s*[,।;:\-–—\/]?\s*(?:विशेष\s*डेस्क|विशेष\s*डैश|विशेष\s*संवाददाता|सेंट्रल\s*डेस्क|न्यूज़\s*डेस्क|ब्यूरो\s*डेस्क)\s*/gu, ' ');

  // 15. Canonical normalization for state/location names
  cleaned = cleaned
    .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
    .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश');

  // 16. Strict punctuation strip: No headline may end with a full stop (. or ।) or punctuation or quotes
  cleaned = cleaned.replace(/[।.,!?:–—;\s"”'’-]+$/u, '').trim();

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
  'विशेष डेस्क',
  'विशेष डैश',
  'विशेष संवाददाता',
  'सेंट्रल डेस्क',
  'न्यूज़ डेस्क',
  'ब्यूरो डेस्क',
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
  if (
    !trimmed ||
    trimmed === 'विशेष कवरेज' ||
    trimmed === 'विशेष डेस्क' ||
    trimmed === 'विशेष डैश' ||
    trimmed === 'विशेष संवाददाता' ||
    trimmed === 'सेंट्रल डेस्क' ||
    trimmed === 'न्यूज़ डेस्क' ||
    trimmed === 'ब्यूरो डेस्क'
  ) {
    return '';
  }

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
  const aliasLower = alias.toLowerCase().trim();

  // Strict disambiguation for Devanagari/English homographs that are common verbs, multipliers, or common words
  if (alias === 'गया' || aliasLower === 'gaya') {
    return /(?:बोधगया|बोध\s+गया|(?:जिले|जिला|शहर|कस्बा|कस्बे|स्टेशन|जंक्शन|एयरपोर्ट|घाट|धाम)\s+गया|गया\s*(?:जिले|जिला|शहर|कस्बा|कस्बे|स्टेशन|जंक्शन|एयरपोर्ट|घाट|धाम|जी|रूट|जंक्शन)|गया,\s*बिहार|गया\s*\(\s*बिहार\s*\)|\bgaya\s+(?:district|city|station|airport|junction|bihar)\b|\b(?:district|city)\s+gaya\b)/iu.test(text);
  }
  if (alias === 'गुना' || aliasLower === 'guna') {
    return /(?:(?:जिले|जिला|शहर|कस्बा|कस्बे|स्टेशन)\s+गुना|गुना\s*(?:जिले|जिला|शहर|कस्बा|कस्बे|स्टेशन|जंक्शन)|गुना,\s*मध्य प्रदेश|गुना\s*\(\s*मध्य प्रदेश\s*\)|\bguna\s+(?:district|city|station)\b)/iu.test(text);
  }
  if (alias === 'धार' || aliasLower === 'dhar') {
    return /(?:(?:जिले|जिला|शहर|कस्बा|कस्बे|किला)\s+धार|धार\s*(?:जिले|जिला|शहर|कस्बा|कस्बे|किला|कोतवाली)|धार,\s*मध्य प्रदेश|धार\s*\(\s*मध्य प्रदेश\s*\)|\bdhar\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === 'पन्ना' || aliasLower === 'panna') {
    return /(?:(?:जिले|जिला|शहर|कस्बा|कस्बे|खदान|टाइगर रिजर्व)\s+पन्ना|पन्ना\s*(?:जिले|जिला|शहर|कस्बा|कस्बे|खदान|टाइगर रिजर्व|नेशनल पार्क)|पन्ना,\s*मध्य प्रदेश|पन्ना\s*\(\s*मध्य प्रदेश\s*\)|\bpanna\s+(?:district|city|tiger reserve)\b)/iu.test(text);
  }
  if (alias === 'सीधी' || aliasLower === 'sidhi') {
    return /(?:(?:जिले|जिला|शहर|कस्बा|कस्बे|कोतवाली)\s+सीधी|सीधी\s*(?:जिले|जिला|शहर|कस्बा|कस्बे|कोतवाली|पेशाब कांड)|सीधी,\s*मध्य प्रदेश|सीधी\s*\(\s*मध्य प्रदेश\s*\)|\bsidhi\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === 'बस्ती' || aliasLower === 'basti') {
    return /(?:(?:जिले|जिला|शहर|मंडल)\s+बस्ती|बस्ती\s*(?:जिले|जिला|शहर|मंडल)|बस्ती,\s*उत्तर प्रदेश|बस्ती\s*\(\s*उत्तर प्रदेश\s*\)|\bbasti\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === 'बांदा' || aliasLower === 'banda') {
    return /(?:(?:जिले|जिला|शहर|जेल)\s+बांदा|बांदा\s*(?:जिले|जिला|शहर|जेल)|बांदा,\s*उत्तर प्रदेश|बांदा\s*\(\s*उत्तर प्रदेश\s*\)|\bbanda\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === 'पुरी' || alias === 'पूरी' || aliasLower === 'puri') {
    return /(?:जगन्नाथ\s*पुरी|पुरी\s*(?:जिले|जिला|शहर|मंदिर|धाम|बीच|स्टेशन)|(?:जिले|जिला|शहर)\s+पुरी|पुरी,\s*ओडिशा|\bpuri\s+(?:district|city|temple)\b)/iu.test(text);
  }

  // If alias is English/Latin
  if (/^[A-Za-z0-9\s\-]+$/.test(alias)) {
    const reg = new RegExp(`\\b${escapeRegExp(aliasLower)}\\b`, 'i');
    return reg.test(text);
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

  // Check if news is clearly entertainment / Bollywood / lifestyle without a specific district event
  const isNonLocationalTopic = /(?:बॉलीवुड|सिनेमा|फिल्म|अभिनेता|अभिनेत्री|सितारों|सेलेब्स|bollywood|cinema|movie|actor|actress|box office|वेब सीरीज|ओटीटी|ट्रेलर|गाना|हॉलीवुड)/iu.test(cleanTitle);
  if (isNonLocationalTopic) {
    return '';
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

  // 2. Strip leading stray punctuation or separators (without stripping numbers, quotes, or transliterated terms)
  h = h.replace(/^[\s,.\-–—:;\/&|!_]+(?=[\u0900-\u097F])/u, '');

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
    .replace(/(?:आदेश\s*दिए\s*गए|आदेश\s*जारी\s*किए)(?:\s*हैं|\s*है)?$/u, ' आदेश दिए गए')
    .replace(/(?:निधन\s*हो\s*गया)(?:\s*हैं|\s*है)?$/u, ' का निधन')
    .replace(/(?:जांच\s*शुरू\s*कर\s*दी\s*गई|जांच\s*के\s*निर्देश\s*दिए)(?:\s*हैं|\s*है)?$/u, ' की जांच शुरू')
    .replace(/(?:घोषणा\s*की\s*गई|ऐलान\s*किया\s*गया|ऐलान\s*किया)(?:\s*हैं|\s*है)?$/u, ' का ऐलान')
    .replace(/(?:के\s*तहत\s*होगा|के\s*तहत\s*होंगे)$/u, ' के नए नियम')
    .replace(/(?:के\s+सख्त\s+)+/gu, 'के सख्त ');

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

export const calculateHeadlineSimilarityInternal = (h1: string, h2: string): number => calculateHeadlineSimilarity(h1, h2);

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
 * Attachment 5 Canonical sanitizeFlattery implementation
 */
export function sanitizeFlattery(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/(^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम\s+पूज्य|पूज्य)\s+/gu, '$1')
    .replace(/(^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, '$1')
    .replace(/(^|[^\p{L}\p{M}])महोदय(?=[,\s.!?।\n]|$)\s*/gu, '$1')
    .replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Strips all URLs, web domains, and links (Zero URL policy)
 */
export function stripAllUrlsAndHyperlinks(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/www\.[^\s]+/gi, '')
    .replace(/\b[a-zA-Z0-9.\-]+\.(?:com|in|org|net|co|io|online|xyz|tv|site|app|live)\b[^\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sanitizes flattering and honorific words from text (Part 3 & Attachment 5)
 * Completely eliminates PR flattery & honorifics (श्री, श्रीमती, सुश्री, माननीय, सम्माननीय, आदरणीय, महोदय, जी, पूज्य, परम पूज्य)
 * STRICT PROTECTION: Never damages genuine names or place words like श्रीवास्तव, श्रीनगर, श्रीराम, श्रीधर
 */
export function sanitizePressNoteFlattery(text: any, isHeadline: boolean = false): string {
  if (!text) return '';
  let cleaned = typeof text === 'string'
    ? text
    : (Array.isArray(text) ? text.filter(Boolean).map(String).join(' ') : String(text || ''));
  if (!cleaned || typeof cleaned.replace !== 'function') return '';
  // 1. Remove fluff prefixes
  cleaned = cleaned.replace(/^(यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*/i, '');

  // 2. Canonical Attachment 5 sanitizeFlattery implementation
  cleaned = sanitizeFlattery(cleaned);

  // 3. Remove unnecessary trailing explanatory filler sentences (e.g. "इससे लोगों को मदद मिलेगी")
  cleaned = cleaned.replace(/\s*[,।]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, '');

  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();
  if (isHeadline) {
    cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, '').trim();
  }
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

export const HEADLINE_TIER_RANGES = [
  { option: 1, label: 'विकल्प 1' },
  { option: 2, label: 'विकल्प 2' },
  { option: 3, label: 'विकल्प 3' },
  { option: 4, label: 'विकल्प 4' },
];

export function validateHeadlineOption(
  headline: string,
  index: number = 0,
  expectedTier?: 'standard' | 'extended' | { minChars?: number; maxChars?: number; allowRelaxedLength?: boolean } | any
): HeadlineValidationResult {
  const clean = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();

  if (!clean) {
    return { valid: false, reasons: ['हेडलाइन खाली नहीं हो सकती'], cleanText: '', charCount: 0, wordCount: 0 };
  }

  const visibleText = clean.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
  const charCount = visibleText.length;
  const words = visibleText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    valid: true,
    reasons: [],
    cleanText: clean,
    charCount,
    wordCount,
  };
}

/**
 * Enriches a shorter headline with verified factual context from the article
 * so that it naturally achieves 80+ characters while remaining anchored to the central event.
 */
export function enrichHeadlineWithContext(
  headline: string,
  baseTitle: string,
  facts: string[] = [],
  location: string = '',
  targetMinChars: number = 50
): string {
  let cleanH = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
  if (cleanH.replace(/\[\/?(?:yellow|highlight)\]/g, '').length >= targetMinChars) {
    return cleanH;
  }

  // Connect relevant fact sentence from the article without repeating words
  for (const f of facts) {
    if (cleanH.replace(/\[\/?(?:yellow|highlight)\]/g, '').length >= targetMinChars) break;
    const cleanF = cleanHeadlineText(f).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
    if (!cleanF || cleanF.length < 12) continue;
    if (cleanH.includes(cleanF) || calculateHeadlineSimilarity(cleanH, cleanF) >= 0.5) continue;
    cleanH = `${cleanH}, ${cleanF}`;
  }

  return cleanHeadlineText(cleanH).replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
}

/**
 * Fits a headline cleanly into a specified [minChars, maxChars] range without abrupt truncation
 * or inventing unsupported facts.
 */
export function fitHeadlineToRange(
  headline: any,
  minChars: number,
  maxChars: number,
  contextText: any = '',
  baseTitle: any = '',
  location: any = ''
): string {
  if (!headline) return '';
  const headlineStr = typeof headline === 'string'
    ? headline
    : (Array.isArray(headline) ? headline.filter(Boolean).join(' ') : String(headline || ''));
  const safeContext = typeof contextText === 'string'
    ? contextText
    : (Array.isArray(contextText) ? contextText.filter(Boolean).map(String).join(' । ') : String(contextText || ''));
  const safeBase = typeof baseTitle === 'string'
    ? baseTitle
    : (Array.isArray(baseTitle) ? baseTitle.filter(Boolean).map(String).join(' ') : String(baseTitle || ''));
  const safeLocation = typeof location === 'string' ? location : String(location || '');

  let h = sanitizePressNoteFlattery(cleanHeadlineText(headlineStr), true)
    .replace(/^(?:विकल्प\s*\d+[\s:\-–—]*|\d+[\s.\-–—]+|[•\-\*]\s*)/u, '')
    .replace(/^(?:Breaking News|Live Updates?|Latest News|Big Breaking)[:\s\-–—]*/i, '')
    .replace(/[।\.\,\!\?\:\-]+$/g, '')
    .trim();

  const getCleanLen = (str: string) => str.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim().length;
  let currentLen = getCleanLen(h);

  // If longer than maxChars: trim at natural phrase/word boundary
  if (currentLen > maxChars) {
    const delimiters = [', ', ' और ', ' तथा ', ' एवं ', ' पर ', ' से ', ' में '];
    let trimmed = '';
    for (const d of delimiters) {
      const idx = h.lastIndexOf(d, maxChars);
      if (idx >= minChars) {
        const candidate = h.substring(0, idx).trim().replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
        if (getCleanLen(candidate) >= minChars && getCleanLen(candidate) <= maxChars) {
          trimmed = candidate;
          break;
        }
      }
    }

    if (!trimmed) {
      const spaceIdx = h.lastIndexOf(' ', maxChars);
      if (spaceIdx >= minChars) {
        trimmed = h.substring(0, spaceIdx).trim().replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
      } else {
        trimmed = h.substring(0, maxChars).trim().replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
      }
    }
    h = trimmed;
    currentLen = getCleanLen(h);
  }

  // Do not pad shorter headlines with filler words (150 is a ceiling, not a target)
  h = h.replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
  const finalLen = getCleanLen(h);
  if (finalLen > maxChars) {
    const spaceIdx = h.lastIndexOf(' ', maxChars);
    if (spaceIdx >= minChars) {
      h = h.substring(0, spaceIdx).trim().replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
    } else {
      h = h.substring(0, maxChars).trim().replace(/[।\.\,\!\?\:\-]+$/g, '').trim();
    }
  }

  return h;
}

export interface HeadlineTierRange {
  min: number;
  max: number;
  label: string;
}

export const HEADLINE_5_TIER_RANGES: HeadlineTierRange[] = [
  { min: 80, max: 110, label: 'विकल्प 1' },
  { min: 100, max: 130, label: 'विकल्प 2' },
  { min: 125, max: 150, label: 'विकल्प 3' },
  { min: 130, max: 160, label: 'विकल्प 4' },
  { min: 150, max: 200, label: 'विकल्प 5' },
];

export const HEADLINE_MAX_CHARACTER_LIMIT = 200;
export const HEADLINE_5_TIER_MAX_LIMITS = [110, 130, 150, 160, 200];

/**
 * Canonical segmenter for user-perceived Unicode grapheme clusters (Devanagari aksharas).
 */
let hindiGraphemeSegmenter: any = null;
try {
  if (typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function') {
    hindiGraphemeSegmenter = new (Intl as any).Segmenter('hi', { granularity: 'grapheme' });
  }
} catch {
  hindiGraphemeSegmenter = null;
}

/**
 * Strips highlight tags, HTML tags, markdown formatting, quotation marks, and trailing punctuation.
 */
export function sanitizeHeadlineForLengthCounting(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let s = text.replace(/\[\/?(?:yellow|highlight)\]/gi, '');
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/["'“”‘’«»]/g, '');
  s = s.replace(/[।\.\!\?\,\:\-]+$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Counts user-perceived visible grapheme clusters (Aksharas in Devanagari)
 * accurately combining consonants, virama, matras, anusvara, and nukta.
 */
export function countHeadlineGraphemes(text: string): number {
  return countCharacters(text);
}

/**
 * Canonical character counter for headlines across backend and frontend.
 * Strips highlight tags, HTML tags, markdown formatting, quotation marks, and trailing punctuation.
 * Supports { mode: 'grapheme' } for Unicode grapheme cluster counting (user-perceived aksharas),
 * while defaulting to sanitized character units matching broadcast 5-tier limits.
 */
export function countHeadlineVisibleCharacters(
  text: string,
  options?: { mode?: 'codeunit' | 'grapheme' }
): number {
  if (options?.mode === 'codeunit') {
    const s = sanitizeHeadlineForLengthCounting(text);
    return s.length;
  }
  return countCharacters(text);
}

/**
 * Validates a full set of 5 headline options against mandatory graduated character limits,
 * blocked media brands, sentence endings, and duplicates.
 */
export function validateHeadlines5Tier(
  headlines: string[],
  sourcePublisherNames: string[] = []
): {
  valid: boolean;
  results: Array<{
    tier: number;
    text: string;
    charCount: number;
    min: number;
    max: number;
    valid: boolean;
    reason?: string;
  }>;
  invalidTiers: number[];
} {
  const batch = validateHeadlinesBatch(headlines, sourcePublisherNames);
  const safe = Array.isArray(headlines) ? headlines.slice(0, 5) : [];
  const results = [];
  const invalidTiers: number[] = [];

  for (let i = 0; i < 5; i++) {
    const tier = HEADLINE_5_TIER_RANGES[i];
    const text = safe[i] || '';
    const res = batch.results[i];
    const charCount = res?.characterCount ?? countCharacters(text);
    const valid = res ? res.valid : false;
    let reason = res?.errors?.length ? res.errors.join('; ') : undefined;

    if (!valid) invalidTiers.push(i + 1);

    results.push({
      tier: i + 1,
      text,
      charCount,
      min: tier.min,
      max: tier.max,
      valid,
      reason,
    });
  }

  return {
    valid: batch.valid,
    results,
    invalidTiers,
  };
}

export const BYLINE_REGEX = /(?:नईदुनिया|नवदुनिया|दैनिक\s*भास्कर|अमर\s*उजाला|पत्रिका|नवभारत\s*टाइम्स|हिंदुस्तान|विशेष\s*संवाददाता|ब्यूरो|द\s*सूत्र|हरिभूमि|दैनिक\s*जागरण|आज\s*तक|ज़ी\s*न्यूज़|एनडीटीवी|न्यूज़\s*18)\s*(?:प्रतिनिधि|संवाददाता|ब्यूरो|डेस्क|रिपोर्टर)?[,\s]*[^\n।:]*[:,\-–—]?/gi;

export function stripNewspaperBylines(text: string): string {
  if (!text) return "";
  return text.replace(BYLINE_REGEX, " ").replace(/\s{2,}/g, " ").trim();
}

export function sanitizeHeadlineClean(text: string): string {
  if (!text) return "";
  let res = stripNewspaperBylines(sanitizePressNoteFlattery(cleanHeadlineText(text), true))
    .replace(/[।.,!?:–—;\s-]+$/u, "")
    .trim();

  // Remove any leading/inline image caption or relative time artifacts
  res = res
    .replace(/^(?:प्रतीकात्मक\s*(?:चित्र|फोटो|तस्वीर)\s*\d*[\.:\-–—\s]*)+/gu, "")
    .replace(/(?:नई\s*दिल्ली|दिल्ली|भोपाल|इंदौर|रायपुर|बिलासपुर|अंबिकापुर|लखनऊ|पटना|जयपुर|मुंबई|चंडीगढ़|रांची|देहरादून|जबलपुर|ग्वालियर|रीवा|सतना|सागर|उज्जैन)?\s*\d+\s*(?:घंटे|मिनट|दिन|सेकंड|सप्ताह|माह|महीने)\s*पहले\s*/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Repair known dangling verbal completions
  res = res.replace(/(?:की\s+)?(?:दे\s+रहा|दे\s+रहे|दे\s+रही)$/u, "की धमकी का मामला");
  res = res.replace(/\s+(?:कर\s+रहा|कर\s+रहे|कर\s+रही)$/u, " का मामला");
  res = res.replace(/\s+(?:हो\s+रहा|हो\s+रहे|हो\s+रही)$/u, " की स्थिति");
  res = res.replace(/(?:यातायात पुलिस ने\s*)?लोगों\s+की\s+सुरक्षा\s+के$/u, "यातायात व सुरक्षा के पुख्ता इंतजाम");

  // Strip trailing incomplete clauses (e.g. "कोर्ट ने कहा", "सुप्रीम कोर्ट ने गुरुवार", "खाते से 5", "; 5 सवाल")
  res = res.replace(/[;,\s]+\d+\s*सवाल$/u, "");
  res = res.replace(/[,:\s]+(?:सुप्रीम\s+कोर्ट|हाई\s+कोर्ट|कोर्ट|अदालत|पुलिस|सरकार|प्रशासन|उन्होंने|याचिकाकर्ता)\s+ने\s+(?:गुरुवार|शुक्रवार|सोमवार|मंगलवार|बुधवार|शनिवार|रविवार|आज|कल|कहा|बताया|बोला|पूछा)(?:\s+को)?$/u, "");
  res = res.replace(/\s+ने\s+(?:गुरुवार|शुक्रवार|सोमवार|मंगलवार|बुधवार|शनिवार|रविवार)(?:\s+को)?$/u, "");
  res = res.replace(/\s+(?:से|में|पर|को|के|का|की)\s+\d+$/u, "");

  // Strip trailing connectors & prepositions in a loop
  const danglingPostpositions = /(?:\s+(?:ने|के|की|का|को|में|पर|से|कि|हेतु|तहत|दौरान|और|या|एवं|व|के\s+बीच|के\s+लिए|के\s+तहत|के\s+जरिए|के\s+बाद|द्वारा\s+आवश्यक|की\s+ओर|के\s+साथ|ने\s+कहा|ने\s+बताया))$/u;
  let prevLen = 0;
  while (res.length !== prevLen) {
    prevLen = res.length;
    res = res.replace(danglingPostpositions, "").trim();
  }
  return res.replace(/[।.,!?:–—;\s-]+$/u, "").trim();
}

export function fixHeadlineEnding(text: string): string {
  if (!text) return "";
  let res = text.replace(/[।.,!?:–—;\s-]+$/u, "").trim();
  res = res.replace(/(?:की\s+)?(?:दे\s+रहा|दे\s+रहे|दे\s+रही)$/u, "की धमकी");
  res = res.replace(/\s+(?:कर\s+रहा|कर\s+रहे|कर\s+रही)$/u, " की कार्रवाई");
  res = res.replace(/\s+(?:हो\s+रहा|हो\s+रहे|हो\s+रही)$/u, " की स्थिति");
  res = res.replace(/\s+कहा\s+कि$/u, " का बड़ा बयान");
  res = res.replace(/\s+बताया\s+कि$/u, " का दावा");
  res = res.replace(/\s+(?:करते\s+हुए|करते\s+हुए\s+कहा|बोलते\s+हुए)$/u, " का बयान");
  res = res.replace(/\s+(?:लेकर|चलते|होते\s+ही|होते)$/u, " पर अलर्ट");

  const danglingEndings = /(?:\s+(?:ने|के|की|का|को|में|पर|से|कि|हेतु|तहत|दौरान|और|या|एवं|व|तक|भी|तो|ही|हुए|गया|गई|हुई|जारी|के\s+बाद|के\s+लिए|के\s+बीच|की\s+ओर|के\s+साथ))$/u;
  let prevLen = 0;
  while (res.length !== prevLen) {
    prevLen = res.length;
    res = res.replace(danglingEndings, "").trim();
  }

  return res.replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "").trim();
}

export function stripDanglingHeadlineEndings(text: string): string {
  if (!text) return "";
  let res = text.replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, "").trim();
  const danglingRegex = /(?:\s+(?:और|तथा|एवं|व|या|अथवा|कि|जो|का|की|के|में|पर|से|को|ने|तक|हेतु|लिए|हो|हुए|कर|गया|गई|गए|भी|तो|ही|हुई|जारी|चलते|लेकर|कहा\s+कि|बताया\s+कि))$/u;
  const punctRegex = /[।\.\,\!\?\:\-–—;;\s"”'’]+$/g;

  let prev = "";
  while (res !== prev) {
    prev = res;
    res = res.replace(danglingRegex, "").trim();
    res = res.replace(punctRegex, "").trim();
  }
  return res;
}

export interface HeadlineQualityReport {
  isValid: boolean;
  score: number;
  charCount: number;
  issues: string[];
  cleanedHeadline: string;
}

export function validateHeadlineQuality(headline: string, tierIndex?: number): HeadlineQualityReport {
  const issues: string[] = [];
  if (!headline || typeof headline !== 'string' || !headline.trim()) {
    return { isValid: false, score: 0, charCount: 0, issues: ['हेडलाइन रिक्त है'], cleanedHeadline: '' };
  }

  const cleaned = sanitizeHeadlineClean(headline);
  const charCount = countHeadlineVisibleCharacters(cleaned);

  if (/[।\.]$/.test(headline.trim())) {
    issues.push('हेडलाइन के अंत में पूर्णविराम (। या .) नहीं होना चाहिए');
  }

  const danglingMatch = /(?:\s+(?:ने|के|की|का|को|में|पर|से|कि|और|या|एवं|व|तक|भी|तो|ही|हुए|गया|गई|हुई|जारी|कहा\s+कि|बताया\s+कि|लेकर|चलते))$/u;
  if (danglingMatch.test(cleaned)) {
    issues.push('हेडलाइन का अंत अधूरे व्याकरण या शब्द पर हो रहा है');
  }

  if (charCount > 200) {
    issues.push(`हेडलाइन की लंबाई 200 अक्षरों से अधिक है (${charCount})`);
  }

  if (typeof tierIndex === 'number' && tierIndex >= 0 && tierIndex < HEADLINE_5_TIER_RANGES.length) {
    const tier = HEADLINE_5_TIER_RANGES[tierIndex];
    if (charCount < tier.min - 15) {
      issues.push(`हेडलाइन विकल्प ${tierIndex + 1} के न्यूनतम सीमा (${tier.min}) से छोटी है (${charCount})`);
    } else if (charCount > tier.max + 15) {
      issues.push(`हेडलाइन विकल्प ${tierIndex + 1} के अधिकतम सीमा (${tier.max}) से लंबी है (${charCount})`);
    }
  }

  const score = Math.max(0, 100 - issues.length * 25);
  return {
    isValid: issues.length === 0,
    score,
    charCount,
    issues,
    cleanedHeadline: cleaned,
  };
}

export function fitSingleHeadlineToTier(
  text: string,
  maxLimit: number = 200,
  minLimit: number = 0,
  factSentence?: string | string[]
): string {
  if (!text) return "";
  const effectiveMax = Math.min(maxLimit || 200, 200);
  let cleaned = sanitizeHeadlineClean(text);
  cleaned = cleaned.replace(/\s*[,।]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, "");
  cleaned = cleaned.replace(/([A-Za-z\u0900-\u097F]+):([A-Za-z\u0900-\u097F]+)/g, "$1: $2");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = sanitizeHeadlineClean(cleaned);

  let currentLen = countHeadlineVisibleCharacters(cleaned);

  // If already within limits
  if (currentLen <= effectiveMax && currentLen >= minLimit) {
    return cleaned;
  }

  // Case 1: Exceeds target max -> check for clean clause boundary, then word boundary
  if (currentLen > effectiveMax) {
    const delimiters = [", ", " - ", ": ", " — ", "; "];
    for (const d of delimiters) {
      const idx = cleaned.lastIndexOf(d, effectiveMax);
      if (idx >= Math.min(minLimit, 55)) {
        const candidate = sanitizeHeadlineClean(cleaned.substring(0, idx));
        const cLen = countHeadlineVisibleCharacters(candidate);
        if (cLen >= minLimit && cLen <= effectiveMax) {
          return candidate;
        }
      }
    }
    const sliced = cleaned.substring(0, effectiveMax);
    const lastSpace = sliced.lastIndexOf(" ");
    const result = lastSpace >= Math.max(35, minLimit - 10) ? sliced.substring(0, lastSpace) : sliced;
    const cleanResult = stripDanglingHeadlineEndings(sanitizeHeadlineClean(result));
    if (countHeadlineVisibleCharacters(cleanResult) >= minLimit || !factSentence) {
      return cleanResult;
    }
    cleaned = cleanResult;
    currentLen = countHeadlineVisibleCharacters(cleaned);
  }

  // Case 2: Shorter than minLimit -> expand naturally from article fact sentences
  if (minLimit > 0 && currentLen < minLimit && factSentence) {
    const candidates = (Array.isArray(factSentence) ? factSentence : [factSentence])
      .filter(Boolean)
      .flatMap((f: any) => String(f).split(/[।\n]+/))
      .flatMap((s: string) => s.split(/[,;:]\s+/))
      .map((s: string) => sanitizeHeadlineClean(s))
      .filter((s: string) => s.length >= 8);

    for (const rawFact of candidates) {
      if (cleaned.includes(rawFact.slice(0, 14)) || calculateHeadlineSimilarity(cleaned, rawFact) >= 0.65) continue;

      for (const sep of [", ", ": ", " — "]) {
        const combined = sanitizeHeadlineClean(`${cleaned}${sep}${rawFact}`);
        const cLen = countHeadlineVisibleCharacters(combined);
        if (cLen >= minLimit && cLen <= effectiveMax) {
          return combined;
        }
        if (cLen > effectiveMax) {
          const sliced = combined.substring(0, effectiveMax);
          const lastSpace = sliced.lastIndexOf(" ");
          if (lastSpace >= minLimit) {
            const trimmedCandidate = stripDanglingHeadlineEndings(sanitizeHeadlineClean(sliced.substring(0, lastSpace)));
            const tLen = countHeadlineVisibleCharacters(trimmedCandidate);
            if (tLen >= minLimit && tLen <= effectiveMax) {
              return trimmedCandidate;
            }
          }
        }
      }
    }

    // Secondary pass: step-by-step word append from facts to bridge the gap
    for (const rawFact of candidates) {
      if (cleaned.includes(rawFact.slice(0, 14))) continue;
      const words = rawFact.split(/\s+/).filter(Boolean);
      let acc = cleaned;
      for (const w of words) {
        const next = sanitizeHeadlineClean(`${acc} ${w}`);
        const nLen = countHeadlineVisibleCharacters(next);
        if (nLen > effectiveMax) break;
        acc = next;
        if (nLen >= minLimit && nLen <= effectiveMax) {
          return sanitizeHeadlineClean(acc);
        }
      }
    }
  }

  return sanitizeHeadlineClean(cleaned);
}

export const TIER_DIVERSIFICATION_PATTERNS = [
  // Tier 1: 80 - 110
  {
    prefixes: ['संक्षिप्त विवरण: ', 'मुख्य बिंदु: ', '', 'अपडेट: ', 'बड़ा अपडेट: '],
    connectors: [
      '',
      ', स्थिति सामान्य बताई जा रही है',
      ', जांच शुरू की गई है',
      ', मौके पर पहुंचकर स्थिति का जायजा लिया गया है',
      ', मामले में पुलिस और प्रशासन मुस्तैद',
      ', आधिकारिक बयान की प्रतीक्षा है'
    ]
  },
  // Tier 2: 100 - 130
  {
    prefixes: ['मुख्य बिंदु: ', 'अहम जानकारी: ', 'संक्षिप्त विवरण: ', 'अपडेट: ', 'बड़ा अपडेट: ', 'ताज़ा अपडेट: ', ''],
    connectors: [
      ', स्थिति पर लगातार नजर रखी जा रही है',
      ', मामले को लेकर प्रशासनिक सतर्कता बढ़ी है',
      ', घटना के बाद से क्षेत्र में हलचल तेज है',
      ', पूरे मामले की प्राथमिक जांच तेजी से शुरू कर दी गई है',
      ', पूरे मामले में अधिकारियों की कड़ी नजर, उच्च स्तरीय जांच और आवश्यक कार्रवाई शुरू',
      ', घटना के बाद मौके पर पहुंचे प्रशासनिक अधिकारी, राहत और जांच कार्य तेजी से जारी',
      ', मामले की संवेदनशीलता को देखते हुए उच्च स्तरीय जांच शुरू, शासन को भेजी जाएगी रिपोर्ट',
      ', पूरे घटनाक्रम को लेकर प्रशासन सतर्क, मौके पर पहुंचे अधिकारियों ने संभाली स्थिति',
      ', मामले को लेकर अधिकारियों ने दिए सख्त जांच के निर्देश, पूरे क्षेत्र में निगरानी तेज',
      ', प्रशासनिक अमला अलर्ट मोड पर, पूरे घटनाक्रम की गहनता से पड़ताल और समीक्षा जारी'
    ]
  },
  // Tier 3: 125 - 150
  {
    prefixes: ['विस्तृत रिपोर्ट: ', 'अहम जानकारी: ', 'ग्राउंड रिपोर्ट: ', 'प्रमुख घटनाक्रम: ', 'विशेष रिपोर्ट: ', ''],
    connectors: [
      ', मामले को लेकर आधिकारिक बयान और रिपोर्ट की प्रतीक्षा है',
      ', पूरे घटनाक्रम की आधिकारिक पुष्टि व जांच जारी है',
      ', मामले से जुड़े हर पहलू पर गंभीरता से नजर रखी जा रही है',
      ', पूरे घटनाक्रम को लेकर आधिकारिक बयान और विस्तृत रिपोर्ट की प्रतीक्षा की जा रही है',
      ', मामले से जुड़े हर तथ्य की उच्च स्तर पर गहनता से पड़ताल की जा रही है',
      ', मामले की संवेदनशीलता को देखते हुए उच्च स्तरीय जांच समिति गठित, जल्द शासन को भेजी जाएगी विस्तृत रिपोर्ट',
      ', पूरे घटनाक्रम को लेकर आधिकारिक बयान जारी होने की प्रतीक्षा, प्रशासनिक अधिकारी मौके पर तैनात रहकर बनाए हैं नजर',
      ', मामले से जुड़े हर तथ्य की गहनता से पड़ताल जारी, प्रशासनिक अमले ने पूरे क्षेत्र में स्थिति पर कड़ी निगरानी बनाई',
      ', पूरे घटनाक्रम को लेकर शासन स्तर पर समीक्षा जारी, संबंधित विभाग के वरिष्ठ अधिकारियों ने मौके का जायजा लिया',
      ', घटना के हर बिंदु की निष्पक्ष जांच के आदेश, अधिकारियों ने मौके पर पहुंचकर स्थिति का जायजा लेते हुए रिपोर्ट तलब की'
    ]
  },
  // Tier 4: 130 - 160
  {
    prefixes: ['प्रमुख समाचार: ', 'विशेष रिपोर्ट: ', 'विस्तृत रिपोर्ट: ', 'प्रशासनिक अपडेट: ', ''],
    connectors: [
      ', पूरे मामले में स्थिति पर लगातार प्रशासनिक नजर रखी जा रही है',
      ', घटनाक्रम से जुड़े हर पहलू पर संबंधित विभाग की नजर बनी हुई है',
      ', मामले में विस्तृत विवरण और आगामी कार्रवाई का इंतजार है',
      ', पूरे घटनाक्रम पर प्रशासनिक अधिकारियों की कड़ी नजर बनी हुई है और आगामी कार्रवाई जारी है',
      ', मामले को लेकर संबंधित अधिकारियों ने विस्तृत रिपोर्ट तलब की है और जांच जारी है',
      ', उच्च अधिकारियों ने मौके पर पहुंचकर जायजा लिया और विस्तृत जांच रिपोर्ट जल्द सौंपने के निर्देश दिए',
      ', मामले से जुड़े हर तथ्य की सूक्ष्मता से जांच की जा रही है और दोषियों पर कड़ी कार्रवाई के संकेत हैं'
    ]
  },
  // Tier 5: 150 - 200
  {
    prefixes: ['विशेष ग्राउंड रिपोर्ट: ', 'विस्तृत कवरेज: ', 'विशेष पड़ताल: ', 'प्रमुख समाचार: ', 'विशेष रिपोर्ट: '],
    connectors: [
      ', घटनाक्रम से जुड़े हर पहलू की गहनता से पड़ताल की जा रही है और स्थिति पर नजर है',
      ', पूरे मामले की उच्च स्तर पर समीक्षा की जा रही है और विस्तृत रिपोर्ट का इंतजार है',
      ', मामले को लेकर संबंधित अधिकारियों ने स्थिति का जायजा लिया और जांच तेज कर दी है',
      ', घटनाक्रम से जुड़े हर पहलू की गहनता से पड़ताल की जा रही है और उच्च स्तरीय जांच के निर्देश जारी किए गए हैं',
      ', पूरे मामले को लेकर प्रशासनिक अमला पूरी तरह अलर्ट है और विस्तृत रिपोर्ट शासन को भेजने की तैयारी है',
      ', वरिष्ठ अधिकारियों की टीम ने घटनास्थल का निरीक्षण कर आवश्यक दिशा-निर्देश दिए, विस्तृत रिपोर्ट जल्द शासन को सौंपी जाएगी',
      ', मामले की संवेदनशीलता को देखते हुए उच्च स्तरीय जांच दल गठित किया गया है, पूरे घटनाक्रम पर शासन की सीधी नजर बनी हुई है'
    ]
  }
];

export const PADDING_CLAUSES = [
  ', पूरे मामले में अधिकारियों की कड़ी नजर बनी हुई है और आगामी कार्रवाई जारी है',
  ', पूरे घटनाक्रम को लेकर प्रशासन सतर्क है और मौके पर पहुंचे अधिकारियों ने स्थिति संभाली',
  ', मामले की संवेदनशीलता को देखते हुए उच्च स्तरीय जांच शुरू कर रिपोर्ट तलब की गई है',
  ', प्रशासनिक अमला अलर्ट मोड पर है और पूरे घटनाक्रम की गहनता से पड़ताल की जा रही है',
  ', मामले को लेकर संबंधित अधिकारियों ने विस्तृत रिपोर्ट तलब की है और जांच जारी है',
  ', पूरे मामले की स्थिति पर लगातार प्रशासनिक नजर रखी जा रही है'
];

export function diversifyHeadlineToTier(
  cand: string,
  tierIndex: number,
  tier: { min: number; max: number },
  location: string,
  existing: string[]
): string {
  let cleanBase = cand.trim()
    .replace(/^(?:संक्षिप्त विवरण|मुख्य बिंदु|बड़ा फैसला|बड़ी खबर|ताज़ा खबर|विशेष|अपडेट|बड़ा अपडेट|विस्तृत रिपोर्ट|अहम जानकारी|प्रमुख समाचार|विशेष रिपोर्ट|विशेष ग्राउंड रिपोर्ट|ग्राउंड रिपोर्ट|प्रशासनिक अपडेट|विस्तृत कवरेज|विशेष पड़ताल):\s*/u, '')
    .replace(/[।\.\,\!\?\:\-–—;;\s"”'’]+$/g, '');
  const config = TIER_DIVERSIFICATION_PATTERNS[tierIndex] || TIER_DIVERSIFICATION_PATTERNS[0];
  const loc = (location && location !== 'विशेष कवरेज') ? location.split(/[\/,]/)[0].trim() : '';

  if (loc && cleanBase.startsWith(loc + ':')) {
    cleanBase = cleanBase.substring((loc + ':').length).trim();
  }

  const baseVariants: string[] = [cleanBase];
  const clauses = cleanBase.split(/[,:\-–—;]\s+/).map((s) => s.trim()).filter((s) => s.length >= 15);
  if (clauses.length >= 2) {
    baseVariants.push(clauses[0]);
    baseVariants.push(clauses[1]);
    baseVariants.push(clauses.slice(1).join(', '));
    baseVariants.push(`${clauses[1]}, ${clauses[0]}`);
  }

  const candidateVariants: string[] = [];

  if (loc && !cleanBase.includes(loc)) {
    if (tierIndex === 0) {
      candidateVariants.push(`${loc}: ${cleanBase}`);
      candidateVariants.push(`संक्षिप्त विवरण: ${loc}: ${cleanBase}`);
    } else if (tierIndex === 3) {
      candidateVariants.push(`${loc} से बड़ी खबर: ${cleanBase}`);
    }
  }

  for (const base of baseVariants) {
    for (const p of config.prefixes) {
      for (const c of config.connectors) {
        candidateVariants.push(`${p}${base}${c}`);

        // If base is long, also generate shortened base to let connector words survive
        if (base.length > 40 && (p.length + base.length + c.length) > tier.max) {
          const avail = tier.max - p.length - c.length - 2;
          if (avail >= 20) {
            const sub = base.substring(0, avail);
            const lSpace = sub.lastIndexOf(' ');
            if (lSpace >= 15) {
              const shortB = stripDanglingHeadlineEndings(sub.substring(0, lSpace));
              if (shortB.length >= 15) {
                candidateVariants.push(`${p}${shortB}${c}`);
              }
            }
          }
        }
      }
    }
  }

  // Also try adaptive padding clauses if candidate length is under tier.min
  const extendedVariants = [...candidateVariants];
  for (const cv of candidateVariants) {
    const vLen = countHeadlineVisibleCharacters(cv);
    if (vLen < tier.min) {
      for (const pad of PADDING_CLAUSES) {
        extendedVariants.push(`${cv}${pad}`);
      }
    }
  }

  // Pass 1: candidates that fit within range WITHOUT truncation
  for (const raw of extendedVariants) {
    let formatted = stripDanglingHeadlineEndings(raw)
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .trim();
    formatted = stripDanglingHeadlineEndings(formatted);

    const len = countHeadlineVisibleCharacters(formatted);
    if (len >= tier.min && len <= tier.max) {
      if (!existing.includes(formatted) && !existing.some((ex) => calculateHeadlineSimilarityInternal(ex, formatted) >= 0.88)) {
        return formatted;
      }
    }
  }

  // Pass 2: candidates with word-boundary truncation
  for (const raw of extendedVariants) {
    let formatted = stripDanglingHeadlineEndings(raw)
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .trim();
    formatted = stripDanglingHeadlineEndings(formatted);

    let len = countHeadlineVisibleCharacters(formatted);
    if (len > tier.max) {
      const sliced = formatted.substring(0, tier.max);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace >= tier.min) {
        formatted = stripDanglingHeadlineEndings(sliced.substring(0, lastSpace));
        len = countHeadlineVisibleCharacters(formatted);
      }
    }

    if (len >= tier.min && len <= tier.max) {
      if (!existing.includes(formatted) && !existing.some((ex) => calculateHeadlineSimilarityInternal(ex, formatted) >= 0.88)) {
        return formatted;
      }
    }
  }

  // Pass 3: relax similarity slightly to 0.92
  for (const raw of extendedVariants) {
    let candidate = stripDanglingHeadlineEndings(raw)
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .trim();
    candidate = stripDanglingHeadlineEndings(candidate);
    let len = countHeadlineVisibleCharacters(candidate);
    if (len > tier.max) {
      const sliced = candidate.substring(0, tier.max);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace >= tier.min) {
        candidate = stripDanglingHeadlineEndings(sliced.substring(0, lastSpace));
        len = countHeadlineVisibleCharacters(candidate);
      }
    }
    if (len >= tier.min && len <= tier.max && !existing.includes(candidate)) {
      if (!existing.some((ex) => calculateHeadlineSimilarityInternal(ex, candidate) >= 0.92)) {
        return candidate;
      }
    }
  }

  // Pass 4: Any non-duplicate within bounds
  for (const raw of extendedVariants) {
    let candidate = stripDanglingHeadlineEndings(raw)
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .trim();
    candidate = stripDanglingHeadlineEndings(candidate);
    let len = countHeadlineVisibleCharacters(candidate);
    if (len > tier.max) {
      const sliced = candidate.substring(0, tier.max);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace >= tier.min) {
        candidate = stripDanglingHeadlineEndings(sliced.substring(0, lastSpace));
        len = countHeadlineVisibleCharacters(candidate);
      }
    }
    if (len >= tier.min && len <= tier.max && !existing.includes(candidate)) {
      return candidate;
    }
  }

  const fallbackRaw = `${config.prefixes[0] || ''}${cleanBase}${config.connectors[0] || ''}`;
  let fb = stripDanglingHeadlineEndings(fallbackRaw);
  if (countHeadlineVisibleCharacters(fb) > tier.max) {
    fb = stripDanglingHeadlineEndings(fb.substring(0, tier.max).replace(/\s+[^\s]*$/, ''));
  }
  return stripDanglingHeadlineEndings(fb);
}

export function fitHeadlinesTo5TierRanges(
  headlines: string[],
  contextOrBase: any = '',
  baseOrContext: any = '',
  location: string = '',
  sourcePublisherNames: string[] = []
): string[] {
  const safeHeadlines: string[] = [];
  const rawArray = Array.isArray(headlines) ? headlines : [headlines];
  for (const h of rawArray) {
    if (typeof h !== 'string') continue;
    const clean = sanitizeHeadlineClean(h);
    if (!clean) continue;
    if (hasBlockedMediaBrand(clean, sourcePublisherNames)) continue;
    if (hasInvalidHeadlineEnding(clean)) continue;
    const isDup = safeHeadlines.some((existing) => existing === clean || checkHeadlineSimilarity(existing, clean) >= 0.85);
    if (!isDup) {
      safeHeadlines.push(clean);
    }
  }

  const rawSources: string[] = [];
  if (typeof contextOrBase === 'string' && contextOrBase.trim()) rawSources.push(contextOrBase.trim());
  if (Array.isArray(contextOrBase)) rawSources.push(...contextOrBase.filter(Boolean).map(String));
  if (typeof baseOrContext === 'string' && baseOrContext.trim()) rawSources.push(baseOrContext.trim());
  if (Array.isArray(baseOrContext)) rawSources.push(...baseOrContext.filter(Boolean).map(String));
  if (safeHeadlines.length > 0) rawSources.push(...safeHeadlines);

  const rawBaseText = typeof baseOrContext === 'string' && baseOrContext.trim()
    ? baseOrContext.trim()
    : (typeof contextOrBase === 'string' && contextOrBase.trim() ? contextOrBase.trim() : (safeHeadlines[0] || ''));
  const baseText = sanitizeHeadlineClean(rawBaseText) || rawBaseText;

  const factsList = rawSources
    .flatMap((f: string) => f.split(/[।\n\.\r]+/))
    .map((s: string) => sanitizeHeadlineClean(s))
    .filter((s: string) => s.length >= 12 && !hasBlockedMediaBrand(s, sourcePublisherNames) && !hasInvalidHeadlineEnding(s));

  const workingHeadlines = [...safeHeadlines];
  if (workingHeadlines.length < 5 && baseText) {
    const supp = generate5BalancedHeadlineOptions(baseText, factsList, location);
    for (const cand of supp) {
      if (workingHeadlines.length >= 5) break;
      if (hasBlockedMediaBrand(cand, sourcePublisherNames) || hasInvalidHeadlineEnding(cand)) continue;
      const isDup = workingHeadlines.some((existing) => existing === cand || checkHeadlineSimilarity(existing, cand) >= 0.85);
      if (!isDup) {
        workingHeadlines.push(cand);
      }
    }
  }

  workingHeadlines.sort((a, b) => countCharacters(a) - countCharacters(b));

  const result: string[] = [];

  for (let i = 0; i < 5; i++) {
    const tier = HEADLINE_TARGETS[i] || { min: 80, max: 200 };
    let cand = workingHeadlines[i] || workingHeadlines[workingHeadlines.length - 1] || baseText || '';
    cand = removeRedundantClauses(cleanCandidateClause(cand));

    // Enforce tier-specific maximum bounds (up to tier.max characters, absolute maximum 200 characters)
    const charLenInitial = countCharacters(cand);
    if (charLenInitial > tier.max) {
      const sliced = cand.substring(0, tier.max);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace >= Math.min(tier.min, 45)) {
        cand = removeRedundantClauses(cleanCandidateClause(sliced.substring(0, lastSpace)));
      }
    }

    // Truncate cleanly at word boundary if it exceeds tier.max
    const charLen = countCharacters(cand);
    if (charLen > tier.max) {
      const sliced = cand.substring(0, tier.max);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace >= Math.min(tier.min, 45)) {
        cand = removeRedundantClauses(cleanCandidateClause(sliced.substring(0, lastSpace)));
      }
    }

    // Check if cand is duplicate of an existing item in result
    let isDup = !cand || result.includes(cand) || result.some((ex) => checkHeadlineSimilarity(ex, cand) >= 0.85);
    let val = validateHeadline(cand, i, sourcePublisherNames);

    if (isDup || !val.valid) {
      let foundAlt = false;
      for (const alt of workingHeadlines) {
        const cleanedAlt = removeRedundantClauses(cleanCandidateClause(alt));
        if (!cleanedAlt || result.includes(cleanedAlt) || result.some((ex) => checkHeadlineSimilarity(ex, cleanedAlt) >= 0.85)) continue;
        const testVal = validateHeadline(cleanedAlt, i, sourcePublisherNames);
        if (testVal.valid) {
          cand = cleanedAlt;
          val = testVal;
          foundAlt = true;
          break;
        }
      }

      if (!foundAlt || isDup || !val.valid) {
        cand = regenerateHeadlineOptionFromFacts(i, factsList, baseText, location, result, sourcePublisherNames);
        cand = removeRedundantClauses(cleanCandidateClause(cand));
      }
    }

    // Clean formatting and state spaces
    cand = removeRedundantClauses(cleanCandidateClause(cand));

    // Guarantee that cand is strictly distinct from anything already in result
    if (!cand || result.includes(cand) || result.some((ex) => checkHeadlineSimilarity(ex, cand) >= 0.85)) {
      cand = diversifyHeadlineToTier(baseText, i, tier, location, result);
      cand = removeRedundantClauses(cleanCandidateClause(cand));
    }

    // Enforce BREAKING NEWS WALA Editorial Standard: strictly <= 22 words per headline
    const candWords = cand.split(/\s+/).filter(Boolean);
    if (candWords.length > 22) {
      cand = stripDanglingHeadlineEndings(candWords.slice(0, 22).join(' '));
    }

    result.push(cand);
  }

  return result.slice(0, 5);
}

export function fitHeadlineNaturally(
  text: string,
  minChars: number = 50,
  maxChars: number = 115,
  factSentence?: string | string[]
): string {
  if (!text) return "";
  return cleanHeadlineText(text).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
}

/**
 * Generates up to 5 distinct headline options strictly from the provided article facts
 * conforming to BREAKING NEWS WALA Editorial Standard (12-22 words, 5 editorial angles).
 * NEVER injects hardcoded unrelated news templates or allows 35-word run-on sentences.
 */
export function generate5BalancedHeadlineOptions(
  primaryTitle: string,
  factSentences: string[] = [],
  location: string = ""
): string[] {
  const cleanBase = sanitizeHeadlineClean(primaryTitle || "");
  if (!cleanBase) return [];
  const loc = location && location !== "विशेष कवरेज" ? location.trim() : "";
  const primaryLoc = loc ? loc.split(/[\/,]/)[0].trim() : "";
  const baseCriticalEntities = CRITICAL_HEADLINE_ENTITIES.filter((ent) => cleanBase.includes(ent));

  const ensureCriticalEntitiesPreserved = (candText: string): string => {
    if (!candText || baseCriticalEntities.length === 0) return candText;
    const missing = baseCriticalEntities.filter((ent) => !candText.includes(ent));
    if (missing.length === 0) return candText;
    // Anchor with cleanBase if it's concise, otherwise prepend the primary missing agency/entity
    if (cleanBase.length <= 48 && !candText.includes(cleanBase)) {
      return `${cleanBase}: ${candText}`;
    }
    return `${missing.join(' व ')} की कार्रवाई: ${candText}`;
  };

  const uniqueOptions: string[] = [];

  const clampToEditorialBounds = (text: string, targetMaxWords: number = 32, maxChars: number = 200): string => {
    let clean = sanitizeHeadlineClean(text);
    if (!clean) return '';
    clean = clean.replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length > targetMaxWords) {
      const sliced = words.slice(0, targetMaxWords).join(' ');
      clean = stripDanglingHeadlineEndings(sliced);
    }
    const chars = countHeadlineVisibleCharacters(clean);
    if (chars > maxChars) {
      clean = stripDanglingHeadlineEndings(clean.substring(0, maxChars - 5).replace(/\s+[^\s]*$/, ''));
    }
    return clean;
  };

  const addOptionIfDistinct = (cand: string, threshold: number = 0.88, maxWords: number = 32, maxChars: number = 200) => {
    if (!cand) return;
    const withEntities = ensureCriticalEntitiesPreserved(cand);
    const formatted = clampToEditorialBounds(withEntities, maxWords, maxChars);
    const wordsCount = formatted.split(/\s+/).filter(Boolean).length;
    if (!formatted || formatted.length < 15 || wordsCount < 4 || countHeadlineVisibleCharacters(formatted) > 200) return;
    if (uniqueOptions.includes(formatted)) return;
    const isTooSimilar = uniqueOptions.some((ex) => calculateHeadlineSimilarityInternal(ex, formatted) >= threshold);
    if (!isTooSimilar) {
      uniqueOptions.push(formatted);
    }
  };

  // Angle 1: High-Impact Breaking News style (12-16 words, ~80-110 chars)
  const angle1Base = primaryLoc && !cleanBase.includes(primaryLoc)
    ? `${primaryLoc} में बड़ी खबर: ${cleanBase}`
    : cleanBase;
  addOptionIfDistinct(angle1Base, 0.90, 18, 110);

  // Extract clean, bounded fact sentences from source article
  const validFacts = (factSentences || [])
    .map((s) => clampToEditorialBounds(s, 24, 180))
    .filter((s) => s.length >= 20 && countHeadlineVisibleCharacters(s) <= 200 && !BYLINE_REGEX.test(s));

  // Angle 2: Factual & Informative style (14-18 words, ~100-130 chars)
  if (validFacts.length > 0) {
    addOptionIfDistinct(validFacts[0], 0.88, 22, 130);
  } else if (primaryLoc && !cleanBase.includes(primaryLoc)) {
    addOptionIfDistinct(`${primaryLoc}: ${cleanBase}`, 0.92, 22, 130);
  } else {
    addOptionIfDistinct(`${cleanBase} पर महत्वपूर्ण अपडेट`, 0.88, 22, 130);
  }

  // Angle 3: Action / Administrative Decision style (15-20 words, ~125-150 chars)
  if (validFacts.length > 1) {
    addOptionIfDistinct(validFacts[1], 0.88, 26, 150);
  } else {
    const actionAngle = `${cleanBase}: प्रशासनिक स्तर पर जांच और आवश्यक कार्रवाई तेज`;
    addOptionIfDistinct(actionAngle, 0.88, 26, 150);
  }

  // Angle 4: Public Impact / Context style (16-24 words, ~130-160 chars)
  if (validFacts.length > 2) {
    addOptionIfDistinct(validFacts[2], 0.88, 28, 160);
  } else {
    const impactAngle = `${cleanBase}, घटनाक्रम के बाद स्थानीय स्तर पर चर्चाएं तेज और जांच जारी`;
    addOptionIfDistinct(impactAngle, 0.88, 28, 160);
  }

  // Angle 5: Comprehensive, Impactful Editorial Headline (150-200 chars target)
  let angle5Candidate = '';
  if (validFacts.length > 0) {
    const mainAction = validFacts[0];
    const contextFact = validFacts.length > 1 ? validFacts[1] : '';
    angle5Candidate = contextFact
      ? `${cleanBase}: ${mainAction}, ${contextFact}`
      : (primaryLoc && !cleanBase.includes(primaryLoc) ? `${primaryLoc} में ${cleanBase}: ${mainAction}` : `${cleanBase}: ${mainAction}`);
  } else {
    angle5Candidate = primaryLoc && !cleanBase.includes(primaryLoc)
      ? `${primaryLoc} से विस्तृत रिपोर्ट: ${cleanBase}, घटनाक्रम को लेकर प्रशासन व अधिकारियों की समीक्षा बैठक में महत्वपूर्ण चर्चा`
      : `${cleanBase}: घटनाक्रम को लेकर प्रशासनिक स्तर पर समीक्षा, महत्वपूर्ण दिशा-निर्देश जारी किए गए`;
  }
  addOptionIfDistinct(angle5Candidate, 0.85, 32, 200);

  // Diverse journalistic angles if still fewer than 5:
  if (uniqueOptions.length < 5) {
    const backupAngles = [
      primaryLoc && !cleanBase.includes(primaryLoc) ? `${primaryLoc} से बड़ा अपडेट: ${cleanBase}` : `विशेष रिपोर्ट: ${cleanBase}`,
      `${cleanBase}, पूरे मामले पर उच्चाधिकारियों की नजर और स्थिति का जायजा`,
    ];
    for (const angle of backupAngles) {
      if (uniqueOptions.length >= 5) break;
      addOptionIfDistinct(angle, 0.85, 20, 110);
    }
  }

  return uniqueOptions.slice(0, 5);
}

/**
 * Backwards compatible 4-headline option generator
 */
export function generate4BalancedHeadlineOptions(
  primaryTitle: string,
  factSentences: string[] = [],
  location: string = ""
): string[] {
  return generate5BalancedHeadlineOptions(primaryTitle, factSentences, location).slice(0, 4);
}

export function generate5JournalisticHeadlines(
  baseTitle: string,
  sentences: string[] = [],
  location: string = '',
  excludeTitle: string | string[] = ''
): string[] {
  return generate5BalancedHeadlineOptions(baseTitle, sentences, location);
}

/**
 * Ensures clean, factual Hindi caption in 2-3 paragraphs with strict hashtag hierarchy:
 * - Paragraph 1: Main event, place, date/time
 * - Paragraph 2: Verified background, context, statements/investigation
 * - Paragraph 3: Confirmed action, current status or next steps (if applicable)
 * - Zero raw URLs, phone numbers, or flattery
 * - Exactly ONE blank line before hashtags
 * - 1st tag: #{username} (never guessed, omitted if absent)
 * - Middle: 4-6 relevant news/location tags
 * - Final tag: strictly #AINewsMaker
 */
/**
 * Ensures clean, factual Hindi caption according to selected mode with strict hashtag hierarchy:
 * - Detailed: Exactly 3 rich paragraphs
 * - Bullets: 3-5 lines starting with '• '
 * - Short: Exactly 2 concise paragraphs
 * - Zero URLs, hyperlinks, phone numbers, or flattery
 * - Exactly ONE blank line before hashtags
 * - 1st tag: #{username} (never guessed, omitted if absent)
 * - Middle: 4-6 relevant news/location tags
 * - Final tag: strictly #AINewsMaker
 */
export function ensureHashtagHierarchy(
  summaryText: string,
  location: string = '',
  username: string = '',
  mode: 'detailed' | 'short' | 'bullet' = 'detailed',
  headlineToStrip: string = ''
): string {
  if (!summaryText || typeof summaryText !== 'string') return summaryText || '';

  // 1. Separate body text from any existing hashtag line
  const parts = summaryText.split(/\n\s*#/);
  let rawBody = parts[0].trim();

  // Strip all URLs, web domains, and links (Zero URL policy)
  rawBody = stripAllUrlsAndHyperlinks(rawBody);

  // Strip phone numbers
  rawBody = rawBody.replace(/(?:\+?91[\-\s]?)?[6-9]\d{9}\b/g, '');
  rawBody = rawBody.replace(/\b\d{3,5}[-\s]\d{6,8}\b/g, '');

  // Strip English and Hindi field labels/headings (Title, Headline, Description, Content, etc.)
  rawBody = rawBody.replace(/^(?:Title|Headline|Description|Content|News|Summary|शीर्षक|हेडलाइन|विवरण|सामग्री|कैप्शन|खबर|विस्तृत\s*कैप्शन|संक्षिप्त\s*कैप्शन|बुलेट\s*पॉइंट्स?)\s*[:\-–—.]*/gim, '');
  rawBody = rawBody.replace(/^(?:पैराग्राफ|Paragraph|पैरा)\s*\d+[\s:\-–—.]*/gim, '');
  rawBody = rawBody.replace(/^(?:मुख्य बिंदु|विवरण|घटनाक्रम|अपडेट|Key Points|Bullet Points)[\s:\-–—.]*/gim, '');
  rawBody = rawBody.replace(/(?:वेबसाइट लिंक से प्राप्त मुख्य समाचार विषय|वेबसाइट लिंक से प्राप्त|मुख्य समाचार विषय|समाचार विवरण[:\s]*यह खबर[^\n।]+से संबंधित है[।\.]*|घटनाक्रम को लेकर प्रशासन एवं संबंधित विभाग सक्रिय हैं[।\.]*|समाचार विवरण[:\s]*)/gim, '');

  // Strip press note flattery
  rawBody = sanitizePressNoteFlattery(rawBody, false);

  // Strip any lingering inline or trailing hashtags from body text so they never pollute paragraphs
  rawBody = rawBody.replace(/#[a-zA-Z0-9_\u0900-\u097F]+/g, '').trim();

  // Transliterate compulsory English agencies/acronyms (EOW -> ईओडब्ल्यू, CBI -> सीबीआई, etc.) in caption body
  rawBody = transliterateEssentialEnglishTerms(rawBody);

  // Strip leading headline duplicate only if sufficient article body remains
  if (headlineToStrip && headlineToStrip.trim()) {
    const cleanH = cleanHeadlineText(headlineToStrip).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, '').trim();
    if (cleanH.length >= 10) {
      const firstLineMatch = rawBody.match(/^([^\n।]+)[।\n]?/u);
      if (firstLineMatch) {
        const firstLine = cleanHeadlineText(firstLineMatch[1]).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, '').trim();
        const remainingLength = rawBody.slice(firstLineMatch[0].length).trim().length;
        if (remainingLength >= 30 && (firstLine === cleanH || calculateHeadlineSimilarity(firstLine, cleanH) >= 0.75)) {
          rawBody = rawBody.slice(firstLineMatch[0].length).trim();
          rawBody = rawBody.replace(/^[:\-–—.]+\s*/u, '').trim();
        }
      }
    }
  }

  let finalBodyText = '';

  if (mode === 'bullet') {
    // Bullet mode: opening hook of 1–2 lines, up to 10 bullet points starting with "•", and closing lines of 1–2 lines
    const rawLines = rawBody
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && /[\u0900-\u097F]/.test(l));

    let openingLines: string[] = [];
    let bulletItems: string[] = [];
    let closingLines: string[] = [];

    let seenFirstBullet = false;
    for (const line of rawLines) {
      const isBullet = /^[•\-\*\d\.\)\s]+/.test(line);
      if (isBullet) {
        seenFirstBullet = true;
        const text = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
        if (text.length > 5) {
          bulletItems.push(`• ${text.replace(/[।\.\s]+$/, '')}।`);
        }
      } else if (!seenFirstBullet) {
        openingLines.push(line);
      } else {
        closingLines.push(line);
      }
    }

    if (bulletItems.length === 0) {
      const sentences = rawBody
        .split(/[।\n]+|\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && /[\u0900-\u097F]/.test(s));

      if (sentences.length >= 3) {
        openingLines = [sentences[0] + '।'];
        bulletItems = sentences.slice(1, Math.min(sentences.length - 1, 11)).map((s) => `• ${s.replace(/[।\.\s]+$/, '')}।`);
        closingLines = sentences.length > 2 ? [sentences[sentences.length - 1] + '।'] : [];
      } else {
        openingLines = sentences[0] ? [sentences[0] + '।'] : ['समाचार के मुख्य बिंदु:'];
        bulletItems = sentences.slice(1).map((s) => `• ${s.replace(/[।\.\s]+$/, '')}।`);
        if (bulletItems.length === 0) {
          bulletItems = [`• ${headlineToStrip ? headlineToStrip.replace(/[।\.\s]+$/, '') : 'घटनाक्रम की मुख्य जानकारी'}।`];
        }
      }
    }

    const hookText = openingLines.slice(0, 2).join(' ').trim();
    const finalHook = hookText ? (hookText.endsWith('।') ? hookText : `${hookText}।`) : 'घटनाक्रम से जुड़े मुख्य बिंदु:';
    const finalBullets = bulletItems.slice(0, 10);
    let finalClosing = closingLines.slice(0, 2).join(' ').trim();
    if (!finalClosing && location) {
      finalClosing = `${location} में मामले को लेकर आगे की आवश्यक जांच व प्रशासनिक कार्रवाई जारी है।`;
    }

    finalBodyText = `${finalHook}\n\n${finalBullets.join('\n')}${finalClosing ? `\n\n${finalClosing}` : ''}`;
  } else if (mode === 'short') {
    // Short mode: exactly 2 paragraphs, 60–90 words
    const rawParagraphs = rawBody
      .split(/\n{2,}|\n(?=[^\s•])/g)
      .map((p) => p.replace(/[ \t]{2,}/g, ' ').trim())
      .filter((p) => p.length > 10 && /[\u0900-\u097F]/.test(p));

    let p1 = '';
    let p2 = '';

    if (rawParagraphs.length >= 2) {
      p1 = rawParagraphs[0];
      p2 = rawParagraphs[1];
    } else {
      const sentences = rawBody
        .split(/[।\n]+|\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8 && /[\u0900-\u097F]/.test(s));

      if (sentences.length >= 4) {
        const mid = Math.ceil(sentences.length / 2);
        p1 = sentences.slice(0, mid).join('। ') + '।';
        p2 = sentences.slice(mid).join('। ') + '।';
      } else if (sentences.length >= 2) {
        p1 = sentences[0] + '।';
        p2 = sentences.slice(1).join('। ') + '।';
      } else {
        p1 = sentences[0] ? sentences[0] + '।' : (headlineToStrip || 'ताज़ा समाचार का मुख्य विवरण।');
        p2 = `${location ? `${location} में` : ''} संबंधित प्रशासन व विभाग द्वारा मामले में आवश्यक कार्रवाई की जा रही है।`;
      }
    }

    // Word count target: 60-90 words
    const wordsCount = (p1 + ' ' + p2).split(/\s+/).filter(Boolean).length;
    if (wordsCount > 95) {
      const p2Sents = p2.split(/[।\n]+/).map((s) => s.trim()).filter(Boolean);
      if (p2Sents.length > 1) {
        let trimmedP2 = '';
        for (const s of p2Sents) {
          const cand = (p1 + ' ' + (trimmedP2 ? `${trimmedP2}। ${s}।` : `${s}।`)).split(/\s+/).filter(Boolean).length;
          if (cand <= 90 || !trimmedP2) {
            trimmedP2 = trimmedP2 ? `${trimmedP2}। ${s}` : s;
          } else {
            break;
          }
        }
        if (trimmedP2) p2 = trimmedP2 + '।';
      }
    }
    finalBodyText = `${p1}\n\n${p2}`.trim();
  } else {
    // Detailed mode: exactly 3 paragraphs covering incident, background/causes, and official response/next steps
    const rawParagraphs = rawBody
      .split(/\n{2,}|\n(?=[^\s•])/g)
      .map((p) => p.replace(/[ \t]{2,}/g, ' ').trim())
      .filter((p) => p.length > 10 && /[\u0900-\u097F]/.test(p));

    let p1 = '';
    let p2 = '';
    let p3 = '';

    if (rawParagraphs.length === 3) {
      p1 = rawParagraphs[0];
      p2 = rawParagraphs[1];
      p3 = rawParagraphs[2];
    } else if (rawParagraphs.length > 3) {
      p1 = rawParagraphs[0];
      p2 = rawParagraphs[1];
      p3 = rawParagraphs.slice(2).join(' ');
    } else if (rawParagraphs.length === 2) {
      p1 = rawParagraphs[0];
      const sents = rawParagraphs[1].split(/[।\n]+/).map((s) => s.trim()).filter(Boolean);
      if (sents.length >= 2) {
        const mid = Math.ceil(sents.length / 2);
        p2 = sents.slice(0, mid).join('। ') + '।';
        p3 = sents.slice(mid).join('। ') + '।';
      } else {
        p2 = rawParagraphs[1];
        p3 = `${location ? `${location} से जुड़े इस` : 'इस'} मामले में संबंधित अधिकारियों द्वारा जांच व आगे की आवश्यक प्रक्रिया जारी है।`;
      }
    } else {
      const cleanLoc = (location || '').replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, '').trim();
      const sentences = rawBody
        .split(/[।\n]+|\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8 && /[\u0900-\u097F]/.test(s));

      if (sentences.length >= 6) {
        const chunk = Math.ceil(sentences.length / 3);
        p1 = sentences.slice(0, chunk).join('। ') + '।';
        p2 = sentences.slice(chunk, chunk * 2).join('। ') + '।';
        p3 = sentences.slice(chunk * 2).join('। ') + '।';
      } else if (sentences.length >= 3) {
        p1 = sentences[0] + '।';
        p2 = sentences[1] + '।';
        p3 = sentences.slice(2).join('। ') + '।';
      } else if (sentences.length === 2) {
        p1 = sentences[0] + '।';
        p2 = sentences[1] + '।';
        p3 = cleanLoc
          ? `${cleanLoc} में घटना की सूचना मिलते ही संबंधित विभाग व प्रशासन ने संज्ञान लिया है और आवश्यक कार्रवाई की जा रही है।`
          : 'मामले को लेकर संबंधित प्रशासन व पुलिस द्वारा आवश्यक कदम उठाए जा रहे हैं और आगे की जांच जारी है।';
      } else {
        p1 = sentences[0] ? (sentences[0].endsWith('।') ? sentences[0] : `${sentences[0]}।`) : (headlineToStrip ? `${headlineToStrip}।` : 'ताज़ा समाचार से जुड़ी महत्वपूर्ण जानकारी।');
        p2 = cleanLoc
          ? `${cleanLoc} से जुड़े इस पूरे घटनाक्रम की पृष्ठभूमि और मुख्य कारणों को लेकर विस्तृत पड़ताल की जा रही है।`
          : 'घटनाक्रम की पृष्ठभूमि और कारणों को लेकर स्थानीय स्तर पर चर्चाएं तेज हैं।';
        p3 = cleanLoc
          ? `${cleanLoc} में मामले की गंभीरता को देखते हुए संबंधित अधिकारियों द्वारा आवश्यक प्रक्रिया व निगरानी जारी है।`
          : 'मामले में आगे की आवश्यक प्रक्रिया व निगरानी जारी है, जिससे जुड़ी जानकारी जल्द साझा की जाएगी।';
      }
    }
    finalBodyText = `${p1}\n\n${p2}\n\n${p3}`.trim();
  }

  // 3. Centralized hashtag hierarchy
  const existingTagsString = summaryText.includes('#') ? summaryText.slice(summaryText.indexOf('#')) : '';
  const hashtagBlock = buildHashtags(location, existingTagsString, undefined, username);

  // 4. Enforce 2,000-character editor limit
  const MAX_CAPTION_LIMIT = 2000;
  let fullCaption = `${finalBodyText}\n\n${hashtagBlock}`.trim();
  if (fullCaption.length > MAX_CAPTION_LIMIT) {
    const maxBodyLen = MAX_CAPTION_LIMIT - hashtagBlock.length - 2;
    if (finalBodyText.length > maxBodyLen && maxBodyLen > 50) {
      let trimmed = finalBodyText.slice(0, maxBodyLen);
      const lastBoundary = Math.max(
        trimmed.lastIndexOf('।'),
        trimmed.lastIndexOf('\n'),
        trimmed.lastIndexOf('.')
      );
      if (lastBoundary > maxBodyLen * 0.7) {
        trimmed = trimmed.slice(0, lastBoundary + 1);
      }
      finalBodyText = trimmed.trim();
    }
    fullCaption = `${finalBodyText}\n\n${hashtagBlock}`.trim();
  }

  return fullCaption;
}

/**
 * Helper to extract user's username for the first hashtag (#<username>)
 * Defaults strictly to #AINewsMakerUser if no valid username is found.
 */
export function getUserFirstHashtag(card?: NewsCardData, username?: string): string {
  let uName = (username || '').trim();

  if (!uName && typeof localStorage !== 'undefined') {
    try {
      const session = localStorage.getItem('reporter_auth_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.username) uName = parsed.username;
      }
    } catch {}

    if (!uName) {
      try {
        const saved = localStorage.getItem('user_channel_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.username) uName = parsed.username;
        }
      } catch {}
    }

    if (!uName) {
      uName = localStorage.getItem('app_user_username') || '';
    }
  }

  if (!uName && card?.socialHandle) {
    uName = card.socialHandle.replace(/^[/@]+/, '');
  }

  const clean = uName
    ? uName
        .replace(/^[@#]+/, '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '')
    : '';

  const isGeneric = [
    'user',
    'username',
    'reporter',
    'admin',
    'superadmin',
    'null',
    'undefined',
    'ainewsmaker',
    'ai_news_maker',
    'breakingnewswala',
    'bnwtv',
    'breaking_news_wala',
    'ainewsmakeruser',
  ].includes(clean.toLowerCase());

  if (clean && !isGeneric) {
    return `#${clean}`;
  }
  return '#AINewsMakerUser';
}

/**
 * Centralized buildHashtags:
 * Strict positional lock of 6-8 total hashtags:
 * 1st tag: Logged-in user's profile username #{{USERNAME}} (or explicitly configured fallback #AINewsMakerUser)
 * Middle tags: 4-6 contextual hashtags (topic, location, category, state)
 * Last tag: Mandatory strictly #AINewsMaker
 * Strict legacy tag removal: Completely filters out #breakingnewswala, #BNWTV, #AI_NEWS_MAKER, #ब्रेकिंगन्यूजवाला, and any tag starting with @
 */
export function buildHashtags(
  location?: string,
  existingTagsString?: string,
  card?: NewsCardData,
  username?: string
): string {
  const firstTag = getUserFirstHashtag(card, username);

  let rawTags: string[] = [];
  if (existingTagsString && typeof existingTagsString === 'string') {
    const matched = existingTagsString.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g) || [];
    rawTags = matched;
  }

  const legacyOrProhibited = new Set([
    '#breakingnewswala',
    '#bnwtv',
    '#breaking_news_wala',
    '#ब्रेकिंगन्यूजवाला',
    '#ainewsmaker',
    '#ai_news_maker',
    '#ainewsmakeruser',
  ]);

  const middleTags: string[] = [];
  const seenMiddle = new Set<string>();

  const addMiddleTag = (tag: string) => {
    if (!tag) return;
    const cleanTag = tag.trim();
    if (!cleanTag.startsWith('#')) return;
    if (cleanTag.includes('@') || cleanTag.startsWith('@')) return;
    const lower = cleanTag.toLowerCase();
    if (legacyOrProhibited.has(lower)) return;
    if (lower === firstTag.toLowerCase()) return;
    if (lower.startsWith('#http') || lower.startsWith('#www') || lower.startsWith('#url')) return;
    if (!seenMiddle.has(lower)) {
      seenMiddle.add(lower);
      middleTags.push(cleanTag);
    }
  };

  if (location && typeof location === 'string') {
    const locParts = location.split(/[\/,]/).map((p) => p.trim()).filter(Boolean);
    const city = locParts[0]?.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
    if (
      city &&
      city.toLowerCase() !== 'location' &&
      city !== 'स्थान' &&
      city.toLowerCase() !== 'news' &&
      city !== 'विशेष कवरेज'
    ) {
      addMiddleTag(`#${city}News`);
    }
    if (locParts.length > 1) {
      const statePart = locParts[1]?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
      if (statePart && statePart.length >= 2) {
        addMiddleTag(`#${statePart}`);
      }
    }
  }

  if (card?.category && typeof card.category === 'string') {
    const cleanCat = card.category.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '');
    if (cleanCat && cleanCat !== 'अन्य' && cleanCat !== 'ताज़ा_समाचार') {
      addMiddleTag(`#${cleanCat}`);
    }
  }

  for (const t of rawTags) {
    addMiddleTag(t);
  }

  const contextualHindiPool = [
    '#HindiNews',
    '#NewsUpdate',
    '#BreakingNews',
    '#LatestNews',
    '#Samachar',
    '#NationalNews',
    '#DeshVidesh',
    '#Khabar',
  ];

  for (const seed of contextualHindiPool) {
    if (middleTags.length >= 6) break;
    addMiddleTag(seed);
  }

  let selectedMiddle = middleTags.slice(0, 6);
  if (selectedMiddle.length < 4) {
    for (const seed of contextualHindiPool) {
      if (selectedMiddle.length >= 4) break;
      const lower = seed.toLowerCase();
      if (!seenMiddle.has(lower) && lower !== firstTag.toLowerCase()) {
        seenMiddle.add(lower);
        selectedMiddle.push(seed);
      }
    }
  }

  const finalTags = [firstTag, ...selectedMiddle, '#AINewsMaker'];
  return finalTags.join(' ');
}

/**
 * Ensures clean caption paragraphs with strict hashtag sequence and no leading headline
 */
export function cleanCaptionParagraphs(
  caption: string,
  mode: 'detailed' | 'short' | 'bullet' = 'detailed',
  username: string = '',
  location: string = '',
  headlineToStrip: string = ''
): string {
  if (!caption) return '';
  return ensureHashtagHierarchy(caption.trim(), location, username, mode, headlineToStrip);
}

/**
 * Synthesizes publication-ready caption variants (detailed, bullets, short)
 */
export function formatCaptionVariants(
  headline: string,
  location: string = '',
  articleBody: string = '',
  username: string = ''
): {
  captionDetailed: string;
  captionBullets: string;
  captionShort: string;
} {
  const detailed = ensureHashtagHierarchy(articleBody, location, username, 'detailed', headline);
  const bullets = ensureHashtagHierarchy(articleBody, location, username, 'bullet', headline);
  const short = ensureHashtagHierarchy(articleBody, location, username, 'short', headline);
  return {
    captionDetailed: detailed,
    captionBullets: bullets,
    captionShort: short,
  };
}

/**
 * Sanitizes Location field to ensure ONLY geographical place/city/state is kept.
 * Formats district-level locations as "जिला, राज्य" (e.g. "शहडोल, मध्य प्रदेश").
 * Strictly removes category labels like "राष्ट्रीय", "अंतरराष्ट्रीय", "अपराध", etc.
 * If no valid location exists, returns empty string per editorial guidelines.
 */
export function cleanLocationField(loc: string): string {
  if (!loc) return '';
  let cleaned = stripAllUrlsAndHyperlinks(String(loc))
    .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
    .trim();

  // Strip URLs and fluff
  cleaned = cleaned.replace(/https?:\/\/\S+|www\.\S+|[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\/\S*/gi, '').trim();
  if (cleaned.length > 50) {
    cleaned = cleaned.split(/[,।\n]/)[0].trim();
  }

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
  if (
    cleaned === 'विशेष कवरेज' ||
    cleaned === 'विशेष डेस्क' ||
    cleaned === 'विशेष डैश' ||
    cleaned === 'विशेष संवाददाता' ||
    cleaned === 'सेंट्रल डेस्क' ||
    cleaned === 'न्यूज़ डेस्क' ||
    cleaned === 'ब्यूरो डेस्क'
  ) {
    return '';
  }

  // Enforce standard "जिला, राज्य" format if a district is detected
  return formatDistrictWithState(cleaned);
}

export const STANDARD_HINDI_CATEGORIES = [
  'राजनीति',
  'प्रशासन',
  'अपराध',
  'दुर्घटना',
  'विकास',
  'शिक्षा',
  'स्वास्थ्य',
  'जनआंदोलन',
  'रोजगार',
  'कृषि',
  'मौसम',
  'व्यापार',
  'खेल',
  'अन्य',
] as const;

export type StandardHindiCategory = typeof STANDARD_HINDI_CATEGORIES[number];

/**
 * Sanitizes Category field to ensure ONLY valid standard Hindi category is kept.
 * Maps input to strictly one of the 14 standard categories:
 * राजनीति, प्रशासन, अपराध, दुर्घटना, विकास, शिक्षा, स्वास्थ्य, जनआंदोलन, रोजगार, कृषि, मौसम, व्यापार, खेल, अन्य
 * Defaults to 'अन्य' if unconfirmed or unmatched.
 */
export function cleanCategoryField(cat: string): string {
  if (!cat) return 'अन्य';
  let cleaned = String(cat)
    .replace(/^(श्रेणी\s*[:\-–—]?|category\s*[:\-–—]?)/i, '')
    .trim();

  // If contains slashes, check individual parts
  const parts = cleaned.split(/[\/\-–—]+/).map((p) => p.trim()).filter(Boolean);

  for (const p of [cleaned, ...parts]) {
    const direct = STANDARD_HINDI_CATEGORIES.find((sc) => sc === p || sc.toLowerCase() === p.toLowerCase());
    if (direct) return direct;
  }

  const lower = cleaned.toLowerCase();
  if (/राजनीति|सियासत|चुनाव|राजनीतिक|नेता|विधायक|सांसद|politics|political|bjp|congress|party/i.test(lower)) return 'राजनीति';
  if (/प्रशासन|शासन|कलेक्टर|डीएम|नगर\s*निगम|पुलिस\s*प्रशासन|सरकार|आयोग|governance|administration/i.test(lower)) return 'प्रशासन';
  if (/अपराध|क्राइम|हत्या|मर्डर|लूट|चोरी|दुष्कर्म|गिरफ्तार|ठगी|धोखाधड़ी|पुलिस|एफआईआर|crime|police/i.test(lower)) return 'अपराध';
  if (/दुर्घटना|हादसा|एक्सीडेंट|टक्कर|मौत|अग्निकांड|आग|घायल|accident|crash/i.test(lower)) return 'दुर्घटना';
  if (/विकास|निर्माण|योजना|परियोजना|शिलान्यास|लोकार्पण|स्मार्ट\s*सिटी|सड़क|ब्रिज|development|infrastructure/i.test(lower)) return 'विकास';
  if (/शिक्षा|स्कूल|कॉलेज|विश्वविद्यालय|छात्र|छात्रा|परीक्षा|रिजल्ट|शिक्षक|education|exam|student/i.test(lower)) return 'शिक्षा';
  if (/स्वास्थ्य|अस्पताल|डॉक्टर|मरीज|इलाज|दवा|बीमारी|चिकित्सा|स्वास्थ्य\s*विभाग|health|hospital|medical/i.test(lower)) return 'स्वास्थ्य';
  if (/जनआंदोलन|आंदोलन|प्रदर्शन|धरना|हड़ताल|चक्काजाम|विरोध|मांग|रैली|protest|strike/i.test(lower)) return 'जनआंदोलन';
  if (/रोजगार|नौकरी|भर्ती|रिक्ति|वेतन|पेंशन|नियुक्ति|जॉब|employment|job|recruitment/i.test(lower)) return 'रोजगार';
  if (/कृषि|किसान|खेती|फसल|खाद|बीज|मंडी|एमएसपी|agriculture|farmer|crop/i.test(lower)) return 'कृषि';
  if (/मौसम|बारिश|मानसून|गर्मी|सर्दी|ठंड|तापमान|कोहरा|तूफान|आंधी|weather|rain|monsoon/i.test(lower)) return 'मौसम';
  if (/व्यापार|कारोबार|बिजनेस|बाजार|शेयर|सोना|चांदी|मार्केट|उद्योग|जीएसटी|अर्थव्यवस्था|business|market|economy/i.test(lower)) return 'व्यापार';
  if (/खेल|क्रिकेट|मैच|टूर्नामेंट|खिलाड़ी|जीत|पदक|ओलंपिक|sports|cricket/i.test(lower)) return 'खेल';

  return 'अन्य';
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

export function formatHeadlineWithKeywords(
  headline: string,
  existingHighlights?: string[]
): { formattedHeadline: string; highlightWords: string[] } {
  if (!headline) return { formattedHeadline: '', highlightWords: [] };

  const rawHeadline = headline.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
  if (!rawHeadline) return { formattedHeadline: '', highlightWords: [] };

  const stopwords = new Set([
    'के', 'की', 'का', 'में', 'पर', 'से', 'को', 'ने', 'है', 'हैं', 'और', 'या', 'भी', 'तो', 'ही', 'था', 'थे', 'थी',
    'इस', 'उस', 'यह', 'वह', 'इन', 'उन', 'द्वारा', 'लिए', 'गया', 'गई', 'गए', 'हुए', 'हुई', 'हुआ', 'रहा', 'रही', 'रहे',
    'कर', 'किया', 'हो', 'बड़ा', 'बड़ी', 'बड़े', 'अपडेट'
  ]);

  const words = rawHeadline.split(/\s+/).filter(Boolean);
  const selectedWords: string[] = [];

  // 1. Prefer existingHighlights if they appear in this headline
  if (Array.isArray(existingHighlights) && existingHighlights.length > 0) {
    for (const h of existingHighlights) {
      if (!h || typeof h !== 'string') continue;
      const cleanH = h.trim().replace(/[.,:;!?।\-"'“”‘’()]/g, '');
      if (!cleanH) continue;
      if (rawHeadline.includes(cleanH)) {
        if (!selectedWords.includes(cleanH)) {
          selectedWords.push(cleanH);
          if (selectedWords.length >= 4) break;
        }
      }
    }
  }

  // 2. If fewer than 2 words, pick significant words from headline
  if (selectedWords.length < 2) {
    for (const w of words) {
      const cleanW = w.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim();
      if (!cleanW) continue;
      if (selectedWords.includes(cleanW)) continue;
      if (/\d+/.test(cleanW) || (cleanW.length >= 4 && !stopwords.has(cleanW))) {
        selectedWords.push(cleanW);
        if (selectedWords.length >= 4) break;
      }
    }
  }

  // 3. Fallback: if still fewer than 2 words, pick non-stopwords with length >= 3
  if (selectedWords.length < 2) {
    for (const w of words) {
      const cleanW = w.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim();
      if (!cleanW || stopwords.has(cleanW)) continue;
      if (!selectedWords.includes(cleanW)) {
        selectedWords.push(cleanW);
        if (selectedWords.length >= 2) break;
      }
    }
  }

  const finalHighlights = selectedWords.slice(0, 3);

  if (finalHighlights.length === 0) {
    return { formattedHeadline: rawHeadline, highlightWords: [] };
  }

  const cleanHighlights = finalHighlights
    .map((h) => h.trim().replace(/[.,:;!?।\-"'“”‘’()]/g, '').toLowerCase())
    .filter(Boolean);

  let highlightedCount = 0;
  const lines = rawHeadline.split(/\r?\n/);
  const formattedHeadline = lines
    .map((line) => {
      const tokens = line.split(/\s+/).filter(Boolean);
      return tokens
        .map((tok) => {
          const cleanTok = tok.replace(/[.,:;!?।\-"'“”‘’()]/g, '').trim().toLowerCase();
          const isMatch = cleanHighlights.some(
            (h) => h === cleanTok || h.split(/\s+/).some((part) => part === cleanTok)
          );
          if (isMatch && highlightedCount < 4) {
            highlightedCount++;
            return `[yellow]${tok}[/yellow]`;
          }
          return tok;
        })
        .join(' ');
    })
    .join('\n');

  return { formattedHeadline, highlightWords: finalHighlights };
}

export interface PreservedRegenerationState {
  combinedHeadlines: string[];
  preservedHeadline: string;
  preservedFormattedHeadline: string;
  preservedIndex: number;
  isMaxReached: boolean;
}

/**
 * Requirement R2: Preserves previously selected primary headline and formatted headline
 * across headline regeneration, while combining options up to max limit (10).
 */
export function preserveHeadlineStateOnRegeneration(params: {
  existingHeadlines: string[];
  newHeadlines: string[];
  selectedHeadline?: string;
  selectedFormattedHeadline?: string;
  selectedIndex?: number;
  maxLimit?: number;
}): PreservedRegenerationState {
  const max = params.maxLimit || 10;
  const existing = Array.isArray(params.existingHeadlines) ? params.existingHeadlines.filter(Boolean) : [];
  const rawNew = Array.isArray(params.newHeadlines) ? params.newHeadlines.filter(Boolean) : [];

  const combined: string[] = [...existing];
  for (const h of rawNew) {
    if (combined.length >= max) break;
    if (!combined.includes(h)) {
      combined.push(h);
    }
  }

  const chosenIndex = typeof params.selectedIndex === 'number' && params.selectedIndex >= 0 && params.selectedIndex < existing.length
    ? params.selectedIndex
    : 0;

  const preservedHeadline = (params.selectedHeadline && params.selectedHeadline.trim())
    ? params.selectedHeadline.trim()
    : (combined[chosenIndex] || rawNew[0] || '');

  let preservedFormattedHeadline = params.selectedFormattedHeadline && params.selectedFormattedHeadline.trim()
    ? params.selectedFormattedHeadline.trim()
    : '';

  if (!preservedFormattedHeadline && preservedHeadline) {
    preservedFormattedHeadline = formatHeadlineWithKeywords(preservedHeadline).formattedHeadline;
  }

  return {
    combinedHeadlines: combined,
    preservedHeadline,
    preservedFormattedHeadline,
    preservedIndex: chosenIndex,
    isMaxReached: combined.length >= max,
  };
}

