import { describe, expect, it } from "vitest";
import { toItinerarySaveDays } from "./template-itinerary";
import type { EditableItineraryDay } from "@dolan/shared";

describe("toItinerarySaveDays", () => {
  it("fills blank dates from the trip start date", () => {
    const days: EditableItineraryDay[] = [
      {
        id: "day-1",
        dayNumber: 1,
        date: "",
        title: "Hari 1",
        stops: [
          {
            id: "s1",
            sequence: 1,
            place: { googlePlaceId: "ChIJaaaaaaaaaaaaaaaaaaaa", name: "A", formattedAddress: "A", city: "Flores", latitude: -8.7, longitude: 121.2, rating: null, userRatingCount: null, photoName: null, googleMapsUrl: null },
            customTitle: "Kelimutu",
            activityType: "Wisata",
            startTime: "09:00",
            durationMinutes: 60,
            travelDurationMinutes: 0,
            notes: null,
            isLocked: false,
          },
        ],
      },
    ];
    const saved = toItinerarySaveDays(days, "2026-09-20");
    expect(saved[0]?.date).toBe("2026-09-20");
  });
});
