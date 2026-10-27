// Real-time Notification Manager for AI News Maker
// Supports Web Notification API + Local/Remote persistence + Broadcasts

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  time: string;
  timestamp: number;
  unread: boolean;
  type?: 'news' | 'system' | 'plan' | 'admin' | 'studio';
  linkTab?: 'home' | 'videos' | 'studio' | 'epaper' | 'profile';
}

const STORAGE_KEY = 'ai_news_real_notifications_v1';
const PERMISSION_ASKED_KEY = 'ai_news_notif_permission_prompted';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n_init_1',
    title: 'डिजिटल लाइव न्यूज़ डेस्क सक्रिय है',
    message: 'सभी ताज़ा राष्ट्रीय व प्रादेशिक समाचार अपडेट उपलब्ध हैं।',
    time: 'अभी',
    timestamp: Date.now() - 60000,
    unread: true,
    type: 'system',
    linkTab: 'home',
  },
  {
    id: 'n_init_2',
    title: 'नया ग्राफिक स्टूडियो v2.5 लाइव',
    message: 'फिक्स लोगो स्केलिंग व मास्टर ब्रांडिंग फुटर सक्रिय है।',
    time: '20 मिनट पहले',
    timestamp: Date.now() - 1200000,
    unread: true,
    type: 'studio',
    linkTab: 'studio',
  },
];

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    const list: AppNotification[] = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function syncAppBadge(count?: number): void {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      const unread = count !== undefined ? count : getUnreadNotificationCount();
      if (unread > 0) {
        (navigator as any).setAppBadge(unread).catch(() => {});
      } else if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    } catch {}
  }
}

export function saveNotifications(list: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    syncAppBadge(list.filter((n) => n.unread).length);
    window.dispatchEvent(new CustomEvent('ai_news_notifications_updated', { detail: list }));
  } catch {}
}

export function markAllNotificationsAsRead(userEmail?: string): AppNotification[] {
  const current = getNotifications().map((n) => ({ ...n, unread: false }));
  saveNotifications(current);
  if (typeof window !== 'undefined') {
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, email: userEmail || '' }),
    }).catch(() => {});
  }
  return current;
}

export function markNotificationAsRead(id: string): AppNotification[] {
  const current = getNotifications().map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveNotifications(current);
  if (typeof window !== 'undefined') {
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }
  return current;
}

