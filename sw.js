// sw.js
const VER = 'v1.0.2';               // ← bump this on each release
const STATIC = `static-${VER}`;
const RUNTIME = `runtime-${VER}`;
const OFFLINE_URL = './offline.html';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC, RUNTIME].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 1) Handle page navigations (HTML)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleNavigation(req));
    return;
  }

  // 2) Static assets (CSS/JS/fonts/images): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

async function handleNavigation(request) {
  try {
    // Try the network first for fresh content
    const fresh = await fetch(request, { cache: 'no-store' });
    const cache = await caches.open(RUNTIME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    // If offline, return the cached page (if any) or the offline fallback
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await caches.match(request);
  const network = fetch(request).then(res => { cache.put(request, res.clone()); return res; }).catch(() => cached);
  return cached || network;
}

// (Optional) immediate update flow
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
