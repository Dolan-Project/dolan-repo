import type {
  BudgetItemInput,
  EditableItineraryDay,
  ItineraryTemplateDetail,
  PlaceSummary,
  TemplateDaySummary,
} from "@dolan/shared";
import { resolvePlaceCoordinates } from "@/lib/place-coordinates";
import { haversineKm, travelMinutesBetween } from "@/lib/route-optimize";

export const MAX_ITINERARY_REGENERATES = 2;

export const WIZARD_STEPS = [
  { n: 1, label: "Mulai" },
  { n: 2, label: "Detail" },
  { n: 3, label: "Itinerary" },
  { n: 4, label: "Undang" },
] as const;

export type WizardPath = "create" | "template";

/** Approximate province capitals so template stops can render on the map. */
export const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  Aceh: { lat: 5.5483, lng: 95.3238 },
  "Sumatera Utara": { lat: 3.5952, lng: 98.6722 },
  "Sumatera Barat": { lat: -0.9471, lng: 100.4172 },
  Riau: { lat: 0.5071, lng: 101.4478 },
  "Kepulauan Riau": { lat: 1.0456, lng: 104.0305 },
  Jambi: { lat: -1.6101, lng: 103.6131 },
  "Sumatera Selatan": { lat: -2.9761, lng: 104.7754 },
  "Kepulauan Bangka Belitung": { lat: -2.1316, lng: 106.1169 },
  Bengkulu: { lat: -3.7928, lng: 102.2608 },
  Lampung: { lat: -5.3971, lng: 105.2668 },
  "DKI Jakarta": { lat: -6.2088, lng: 106.8456 },
  "Jawa Barat": { lat: -6.9175, lng: 107.6191 },
  Banten: { lat: -6.1200, lng: 106.1503 },
  "Jawa Tengah": { lat: -6.9667, lng: 110.4167 },
  "DI Yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "Jawa Timur": { lat: -7.2575, lng: 112.7521 },
  Bali: { lat: -8.4095, lng: 115.1889 },
  "Nusa Tenggara Barat": { lat: -8.5833, lng: 116.1167 },
  "Nusa Tenggara Timur": { lat: -10.1772, lng: 123.607 },
  "Kalimantan Barat": { lat: -0.0263, lng: 109.3425 },
  "Kalimantan Tengah": { lat: -2.21, lng: 113.92 },
  "Kalimantan Selatan": { lat: -3.3186, lng: 114.5944 },
  "Kalimantan Timur": { lat: -0.5022, lng: 117.1536 },
  "Kalimantan Utara": { lat: 3.3274, lng: 117.5789 },
  "Sulawesi Utara": { lat: 1.4748, lng: 124.8421 },
  Gorontalo: { lat: 0.5435, lng: 123.0595 },
  "Sulawesi Tengah": { lat: -0.9, lng: 119.87 },
  "Sulawesi Barat": { lat: -2.6748, lng: 118.887 },
  "Sulawesi Selatan": { lat: -5.1477, lng: 119.4327 },
  "Sulawesi Tenggara": { lat: -3.9985, lng: 122.5127 },
  Maluku: { lat: -3.6561, lng: 128.1906 },
  "Maluku Utara": { lat: 0.7891, lng: 127.367 },
  "Papua Barat": { lat: -0.8615, lng: 134.062 },
  "Papua Barat Daya": { lat: -0.876, lng: 131.261 },
  Papua: { lat: -2.5916, lng: 140.669 },
  "Papua Selatan": { lat: -8.5, lng: 140.4 },
  "Papua Tengah": { lat: -4.2699, lng: 136.08 },
  "Papua Pegunungan": { lat: -4.08, lng: 138.95 },
};

function hashOffset(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return {
    lat: ((hash % 900) - 450) / 8000,
    lng: (((Math.floor(hash / 900) % 900) - 450) / 8000),
  };
}

