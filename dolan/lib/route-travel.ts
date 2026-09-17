export const ROUTE_UNAVAILABLE_TEXT = "Rute jalan tidak tersedia";

export function formatDistanceKm(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 100) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const digits = km >= 100 ? 0 : 1;
  return `${km.toFixed(digits).replace(".", ",")} km`;
}

export function formatTravelMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} menit`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

export function isRouteUnavailable(stop: {
  routeStatus?: string | null;
}, isFirst = false): boolean {
  return !isFirst && stop.routeStatus === "UNAVAILABLE";
}

export function impliedSpeedKmh(meters: number, minutes: number) {
  if (!(meters > 0) || !(minutes > 0)) return null;
  return (meters / 1000) / (minutes / 60);
}

export function isTravelSpeedAnomaly(
  meters?: number | null,
  minutes?: number | null,
  highway = false,
) {
  if (meters == null || minutes == null) return false;
  const kmh = impliedSpeedKmh(meters, minutes);
  if (kmh == null) return false;
  return kmh > (highway ? 100 : 80);
}

export function hasVerifiedRoadTravel(
  stop: {
    routeStatus?: string | null;
    travelDistanceMeters?: number | null;
    travelDurationMinutes?: number | null;
  },
  isFirst = false,
) {
  if (isFirst || stop.routeStatus !== "AVAILABLE") return false;
  if (isTravelSpeedAnomaly(stop.travelDistanceMeters, stop.travelDurationMinutes)) return false;
  return Boolean(
    (stop.travelDistanceMeters != null && stop.travelDistanceMeters > 0)
    || (stop.travelDurationMinutes != null && stop.travelDurationMinutes > 0),
  );
}

export function formatStopTravel(
  stop: {
    routeStatus?: string | null;
    travelDistanceMeters?: number | null;
    travelDurationMinutes?: number | null;
  },
  isFirst = false,
): string | null {
  if (isFirst) return null;
  if (isRouteUnavailable(stop, isFirst)) return ROUTE_UNAVAILABLE_TEXT;
  if (stop.routeStatus !== "AVAILABLE") return null;
  if (isTravelSpeedAnomaly(stop.travelDistanceMeters, stop.travelDurationMinutes)) {
    const distance = formatDistanceKm(stop.travelDistanceMeters);
    return distance ? `${distance} · waktu tempuh perlu verifikasi` : "Waktu tempuh perlu verifikasi";
  }
  const parts = [
    formatDistanceKm(stop.travelDistanceMeters),
    formatTravelMinutes(stop.travelDurationMinutes),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function itineraryHasUnavailableRoute(
  days: Array<{ stops: Array<{ routeStatus?: string | null }> }>,
): boolean {
  return days.some((day) => day.stops.some((stop, index) => isRouteUnavailable(stop, index === 0)));
}

export function encodedRoutePolylines(
  days: Array<{ stops: Array<{ routePolyline?: string | null; routeStatus?: string | null }> }>,
): string[] {
  return days.flatMap((day) =>
    day.stops
      .map((stop) => (stop.routeStatus === "UNAVAILABLE" ? null : stop.routePolyline))
      .filter((value): value is string => Boolean(value)),
  );
}

export function clearDayRoadRoutes<T extends { stops: Array<Record<string, unknown> & {
  travelDurationMinutes?: number | null;
  travelDistanceMeters?: number | null;
  routePolyline?: string | null;
  routeStatus?: string | null;
}> }>(day: T): T {
  return {
    ...day,
    stops: day.stops.map((stop, index) => ({
      ...stop,
      travelDurationMinutes: index === 0 ? 0 : null,
      travelDistanceMeters: null,
      routePolyline: null,
      routeStatus: index === 0 ? "AVAILABLE" : "PENDING",
    })),
  };
}

type PreviewSegment =
  | { ok: true; durationMinutes?: number; distanceMeters?: number; encodedPolyline?: string }
  | { ok: false };

export async function applyLiveRoadRoutes<T extends {
  stops: Array<{
    place?: { latitude?: number | null; longitude?: number | null } | null;
    travelDurationMinutes?: number | null;
    travelDistanceMeters?: number | null;
    routePolyline?: string | null;
    routeStatus?: string | null;
    routeTravelMode?: string | null;
  }>;
}>(days: T[], fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<T[]> {
  const next = days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => ({ ...stop })),
  }));
  for (const day of next) {
    const points = day.stops.map((stop) => {
      const latitude = stop.place?.latitude;
      const longitude = stop.place?.longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (latitude === 0 && longitude === 0) return null;
      return { lat: latitude, lng: longitude };
    });
    const indexed = day.stops
      .map((stop, index) => ({ stop, index, point: points[index] }))
      .filter((item): item is { stop: (typeof day.stops)[number]; index: number; point: { lat: number; lng: number } } => Boolean(item.point));
    if (indexed.length < 2) continue;
    try {
      const response = await fetchImpl("/api/v1/routes/preview", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ points: indexed.slice(0, 10).map((item) => item.point) }),
        signal,
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { data?: { segments?: PreviewSegment[] } };
      const segments = payload.data?.segments ?? [];
      day.stops[0] && (day.stops[0].travelDurationMinutes = 0);
      indexed.forEach((item, position) => {
        if (position === 0) {
          item.stop.travelDurationMinutes = 0;
          item.stop.routePolyline = null;
          item.stop.routeStatus = "AVAILABLE";
          return;
        }
        const leg = segments[position - 1];
        if (!leg || !("ok" in leg) || !leg.ok) {
          item.stop.travelDurationMinutes = null;
          item.stop.travelDistanceMeters = null;
          item.stop.routePolyline = null;
          item.stop.routeStatus = "UNAVAILABLE";
          return;
        }
        item.stop.travelDurationMinutes = leg.durationMinutes ?? item.stop.travelDurationMinutes;
        item.stop.travelDistanceMeters = leg.distanceMeters ?? null;
        item.stop.routePolyline = leg.encodedPolyline ?? null;
        item.stop.routeStatus = leg.encodedPolyline ? "AVAILABLE" : "PENDING";
        item.stop.routeTravelMode = "DRIVE";
      });
    } catch {
      /* keep pending legs if preview is aborted or unavailable */
    }
  }
  return next;
}

let liveRouteSeq = 0;

export async function replaceItineraryRoads<T extends {
  stops: Array<{
    place?: { latitude?: number | null; longitude?: number | null } | null;
    travelDurationMinutes?: number | null;
    travelDistanceMeters?: number | null;
    routePolyline?: string | null;
    routeStatus?: string | null;
    routeTravelMode?: string | null;
  }>;
}>(days: T[], onDone: (days: T[]) => void) {
  liveRouteSeq += 1;
  const seq = liveRouteSeq;
  const routed = await applyLiveRoadRoutes(days);
  if (seq !== liveRouteSeq) return;
  onDone(routed);
}

