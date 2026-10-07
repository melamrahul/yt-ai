const CACHE_NAME = 'yt-ai-pwa-cache-v1';

// Left empty to ensure all assets are loaded freshly from the network
const ASSETS_TO_CACHE = [];

// Install Event: Registers the SW but caches nothing
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA Installed (Loading assets freshly from network)');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch Event: Bypass cache entirely and always fetch freshly from the network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback only if the user is completely offline
      return new Response('Offline. Please check your internet connection.', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});

// Activate Event: Clean up any old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});