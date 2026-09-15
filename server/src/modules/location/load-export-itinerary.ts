import { getModels } from "@dolan/database";
import type { ExportItinerary } from "./itinerary-export.ts";

function clockHour(value: string | null | undefined) {
  const match = String(value ?? "").match(/^(\d{1,2}):/);
  return match ? Number(match[1]) : null;
}

function mealHint(startTime: string | null | undefined) {
  const hour = clockHour(startTime);
  if (hour == null) return null;
  if (hour < 11) return "sarapan";
  if (hour < 15) return "makan siang";
  if (hour < 17) return "jajan";
  return "makan malam";
}

export async function loadExportItinerary(tripId: string, versionId?: string): Promise<ExportItinerary | null> {
  const { Trip, ItineraryVersion, ItineraryDay, ItineraryStop, Place, TripChecklistItem, BudgetItem } = getModels();
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
      date: day.date,
      title: day.title,
      stops: await Promise.all(
        stops.map(async (stop, index) => {
          const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
          return {
            name: stop.customTitle ?? place?.cachedName ?? "Stop",
            latitude: place?.cachedLatitude ?? null,
            longitude: place?.cachedLongitude ?? null,
            date: day.date,
            startTime: stop.startTime,
            travelDistanceMeters: stop.travelDistanceMeters,
            travelDurationMinutes: stop.travelDurationMinutes,
            routeStatus: stop.routeStatus,
            notes: stop.notes,
            meal: index === 0 ? mealHint(stop.startTime) : mealHint(stop.startTime),
          };
        }),
      ),
    });
  }
  const checklist = await TripChecklistItem.findAll({
    where: { tripId },
    order: [["createdAt", "ASC"]],
  });
  const budgetRows = await BudgetItem.findAll({ where: { itineraryVersionId: version.id } });
  const foodTotal = budgetRows
    .filter((item) => item.category === "FOOD")
    .reduce((sum, item) => sum + Number(item.unitCostHigh ?? item.unitCostLow ?? 0), 0);
  const allTotal = budgetRows.reduce((sum, item) => sum + Number(item.unitCostHigh ?? item.unitCostLow ?? 0), 0);
  const budgetAmount = trip.budgetAmount != null ? Number(trip.budgetAmount) : null;
  const budgetLine =
    budgetAmount != null && Number.isFinite(budgetAmount)
      ? `Budget trip: Rp ${budgetAmount.toLocaleString("id-ID")} (${trip.budgetBasis === "PER_PERSON" ? "per orang" : "grup"})`
      : null;
  const foodLine = foodTotal > 0 ? `Budget makanan: Rp ${Math.round(foodTotal).toLocaleString("id-ID")}` : null;
  const totalLine = allTotal > 0 ? `Total estimasi versi: Rp ${Math.round(allTotal).toLocaleString("id-ID")}` : null;
  return {
    tripId,
    versionId: version.id,
    title: trip.title,
    summary: version.summary,
    budgetLine: [budgetLine, foodLine, totalLine].filter(Boolean).join(" | ") || budgetLine,
    checklistLines: checklist.map((item) => `[ ] ${item.title}`),
    days: exportDays,
  };
}
