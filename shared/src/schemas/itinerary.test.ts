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

  it("keeps coordinates and accepts HH:mm:ss visit times", () => {
    const result = saveItineraryVersionSchema.safeParse({
      baseVersionId: "version-1",
      summary: "Rute Bandung",
      days: [{
        id: "day-1",
        dayNumber: 1,
        date: "2026-10-24",
        title: "Hari pertama",
        stops: [{ ...stop, startTime: "09:00:00", latitude: -6.9025, longitude: 107.6187 }],
      }],
      budgetItems: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].stops[0].startTime).toBe("09:00");
      expect(result.data.days[0].stops[0].latitude).toBeCloseTo(-6.9025);
    }
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
