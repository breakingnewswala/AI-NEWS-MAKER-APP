import { NewsCardData, FrameDesign } from '../types';

export function getActiveHeaderPng(card: NewsCardData): string | undefined {
  const design = card.frameDesign || 'jacket-original';
  if (card.headersByDesign && card.headersByDesign[design] !== undefined) {
    return card.headersByDesign[design];
  }
  return card.customHeaderPng;
}

export function setActiveHeaderPng(
  card: NewsCardData,
  newHeaderUrl: string | undefined,
  targetDesign?: FrameDesign
): Partial<NewsCardData> {
  const design = targetDesign || card.frameDesign || 'jacket-original';
  const existingHeaders = { ...(card.headersByDesign || {}) };
  if (newHeaderUrl) {
    existingHeaders[design] = newHeaderUrl;
  } else {
    delete existingHeaders[design];
  }

  return {
    customHeaderPng: newHeaderUrl || undefined,
    headersByDesign: existingHeaders,
  };
}
