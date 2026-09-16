import type { TripSort, TripSummary } from "@dolan/shared";
import { distanceKm } from "./place-rank.ts";

const PAST_DEPARTURE_OFFSET_DAYS = 1_000_000;

export function todayInJakarta(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function normalizeTripSort(sort: TripSort): "popular" | "nearest" | "soonest" {
  return sort === "recent" ? "soonest" : sort;
}

export function sortTrips(
  items: TripSummary[],
  sort: TripSort,
  origin?: { latitude: number; longitude: number },
  today = todayInJakarta(),
): TripSummary[] {
  const mode = normalizeTripSort(sort);
  return [...items].sort((a, b) => {
    if (mode === "popular") {
      if (b.participantCount !== a.participantCount) return b.participantCount - a.participantCount;
      if (b.pendingRequestCount !== a.pendingRequestCount) return b.pendingRequestCount - a.pendingRequestCount;
      return departureSoonestDelta(a.startDate, today) - departureSoonestDelta(b.startDate, today);
    }
    if (mode === "nearest") {
      const distanceDelta = meetingDistanceKm(a, origin) - meetingDistanceKm(b, origin);
      if (Math.abs(distanceDelta) > 0.05) return distanceDelta;
      return departureSoonestDelta(a.startDate, today) - departureSoonestDelta(b.startDate, today);
    }
    const soonestDelta = departureSoonestDelta(a.startDate, today) - departureSoonestDelta(b.startDate, today);
    if (soonestDelta !== 0) return soonestDelta;
    if (b.participantCount !== a.participantCount) return b.participantCount - a.participantCount;
    return a.id.localeCompare(b.id);
  });
}

export function tripSortOrigin(query: { lat?: number; lng?: number }) {
  if (query.lat === undefined || query.lng === undefined) return undefined;
  return { latitude: query.lat, longitude: query.lng };
}

function departureSoonestDelta(startDate: string | null, today: string): number {
  if (!startDate) return Number.POSITIVE_INFINITY;
  if (startDate >= today) return dateDiffDays(today, startDate);
  return PAST_DEPARTURE_OFFSET_DAYS + dateDiffDays(startDate, today);
}

function dateDiffDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function meetingDistanceKm(
  trip: TripSummary,
  origin?: { latitude: number; longitude: number },
): number {
  if (!origin || trip.publicMeetingPointLatitude == null || trip.publicMeetingPointLongitude == null) {
    return Number.POSITIVE_INFINITY;
  }
  return distanceKm(origin, {
    latitude: trip.publicMeetingPointLatitude,
    longitude: trip.publicMeetingPointLongitude,
  });
}
