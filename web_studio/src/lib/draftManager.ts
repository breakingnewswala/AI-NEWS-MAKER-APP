// AI News Maker - Draft Management System
// Full Editable State, Debounced Auto-Draft & Instant Restore

import { NewsCardData } from '../types';

export interface SavedDraftRecord {
  id: string;
  name: string;
  savedAt: string;
  updatedAt: number;
  card: NewsCardData;
  activeStep: number;
  isAutoDraft?: boolean;
}

const STORAGE_KEY_DRAFTS_LIST = 'ai_news_maker_saved_drafts_v2';
const STORAGE_KEY_ACTIVE_DRAFT_ID = 'ai_news_maker_active_draft_id_v2';

export function getSavedDrafts(): SavedDraftRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }
  } catch {}
  return [];
}

export function getActiveDraftId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_DRAFT_ID) || '';
  } catch {
    return '';
  }
}

export function setActiveDraftId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT_ID, id);
  } catch {}
}

/**
 * Saves or updates a draft with FULL editable state.
 * Uses consistent draftId to avoid duplicates.
 */
export function saveOrUpdateDraft(
  card: NewsCardData,
  activeStep: number = 1,
  existingDraftId?: string,
  isAutoDraft: boolean = false
): { draft: SavedDraftRecord; drafts: SavedDraftRecord[] } {
  const currentList = getSavedDrafts();
  const draftId = existingDraftId || getActiveDraftId() || `draft_${Date.now()}`;
  setActiveDraftId(draftId);

  const cleanHeadline = (card.headline || '').replace(/\[\/?yellow\]/g, '').trim();
  const draftName = cleanHeadline.length > 0 && !cleanHeadline.includes('यहाँ आपकी हेडलाइन आएगी')
    ? cleanHeadline.slice(0, 45)
    : `ड्राफ्ट प्रोजेक्ट (${new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })})`;

  const newRecord: SavedDraftRecord = {
    id: draftId,
    name: draftName,
    savedAt: new Date().toLocaleString('hi-IN'),
    updatedAt: Date.now(),
    card: { ...card },
    activeStep,
    isAutoDraft,
  };

  // Replace existing draft with same ID or prepend
  const filtered = currentList.filter((d) => d.id !== draftId);
  const updatedList = [newRecord, ...filtered].slice(0, 20); // Keep max 20 recent drafts

  try {
    localStorage.setItem(STORAGE_KEY_DRAFTS_LIST, JSON.stringify(updatedList));
    localStorage.setItem('graphic_news_saved_draft', JSON.stringify({ card, savedAt: newRecord.savedAt }));
    window.dispatchEvent(new CustomEvent('ai_news_drafts_updated', { detail: updatedList }));
  } catch (e) {
    console.warn('Could not save draft to localStorage', e);
  }

  return { draft: newRecord, drafts: updatedList };
}

export function deleteDraft(id: string): SavedDraftRecord[] {
  const currentList = getSavedDrafts();
  const updated = currentList.filter((d) => d.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_DRAFTS_LIST, JSON.stringify(updated));
    if (getActiveDraftId() === id) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_DRAFT_ID);
    }
    window.dispatchEvent(new CustomEvent('ai_news_drafts_updated', { detail: updated }));
  } catch {}
  return updated;
}
