import { describe, expect, it } from "vitest";
import type { GeminiItinerary } from "@dolan/shared";
import { FakePlacesClient } from "../src/integrations/google/fake-places-client.ts";
import {
  createPlaceLookup,
  pickBestPlaceMatch,
  scorePlaceNameMatch,
} from "../src/modules/jobs/place-lookup.ts";

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
          place: {
            googlePlaceId: "ChIJZ4l5Y3l1xkcRZ3kRk5v0t0g",
            name: "Candi Prambanan",
            city: "Yogyakarta",
          },
          customTitle: null,
          activityType: "wisata",
          startTime: "09:00",
          durationMinutes: 90,
          travelDurationMinutes: 0,
          notes: null,
          isLocked: false,
        },
      ],
    },
  ],
  budgetItems: [],
};

describe("place lookup hydrate", () => {
  it("scores closer names higher", () => {
    expect(scorePlaceNameMatch("Candi Prambanan", "Candi Prambanan")).toBe(100);
    expect(scorePlaceNameMatch("Prambanan", "Candi Prambanan")).toBeGreaterThan(
      scorePlaceNameMatch("Prambanan", "Hotel Malioboro Inn Yogyakarta"),
    );
  });

  it("picks the best text-search candidate", () => {
    const match = pickBestPlaceMatch("Prambanan", [
      {
        googlePlaceId: "ChIJa",
        name: "Hotel Malioboro Inn Yogyakarta",
        formattedAddress: null,
        city: "Yogyakarta",
        latitude: 0,
        longitude: 0,
        rating: null,
        userRatingCount: null,
        photoName: null,
        googleMapsUrl: null,
        types: [],
      },
      {
        googlePlaceId: "ChIJb",
        name: "Candi Prambanan",
        formattedAddress: null,
        city: "Yogyakarta",
        latitude: 0,
        longitude: 0,
        rating: null,
        userRatingCount: null,
        photoName: null,
        googleMapsUrl: null,
        types: [],
      },
    ]);
    expect(match?.googlePlaceId).toBe("ChIJb");
  });

  it("replaces hallucinated place ids via Google text search", async () => {
    const lookup = createPlaceLookup(new FakePlacesClient(), { requireKnownPlace: true });
    const hydrated = await lookup.hydratePlaces(base, { destinationCity: "Yogyakarta" });
    expect(hydrated.days[0]?.stops[0]?.place?.googlePlaceId).toBe("ChIJf5UqGYeXeY4RwZVQ9n0s7oE");
    expect(hydrated.days[0]?.stops[0]?.place?.name).toContain("Prambanan");
    expect(hydrated.days[0]?.stops.length).toBeGreaterThanOrEqual(2);
  });

  it("fails when the place name cannot be resolved and no stops remain", async () => {
    const lookup = createPlaceLookup(new FakePlacesClient(), { requireKnownPlace: true });
    await expect(
      lookup.hydratePlaces({
        ...base,
        days: [
          {
            ...base.days[0]!,
            stops: [
              {
                ...base.days[0]!.stops[0]!,
                place: {
                  googlePlaceId: "ChIJZ4l5Y3l1xkcRZ3kRk5v0t0g",
                  name: "Tempat Fiktif XYZ 999",
                  city: "Atlantis",
                },
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow("INVALID_GENERATION");
  });

  it("keeps resolvable stops when some hallucinated names fail", async () => {
    const lookup = createPlaceLookup(new FakePlacesClient(), { requireKnownPlace: true });
    const hydrated = await lookup.hydratePlaces({
      ...base,
      days: [
        {
          ...base.days[0]!,
          stops: [
            base.days[0]!.stops[0]!,
            {
              ...base.days[0]!.stops[0]!,
              sequence: 2,
              place: {
                googlePlaceId: "ChIJZ4l5Y3l1xkcRZ3kRk5v0t0g",
                name: "Tempat Fiktif XYZ 999",
                city: "Atlantis",
              },
            },
          ],
        },
      ],
    });
    expect(hydrated.days[0]?.stops[0]?.place?.name).toContain("Prambanan");
    expect(hydrated.days[0]?.stops.length).toBeGreaterThanOrEqual(2);
    expect(hydrated.days[0]?.stops.some((stop) => stop.place?.name.includes("Malioboro") || stop.place?.name.includes("Prambanan"))).toBe(true);
  });
});
