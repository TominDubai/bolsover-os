// Bolsover OS Service Worker
const CACHE_NAME = 'bolsover-os-v2';

// Install event - skip caching for now
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - always go to network, no offline fallback during development
self.addEventListener('fetch', (event) => {
  // Just pass through to network
  return;
});
