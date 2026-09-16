import {
  saveItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type GenerationJob,
  type ItineraryEditorSnapshot,
  type SaveItineraryVersionInput,
  type TripChecklistItem,
} from "@dolan/shared";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { readApiJson } from "@/lib/auth/read-api-json";
import { createBudgetSummary } from "./mock-data";

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

export async function getItineraryEditor(tripId: string): Promise<ItineraryEditorSnapshot> {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readApiJson<{
    success: boolean;
    data?: ItineraryEditorSnapshot;
    error?: { message?: string };
  }>(response);
  if (response.ok && payload.success && payload.data) {
    return payload.data;
  }
  throw new Error(payload.error?.message ?? "Gagal memuat itinerary dari server.");
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

export type ItineraryGeneratePreferences = {
  destinationCity: string;
  startDate: string;
  endDate: string;
  partySize: number;
  budgetAmount: number;
  budgetBasis: "PER_PERSON" | "GROUP";
  transport?: string;
  regenerateMode?: "balanced" | "cheaper" | "alternative";
  minStopsPerDay?: number;
  maxStopsPerDay?: number;
};

function activeDays(snapshot: ItineraryEditorSnapshot): EditableItineraryDay[] {
  const active = snapshot.versions.find((version) => version.id === snapshot.activeVersionId);
  return active?.days ?? snapshot.versions[0]?.days ?? [];
}

/** First-paint / wizard generate: live → Groq job; mock → local multi-stop builder as stand-in. */
export async function generateInitialItinerary(input: {
  tripId: string;
  tripTitle: string;
  preferences: ItineraryGeneratePreferences;
  fallbackDays: EditableItineraryDay[];
  budgetItems: BudgetItemInput[];
  sourceLabel?: "AI" | "TEMPLATE";
}) {
  const useLive = !shouldUseMockApi();
  const preferences = {
    ...input.preferences,
    regenerateMode: input.preferences.regenerateMode ?? "balanced",
    minStopsPerDay: input.preferences.minStopsPerDay ?? 4,
    maxStopsPerDay: input.preferences.maxStopsPerDay ?? 6,
    requireDayCards: true,
  };

  if (useLive) {
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(input.tripId)}/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: "GENERATE_ITINERARY",
        idempotencyKey: crypto.randomUUID(),
        preferences,
      }),
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: GenerationJob;
      error?: { message?: string };
    };
    if (!response.ok || !payload.success || !payload.data?.id) {
      throw new Error(payload.error?.message ?? "Dolan belum bisa mulai menyusun itinerary. Coba lagi ya.");
    }
    const job = await pollJob(payload.data.id);
    if (job?.status === "SUCCEEDED") {
      const snapshot = await getItineraryEditor(input.tripId);
      const days = activeDays(snapshot);
      if (!days.length) {
        throw new Error("Dolan sudah selesai, tapi itinerary-nya masih kosong. Coba susun ulang ya.");
      }
      return { snapshot, days, job, fromGroq: true as const };
    }
    if (job?.status === "FAILED") {
      if (job.errorCode === "INVALID_GENERATION") {
        throw new Error(
          "Dolan belum yakin dengan beberapa tempat di rute ini. Coba susun ulang ya.",
        );
      }
      if (job.errorCode === "PROVIDER_UNAVAILABLE") {
        throw new Error(
          "Dolan lagi kesulitan terhubung ke peta. Coba beberapa saat lagi ya.",
        );
      }
      throw new Error(
        "Dolan belum bisa menyusun itinerary. Coba lagi ya.",
      );
    }
    throw new Error("Dolan masih menyusun terlalu lama. Muat ulang halaman, lalu coba lagi ya.");
  }

  await wait(900);
  const days = clone(input.fallbackDays);
  const snapshot: ItineraryEditorSnapshot = {
    tripId: input.tripId,
    tripTitle: input.tripTitle,
    destinationCity: input.preferences.destinationCity,
    startDate: input.preferences.startDate,
    endDate: input.preferences.endDate,
    activeVersionId: "wizard-v1",
    versions: [{
      id: "wizard-v1",
      tripId: input.tripId,
      versionNumber: 1,
      source: input.sourceLabel ?? "AI",
      summary: `Rencana perjalanan untuk ${input.preferences.destinationCity}.`,
      assumptions: [
        "Rencana awal dari Dolan. Kamu bisa ubah tempat atau urutannya.",
      ],
      days,
      budget: createBudgetSummary(input.budgetItems),
      createdAt: new Date().toISOString(),
    }],
    checklist: [],
  };
  return { snapshot, days, job: null, fromGroq: false as const };
}

export async function generateAlternative(
  snapshot: ItineraryEditorSnapshot,
  baseDays: EditableItineraryDay[],
  budgetItems: BudgetItemInput[],
  regenerateMode: "balanced" | "cheaper" | "alternative" = "balanced",
  preferences?: Partial<ItineraryGeneratePreferences>,
) {
  const useLive = !shouldUseMockApi();
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
        preferences: {
          regenerateMode,
          destinationCity: preferences?.destinationCity ?? snapshot.destinationCity,
          startDate: preferences?.startDate ?? snapshot.startDate,
          endDate: preferences?.endDate ?? snapshot.endDate,
          partySize: preferences?.partySize,
          budgetAmount: preferences?.budgetAmount,
          budgetBasis: preferences?.budgetBasis,
          minStopsPerDay: preferences?.minStopsPerDay ?? 4,
          maxStopsPerDay: preferences?.maxStopsPerDay ?? 6,
          requireDayCards: true,
        },
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
      const code = job.errorCode ? ` (${job.errorCode})` : "";
      throw new Error(`Generate gagal${code}. Draft dan versi aktif tidak berubah.`);
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
              ? "Alternatif hemat dari Dolan. Tempat yang kamu kunci tetap dipertahankan."
              : "Rute alternatif dari Dolan. Tempat yang kamu kunci tetap dipertahankan.",
          assumptions: ["Disusun ulang oleh Dolan."],
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
