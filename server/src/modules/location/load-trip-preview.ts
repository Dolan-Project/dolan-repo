import { getModels } from "@dolan/database";

export async function loadTripPreview(tripId: string): Promise<Record<string, unknown>> {
  const { Trip, ItineraryVersion, ItineraryDay, ItineraryStop, Place } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) return {};
  const version = trip.currentItineraryVersionId
    ? await ItineraryVersion.findByPk(trip.currentItineraryVersionId)
    : null;

  const days: Array<{ dayNumber: number; title: string | null; stops: Array<{ name: string; startTime: string | null }> }> = [];
  if (version) {
    const dayRows = await ItineraryDay.findAll({
      where: { itineraryVersionId: version.id },
      order: [["dayNumber", "ASC"]],
    });
    for (const day of dayRows) {
      const stops = await ItineraryStop.findAll({
        where: { itineraryDayId: day.id },
        order: [["sequence", "ASC"]],
      });
      days.push({
        dayNumber: day.dayNumber,
        title: day.title,
        stops: await Promise.all(
          stops.map(async (stop) => {
            const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
            return {
              name: stop.customTitle ?? place?.cachedName ?? "Stop",
              startTime: stop.startTime ?? null,
            };
          }),
        ),
      });
    }
  }

  return {
    title: trip.title,
    destinationCity: trip.destinationCity,
    startDate: trip.startDate,
    endDate: trip.endDate,
    summary: version?.summary ?? trip.description,
    days,
    privateOriginLabel: trip.privateOriginLabel,
    privateOriginLatitude: trip.privateOriginLatitude,
    privateOriginLongitude: trip.privateOriginLongitude,
  };
}
