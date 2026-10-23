const CACHE = "lamsa-shell-v1";

const PRECACHE = [
  "/",
  "/login",
  "/offline.html",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
  "/pwa/shot-home.png",
  "/pwa/shot-shop.png",
  "/pwa/shot-order.png",
];

const SHELL_PATHS = new Set(["/", "/login"]);

function isUserRequest(url, request) {
  if (request.headers.get("x-tsr-serverfn") === "true") return true;
  if (request.headers.get("authorization")) return true;
  const path = url.pathname;
  if (path.startsWith("/api/")) return true;
  if (path.startsWith("/_server")) return true;
  return false;
}

function isStaticAsset(path) {
  return (
    path.startsWith("/icons/") ||
    path.startsWith("/pwa/") ||
    path === "/offline.html" ||
    path === "/favicon.svg"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // A missing shell file must not block the worker from installing.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isUserRequest(url, request)) return;

  if (request.mode === "navigate") {
    const shell = SHELL_PATHS.has(url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (shell && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          if (shell) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
          return new Response("غير متصل", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }),
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
