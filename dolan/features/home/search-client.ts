import { buildMockSearchResponse } from "./mock-data";
import { searchQuerySchema } from "./search-schema";
import type { SearchAdapter, SearchQuery, SearchResponse } from "./types";

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
    const params = new URLSearchParams({ city: query.city });
    if (query.startDate) params.set("startDate", query.startDate);
    if (query.budget) params.set("budget", query.budget);
    query.filters.forEach((filter) => params.append("filters", filter));
    const response = await fetch(`/api/v1/search?${params}`, { signal, credentials: "include" });
    if (!response.ok) throw new SearchError("Pencarian belum dapat dimuat.", response.status === 401 ? "UNAUTHORIZED" : response.status >= 500 ? "PROVIDER" : "UNKNOWN");
    return response.json() as Promise<SearchResponse>;
  },
};

export const searchClient: SearchAdapter = process.env.NEXT_PUBLIC_USE_SEARCH_MOCK === "false" ? apiSearchAdapter : mockSearchAdapter;
