const CACHE_NAME = 'wbs-cache-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'main.js',
    'style.css?v=2',
    'main.js?v=12',
    'logo.jpg'
];

// Install Service Worker
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate and Clean Old Caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
});

// Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', (e) => {
    // Skip API calls to Gemini and Food Facts (always network)
    if (e.request.url.includes('googleapis.com') || e.request.url.includes('openfoodfacts.org')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});
