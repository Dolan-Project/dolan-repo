import { getModels } from "@dolan/database";

export async function loadTripPreview(tripId: string): Promise<Record<string, unknown>> {
  const { Trip, ItineraryVersion } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) return {};
  const version = trip.currentItineraryVersionId
    ? await ItineraryVersion.findByPk(trip.currentItineraryVersionId)
    : null;
  return {
    title: trip.title,
    destinationCity: trip.destinationCity,
    startDate: trip.startDate,
    endDate: trip.endDate,
    summary: version?.summary ?? trip.description,
    privateOriginLabel: trip.privateOriginLabel,
    privateOriginLatitude: trip.privateOriginLatitude,
    privateOriginLongitude: trip.privateOriginLongitude,
  };
}
