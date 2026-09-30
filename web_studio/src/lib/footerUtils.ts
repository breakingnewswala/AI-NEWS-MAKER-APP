import { NewsCardData, FrameDesign } from '../types';

export function getFrameDesignLabel(design?: FrameDesign): string {
  switch (design) {
    case 'jacket-breaking-red':
      return 'सुपर ब्रेकिंग (Super Breaking)';
    case 'jacket-quote':
      return 'बयान एवं कोटेशन (Statement Quote)';
    case 'jacket-investigation':
      return 'विशेष पड़ताल (Investigation)';
    case 'jacket-text-breaking':
      return 'टेक्स्ट ब्रेकिंग (Text Only Breaking)';
    case 'jacket-morning':
      return 'मॉर्निंग जैकेट (Morning Jacket)';
    case 'jacket-epaper':
      return 'ई-पेपर जैकेट (E-Paper Jacket)';
    case 'custom-png':
      return 'कस्टम पीएनजी फ्रेम (Custom PNG)';
    case 'jacket-original':
    default:
      return 'ब्रेकिंग न्यूज़ वाला (मूल जैकेट)';
  }
}

export function getActiveFooterPng(card: NewsCardData): string | undefined {
  const design = card.frameDesign || 'jacket-original';
  if (card.footersByDesign && card.footersByDesign[design] !== undefined) {
    return card.footersByDesign[design];
  }
  return card.customFooterPng;
}

export function setActiveFooterPng(
  card: NewsCardData,
  newFooterUrl: string | undefined
): Partial<NewsCardData> {
  const design = card.frameDesign || 'jacket-original';
  const existingFooters = { ...(card.footersByDesign || {}) };
  if (newFooterUrl) {
    existingFooters[design] = newFooterUrl;
  } else {
    delete existingFooters[design];
  }

  return {
    customFooterPng: newFooterUrl || undefined,
    footersByDesign: existingFooters,
  };
}

