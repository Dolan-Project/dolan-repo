import { normalizeCityName } from "../../modules/search/city-catalog.ts";
import type { PlaceAttribution, PlaceDetails, PlaceSummary } from "@dolan/shared";

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  photos?: GooglePhoto[];
  googleMapsUri?: string;
  addressComponents?: Array<{ longText?: string; types?: string[] }>;
  types?: string[];
  editorialSummary?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

export type GooglePhoto = {
  name?: string;
  authorAttributions?: Array<{ displayName?: string; uri?: string }>;
};

export function extractCity(place: GooglePlace): string | null {
  const components = place.addressComponents ?? [];
  const locality = components.find((item) => item.types?.includes("locality"))?.longText;
  if (locality) return normalizeCityName(locality);
  const admin2 = components.find((item) => item.types?.includes("administrative_area_level_2"))?.longText;
  return normalizeCityName(admin2 ?? null);
}

export function extractAttributions(photos: GooglePhoto[] | undefined): PlaceAttribution[] {
  const seen = new Set<string>();
  const attributions: PlaceAttribution[] = [];
  for (const photo of photos ?? []) {
    for (const item of photo.authorAttributions ?? []) {
      const displayName = item.displayName?.trim();
      if (!displayName) continue;
      const key = `${displayName}|${item.uri ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      attributions.push({ displayName, uri: item.uri ?? null });
    }
  }
  return attributions;
}

export function toPlaceSummary(place: GooglePlace): PlaceSummary | null {
  if (!place.id || !place.displayName?.text) return null;
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  return {
    googlePlaceId: place.id,
    name: place.displayName.text,
    formattedAddress: place.formattedAddress ?? place.shortFormattedAddress ?? null,
    city: extractCity(place),
    latitude,
    longitude,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    photoName: place.photos?.[0]?.name ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    types: place.types ?? [],
  };
}

export function toPlaceDetails(place: GooglePlace, visitCount = 0): PlaceDetails | null {
  const summary = toPlaceSummary(place);
  if (!summary) return null;
  return {
    ...summary,
    types: place.types ?? [],
    editorialSummary: place.editorialSummary?.text ?? null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? null,
    attributions: extractAttributions(place.photos),
    visitCount,
  };
}
