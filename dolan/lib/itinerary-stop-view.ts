import type { EditableItineraryDay, EditableItineraryStop, ItinerarySource } from "@dolan/shared";
import { haversineKm } from "@/lib/route-optimize";

function minutesToClock(total: number) {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clockToMinutes(clock: string) {
  const match = clock.trim().match(/^(\d{1,2}):([0-5]\d)/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function visitWindowText(startTime: string | null | undefined, durationMinutes: number) {
  if (!startTime) return "";
  return `${startTime}–${minutesToClock(clockToMinutes(startTime) + Math.max(15, durationMinutes))}`;
}

export const TOTAL_ESTIMATE_LABEL = "Total estimasi (harga tiket & transportasi dapat berubah)";

const SYSTEM_NOTE =
  /google places?|placeholder|ditampilkan dari|googlePlaceId|instruksi|ChIJ[A-Za-z0-9_-]+|field google|TODO\b|\[\[|\]\]|internal prompt|system prompt/i;

const LARGE_AREA_GATES: Array<{ test: RegExp; gate: string; minMinutes: number }> = [
  { test: /bromo|penanjakan/, gate: "Penanjakan / kawasan Laut Pasir", minMinutes: 240 },
  { test: /ijen|kawah ijen/, gate: "Paltuding menuju bibir kawah", minMinutes: 240 },
  { test: /rinjani/, gate: "Sembalun atau Senaru", minMinutes: 240 },
  { test: /komodo|padar/, gate: "Loh Liang / trekking Padar", minMinutes: 240 },
  { test: /borobudur/, gate: "kompleks Candi Borobudur", minMinutes: 180 },
  { test: /prambanan/, gate: "kompleks Candi Prambanan", minMinutes: 180 },
  { test: /taman nasional|kawasan konservasi/, gate: "gerbang masuk kawasan yang dituju", minMinutes: 180 },
];

export function stopDisplayNumber(stop: { sequence?: number | null }, fallbackIndex: number) {
  const sequence = stop.sequence;
  if (typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0) return sequence;
  return fallbackIndex + 1;
}

export function stopPinColorIndex(stop: { sequence?: number | null }, fallbackIndex: number) {
  return Math.max(0, stopDisplayNumber(stop, fallbackIndex) - 1);
}

export function roundEstimateRupiah(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 1_000) return Math.round(amount / 100) * 100;
  return Math.round(amount / 1_000) * 1_000;
}

export function isLargeAreaPoi(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  return LARGE_AREA_GATES.some((item) => item.test.test(value));
}

export function largeAreaGate(name: string) {
  const value = name.toLocaleLowerCase("id-ID");
  return LARGE_AREA_GATES.find((item) => item.test.test(value)) ?? null;
}

export function suggestedVisitMinutes(name: string, durationMinutes: number) {
  const gate = largeAreaGate(name);
  const baseline = Math.max(15, durationMinutes || 60);
  if (!gate) return Math.min(480, baseline);
  return Math.min(480, Math.max(baseline, gate.minMinutes));
}

export type TravelVehicle = "walk" | "ojek" | "drive" | "jeep" | "boat";

export type StopTravelAnalysis = {
  vehicle: TravelVehicle;
  vehicleLabel: string;
  km: number;
  minutes: number;
  label: string;
};

function stopCoords(stop?: EditableItineraryStop | null) {
  const lat = stop?.place?.latitude;
  const lng = stop?.place?.longitude;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

export function chooseTravelVehicle(km: number, placeName: string): TravelVehicle {
  const name = placeName.toLocaleLowerCase("id-ID");
  if (/komodo|padar|gili|penida|nusa lembongan|ferry|kapal/.test(name) && km >= 1.5) return "boat";
  if (/bromo|ijen|penanjakan/.test(name)) return "jeep";
  if (km < 1) return "walk";
  if (km <= 15) return "ojek";
  return "drive";
}

/** Straight-line km undercounts winding Indonesian roads; skip when Maps already gave road meters. */
export function roadAdjustedKm(straightKm: number, vehicle: TravelVehicle) {
  if (!(straightKm > 0)) return 0;
  if (vehicle === "boat") return straightKm;
  if (vehicle === "walk") return straightKm * 1.12;
  if (vehicle === "jeep") return straightKm * 1.5;
  if (straightKm < 3) return straightKm * 1.45;
  if (straightKm < 15) return straightKm * 1.38;
  if (straightKm < 40) return straightKm * 1.3;
  return straightKm * 1.22;
}

export function vehicleLabel(vehicle: TravelVehicle) {
  if (vehicle === "walk") return "Jalan kaki";
  if (vehicle === "ojek") return "Ojek";
  if (vehicle === "drive") return "Mobil";
  if (vehicle === "jeep") return "Jeep";
  return "Kapal";
}

export function minutesForVehicleKm(km: number, vehicle: TravelVehicle) {
  const overhead = vehicle === "walk" ? 0 : vehicle === "ojek" ? 4 : vehicle === "boat" ? 12 : 8;
  const speedKmh = vehicle === "walk" ? 4.2
    : vehicle === "ojek" ? (km < 8 ? 22 : 26)
    : vehicle === "jeep" ? 18
    : vehicle === "boat" ? 22
    : km < 25 ? 28
      : km < 80 ? 40
        : 50;
  const moving = (km / speedKmh) * 60;
  const minimum = vehicle === "walk" ? 4 : vehicle === "ojek" ? 8 : 12;
  return Math.min(480, Math.max(minimum, Math.round(overhead + moving)));
}

export function formatKmLabel(km: number) {
  if (!(km > 0)) return null;
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  const digits = km >= 100 ? 0 : 1;
  return `${km.toFixed(digits).replace(".", ",")} km`;
}

export function formatVehicleTravelLabel(vehicle: TravelVehicle, km: number, minutes: number) {
  const distance = formatKmLabel(km);
  const duration = formatCompactMinutes(minutes);
  return [vehicleLabel(vehicle), distance, duration].filter(Boolean).join(" · ");
}

export function formatCompactMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} mnt`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours} j ${rest} mnt` : `${hours} jam`;
}

export function analyzeStopTravel(
  stop: EditableItineraryStop,
  previous: EditableItineraryStop | null | undefined,
  isFirst: boolean,
): StopTravelAnalysis | null {
  if (isFirst || !previous) return null;
  const from = stopCoords(previous);
  const to = stopCoords(stop);
  const straightKm = from && to ? haversineKm(from, to) : null;
  const routedKm = stop.travelDistanceMeters != null && stop.travelDistanceMeters > 0
    ? stop.travelDistanceMeters / 1000
    : null;
  const seedKm = routedKm ?? straightKm;
  if (seedKm == null || seedKm <= 0) return null;
  const name = stop.customTitle || stop.place?.name || "";
  const seedVehicle = chooseTravelVehicle(seedKm, name);
  const km = routedKm ?? roadAdjustedKm(straightKm ?? seedKm, seedVehicle);
  if (!(km > 0)) return null;
  const vehicle = chooseTravelVehicle(km, name);
  const minutes = minutesForVehicleKm(km, vehicle);
  return {
    vehicle,
    vehicleLabel: vehicleLabel(vehicle),
    km,
    minutes,
    label: formatVehicleTravelLabel(vehicle, km, minutes),
  };
}

export function scheduleGapMinutes(
  stop: EditableItineraryStop,
  previous: EditableItineraryStop | null | undefined,
  index: number,
) {
  if (index === 0) return 0;
  const analyzed = analyzeStopTravel(stop, previous, false)?.minutes;
  if (analyzed != null) return Math.max(12, Math.min(480, analyzed));
  return isLargeAreaPoi(stop.customTitle || stop.place?.name || "") ? 45 : 15;
}

export function packedTravelMinutes(
  stop: EditableItineraryStop,
  previous: EditableItineraryStop | null | undefined,
  index: number,
) {
  if (index === 0) return 0;
  return analyzeStopTravel(stop, previous, false)?.minutes ?? null;
}

export function formatTravelToStop(
  stop: EditableItineraryStop,
  previous: EditableItineraryStop | null | undefined,
  isFirst: boolean,
) {
  return analyzeStopTravel(stop, previous, isFirst)?.label ?? null;
}

export function sanitizeStopNotes(notes: string | null | undefined) {
  if (!notes?.trim()) return null;
  const cleaned = notes
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !SYSTEM_NOTE.test(line))
    .join(" ")
    .replace(SYSTEM_NOTE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || null;
}

export function stopPlaceHeading(stop: EditableItineraryStop) {
  const name = (stop.customTitle || stop.place?.name || "Titik rute").trim();
  const dashed = name.split(/\s+[–—-]\s+/);
  if (dashed.length > 1) {
    return { name: dashed[0]!.trim(), subLocation: dashed.slice(1).join(" — ").trim() };
  }
  const gate = largeAreaGate(name);
  return { name, subLocation: gate?.gate ?? null };
}

export function activityTypeLabel(type: string | null | undefined) {
  const value = (type ?? "").trim().toLocaleLowerCase("id-ID");
  if (!value) return "Kunjungan";
  if (value.includes("kumpul") || value === "meet") return "Titik kumpul";
  if (value === "visit" || value === "wisata") return "Kunjungan";
  if (value === "meal" || value === "makan") return "Makan";
  if (value === "travel" || value === "transport") return "Perjalanan";
  return type!.trim();
}

export function visitWindowSummary(startTime: string | null | undefined, durationMinutes: number) {
  const duration = Math.max(15, durationMinutes || 60);
  const window = visitWindowText(startTime, duration);
  return {
    duration,
    window,
    label: window ? `${window} · ${duration} mnt` : `${duration} mnt`,
  };
}

export function ticketLineDetail(placeName: string, people: number, verified = false) {
  const base = `Tiket masuk ${placeName} × ${people} orang`;
  if (verified) return base;
  return `${base} — estimasi, perlu dicek di lokasi/situs resmi`;
}

export function stopDescription(stop: EditableItineraryStop) {
  return sanitizeStopNotes(stop.notes);
}

export function itineraryListNumbers(days: EditableItineraryDay[]) {
  return days.flatMap((day) =>
    day.stops.map((stop, index) => ({
      id: stop.id,
      number: stopDisplayNumber(stop, index),
    })),
  );
}

export function formatItineraryDateRange(startDate: string, endDate: string) {
  const format = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  };
  if (!startDate && !endDate) return "Tanggal belum diisi";
  if (!endDate || endDate === startDate) return format(startDate);
  return `${format(startDate)} - ${format(endDate)}`;
}

export function itinerarySourceLabel(source: ItinerarySource | string) {
  if (source === "AI") return "Dari AI";
  if (source === "TEMPLATE") return "Dari template";
  if (source === "REGENERATED") return "Hasil regenerate";
  return "Disusun manual";
}

export function itineraryVersionOptionLabel(versionNumber: number, source: ItinerarySource | string, isActive: boolean) {
  return `Versi ${versionNumber} - ${itinerarySourceLabel(source)}${isActive ? " - Sedang dipakai" : ""}`;
}
