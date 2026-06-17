// MultiFitTraining Service Worker
// Estrategia: network-first para index.html (siempre busca la versión más nueva)
// Esto permite actualizar la app sin que el usuario deba desinstalar/reinstalar

const CACHE_VERSION = 'mft-v2'; // 👉 Sube este número cada vez que subas cambios importantes
const CACHE_NAME = `multifit-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

// Instalación: precachea lo esencial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting(); // Activa el nuevo SW inmediatamente, sin esperar
});

// Activación: borra caches viejos automáticamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => (key.startsWith('concefit-') || key.startsWith('multifit-')) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Toma control de todas las pestañas abiertas inmediatamente
});

// Fetch: network-first para HTML (siempre intenta traer lo último del servidor)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo cachear peticiones GET del mismo origen
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isHTML = request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isHTML) {
    // NETWORK FIRST: intenta red, si falla usa caché (modo offline)
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // CACHE FIRST para assets estáticos (imágenes, fuentes externas, etc.)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});

// Permite forzar actualización desde la app (postMessage)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
