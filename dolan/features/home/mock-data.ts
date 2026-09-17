import { ASSETS } from "@/lib/assets";
import type { SearchResponse } from "./types";

export function buildMockSearchResponse(cityInput: string): SearchResponse {
  const city = cityInput.trim();
  const normalized = city.toLocaleLowerCase("id-ID");
  if (["kosong", "empty", "tidak ada"].includes(normalized)) return { requestId: crypto.randomUUID(), city: { name: city, province: "Indonesia" }, places: [], publicTrips: [], templates: [] };
  const isBajo = normalized.includes("bajo") || normalized.includes("komodo");
  const destination = isBajo ? "Labuan Bajo" : city || "Bali";
  const province = isBajo ? "Nusa Tenggara Timur" : normalized.includes("jogja") ? "DI Yogyakarta" : "Indonesia";
  const images = isBajo ? [ASSETS.komodo, ASSETS.cangguCampfire, ASSETS.nusaPenida] : [ASSETS.tanahLot, ASSETS.nusaPenida, ASSETS.mountBatur];
  return {
    requestId: crypto.randomUUID(), city: { name: destination, province },
    places: [
      { id: "place-1", kind: "place", name: isBajo ? "Pulau Padar" : "Tanah Lot", city: destination, category: "Wisata alam", rating: 4.8, reviewCount: 2841, imageUrl: images[0] },
      { id: "place-2", kind: "place", name: isBajo ? "Pink Beach" : "Nusa Penida", city: destination, category: "Pantai", rating: 4.7, reviewCount: 1924, imageUrl: images[1] },
    ],
    publicTrips: [{ id: "trip-1", kind: "trip", title: isBajo ? "Sailing Komodo 4H3M" : `${destination} Slow Travel`, city: destination, dateLabel: "22–25 Okt", seatsLeft: 3, imageUrl: images[1], popularityCount: 76 }],
    templates: [
      { id: "template-1", kind: "template", title: `${destination} Santai 3H2M`, city: destination, durationDays: 3, usageCount: 128, curated: true, imageUrl: images[2] },
      { id: "template-2", kind: "template", title: `${destination} Backpacker Hemat`, city: destination, durationDays: 4, usageCount: 84, curated: false, imageUrl: images[0] },
    ],
  };
}
