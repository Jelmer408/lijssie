const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `lijssie-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.svg',
  '/animated-man-running.gif',
  '/supermarket.png',
  '/supermarkets/albert heijn-logo.png',
  '/supermarkets/aldi-logo.png',
  '/supermarkets/lidl-logo.png',
  '/supermarkets/plus-logo.png'
];

// Add specific routes that should check for updates more frequently
const DYNAMIC_ROUTES = [
  '/koken',
  '/api/recipes',
  '/api/cooking'
];

// Check if URL is supported for caching
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

// Check if URL should be excluded from caching
function shouldExcludeFromCache(url) {
  try {
    const parsedUrl = new URL(url);
    // Only exclude realtime endpoints, allow caching of auth and rest endpoints for offline support
    return parsedUrl.pathname.includes('/realtime/');
  } catch (e) {
    return false;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Add message handler for client updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Only notify clients about updates when explicitly requested
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'CACHE_UPDATED' }));
    });
  }
});

// Fetch event - network first, then cache, fallback to offline handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if this is a dynamic route that needs frequent updates
  const isDynamicRoute = DYNAMIC_ROUTES.some(route => url.pathname.includes(route));

  if (isDynamicRoute) {
    // Network first, fallback to cache for dynamic routes
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before caching it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache first, network fallback for other routes
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            // Clone the response before caching it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
    );
  }
}); 