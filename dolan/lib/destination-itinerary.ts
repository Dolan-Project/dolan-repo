import type { EditableItineraryDay } from "@dolan/shared";
import { INDONESIA_PROVINCES, type CuratedProvince } from "@/lib/provinces";
import { resolvePlaceCoordinates } from "@/lib/place-coordinates";
import { haversineKm, orderStopsWithoutBacktrack, planEfficientDays, selectCompactStops } from "@/lib/route-optimize";
import { addDaysToIso, packItinerarySchedule, placeFromTemplateStop, PROVINCE_CENTERS } from "@/lib/template-itinerary";
import { administrativeRegionHub, isAdministrativeRegionName } from "@/lib/region-names";
import { ASSETS } from "@/lib/assets";

export type DestinationStopSeed = {
  name: string;
  lat: number;
  lng: number;
  notes?: string;
};

export const CITY_ROUTES: Array<{ match: string[]; stops: DestinationStopSeed[] }> = [
  {
    match: ["medan", "sumatera utara", "sumut"],
    stops: [
      { name: "Istana Maimun", lat: 3.5752, lng: 98.6837, notes: "Istana kesultanan di pusat Medan." },
      { name: "Masjid Raya Al Mashun", lat: 3.5751, lng: 98.6872, notes: "Masjid agung dekat Istana Maimun, jalan kaki." },
      { name: "Museum Tjong A Fie Mansion", lat: 3.5864, lng: 98.6789, notes: "Rumah sejarah di kawasan Kesawan." },
      { name: "Kesawan / Merdeka Walk", lat: 3.5895, lng: 98.6735, notes: "Koridor kuliner dan foto di pusat kota." },
      { name: "Gedung Juang 45 Medan", lat: 3.5878, lng: 98.6781, notes: "Landmark kolonial dekat Kesawan." },
      { name: "Pasar Petisah", lat: 3.5955, lng: 98.6698, notes: "Pasar lokal untuk oleh-oleh dan makan siang." },
      { name: "Graha Maria Annai Velangkanni", lat: 3.5676, lng: 98.6195, notes: "Gereja ikonik di Medan, satu koridor barat kota." },
      { name: "Kuil Shri Mariamman Medan", lat: 3.5837, lng: 98.6816, notes: "Kuil Hindu di pusat kota, dekat Kesawan." },
      { name: "Taman Ahmad Yani Medan", lat: 3.5848, lng: 98.6712, notes: "Taman kota untuk istirahat siang." },
    ],
  },
  {
    match: ["yogyakarta", "jogja"],
    stops: [
      { name: "Tugu Yogyakarta", lat: -7.7829, lng: 110.3671, notes: "Titik foto ikon kota sebelum lanjut ke selatan." },
      { name: "Jalan Malioboro", lat: -7.7926, lng: 110.3658, notes: "Jalan kaki, belanja, dan kuliner sepanjang Malioboro." },
      { name: "Keraton Yogyakarta", lat: -7.8053, lng: 110.3642, notes: "Kawasan keraton dan alun-alun utara." },
      { name: "Taman Sari", lat: -7.81, lng: 110.3594, notes: "Jalan kaki dari keraton, cek jam kunjungan." },
      { name: "Alun-Alun Kidul", lat: -7.8117, lng: 110.3635, notes: "Sore hari ramai. Naik odong-odong atau jalan kaki." },
      { name: "Pasar Beringharjo", lat: -7.7989, lng: 110.3653, notes: "Belanja batik dan camilan di koridor Malioboro." },
      { name: "Titik Nol Kilometer Yogyakarta", lat: -7.8014, lng: 110.3648, notes: "Titik foto ikonik, masuk kawasan gratis." },
      { name: "Taman Pintar Yogyakarta", lat: -7.8004, lng: 110.3677, notes: "Wahana edukasi berbayar di pusat kota." },
      { name: "Museum Sonobudoyo", lat: -7.8024, lng: 110.364, notes: "Museum budaya di sisi alun-alun utara. Tiket masuk berbayar." },
    ],
  },
  {
    match: ["bandung"],
    stops: [
      { name: "Tebing Keraton", lat: -6.8352, lng: 107.663, notes: "Sore di Dago. Kabut sering turun menjelang maghrib." },
      { name: "Cihampelas Walk", lat: -6.8956, lng: 107.6046, notes: "Factory outlet dan kuliner di koridor Cihampelas." },
      { name: "Gedung Sate", lat: -6.9025, lng: 107.6187, notes: "Titik kumpul yang mudah dikenali di pusat kota." },
      { name: "Museum Geologi Bandung", lat: -6.9007, lng: 107.6191, notes: "Dekat Gedung Sate, cocok dilanjut jalan kaki." },
      { name: "Jalan Braga", lat: -6.9174, lng: 107.609, notes: "Jalan kaki, kuliner, dan foto kawasan Braga." },
      { name: "Jalan Asia Afrika", lat: -6.9212, lng: 107.6097, notes: "Museum KAA dan alun-alun dalam satu koridor." },
      { name: "Alun-Alun Bandung", lat: -6.9218, lng: 107.6071, notes: "Istirahat siang, kuliner, dan Masjid Raya." },
      { name: "Saung Angklung Udjo", lat: -6.8978, lng: 107.6553, notes: "Pertunjukan angklung sore, tiket masuk berbayar." },
      { name: "Taman Lansia Bandung", lat: -6.8989, lng: 107.6276, notes: "Istirahat singkat di taman kota, masuk gratis." },
      { name: "Cihampelas Skywalk", lat: -6.8938, lng: 107.6042, notes: "Jalan kaki di jembatan Cihampelas." },
      { name: "Museum Konferensi Asia Afrika", lat: -6.9214, lng: 107.6095, notes: "Museum di Gedung Merdeka, tiket masuk berbayar." },
    ],
  },
  {
    match: ["bogor"],
    stops: [
      { name: "Kebun Raya Bogor", lat: -6.5971, lng: 106.799, notes: "Masuk pagi, sisihkan 2 jam untuk jalan di kebun raya." },
      { name: "Istana Bogor", lat: -6.598, lng: 106.7994, notes: "Sisi kebun raya. Cek jadwal area yang buka untuk publik." },
      { name: "Taman Kencana Bogor", lat: -6.5938, lng: 106.7965, notes: "Jalan kaki dari kebun raya, cocok untuk makan siang." },
      { name: "Jalan Suryakencana", lat: -6.6035, lng: 106.7998, notes: "Chinatown Bogor, kuliner sore." },
    ],
  },
  {
    match: ["jakarta", "dki"],
    stops: [
      { name: "Ancol", lat: -6.1256, lng: 106.8333, notes: "Pagi di kawasan pantai Ancol sebelum lanjut ke selatan." },
      { name: "Kota Tua Jakarta", lat: -6.1352, lng: 106.8133, notes: "Jalan kaki di Fatahillah. Museum di dalam kawasan berbayar terpisah." },
      { name: "Monumen Nasional", lat: -6.1754, lng: 106.8272, notes: "Plaza Monas gratis. Naik ke puncak opsional dan berbayar." },
      { name: "Bundaran HI", lat: -6.1944, lng: 106.8229, notes: "Titik foto dan kuliner di pusat kota. Masuk kawasan gratis." },
      { name: "Museum Nasional Indonesia", lat: -6.176, lng: 106.8222, notes: "Museum Gajah. Tiket masuk berbayar." },
      { name: "Taman Suropati", lat: -6.1994, lng: 106.8328, notes: "Taman Menteng, masuk gratis." },
      { name: "Plaza Indonesia", lat: -6.1931, lng: 106.8227, notes: "Istirahat dan kuliner di Thamrin." },
      { name: "Glodok Chinatown", lat: -6.142, lng: 106.8137, notes: "Kuliner dan foto di pecinan, dekat Kota Tua." },
      { name: "Pasar Baru", lat: -6.1664, lng: 106.8336, notes: "Koridor belanja lama Jakarta Pusat." },
    ],
  },
  {
    match: ["dieng", "wonosobo"],
    stops: [
      { name: "Kawah Sikidang", lat: -7.2201, lng: 109.9054 },
      { name: "Candi Arjuna", lat: -7.2058, lng: 109.9074 },
      { name: "Bukit Sikunir", lat: -7.2351, lng: 109.9242 },
    ],
  },
  {
    match: ["lombok", "rinjani"],
    stops: [
      { name: "Desa Sembalun", lat: -8.3614, lng: 116.5306 },
      { name: "Plawangan Sembalun", lat: -8.3831, lng: 116.4512 },
      { name: "Danau Segara Anak", lat: -8.4075, lng: 116.4161 },
    ],
  },
  {
    match: ["bromo", "cemoro", "tengger", "probolinggo"],
    stops: [
      { name: "Penanjakan Bromo", lat: -7.9083, lng: 112.9468, notes: "Sunrise di penanjakan. Siapkan jaket dan jeep." },
      { name: "Gunung Bromo", lat: -7.9425, lng: 112.953, notes: "Jalan di lautan pasir menuju kawah. Tiket kawasan + jeep." },
      { name: "Madakaripura", lat: -7.8538, lng: 113.0064, notes: "Air terjun dekat Bromo, satu koridor jalan." },
    ],
  },
  {
    match: ["komodo", "labuan bajo"],
    stops: [
      { name: "Pulau Padar", lat: -8.6486, lng: 119.5892 },
      { name: "Pink Beach", lat: -8.6031, lng: 119.5196 },
      { name: "Manta Point", lat: -8.5374, lng: 119.6161 },
    ],
  },
  {
    match: ["karimunjawa", "karimun jawa", "jepara"],
    stops: [
      { name: "Pelabuhan Karimunjawa", lat: -5.8841, lng: 110.4419 },
      { name: "Pantai Tanjung Gelam", lat: -5.8388, lng: 110.3978 },
      { name: "Bukit Love", lat: -5.8703, lng: 110.4344 },
    ],
  },
  {
    match: ["bali", "ubud", "canggu", "seminyak", "kuta", "sanur", "denpasar"],
    stops: [
      { name: "Pura Tanah Lot", lat: -8.6212, lng: 115.0868, notes: "Sunset di pura laut sisi barat." },
      { name: "Tegallalang Rice Terrace", lat: -8.4312, lng: 115.2792, notes: "Terasering di koridor Ubud." },
      { name: "Ubud Palace", lat: -8.5069, lng: 115.2625, notes: "Titik pusat Ubud sebelum lanjut ke pasar." },
      { name: "Tirta Empul", lat: -8.4154, lng: 115.3153, notes: "Pura tirta di Tampaksiring, satu koridor Ubud." },
      { name: "Pantai Sanur", lat: -8.6905, lng: 115.2633, notes: "Pantai timur, cocok pagi atau sore." },
      { name: "Pantai Kuta", lat: -8.7183, lng: 115.1686, notes: "Koridor selatan dekat bandara." },
      { name: "Garuda Wisnu Kencana", lat: -8.8104, lng: 115.1676, notes: "Taman budaya di bukit Jimbaran." },
      { name: "Pura Uluwatu", lat: -8.8291, lng: 115.0849, notes: "Bukit selatan — ideal di hari terpisah dari Tanah Lot." },
      { name: "Tegenungan Waterfall", lat: -8.5754, lng: 115.2889, notes: "Air terjun dekat Ubud, tiket kawasan berbayar." },
    ],
  },
  {
    match: ["cirebon", "kasepuhan", "sunyaragi", "trusmi"],
    stops: [
      { name: "Keraton Kasepuhan", lat: -6.7265, lng: 108.571, notes: "Keraton tertua Cirebon, tiket masuk berbayar." },
      { name: "Keraton Kanoman", lat: -6.7236, lng: 108.5664, notes: "Keraton di pusat kota, dekat pasar Kanoman." },
      { name: "Masjid Agung Sang Cipta Rasa", lat: -6.7262, lng: 108.5704, notes: "Masjid keraton, masuk kawasan gratis." },
      { name: "Goa Sunyaragi", lat: -6.7364, lng: 108.542, notes: "Taman gua batu kapur, tiket masuk berbayar." },
      { name: "Taman Ade Irma Suryani", lat: -6.7284, lng: 108.5572, notes: "Taman kota untuk istirahat, masuk gratis." },
      { name: "Batik Trusmi", lat: -6.7054, lng: 108.5278, notes: "Kampung batik di barat kota." },
      { name: "Pantai Kejawanan", lat: -6.7374, lng: 108.5822, notes: "Pantai dan kuliner laut di timur kota." },
    ],
  },
  {
    match: ["malang", "batu"],
    stops: [
      { name: "Jodipan", lat: -7.9835, lng: 112.637, notes: "Kampung warna di dalam kota Malang." },
      { name: "Alun-Alun Malang", lat: -7.9826, lng: 112.6308, notes: "Titik kumpul pusat kota." },
      { name: "Museum Angkut", lat: -7.8797, lng: 112.5203, notes: "Batu, satu koridor dengan alun-alun Batu." },
      { name: "Alun-Alun Batu", lat: -7.8711, lng: 112.5267, notes: "Sore di Batu sebelum kembali ke Malang." },
      { name: "Coban Rondo", lat: -7.8846, lng: 112.4773, notes: "Air terjun di sisi barat Batu." },
    ],
  },
  {
    match: ["semarang"],
    stops: [
      { name: "Lawang Sewu", lat: -6.984, lng: 110.4108, notes: "Landmark kolonial dekat stasiun." },
      { name: "Sam Poo Kong", lat: -6.9995, lng: 110.398, notes: "Kelenteng di koridor barat kota." },
      { name: "Kota Lama Semarang", lat: -6.9683, lng: 110.4281, notes: "Jalan kaki di kawasan bersejarah." },
      { name: "Simpang Lima Semarang", lat: -6.9903, lng: 110.4229, notes: "Alun-alun modern pusat kota." },
    ],
  },
  {
    match: ["surabaya"],
    stops: [
      { name: "Tugu Pahlawan", lat: -7.2458, lng: 112.7378, notes: "Monumen pusat Surabaya." },
      { name: "House of Sampoerna", lat: -7.2307, lng: 112.7342, notes: "Museum di kawasan utara kota." },
      { name: "Jembatan Merah", lat: -7.2356, lng: 112.7365, notes: "Koridor kota lama." },
      { name: "Tunjungan Plaza", lat: -7.2622, lng: 112.7393, notes: "Titik kuliner dan istirahat di pusat." },
    ],
  },
];

