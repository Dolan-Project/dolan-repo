export type GeoPoint = { lat: number; lng: number };

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(sine)));
}

export function travelMinutesBetween(a: GeoPoint, b: GeoPoint) {
  const km = haversineKm(a, b);
  return Math.min(480, Math.max(10, Math.round((km / 32) * 60)));
}

export function routeLengthKm<T extends GeoPoint>(stops: T[]) {
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    total += haversineKm(stops[index - 1]!, stops[index]!);
  }
  return total;
}

export function orderNearestNeighbor<T extends GeoPoint>(stops: T[], startIndex = 0) {
  if (stops.length <= 2) return [...stops];
  const remaining = stops.map((_, index) => index).filter((index) => index !== startIndex);
  const order = [startIndex];
  while (remaining.length) {
    const last = stops[order[order.length - 1]!]!;
    let bestPos = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((index, position) => {
      const distance = haversineKm(last, stops[index]!);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPos = position;
      }
    });
    order.push(remaining.splice(bestPos, 1)[0]!);
  }
  return order.map((index) => stops[index]!);
}

function twoOptKeepStart<T extends GeoPoint>(stops: T[]) {
  if (stops.length < 4) return [...stops];
  let best = [...stops];
  let improved = true;
  while (improved) {
    improved = false;
    const baseline = routeLengthKm(best);
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (routeLengthKm(candidate) + 0.05 < baseline) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute<T extends GeoPoint>(stops: T[], startIndex = 0) {
  if (stops.length <= 2) return [...stops];
  return twoOptKeepStart(orderNearestNeighbor(stops, startIndex));
}

export function farthestPairIndices<T extends GeoPoint>(stops: T[]): [number, number] {
  let bestA = 0;
  let bestB = Math.min(1, Math.max(0, stops.length - 1));
  let bestDistance = -1;
  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      const distance = haversineKm(stops[i]!, stops[j]!);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestA = i;
        bestB = j;
      }
    }
  }
  return [bestA, bestB];
}

/** Order along a corridor: start at the diameter end nearer the hub, then NN + 2-opt. */
export function orderStopsWithoutBacktrack<T extends GeoPoint>(stops: T[], hub?: GeoPoint) {
  if (stops.length <= 2) return [...stops];
  const [endA, endB] = farthestPairIndices(stops);
  const startIndex = hub
    ? haversineKm(stops[endA]!, hub) <= haversineKm(stops[endB]!, hub)
      ? endA
      : endB
    : endA;
  return optimizeRoute(stops, startIndex);
}

function farthestSeedIndices<T extends GeoPoint>(points: T[], clusterCount: number, hub?: GeoPoint) {
  const seeds: number[] = [];
  if (hub) {
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const distance = haversineKm(point, hub);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    seeds.push(closest);
  } else {
    let west = 0;
    points.forEach((point, index) => {
      if (point.lng < points[west]!.lng) west = index;
    });
    seeds.push(west);
  }
  while (seeds.length < clusterCount) {
    let next = -1;
    let nextScore = -1;
    points.forEach((point, index) => {
      if (seeds.includes(index)) return;
      const minDistance = Math.min(...seeds.map((seed) => haversineKm(point, points[seed]!)));
      if (minDistance > nextScore) {
        nextScore = minDistance;
        next = index;
      }
    });
    if (next < 0) break;
    seeds.push(next);
  }
  return seeds;
}

