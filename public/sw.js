// Service Worker for Progressive Web App (PWA) & Web Push Notifications
const CACHE_NAME = 'news-graphic-studio-v2026-11-05-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through requests naturally with network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Web Push Notification Event Handler (Background & PWA)
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: 'AI News Maker',
      message: event.data ? event.data.text() : 'नया समाचार अपडेट उपलब्ध है।'
    };
  }

  const title = payload.title || 'AI News Maker';
  const options = {
    body: payload.message || payload.body || 'नया समाचार अपडेट उपलब्ध है।',
    icon: payload.icon || '/assets/ai_news_maker_logo.png',
    badge: '/assets/ai_news_maker_logo.png',
    tag: payload.id || `notif_${Date.now()}`,
    data: {
      url: payload.url || (payload.linkTab ? `/?tab=${payload.linkTab}` : '/'),
      newsId: payload.newsId || payload.postId,
      linkTab: payload.linkTab || 'home',
    },
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Routing
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'notification_clicked',
            data: notifData,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
