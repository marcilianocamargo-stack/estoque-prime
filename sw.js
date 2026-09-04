const CACHE_NAME = 'estoque-prime-v3';

const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // O estoque.json (raw.githubusercontent.com) NUNCA é cacheado -- sempre
  // rede, pra garantir o estoque real na hora (o fetch já manda no-store +
  // cache-busting, isso aqui é só reforço).
  if (url.hostname === 'raw.githubusercontent.com') {
    return;
  }

  // index.html / navegação: REDE PRIMEIRO (app sempre atualizado), cache
  // só como reserva quando estiver offline.
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais arquivos (manifest, ícones): cache primeiro.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
