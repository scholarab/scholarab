// v8: the runtime cache is capped. The bump matters; activate() drops every
// cache whose key isn't this one, which is what evicts both the stale /app
// page and any unbounded cache an older worker already filled.
const CACHE_NAME = 'scholarab-v8';
const PAGES_TO_CACHE = ['/', '/scholarships', '/programs', '/saved', '/about', '/offline.html'];

// Every successful same-origin GET used to be cached and nothing ever removed
// one, so a reader working through the directory accumulated a cache entry per
// listing, forever, on top of every hashed asset each of those pages pulled.
// There are 150+ listings. The point of this worker is an offline fallback,
// not a mirror of the site, and a browser that decides the origin is using too
// much simply evicts the whole thing, fallback included.
//
// The seeded pages are exempt: they are what install() put there deliberately,
// and trimming them would defeat the offline page.
const MAX_RUNTIME_ENTRIES = 60;

async function trimCache(cache) {
  const keys = await cache.keys();
  const seeded = new Set(PAGES_TO_CACHE.map((p) => new URL(p, self.location.origin).href));
  // Oldest first: cache.keys() returns insertion order, so dropping from the
  // front evicts what was least recently added.
  const evictable = keys.filter((req) => !seeded.has(req.url));
  const over = evictable.length - MAX_RUNTIME_ENTRIES;
  for (let i = 0; i < over; i++) await cache.delete(evictable[i]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PAGES_TO_CACHE.map((path) => cache.add(path).catch(() => {}))
      )
    )
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
          if (isNavigation) return caches.match('/offline.html');
        })
      )
  );
});
