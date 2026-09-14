export type LatLng = { latitude: number; longitude: number };

export type RouteLegResult =
  | { ok: true; durationMinutes: number; distanceMeters?: number; encodedPolyline?: string; travelMode?: string }
  | { ok: false; reason: string };

export interface RoutesClient {
  computeLeg(from: LatLng, to: LatLng): Promise<RouteLegResult>;
}

const UNSUPPORTED = "Rute tidak tersedia untuk segmen ini. Jangan anggap garis lurus sebagai jalan.";

export class MockRoutesClient implements RoutesClient {
  constructor(private readonly result: RouteLegResult = { ok: true, durationMinutes: 25, distanceMeters: 12000, encodedPolyline: "", travelMode: "DRIVE" }) {}

  async computeLeg(): Promise<RouteLegResult> {
    return this.result;
  }
}

export class GoogleRoutesClient implements RoutesClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async computeLeg(from: LatLng, to: LatLng): Promise<RouteLegResult> {
    try {
      const response = await this.fetchImpl("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: from } },
          destination: { location: { latLng: to } },
          travelMode: "DRIVE",
          languageCode: "id",
          regionCode: "ID",
        }),
      });
      if (!response.ok) {
        return { ok: false, reason: UNSUPPORTED };
      }
      const payload = (await response.json()) as { routes?: Array<{ duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }> };
      const route = payload.routes?.[0];
      const duration = route?.duration;
      if (!duration || !route?.polyline?.encodedPolyline) return { ok: false, reason: UNSUPPORTED };
      const seconds = Number(duration.replace(/s$/, ""));
      if (!Number.isFinite(seconds) || seconds <= 0) return { ok: false, reason: UNSUPPORTED };
      return { ok: true, durationMinutes: Math.max(1, Math.round(seconds / 60)), distanceMeters: route.distanceMeters ?? 0, encodedPolyline: route.polyline.encodedPolyline, travelMode: "DRIVE" };
    } catch {
      return { ok: false, reason: UNSUPPORTED };
    }
  }
}

export async function applyRouteLegs(
  itinerary: import("@dolan/shared").GeminiItinerary,
  coords: Array<LatLng | null>,
  routes: RoutesClient,
): Promise<import("@dolan/shared").GeminiItinerary> {
  const days = [];
  let cursor = 0;
  for (const day of itinerary.days) {
    const stops = [];
    for (let index = 0; index < day.stops.length; index += 1) {
      const stop = day.stops[index]!;
      if (index === 0) {
        stops.push(stop);
        cursor += 1;
        continue;
      }
      const from = coords[cursor - 1];
      const to = coords[cursor];
      if (!from || !to) {
        stops.push({
          ...stop,
          travelDurationMinutes: null,
          notes: [stop.notes, "Waktu tempuh belum dihitung: koordinat tidak lengkap."].filter(Boolean).join(" "),
        });
        cursor += 1;
        continue;
      }
      const haversineKm = approximateKm(from, to);
      if (haversineKm > 200) {
        stops.push({
          ...stop,
          travelDurationMinutes: null,
          notes: [
            stop.notes,
            `Segmen antarpulau/moda khusus (~${Math.round(haversineKm)} km). Jangan anggap garis lurus sebagai jalan — isi estimasi ferry/pesawat secara manual.`,
          ]
            .filter(Boolean)
            .join(" "),
          routePolyline: null,
          travelDistanceMeters: Math.round(haversineKm * 1000),
          routeStatus: "UNAVAILABLE" as const,
          routeTravelMode: "TRANSIT_MANUAL",
        });
        cursor += 1;
        continue;
      }
      const leg = await routes.computeLeg(from, to);
      stops.push(
        leg.ok
          ? { ...stop, travelDurationMinutes: leg.durationMinutes, routePolyline: leg.encodedPolyline || null, travelDistanceMeters: leg.distanceMeters ?? null, routeStatus: leg.encodedPolyline ? "AVAILABLE" as const : "PENDING" as const, routeTravelMode: leg.travelMode ?? null }
          : {
              ...stop,
              travelDurationMinutes: null,
              notes: [stop.notes, leg.reason].filter(Boolean).join(" "), routePolyline: null, travelDistanceMeters: null, routeStatus: "UNAVAILABLE" as const, routeTravelMode: null,
            },
      );
      cursor += 1;
    }
    days.push({ ...day, stops });
  }
  return { ...itinerary, days };
}

function approximateKm(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