export function placeFromTemplateStop(name: string, city: string): PlaceSummary {
  const known = resolvePlaceCoordinates(name, city);
  const center = PROVINCE_CENTERS[city] ?? { lat: -2.5, lng: 118 };
  const offset = hashOffset(`${city}:${name}`);
  const latitude = known?.lat ?? center.lat + offset.lat;
  const longitude = known?.lng ?? center.lng + offset.lng;
  return {
    googlePlaceId: `tpl-${name.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, "-")}`,
    name,
    formattedAddress: `${name}, ${city}`,
    city,
    latitude,
    longitude,
    rating: null,
    userRatingCount: null,
    photoName: null,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${latitude.toFixed(6)},${longitude.toFixed(6)}`)}`,
  };
}

export function addDaysToIso(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return date.toISOString().slice(0, 10);
}

export function templateDaysToEditable(
  days: TemplateDaySummary[],
  city: string,
  startDate: string,
): EditableItineraryDay[] {
  return packItinerarySchedule(days.filter((day) => day.stops.length > 0).map((day, dayIndex) => ({
    id: day.id || `day-${day.dayNumber}`,
    dayNumber: day.dayNumber,
    date: startDate ? addDaysToIso(startDate, dayIndex) : `2026-10-${String(24 + dayIndex).padStart(2, "0")}`,
    title: day.title,
    stops: day.stops.map((stop, stopIndex) => {
      const name = stop.customTitle || stop.place?.name || `Titik ${stop.sequence}`;
      const resolved = placeFromTemplateStop(name, city);
      const place = {
        ...(stop.place ?? resolved),
        ...resolved,
        name,
        formattedAddress: stop.place?.formattedAddress || resolved.formattedAddress,
      };
      const previousStop = day.stops[stopIndex - 1];
      const previous = previousStop
        ? placeFromTemplateStop(previousStop.customTitle || previousStop.place?.name || "", city)
        : null;
      return {
        id: `${day.id}-stop-${stop.sequence}`,
        sequence: stop.sequence,
        place,
        customTitle: stop.customTitle,
        activityType: stop.activityType || "Wisata",
        startTime: "08:00",
        durationMinutes: stop.durationMinutes || 120,
        travelDurationMinutes: previous
          ? travelMinutesBetween({ lat: previous.latitude, lng: previous.longitude }, { lat: place.latitude, lng: place.longitude })
          : 0,
        notes: stop.notes,
        isLocked: false,
      };
    }),
  })));
}

function minutesToClock(totalMinutes: number) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

