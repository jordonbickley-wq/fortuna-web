/* =============================================================
   Service worker
   Two jobs: make the app open instantly on repeat visits, and
   degrade gracefully on a bad mobile connection.

   Deliberate caching policy:
   - the shell (html/css/js/icons) is cached and served cache-first
   - API responses are NEVER cached. Draw results, tarot cards and
     payment state must always be live; a stale lottery result or a
     cached "not yet unlocked" would be worse than a slow load.
   ============================================================= */

const CACHE = 'fortuna-shell-v1';

const SHELL = [
  '/',
  '/styles.css',
  '/app.js',
  '/background.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails the whole install if any single file 404s, so add
      // them individually and tolerate misses.
      Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave fonts/CDNs alone

  // Never serve API data from cache - see note at top.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth')) {
    return;
  }

  // Navigations: try the network first so content stays fresh, fall back
  // to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first for instant repeat loads.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
    )
  );
});
