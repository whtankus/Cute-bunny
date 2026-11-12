const CACHE_NAME = "cute-bunny-shell-v140";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=135",
  "./app.js?v=127",
  "./manifest.webmanifest",
  "./supabase-config.js",
  "./bunny-app-icon-192.png",
  "./bunny-app-icon-512.png",
  "./apple-touch-icon.png"
];

const SHELL_FILES = new Set([
  "index.html",
  "style.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "supabase-config.js"
]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("cute-bunny-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isShellRequest =
    request.mode === "navigate" ||
    SHELL_FILES.has(url.pathname.split("/").pop());

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Always ask the network first for the app shell so web and installed-PWA
    // clients cannot stay pinned to an old HTML, CSS, or JavaScript copy.
    if (isShellRequest) {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          return (await cache.match("./index.html")) || Response.error();
        }
        return Response.error();
      }
    }

    // Keep cache-first behaviour for non-shell assets to retain offline support.
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