export function clockToMinutes(clock: string) {
  const [hours, minutes] = clock.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function addMinutesToClock(clock: string, minutes: number) {
  return minutesToClock(clockToMinutes(clock) + minutes);
}

export function visitWindowLabel(startTime: string | null | undefined, durationMinutes: number) {
  if (!startTime) return "";
  return `${startTime}–${addMinutesToClock(startTime, Math.max(15, durationMinutes))}`;
}

export function suggestedStartMinutes(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  if (/penanjakan|sikunir|sunrise/.test(value)) return 3 * 60 + 30;
  if (/bromo|ijen|kawah/.test(value)) return 4 * 60 + 30;
  if (/uluwatu|tanah lot/.test(value)) return 15 * 60 + 30;
  return 8 * 60;
}

export function packItinerarySchedule(days: EditableItineraryDay[]): EditableItineraryDay[] {
  const afternoonTarget = 16 * 60 + 30;
  const dayEnd = 17 * 60 + 30;
  return days.map((day) => {
    const firstName = day.stops[0]?.customTitle || day.stops[0]?.place?.name || "";
    const suggested = suggestedStartMinutes(firstName);
    const specialWindow = suggested < 8 * 60 || suggested >= 15 * 60;
    if (specialWindow) {
      let cursor = suggested;
      const stops = day.stops.map((stop, index) => {
        const travel = index === 0 ? 0 : Math.max(0, Math.min(90, stop.travelDurationMinutes ?? 30));
        cursor += travel;
        const startTime = minutesToClock(cursor);
        const durationMinutes = Math.max(15, Math.min(240, stop.durationMinutes || 90));
        cursor += durationMinutes;
        return { ...stop, sequence: index + 1, startTime, durationMinutes, travelDurationMinutes: travel };
      });
      return { ...day, stops };
    }
    let cursor = 8 * 60;
    const count = Math.max(1, day.stops.length);
    const travelBudget = day.stops.reduce((sum, stop, index) => (
      sum + (index === 0 ? 0 : Math.max(10, Math.min(45, stop.travelDurationMinutes ?? 20)))
    ), 0);
    const visitBudget = Math.max(75 * count, afternoonTarget - cursor - travelBudget);
    const perStop = Math.min(120, Math.max(75, Math.round(visitBudget / count)));
    const stops = day.stops.map((stop, index) => {
      const travel = index === 0 ? 0 : Math.max(10, Math.min(45, stop.travelDurationMinutes ?? 20));
      cursor += travel;
      const startTime = minutesToClock(Math.min(dayEnd - 60, cursor));
      cursor += perStop;
      return { ...stop, sequence: index + 1, startTime, durationMinutes: perStop, travelDurationMinutes: travel };
    });
    return { ...day, stops };
  });
}

export function toItinerarySaveDays(days: EditableItineraryDay[]) {
  return packItinerarySchedule(days).map((day, dayIndex) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    date: /^\d{4}-\d{2}-\d{2}$/.test(day.date) ? day.date : addDaysToIso("2026-10-01", dayIndex),
    title: day.title?.trim() || null,
    stops: day.stops.map((stop, index) => {
      const name = stop.customTitle?.trim() || stop.place?.name || `Titik ${index + 1}`;
      const googlePlaceId = stop.place?.googlePlaceId && stop.place.googlePlaceId.length >= 3
        ? stop.place.googlePlaceId
        : `tpl-${stop.id.replace(/[^a-z0-9]+/gi, "-").slice(0, 48)}`;
      return {
        id: stop.id,
        sequence: index + 1,
        googlePlaceId,
        customTitle: name,
        activityType: stop.activityType?.trim() || "Wisata",
        startTime: stop.startTime,
        durationMinutes: Math.min(1440, Math.max(15, Math.round(stop.durationMinutes) || 120)),
        travelDurationMinutes: Math.max(0, Math.round(stop.travelDurationMinutes ?? 0)),
        latitude: stop.place?.latitude,
        longitude: stop.place?.longitude,
        notes: (stop.notes ?? "").trim().slice(0, 1000) || null,
        isLocked: Boolean(stop.isLocked),
      };
    }),
  }));
}

export function reorderStopsInDay(days: EditableItineraryDay[], dayId: string, fromIndex: number, toIndex: number) {
  const next = structuredClone(days);
  const day = next.find((item) => item.id === dayId);
  if (!day || fromIndex === toIndex) return days;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= day.stops.length || toIndex >= day.stops.length) return days;
  const [moved] = day.stops.splice(fromIndex, 1);
  day.stops.splice(toIndex, 0, moved);
  return packItinerarySchedule(next);
}

export function firstStopMeetingLabel(days: EditableItineraryDay[]) {
  const stop = days[0]?.stops[0];
  return stop?.customTitle || stop?.place?.name || stop?.place?.formattedAddress || "";
}

export function applyPublicMeetingPoint(days: EditableItineraryDay[], isPublic: boolean) {
  if (!days.length) return days;
  return days.map((day, dayIndex) => ({
    ...day,
    stops: day.stops.map((stop, stopIndex) => {
      const isMeeting = isPublic && dayIndex === 0 && stopIndex === 0;
      if (isMeeting) {
        return {
          ...stop,
          activityType: "Titik kumpul",
          notes: stop.notes?.includes("Titik kumpul publik")
            ? stop.notes
            : ["Titik kumpul publik. Berkumpul di sini sebelum itinerary dimulai.", stop.notes].filter(Boolean).join(" "),
        };
      }
      if (!isPublic && stop.activityType === "Titik kumpul") {
        return { ...stop, activityType: "Wisata" };
      }
      return stop;
    }),
  }));
}

