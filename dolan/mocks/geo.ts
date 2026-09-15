import { INDONESIA_PROVINCES } from "@/lib/provinces";
import { CITY_ROUTES } from "@/lib/destination-itinerary";
import { resolvePlaceCoordinates } from "@/lib/place-coordinates";
import { PROVINCE_CENTERS } from "@/lib/template-itinerary";

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
    city: "Probolinggo",
    latitude: -7.9206,
    longitude: 112.9644,
  },
  {
    id: "bromo",
    label: "Gunung Bromo",
    city: "Probolinggo",
    latitude: -7.9425,
    longitude: 112.953,
  },
  {
    id: "ijen",
    label: "Kawah Ijen",
    city: "Banyuwangi",
    latitude: -8.058,
    longitude: 114.242,
  },
  {
    id: "wonosobo",
    label: "Alun-alun Wonosobo",
    city: "Dieng",
    latitude: -7.36,
    longitude: 109.9,
  },
  {
    id: "bandung",
    label: "Bandung",
    city: "Bandung",
    latitude: -6.9175,
    longitude: 107.6191,
  },
  {
    id: "gedung-sate",
    label: "Gedung Sate, Bandung",
    city: "Bandung",
    latitude: -6.9025,
    longitude: 107.6187,
  },
  {
    id: "braga",
    label: "Jalan Braga, Bandung",
    city: "Bandung",
    latitude: -6.9174,
    longitude: 107.609,
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
  Probolinggo: { latitude: -7.7543, longitude: 113.2159 },
  Bromo: { latitude: -7.9425, longitude: 112.953 },
  Dieng: { latitude: -7.207, longitude: 109.912 },
  "Labuan Bajo": { latitude: -8.4539, longitude: 119.8694 },
  Bandung: { latitude: -6.9175, longitude: 107.6191 },
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

function destinationCatalog(): GeoPlace[] {
  const extras: GeoPlace[] = [];
  const seen = new Set(GEO_PLACES.map((place) => place.label.toLocaleLowerCase("id-ID")));
  const push = (place: GeoPlace) => {
    const key = place.label.toLocaleLowerCase("id-ID");
    if (!key || seen.has(key)) return;
    seen.add(key);
    extras.push(place);
  };
  INDONESIA_PROVINCES.forEach((province) => {
    const center = PROVINCE_CENTERS[province.name] ?? { lat: -2.5, lng: 118 };
    push({
      id: `prov-${province.slug}`,
      label: province.name,
      city: province.capital,
      latitude: center.lat,
      longitude: center.lng,
    });
    push({
      id: `cap-${province.slug}`,
      label: province.capital,
      city: province.capital,
      latitude: center.lat,
      longitude: center.lng,
    });
    province.places.forEach((place) => {
      const coords = resolvePlaceCoordinates(place.name, place.city) ?? center;
      push({
        id: `place-${province.slug}-${place.rank}`,
        label: place.name,
        city: place.city,
        latitude: coords.lat,
        longitude: coords.lng,
      });
    });
  });
  CITY_ROUTES.forEach((route) => {
    const aliases: Record<string, string> = {
      dki: "Jakarta",
      bromo: "Probolinggo",
      cemoro: "Probolinggo",
      tengger: "Probolinggo",
      jogja: "Yogyakarta",
      dieng: "Wonosobo",
      rinjani: "Lombok",
    };
    const city = aliases[route.match[0]] ?? route.match[0].replace(/\b\w/g, (letter) => letter.toUpperCase());
    route.stops.forEach((stop, index) => {
      push({
        id: `route-${route.match[0]}-${index}`,
        label: stop.name,
        city,
        latitude: stop.lat,
        longitude: stop.lng,
      });
    });
  });
  return [...GEO_PLACES, ...extras];
}

export function searchGeoPlaces(
  query: string,
  options?: { excludeLabel?: string; nearbyCity?: string },
): GeoPlace[] {
  const needle = query.trim().toLowerCase();
  const excluded = options?.excludeLabel?.trim().toLowerCase();
  const nearby = options?.nearbyCity?.trim().toLowerCase();
  const nearbyScore = (place: GeoPlace) => {
    if (!nearby) return 0;
    const city = place.city.toLowerCase();
    const label = place.label.toLowerCase();
    if (city === nearby || label === nearby) return 0;
    if (city.includes(nearby) || label.includes(nearby)) return 1;
    return 4;
  };
  const pool = destinationCatalog().filter(
    (place) => !excluded || place.label.toLowerCase() !== excluded,
  );
  if (!needle) {
    return [...pool].sort((a, b) => nearbyScore(a) - nearbyScore(b) || a.label.length - b.label.length).slice(0, 8);
  }
  const airportQuery = needle.includes("bandara") || needle.includes("airport");
  return pool
    .map((place) => {
      const label = place.label.toLowerCase();
      const city = place.city.toLowerCase();
      const labelWords = label.split(/[^a-z0-9]+/).filter(Boolean);
      const cityWords = city.split(/[^a-z0-9]+/).filter(Boolean);
      let score = -1;
      if (label === needle) score = 0;
      else if (label.startsWith(needle)) score = 1;
      else if (city === needle || city.startsWith(needle)) score = 2;
      else if (labelWords.some((word) => word === needle) || cityWords.some((word) => word === needle)) score = 3;
      else if (labelWords.some((word) => word.startsWith(needle)) || cityWords.some((word) => word.startsWith(needle))) score = 4;
      else if (needle.length >= 2 && (label.includes(needle) || city.includes(needle))) score = 5;
      if (score < 0) return null;
      if (!airportQuery && label.startsWith("bandara")) score += 8;
      score += nearbyScore(place);
      return { place, score };
    })
    .filter((row): row is { place: GeoPlace; score: number } => row !== null)
    .sort((a, b) => a.score - b.score || a.place.label.length - b.place.label.length)
    .map((row) => row.place);
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
