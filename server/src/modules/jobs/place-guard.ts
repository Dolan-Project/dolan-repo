import type { GeminiItinerary } from "@dolan/shared";

export const GOOGLE_PLACE_ID = /^ChIJ[A-Za-z0-9_-]+$/;

export function isGooglePlaceId(value: string) {
  return GOOGLE_PLACE_ID.test(value);
}

export function assertRealPlaces(itinerary: GeminiItinerary) {
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (!stop.place) continue;
      if (!isGooglePlaceId(stop.place.googlePlaceId)) {
        throw new Error("INVALID_GENERATION");
      }
    }
  }
}