export function tripTitleFromDestination(destinationCity: string, templateTitle = "") {
  if (templateTitle.trim()) return templateTitle.trim();
  const destination = destinationCity.trim();
  return destination.length >= 3 ? `Trip ke ${destination}` : "Trip DOLAN";
}

export function availableBudgetPool(budgetAmount: number, budgetBasis: "PER_PERSON" | "GROUP", partySize: number) {
  if (!(budgetAmount > 0)) return 0;
  return budgetBasis === "PER_PERSON" ? budgetAmount * Math.max(1, partySize) : budgetAmount;
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.max(0, Math.round(amount)));
}

export type StopBudgetLine = {
  key: "ticket" | "food" | "transport";
  label: string;
  amount: number;
  detail: string;
};

export type StopBudgetEstimate = {
  stopId: string;
  ticketCost: number;
  foodCost: number;
  travelCost: number;
  visitCost: number;
  total: number;
  lines: StopBudgetLine[];
};

export type ItineraryBudgetPlan = {
  byStopId: Record<string, StopBudgetEstimate>;
  total: number;
  remaining: number;
  pool: number;
  overBudget: boolean;
};

function ticketEstimate(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  if (
    /bundaran hi|hotel indonesia|braga|malioboro|alun-?alun|tugu yogyakarta|^tugu\b|cihampelas|asia afrika|kota tua|suryakencana|taman kencana|gedung sate|monumen nasional|\bmonas\b|simpang lima|jembatan merah|jodipan/.test(
      value,
    )
  ) {
    return 0;
  }
  if (/bromo|ijen|kawah|rinjani|padar|komodo|kerinci|penanjakan/.test(value)) return 150_000;
  if (/candi|pura|tanah lot|uluwatu|keraton|museum|taman nasional|tangkuban|kebun raya|borobudur|prambanan|lawang sewu|sampoerna|angkut/.test(value)) {
    return 50_000;
  }
  if (/ancol|pantai|gili|coban/.test(value)) return 25_000;
  return 0;
}

function foodEstimate(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  if (/bromo|ijen|kawah/.test(value)) return 40_000;
  return 55_000;
}

export type TransportLegEstimate = {
  mode: "start" | "walk" | "ojek" | "drive";
  km: number;
  cost: number;
  label: string;
};

export function estimateTransportLeg(input: {
  km: number;
  minutes?: number;
  placeName?: string;
  isFirstOfDay?: boolean;
}): TransportLegEstimate {
  const km = Math.max(0, input.km);
  const name = (input.placeName ?? "").toLocaleLowerCase("id-ID");
  if (input.isFirstOfDay || (km <= 0 && !(input.minutes && input.minutes > 0))) {
    return { mode: "start", km: 0, cost: 0, label: "Titik awal hari" };
  }
  if (/bromo|ijen|penanjakan/.test(name)) {
    const minutes = input.minutes ?? Math.round((km / 32) * 60);
    return {
      mode: "drive",
      km,
      cost: Math.max(minutes ? 180_000 : 0, minutes * 4_000),
      label: `Jeep / transport kawasan ~${km.toFixed(1)} km`,
    };
  }
  if (km < 1) {
    return { mode: "walk", km, cost: 0, label: `Jalan kaki ~${Math.max(0.1, km).toFixed(1)} km` };
  }
  if (km <= 25) {
    return {
      mode: "ojek",
      km,
      cost: Math.max(12_000, Math.round(km * 4_500)),
      label: `Ojek / transport lokal ~${km.toFixed(1)} km`,
    };
  }
  return {
    mode: "drive",
    km,
    cost: Math.max(75_000, Math.round(km * 6_500)),
    label: `Perjalanan antar-kota ~${km.toFixed(1)} km`,
  };
}

