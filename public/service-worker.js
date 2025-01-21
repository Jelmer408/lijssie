const CACHE_VERSION = '1.0.5';
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
    return ['http:', 'https:'].includes(parsedUrl.protocol) && 
           !parsedUrl.href.startsWith('chrome-extension://');
  } catch (e) {
    return false;
  }
}

// Check if URL should be excluded from caching
function shouldExcludeFromCache(url) {
  if (!isValidUrl(url)) return true;
  
  try {
    const parsedUrl = new URL(url);
    // Exclude realtime endpoints and service worker
    return parsedUrl.pathname.includes('/realtime/') ||
           parsedUrl.pathname.endsWith('service-worker.js');
  } catch (e) {
    return true;
  }
}

// Helper function to safely cache a response
async function safeCachePut(request, response) {
  if (!isValidUrl(request.url)) {
    console.log('Skipping cache for invalid URL:', request.url);
    return;
  }

  if (shouldExcludeFromCache(request.url)) {
    console.log('Skipping cache for excluded URL:', request.url);
    return;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch (error) {
    console.error('Cache put error:', error);
  }
}

// Install event - cache static assets and force update
self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
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
      self.clients.claim(),
      // Notify all clients to refresh
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'REFRESH_NEEDED' }));
      })
    ])
  );
});

// Add message handler for client updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Notify clients to refresh after skipping waiting
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'REFRESH_NEEDED' }));
    });
  }
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension URLs
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip service worker requests to prevent infinite loops
  if (event.request.url.includes('service-worker.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const url = new URL(event.request.url);
  const isDynamicRoute = DYNAMIC_ROUTES.some(route => url.pathname.includes(route));

  if (isDynamicRoute) {
    // Network-first strategy for dynamic routes
    event.respondWith(
      fetch(event.request.clone())
        .then(response => {
          if (response.ok && !event.request.url.startsWith('chrome-extension://')) {
            const responseToCache = response.clone();
            safeCachePut(event.request, responseToCache);
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first strategy for other routes
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response immediately
            return cachedResponse;
          }

          // If not in cache, fetch from network
          return fetch(event.request.clone())
            .then(response => {
              if (response.ok && !event.request.url.startsWith('chrome-extension://')) {
                const responseToCache = response.clone();
                safeCachePut(event.request, responseToCache);
              }
              return response;
            });
        })
    );
  }
}); 