export async function fetchNotificationsFromServer(userEmail?: string): Promise<AppNotification[]> {
  if (typeof window === 'undefined') return getNotifications();
  try {
    const emailParam = userEmail ? `?email=${encodeURIComponent(userEmail.trim())}` : '';
    const res = await fetch(`/api/notifications${emailParam}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        const serverNotifs: AppNotification[] = data.notifications;
        const localList = getNotifications();
        const serverIds = new Set(serverNotifs.map((n) => n.id));
        const merged = [
          ...serverNotifs,
          ...localList.filter((n) => !serverIds.has(n.id)),
        ].slice(0, 50);
        saveNotifications(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Error fetching notifications from server:', err);
  }
  return getNotifications();
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'unread'> & { id?: string; unread?: boolean }): AppNotification {
  const full: AppNotification = {
    id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: notif.title,
    message: notif.message,
    time: notif.time || 'अभी',
    timestamp: Date.now(),
    unread: notif.unread !== undefined ? notif.unread : true,
    type: notif.type || 'news',
    linkTab: notif.linkTab,
  };

  const list = [full, ...getNotifications().filter((n) => n.id !== full.id)].slice(0, 30);
  saveNotifications(list);

  // Trigger Native Browser Notification if permitted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(full.title, {
        body: full.message || 'AI News Maker नया नोटिफिकेशन',
        icon: '/assets/ai_news_maker_logo.png',
      });
    } catch {}
  }

  return full;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window !== 'undefined' && (window as any).AndroidBridge?.requestNotificationPermission) {
    try {
      localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
      const res = (window as any).AndroidBridge.requestNotificationPermission();
      return (res as NotificationPermission) || 'default';
    } catch {}
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'unsupported';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window !== 'undefined' && (window as any).AndroidBridge?.getNotificationPermissionStatus) {
    try {
      const res = (window as any).AndroidBridge.getNotificationPermissionStatus();
      if (res === 'granted' || res === 'denied' || res === 'default') {
        return res;
      }
    } catch {}
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// ==========================================
// SOUND CONTROLS & WEB AUDIO API SYNTHESIZER
// ==========================================
export interface AppSoundSettings {
  soundEnabled: boolean;
  normalVolume: number;   // 0.0 to 1.0
  breakingVolume: number; // 0.0 to 1.0
}

const SOUND_SETTINGS_KEY = 'ai_news_sound_settings_v1';
const DEFAULT_SOUND_SETTINGS: AppSoundSettings = {
  soundEnabled: true,
  normalVolume: 0.6,
  breakingVolume: 0.9,
};

export function getSoundSettings(): AppSoundSettings {
  if (typeof window === 'undefined') return DEFAULT_SOUND_SETTINGS;
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
      normalVolume: typeof parsed.normalVolume === 'number' ? Math.max(0, Math.min(1, parsed.normalVolume)) : 0.6,
      breakingVolume: typeof parsed.breakingVolume === 'number' ? Math.max(0, Math.min(1, parsed.breakingVolume)) : 0.9,
    };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings: Partial<AppSoundSettings>): AppSoundSettings {
  const current = getSoundSettings();
  const updated: AppSoundSettings = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai_news_sound_settings_updated', { detail: updated }));
    } catch {}
  }
  return updated;
}

// Web Audio API Audio Context Helper
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Standard notification ping (subtle, clean 880Hz -> 1320Hz bell)
 */
export function playNormalNotificationSound(): void {
  const settings = getSoundSettings();
  if (!settings.soundEnabled || settings.normalVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.14);

    gain.gain.setValueAtTime(settings.normalVolume * 0.40, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch {}
}

/**
 * Louder Breaking News Alert Tone (Multi-tone urgent newsroom chime)
 */
export function playBreakingNewsAlertSound(): void {
  const settings = getSoundSettings();
  if (!settings.soundEnabled || settings.breakingVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0.00, dur: 0.14 }, // D5
      { freq: 880.00, start: 0.12, dur: 0.16 }, // A5
      { freq: 1174.66, start: 0.26, dur: 0.35 }, // D6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      const targetGain = settings.breakingVolume * 0.35;
      gain.gain.setValueAtTime(targetGain, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    });
  } catch {}
}

// ==========================================
// BREAKING NEWS ALERT DEDUPLICATION & TRIGGER
// ==========================================
const SEEN_BREAKING_KEY = 'app_seen_breaking_news_ids_v1';

function getSeenBreakingIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_BREAKING_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markBreakingIdSeen(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const seen = getSeenBreakingIds();
    seen.add(id);
    const arr = Array.from(seen).slice(-100); // keep last 100
    localStorage.setItem(SEEN_BREAKING_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Triggers Breaking News Alert if story was not previously alerted
 */
export function triggerBreakingNewsAlert(story: { id: string; title: string; summary?: string }): boolean {
  if (!story || !story.id) return false;
  const seen = getSeenBreakingIds();
  if (seen.has(story.id)) {
    return false; // Deduplicated!
  }

  markBreakingIdSeen(story.id);

  // 1. Play louder Breaking News alert chime
  playBreakingNewsAlertSound();

  // 2. Add high-priority unread notification
  addNotification({
    id: `breaking_${story.id}`,
    title: `🚨 ब्रेकिंग न्यूज़: ${story.title}`,
    message: story.summary || 'प्रमुख समाचार डेस्क से ताज़ा अपडेट प्राप्त हुआ है।',
    time: 'अभी',
    type: 'news',
    linkTab: 'home',
    unread: true,
  });

  return true;
}


export function getUnreadNotificationCount(): number {
  return getNotifications().filter((n) => n.unread).length;
}
