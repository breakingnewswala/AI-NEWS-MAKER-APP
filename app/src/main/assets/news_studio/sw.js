// Service Worker for Progressive Web App (PWA)
const CACHE_NAME = 'news-graphic-studio-v2026-10-02-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch navigation requests, index.html, and json directly from network (no-store)
  if (
    event.request.mode === 'navigate' ||
    event.request.url.includes('index.html') ||
    event.request.url.endsWith('.json') ||
    event.request.url.includes('version.json')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
