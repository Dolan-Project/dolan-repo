import {
  saveItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type GenerationJob,
  type ItineraryEditorSnapshot,
  type SaveItineraryVersionInput,
  type TripChecklistItem,
} from "@dolan/shared";
import { createBudgetSummary } from "./mock-data";

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

export async function getItineraryEditor(tripId: string): Promise<ItineraryEditorSnapshot> {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: ItineraryEditorSnapshot;
    error?: { message?: string };
  };
  if (response.ok && payload.success && payload.data) {
    return payload.data;
  }
  throw new Error(payload.error?.message ?? "Gagal memuat itinerary dari server.");
}

export async function saveItineraryVersion(
  snapshot: ItineraryEditorSnapshot,
  input: SaveItineraryVersionInput,
): Promise<ItineraryEditorSnapshot> {
  const parsed = saveItineraryVersionSchema.parse(input);
  if (
    Object.keys(
      findScheduleConflicts(
        parsed.days.map((day) => ({
          ...day,
          stops: day.stops.map((stop) => ({ ...stop, place: null })),
        })),
      ),
    ).length
  ) {
    throw new Error("Jadwal masih bertumpuk. Perbaiki waktu sebelum menyimpan.");
  }
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(snapshot.tripId)}/itinerary-versions`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed),
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: ItineraryEditorSnapshot;
    error?: { message?: string };
  };
  if (response.ok && payload.success && payload.data) return payload.data;
  throw new Error(payload.error?.message ?? "Gagal menyimpan versi itinerary.");
}

export async function selectItineraryVersion(tripId: string, versionId: string) {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/current-itinerary-version`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ versionId }),
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: ItineraryEditorSnapshot;
    error?: { message?: string };
  };
  if (response.ok && payload.success && payload.data) return payload.data;
  throw new Error(payload.error?.message ?? "Gagal memilih versi itinerary.");
}

export async function upsertChecklistItem(
  tripId: string,
  input: { id?: string; title: string; dueDate?: string | null; isCompleted?: boolean },
): Promise<TripChecklistItem> {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/checklist`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      title: input.title,
      dueDate: input.dueDate ?? null,
      isCompleted: input.isCompleted ?? false,
    }),
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: TripChecklistItem & { dueDate?: string | null; isCompleted?: boolean };
    error?: { message?: string };
  };
  if (response.ok && payload.success && payload.data) {
    return {
      id: payload.data.id,
      title: payload.data.title,
      dueDate: payload.data.dueDate ?? null,
      isCompleted: Boolean(payload.data.isCompleted),
    };
  }
  throw new Error(payload.error?.message ?? "Gagal menyimpan checklist.");
}

export async function deleteChecklistItem(tripId: string, itemId: string) {
  const response = await fetch(
    `/api/v1/trips/${encodeURIComponent(tripId)}/checklist/${encodeURIComponent(itemId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const payload = (await response.json()) as { success: boolean; error?: { message?: string } };
  if (response.ok && payload.success) return;
  throw new Error(payload.error?.message ?? "Gagal menghapus checklist.");
}

async function pollJob(jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(1500);
    const response = await fetch(`/api/v1/generation-jobs/${encodeURIComponent(jobId)}`, {
      credentials: "include",
    });
    const payload = (await response.json()) as { success: boolean; data?: GenerationJob };
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
    const payload = (await response.json()) as {
      success: boolean;
      data?: GenerationJob;
      error?: { message?: string };
    };
    if (!response.ok || !payload.success || !payload.data?.id) {
      throw new Error(payload.error?.message ?? "Gagal memulai generate itinerary.");
    }
    const job = await pollJob(payload.data.id);
    if (job?.status === "SUCCEEDED") {
      const next = await getItineraryEditor(snapshot.tripId);
      return { snapshot: next, job };
    }
    if (job?.status === "FAILED") {
      throw new Error("Generate gagal. Draft dan versi aktif tidak berubah.");
    }
    throw new Error("Generate masih berjalan terlalu lama. Muat ulang halaman lalu cek versi itinerary.");
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
  return {
    snapshot: {
      ...snapshot,
      versions: [
        {
          id: `version-${versionNumber}`,
          tripId: snapshot.tripId,
          versionNumber,
          source: "REGENERATED" as const,
          summary:
            regenerateMode === "cheaper"
              ? "Alternatif hemat (mock). Destinasi terkunci tetap dipertahankan."
              : "Alternatif AI (mock). Destinasi terkunci tetap dipertahankan.",
          assumptions: ["Mode mock — bukan hasil Groq"],
          days: generatedDays,
          budget: createBudgetSummary(budgetItems),
          createdAt: new Date().toISOString(),
        },
        ...snapshot.versions,
      ],
    },
    job: null,
  };
}