export function findProvinceForDestination(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  if (!value) return undefined;
  const exact = INDONESIA_PROVINCES.find((province) => {
    const name = province.name.toLocaleLowerCase("id-ID");
    const capital = province.capital.toLocaleLowerCase("id-ID");
    return province.slug === value || name === value || capital === value;
  });
  if (exact) return exact;
  const byPlaceName = INDONESIA_PROVINCES.find((province) =>
    province.places.some((place) => {
      const placeName = place.name.toLocaleLowerCase("id-ID");
      return placeName === value || (value.length >= 4 && (placeName.includes(value) || value.includes(placeName)));
    }),
  );
  if (byPlaceName) return byPlaceName;
  const byCity = INDONESIA_PROVINCES.find((province) =>
    province.places.some((place) => place.city.toLocaleLowerCase("id-ID") === value),
  );
  if (byCity) return byCity;
  if (value.length < 4) return undefined;
  return INDONESIA_PROVINCES.find((province) => {
    const name = province.name.toLocaleLowerCase("id-ID");
    const capital = province.capital.toLocaleLowerCase("id-ID");
    return (
      name.includes(value) ||
      capital.includes(value) ||
      (value.includes(name) && name.length >= 5) ||
      (value.includes(capital) && capital.length >= 5)
    );
  });
}

