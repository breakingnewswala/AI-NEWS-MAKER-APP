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

export function saveNotifications(list: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ai_news_notifications_updated', { detail: list }));
  } catch {}
}

export function markAllNotificationsAsRead(): AppNotification[] {
  const current = getNotifications().map((n) => ({ ...n, unread: false }));
  saveNotifications(current);
  return current;
}

export function markNotificationAsRead(id: string): AppNotification[] {
  const current = getNotifications().map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveNotifications(current);
  return current;
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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
