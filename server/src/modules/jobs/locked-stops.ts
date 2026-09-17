import type { GeminiItinerary } from "@dolan/shared";

export type LockedStop = {
  dayNumber: number;
  googlePlaceId: string | null;
  customTitle: string | null;
  activityType: string;
  durationMinutes: number;
  notes: string | null;
};

export function applyLockedStops(itinerary: GeminiItinerary, locked: LockedStop[]): GeminiItinerary {
  if (locked.length === 0) return itinerary;

  const days = itinerary.days.map((day) => {
    const lockedHere = locked.filter((item) => item.dayNumber === day.dayNumber);
    if (lockedHere.length === 0) return day;

    const kept = day.stops.map((stop) => {
      const match = lockedHere.find(
        (item) =>
          (item.googlePlaceId && item.googlePlaceId === stop.place?.googlePlaceId) ||
          (item.customTitle && item.customTitle === stop.customTitle),
      );
      if (!match) return stop;
      return {
        ...stop,
        isLocked: true,
        durationMinutes: match.durationMinutes,
        notes: match.notes,
        activityType: match.activityType,
        place: match.googlePlaceId
          ? { googlePlaceId: match.googlePlaceId, name: stop.place?.name ?? match.customTitle ?? "Locked stop", city: stop.place?.city ?? null }
          : stop.place,
        customTitle: match.customTitle,
      };
    });

    const missing = lockedHere.filter(
      (item) =>
        !kept.some(
          (stop) =>
            stop.isLocked &&
            ((item.googlePlaceId && item.googlePlaceId === stop.place?.googlePlaceId) ||
              item.customTitle === stop.customTitle),
        ),
    );

    const extras = missing.map((item, index) => ({
      sequence: kept.length + index + 1,
      place: item.googlePlaceId
        ? { googlePlaceId: item.googlePlaceId, name: item.customTitle ?? "Locked stop", city: null }
        : null,
      customTitle: item.customTitle,
      activityType: item.activityType,
      startTime: null,
      durationMinutes: item.durationMinutes,
      travelDurationMinutes: null,
      notes: item.notes,
      isLocked: true,
    }));

    return { ...day, stops: [...kept, ...extras] };
  });

  return { ...itinerary, days };
}
