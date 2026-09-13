export const STALE_AFTER_MS = 2 * 60 * 1000;
export const HIDE_AFTER_MS = 10 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
const APPROX_DECIMALS = 2;

export type LocationFreshness = "LIVE" | "STALE" | "HIDDEN";

export function locationFreshness(recordedAt: Date, now = new Date()): LocationFreshness {
  const age = now.getTime() - recordedAt.getTime();
  if (age >= HIDE_AFTER_MS) return "HIDDEN";
  if (age >= STALE_AFTER_MS) return "STALE";
  return "LIVE";
}

export function approximatePublicPoint(latitude: number, longitude: number) {
  const quantize = (value: number) => Number(value.toFixed(APPROX_DECIMALS));
  return { latitude: quantize(latitude), longitude: quantize(longitude) };
}

export function shareExpiresAt(duration: "ONE_HOUR" | "UNTIL_TRIP_END", tripEnd?: Date | null, now = new Date()) {
  if (duration === "ONE_HOUR") {
    return new Date(now.getTime() + ONE_HOUR_MS);
  }
  if (tripEnd && tripEnd.getTime() > now.getTime()) {
    return tripEnd;
  }
  return new Date(now.getTime() + 24 * ONE_HOUR_MS);
}

export function isShareActive(input: { expiresAt: Date; revokedAt: Date | null }, now = new Date()) {
  if (input.revokedAt) return false;
  return input.expiresAt.getTime() > now.getTime();
}

export function presentLocation(input: {
  latitude: number;
  longitude: number;
  recordedAt: Date;
  scope: "TRIP_PRECISE" | "PUBLIC_APPROXIMATE";
  viewer: "TRIP_MEMBER" | "PUBLIC";
  now?: Date;
}) {
  const freshness = locationFreshness(input.recordedAt, input.now);
  if (freshness === "HIDDEN") return null;
  const point =
    input.viewer === "PUBLIC" || input.scope === "PUBLIC_APPROXIMATE"
      ? approximatePublicPoint(input.latitude, input.longitude)
      : { latitude: input.latitude, longitude: input.longitude };
  return { ...point, freshness };
}
