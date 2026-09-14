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

self.addEventListener("push", (event) => {
  let payload = { title: "Dolan", body: "Ada pembaruan trip." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* keep default */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Dolan", {
      body: payload.body || "",
      data: payload.data || {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/notifikasi";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if (typeof client.navigate === "function") client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
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
