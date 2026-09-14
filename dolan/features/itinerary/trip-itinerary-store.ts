import type { EditableItineraryDay, ItineraryEditorSnapshot } from "@dolan/shared";
import { buildDestinationItinerary } from "@/lib/destination-itinerary";
import { hydrateItineraryPlaces } from "@/lib/template-itinerary";
import { createBudgetSummary, INITIAL_BUDGET_ITEMS } from "./mock-data";
import { mockGetTrip } from "@/mocks/trips";

const snapshots = new Map<string, ItineraryEditorSnapshot>();

function snapshotFromDays(
  tripId: string,
  days: EditableItineraryDay[],
  meta: { title?: string; destinationCity?: string; startDate?: string | null; endDate?: string | null; summary?: string },
): ItineraryEditorSnapshot {
  const versionId = "wizard-v1";
  const startDate = meta.startDate || "2026-10-01";
  const endDate = meta.endDate || startDate;
  return {
    tripId,
    tripTitle: meta.title ?? `Trip ke ${meta.destinationCity ?? "Indonesia"}`,
    destinationCity: meta.destinationCity ?? "Indonesia",
    startDate,
    endDate,
    activeVersionId: versionId,
    versions: [{
      id: versionId,
      tripId,
      versionNumber: 1,
      source: "AI",
      summary: meta.summary ?? `Rute untuk ${meta.destinationCity ?? "destinasi"}.`,
      assumptions: ["Estimasi biaya menyesuaikan budget trip"],
      days,
      budget: createBudgetSummary(INITIAL_BUDGET_ITEMS),
      createdAt: new Date().toISOString(),
    }],
    checklist: [],
  };
}

export function getMockItinerarySnapshot(tripId: string): ItineraryEditorSnapshot {
  const stored = snapshots.get(tripId);
  if (stored) {
    return {
      ...stored,
      versions: stored.versions.map((version) => ({
        ...version,
        days: hydrateItineraryPlaces(version.days, stored.destinationCity),
      })),
    };
  }
  const tripRes = mockGetTrip("success", tripId);
  const trip = tripRes.success ? tripRes.data : null;
  const destination = trip?.destinationCity ?? "Indonesia";
  const days = buildDestinationItinerary({
    destination,
    startDate: trip?.startDate ?? "",
    endDate: trip?.endDate ?? trip?.startDate ?? "",
  });
  const snapshot = snapshotFromDays(tripId, hydrateItineraryPlaces(days, destination), {
    title: trip?.title,
    destinationCity: destination,
    startDate: trip?.startDate,
    endDate: trip?.endDate,
  });
  snapshots.set(tripId, snapshot);
  return snapshot;
}

export function saveMockItinerarySnapshot(
  tripId: string,
  days: EditableItineraryDay[],
  summary?: string | null,
): ItineraryEditorSnapshot {
  if (!days.length) return getMockItinerarySnapshot(tripId);
  const previous = snapshots.get(tripId) ?? getMockItinerarySnapshot(tripId);
  const tripRes = mockGetTrip("success", tripId);
  const destination = (tripRes.success && tripRes.data.destinationCity) || previous.destinationCity;
  const snapshot = snapshotFromDays(tripId, hydrateItineraryPlaces(days, destination), {
    title: previous.tripTitle,
    destinationCity: destination,
    startDate: previous.startDate,
    endDate: previous.endDate,
    summary: summary ?? previous.versions[0]?.summary ?? undefined,
  });
  snapshots.set(tripId, snapshot);
  return snapshot;
}
