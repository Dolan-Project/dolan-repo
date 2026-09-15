import type { PlaceSummary } from "@dolan/shared";

export function coverPlaceFromCache(place: {
  googlePlaceId: string;
  cachedName?: string | null;
  cachedCity?: string | null;
  cachedLatitude?: number | null;
  cachedLongitude?: number | null;
  cachedPhotoName?: string | null;
  cachedPhotoUrl?: string | null;
} | null): PlaceSummary | null {
  if (!place) return null;
  return {
    googlePlaceId: place.googlePlaceId,
    name: place.cachedName ?? "Unknown place",
    formattedAddress: null,
    city: place.cachedCity ?? null,
    latitude: place.cachedLatitude ?? 0,
    longitude: place.cachedLongitude ?? 0,
    rating: null,
    userRatingCount: null,
    photoName: place.cachedPhotoName ?? null,
    photoUri: place.cachedPhotoUrl ?? null,
    googleMapsUrl: null,
    types: [],
  };
}
