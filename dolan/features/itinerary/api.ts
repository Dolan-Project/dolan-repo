import {
  saveItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type GenerationJob,
  type ItineraryEditorSnapshot,
  type SaveItineraryVersionInput,
  type TripChecklistItem,
} from "@dolan/shared";
<<<<<<< HEAD
import { createBudgetSummary } from "./mock-data";
=======
import { buildDestinationItinerary } from "@/lib/destination-itinerary";
import { budgetItemsFromPlan, estimateItineraryBudget, hydrateItineraryPlaces, packItinerarySchedule, placeTicketEstimate, withGlobalStopNumbers } from "@/lib/template-itinerary";
import { createBudgetSummary, createEditorSnapshot } from "./mock-data";
>>>>>>> 13c57bd (style: redesign edit page)

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
<<<<<<< HEAD
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
=======
  const lockedNames = new Set(
    baseDays.flatMap((day) => day.stops.filter((stop) => stop.isLocked).map((stop) => (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID"))),
  );
  const pool = snapshot.versions.find((item) => item.id === snapshot.activeVersionId)?.budget.totalHigh ?? 0;
  const generatedDays = packItinerarySchedule(
    hydrateItineraryPlaces(
      buildDestinationItinerary({
        destination: snapshot.destinationCity,
        startDate: snapshot.startDate,
        endDate: snapshot.endDate,
        variant: versionNumber,
        excludeNames: regenerateMode === "alternative"
          ? baseDays.flatMap((day) => day.stops.filter((stop) => !stop.isLocked).map((stop) => stop.customTitle || stop.place?.name || ""))
          : regenerateMode === "cheaper"
            ? baseDays.flatMap((day) => day.stops.filter((stop) => !stop.isLocked).map((stop) => stop.customTitle || stop.place?.name || "")).filter((name) => placeTicketEstimate(name) > 0)
            : undefined,
        preferCheaper: regenerateMode === "cheaper",
        budgetPool: Number(pool) || 0,
      }).map((day) => ({
        ...day,
        stops: day.stops.map((stop) => {
          const key = (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID");
          const locked = baseDays.flatMap((item) => item.stops).find((item) => item.isLocked && (item.customTitle || item.place?.name || "").trim().toLocaleLowerCase("id-ID") === key);
          return locked ?? {
            ...stop,
            notes: `${stop.notes ?? ""} ${regenerateMode === "cheaper" ? "Dipilih opsi lebih hemat." : "Diurutkan ulang supaya rute tidak bolak-balik."}`.trim(),
          };
        }),
      })),
      snapshot.destinationCity,
    ),
  );
  if (lockedNames.size) {
    generatedDays.forEach((day) => {
      day.stops.forEach((stop) => {
        const key = (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID");
        if (lockedNames.has(key)) stop.isLocked = true;
      });
    });
    const usedNames = new Set(
      generatedDays.flatMap((day) => day.stops.map((stop) => (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID"))),
    );
    const missingLocked = baseDays.flatMap((day) => day.stops).filter((stop) => {
      const key = (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID");
      return stop.isLocked && key && !usedNames.has(key);
    });
    if (missingLocked.length && generatedDays[0]) {
      generatedDays[0] = {
        ...generatedDays[0],
        stops: withGlobalStopNumbers([{ ...generatedDays[0], stops: [...missingLocked, ...generatedDays[0].stops] }])[0]!.stops,
      };
    }
  }
  const plan = estimateItineraryBudget(generatedDays, Number(pool) || 0, 1, { leanMeals: regenerateMode === "cheaper" });
  const nextBudgetItems = regenerateMode === "cheaper" ? budgetItemsFromPlan(generatedDays, plan) : budgetItems;
  const generated: EditableItineraryVersion = {
    id: `version-${versionNumber}`,
    tripId: snapshot.tripId,
    versionNumber,
    source: "REGENERATED",
    summary: regenerateMode === "cheaper"
      ? "AI menyusun ulang rute supaya lebih hemat."
      : "AI mengurutkan ulang rute supaya lebih hemat jarak.",
    assumptions: ["Destinasi terkunci tidak diubah", "Estimasi biaya bukan tiket resmi"],
    days: generatedDays,
    budget: createBudgetSummary(nextBudgetItems.length ? nextBudgetItems : budgetItems),
    createdAt: new Date().toISOString(),
>>>>>>> 13c57bd (style: redesign edit page)
  };
}
