import { createHash } from "node:crypto";
import { SearchErrorCode, type PlaceDetails, type PlacePhotoMedia, type PlaceSummary } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { HttpError, notFound } from "../../lib/api-error.ts";
import { getSharedPlacesCache, PLACES_CACHE_PREFIX, type PlacesCache } from "./places-cache.ts";
import {
  normalizeGooglePlaceId,
  type PlacesProvider,
  type PlacesSearchInput,
} from "./places-client.ts";

export type PlacesCacheOperation = "searchText" | "getDetails" | "getPhotoMedia";

export type PlacesCacheMissHandler = (operation: PlacesCacheOperation) => Promise<void>;

export type PlacesCacheTtls = {
  searchSec: number;
  detailsSec: number;
  photoSec: number;
  detailsNotFoundSec: number;
};

const DETAILS_NOT_FOUND = { __dolanNotFound: true as const };
type DetailsNotFound = typeof DETAILS_NOT_FOUND;

export function defaultPlacesCacheTtls(): PlacesCacheTtls {
  return {
    searchSec: env.placesCacheTtlSearchSec,
    detailsSec: env.placesCacheTtlDetailsSec,
    photoSec: env.placesCacheTtlPhotoSec,
    detailsNotFoundSec: 3600,
  };
}

export function wrapPlacesProvider(
  inner: PlacesProvider,
  options?: {
    cache?: PlacesCache;
    onMiss?: PlacesCacheMissHandler;
    ttls?: PlacesCacheTtls;
  },
): CachingPlacesProvider {
  return new CachingPlacesProvider(inner, options?.cache ?? getSharedPlacesCache(), {
    onMiss: options?.onMiss,
    ttls: options?.ttls,
  });
}

export class CachingPlacesProvider implements PlacesProvider {
  private readonly ttls: PlacesCacheTtls;

  constructor(
    private readonly inner: PlacesProvider,
    private readonly cache: PlacesCache,
    private readonly options: { onMiss?: PlacesCacheMissHandler; ttls?: PlacesCacheTtls } = {},
  ) {
    this.ttls = options.ttls ?? defaultPlacesCacheTtls();
  }

  async searchText(input: PlacesSearchInput): Promise<PlaceSummary[]> {
    const key = searchCacheKey(input);
    const cached = await this.cache.get<PlaceSummary[]>(key);
    if (cached) return cached;
    await this.options.onMiss?.("searchText");
    const places = await this.inner.searchText(input);
    await this.cache.set(key, places, this.ttls.searchSec);
    return places;
  }

  async getDetails(googlePlaceId: string): Promise<PlaceDetails> {
    const key = detailsCacheKey(googlePlaceId);
    const cached = await this.cache.get<PlaceDetails | DetailsNotFound>(key);
    if (cached) {
      if (isDetailsNotFound(cached)) {
        throw notFound(SearchErrorCode.PLACE_NOT_FOUND, "Place was not found");
      }
      return cached;
    }
    await this.options.onMiss?.("getDetails");
    try {
      const details = await this.inner.getDetails(googlePlaceId);
      await this.cache.set(key, details, this.ttls.detailsSec);
      return details;
    } catch (error) {
      if (httpStatus(error) === 404) {
        await this.cache.set(key, DETAILS_NOT_FOUND, this.ttls.detailsNotFoundSec);
      }
      throw error;
    }
  }

  async getPhotoMedia(photoName: string): Promise<PlacePhotoMedia> {
    const key = photoCacheKey(photoName);
    const cached = await this.cache.get<PlacePhotoMedia>(key);
    if (cached) return cached;
    await this.options.onMiss?.("getPhotoMedia");
    const media = await this.inner.getPhotoMedia(photoName);
    await this.cache.set(key, media, this.ttls.photoSec);
    return media;
  }
}

export function searchCacheKey(input: PlacesSearchInput): string {
  const payload = [
    input.query,
    input.city ?? "",
    input.latitude ?? "",
    input.longitude ?? "",
    input.sort ?? "",
    input.loose ? "1" : "0",
  ].join("|");
  return `${PLACES_CACHE_PREFIX}search:${sha256(payload)}`;
}

export function detailsCacheKey(googlePlaceId: string): string {
  return `${PLACES_CACHE_PREFIX}details:${normalizeGooglePlaceId(googlePlaceId)}`;
}

export function photoCacheKey(photoName: string): string {
  return `${PLACES_CACHE_PREFIX}photo:${sha256(photoName)}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isDetailsNotFound(value: PlaceDetails | DetailsNotFound): value is DetailsNotFound {
  return "__dolanNotFound" in value && value.__dolanNotFound === true;
}

function httpStatus(error: unknown): number | undefined {
  return error instanceof HttpError ? error.status : undefined;
}