function stopCoord(stop: EditableItineraryDay["stops"][number]) {
  const lat = stop.place?.latitude;
  const lng = stop.place?.longitude;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

export function dayRouteSummary(day: EditableItineraryDay) {
  let totalKm = 0;
  let totalMinutes = 0;
  for (let index = 1; index < day.stops.length; index += 1) {
    const previous = day.stops[index - 1]!;
    const stop = day.stops[index]!;
    const from = stopCoord(previous);
    const to = stopCoord(stop);
    if (from && to) totalKm += haversineKm(from, to);
    totalMinutes += Math.max(0, stop.travelDurationMinutes ?? 0);
  }
  return {
    stopCount: day.stops.length,
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes,
  };
}

export function estimateItineraryBudget(
  days: EditableItineraryDay[],
  pool: number,
  partySize = 1,
): ItineraryBudgetPlan {
  const people = Math.max(1, partySize);
  const stops = days.flatMap((day) => day.stops);
  if (!stops.length) {
    return { byStopId: {}, total: 0, remaining: Math.max(0, pool), pool, overBudget: false };
  }
  const byStopId: Record<string, StopBudgetEstimate> = {};
  let allocated = 0;
  days.forEach((day) => {
    day.stops.forEach((stop, index) => {
      const placeName = stop.customTitle || stop.place?.name || "tempat ini";
      const ticketCost = ticketEstimate(placeName) * people;
      const foodCost = foodEstimate(placeName) * people;
      const previous = day.stops[index - 1];
      const from = previous ? stopCoord(previous) : null;
      const to = stopCoord(stop);
      const km = from && to
        ? haversineKm(from, to)
        : stop.travelDurationMinutes
          ? (stop.travelDurationMinutes / 60) * 32
          : 0;
      const leg = estimateTransportLeg({
        km,
        minutes: stop.travelDurationMinutes ?? 0,
        placeName,
        isFirstOfDay: index === 0,
      });
      const travelCost = leg.cost;
      const visitCost = ticketCost + foodCost;
      const total = visitCost + travelCost;
      byStopId[stop.id] = {
        stopId: stop.id,
        ticketCost,
        foodCost,
        travelCost,
        visitCost,
        total,
        lines: [
          ...(ticketCost > 0
            ? [{ key: "ticket" as const, label: "Tiket", amount: ticketCost, detail: `Tiket masuk / kawasan ${placeName} × ${people} orang` }]
            : []),
          { key: "food", label: "Makanan", amount: foodCost, detail: `Makan di sekitar ${placeName} × ${people} orang` },
          {
            key: "transport",
            label: "Transportasi",
            amount: travelCost,
            detail: index === 0
              ? "Titik awal hari"
              : stop.travelDurationMinutes
                ? `${leg.label} · ~${stop.travelDurationMinutes} menit`
                : leg.label,
          },
        ],
      };
      allocated += total;
    });
  });
  return {
    byStopId,
    total: allocated,
    remaining: pool - allocated,
    pool,
    overBudget: pool > 0 && allocated > pool,
  };
}

export function budgetItemsFromPlan(days: EditableItineraryDay[], plan: ItineraryBudgetPlan): BudgetItemInput[] {
  return days.flatMap((day) => day.stops.flatMap((stop) => {
    const cost = plan.byStopId[stop.id];
    const placeName = stop.customTitle || stop.place?.name || "Kunjungan";
    return (cost?.lines ?? [{ key: "ticket" as const, label: "Tiket", amount: 0, detail: placeName }]).map((line) => ({
      category: line.key === "ticket" ? "ACTIVITIES" : line.key === "food" ? "FOOD" : "TRANSPORT_LOCAL",
      label: `${line.label} · ${placeName}`,
      quantity: "1",
      unit: "orang",
      unitCostLow: String(line.amount),
      unitCostHigh: String(line.amount),
      sourceType: "ESTIMATE",
      notes: line.detail,
    }));
  }));
}

export function validateWizardBasics(input: {
  destinationCity: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  partySize: number;
}) {
  const errors: Record<string, string> = {};
  if (!input.destinationCity.trim()) errors.destinationCity = "Destinasi wajib diisi";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) errors.startDate = "Tanggal mulai wajib diisi";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) errors.endDate = "Tanggal selesai wajib diisi";
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = "Tanggal selesai tidak boleh sebelum tanggal mulai";
  }
  if (!(input.budgetAmount > 0)) errors.budgetAmount = "Budget harus lebih dari 0";
  if (!Number.isInteger(input.partySize) || input.partySize < 1) errors.partySize = "Minimal 1 orang";
  return errors;
}

