import type { EditableItineraryDay } from "@dolan/shared";
import { INDONESIA_PROVINCES, type CuratedProvince } from "@/lib/provinces";
import { resolvePlaceCoordinates } from "@/lib/place-coordinates";
import { haversineKm, planEfficientDays, selectCompactStops, travelMinutesBetween } from "@/lib/route-optimize";
import { addDaysToIso, estimateItineraryBudget, packItinerarySchedule, placeFromTemplateStop, placeTicketEstimate, PROVINCE_CENTERS } from "@/lib/template-itinerary";
import { ASSETS } from "@/lib/assets";

export type DestinationStopSeed = {
  name: string;
  lat: number;
  lng: number;
  notes?: string;
};

export const CITY_ROUTES: Array<{ match: string[]; stops: DestinationStopSeed[] }> = [
  {
    match: ["yogyakarta", "jogja"],
    stops: [
      { name: "Tugu Yogyakarta", lat: -7.7829, lng: 110.3671, notes: "Titik foto ikon kota sebelum lanjut ke selatan." },
      { name: "Jalan Malioboro", lat: -7.7926, lng: 110.3658, notes: "Jalan kaki, belanja, dan kuliner sepanjang Malioboro." },
      { name: "Pasar Beringharjo", lat: -7.7989, lng: 110.3656, notes: "Pasar tradisional di ujung Malioboro." },
      { name: "Titik Nol KM Yogyakarta", lat: -7.8014, lng: 110.3647, notes: "Titik nol kilometer, dekat keraton dan museum." },
      { name: "Keraton Yogyakarta", lat: -7.8053, lng: 110.3642, notes: "Kawasan keraton dan alun-alun utara." },
      { name: "Taman Sari", lat: -7.81, lng: 110.3594, notes: "Jalan kaki dari keraton, cek jam kunjungan." },
      { name: "Taman Pintar Yogyakarta", lat: -7.8006, lng: 110.3677, notes: "Museum sains di pusat kota, dekat Malioboro." },
      { name: "Alun-Alun Kidul", lat: -7.8117, lng: 110.3635, notes: "Sore hari ramai. Naik odong-odong atau jalan kaki." },
      { name: "Museum Sonobudoyo", lat: -7.8025, lng: 110.364, notes: "Museum di sisi alun-alun utara, dekat keraton." },
      { name: "Pasar Kembang", lat: -7.7898, lng: 110.3668, notes: "Dekat Tugu, lanjut ke Malioboro jalan kaki." },
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
      { name: "Saung Angklung Udjo", lat: -6.8978, lng: 107.6553, notes: "Pertunjukan angklung sore, masih di dalam kota." },
      { name: "Trans Studio Bandung", lat: -6.9252, lng: 107.6365, notes: "Indoor theme park di pusat kota, bukan luar kota." },
      { name: "Taman Lansia Bandung", lat: -6.8985, lng: 107.625, notes: "Taman kota dekat Gedung Sate, cocok istirahat siang." },
      { name: "Cikapundung River Spot", lat: -6.9128, lng: 107.6098, notes: "Koridor sungai di pusat kota, cocok sore menjelang malam." },
      { name: "Paskal Food Market", lat: -6.9146, lng: 107.5948, notes: "Kuliner malam di barat pusat kota Bandung." },
      { name: "Jalan Dago", lat: -6.885, lng: 107.6135, notes: "Factory outlet dan kuliner sepanjang Dago." },
      { name: "Museum Konferensi Asia Afrika", lat: -6.9214, lng: 107.6094, notes: "Satu koridor dengan Jalan Asia Afrika." },
      { name: "Taman Film Bandung", lat: -6.9178, lng: 107.6092, notes: "Dekat Braga, cocok istirahat singkat." },
      { name: "Ciwalk", lat: -6.8936, lng: 107.6058, notes: "Mal dan kuliner di Cihampelas." },
      { name: "Gedung Merdeka", lat: -6.9211, lng: 107.6096, notes: "Dekat Asia Afrika, foto gedung bersejarah." },
      { name: "Masjid Raya Bandung", lat: -6.9216, lng: 107.6064, notes: "Sisi alun-alun, lanjut jalan kaki." },
    ],
  },
  {
    match: ["bogor"],
    stops: [
      { name: "Kebun Raya Bogor", lat: -6.5971, lng: 106.799, notes: "Masuk pagi, sisihkan 2 jam untuk jalan di kebun raya." },
      { name: "Istana Bogor", lat: -6.598, lng: 106.7994, notes: "Sisi kebun raya. Cek jadwal area yang buka untuk publik." },
      { name: "Taman Kencana Bogor", lat: -6.5938, lng: 106.7965, notes: "Jalan kaki dari kebun raya, cocok untuk makan siang." },
      { name: "Jalan Suryakencana", lat: -6.6035, lng: 106.7998, notes: "Chinatown Bogor, kuliner sore." },
      { name: "Museum Zoologi Bogor", lat: -6.5986, lng: 106.7968, notes: "Masih di kompleks kebun raya, lanjut jalan kaki atau ojek singkat." },
      { name: "Taman Sempur", lat: -6.5894, lng: 106.7972, notes: "Taman kota di utara kebun raya, cocok sore hari." },
    ],
  },
  {
    match: ["jakarta", "dki"],
    stops: [
      { name: "Ancol", lat: -6.1256, lng: 106.8333, notes: "Pagi di kawasan pantai Ancol sebelum lanjut ke selatan." },
      { name: "Kota Tua Jakarta", lat: -6.1352, lng: 106.8133, notes: "Jalan kaki di Fatahillah. Museum di dalam kawasan berbayar terpisah." },
      { name: "Glodok", lat: -6.1445, lng: 106.8147, notes: "Pecinan dekat Kota Tua, kuliner dan foto kawasan." },
      { name: "Monumen Nasional", lat: -6.1754, lng: 106.8272, notes: "Plaza Monas gratis. Naik ke puncak opsional dan berbayar." },
      { name: "Masjid Istiqlal", lat: -6.1702, lng: 106.8314, notes: "Masjid negara di seberang Monas, masuk area luar gratis." },
      { name: "Museum Nasional", lat: -6.176, lng: 106.8216, notes: "Dekat Monas. Cek hari tutup sebelum berkunjung." },
      { name: "Bundaran HI", lat: -6.1944, lng: 106.8229, notes: "Titik foto dan kuliner di pusat kota. Masuk kawasan gratis." },
      { name: "Taman Menteng", lat: -6.1967, lng: 106.8305, notes: "Taman kota dekat Thamrin, istirahat siang." },
      { name: "Gelora Bung Karno", lat: -6.2183, lng: 106.8027, notes: "Kawasan Senayan, foto stadion dan jalan sore." },
      { name: "Taman Suropati", lat: -6.1994, lng: 106.8372, notes: "Taman di Menteng, lanjut jalan kaki dari Bundaran HI." },
      { name: "Lapangan Banteng", lat: -6.1701, lng: 106.835, notes: "Dekat Monas dan Istiqlal, cocok foto kawasan." },
      { name: "Taman Ismail Marzuki", lat: -6.1897, lng: 106.8398, notes: "Pusat seni di Cikini, istirahat siang atau sore." },
      { name: "Plaza Indonesia", lat: -6.1934, lng: 106.822, notes: "Kuliner dan istirahat di Thamrin, dekat Bundaran HI." },
      { name: "Taman Mini Indonesia Indah", lat: -6.3024, lng: 106.8901, notes: "Timur Jakarta. Naik taksi/online, bukan jalan kaki." },
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
      { name: "Lautan Pasir Bromo", lat: -7.935, lng: 112.955, notes: "Lautan pasir di kaldera, tempuh jeep bukan jalan kaki jauh." },
      { name: "Cemoro Lawang", lat: -7.942, lng: 112.964, notes: "Desa di bibir kaldera, titik makan dan istirahat." },
      { name: "Savana Teletubbies Bromo", lat: -7.925, lng: 112.973, notes: "Bukit savana di sisi kaldera, satu kawasan Bromo." },
      { name: "Madakaripura", lat: -7.8538, lng: 113.0064, notes: "Air terjun dekat Bromo, satu koridor jalan." },
    ],
  },
  {
    match: ["komodo", "labuan bajo"],
    stops: [
      { name: "Pulau Padar", lat: -8.6486, lng: 119.5892 },
      { name: "Pink Beach", lat: -8.6031, lng: 119.5196 },
      { name: "Manta Point", lat: -8.5374, lng: 119.6161 },
      { name: "Pulau Kelor", lat: -8.478, lng: 119.873 },
      { name: "Pulau Kanawa", lat: -8.488, lng: 119.76 },
      { name: "Pulau Kalong", lat: -8.555, lng: 119.67 },
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
    match: ["jambi"],
    stops: [
      { name: "Gentala Arasy", lat: -1.5916, lng: 103.6115, notes: "Jembatan dan museum di tepi Batanghari, cocok mulai pagi." },
      { name: "Masjid Agung Al-Falah Jambi", lat: -1.5903, lng: 103.615, notes: "Masjid agung dekat Gentala, lanjut jalan kaki." },
      { name: "Museum Siginjai", lat: -1.6105, lng: 103.6138, notes: "Museum negeri Jambi di pusat kota." },
      { name: "Candi Muaro Jambi", lat: -1.478, lng: 103.667, notes: "Kompleks candi di pinggir kota, satu koridor dari pusat Jambi." },
      { name: "Taman Rimbo Jambi", lat: -1.618, lng: 103.604, notes: "Taman kota untuk istirahat siang." },
    ],
  },
  {
    match: ["lampung", "bandar lampung"],
    stops: [
      { name: "Pantai Mutun", lat: -5.512, lng: 105.262, notes: "Pantai dekat Bandar Lampung, mulai pagi." },
      { name: "Lampung Walk", lat: -5.429, lng: 105.261, notes: "Koridor kuliner dan jalan-jalan di pusat kota." },
      { name: "Museum Lampung", lat: -5.418, lng: 105.261, notes: "Museum negeri dekat pusat kota." },
      { name: "Puncak Mas Lampung", lat: -5.428, lng: 105.239, notes: "View kota sore hari, masih di Bandar Lampung." },
      { name: "Taman Gajah Lampung", lat: -5.425, lng: 105.258, notes: "Taman kota, istirahat siang." },
    ],
  },
];

export function normalizeDestinationInput(input: string) {
  return input.trim().replace(/^(provinsi|kota|kabupaten|kab\.?)\s+/i, "").trim();
}

export function findProvinceForDestination(input: string) {
  const value = normalizeDestinationInput(input).toLocaleLowerCase("id-ID");
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
  const value = normalizeDestinationInput(input).toLocaleLowerCase("id-ID");
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

function isAllDayRemoteStop(name: string) {
  return /kepulauan seribu/.test(name.toLocaleLowerCase("id-ID"));
}

function isOutsideCityDestination(destination: string, stopName: string) {
  if (isProvinceDestination(destination)) return false;
  const dest = normalizeDestinationInput(destination).toLocaleLowerCase("id-ID");
  const name = stopName.toLocaleLowerCase("id-ID");
  if (/bandung/.test(dest)) return /bogor|pangandaran|jakarta|yogyakarta|kawah putih|tangkuban/.test(name);
  if (/jakarta|dki/.test(dest)) return /bogor|bandung|puncak|kepulauan seribu/.test(name);
  if (/yogyakarta|jogja/.test(dest)) return /borobudur|prambanan|dieng|semarang|solo/.test(name);
  if (/bogor/.test(dest)) return /bandung|jakarta|pangandaran|puncak/.test(name);
  return false;
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
  const byKeyword = CITY_ROUTES.find((route) => route.match.some((item) => value.includes(item)));
  if (byKeyword) return byKeyword;
  return CITY_ROUTES.find((route) =>
    route.stops.some((stop) => {
      const name = stop.name.toLocaleLowerCase("id-ID");
      return name === value || value.includes(name) || name.includes(value);
    }),
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

export function destinationStopSeeds(destination: string): DestinationStopSeed[] {
  if (isProvinceDestination(destination)) {
    const provinceStops = provinceRouteStops(destination);
    if (provinceStops.length) return provinceStops;
  }
  const cityStops = cityRouteStops(destination);
  if (cityStops.length) return cityStops;
  const named = resolvePlaceCoordinates(destination, destination);
  if (named) {
    return [{ name: destination.trim(), lat: named.lat, lng: named.lng, notes: `Kunjungan ke ${destination.trim()}.` }];
  }
  const fallback = seedCoords(destination.trim() || "Indonesia", destination.trim() || "Indonesia");
  return expandLocalStops(destination.trim() || "Destinasi", { lat: fallback.lat, lng: fallback.lng });
}

function expandLocalStops(destination: string, hub: { lat: number; lng: number }): DestinationStopSeed[] {
  const city = normalizeDestinationInput(destination) || "kota";
  return [
    { name: city, lat: hub.lat, lng: hub.lng, notes: `Titik awal di ${city}.` },
    { name: `Alun-alun ${city}`, lat: hub.lat + 0.012, lng: hub.lng + 0.008, notes: "Titik kota untuk foto dan kuliner." },
    { name: `Masjid Agung ${city}`, lat: hub.lat + 0.006, lng: hub.lng - 0.007, notes: "Landmark kota. Area luar biasanya bisa dikunjungi gratis." },
    { name: `Museum ${city}`, lat: hub.lat - 0.008, lng: hub.lng + 0.006, notes: "Museum daerah, cek jam buka." },
    { name: `Taman Kota ${city}`, lat: hub.lat - 0.011, lng: hub.lng - 0.005, notes: "Istirahat siang dan jalan sore." },
    { name: `Pasar Tradisional ${city}`, lat: hub.lat + 0.014, lng: hub.lng - 0.004, notes: "Kuliner lokal dan oleh-oleh." },
    { name: `Pusat kuliner ${city}`, lat: hub.lat - 0.004, lng: hub.lng + 0.012, notes: "Makan siang atau cemilan antar destinasi." },
    { name: `Taman rekreasi ${city}`, lat: hub.lat + 0.009, lng: hub.lng + 0.003, notes: "Taman kota untuk istirahat singkat." },
    { name: `Viewpoint ${city}`, lat: hub.lat - 0.015, lng: hub.lng - 0.009, notes: "Spot foto sore sebelum lanjut ke kuliner." },
    { name: `Kuliner malam ${city}`, lat: hub.lat + 0.004, lng: hub.lng + 0.011, notes: "Penutup hari: makan malam dan suasana kota." },
  ];
}

function dayCount(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return 1;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
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
        durationMinutes: 90,
        travelDurationMinutes:
          stopIndex === 0 || !previous ? 0 : travelMinutesBetween({ lat: previous.lat, lng: previous.lng }, { lat: stop.lat, lng: stop.lng }),
        notes: stop.notes ?? `Kunjungan ke ${stop.name}. Ideal ${stopIndex === 0 ? "pagi" : "lanjutan rute"} di koridor terdekat.`,
        isLocked: false,
      };
    }),
  }));
}