export function isProvinceDestination(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  if (!value) return false;
  return INDONESIA_PROVINCES.some((province) => {
    const name = province.name.toLocaleLowerCase("id-ID");
    return province.slug === value || name === value;
  });
}

export function templateMatchesDestination(templateCity: string, destination: string) {
  const city = templateCity.trim().toLocaleLowerCase("id-ID");
  const dest = destination.trim().toLocaleLowerCase("id-ID");
  if (!city || !dest) return false;
  if (city === dest) return true;
  const destProvince = findProvinceForDestination(destination);
  const templateProvince = findProvinceForDestination(templateCity);
  if (destProvince && templateProvince) return destProvince.slug === templateProvince.slug;
  return dest.includes(city) || city.includes(dest);
}

function seedCoords(name: string, city: string) {
  const known = resolvePlaceCoordinates(name, city);
  if (known) return known;
  const summary = placeFromTemplateStop(name, city);
  return { lat: summary.latitude, lng: summary.longitude };
}

function routeHub(destination: string) {
  const value = destination.trim();
  const named = resolvePlaceCoordinates(value, value);
  if (named) return named;
  const province = findProvinceForDestination(value);
  if (province) {
    const capital = resolvePlaceCoordinates(province.capital, province.name) ?? PROVINCE_CENTERS[province.name];
    if (capital) return capital;
  }
  const fallback = placeFromTemplateStop(value || "Indonesia", value || "Indonesia");
  return { lat: fallback.latitude, lng: fallback.longitude };
}

