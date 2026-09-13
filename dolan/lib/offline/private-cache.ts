const DB_NAME = "dolan-offline";
const STORE = "itineraries";
const CACHE_NAME = "dolan-private-itinerary";

export type OfflineItineraryEntry = {
  id: string;
  title: string;
  path: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putOfflineItinerary(entry: OfflineItineraryEntry) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function cacheChosenItinerary(path: string) {
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "CACHE_ITINERARY", path });
}

export async function clearPrivateOffline() {
  if (typeof indexedDB !== "undefined") {
    indexedDB.deleteDatabase(DB_NAME);
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("dolan-private")).map((key) => caches.delete(key)),
    );
  }
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: "CLEAR_PRIVATE" });
  }
  void CACHE_NAME;
}
