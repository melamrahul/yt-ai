const CACHE_NAME = 'yt-ai-v0';
const SHELL_ASSETS = [
    '/yt-ai/',
    '/yt-ai/assets/icons/icon192.png',
    '/yt-ai/assets/icons/icon512.png',
    '/yt-ai/assets/icons/apple-touch-icon.png',
    '/yt-ai/assets/icons/favicon.ico'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(SHELL_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;
    if (url.origin !== location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }
    const isShellAsset = SHELL_ASSETS.includes(url.pathname);
    if (isShellAsset) {
        event.respondWith((async () => {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            try {
                const preload = await event.preloadResponse;
                if (preload) return preload;
                const response = await fetch(event.request);
                if (response.ok && response.type === 'basic') {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, response.clone());
                }
                return response;
            } catch (err) {
                const fallback = await caches.match('/yt-ai/');
                if (fallback) return fallback;
                throw err;
            }
        })());
        return;
    }
    event.respondWith(fetch(event.request));
});