export function remainingRegenerates(used: number, max = MAX_ITINERARY_REGENERATES) {
  return Math.max(0, max - used);
}

export function canRegenerate(used: number, max = MAX_ITINERARY_REGENERATES) {
  return remainingRegenerates(used, max) > 0;
}

export function moveStopInDay(days: EditableItineraryDay[], dayId: string, index: number, direction: -1 | 1) {
  return reorderStopsInDay(days, dayId, index, index + direction);
}

export function itineraryMapMarkers(
  days: EditableItineraryDay[],
  selectedStopId: string | null,
) {
  return days.flatMap((day) =>
    day.stops.flatMap((stop) => {
      const latitude = stop.place?.latitude ?? 0;
      const longitude = stop.place?.longitude ?? 0;
      if (!stop.place || (latitude === 0 && longitude === 0)) return [];
      return [{
        id: stop.id,
        label: stop.customTitle || stop.place.name,
        latitude,
        longitude,
        selected: stop.id === selectedStopId,
      }];
    }),
  );
}

export function itineraryMapRouteGroups(days: EditableItineraryDay[]) {
  return days
    .map((day) => itineraryMapMarkers([day], null))
    .filter((group) => group.length >= 2);
}

type StopWithCoords = EditableItineraryDay["stops"][number] & {
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string | null;
};

function usableCoord(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

export function hydrateItineraryPlaces(days: EditableItineraryDay[], city: string): EditableItineraryDay[] {
  return days.map((day) => ({
    ...day,
    stops: day.stops.map((item) => {
      const stop = item as StopWithCoords;
      const name = stop.customTitle?.trim() || stop.place?.name || "Titik rute";
      const resolved = placeFromTemplateStop(name, city || stop.place?.city || "Indonesia");
      const latitude = usableCoord(stop.place?.latitude)
        ? stop.place!.latitude
        : usableCoord(stop.latitude)
          ? stop.latitude!
          : resolved.latitude;
      const longitude = usableCoord(stop.place?.longitude)
        ? stop.place!.longitude
        : usableCoord(stop.longitude)
          ? stop.longitude!
          : resolved.longitude;
      return {
        ...stop,
        customTitle: name,
        place: {
          ...resolved,
          ...stop.place,
          googlePlaceId: stop.place?.googlePlaceId || stop.googlePlaceId || resolved.googlePlaceId,
          name: stop.place?.name || name,
          city: stop.place?.city || city || resolved.city,
          latitude,
          longitude,
          formattedAddress: stop.place?.formattedAddress || `${name}, ${city || resolved.city}`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${latitude},${longitude}`)}`,
        },
      };
    }),
  }));
}

export function googleMapsDirectionsUrl(markers: Array<{ latitude: number; longitude: number }>) {
  if (!markers.length) return null;
  const origin = `${markers[0].latitude},${markers[0].longitude}`;
  if (markers.length === 1) return `https://www.google.com/maps/search/?api=1&query=${origin}`;
  const destination = markers.at(-1)!;
  const waypoints = markers.slice(1, -1).slice(0, 8).map((marker) => `${marker.latitude},${marker.longitude}`).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.latitude},${destination.longitude}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}

export function applyTemplatePrefill(template: Pick<ItineraryTemplateDetail, "title" | "city" | "transportMode">) {
  return {
    title: template.title,
    destinationCity: template.city,
    transport: template.transportMode || "Transportasi umum + sewa lokal",
  };
}
