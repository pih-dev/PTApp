// PTApp Service Worker — cache-first for offline support
// The app is a single HTML file; cache it so it loads without internet
const CACHE_NAME = 'ptapp-v1';
const APP_URL = './'; // index.html

self.addEventListener('install', (event) => {
  // Cache the app immediately on install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_URL))
  );
  // Activate immediately, don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches when a new version activates
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (the HTML page)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Try network first, fall back to cache if offline
      fetch(event.request)
        .then((response) => {
          // Update the cache with the fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_URL, clone));
          return response;
        })
        .catch(() => caches.match(APP_URL))
    );
    return;
  }

  // For other requests (fonts, etc.), try network then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache font files for offline use
        if (event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('fonts.gstatic.com')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
