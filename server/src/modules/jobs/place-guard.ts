import type { GeminiItinerary } from "@dolan/shared";

const GOOGLE_PLACE_ID = /^ChIJ[A-Za-z0-9_-]+$/;

export function assertRealPlaces(itinerary: GeminiItinerary) {
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (!stop.place) continue;
      if (!GOOGLE_PLACE_ID.test(stop.place.googlePlaceId)) {
        throw new Error("INVALID_GENERATION");
      }
    }
  }
}
