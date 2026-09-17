import { SearchErrorCode, type PlaceDetails, type PlacePhotoMedia, type PlaceSummary } from "@dolan/shared";
import { describe, expect, it, vi } from "vitest";
import {
  CachingPlacesProvider,
  wrapPlacesProvider,
} from "../src/integrations/google/caching-places-client.ts";
import { MemoryPlacesCache } from "../src/integrations/google/places-cache.ts";
import { GooglePlacesClient } from "../src/integrations/google/places-client.ts";
import { HttpError, notFound, providerUnavailable, tooManyRequests } from "../src/lib/api-error.ts";
import { createPlacesQuotaMissHandler, runWithPlacesQuotaUser } from "../src/modules/search/places-quota-context.ts";
import { MemoryQuotaStore, QuotaService } from "../src/modules/search/quota.ts";

const SUMMARY: PlaceSummary = {
  googlePlaceId: "ChIJ123",
  name: "Malioboro",
  formattedAddress: "Jl. Malioboro, Yogyakarta",
  city: "Yogyakarta",
  latitude: -7.79,
  longitude: 110.36,
  rating: 4.6,
  userRatingCount: 10,
  photoName: "places/ChIJ123/photos/abc",
  googleMapsUrl: "https://maps.google.com/?cid=1",
  types: ["tourist_attraction"],
};

const DETAILS: PlaceDetails = {
  ...SUMMARY,
  types: ["tourist_attraction"],
  editorialSummary: "Jalan malioboro",
  weekdayDescriptions: null,
  attributions: [{ displayName: "Google", uri: "https://maps.google.com" }],
  visitCount: 0,
};

const PHOTO: PlacePhotoMedia = {
  photoUri: "https://lh3.googleusercontent.com/p/abc",
  attributions: [{ displayName: "Ana", uri: null }],
};

const GOOGLE_PLACE = {
  id: "ChIJ123",
  displayName: { text: "Malioboro" },
  formattedAddress: "Jl. Malioboro, Yogyakarta",
  location: { latitude: -7.79, longitude: 110.36 },
  rating: 4.6,
  userRatingCount: 10,
  photos: [{ name: "places/ChIJ123/photos/abc", authorAttributions: [{ displayName: "Ana" }] }],
  googleMapsUri: "https://maps.google.com/?cid=1",
  addressComponents: [{ longText: "Yogyakarta", types: ["locality"] }],
  types: ["tourist_attraction"],
};

describe("MemoryPlacesCache", () => {
  it("returns null after TTL expires", async () => {
    let now = 1_000;
    const cache = new MemoryPlacesCache(() => now);
    await cache.set("k", { n: 1 }, 2);
    expect(await cache.get("k")).toEqual({ n: 1 });
    now = 3_001;
    expect(await cache.get("k")).toBeNull();
  });
});

