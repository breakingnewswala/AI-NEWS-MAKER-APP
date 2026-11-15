// AI NEWS MAKER - News Card Reminder Manager
// Schedules durable reminders (5, 10, 20, 30 min) with Web Notification & Backend Scheduler

import { getApiUrl } from './apiConfig';

export interface UserReminderItem {
  id: string;
  newsId: string;
  newsTitle: string;
  minutes: number;
  dueAt: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'cancelled';
}

const STORAGE_KEY_PREFIX = 'ai_news_user_reminders_';

export function getRemindersStorageKey(email?: string): string {
  const clean = (email || '').toLowerCase().trim();
  return clean ? `${STORAGE_KEY_PREFIX}${clean}` : `${STORAGE_KEY_PREFIX}anonymous`;
}

export function getUserRemindersLocal(email?: string): UserReminderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getRemindersStorageKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((r) => r.status === 'pending');
    }
  } catch {}
  return [];
}

export function saveUserRemindersLocal(email: string, reminders: UserReminderItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getRemindersStorageKey(email), JSON.stringify(reminders));
    window.dispatchEvent(new CustomEvent('ai_news_reminders_updated', { detail: { reminders } }));
  } catch {}
}

export async function requestNotificationPermissionIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

export async function scheduleNewsReminder(
  newsId: string,
  newsTitle: string,
  minutes: number,
  email?: string
): Promise<{ success: boolean; reminder?: UserReminderItem; message: string }> {
  const clean = (email || '').toLowerCase().trim();
  const mins = [5, 10, 20, 30].includes(minutes) ? minutes : 5;
  const dueAt = Date.now() + mins * 60 * 1000;

  // Request browser notification permission if default
  await requestNotificationPermissionIfNeeded();

  const newReminder: UserReminderItem = {
    id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    newsId,
    newsTitle: newsTitle.trim() || 'समाचार',
    minutes: mins,
    dueAt,
    createdAt: Date.now(),
    status: 'pending',
  };

  const existing = getUserRemindersLocal(clean).filter((r) => r.newsId !== newsId);
  existing.push(newReminder);
  saveUserRemindersLocal(clean, existing);

  // Set foreground fallback timer in case user keeps window open
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⏰ न्यूज़ ग्राफिक रिमाइंडर', {
            body: `आपने यह खबर ग्राफिक बनाने के लिए रिमाइंडर में रखी थी। अब इस खबर से ग्राफिक बनाएँ: "${newsTitle.slice(0, 70)}"`,
            icon: '/assets/breaking_news_wala_logo.png',
          });
        }
      } catch {}
    }, mins * 60 * 1000);
  }

  // Persist to backend scheduler for durable delivery when tab is closed
  try {
    const url = `${getApiUrl()}/api/reminders`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clean,
        newsId,
        newsTitle,
        minutes: mins,
        action: 'create',
      }),
    }).catch((e) => console.warn('Background reminder sync failed:', e));
  } catch {}

  return {
    success: true,
    reminder: newReminder,
    message: `${mins} मिनट बाद का रिमाइंडर सेट हो गया है।`,
  };
}

export async function cancelNewsReminder(newsId: string, email?: string): Promise<boolean> {
  const clean = (email || '').toLowerCase().trim();
  const existing = getUserRemindersLocal(clean).filter((r) => r.newsId !== newsId);
  saveUserRemindersLocal(clean, existing);

  try {
    const url = `${getApiUrl()}/api/reminders`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clean,
        newsId,
        action: 'cancel',
      }),
    }).catch(() => {});
  } catch {}

  return true;
}
