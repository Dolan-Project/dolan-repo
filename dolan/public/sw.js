self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isChosenItineraryPath(path) {
  return path.startsWith("/itinerary/") || /^\/trip-saya\/[^/]+\/itinerary\/?$/.test(path);
}

self.addEventListener("message", (event) => {
  const data = event.data ?? {};
  if (data.type === "CACHE_ITINERARY" && typeof data.path === "string" && isChosenItineraryPath(data.path)) {
    event.waitUntil(
      caches.open("dolan-private-itinerary").then((cache) => cache.add(data.path)),
    );
  }
  if (data.type === "CLEAR_PRIVATE") {
    event.waitUntil(caches.delete("dolan-private-itinerary"));
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isChosenItineraryPath(url.pathname)) return;
  event.respondWith(
    caches.open("dolan-private-itinerary").then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return fetch(event.request);
    }),
  );
});