export function destinationCandidatePool(destination: string): DestinationStopSeed[] {
  const merged: DestinationStopSeed[] = [];
  const seen = new Set<string>();
  const hub = routeHub(destination);
  const cityTrip = !isProvinceDestination(destination);
  const push = (stop: DestinationStopSeed) => {
    const key = stop.name.trim().toLocaleLowerCase("id-ID");
    if (!key || seen.has(key) || isAllDayRemoteStop(stop.name)) return;
    if (isOutsideCityDestination(destination, stop.name)) return;
    const coords = resolvePlaceCoordinates(stop.name, destination) ?? { lat: stop.lat, lng: stop.lng };
    if (cityTrip && haversineKm(coords, hub) > 22) return;
    seen.add(key);
    merged.push({ ...stop, lat: coords.lat, lng: coords.lng });
  };
  destinationStopSeeds(destination).forEach(push);
  cityRouteStops(destination).forEach(push);
  if (!cityTrip) {
    const province = findProvinceForDestination(destination);
    if (province) cityRouteStops(province.capital).slice(0, 3).forEach(push);
    CITY_ROUTES.forEach((route) => {
      route.stops.filter((stop) => haversineKm(stop, hub) <= 80).slice(0, 3).forEach(push);
    });
  }
  if (merged.length < 6) {
    expandLocalStops(destination, hub).forEach(push);
  }
  return merged;
}

