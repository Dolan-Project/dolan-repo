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
