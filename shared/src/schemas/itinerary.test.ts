import { describe, expect, it } from "vitest";
import { editableDayInputSchema, saveItineraryVersionSchema } from "./itinerary.ts";

const stop = {
  id: "stop-1",
  sequence: 1,
  googlePlaceId: "ChIJ123",
  customTitle: null,
  activityType: "wisata",
  startTime: "09:00",
  durationMinutes: 90,
  travelDurationMinutes: 25,
  notes: null,
  isLocked: false,
};

describe("itinerary editor mutation schemas", () => {
  it("accepts a complete version mutation", () => {
    const result = saveItineraryVersionSchema.safeParse({
      baseVersionId: "version-1",
      summary: "Rute Komodo",
      days: [{ id: "day-1", dayNumber: 1, date: "2026-10-24", title: "Hari pertama", stops: [stop] }],
      budgetItems: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid time and short durations", () => {
    const result = editableDayInputSchema.safeParse({
      id: "day-1",
      dayNumber: 1,
      date: "2026-10-24",
      title: null,
      stops: [{ ...stop, startTime: "25:10", durationMinutes: 5 }],
    });
    expect(result.success).toBe(false);
  });
});
