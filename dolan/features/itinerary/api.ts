import {
  saveItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type EditableItineraryVersion,
  type ItineraryEditorSnapshot,
  type SaveItineraryVersionInput,
} from "@dolan/shared";
import { createBudgetSummary, createEditorSnapshot, PLACE_CANDIDATES } from "./mock-data";

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T,>(value: T): T => structuredClone(value);

export function findScheduleConflicts(days: EditableItineraryDay[]) {
  const conflicts: Record<string, string> = {};
  for (const day of days) {
    for (let index = 1; index < day.stops.length; index += 1) {
      const previous = day.stops[index - 1];
      const current = day.stops[index];
      if (!previous.startTime || !current.startTime) continue;
      const minutes = (time: string) => {
        const [hours, mins] = time.split(":").map(Number);
        return hours * 60 + mins;
      };
      const earliest = minutes(previous.startTime) + previous.durationMinutes + (current.travelDurationMinutes ?? 0);
      if (minutes(current.startTime) < earliest) {
        conflicts[current.id] = `Mulai terlalu cepat. Jadwal paling awal ${String(Math.floor(earliest / 60) % 24).padStart(2, "0")}:${String(earliest % 60).padStart(2, "0")}.`;
      }
    }
  }
  return conflicts;
}

export async function getItineraryEditor(tripId: string) {
  await wait();
  return createEditorSnapshot(tripId);
}

export async function saveItineraryVersion(
  snapshot: ItineraryEditorSnapshot,
  input: SaveItineraryVersionInput,
): Promise<ItineraryEditorSnapshot> {
  const parsed = saveItineraryVersionSchema.parse(input);
  if (Object.keys(findScheduleConflicts(parsed.days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => ({ ...stop, place: null })),
  })))).length) {
    throw new Error("Jadwal masih bertumpuk. Perbaiki waktu sebelum menyimpan.");
  }
  await wait(420);
  const versionNumber = Math.max(...snapshot.versions.map((item) => item.versionNumber)) + 1;
  const version: EditableItineraryVersion = {
    id: `version-${versionNumber}`,
    tripId: snapshot.tripId,
    versionNumber,
    source: "MANUAL",
    summary: parsed.summary,
    assumptions: ["Perubahan dibuat melalui editor", "Budget dihitung ulang oleh server"],
    days: clone(parsed.days).map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        const original = snapshot.versions.flatMap((item) => item.days).flatMap((dayItem) => dayItem.stops).find((item) => item.id === stop.id);
        const candidate = PLACE_CANDIDATES.find((item) => item.googlePlaceId === stop.googlePlaceId);
        return { ...stop, place: original?.place ?? candidate ?? null };
      }),
    })),
    budget: createBudgetSummary(parsed.budgetItems),
    createdAt: new Date().toISOString(),
  };
  return { ...snapshot, activeVersionId: version.id, versions: [version, ...snapshot.versions] };
}

export async function generateAlternative(
  snapshot: ItineraryEditorSnapshot,
  baseDays: EditableItineraryDay[],
  budgetItems: BudgetItemInput[],
) {
  await wait(900);
  const versionNumber = Math.max(...snapshot.versions.map((item) => item.versionNumber)) + 1;
  const generatedDays = clone(baseDays).map((day) => ({
    ...day,
    stops: day.stops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
      notes: stop.isLocked ? stop.notes : `${stop.notes ?? ""} Dioptimalkan AI berdasarkan rute terdekat.`.trim(),
    })),
  }));
  const generated: EditableItineraryVersion = {
    id: `version-${versionNumber}`,
    tripId: snapshot.tripId,
    versionNumber,
    source: "REGENERATED",
    summary: "Alternatif AI baru. Destinasi terkunci tetap dipertahankan.",
    assumptions: ["Destinasi terkunci tidak diubah", "Waktu tempuh adalah estimasi"],
    days: generatedDays,
    budget: createBudgetSummary(budgetItems),
    createdAt: new Date().toISOString(),
  };
  return { ...snapshot, versions: [generated, ...snapshot.versions] };
}
