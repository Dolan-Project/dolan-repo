import { getModels } from "@dolan/database";
import type { ExportItinerary } from "./itinerary-export.ts";

export async function loadExportItinerary(tripId: string, versionId?: string): Promise<ExportItinerary | null> {
  const { Trip, ItineraryVersion, ItineraryDay, ItineraryStop, Place, TripChecklistItem } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) return null;
  const selectedId = versionId ?? trip.currentItineraryVersionId;
  if (!selectedId) return null;
  const version = await ItineraryVersion.findOne({ where: { id: selectedId, tripId } });
  if (!version) return null;
  const days = await ItineraryDay.findAll({ where: { itineraryVersionId: version.id }, order: [["dayNumber", "ASC"]] });
  const exportDays = [];
  for (const day of days) {
    const stops = await ItineraryStop.findAll({ where: { itineraryDayId: day.id }, order: [["sequence", "ASC"]] });
    exportDays.push({
      dayNumber: day.dayNumber,
      title: day.title,
      stops: await Promise.all(
        stops.map(async (stop) => {
          const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
          return {
            name: stop.customTitle ?? place?.cachedName ?? "Stop",
            latitude: place?.cachedLatitude ?? null,
            longitude: place?.cachedLongitude ?? null,
          };
        }),
      ),
    });
  }
  const checklist = await TripChecklistItem.findAll({
    where: { tripId },
    order: [["createdAt", "ASC"]],
    limit: 12,
  });
  const budgetAmount = trip.budgetAmount != null ? Number(trip.budgetAmount) : null;
  const budgetLine =
    budgetAmount != null && Number.isFinite(budgetAmount)
      ? `Budget: Rp ${budgetAmount.toLocaleString("id-ID")} (${trip.budgetBasis === "PER_PERSON" ? "per orang" : "grup"})`
      : null;
  return {
    tripId,
    versionId: version.id,
    title: trip.title,
    summary: version.summary,
    budgetLine,
    checklistLines: checklist.map((item) => `${item.isCompleted ? "[x]" : "[ ]"} ${item.title}`),
    days: exportDays,
  };
}
