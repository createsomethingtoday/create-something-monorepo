const CACHE = 'mapping-canvas-shell-v3';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/brand/create-something-agency-white.svg'];

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/');
  const markup = await response.clone().text();
  const builtAssets = [...markup.matchAll(/(?:src|href)="(\/_app\/immutable\/[^"]+)"/g)].map((match) => match[1]);
  await cache.put('/', response);
  await cache.addAll([...SHELL.slice(1), ...new Set(builtAssets)]);
}

self.addEventListener('install', (event) => event.waitUntil(cacheApplicationShell().then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});
