import { SearchErrorCode, type PlaceDetails, type PlacePhotoMedia, type PlaceSummary } from "@dolan/shared";
import { providerUnavailable, tooManyRequests } from "../../lib/api-error.ts";
import { logger } from "../../lib/logger.ts";
import { looksLikeLodgingOrFoodQuery } from "../../modules/search/place-rank.ts";
import { extractAttributions, toPlaceDetails, toPlaceSummary, type GooglePlace } from "./places-mapper.ts";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "places.googleMapsUri",
  "places.addressComponents",
  "places.types",
].join(",");
const DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "photos",
  "googleMapsUri",
  "addressComponents",
  "editorialSummary",
  "types",
  "regularOpeningHours",
].join(",");

export type PlacesSearchInput = {
  query: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  sort?: "relevance" | "popular" | "nearest";
};

export function photoMediaPath(photoName: string) {
  const encoded = photoName.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `${encoded}/media?maxHeightPx=800&skipHttpRedirect=true`;
}

export interface PlacesProvider {
  searchText(input: PlacesSearchInput): Promise<PlaceSummary[]>;
  getDetails(googlePlaceId: string): Promise<PlaceDetails>;
  getPhotoMedia(photoName: string): Promise<PlacePhotoMedia>;
}

export class GooglePlacesClient implements PlacesProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async searchText(input: PlacesSearchInput): Promise<PlaceSummary[]> {
    const lodgingOrFood = looksLikeLodgingOrFoodQuery(input.query);
    const wisataHint = lodgingOrFood ? "" : " wisata";
    const textQuery = input.city
      ? `${input.query}${wisataHint} in ${input.city}, Indonesia`
      : `${input.query}${wisataHint} Indonesia`;
    const body: Record<string, unknown> = {
      textQuery,
      languageCode: "id",
      regionCode: "ID",
      pageSize: 20,
    };
    if (!lodgingOrFood) {
      body.includedType = "tourist_attraction";
      body.strictTypeFiltering = false;
    }
    if (input.sort === "nearest" && typeof input.latitude === "number" && typeof input.longitude === "number") {
      body.rankPreference = "DISTANCE";
    }
    if (typeof input.latitude === "number" && typeof input.longitude === "number") {
      body.locationBias = {
        circle: {
          center: { latitude: input.latitude, longitude: input.longitude },
          radius: 50_000,
        },
      };
    }

    const payload = await this.request<{ places?: GooglePlace[] }>("places:searchText", {
      method: "POST",
      fieldMask: SEARCH_FIELD_MASK,
      body,
    });

    return (payload.places ?? []).map(toPlaceSummary).filter((place): place is PlaceSummary => Boolean(place));
  }

  async getDetails(googlePlaceId: string): Promise<PlaceDetails> {
    const payload = await this.request<GooglePlace>(`places/${encodeURIComponent(googlePlaceId)}`, {
      method: "GET",
      fieldMask: DETAIL_FIELD_MASK,
    });
    const details = toPlaceDetails(payload);
    if (!details) {
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Place details were incomplete", 502);
    }
    return details;
  }

  async getPhotoMedia(photoName: string): Promise<PlacePhotoMedia> {
    const payload = await this.request<{ photoUri?: string; authorAttributions?: Array<{ displayName?: string; uri?: string }> }>(
      photoMediaPath(photoName),
      { method: "GET" },
    );
    if (!payload.photoUri) {
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Photo media was unavailable", 502);
    }
    return {
      photoUri: payload.photoUri,
      attributions: extractAttributions([{ authorAttributions: payload.authorAttributions }]),
    };
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST"; fieldMask?: string; body?: Record<string, unknown> },
  ): Promise<T> {
    if (!this.apiKey) {
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Google Maps server key is not configured", 503);
    }

    const headers: Record<string, string> = {
      "X-Goog-Api-Key": this.apiKey,
      Accept: "application/json",
    };
    if (options.fieldMask) headers["X-Goog-FieldMask"] = options.fieldMask;
    if (options.body) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchImpl(`${PLACES_BASE}/${path}`, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      logger.error("Google Places network error", { operation: path.split("?")[0] });
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Google Places is unavailable", 503);
    }

    if (response.status === 429) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Google Places quota was exceeded");
    }
    if (!response.ok) {
      logger.error("Google Places request failed", {
        operation: path.split("?")[0]?.replace(/\/photos\/[^/]+/, "/photos/[ref]"),
        status: response.status,
      });
      const status = response.status >= 500 ? 503 : 502;
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Google Places is unavailable", status);
    }

    return (await response.json()) as T;
  }
}
