const CACHE_NAME = "ironstride-v2";
const STATIC_PATTERNS = [/^\/icons\//, /^\/fonts\//];
const API_PATTERN = /^\/api\//;
const APP_SHELL_PATHS = ["/", "/login", "/register"];

const cacheIfSuccessful = async (cache, request, response) => {
  if (!response || !response.ok || response.type === "error") {
    return response;
  }

  cache.put(request, response.clone());
  return response;
};

// On install: cache the app shell pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_PATHS)
    )
  );
  self.skipWaiting();
});

// On activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API routes: network-first, fall through on failure (app uses Zustand offline)
  if (API_PATTERN.test(path)) {
    event.respondWith(
      fetch(request).catch(() => new Response(null, { status: 503 }))
    );
    return;
  }

  // App-owned static assets: cache-first.
  // Next.js manages its own chunk caching headers; intercepting /_next/static/
  // here can pin stale route chunks across reloads and deploys.
  if (STATIC_PATTERNS.some((p) => p.test(path))) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(request);
        return cacheIfSuccessful(cache, request, response);
      })
    );
    return;
  }

  // HTML navigation: network-first with cache fallback.
  // Serving stale HTML first can reference removed route chunks after a deploy.
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          return cacheIfSuccessful(cache, request, response);
        } catch {
          return cache.match(request) || cache.match("/");
        }
      })
    );
  }
});
