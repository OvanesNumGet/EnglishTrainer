// Service Worker for offline-first PWA behavior.
//
// How updates work:
// - Change VERSION (or any code in this file).
// - Browser downloads new SW, installs it, then activates and cleans old caches.
// - If you want instant activation, you can postMessage('SKIP_WAITING') from the page.

// BUMPED VERSION TO FORCE UPDATE
const VERSION = 'v8';

const PRECACHE = `ivt-precache-${VERSION}`;
const RUNTIME = `ivt-runtime-${VERSION}`;

// Keep this list limited to "app shell" essentials.
// Everything else will be cached at runtime (stale-while-revalidate / network-first for navigations).
// If some entries do not exist, install will still succeed (we use allSettled).
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',

    // CSS (style.css imports the others)
    './css/style.css',
    './css/variables.css',
    './css/base.css',
    './css/components.css',
    './css/flashcards.css',
    './css/test.css',
    './css/stats.css',
    './css/settings.css',

    // JS entry + some common modules (runtime caching will cover the rest)
    './js/lucide.min.js',

    './js/main.js',
    './js/state.js',
    './js/utils.js',
    './js/flashcards.js',
    './js/data.js',
    './js/core/init.js',
    './js/core/loader.js',
    './js/core/events.js',
    './js/core/dataset.js',
    './js/ui/index.js',
    './js/ui/theme.js',
    './js/ui/settings.js',
    './js/ui/stats.js',
    './js/ui/controls.js',
    './js/ui/dropbox.js',
    './js/ui/dialogs.js',
    './js/test/index.js',
    './js/test/logic.js',
    './js/test/render.js',
    './js/test/storage.js',
    './js/test/swipe.js',

    // HTML fragments used by loadComponent()
    './html/header.html',
    './html/tabs.html',
    './html/settings_menu.html',
    './html/stats.html',
    './html/flashcards.html',
    './html/test.html',
    './html/controls.html',

    // Local icon for manifest (recommended; remote icons can break offline install/launch)
    './icons/icon.svg'
];

function isCacheableResponse(response) {
    // Opaque responses (cross-origin no-cors) are still cacheable.
    return !!response && (response.ok || response.type === 'opaque');
}

async function putInCache(cacheName, request, response) {
    if (!isCacheableResponse(response)) return;
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
}

async function networkFirst(request) {
    // Best for navigations: when online, you get fresh HTML; when offline, you fall back to cache.
    try {
        const response = await fetch(request);
        await putInCache(RUNTIME, request, response.clone());
        return response;
    } catch (_) {
        // Ignore URL search params for start_url like ./?source=pwa
        const cached = await caches.match('./index.html', { ignoreSearch: true });
        if (cached) return cached;

        const anyCached = await caches.match(request, { ignoreSearch: true });
        if (anyCached) return anyCached;

        return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const fetchPromise = (async () => {
        try {
            const response = await fetch(request);
            await putInCache(RUNTIME, request, response.clone());
            return response;
        } catch (_) {
            return null;
        }
    })();

    // Return cache immediately if present; otherwise wait for network.
    if (cached) return cached;

    const network = await fetchPromise;
    if (network) return network;

    return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(PRECACHE);

        // Use allSettled so a single 404 doesn't prevent SW installation.
        await Promise.allSettled(
            CORE_ASSETS.map((url) => cache.add(url))
        );

        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.map((key) => {
                const isOurCache = key.startsWith('ivt-');
                const isCurrent = key === PRECACHE || key === RUNTIME;
                if (isOurCache && !isCurrent) return caches.delete(key);
                return undefined;
            })
        );

        await self.clients.claim();
    })());
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET
    if (request.method !== 'GET') return;

    // Avoid Chrome "only-if-cached" error for cross-origin requests
    // (happens in some edge cases).
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    // App start / page reload
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets, fragments, modules, etc.
    event.respondWith(staleWhileRevalidate(request));
});