function matchCityRoute(destination: string) {
  const value = destination.trim().toLocaleLowerCase("id-ID");
  if (!value) return undefined;
  // Prefer exact / contained city keywords only — never match by unrelated stop names
  // (that wrongly pulls Bandung/Cihampelas into a Medan trip).
  const exact = CITY_ROUTES.find((route) => route.match.some((item) => value === item));
  if (exact) return exact;
  return CITY_ROUTES.find((route) =>
    route.match.some((item) => item.length >= 4 && (value.includes(item) || item.includes(value))),
  );
}

function cityRouteStops(destination: string): DestinationStopSeed[] {
  const known = matchCityRoute(destination);
  if (!known) return [];
  return known.stops.map((stop) => {
    const coords = resolvePlaceCoordinates(stop.name, destination) ?? { lat: stop.lat, lng: stop.lng };
    return { ...stop, lat: coords.lat, lng: coords.lng };
  });
}

function provinceRouteStops(destination: string): DestinationStopSeed[] {
  const province = findProvinceForDestination(destination);
  if (!province) return [];
  return province.places.map((place) => {
    const coords = seedCoords(place.name, province.name);
    return {
      name: place.name,
      lat: coords.lat,
      lng: coords.lng,
      notes: place.description,
    };
  });
}

function nearbyProvinceStops(destination: string, hub: { lat: number; lng: number }, limit = 8): DestinationStopSeed[] {
  const province = findProvinceForDestination(destination);
  if (!province) return [];
  return province.places
    .map((place) => {
      const coords = seedCoords(place.name, province.name);
      return {
        name: place.name,
        lat: coords.lat,
        lng: coords.lng,
        notes: place.description,
        distance: haversineKm(hub, coords),
      };
    })
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map(({ name, lat, lng, notes }) => ({ name, lat, lng, notes }));
}

function nearbyCityRouteStops(destination: string): DestinationStopSeed[] {
  const hub = administrativeRegionHub(destination) ?? routeHub(destination);
  const nearby: DestinationStopSeed[] = [];
  const seen = new Set<string>();
  CITY_ROUTES.forEach((route) => {
    route.stops.forEach((stop) => {
      const key = stop.name.trim().toLocaleLowerCase("id-ID");
      if (!key || seen.has(key)) return;
      if (haversineKm(hub, stop) > 140) return;
      seen.add(key);
      nearby.push(stop);
    });
  });
  return nearby;
}

