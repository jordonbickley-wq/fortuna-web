/* =============================================================
   Service worker

   Caching policy, and why:
   - shell (html/css/js) -> stale-while-revalidate. Fast on repeat
     visits, but always refreshes in the background so a deploy shows
     up on the next load rather than never.
   - API responses      -> never cached. Draw dates, tarot cards and
     payment state must always be live.
   - QR / payment images -> never cached. These are the one thing that
     MUST be current: serving a stale PromptPay QR would send money to
     the wrong place. Worth the extra request every time.
   ============================================================= */

// Bump this string on any deploy that changes cached assets - it wipes
// the previous cache entirely.
const CACHE = 'fortuna-shell-v3';

const SHELL = [
  '/',
  '/styles.css',
  '/app.js',
  '/background.js',
  '/rub.js',
  '/manifest.json',
];

// Anything payment-related is fetched fresh, always.
const NEVER_CACHE = [/promptpay/i, /line-contact/i, /qr/i];

function isNeverCached(pathname) {
  return NEVER_CACHE.some((re) => re.test(pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Live data and payment images: straight to the network.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/auth') ||
    isNeverCached(url.pathname)
  ) {
    return;
  }

  // Navigations: network first, cached shell as the offline fallback.
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

  // Static assets: serve cached copy immediately, but refresh it in the
  // background so the next load has the new version.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
