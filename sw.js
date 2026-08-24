const CACHE_NAME = "taf-sniffer-v0.821";
const ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Ne pas intercepter les appels d'API ni les requêtes externes
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
