import { describe, expect, it } from "vitest";
import type { GeminiItinerary } from "@dolan/shared";
import { FakePlacesClient } from "../src/integrations/google/fake-places-client.ts";
import { applyLockedStops } from "../src/modules/jobs/locked-stops.ts";
import { assertRealPlaces } from "../src/modules/jobs/place-guard.ts";
import { uniquePlaceIds } from "../src/modules/jobs/place-lookup.ts";

const base: GeminiItinerary = {
  summary: "test",
  assumptions: [],
  days: [
    {
      dayNumber: 1,
      date: "2026-10-01",
      title: "Hari 1",
      stops: [
        {
          sequence: 1,
          place: { googlePlaceId: "ChIJaaaaaaaaaaaaaaaaaaaa", name: "Baru", city: "Bali" },
          customTitle: null,
          activityType: "wisata",
          startTime: "09:00",
          durationMinutes: 60,
          travelDurationMinutes: 10,
          notes: null,
          isLocked: false,
        },
      ],
    },
  ],
  budgetItems: [],
};

describe("locked stops and real places", () => {
  it("keeps a locked place even if the model omitted it", () => {
    const next = applyLockedStops(base, [
      {
        dayNumber: 1,
        googlePlaceId: "ChIJbbbbbbbbbbbbbbbbbbbb",
        customTitle: "Pura",
        activityType: "wisata",
        durationMinutes: 90,
        notes: "jangan dipindah",
      },
    ]);
    expect(next.days[0]?.stops.some((stop) => stop.isLocked && stop.place?.googlePlaceId.endsWith("bbbb"))).toBe(true);
  });

  it("rejects invented place ids", () => {
    expect(() =>
      assertRealPlaces({
        ...base,
        days: [
          {
            ...base.days[0]!,
            stops: [{ ...base.days[0]!.stops[0]!, place: { googlePlaceId: "FAKE", name: "X", city: null } }],
          },
        ],
      }),
    ).toThrow("INVALID_GENERATION");
  });

  it("collects unique place ids for live verification", async () => {
    expect(uniquePlaceIds(base)).toEqual(["ChIJaaaaaaaaaaaaaaaaaaaa"]);
    await expect(new FakePlacesClient().getDetails("ChIJaaaaaaaaaaaaaaaaaaaa")).rejects.toMatchObject({
      status: 404,
    });
  });
});
