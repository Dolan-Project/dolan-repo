import {
  saveItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type EditableItineraryVersion,
  type GenerationJob,
  type ItineraryEditorSnapshot,
  type SaveItineraryVersionInput,
} from "@dolan/shared";
import { hydrateItineraryPlaces } from "@/lib/template-itinerary";
import { createBudgetSummary, createEditorSnapshot } from "./mock-data";

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T,>(value: T): T => structuredClone(value);

export function findScheduleConflicts(days: EditableItineraryDay[]) {
  const conflicts: Record<string, string> = {};
  const minutes = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  };
  for (const day of days) {
    for (let index = 1; index < day.stops.length; index += 1) {
      const previous = day.stops[index - 1];
      const current = day.stops[index];
      if (!previous.startTime || !current.startTime) continue;
      const previousStart = minutes(previous.startTime);
      const currentStart = minutes(current.startTime);
      const earliest = previousStart + previous.durationMinutes + (current.travelDurationMinutes ?? 0);
      const currentAdjusted = currentStart < previousStart ? currentStart + 24 * 60 : currentStart;
      if (currentAdjusted < earliest) {
        conflicts[current.id] = `Mulai terlalu cepat. Jadwal paling awal ${String(Math.floor(earliest / 60) % 24).padStart(2, "0")}:${String(earliest % 60).padStart(2, "0")}.`;
      }
    }
  }
  return conflicts;
}

export async function getItineraryEditor(tripId: string) {
  const fallback = createEditorSnapshot(tripId);
  try {
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json() as { success: boolean; data?: ItineraryEditorSnapshot };
    if (response.ok && payload.success && payload.data) {
      if (payload.data.versions.length === 0) {
        return { ...fallback, ...payload.data, versions: fallback.versions, activeVersionId: fallback.activeVersionId };
      }
      return payload.data;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function saveInputErrorMessage(error: { issues?: Array<{ message?: string }> }) {
  const first = error.issues?.[0]?.message ?? "";
  if (first.toLowerCase().includes("waktu")) return first;
  return "Itinerary belum bisa disimpan. Cek jam, durasi, dan nama tempat.";
}

export async function saveItineraryVersion(
  snapshot: ItineraryEditorSnapshot,
  input: SaveItineraryVersionInput,
): Promise<ItineraryEditorSnapshot> {
  const parsedResult = saveItineraryVersionSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new Error(saveInputErrorMessage(parsedResult.error));
  }
  const parsed = parsedResult.data;
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(snapshot.tripId)}/itinerary-versions`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed),
  });
  const payload = await response.json() as { success: boolean; data?: ItineraryEditorSnapshot; error?: { message?: string } };
  if (response.ok && payload.success && payload.data?.versions.length) {
    return {
      ...payload.data,
      versions: payload.data.versions.map((version) => ({
        ...version,
        days: hydrateItineraryPlaces(version.days, payload.data?.destinationCity || snapshot.destinationCity),
      })),
    };
  }

  await wait(420);
  const versionNumber = Math.max(...snapshot.versions.map((item) => item.versionNumber), 0) + 1;
  const version: EditableItineraryVersion = {
    id: `version-${versionNumber}`,
    tripId: snapshot.tripId,
    versionNumber,
    source: "MANUAL",
    summary: parsed.summary,
    assumptions: ["Perubahan dibuat melalui editor", "Budget dihitung ulang oleh server"],
    days: hydrateItineraryPlaces(clone(parsed.days).map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        const original = snapshot.versions.flatMap((item) => item.days).flatMap((dayItem) => dayItem.stops).find((item) => item.id === stop.id);
        return {
          ...stop,
          place: original?.place ?? {
            googlePlaceId: stop.googlePlaceId ?? `tpl-${stop.id}`,
            name: stop.customTitle ?? "Titik rute",
            formattedAddress: `${stop.customTitle ?? "Titik rute"}, ${snapshot.destinationCity}`,
            city: snapshot.destinationCity,
            latitude: stop.latitude ?? original?.place?.latitude ?? 0,
            longitude: stop.longitude ?? original?.place?.longitude ?? 0,
            rating: null,
            userRatingCount: null,
            photoName: null,
            googleMapsUrl: null,
          },
        };
      }),
    })), snapshot.destinationCity),
    budget: createBudgetSummary(parsed.budgetItems),
    createdAt: new Date().toISOString(),
  };
  if (!payload.success && payload.error?.message) {
    throw new Error(payload.error.message);
  }
  return { ...snapshot, activeVersionId: version.id, versions: [version, ...snapshot.versions] };
}

export async function selectItineraryVersion(tripId: string, versionId: string) {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/current-itinerary-version`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ versionId }),
  });
  const payload = await response.json() as { success: boolean; data?: ItineraryEditorSnapshot };
  if (response.ok && payload.success && payload.data) return payload.data;
  return null;
}

async function pollJob(jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(1500);
    const response = await fetch(`/api/v1/generation-jobs/${encodeURIComponent(jobId)}`, { credentials: "include" });
    const payload = await response.json() as { success: boolean; data?: GenerationJob };
    if (!response.ok || !payload.success || !payload.data) continue;
    if (payload.data.status === "SUCCEEDED" || payload.data.status === "FAILED") return payload.data;
  }
  return null;
}

export async function generateAlternative(
  snapshot: ItineraryEditorSnapshot,
  baseDays: EditableItineraryDay[],
  budgetItems: BudgetItemInput[],
  regenerateMode: "balanced" | "cheaper" | "alternative" = "balanced",
) {
  const useLive = process.env.NEXT_PUBLIC_USE_MOCK_API === "false";
  if (useLive) {
  try {
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(snapshot.tripId)}/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: "REGENERATE_ITINERARY",
        idempotencyKey: crypto.randomUUID(),
        preferences: { regenerateMode },
      }),
    });
    const payload = await response.json() as { success: boolean; data?: GenerationJob; error?: { message?: string } };
    if (response.ok && payload.success && payload.data?.id) {
      const job = await pollJob(payload.data.id);
      if (job?.status === "SUCCEEDED") {
        const next = await getItineraryEditor(snapshot.tripId);
        return { snapshot: next, job };
      }
      if (job?.status === "FAILED") {
        throw new Error("Generate gagal. Draft dan versi aktif tidak berubah.");
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Generate gagal")) throw error;
  }
  }

  await wait(900);
  const versionNumber = Math.max(...snapshot.versions.map((item) => item.versionNumber), 0) + 1;
  const generatedDays = clone(baseDays).map((day) => ({
    ...day,
    stops: day.stops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
      notes: stop.isLocked
        ? stop.notes
        : `${stop.notes ?? ""} ${regenerateMode === "cheaper" ? "Dialihkan ke opsi hemat." : "Dioptimalkan AI berdasarkan rute terdekat."}`.trim(),
    })),
  }));
  const generated: EditableItineraryVersion = {
    id: `version-${versionNumber}`,
    tripId: snapshot.tripId,
    versionNumber,
    source: "REGENERATED",
    summary: regenerateMode === "cheaper" ? "Alternatif hemat dari Groq. Destinasi terkunci tetap dipertahankan." : "Alternatif AI baru. Destinasi terkunci tetap dipertahankan.",
    assumptions: ["Destinasi terkunci tidak diubah", "Waktu tempuh adalah estimasi"],
    days: generatedDays,
    budget: createBudgetSummary(budgetItems),
    createdAt: new Date().toISOString(),
  };
  return { snapshot: { ...snapshot, versions: [generated, ...snapshot.versions] }, job: null };
}
