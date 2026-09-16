import type { PlaceSummary } from "@dolan/shared";

export function hasCoverPhoto(place?: { photoName?: string | null; photoUri?: string | null } | null) {
  return Boolean(place?.photoUri || place?.photoName);
}

export function coverPlaceFromPreferences(preferences: Record<string, unknown> | null | undefined): PlaceSummary | null {
  const raw = preferences?.coverPlace;
  if (!raw || typeof raw !== "object") return null;
  const place = raw as Record<string, unknown>;
  const googlePlaceId = typeof place.googlePlaceId === "string" ? place.googlePlaceId.trim() : "";
  if (!googlePlaceId) return null;
  const latitude = typeof place.latitude === "number" && Number.isFinite(place.latitude) ? place.latitude : 0;
  const longitude = typeof place.longitude === "number" && Number.isFinite(place.longitude) ? place.longitude : 0;
  return {
    googlePlaceId,
    name: typeof place.name === "string" && place.name.trim() ? place.name.trim() : "Destinasi",
    formattedAddress: typeof place.formattedAddress === "string" ? place.formattedAddress : null,
    city: typeof place.city === "string" ? place.city : null,
    latitude,
    longitude,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    photoName: typeof place.photoName === "string" && place.photoName ? place.photoName : null,
    photoUri: typeof place.photoUri === "string" && place.photoUri ? place.photoUri : null,
    googleMapsUrl: typeof place.googleMapsUrl === "string" ? place.googleMapsUrl : null,
    types: Array.isArray(place.types) ? place.types.filter((item): item is string => typeof item === "string") : [],
  };
}

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