export function clusterByProximity<T extends GeoPoint>(points: T[], clusterCount: number, hub?: GeoPoint) {
  if (!points.length) return [];
  const k = Math.max(1, Math.min(clusterCount, points.length));
  if (k === 1) {
    return [orderStopsWithoutBacktrack(points, hub)];
  }

  const seedIndices = farthestSeedIndices(points, k, hub);
  const assignment = points.map((point) => {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    seedIndices.forEach((seed, clusterIndex) => {
      const distance = haversineKm(point, points[seed]!);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = clusterIndex;
      }
    });
    return best;
  });

  for (let iteration = 0; iteration < 10; iteration += 1) {
    const centroids = Array.from({ length: k }, (_, clusterIndex) => {
      const members = points.filter((_, index) => assignment[index] === clusterIndex);
      if (!members.length) return points[seedIndices[clusterIndex]!]!;
      return {
        lat: members.reduce((sum, point) => sum + point.lat, 0) / members.length,
        lng: members.reduce((sum, point) => sum + point.lng, 0) / members.length,
      };
    });
    points.forEach((point, index) => {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      centroids.forEach((centroid, clusterIndex) => {
        const distance = haversineKm(point, centroid);
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

export function orderClustersFromHub<T extends GeoPoint>(clusters: T[][], hub: GeoPoint) {
  const remaining = [...clusters];
  const ordered: T[][] = [];
  let cursor = hub;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((cluster, index) => {
      const distance = Math.min(...cluster.map((point) => haversineKm(cursor, point)));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const next = remaining.splice(bestIndex, 1)[0]!;
    const optimized = orderStopsWithoutBacktrack(next, cursor);
    ordered.push(optimized);
    cursor = optimized[optimized.length - 1]!;
  }
  return ordered;
}

export function planEfficientDays<T extends GeoPoint>(stops: T[], dayCount: number, hub?: GeoPoint) {
  if (!stops.length) return [];
  const k = Math.max(1, Math.min(dayCount, stops.length));
  const clusters = clusterByProximity(stops, k, hub);
  return orderClustersFromHub(clusters, hub ?? stops[0]!);
}

function nameKey<T extends { name?: string }>(stop: T) {
  return (stop.name ?? "").trim().toLocaleLowerCase("id-ID");
}

export function selectCompactStops<T extends GeoPoint & { name?: string }>(
  candidates: T[],
  dayCount: number,
  hub: GeoPoint,
  options?: {
    excludeNames?: string[];
    maxPerDay?: number;
    maxRadiusKm?: number;
    variant?: number;
  },
) {
  const exclude = new Set((options?.excludeNames ?? []).map((name) => name.trim().toLocaleLowerCase("id-ID")).filter(Boolean));
  const unique: T[] = [];
  const seen = new Set<string>();
  candidates.forEach((candidate) => {
    const key = nameKey(candidate) || `${candidate.lat}:${candidate.lng}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(candidate);
  });
  let pool = unique.filter((item) => !exclude.has(nameKey(item)));
  if (pool.length < Math.min(2, unique.length)) pool = unique;
  const daysTotal = Math.max(1, Math.min(dayCount, pool.length));
  const maxPerDay = Math.max(1, options?.maxPerDay ?? 2);
  const maxRadiusKm = options?.maxRadiusKm ?? 80;
  const variant = Math.max(0, options?.variant ?? 0);
  const ranked = [...pool].sort((left, right) => haversineKm(left, hub) - haversineKm(right, hub));
  const skip = Math.min(variant, Math.max(0, ranked.length - daysTotal));
  const startPool = ranked.slice(skip);
  const used = new Set<number>();
  const groups: T[][] = [];

  for (let dayIndex = 0; dayIndex < daysTotal; dayIndex += 1) {
    const dayHub = groups.at(-1)?.at(-1) ?? hub;
    const day: T[] = [];
    for (let slot = 0; slot < maxPerDay; slot += 1) {
      let best = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      startPool.forEach((point, index) => {
        if (used.has(index)) return;
        const origin = day[0] ?? dayHub;
        const distance = haversineKm(origin, point);
        const fromHub = haversineKm(hub, point);
        if (slot > 0 && (distance > maxRadiusKm || fromHub > maxRadiusKm * 1.5)) return;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      if (best < 0) break;
      used.add(best);
      day.push(startPool[best]!);
    }
    if (day.length) {
      groups.push(orderStopsWithoutBacktrack(day, dayHub));
    }
  }
  return orderClustersFromHub(groups, hub);
}

