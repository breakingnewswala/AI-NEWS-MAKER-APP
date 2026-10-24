import { NewsCardData, FrameDesign } from '../types';
import { getAssignedCustomHeaderFooter } from './userPlanManager';

export function getActiveHeaderPng(card: NewsCardData): string | undefined {
  const assigned = getAssignedCustomHeaderFooter();
  if (assigned && assigned.active && assigned.headerUrl) {
    return assigned.headerUrl;
  }
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
