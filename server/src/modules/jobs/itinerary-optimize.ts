import type { BudgetItemInput, GeminiItinerary } from "@dolan/shared";
import type { LatLng } from "./routes-adapter.ts";

type Stop = GeminiItinerary["days"][number]["stops"][number];
type Day = GeminiItinerary["days"][number];

const DAY_START_MINUTES = 8 * 60;
const DEFAULT_TRANSFER_MINUTES = 20;

export function normalizePlaceName(name: string): string {
  return name
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(kota|kabupaten|provinsi|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sameDestination(
  left: { googlePlaceId?: string | null; name?: string | null } | null | undefined,
  right: { googlePlaceId?: string | null; name?: string | null } | null | undefined,
): boolean {
  if (!left || !right) return false;
  const leftId = left.googlePlaceId?.trim();
  const rightId = right.googlePlaceId?.trim();
  if (leftId && rightId && leftId === rightId) return true;
  const leftName = normalizePlaceName(left.name ?? "");
  const rightName = normalizePlaceName(right.name ?? "");
  if (!leftName || !rightName) return false;
  if (leftName === rightName) return true;
  if (leftName.length >= 6 && rightName.length >= 6 && (leftName.includes(rightName) || rightName.includes(leftName))) {
    return true;
  }
  return false;
}

function stopIdentity(stop: Stop) {
  return stop.place ?? { name: stop.customTitle };
}

export function dropDuplicateStops(itinerary: GeminiItinerary, preferLocked = false): GeminiItinerary {
  const lockedKeys: Array<ReturnType<typeof stopIdentity>> = [];
  if (preferLocked) {
    for (const day of itinerary.days) {
      for (const stop of day.stops) {
        if (stop.isLocked) lockedKeys.push(stopIdentity(stop));
      }
    }
  }

  const emitted: Array<ReturnType<typeof stopIdentity>> = [];
  const days = itinerary.days.map((day) => {
    const stops: Stop[] = [];
    for (const stop of day.stops) {
      const identity = stopIdentity(stop);
      if (emitted.some((item) => sameDestination(item, identity))) continue;
      if (
        preferLocked &&
        !stop.isLocked &&
        lockedKeys.some((item) => sameDestination(item, identity))
      ) {
        continue;
      }
      emitted.push(identity);
      stops.push(stop);
    }
    return {
      ...day,
      stops: stops.map((stop, index) => ({ ...stop, sequence: index + 1 })),
    };
  });

  return { ...itinerary, days };
}

export function clampDailyStopBounds(minStopsPerDay?: number, maxStopsPerDay?: number) {
  const requestedMin = Number(minStopsPerDay ?? 4);
  const requestedMax = Number(maxStopsPerDay ?? 6);
  const minStops = Math.min(5, Math.max(3, requestedMin));
  const maxStops = Math.min(6, Math.max(minStops, requestedMax));
  return { minStops, maxStops };
}

function haversineKm(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeLengthKm(points: LatLng[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineKm(points[index - 1]!, points[index]!);
  }
  return total;
}

function orderNearest<T extends { coord: LatLng }>(stops: T[], hub?: LatLng | null): T[] {
  if (stops.length <= 2) return [...stops];
  let start = 0;
  if (hub) {
    let best = Number.POSITIVE_INFINITY;
    stops.forEach((stop, index) => {
      const distance = haversineKm(hub, stop.coord);
      if (distance < best) {
        best = distance;
        start = index;
      }
    });
  }
  const remaining = stops.map((_, index) => index).filter((index) => index !== start);
  const order = [start];
  while (remaining.length) {
    const last = stops[order[order.length - 1]!]!.coord;
    let bestPos = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((index, position) => {
      const distance = haversineKm(last, stops[index]!.coord);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPos = position;
      }
    });
    order.push(remaining.splice(bestPos, 1)[0]!);
  }
  let best = order.map((index) => stops[index]!);
  if (best.length < 4) return best;
  let improved = true;
  while (improved) {
    improved = false;
    const baseline = routeLengthKm(best.map((stop) => stop.coord));
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (routeLengthKm(candidate.map((stop) => stop.coord)) + 0.05 < baseline) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function planItineraryByProximity(
  itinerary: GeminiItinerary,
  coordsById: Map<string, LatLng>,
  hub?: LatLng | null,
): GeminiItinerary {
  const unique = dropDuplicateStops(itinerary);
  const located: Array<{ stop: Stop; coord: LatLng }> = [];
  const missing: Stop[] = [];
  for (const day of unique.days) {
    for (const stop of day.stops) {
      const coord = stop.place?.googlePlaceId ? coordsById.get(stop.place.googlePlaceId) : undefined;
      if (coord) located.push({ stop, coord });
      else missing.push(stop);
    }
  }

  const shells = unique.days;
  if (!located.length) return unique;

  const k = Math.max(1, Math.min(shells.length, located.length));
  const clusters = clusterLocated(located, k, hub ?? located[0]?.coord);
  while (clusters.length < shells.length) clusters.push([]);
  missing.forEach((stop, index) => {
    const target = clusters[index % Math.max(1, clusters.length)] ?? clusters[0];
    if (target) target.push({ stop, coord: hub ?? { latitude: 0, longitude: 0 } });
  });

  const days = shells.map((day, index) => {
    const members = clusters[index] ?? [];
    const ordered = orderNearest(members, index === 0 ? hub : members[0]?.coord ?? hub);
    return {
      ...day,
      stops: ordered.map((item, sequence) => ({
        ...item.stop,
        sequence: sequence + 1,
        travelDurationMinutes: sequence === 0 ? 0 : null,
      })),
    };
  });

  return { ...unique, days };
}

function clusterLocated<T extends { coord: LatLng }>(points: T[], clusterCount: number, hub?: LatLng): T[][] {
  const k = Math.max(1, Math.min(clusterCount, points.length));
  if (k === 1) return [orderNearest(points, hub)];

  const seeds: number[] = [];
  let closest = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = hub ? haversineKm(hub, point.coord) : point.coord.longitude;
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = index;
    }
  });
  seeds.push(closest);
  while (seeds.length < k) {
    let next = -1;
    let nextScore = -1;
    points.forEach((point, index) => {
      if (seeds.includes(index)) return;
      const minDistance = Math.min(...seeds.map((seed) => haversineKm(point.coord, points[seed]!.coord)));
      if (minDistance > nextScore) {
        nextScore = minDistance;
        next = index;
      }
    });
    if (next < 0) break;
    seeds.push(next);
  }

  const assignment = points.map((point) => {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    seeds.forEach((seed, clusterIndex) => {
      const distance = haversineKm(point.coord, points[seed]!.coord);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = clusterIndex;
      }
    });
    return best;
  });

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const centroids = Array.from({ length: k }, (_, clusterIndex) => {
      const members = points.filter((_, index) => assignment[index] === clusterIndex);
      if (!members.length) return points[seeds[clusterIndex]!]!.coord;
      return {
        latitude: members.reduce((sum, item) => sum + item.coord.latitude, 0) / members.length,
        longitude: members.reduce((sum, item) => sum + item.coord.longitude, 0) / members.length,
      };
    });
    points.forEach((point, index) => {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      centroids.forEach((centroid, clusterIndex) => {
        const distance = haversineKm(point.coord, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = clusterIndex;
        }
      });
      assignment[index] = best;
    });
  }

  const groups: T[][] = Array.from({ length: k }, () => []);
  points.forEach((point, index) => {
    groups[assignment[index]!]!.push(point);
  });
  return groups.filter((group) => group.length > 0);
}