export function destinationStopSeeds(destination: string): DestinationStopSeed[] {
  const rejectRegionName = (stops: DestinationStopSeed[]) =>
    stops.filter((stop) => !isAdministrativeRegionName(stop.name));
  if (isProvinceDestination(destination) || isAdministrativeRegionName(destination)) {
    const provinceStops = rejectRegionName(provinceRouteStops(destination));
    if (provinceStops.length) return provinceStops;
    const nearbyCities = rejectRegionName(nearbyCityRouteStops(destination));
    if (nearbyCities.length) return nearbyCities;
  }
  const cityStops = rejectRegionName(cityRouteStops(destination));
  if (cityStops.length) return cityStops;
  const hub = routeHub(destination);
  const nearby = rejectRegionName(nearbyProvinceStops(destination, hub, 6));
  if (nearby.length >= 2) return nearby;
  if (isAdministrativeRegionName(destination)) {
    const aroundHub = rejectRegionName(nearbyCityRouteStops(destination));
    if (aroundHub.length) return aroundHub;
  }
  const named = resolvePlaceCoordinates(destination, destination);
  if (named && !isAdministrativeRegionName(destination)) {
    const aroundNamed = rejectRegionName(nearbyProvinceStops(destination, named, 6));
    if (aroundNamed.length >= 2) return aroundNamed;
    return [{ name: destination.trim(), lat: named.lat, lng: named.lng, notes: `Kunjungan ke ${destination.trim()}.` }];
  }
  const fallbackStops = rejectRegionName(nearbyCityRouteStops(destination));
  if (fallbackStops.length) return fallbackStops;
  const fallback = seedCoords(destination.trim() || "Indonesia", destination.trim() || "Indonesia");
  if (isAdministrativeRegionName(destination.trim())) {
    return [];
  }
  return [{ name: destination.trim() || "Destinasi", lat: fallback.lat, lng: fallback.lng, notes: "Rute awal. Sesuaikan titik di peta." }];
}

