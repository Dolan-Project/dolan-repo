import { describe, expect, it } from "vitest";
import type { GeminiItinerary } from "@dolan/shared";
import { applyRouteLegs, MockRoutesClient } from "../src/modules/jobs/routes-adapter.ts";

const itinerary: GeminiItinerary = {
  summary: null,
  assumptions: [],
  days: [
    {
      dayNumber: 1,
      date: "2026-10-01",
      title: "Hari 1",
      stops: [
        {
          sequence: 1,
          place: { googlePlaceId: "ChIJaaaaaaaaaaaaaaaaaaaa", name: "A", city: null },
          customTitle: null,
          activityType: "wisata",
          startTime: "09:00",
          durationMinutes: 60,
          travelDurationMinutes: null,
          notes: null,
          isLocked: false,
        },
        {
          sequence: 2,
          place: { googlePlaceId: "ChIJbbbbbbbbbbbbbbbbbbbb", name: "B", city: null },
          customTitle: null,
          activityType: "wisata",
          startTime: "11:00",
          durationMinutes: 60,
          travelDurationMinutes: null,
          notes: null,
          isLocked: false,
        },
      ],
    },
  ],
  budgetItems: [],
};

describe("route legs", () => {
  it("fills travel duration when routing works", async () => {
    const next = await applyRouteLegs(
      itinerary,
      [
        { latitude: -8.7, longitude: 115.1 },
        { latitude: -8.8, longitude: 115.2 },
      ],
      new MockRoutesClient({ ok: true, durationMinutes: 40 }),
    );
    expect(next.days[0]?.stops[1]?.travelDurationMinutes).toBe(40);
  });

  it("explains unsupported routes instead of inventing a straight line", async () => {
    const next = await applyRouteLegs(
      itinerary,
      [
        { latitude: -8.7, longitude: 115.1 },
        { latitude: -8.8, longitude: 115.2 },
      ],
      new MockRoutesClient({ ok: false, reason: "Rute tidak tersedia untuk segmen ini. Jangan anggap garis lurus sebagai jalan." }),
    );
    expect(next.days[0]?.stops[1]?.travelDurationMinutes).toBeNull();
    expect(next.days[0]?.stops[1]?.notes).toMatch(/garis lurus/);
    expect(next.days[0]?.stops[1]?.routeStatus).toBe("UNAVAILABLE");
    expect(next.days[0]?.stops[1]?.routePolyline).toBeNull();
  });
});
