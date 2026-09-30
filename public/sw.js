// Keep the existing cache so an update preserves pages already visited.
const CACHE_NAME = 'scholarab-v9';

// Fetch only the self-contained fallback at install. Full pages enter the
// runtime cache when visited, rather than downloading unseen directories.
// /offline is the production 200 URL; /offline.html redirects, and a cached
// redirected response cannot satisfy a navigation with redirect mode manual.
const OFFLINE_URL = '/offline';
const MAX_RUNTIME_ENTRIES = 60;

async function trimCache(cache) {
  const keys = await cache.keys();
  const fallback = new URL(OFFLINE_URL, self.location.origin).href;
  // Oldest first: cache.keys() returns insertion order, so dropping from the
  // front evicts what was least recently added. The fallback is never evicted.
  const evictable = keys.filter((req) => req.url !== fallback);
  const over = evictable.length - MAX_RUNTIME_ENTRIES;
  for (let i = 0; i < over; i++) await cache.delete(evictable[i]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Reject a failed install so the previous worker remains available instead
    // of activating a worker whose required offline fallback was not fetched.
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const { pathname } = new URL(event.request.url);
  // Never cache API or admin routes; auth state and data mutations must always be fresh
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin/')) return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(event.request, clone);
              await trimCache(cache);
            }).catch(() => {})
          );
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigation) return caches.match(OFFLINE_URL);
        })
      )
  );
});
