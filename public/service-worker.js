const CACHE_NAME = 'lijssie-v1.0.0';
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
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - network first, then cache, fallback to offline handling
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Only handle HTTP/HTTPS requests
  if (!isValidUrl(event.request.url)) {
    return;
  }

  // Skip caching for excluded URLs
  if (shouldExcludeFromCache(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && 
            response.type === 'basic' && 
            isValidUrl(event.request.url)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch((err) => console.error('Cache put error:', err));
        }
        return response;
      })
      .catch(async () => {
        // Try to get from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's an API request that failed and isn't in the cache,
        // return a JSON response indicating offline status
        if (event.request.url.includes('/rest/v1/')) {
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'You are currently offline. Changes will be synced when you reconnect.',
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // For HTML requests, return the offline page
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }

        // For other requests, return a network error
        return new Response('Network error happened', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
}); 