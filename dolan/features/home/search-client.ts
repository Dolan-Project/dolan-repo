import { buildMockSearchResponse } from "./mock-data";
import { searchQuerySchema } from "./search-schema";
import type { ApiError, ApiPage, CityResult, ItineraryTemplateResult, PlaceResult, SearchAdapter, SearchQuery, TripResult } from "./types";

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

export const apiSearchAdapter: SearchAdapter = {
  async search(input: SearchQuery, signal) {
    const query = searchQuerySchema.parse(input);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const cityParams = new URLSearchParams({ q: query.city });
    const searchParams = new URLSearchParams({ q: query.city, city: query.city, page: "1", limit: "6" });
    const tripParams = new URLSearchParams(searchParams);
    if (query.startDate) tripParams.set("dateFrom", query.startDate);
    const templateParams = new URLSearchParams({ city: query.city, sort: "popular", page: "1", limit: "6" });
    const [cities, places, trips, templates] = await Promise.all([
      getJson<ApiPage<CityResult>>(`${baseUrl}/search/cities?${cityParams}`, signal),
      getJson<ApiPage<PlaceResult>>(`${baseUrl}/search/places?${searchParams}`, signal),
      getJson<ApiPage<TripResult>>(`${baseUrl}/search/trips?${tripParams}`, signal),
      getJson<ApiPage<ItineraryTemplateResult>>(`${baseUrl}/templates?${templateParams}`, signal),
    ]);
    return { requestId: crypto.randomUUID(), city: cities.data[0] ?? { name: query.city, province: "Indonesia" }, places: places.data, publicTrips: trips.data, templates: templates.data };
  },
};

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, credentials: "include", headers: { Accept: "application/json" } });
  const payload = await response.json() as T | ApiError;
  if (!response.ok || (typeof payload === "object" && payload !== null && "success" in payload && payload.success === false)) {
    const apiError = payload as ApiError;
    const code = response.status === 401 ? "UNAUTHORIZED" : response.status === 429 || response.status >= 500 ? "PROVIDER" : "UNKNOWN";
    throw new SearchError(apiError.error?.message ?? "Pencarian belum dapat dimuat.", code);
  }
  return payload as T;
}

export const searchClient: SearchAdapter = process.env.NEXT_PUBLIC_USE_MOCK_API === "false" ? apiSearchAdapter : mockSearchAdapter;