describe("CachingPlacesProvider", () => {
  it("skips the inner client and quota on a search/details/photo hit", async () => {
    const inner = stubProvider();
    const consumePlaces = vi.fn(async (_userId: string, _operation: string) => undefined);
    const provider = wrapPlacesProvider(inner, {
      cache: new MemoryPlacesCache(),
      onMiss: async (operation) => consumePlaces("user-1", operation),
    });

    await provider.searchText({ query: "malioboro", city: "Yogyakarta" });
    await provider.searchText({ query: "malioboro", city: "Yogyakarta" });
    await provider.getDetails("ChIJ123");
    await provider.getDetails("places/ChIJ123");
    await provider.getPhotoMedia("places/ChIJ123/photos/abc");
    await provider.getPhotoMedia("places/ChIJ123/photos/abc");

    expect(inner.searchText).toHaveBeenCalledTimes(1);
    expect(inner.getDetails).toHaveBeenCalledTimes(1);
    expect(inner.getPhotoMedia).toHaveBeenCalledTimes(1);
    expect(consumePlaces).toHaveBeenCalledTimes(3);
    expect(consumePlaces).toHaveBeenNthCalledWith(1, "user-1", "searchText");
    expect(consumePlaces).toHaveBeenNthCalledWith(2, "user-1", "getDetails");
    expect(consumePlaces).toHaveBeenNthCalledWith(3, "user-1", "getPhotoMedia");
  });

  it("calls Google and increments quota on a cache miss", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("places:searchText")) {
        return jsonResponse({ places: [GOOGLE_PLACE] });
      }
      if (url.includes("/media")) {
        return jsonResponse({ photoUri: PHOTO.photoUri, authorAttributions: [{ displayName: "Ana" }] });
      }
      return jsonResponse(GOOGLE_PLACE);
    });
    const inner = new GooglePlacesClient("test-key", fetchImpl as typeof fetch);
    const quota = new QuotaService(new MemoryQuotaStore(), 50);
    const consume = vi.spyOn(quota, "consumePlaces");
    const provider = wrapPlacesProvider(inner, {
      cache: new MemoryPlacesCache(),
      onMiss: createPlacesQuotaMissHandler(quota),
    });

    await runWithPlacesQuotaUser("user-1", () => provider.searchText({ query: "malioboro" }));
    await runWithPlacesQuotaUser("user-1", () => provider.getDetails("ChIJ123"));
    await runWithPlacesQuotaUser("user-1", () => provider.getPhotoMedia("places/ChIJ123/photos/abc"));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(consume).toHaveBeenCalledTimes(3);

    await runWithPlacesQuotaUser("user-1", () => provider.searchText({ query: "malioboro" }));
    await runWithPlacesQuotaUser("user-1", () => provider.getDetails("ChIJ123"));
    await runWithPlacesQuotaUser("user-1", () => provider.getPhotoMedia("places/ChIJ123/photos/abc"));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(consume).toHaveBeenCalledTimes(3);
  });

  it("uses in-memory cache when Redis is not configured", async () => {
    const inner = stubProvider();
    const provider = wrapPlacesProvider(inner, { cache: new MemoryPlacesCache() });
    const first = await provider.searchText({ query: "malioboro" });
    const second = await provider.searchText({ query: "malioboro" });
    expect(second).toEqual(first);
    expect(inner.searchText).toHaveBeenCalledTimes(1);
  });

  it("does not consume user Places quota outside a search request", async () => {
    const inner = stubProvider();
    const quota = new QuotaService(new MemoryQuotaStore(), 50);
    const consume = vi.spyOn(quota, "consumePlaces");
    const provider = wrapPlacesProvider(inner, {
      cache: new MemoryPlacesCache(),
      onMiss: createPlacesQuotaMissHandler(quota),
    });

    await provider.searchText({ query: "malioboro" });
    expect(consume).not.toHaveBeenCalled();
    expect(inner.searchText).toHaveBeenCalledTimes(1);
  });

  it("caches 404 details briefly and does not cache 5xx or 429", async () => {
    const inner = stubProvider({
      getDetails: vi
        .fn()
        .mockRejectedValueOnce(notFound(SearchErrorCode.PLACE_NOT_FOUND, "Place was not found"))
        .mockRejectedValueOnce(providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "down", 502))
        .mockRejectedValueOnce(providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "down", 502))
        .mockRejectedValueOnce(tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Google Places quota was exceeded"))
        .mockRejectedValueOnce(tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Google Places quota was exceeded")),
    });
    const provider = wrapPlacesProvider(inner, { cache: new MemoryPlacesCache() });

    await expect(provider.getDetails("missing")).rejects.toMatchObject({ status: 404 });
    await expect(provider.getDetails("missing")).rejects.toMatchObject({ status: 404 });
    expect(inner.getDetails).toHaveBeenCalledTimes(1);

    await expect(provider.getDetails("flaky")).rejects.toBeInstanceOf(HttpError);
    await expect(provider.getDetails("flaky")).rejects.toBeInstanceOf(HttpError);
    expect(inner.getDetails).toHaveBeenCalledTimes(3);

    await expect(provider.getDetails("limited")).rejects.toMatchObject({ status: 429 });
    await expect(provider.getDetails("limited")).rejects.toMatchObject({ status: 429 });
    expect(inner.getDetails).toHaveBeenCalledTimes(5);
  });
});

function stubProvider(overrides: Partial<{
  searchText: ReturnType<typeof vi.fn>;
  getDetails: ReturnType<typeof vi.fn>;
  getPhotoMedia: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    searchText: overrides.searchText ?? vi.fn(async () => [SUMMARY]),
    getDetails: overrides.getDetails ?? vi.fn(async () => DETAILS),
    getPhotoMedia: overrides.getPhotoMedia ?? vi.fn(async () => PHOTO),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
