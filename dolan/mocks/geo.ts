export type GeoPlace = {
  id: string;
  label: string;
  city: string;
  latitude: number;
  longitude: number;
};

export const GEO_PLACES: GeoPlace[] = [
  {
    id: "jakarta",
    label: "Jakarta",
    city: "Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
  },
  {
    id: "cgk",
    label: "Bandara Soekarno-Hatta (CGK), Jakarta",
    city: "Jakarta",
    latitude: -6.1256,
    longitude: 106.6559,
  },
  {
    id: "tugu",
    label: "Stasiun Tugu",
    city: "Yogyakarta",
    latitude: -7.7891,
    longitude: 110.3636,
  },
  {
    id: "malioboro",
    label: "Titik Nol Kilometer Yogyakarta",
    city: "Yogyakarta",
    latitude: -7.8014,
    longitude: 110.3648,
  },
  {
    id: "sembalun",
    label: "Sembalun Lawang",
    city: "Lombok",
    latitude: -8.3625,
    longitude: 116.533,
  },
  {
    id: "kartini",
    label: "Pelabuhan Kartini Jepara",
    city: "Karimunjawa",
    latitude: -6.592,
    longitude: 110.662,
  },
  {
    id: "cemoro",
    label: "Cemoro Lawang",
    city: "Bromo",
    latitude: -7.942,
    longitude: 112.953,
  },
  {
    id: "wonosobo",
    label: "Alun-alun Wonosobo",
    city: "Dieng",
    latitude: -7.36,
    longitude: 109.9,
  },
  {
    id: "lbj",
    label: "Bandara Komodo (LBJ)",
    city: "Labuan Bajo",
    latitude: -8.4866,
    longitude: 119.8893,
  },
  {
    id: "bajo-harbor",
    label: "Pelabuhan Labuan Bajo",
    city: "Labuan Bajo",
    latitude: -8.496,
    longitude: 119.875,
  },
];

const CITY_POINTS: Record<string, { latitude: number; longitude: number }> = {
  Jakarta: { latitude: -6.2088, longitude: 106.8456 },
  Yogyakarta: { latitude: -7.7956, longitude: 110.3695 },
  Lombok: { latitude: -8.565, longitude: 116.351 },
  Karimunjawa: { latitude: -5.746, longitude: 110.491 },
  Bromo: { latitude: -7.942, longitude: 112.953 },
  Dieng: { latitude: -7.207, longitude: 109.912 },
  "Labuan Bajo": { latitude: -8.4539, longitude: 119.8694 },
};

const ID_BOUNDS = {
  west: 95,
  east: 141,
  south: -11,
  north: 6,
};

export const INDONESIA_TILES = {
  z: 5,
  minX: 24,
  maxX: 28,
  minY: 14,
  maxY: 18,
} as const;


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function searchGeoPlaces(
  query: string,
  options?: { excludeLabel?: string },
): GeoPlace[] {
  const needle = query.trim().toLowerCase();
  const excluded = options?.excludeLabel?.trim().toLowerCase();
  const pool = GEO_PLACES.filter(
    (place) => !excluded || place.label.toLowerCase() !== excluded,
  );
  if (!needle) return pool.slice(0, 8);
  return pool.filter(
    (place) =>
      place.label.toLowerCase().includes(needle) ||
      place.city.toLowerCase().includes(needle),
  );
}

export function resolveGeoPlace(label: string | null | undefined): GeoPlace | undefined {
  const needle = label?.trim().toLowerCase();
  if (!needle) return undefined;
  return GEO_PLACES.find((place) => place.label.toLowerCase() === needle);
}

export function resolveCityPoint(
  city: string | null | undefined,
): { latitude: number; longitude: number } | null {
  const name = city?.trim();
  if (!name) return null;
  if (CITY_POINTS[name]) return CITY_POINTS[name];
  const match = Object.entries(CITY_POINTS).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? match[1] : null;
}

export function projectToPercent(
  latitude: number,
  longitude: number,
): { left: number; top: number } {
  const left =
    ((longitude - ID_BOUNDS.west) / (ID_BOUNDS.east - ID_BOUNDS.west)) * 100;
  const top =
    ((ID_BOUNDS.north - latitude) / (ID_BOUNDS.north - ID_BOUNDS.south)) * 100;
  return { left: clamp(left, 2, 98), top: clamp(top, 2, 98) };
}

export function projectOnIndonesiaTiles(
  latitude: number,
  longitude: number,
): { left: number; top: number } {
  const { z, minX, maxX, minY, maxY } = INDONESIA_TILES;
  const n = 2 ** z;
  const x = ((longitude + 180) / 360) * n;
  const latRad = (latitude * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const left = ((x - minX) / (maxX - minX + 1)) * 100;
  const top = ((y - minY) / (maxY - minY + 1)) * 100;
  return { left: clamp(left, 2, 98), top: clamp(top, 2, 98) };
}

export function meetingPointFor(
  label: string | null | undefined,
  city: string | null | undefined,
): { latitude: number; longitude: number } | null {
  const place = resolveGeoPlace(label);
  if (place) return { latitude: place.latitude, longitude: place.longitude };
  return resolveCityPoint(city);
}
