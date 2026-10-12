// Custom Frame Manager for PRO & VIP DESK Users
// Supports Multiple TRUE 4:5 Custom Frames with Name, Asset URL, User Association, and Persistence

export interface CustomFrameItem {
  id: string;
  userId: string;
  name: string;
  assetUrl: string;
  aspectRatio: '4:5';
  createdAt: number;
}

const STORAGE_KEY_FRAMES = 'ai_news_custom_frames_catalog_v1';
const STORAGE_KEY_ACTIVE_FRAME = 'ai_news_active_custom_frame_id';

export function getCustomFrames(userEmailOrId?: string): CustomFrameItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    if (!raw) return [];
    const list: CustomFrameItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (!userEmailOrId) return list;
    const cleanId = userEmailOrId.toLowerCase().trim();
    return list.filter((f) => !f.userId || f.userId.toLowerCase().trim() === cleanId);
  } catch (e) {
    console.warn('Error reading custom frames:', e);
    return [];
  }
}

export function saveCustomFrame(data: {
  userId: string;
  name: string;
  assetUrl: string;
}): CustomFrameItem {
  const newFrame: CustomFrameItem = {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: (data.userId || 'general').toLowerCase().trim(),
    name: data.name.trim() || 'कस्टम 4:5 फ्रेम',
    assetUrl: data.assetUrl,
    aspectRatio: '4:5',
    createdAt: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getCustomFrames();
      const updated = [newFrame, ...existing];
      localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_ACTIVE_FRAME, newFrame.id);
      window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated', { detail: newFrame }));
    } catch (e) {
      console.warn('Error saving custom frame:', e);
    }
  }

  return newFrame;
}

export function deleteCustomFrame(frameId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomFrames();
    const updated = existing.filter((f) => f.id !== frameId);
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updated));
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_FRAME);
    if (active === frameId) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_FRAME);
    }
    window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated'));
  } catch (e) {
    console.warn('Error deleting custom frame:', e);
  }
}

export function getActiveCustomFrameId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_FRAME) || null;
}

export function setActiveCustomFrameId(frameId: string | null): void {
  if (typeof window === 'undefined') return;
  if (!frameId) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_FRAME);
  } else {
    localStorage.setItem(STORAGE_KEY_ACTIVE_FRAME, frameId);
  }
  window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated'));
}

export function getActiveCustomFrame(userEmailOrId?: string): CustomFrameItem | null {
  const activeId = getActiveCustomFrameId();
  if (!activeId) return null;
  const frames = getCustomFrames(userEmailOrId);
  return frames.find((f) => f.id === activeId) || null;
}
