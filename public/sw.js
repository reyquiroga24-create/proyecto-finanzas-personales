/**
 * SERVICE WORKER - Field Report Pro
 * Caché y soporte offline
 */

const CACHE_NAME = 'field-report-pro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index-simple.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/modules/DataManager.js',
  '/js/modules/FormHandler.js',
  '/js/modules/PhotoManager.js',
  '/js/modules/ReportGenerator.js',
  '/js/modules/Validator.js',
  '/js/modules/WebhookSender.js',
  '/js/utils/DateUtils.js',
  '/js/utils/NotificationSystem.js',
  '/js/utils/StorageUtils.js',
  '/config/config.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install - Caché archivos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[SW] Cache error (CDN might not be available):', err);
        // Continuar aunque algunos CDN fallen
        return cache.addAll(urlsToCache.filter(url => !url.includes('cdn')));
      });
    })
  );
  self.skipWaiting();
});

// Activate - Limpiar caché vieja
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Estrategia Network First, fallback Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requests no-GET
  if (request.method !== 'GET') {
    return;
  }

  // Para API calls: Network first
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Caché exitosa
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - retornar caché o error
          return caches.match(request).then((response) => {
            return response || new Response(
              JSON.stringify({ error: 'Offline - no cached response' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Para archivos estáticos: Cache first, network fallback
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        // No caché responses no-200
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Caché la respuesta exitosa
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Offline y sin caché
        return caches.match('/index.html');
      });
    })
  );
});

// Background sync (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

async function syncReports() {
  // Implementar sincronización de reportes pendientes
  console.log('[SW] Syncing reports...');
}

// Push notifications (opcional)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Field Report Pro',
    icon: '/manifest.json',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="middle">📋</text></svg>'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Field Report Pro', options)
  );
});

console.log('[SW] Service Worker registered');
