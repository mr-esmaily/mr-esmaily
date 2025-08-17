// bump to deploy updates
const VER = 'v1.1.0';
const STATIC = `static-${VER}`;
const RUNTIME = `runtime-${VER}`;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC, RUNTIME].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations: network-first with cache & simple offline fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(RUNTIME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type':'text/html' }});
      }
    })());
    return;
  }

  // Static: stale-while-revalidate
  e.respondWith((async () => {
    const cache = await caches.open(RUNTIME);
    const cached = await caches.match(req);
    const network = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(()=>cached);
    return cached || network;
  })());
});

// Tell pages when an update is ready
self.addEventListener('install', () => notifyClientsWaiting());
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

async function notifyClientsWaiting() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(c => c.postMessage('SW_WAITING'));
}
