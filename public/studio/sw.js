// Service Worker for Progressive Web App (PWA)
const CACHE_NAME = 'news-graphic-studio-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through requests naturally
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
