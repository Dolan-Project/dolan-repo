import { getModels } from "@dolan/database";
import type { GeminiItinerary } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { PlacesProvider } from "../../integrations/google/places-client.ts";
import type { LatLng } from "./routes-adapter.ts";

export function uniquePlaceIds(itinerary: GeminiItinerary): string[] {
  const ids = new Set<string>();
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (stop.place?.googlePlaceId) ids.add(stop.place.googlePlaceId);
    }
  }
  return [...ids];
}

export function createPlaceLookup(
  places?: PlacesProvider,
  options: { requireKnownPlace?: boolean } = {},
) {
  async function loadCached(googlePlaceId: string) {
    const { Place } = getModels();
    return Place.findOne({ where: { googlePlaceId } });
  }

  async function remember(googlePlaceId: string, latitude: number, longitude: number, name?: string) {
    const { Place } = getModels();
    const [place] = await Place.findOrCreate({
      where: { googlePlaceId },
      defaults: {
        googlePlaceId,
        cachedName: name ?? null,
        cachedLatitude: latitude,
        cachedLongitude: longitude,
        cacheCheckedAt: new Date(),
        status: "ACTIVE",
      },
    });
    place.cachedLatitude = latitude;
    place.cachedLongitude = longitude;
    place.cacheCheckedAt = new Date();
    if (name) place.cachedName = name;
    await place.save();
  }

  async function resolveOne(googlePlaceId: string): Promise<LatLng | null> {
    const cached = await loadCached(googlePlaceId);
    if (cached?.status === "INACTIVE") {
      throw new Error("INVALID_GENERATION");
    }
    if (cached?.cachedLatitude != null && cached.cachedLongitude != null) {
      return { latitude: cached.cachedLatitude, longitude: cached.cachedLongitude };
    }

    if (!places) {
      if (options.requireKnownPlace) throw new Error("INVALID_GENERATION");
      return null;
    }

    try {
      const details = await places.getDetails(googlePlaceId);
      if (typeof details.latitude === "number" && typeof details.longitude === "number") {
        await remember(googlePlaceId, details.latitude, details.longitude, details.name);
        return { latitude: details.latitude, longitude: details.longitude };
      }
      return null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        if (options.requireKnownPlace) throw new Error("INVALID_GENERATION");
        return null;
      }
      throw error;
    }
  }

  return {
    async resolveCoords(itinerary: GeminiItinerary): Promise<Array<LatLng | null>> {
      const coords: Array<LatLng | null> = [];
      for (const day of itinerary.days) {
        for (const stop of day.stops) {
          coords.push(stop.place ? await resolveOne(stop.place.googlePlaceId) : null);
        }
      }
      return coords;
    },

    async verifyPlaces(itinerary: GeminiItinerary): Promise<void> {
      if (!options.requireKnownPlace) return;
      for (const googlePlaceId of uniquePlaceIds(itinerary)) {
        const cached = await loadCached(googlePlaceId);
        if (cached?.status === "INACTIVE") throw new Error("INVALID_GENERATION");
        if (cached?.status === "ACTIVE") continue;
        if (!places) throw new Error("INVALID_GENERATION");
        try {
          await places.getDetails(googlePlaceId);
        } catch (error) {
          if (error instanceof HttpError && error.status === 404) {
            throw new Error("INVALID_GENERATION");
          }
          throw error;
        }
      }
    },
  };
}