function dayCount(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return 1;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function travelBetweenSeeds(previous: DestinationStopSeed | undefined, _stop: DestinationStopSeed, stopIndex: number) {
  if (stopIndex === 0 || !previous) return 0;
  return null;
}

function daysFromSeedClusters(
  clusters: DestinationStopSeed[][],
  input: { destination: string; startDate: string; idPrefix: string; titleFor: (dayIndex: number) => string },
) {
  return clusters.map((chunk, dayIndex) => ({
    id: `${input.idPrefix}-day-${dayIndex + 1}`,
    dayNumber: dayIndex + 1,
    date: input.startDate ? addDaysToIso(input.startDate, dayIndex) : `2026-10-${String(24 + dayIndex).padStart(2, "0")}`,
    title: input.titleFor(dayIndex),
    stops: chunk.map((stop, stopIndex) => {
      const place = placeFromTemplateStop(stop.name, input.destination);
      const previous = chunk[stopIndex - 1];
      return {
        id: `${input.idPrefix}-day-${dayIndex + 1}-stop-${stopIndex + 1}`,
        sequence: stopIndex + 1,
        place: { ...place, latitude: stop.lat, longitude: stop.lng, city: input.destination, formattedAddress: `${stop.name}, ${input.destination}` },
        customTitle: stop.name,
        activityType: stopIndex === 0 && dayIndex === 0 ? "Titik kumpul" : "Wisata",
        startTime: "08:00",
        durationMinutes: 60,
        travelDurationMinutes: travelBetweenSeeds(previous, stop, stopIndex),
        notes: stop.notes ?? `Kunjungan ke ${stop.name}. Ideal ${stopIndex === 0 ? "pagi" : "lanjutan rute"} di koridor terdekat.`,
        isLocked: false,
      };
    }),
  }));
}

export function destinationCandidatePool(destination: string, options?: { minStops?: number }): DestinationStopSeed[] {
  const merged: DestinationStopSeed[] = [];
  const seen = new Set<string>();
  const push = (stop: DestinationStopSeed) => {
    const key = stop.name.trim().toLocaleLowerCase("id-ID");
    if (!key || seen.has(key)) return;
    seen.add(key);
    const coords = resolvePlaceCoordinates(stop.name, destination) ?? { lat: stop.lat, lng: stop.lng };
    merged.push({ ...stop, lat: coords.lat, lng: coords.lng });
  };
  const cityTrip = !isProvinceDestination(destination);
  destinationStopSeeds(destination).forEach(push);
  const province = findProvinceForDestination(destination);
  if (cityTrip) {
    // City trips stay in the city corridor — do not pull far province landmarks (Toba, etc.).
    cityRouteStops(destination).forEach(push);
    if (province) cityRouteStops(province.capital).forEach(push);
  } else if (province) {
    cityRouteStops(province.capital).forEach(push);
    cityRouteStops(province.name).forEach(push);
  }
  const minStops = Math.max(0, options?.minStops ?? 0);
  if (!cityTrip && merged.length < minStops) {
    nearbyProvinceStops(destination, routeHub(destination), Math.max(8, minStops)).forEach(push);
  }
  if (merged.length < minStops) {
    cityRouteStops(province?.capital ?? destination).forEach(push);
  }

  const hub = routeHub(destination);
  const maxHubKm = cityTrip ? 35 : 180;
  const local = merged.filter((stop) => haversineKm(hub, stop) <= maxHubKm);
  return local.length >= Math.min(2, merged.length) ? local : merged;
}

export function buildDestinationItinerary(input: {
  destination: string;
  startDate: string;
  endDate: string;
  rotate?: number;
  variant?: number;
  excludeNames?: string[];
  preferCheaper?: boolean;
}): EditableItineraryDay[] {
  const daysTotal = dayCount(input.startDate, input.endDate);
  const minPool = daysTotal * 2;
  const seeds = destinationCandidatePool(input.destination, { minStops: minPool });
  const fallback = destinationStopSeeds(input.destination);
  const pool = seeds.length ? seeds : fallback;
  const hub = routeHub(input.destination);
  const variant = Math.max(0, input.variant ?? input.rotate ?? 0);
  const cityTrip = !isProvinceDestination(input.destination);
  const maxRadiusKm = cityTrip ? 22 : 120;
  const localPool = pool.filter((stop) => haversineKm(hub, stop) <= (cityTrip ? 35 : 180));
  const clusters = selectCompactStops(localPool.length ? localPool : pool, daysTotal, hub, {
    excludeNames: input.excludeNames,
    variant,
    minPerDay: cityTrip ? (daysTotal === 1 ? 6 : daysTotal === 2 ? 5 : daysTotal >= 4 ? 2 : 3) : 3,
    maxPerDay: cityTrip ? (daysTotal === 1 ? 8 : daysTotal === 2 ? 6 : daysTotal >= 4 ? 4 : 5) : 5,
    maxRadiusKm,
  });
  const days = clusters.length
    ? clusters
    : planEfficientDays(localPool.length ? localPool : pool, daysTotal, hub);
  return packItinerarySchedule(
    ensureMultiStopDays(
      daysFromSeedClusters(days, {
        destination: input.destination,
        startDate: input.startDate,
        idPrefix: "dest",
        titleFor: (dayIndex) => `Jelajah ${input.destination} · hari ${dayIndex + 1}`,
      }),
      input.destination,
    ),
  );
}

function stopLabel(stop: { customTitle?: string | null; place?: { name?: string | null } | null }) {
  return (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID");
}

function hasValidCoords(lat?: number | null, lng?: number | null) {
  return typeof lat === "number" && typeof lng === "number" && !(lat === 0 && lng === 0);
}

function pickNearbySeeds(
  pool: DestinationStopSeed[],
  hub: { lat: number; lng: number },
  maxKm: number,
  exclude: Set<string>,
  take: number,
) {
  const extras: DestinationStopSeed[] = [];
  const nearby = pool
    .map((seed) => ({ seed, distance: haversineKm(hub, seed) }))
    .filter(({ seed, distance }) => {
      const key = seed.name.trim().toLocaleLowerCase("id-ID");
      return Boolean(key) && !exclude.has(key) && distance <= maxKm;
    })
    .sort((left, right) => left.distance - right.distance);
  for (const { seed } of nearby) {
    if (extras.length >= take) break;
    extras.push(seed);
  }
  return extras;
}

/** A full day of travel is never one landmark — fill thin days from the same city corridor. */
export function ensureMultiStopDays(
  days: EditableItineraryDay[],
  destination: string,
  options?: { minPerDay?: number; maxPerDay?: number },
): EditableItineraryDay[] {
  const cityTrip = !isProvinceDestination(destination);
  const minPerDay = options?.minPerDay ?? (cityTrip ? 4 : 4);
  const maxPerDay = options?.maxPerDay ?? (cityTrip ? 6 : 6);
  if (!days.length) return days;
  const maxKm = cityTrip ? 22 : 40;
  const pool = destinationCandidatePool(destination, { minStops: days.length * maxPerDay });
  const usedGlobally = new Set(days.flatMap((day) => day.stops.map(stopLabel)).filter(Boolean));

  return days.map((day, dayIndex) => {
    if (day.stops.length >= maxPerDay) return day;
    const hubStop = day.stops[0];
    const hub = hasValidCoords(hubStop?.place?.latitude, hubStop?.place?.longitude)
      ? { lat: hubStop!.place!.latitude, lng: hubStop!.place!.longitude }
      : routeHub(destination);
    const need = maxPerDay - day.stops.length;
    let extras = pickNearbySeeds(pool, hub, maxKm, usedGlobally, need);
    if (extras.length + day.stops.length < minPerDay) {
      extras = extras.concat(
        pickNearbySeeds(pool, hub, maxKm * 1.6, usedGlobally, need - extras.length).filter(
          (seed) => !extras.some((item) => item.name === seed.name),
        ),
      );
    }
    extras.forEach((seed) => usedGlobally.add(seed.name.trim().toLocaleLowerCase("id-ID")));
    if (!extras.length) return day;
    const extraStops = extras.map((stop, extraIndex) => {
      const place = placeFromTemplateStop(stop.name, destination);
      const previousSeed: DestinationStopSeed = extraIndex === 0
        ? { name: hubStop?.customTitle ?? "", lat: hub.lat, lng: hub.lng }
        : extras[extraIndex - 1]!;
      const stopIndex = day.stops.length + extraIndex;
      return {
        id: `${day.id}-fill-${extraIndex + 1}`,
        sequence: stopIndex + 1,
        place: {
          ...place,
          latitude: stop.lat,
          longitude: stop.lng,
          city: destination,
          formattedAddress: `${stop.name}, ${destination}`,
        },
        customTitle: stop.name,
        activityType: "Wisata",
        startTime: "08:00",
        durationMinutes: 60,
        travelDurationMinutes: travelBetweenSeeds(previousSeed, stop, stopIndex),
        notes: stop.notes ?? `Lanjutan hari ini di koridor ${destination}.`,
        isLocked: false,
      };
    });
    return { ...day, dayNumber: day.dayNumber || dayIndex + 1, stops: [...day.stops, ...extraStops] };
  });
}

const FOREIGN_STOP_RULES: Array<{ pattern: RegExp; unless: RegExp }> = [
  { pattern: /pulau padar|\bpadar\b|pink beach|bandara komodo|taman nasional komodo|\bkomodo\b|manta point|pulau kanawa|labuan bajo|kelimutu|wae rebo/i, unless: /komodo|labuan|bajo|flores|nusa tenggara timur|\bntt\b|ende|maumere/i },
];

function stopFitsDestination(stop: EditableItineraryDay["stops"][number], destination: string) {
  const dest = destination.trim().toLocaleLowerCase("id-ID");
  const blob = `${stop.customTitle ?? ""} ${stop.place?.name ?? ""} ${stop.place?.city ?? ""}`;
  for (const rule of FOREIGN_STOP_RULES) {
    if (rule.pattern.test(blob) && !rule.unless.test(dest)) return false;
  }
  const city = (stop.place?.city ?? "").trim();
  if (!city || isProvinceDestination(destination)) return true;
  const destProvince = findProvinceForDestination(destination);
  const cityProvince = findProvinceForDestination(city);
  if (destProvince && cityProvince && destProvince.slug !== cityProvince.slug) return false;
  return true;
}

/** Drop stops that sit in another island/province, then refill from the local corridor. */
export function clampItineraryToDestination(days: EditableItineraryDay[], destination: string): EditableItineraryDay[] {
  if (!days.length) {
    return buildDestinationItinerary({ destination, startDate: "", endDate: "" });
  }
  const hub = routeHub(destination);
  const cityTrip = !isProvinceDestination(destination);
  const maxKm = cityTrip ? 45 : 140;
  const filtered = days.map((day) => ({
    ...day,
    stops: day.stops.filter((stop) => {
      if (!stopFitsDestination(stop, destination)) return false;
      const lat = stop.place?.latitude;
      const lng = stop.place?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return true;
      if (Math.abs(lat - -2.5) < 0.08 && Math.abs(lng - 118) < 0.08) return false;
      return haversineKm(hub, { lat, lng }) <= maxKm;
    }),
  }));
  const remaining = filtered.reduce((sum, day) => sum + day.stops.length, 0);
  if (!remaining) {
    return buildDestinationItinerary({
      destination,
      startDate: days[0]?.date ?? "",
      endDate: days.at(-1)?.date ?? days[0]?.date ?? "",
    });
  }
  return ensureMultiStopDays(filtered, destination);
}

export function destinationCoverUrl(city: string) {
  const key = city.trim().toLowerCase();
  if (key.includes("yogya") || key.includes("jogja")) return ASSETS.jogja;
  if (key.includes("bali") || key.includes("ubud") || key.includes("canggu")) return ASSETS.tanahLot;
  if (key.includes("lombok") || key.includes("rinjani") || key.includes("bromo") || key.includes("batur")) return ASSETS.mountBatur;
  if (key.includes("karimun") || key.includes("penida")) return ASSETS.nusaPenida;
  if (key.includes("komodo") || key.includes("bajo")) return ASSETS.komodo;
  const tag = encodeURIComponent((city.trim() || "indonesia").split(",")[0]!.replace(/\s+/g, ","));
  if (key.includes("bandung")) {
    return `https://images.unsplash.com/photo-1555899434-94d10b8c0b5a?auto=format&fit=crop&w=1200&q=80&sig=${tag}`;
  }
  const seed = encodeURIComponent((city.trim() || "indonesia").toLocaleLowerCase("id-ID").replace(/\s+/g, "-"));
  return `https://picsum.photos/seed/${seed}-dolan/1200/800`;
}

const KOMODO_STOP_PATTERN = /pink beach|bandara komodo|pulau padar|manta point|pulau kanawa/i;

export function itineraryFitsDestination(days: EditableItineraryDay[], destination: string) {
  if (!days.length) return false;
  const dest = destination.trim().toLowerCase();
  if (/komodo|labuan bajo|\bbajo\b/.test(dest)) return true;
  const names = days.flatMap((day) => day.stops.map((stop) => `${stop.customTitle ?? ""} ${stop.place?.name ?? ""}`)).join(" ");
  return !KOMODO_STOP_PATTERN.test(names);
}

export function resolveTripItineraryDays(input: {
  destination: string;
  startDate: string | null;
  endDate: string | null;
  days: EditableItineraryDay[];
}) {
  if (itineraryFitsDestination(input.days, input.destination)) return input.days;
  return buildDestinationItinerary({
    destination: input.destination.trim() || "Indonesia",
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? input.startDate ?? "",
  });
}

function daySpanKm(stops: DestinationStopSeed[]) {
  if (stops.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      max = Math.max(max, haversineKm(stops[i]!, stops[j]!));
    }
  }
  return max;
}

function clustersFromCuratedDays(
  stops: Array<DestinationStopSeed & { day: number; sequence: number }>,
  durationDays: number,
  hub: { lat: number; lng: number },
  maxDaySpanKm = 100,
) {
  const byDay = new Map<number, Array<DestinationStopSeed & { sequence: number }>>();
  stops.forEach((stop) => {
    const day = Math.max(1, stop.day || 1);
    const list = byDay.get(day) ?? [];
    list.push(stop);
    byDay.set(day, list);
  });
  const curated = [...byDay.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, list]) =>
      [...list]
        .sort((left, right) => left.sequence - right.sequence)
        .map(({ name, lat, lng, notes }) => ({ name, lat, lng, notes })),
    )
    .filter((chunk) => chunk.length > 0);

  const compact = curated.length > 0 && curated.every((chunk) => daySpanKm(chunk) <= maxDaySpanKm);
  if (compact) {
    return curated.map((chunk, index) =>
      orderStopsWithoutBacktrack(chunk, index === 0 ? hub : curated[index - 1]?.at(-1) ?? hub),
    );
  }
  const unique = stops.filter((stop, index, list) => list.findIndex((item) => item.name === stop.name) === index);
  return planEfficientDays(
    unique.map(({ name, lat, lng, notes }) => ({ name, lat, lng, notes })),
    durationDays,
    hub,
  );
}

