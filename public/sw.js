const CACHE_NAME = 'vempat-cache-v1';
const ASSETS = ['/', '/index.html', '/index.css', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

// Listen for periodic/background sync events and notify clients
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_QUEUE' });
        }
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Always fallback to cache for navigations (app shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        // Only cache successful GET navigations
        if (req.method === 'GET' && res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Only cache GET responses
      if (req.method === 'GET' && res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => {
      // Optional: return a fallback image for images
      return caches.match('/icons/icon-192.svg');
    }))
  );
});