function buildDestinationItineraryOnce(input: {
  destination: string;
  startDate: string;
  endDate: string;
  rotate?: number;
  variant?: number;
  excludeNames?: string[];
  preferCheaper?: boolean;
}): EditableItineraryDay[] {
  const seeds = destinationCandidatePool(input.destination);
  const fallback = destinationStopSeeds(input.destination);
  let pool = seeds.length ? seeds : fallback;
  const daysTotal = dayCount(input.startDate, input.endDate);
  const cityTrip = !isProvinceDestination(input.destination);
  if (input.preferCheaper) {
    const ranked = [...pool].sort((a, b) => placeTicketEstimate(a.name) - placeTicketEstimate(b.name));
    const freeOrCheap = ranked.filter((stop) => placeTicketEstimate(stop.name) === 0);
    const needed = Math.max(4, daysTotal * (cityTrip ? 6 : 4));
    pool = freeOrCheap.length >= needed ? freeOrCheap : ranked.filter((stop) => placeTicketEstimate(stop.name) <= 25_000);
    if (pool.length < 2) pool = ranked;
  }
  const hub = routeHub(input.destination);
  const variant = Math.max(0, input.variant ?? input.rotate ?? 0);
  const clusters = selectCompactStops(pool, daysTotal, hub, {
    excludeNames: input.excludeNames,
    variant,
    minPerDay: cityTrip ? 7 : 5,
    maxPerDay: cityTrip ? 8 : 7,
    maxRadiusKm: cityTrip ? 22 : 50,
  });
  const days = clusters.length
    ? clusters
    : planEfficientDays(pool, daysTotal, hub);
  return packItinerarySchedule(
    daysFromSeedClusters(days, {
      destination: input.destination,
      startDate: input.startDate,
      idPrefix: "dest",
      titleFor: (dayIndex) => `Jelajah ${input.destination} · hari ${dayIndex + 1}`,
    }),
  );
}