export function buildProvinceTemplateDays(province: CuratedProvince, options?: { startDate?: string }): EditableItineraryDay[] {
  const notesByName = new Map(province.template.stops.map((stop) => [stop.name.toLocaleLowerCase("id-ID"), stop.notes]));
  const durationByName = new Map(province.template.stops.map((stop) => [stop.name.toLocaleLowerCase("id-ID"), stop.durationMinutes]));
  const seeds = province.template.stops.map((stop) => {
    const coords = seedCoords(stop.name, province.name);
    return {
      name: stop.name,
      lat: coords.lat,
      lng: coords.lng,
      notes: stop.notes,
      day: stop.day,
      sequence: stop.sequence,
    };
  });
  const unique = seeds.filter((stop, index, list) => list.findIndex((item) => item.name === stop.name) === index);
  const hub = resolvePlaceCoordinates(unique[0]?.name ?? "", province.name)
    ?? PROVINCE_CENTERS[province.name]
    ?? { lat: unique[0]?.lat ?? -2.5, lng: unique[0]?.lng ?? 118 };
  const clusters = clustersFromCuratedDays(unique, province.template.durationDays, hub);
  const startDate = options?.startDate && /^\d{4}-\d{2}-\d{2}$/.test(options.startDate) ? options.startDate : "";
  return packItinerarySchedule(
    clusters.map((chunk, dayIndex) => ({
      id: `${province.slug}-day-${dayIndex + 1}`,
      dayNumber: dayIndex + 1,
      date: startDate ? addDaysToIso(startDate, dayIndex) : `2026-10-${String(24 + dayIndex).padStart(2, "0")}`,
      title: `Hari ${dayIndex + 1} · ${province.name}`,
      stops: chunk.map((stop, stopIndex) => {
        const place = placeFromTemplateStop(stop.name, province.name);
        const previous = chunk[stopIndex - 1];
        const key = stop.name.toLocaleLowerCase("id-ID");
        const travel = travelBetweenSeeds(previous, stop, stopIndex);
        return {
          id: `${province.slug}-day-${dayIndex + 1}-stop-${stopIndex + 1}`,
          sequence: stopIndex + 1,
          place: { ...place, latitude: stop.lat, longitude: stop.lng, formattedAddress: `${stop.name}, ${province.name}` },
          customTitle: stop.name,
          activityType: stopIndex === 0 && dayIndex === 0 ? "Titik kumpul" : "Wisata",
          startTime: "08:00",
          durationMinutes: durationByName.get(key) || 120,
          travelDurationMinutes: travel,
          notes: notesByName.get(key) ?? stop.notes ?? `Rute hemat jarak ke ${stop.name}.`,
          isLocked: false,
        };
      }),
    })),
  );
}
