import type {
  BudgetItemInput,
  EditableItineraryDay,
  EditableItineraryVersion,
  ItineraryEditorSnapshot,
  PlaceSummary,
} from "@dolan/shared";

const place = (
  googlePlaceId: string,
  name: string,
  city: string,
  latitude: number,
  longitude: number,
  rating: number,
): PlaceSummary => ({
  googlePlaceId,
  name,
  formattedAddress: `${name}, ${city}, Nusa Tenggara Timur`,
  city,
  latitude,
  longitude,
  rating,
  userRatingCount: null,
  photoName: null,
  googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
});

export const PLACE_CANDIDATES = [
  place("ChIJ-LBJ-Airport", "Bandara Komodo", "Labuan Bajo", -8.4867, 119.8891, 4.4),
  place("ChIJ-Padar-Island", "Pulau Padar", "Komodo", -8.6486, 119.5892, 4.9),
  place("ChIJ-Pink-Beach", "Pink Beach", "Komodo", -8.6031, 119.5196, 4.8),
  place("ChIJ-Manta-Point", "Manta Point", "Komodo", -8.5374, 119.6161, 4.8),
  place("ChIJ-Kanawa-Island", "Pulau Kanawa", "Labuan Bajo", -8.4902, 119.7587, 4.7),
] as const;

const stop = (
  id: string,
  sequence: number,
  candidateIndex: number,
  startTime: string,
  durationMinutes: number,
  travelDurationMinutes: number,
  isLocked = false,
) => ({
  id,
  sequence,
  place: PLACE_CANDIDATES[candidateIndex],
  customTitle: null,
  activityType: sequence === 1 ? "Transportasi" : "Wisata",
  startTime,
  durationMinutes,
  travelDurationMinutes,
  notes: sequence === 1 ? "Berkumpul 15 menit sebelum jadwal." : "Bawa air minum dan perlindungan matahari.",
  isLocked,
});

const baseDays: EditableItineraryDay[] = [
  {
    id: "day-1",
    dayNumber: 1,
    date: "2026-10-24",
    title: "Tiba dan berlayar menuju Padar",
    stops: [
      stop("stop-airport", 1, 0, "08:00", 60, 0, true),
      stop("stop-padar", 2, 1, "13:00", 180, 240, true),
    ],
  },
  {
    id: "day-2",
    dayNumber: 2,
    date: "2026-10-25",
    title: "Pantai dan kehidupan laut",
    stops: [
      stop("stop-pink", 1, 2, "08:00", 150, 45),
      stop("stop-manta", 2, 3, "11:30", 180, 60),
    ],
  },
  {
    id: "day-3",
    dayNumber: 3,
    date: "2026-10-26",
    title: "Santai sebelum kembali",
    stops: [stop("stop-kanawa", 1, 4, "09:00", 240, 75)],
  },
];

export const INITIAL_BUDGET_ITEMS: BudgetItemInput[] = [
  { category: "TRANSPORT", label: "Liveaboard dan transfer", quantity: "1", unit: "paket", unitCostLow: "1850000", unitCostHigh: "2300000", sourceType: "ESTIMATE", notes: "Estimasi per orang" },
  { category: "ACCOMMODATION", label: "Kabin kapal 3 malam", quantity: "3", unit: "malam", unitCostLow: "250000", unitCostHigh: "350000", sourceType: "ESTIMATE", notes: null },
  { category: "FOOD", label: "Makan dan air minum", quantity: "4", unit: "hari", unitCostLow: "125000", unitCostHigh: "175000", sourceType: "ESTIMATE", notes: null },
  { category: "TICKET", label: "Tiket kawasan konservasi", quantity: "1", unit: "orang", unitCostLow: "250000", unitCostHigh: "400000", sourceType: "ESTIMATE", notes: "Harga dapat berubah" },
];

export const createBudgetSummary = (items: BudgetItemInput[]) => {
  let low = 0;
  let high = 0;
  const checkedAt = new Date().toISOString();
  const mapped = items.map((item, index) => {
    const subtotalLow = Number(item.quantity) * Number(item.unitCostLow);
    const subtotalHigh = Number(item.quantity) * Number(item.unitCostHigh);
    low += subtotalLow;
    high += subtotalHigh;
    return {
      ...item,
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      subtotalLow: subtotalLow.toFixed(2),
      subtotalHigh: subtotalHigh.toFixed(2),
      checkedAt,
    };
  });
  return { currency: "IDR" as const, basis: "PER_PERSON" as const, totalLow: low.toFixed(2), totalHigh: high.toFixed(2), items: mapped };
};

const version = (id: string, versionNumber: number, source: EditableItineraryVersion["source"], days: EditableItineraryDay[]): EditableItineraryVersion => ({
  id,
  tripId: "komodo-4d3n",
  versionNumber,
  source,
  summary: versionNumber === 2 ? "Rute dipadatkan agar waktu berlayar lebih efisien." : "Rute awal dari template Komodo.",
  assumptions: ["Cuaca memungkinkan kapal berlayar", "Biaya dihitung per peserta"],
  days,
  budget: createBudgetSummary(INITIAL_BUDGET_ITEMS),
  createdAt: versionNumber === 2 ? "2026-09-13T04:15:00.000Z" : "2026-09-12T10:00:00.000Z",
});

export function createEditorSnapshot(tripId: string): ItineraryEditorSnapshot {
  const firstDays = structuredClone(baseDays).slice(0, 2);
  const currentDays = structuredClone(baseDays);
  return {
    tripId,
    tripTitle: "Sailing Liveaboard Phinisi Komodo 4D3N",
    destinationCity: "Labuan Bajo & Komodo",
    startDate: "2026-10-24",
    endDate: "2026-10-27",
    activeVersionId: "version-2",
    versions: [version("version-2", 2, "AI", currentDays), version("version-1", 1, "TEMPLATE", firstDays)],
    checklist: [
      { id: "check-1", title: "Konfirmasi tiket pesawat ke Labuan Bajo", dueDate: "2026-10-10", isCompleted: true },
      { id: "check-2", title: "Siapkan dry bag dan obat pribadi", dueDate: "2026-10-20", isCompleted: false },
      { id: "check-3", title: "Unduh itinerary untuk akses offline", dueDate: "2026-10-23", isCompleted: false },
    ],
  };
}