export function buildDestinationItinerary(input: {
  destination: string;
  startDate: string;
  endDate: string;
  rotate?: number;
  variant?: number;
  excludeNames?: string[];
  preferCheaper?: boolean;
  budgetPool?: number;
  partySize?: number;
}): EditableItineraryDay[] {
  const first = buildDestinationItineraryOnce(input);
  const pool = input.budgetPool ?? 0;
  if (!input.preferCheaper || pool <= 0) return first;
  const people = input.partySize ?? 1;
  let best = first;
  let bestTotal = estimateItineraryBudget(first, pool, people, { leanMeals: true }).total;
  for (const extra of [1, 2, 3]) {
    const candidate = buildDestinationItineraryOnce({ ...input, variant: (input.variant ?? 0) + extra });
    const total = estimateItineraryBudget(candidate, pool, people, { leanMeals: true }).total;
    if (total < bestTotal) {
      best = candidate;
      bestTotal = total;
    }
    if (bestTotal <= pool) break;
  }
  return best;
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
  return `https://loremflickr.com/1200/800/${tag},indonesia,travel`;
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

export function buildProvinceTemplateDays(province: CuratedProvince, options?: { startDate?: string }): EditableItineraryDay[] {
  const notesByName = new Map(province.template.stops.map((stop) => [stop.name.toLocaleLowerCase("id-ID"), stop.notes]));
  const durationByName = new Map(province.template.stops.map((stop) => [stop.name.toLocaleLowerCase("id-ID"), stop.durationMinutes]));
  const seeds: DestinationStopSeed[] = [
    ...province.template.stops.map((stop) => {
      const coords = seedCoords(stop.name, province.name);
      return { name: stop.name, lat: coords.lat, lng: coords.lng, notes: stop.notes };
    }),
    ...destinationCandidatePool(province.name),
  ];
  const unique = seeds.filter((stop, index, list) => {
    if (isAllDayRemoteStop(stop.name)) return false;
    return list.findIndex((item) => item.name === stop.name) === index;
  });
  const hub = resolvePlaceCoordinates(unique[0]?.name ?? "", province.name)
    ?? PROVINCE_CENTERS[province.name]
    ?? { lat: unique[0]?.lat ?? -2.5, lng: unique[0]?.lng ?? 118 };
  const clusters = selectCompactStops(unique, province.template.durationDays, hub, {
    minPerDay: 2,
    maxPerDay: 3,
    maxRadiusKm: 45,
  });
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
        const travel = stopIndex === 0 || !previous ? 0 : travelMinutesBetween({ lat: previous.lat, lng: previous.lng }, { lat: stop.lat, lng: stop.lng });
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
