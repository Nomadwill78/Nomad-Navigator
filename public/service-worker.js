const CACHE_NAME = 'nomad-compass-v1';

// Assets to pre-cache immediately on service worker install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  '/favicon.ico'
];

// Service Worker Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core Shell');
      return cache.addAll(PRECACHE_ASSETS).catch(error => {
        console.warn('[Service Worker] Pre-cache error (some assets might build later):', error);
      });
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Custom helper to check if a request can/should be cached
const shouldCache = (url) => {
  // Only cache GET requests and same-origin or API/Gemini resources
  const isExcluded = 
    url.includes('/chrome-extension') || 
    url.includes('hot-update') ||
    url.includes('socket') ||
    url.includes('vite');
  return !isExcluded;
};

// Service Worker Fetch Event
// Implements Network First, falling back to Cache strategy.
// This is optimal for "internet connection is unstable" scenarios.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests or custom cached POST endpoints
  if (event.request.method !== 'GET' && !event.request.url.includes('/api/dashboard')) {
    return;
  }

  const url = event.request.url;
  if (!shouldCache(url)) {
    return;
  }

  // Network First, Fallback to Cache Strategy
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the request succeeds, clone and store it in cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((error) => {
        console.log('[Service Worker] Network failed, serving from Cache:', url, error);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Provide an offline fallback for html files
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html') || caches.match('/');
          }
          
          // Return offline JSON for API endpoints if caching is blank
          if (url.includes('/api/')) {
            return new Response(
              JSON.stringify({ 
                error: 'Unstable internet connection. Currently offline.', 
                isOffline: true 
              }), 
              { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
              }
            );
          }
          
          return Promise.reject('No cache available');
        });
      })
  );
});

// Cache Listener for updates from the App UI (e.g., custom offline storage notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
