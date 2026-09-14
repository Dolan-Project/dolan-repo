import type { ApiPage as SharedApiPage, ApiSuccess, CityCandidate, ItineraryTemplateSummary, PlacePhotoMedia, PlaceSummary, TripSummary } from "@dolan/shared";
import { ASSETS } from "@/lib/assets";
import { buildMockSearchResponse } from "./mock-data";
import { searchQuerySchema } from "./search-schema";
import type { ApiError, SearchAdapter, SearchQuery, SearchResponse } from "./types";

export class SearchError extends Error {
  constructor(message: string, public readonly code: "VALIDATION" | "UNAUTHORIZED" | "PROVIDER" | "UNKNOWN") { super(message); }
}

export const mockSearchAdapter: SearchAdapter = {
  async search(input, signal) {
    const query = searchQuerySchema.parse(input);
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, 750);
      signal?.addEventListener("abort", () => { window.clearTimeout(timeout); reject(new DOMException("Request dibatalkan", "AbortError")); }, { once: true });
    });
    const value = query.city.toLocaleLowerCase("id-ID");
    if (value === "error" || value === "gagal") throw new SearchError("Pencarian sedang terganggu. Coba lagi sebentar.", "PROVIDER");
    if (value === "unauthorized") throw new SearchError("Masuk terlebih dahulu untuk melanjutkan.", "UNAUTHORIZED");
    return buildMockSearchResponse(query.city);
  },
};

const fallbackCovers = [ASSETS.komodo, ASSETS.nusaPenida, ASSETS.tanahLot, ASSETS.mountBatur];
const photoCache = new Map<string, string>();

function dateLabel(startDate: string | null, endDate: string | null) {
  if (!startDate) return "Tanggal fleksibel";
  const format = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const start = format.format(new Date(`${startDate}T00:00:00Z`));
  if (!endDate || endDate === startDate) return start;
  return `${start} – ${format.format(new Date(`${endDate}T00:00:00Z`))}`;
}

function category(place: PlaceSummary) {
  const value = place.types?.[0] ?? "tourist_attraction";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function photoUrl(baseUrl: string, place: PlaceSummary | null, fallbackIndex: number, signal?: AbortSignal) {
  if (!place?.photoName) return fallbackCovers[fallbackIndex % fallbackCovers.length];
  const key = `${place.googlePlaceId}:${place.photoName}`;
  const cached = photoCache.get(key);
  if (cached) return cached;
  try {
    const media = await getJson<ApiSuccess<PlacePhotoMedia>>(`${baseUrl}/places/${encodeURIComponent(place.googlePlaceId)}/photo?name=${encodeURIComponent(place.photoName)}`, signal);
    photoCache.set(key, media.data.photoUri);
    return media.data.photoUri;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackCovers[fallbackIndex % fallbackCovers.length];
  }
}

export const apiSearchAdapter: SearchAdapter = {
  async search(input: SearchQuery, signal): Promise<SearchResponse> {
    const query = searchQuerySchema.parse(input);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const cityParams = new URLSearchParams({ q: query.city });
    const placeParams = new URLSearchParams({ q: query.city, city: query.city, page: "1", limit: "6" });
    const tripParams = new URLSearchParams({ city: query.city, page: "1", limit: "6" });
    if (query.startDate) tripParams.set("dateFrom", query.startDate);
    const templateParams = new URLSearchParams({ city: query.city, sort: "popular", page: "1", limit: "6" });
    const [cities, places, trips, templates] = await Promise.all([
      getJson<ApiSuccess<CityCandidate[]>>(`${baseUrl}/search/cities?${cityParams}`, signal),
      getJson<SharedApiPage<PlaceSummary>>(`${baseUrl}/search/places?${placeParams}`, signal),
      getJson<SharedApiPage<TripSummary>>(`${baseUrl}/search/trips?${tripParams}`, signal),
      getJson<SharedApiPage<ItineraryTemplateSummary>>(`${baseUrl}/templates?${templateParams}`, signal),
    ]);
    const allCoverPlaces = [...places.data, ...trips.data.map((trip) => trip.coverPlace), ...templates.data.map((template) => template.coverPlace)];
    const uniqueCoverPlaces = [...new Map(allCoverPlaces.filter((place): place is PlaceSummary => Boolean(place)).map((place) => [place.googlePlaceId, place])).values()];
    const resolvedImages = await Promise.all(uniqueCoverPlaces.map((place, index) => photoUrl(baseUrl, place, index, signal)));
    const imageByPlaceId = new Map(uniqueCoverPlaces.map((place, index) => [place.googlePlaceId, resolvedImages[index]!]));
    const cover = (place: PlaceSummary | null, index: number) => place ? imageByPlaceId.get(place.googlePlaceId) ?? fallbackCovers[index % fallbackCovers.length] : fallbackCovers[index % fallbackCovers.length];
    return {
      requestId: crypto.randomUUID(),
      city: { name: cities.data[0]?.name ?? query.city, province: "Indonesia" },
      places: places.data.map((place, index) => ({ id: place.googlePlaceId, kind: "place", name: place.name, city: place.city ?? query.city, category: category(place), rating: place.rating ?? 0, reviewCount: place.userRatingCount ?? 0, imageUrl: cover(place, index) })),
      publicTrips: trips.data.map((trip, index) => ({ id: trip.id, kind: "trip", title: trip.title, city: trip.destinationCity ?? query.city, dateLabel: dateLabel(trip.startDate, trip.endDate), seatsLeft: Math.max(0, 7 - trip.participantCount), imageUrl: cover(trip.coverPlace, index + 1), popularityCount: trip.participantCount + trip.pendingRequestCount })),
      templates: templates.data.map((template, index) => ({ id: template.id, kind: "template", title: template.title, city: template.city, durationDays: template.durationDays, usageCount: template.usageCount, curated: template.source === "CURATED", imageUrl: cover(template.coverPlace, index + 2) })),
    };
  },
};

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "include", headers: { Accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SearchError("Server pencarian tidak dapat dihubungi.", "PROVIDER");
  }
  const payload = await response.json().catch(() => null) as T | ApiError | null;
  if (!response.ok || !payload || (typeof payload === "object" && "success" in payload && payload.success === false)) {
    const apiError = payload as ApiError | null;
    const code = response.status === 401 ? "UNAUTHORIZED" : response.status === 429 || response.status >= 500 ? "PROVIDER" : "UNKNOWN";
    throw new SearchError(apiError?.error?.message ?? "Pencarian belum dapat dimuat.", code);
  }
  return payload as T;
}

export const searchClient: SearchAdapter = process.env.NEXT_PUBLIC_USE_MOCK_API === "false" ? apiSearchAdapter : mockSearchAdapter;
