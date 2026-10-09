// Custom Frames Cloud & Local Storage Manager
// Enables uploading, naming, persisting and applying 4:5 Custom Frames

export interface CustomFrame {
  id: string;
  userId?: string;
  name: string;
  assetUrl: string;
  headerUrl?: string;
  footerUrl?: string;
  frameType?: 'full_4_5' | 'header_footer';
  aspectRatio: '4:5';
  createdAt: number;
}

export type CustomFrameItem = CustomFrame;

const STORAGE_KEY = 'ai_news_custom_frames_v1';
const STORAGE_KEY_ACTIVE = 'ai_news_active_custom_frame_id';

export function getLocalCustomFrames(userId?: string): CustomFrame[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (!userId) return list;
    const cleanId = userId.toLowerCase().trim();
    return list.filter((f) => !f.userId || f.userId.toLowerCase().trim() === cleanId || f.userId === 'general');
  } catch {
    return [];
  }
}

export const getCustomFrames = getLocalCustomFrames;

export async function fetchCustomFrames(userId?: string): Promise<CustomFrame[]> {
  try {
    const url = userId ? `/api/custom-frames?userId=${encodeURIComponent(userId)}` : '/api/custom-frames';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.frames)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.frames));
        }
        return data.frames;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch custom frames from cloud:', e);
  }
  return getLocalCustomFrames(userId);
}

export async function saveCustomFrameToCloud(frame: {
  name: string;
  assetUrl: string;
  headerUrl?: string;
  footerUrl?: string;
  frameType?: 'full_4_5' | 'header_footer';
  userId?: string;
}): Promise<CustomFrame | null> {
  const newFrame: CustomFrame = {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: frame.name.trim() || 'कस्टम 4:5 फ्रेम',
    assetUrl: frame.assetUrl || frame.headerUrl || frame.footerUrl || '',
    headerUrl: frame.headerUrl,
    footerUrl: frame.footerUrl,
    frameType: frame.frameType || (frame.headerUrl || frame.footerUrl ? 'header_footer' : 'full_4_5'),
    userId: frame.userId || 'general',
    aspectRatio: '4:5',
    createdAt: Date.now(),
  };

  const existing = getLocalCustomFrames();
  const updated = [newFrame, ...existing.filter((f) => f.id !== newFrame.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated', { detail: newFrame }));
  }

  try {
    const res = await fetch('/api/custom-frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFrame),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.frame) {
        return data.frame;
      }
    }
  } catch (e) {
    console.warn('Failed to save custom frame to backend:', e);
  }

  return newFrame;
}

export function saveCustomFrame(data: {
  userId?: string;
  name: string;
  assetUrl: string;
  headerUrl?: string;
  footerUrl?: string;
  frameType?: 'full_4_5' | 'header_footer';
}): CustomFrameItem {
  const frame: CustomFrameItem = {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: data.name.trim() || 'कस्टम फ्रेम',
    assetUrl: data.assetUrl || data.headerUrl || data.footerUrl || '',
    headerUrl: data.headerUrl,
    footerUrl: data.footerUrl,
    frameType: data.frameType || (data.headerUrl || data.footerUrl ? 'header_footer' : 'full_4_5'),
    userId: data.userId || 'general',
    aspectRatio: '4:5',
    createdAt: Date.now(),
  };

  const existing = getLocalCustomFrames();
  const updated = [frame, ...existing.filter((f) => f.id !== frame.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ACTIVE, frame.id);
    window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated', { detail: frame }));
  }

  // Also sync to cloud asynchronously
  fetch('/api/custom-frames', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(frame),
  }).catch((e) => console.warn('Cloud frame sync background fail:', e));

  return frame;
}

export function deleteCustomFrame(id: string): void {
  deleteCustomFrameFromCloud(id);
}

export async function deleteCustomFrameFromCloud(id: string): Promise<void> {
  const existing = getLocalCustomFrames();
  const updated = existing.filter((f) => f.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (active === id) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
    window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated'));
  }
  try {
    await fetch(`/api/custom-frames/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Failed to delete custom frame from backend:', e);
  }
}

export function getActiveCustomFrameId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE) || null;
}

export function setActiveCustomFrameId(frameId: string | null): void {
  if (typeof window === 'undefined') return;
  if (!frameId) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
  } else {
    localStorage.setItem(STORAGE_KEY_ACTIVE, frameId);
  }
  window.dispatchEvent(new CustomEvent('ai_news_custom_frames_updated'));
}

export function getActiveCustomFrame(userEmailOrId?: string): CustomFrameItem | null {
  const activeId = getActiveCustomFrameId();
  if (!activeId) return null;
  const frames = getLocalCustomFrames(userEmailOrId);
  return frames.find((f) => f.id === activeId) || null;
}