function minutesToClock(total: number): string {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function visitBounds(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  if (/warung|rumah makan|\bresto\b|restaurant|\bkedai\b|\bcafe\b|\bkafe\b|coffee shop|kedai kopi|\bkuliner\b/.test(value)) {
    return { min: 45, preferred: 60, max: 75, stretchable: false };
  }
  if (/bromo|ijen|rinjani|komodo|padar|taman nasional/.test(value)) {
    return { min: 180, preferred: 240, max: 360, stretchable: true };
  }
  if (/museum|candi|pura|keraton|istana|borobudur|prambanan|uluwatu|tanah lot/.test(value)) {
    return { min: 75, preferred: 120, max: 180, stretchable: true };
  }
  if (/pantai|beach|taman|kebun|park|danau|air terjun|waterfall/.test(value)) {
    return { min: 75, preferred: 120, max: 180, stretchable: true };
  }
  if (/pasar|market|malioboro|braga/.test(value)) {
    return { min: 60, preferred: 90, max: 120, stretchable: true };
  }
  return { min: 60, preferred: 90, max: 150, stretchable: true };
}

function fillDayDurations(names: string[], startMinutes: number, travelMinutes: number[]) {
  const bounds = names.map((name) => visitBounds(name));
  const durations = bounds.map((item) => item.preferred);
  const dayEnd = () => {
    let cursor = startMinutes;
    durations.forEach((duration, index) => {
      cursor += Math.max(0, travelMinutes[index] ?? 0);
      cursor += duration;
    });
    return cursor;
  };
  const target = 20 * 60;
  const maxEnd = 21 * 60 + 15;
  const step = 15;
  while (dayEnd() > maxEnd) {
    let index = -1;
    for (let i = durations.length - 1; i >= 0; i -= 1) {
      if (durations[i]! > bounds[i]!.min) {
        index = i;
        break;
      }
    }
    if (index < 0) break;
    durations[index] = Math.max(bounds[index]!.min, durations[index]! - step);
  }
  while (dayEnd() < target) {
    let best = -1;
    let room = 0;
    durations.forEach((duration, index) => {
      const item = bounds[index]!;
      if (!item.stretchable) return;
      const leftover = item.max - duration;
      if (leftover > room) {
        room = leftover;
        best = index;
      }
    });
    if (best < 0 || room < step) break;
    durations[best] = durations[best]! + Math.min(step, room);
  }
  return durations;
}

export function packGeneratedSchedule(itinerary: GeminiItinerary): GeminiItinerary {
  const days = itinerary.days.map((day) => {
    const names = day.stops.map((stop) => stop.customTitle || stop.place?.name || "");
    const travelMinutes = day.stops.map((stop, index) => (
      index === 0 ? 0 : (stop.travelDurationMinutes ?? DEFAULT_TRANSFER_MINUTES)
    ));
    const durations = fillDayDurations(names, DAY_START_MINUTES, travelMinutes);
    let cursor = DAY_START_MINUTES;
    const stops = day.stops.map((stop, index) => {
      const travel = travelMinutes[index] ?? 0;
      cursor += travel;
      const startTime = minutesToClock(cursor);
      const durationMinutes = durations[index] ?? Math.max(30, stop.durationMinutes);
      cursor += durationMinutes;
      return {
        ...stop,
        sequence: index + 1,
        startTime,
        durationMinutes,
        travelDurationMinutes: index === 0 ? 0 : stop.travelDurationMinutes,
      };
    });
    return { ...day, stops };
  });
  return { ...itinerary, days };
}

function money(amount: number): string {
  return `${Math.max(0, Math.round(amount))}.00`;
}

export function refineGeneratedBudget(
  itinerary: GeminiItinerary,
  preferences?: Record<string, unknown> | null,
): GeminiItinerary {
  const daysCount = Math.max(1, itinerary.days.length);
  const nights = Math.max(0, daysCount - 1);
  const partySize = Math.max(1, Number(preferences?.partySize ?? preferences?.planningPartySize ?? 1) || 1);
  const cheaper = String(preferences?.regenerateMode ?? "") === "cheaper";
  const uniqueVisits = new Set<string>();
  let travelMeters = 0;
  let hops = 0;
  for (const day of itinerary.days) {
    day.stops.forEach((stop, index) => {
      const key = stop.place?.googlePlaceId ?? normalizePlaceName(stop.place?.name ?? stop.customTitle ?? "");
      if (key) uniqueVisits.add(key);
      if (index > 0) {
        hops += 1;
        travelMeters += stop.travelDistanceMeters ?? 0;
      }
    });
  }

  const km = travelMeters > 0 ? travelMeters / 1000 : hops * 4;
  const lodgingLow = cheaper ? 75000 : 95000;
  const lodgingHigh = cheaper ? 140000 : 180000;
  const foodLow = cheaper ? 40000 : 50000;
  const foodHigh = cheaper ? 70000 : 85000;
  const activityLow = cheaper ? 10000 : 15000;
  const activityHigh = cheaper ? 35000 : 50000;
  const perKmLow = cheaper ? 3500 : 4500;
  const perKmHigh = cheaper ? 6500 : 8000;
  const hopFloorLow = cheaper ? 12000 : 15000;
  const hopFloorHigh = cheaper ? 22000 : 30000;
  const localLow = Math.max(hops * hopFloorLow, Math.round(km * perKmLow));
  const localHigh = Math.max(hops * hopFloorHigh, Math.round(km * perKmHigh), localLow);

  const computed: BudgetItemInput[] = [];
  if (nights > 0) {
    computed.push({
      category: "LODGING",
      label: `Hostel/losmen ${nights} malam`,
      quantity: money(nights),
      unit: "malam",
      unitCostLow: money(lodgingLow),
      unitCostHigh: money(lodgingHigh),
      sourceType: "estimate",
      notes: "Estimasi backpacker per orang, bukan harga booking.",
    });
  }
  computed.push({
    category: "FOOD",
    label: `Makan warung ${daysCount} hari`,
    quantity: money(daysCount),
    unit: "hari",
    unitCostLow: money(foodLow),
    unitCostHigh: money(foodHigh),
    sourceType: "estimate",
    notes: "Sarapan + makan siang + makan malam hemat.",
  });
  computed.push({
    category: "TRANSPORT_LOCAL",
    label: hops ? `Ojek/angkot antar ${hops} titik` : "Transport lokal harian",
    quantity: money(Math.max(1, hops || daysCount)),
    unit: hops ? "trip" : "hari",
    unitCostLow: money(Math.round(localLow / Math.max(1, hops || daysCount))),
    unitCostHigh: money(Math.round(localHigh / Math.max(1, hops || daysCount))),
    sourceType: "estimate",
    sourceReference: travelMeters > 0 ? `${Math.round(km)} km Google Routes` : null,
    notes: travelMeters > 0
      ? `Dihitung dari jarak rute Google Maps (~${Math.round(km)} km).`
      : "Estimasi ojek/angkot antar titik dalam kota.",
  });
  const visitCount = Math.max(1, uniqueVisits.size);
  computed.push({
    category: "ACTIVITIES",
    label: `Tiket/donasi ${visitCount} destinasi`,
    quantity: money(visitCount),
    unit: "tempat",
    unitCostLow: money(activityLow),
    unitCostHigh: money(activityHigh),
    sourceType: "estimate",
    notes: "Rata-rata tiket museum/taman; destinasi gratis tetap dihitung konservatif.",
  });

  const kept = itinerary.budgetItems.filter((item) => item.category === "TRANSPORT_ROUNDTRIP" || item.category === "RESERVE");
  const items = partySize > 1
    ? [...kept, ...computed].map((item) =>
        item.category === "TRANSPORT_ROUNDTRIP" || item.category === "RESERVE"
          ? item
          : {
              ...item,
              notes: [item.notes, `Dasar per orang, x${partySize} peserta di trip.`].filter(Boolean).join(" "),
            },
      )
    : [...kept, ...computed];

  const assumptions = itinerary.assumptions.includes("Estimasi ongkos backpacker dari rute, bukan harga booking.")
    ? itinerary.assumptions
    : [...itinerary.assumptions, "Estimasi ongkos backpacker dari rute, bukan harga booking."];

  return { ...itinerary, budgetItems: items, assumptions };
}

export function uniqueVisitCount(days: Day[]): number {
  const seen: Array<{ googlePlaceId?: string | null; name?: string | null }> = [];
  for (const day of days) {
    for (const stop of day.stops) {
      const candidate = stop.place ?? { name: stop.customTitle };
      if (seen.some((item) => sameDestination(item, candidate))) continue;
      seen.push(candidate);
    }
  }
  return seen.length;
}
