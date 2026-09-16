import { getModels } from "@dolan/database";
import type { GeminiItinerary, PlaceSummary } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { PlacesProvider } from "../../integrations/google/places-client.ts";
import type { LatLng } from "./routes-adapter.ts";

const CHIJ_PLACE_ID = /^ChIJ[A-Za-z0-9_-]+$/;

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function uniquePlaceIds(itinerary: GeminiItinerary): string[] {
  const ids = new Set<string>();
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (stop.place?.googlePlaceId) ids.add(stop.place.googlePlaceId);
    }
  }
  return [...ids];
}

export function scorePlaceNameMatch(query: string, candidateName: string): number {
  const q = query.toLowerCase().trim();
  const c = candidateName.toLowerCase().trim();
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const queryTokens = new Set(q.split(/\s+/).filter(Boolean));
  const candidateTokens = c.split(/\s+/).filter(Boolean);
  const overlap = candidateTokens.filter((token) => queryTokens.has(token)).length;
  return overlap * 12;
}

export function pickBestPlaceMatch(query: string, candidates: PlaceSummary[]): PlaceSummary | null {
  if (!candidates.length) return null;
  let best = candidates[0]!;
  let bestScore = scorePlaceNameMatch(query, best.name);
  for (const candidate of candidates.slice(1)) {
    const score = scorePlaceNameMatch(query, candidate.name);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : candidates[0] ?? null;
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
    try {
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
    } catch {
      // Cache is best-effort; generation can proceed without it.
    }
  }

  async function tryDetails(googlePlaceId: string) {
    if (!places || !CHIJ_PLACE_ID.test(googlePlaceId)) return null;
    try {
      const details = await places.getDetails(googlePlaceId);
      if (typeof details.latitude === "number" && typeof details.longitude === "number") {
        await remember(googlePlaceId, details.latitude, details.longitude, details.name);
      }
      return details;
    } catch (error) {
      // Hallucinated ChIJ ids often return 400/404/502 — fall through to text search by name.
      if (error instanceof HttpError) return null;
      return null;
    }
  }

  async function resolveByName(name: string, city: string | null | undefined) {
    if (!places) return null;
    try {
      const results = await places.searchText({
        query: name,
        city: city?.trim() || undefined,
        loose: true,
      });
      const match = pickBestPlaceMatch(name, results);
      if (!match) return null;
      if (typeof match.latitude === "number" && typeof match.longitude === "number") {
        await remember(match.googlePlaceId, match.latitude, match.longitude, match.name);
      }
      return match;
    } catch {
      return null;
    }
  }

  function isLodgingOrFood(types: string[] | undefined) {
    return (types ?? []).some((type) =>
      ["lodging", "hotel", "restaurant", "food", "cafe"].includes(type.toLowerCase()),
    );
  }

  async function densifyDays(
    days: GeminiItinerary["days"],
    input: {
      city: string | null;
      minStops: number;
      maxStops: number;
      coordsById: Map<string, { latitude: number; longitude: number }>;
    },
  ) {
    if (!places) return days;
    const used = new Set(
      days.flatMap((day) =>
        day.stops
          .map((stop) => stop.place?.googlePlaceId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const queries = input.city ? [input.city, "wisata"] : ["wisata"];
    const nearby: PlaceSummary[] = [];
    const seen = new Set<string>();
    for (const query of queries) {
      const results = await places.searchText({
        query,
        city: input.city || undefined,
        loose: true,
      }).catch(() => []);
      for (const place of results) {
        if (seen.has(place.googlePlaceId) || !CHIJ_PLACE_ID.test(place.googlePlaceId)) continue;
        if (isLodgingOrFood(place.types)) continue;
        seen.add(place.googlePlaceId);
        nearby.push(place);
        if (typeof place.latitude === "number" && typeof place.longitude === "number") {
          input.coordsById.set(place.googlePlaceId, {
            latitude: place.latitude,
            longitude: place.longitude,
          });
        }
      }
    }

    return days.map((day) => {
      if (day.stops.length >= input.minStops) {
        return { ...day, stops: day.stops.map((stop, index) => ({ ...stop, sequence: index + 1 })) };
      }
      const hubId = day.stops.find((stop) => stop.place?.googlePlaceId)?.place?.googlePlaceId;
      const hub = hubId ? input.coordsById.get(hubId) : null;
      const extras = [];
      for (const place of nearby) {
        if (day.stops.length + extras.length >= input.maxStops) break;
        if (used.has(place.googlePlaceId)) continue;
        if (hub && typeof place.latitude === "number" && typeof place.longitude === "number") {
          if (haversineKm(hub, { latitude: place.latitude, longitude: place.longitude }) > 18) continue;
        }
        used.add(place.googlePlaceId);
        extras.push({
          sequence: day.stops.length + extras.length + 1,
          place: {
            googlePlaceId: place.googlePlaceId,
            name: place.name,
            city: place.city ?? input.city,
          },
          customTitle: place.name,
          activityType: "wisata",
          startTime: null,
          durationMinutes: 90,
          travelDurationMinutes: null,
          notes: "Tempat terdekat di koridor yang sama — satu hari tidak cukup diisi satu destinasi.",
          isLocked: false,
        });
      }
      const stops = [...day.stops, ...extras].map((stop, index) => ({ ...stop, sequence: index + 1 }));
      return { ...day, stops };
    });
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
    async hydratePlaces(
      itinerary: GeminiItinerary,
      bias?: { destinationCity?: string | null; minStopsPerDay?: number; maxStopsPerDay?: number },
    ): Promise<GeminiItinerary> {
      if (!places) {
        if (options.requireKnownPlace) throw new Error("INVALID_GENERATION");
        return itinerary;
      }

      const biasCity = bias?.destinationCity?.trim() || null;
      const minStops = Math.max(2, Number(bias?.minStopsPerDay ?? 2));
      const maxStops = Math.max(minStops, Number(bias?.maxStopsPerDay ?? 4));
      const coordsById = new Map<string, { latitude: number; longitude: number }>();
      const destinationAnchor =
        biasCity && places
          ? pickBestPlaceMatch(biasCity, await places.searchText({ query: biasCity, city: biasCity, loose: true }).catch(() => []))
          : null;
      if (destinationAnchor && typeof destinationAnchor.latitude === "number" && typeof destinationAnchor.longitude === "number") {
        coordsById.set(destinationAnchor.googlePlaceId, {
          latitude: destinationAnchor.latitude,
          longitude: destinationAnchor.longitude,
        });
      }
      const maxKmFromDestination = 45;
      const days = [];
      for (const day of itinerary.days) {
        const stops = [];
        for (const stop of day.stops) {
          if (!stop.place) {
            stops.push(stop);
            continue;
          }

          const requestedId = stop.place.googlePlaceId.trim();
          const cityHint = stop.place.city?.trim() || biasCity;
          const byId = await tryDetails(requestedId);
          const resolved =
            byId ??
            (await resolveByName(stop.place.name, cityHint)) ??
            (cityHint ? await resolveByName(stop.place.name, null) : null) ??
            (stop.place.city && stop.place.city !== cityHint
              ? await resolveByName(stop.place.name, stop.place.city)
              : null);

          if (!resolved || !CHIJ_PLACE_ID.test(resolved.googlePlaceId)) {
            continue;
          }

          if (
            destinationAnchor &&
            typeof resolved.latitude === "number" &&
            typeof resolved.longitude === "number" &&
            typeof destinationAnchor.latitude === "number" &&
            typeof destinationAnchor.longitude === "number"
          ) {
            const distance = haversineKm(
              { latitude: destinationAnchor.latitude, longitude: destinationAnchor.longitude },
              { latitude: resolved.latitude, longitude: resolved.longitude },
            );
            if (distance > maxKmFromDestination) {
              continue;
            }
          }

          if (typeof resolved.latitude === "number" && typeof resolved.longitude === "number") {
            coordsById.set(resolved.googlePlaceId, {
              latitude: resolved.latitude,
              longitude: resolved.longitude,
            });
          }

          stops.push({
            ...stop,
            place: {
              googlePlaceId: resolved.googlePlaceId,
              name: resolved.name || stop.place.name,
              city: resolved.city ?? stop.place.city ?? biasCity,
            },
          });
        }

        if (!stops.length && biasCity) {
          const filler = await resolveByName(`${biasCity} wisata`, biasCity);
          if (filler && CHIJ_PLACE_ID.test(filler.googlePlaceId)) {
            const seed = day.stops[0];
            if (typeof filler.latitude === "number" && typeof filler.longitude === "number") {
              coordsById.set(filler.googlePlaceId, {
                latitude: filler.latitude,
                longitude: filler.longitude,
              });
            }
            stops.push({
              sequence: 1,
              place: {
                googlePlaceId: filler.googlePlaceId,
                name: filler.name,
                city: filler.city ?? biasCity,
              },
              customTitle: filler.name,
              activityType: seed?.activityType ?? "wisata",
              startTime: seed?.startTime ?? "09:00",
              durationMinutes: seed?.durationMinutes ?? 90,
              travelDurationMinutes: 0,
              notes: seed?.notes ?? null,
              isLocked: false,
            });
          }
        }

        if (stops.length) {
          days.push({
            ...day,
            stops: stops.map((stop, index) => ({ ...stop, sequence: index + 1 })),
          });
        }
      }

      if (!days.length) throw new Error("INVALID_GENERATION");
      const densified = await densifyDays(days, {
        city: biasCity,
        minStops,
        maxStops,
        coordsById,
      });
      return { ...itinerary, days: densified };
    },

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
        }         catch (error) {
          if (error instanceof HttpError && error.status === 404) {
            throw new Error("INVALID_GENERATION");
          }
          // 5xx/quota on a follow-up details call must not discard an already hydrated itinerary.
        }
      }
    },
  };
}
