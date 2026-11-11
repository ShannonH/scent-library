/*
 * Service worker: makes the app installable and lets it open offline.
 *
 * - Page navigations: network first, falling back to the cached app shell.
 * - Built assets (/assets/*, hashed filenames) and icons: cache first.
 * - Anything cross-origin (Supabase API, auth, signed photo URLs) is never
 *   cached here, so one user's data is never served from the cache.
 *
 * Bump VERSION to force old caches to be dropped.
 */
const VERSION = 'v1';
const CACHE = `scent-library-${VERSION}`;
const SCOPE = new URL(self.registration.scope);
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'].map(
  (p) => new URL(p, SCOPE).href,
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('scent-library-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL[0], copy));
          return res;
        })
        .catch(() => caches.match(SHELL[0]).then((r) => r ?? Response.error())),
    );
    return;
  }

  const rel = url.pathname.slice(SCOPE.pathname.length);
  if (rel.startsWith('assets/') || rel.startsWith('icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
