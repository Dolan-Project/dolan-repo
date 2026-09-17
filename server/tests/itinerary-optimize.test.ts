import { describe, expect, it } from "vitest";
import type { GeminiItinerary } from "@dolan/shared";
import {
  clampDailyStopBounds,
  dropDuplicateStops,
  packGeneratedSchedule,
  planItineraryByProximity,
  refineGeneratedBudget,
  sameDestination,
  uniqueVisitCount,
} from "../src/modules/jobs/itinerary-optimize.ts";

function stop(name: string, id: string, extra?: Partial<GeminiItinerary["days"][number]["stops"][number]>) {
  return {
    sequence: 1,
    place: { googlePlaceId: id, name, city: "Bandung" },
    customTitle: null,
    activityType: "wisata",
    startTime: "09:00",
    durationMinutes: 90,
    travelDurationMinutes: null,
    notes: null,
    isLocked: false,
    ...extra,
  };
}

const twoDayRepeat: GeminiItinerary = {
  summary: "test",
  assumptions: [],
  days: [
    {
      dayNumber: 1,
      date: "2026-10-01",
      title: "Hari 1",
      stops: [stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa"), stop("Museum Geologi Bandung", "ChIJbbbbbbbbbbbbbbbbbbbb")],
    },
    {
      dayNumber: 2,
      date: "2026-10-02",
      title: "Hari 2",
      stops: [stop("Gedung Sate Bandung", "ChIJcccccccccccccccccccc"), stop("Jalan Braga", "ChIJdddddddddddddddddddd")],
    },
  ],
  budgetItems: [],
};

describe("itinerary unique destinations and budget", () => {
  it("treats the same landmark with a city suffix as one destination", () => {
    expect(sameDestination({ name: "Gedung Sate" }, { name: "Gedung Sate Bandung" })).toBe(true);
    expect(sameDestination({ googlePlaceId: "ChIJa" }, { googlePlaceId: "ChIJa" })).toBe(true);
    expect(sameDestination(null, { name: "Gedung Sate" })).toBe(false);
    expect(sameDestination({ name: "" }, { name: "Gedung Sate" })).toBe(false);
    expect(sameDestination({ name: "Braga" }, { name: "Malioboro" })).toBe(false);
  });

  it("clamps daily stop bounds into a walkable day", () => {
    expect(clampDailyStopBounds()).toEqual({ minStops: 4, maxStops: 6 });
    expect(clampDailyStopBounds(1, 20)).toEqual({ minStops: 3, maxStops: 6 });
    expect(clampDailyStopBounds(5, 4)).toEqual({ minStops: 5, maxStops: 5 });
  });

  it("keeps each destination at most once across the trip", () => {
    const unique = dropDuplicateStops(twoDayRepeat);
    expect(uniqueVisitCount(unique.days)).toBe(3);
    const names = unique.days.flatMap((day) => day.stops.map((item) => item.place?.name));
    expect(names.filter((name) => name?.includes("Gedung Sate"))).toHaveLength(1);
    expect(names).toContain("Jalan Braga");
  });

  it("prefers a locked stop when the same place appears twice", () => {
    const unique = dropDuplicateStops(
      {
        ...twoDayRepeat,
        days: [
          { ...twoDayRepeat.days[0]!, stops: [stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa")] },
          {
            ...twoDayRepeat.days[1]!,
            stops: [stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa", { isLocked: true, customTitle: "Locked" })],
          },
        ],
      },
      true,
    );
    expect(unique.days[0]?.stops).toHaveLength(0);
    expect(unique.days[1]?.stops[0]?.isLocked).toBe(true);
  });

  it("groups nearby stops on the same day and orders them without backtracking", () => {
    const coords = new Map([
      ["ChIJaaaaaaaaaaaaaaaaaaaa", { latitude: -6.9025, longitude: 107.6187 }],
      ["ChIJbbbbbbbbbbbbbbbbbbbb", { latitude: -6.9007, longitude: 107.6191 }],
      ["ChIJcccccccccccccccccccc", { latitude: -6.9025, longitude: 107.6187 }],
      ["ChIJdddddddddddddddddddd", { latitude: -6.9174, longitude: 107.609 }],
    ]);
    const planned = planItineraryByProximity(twoDayRepeat, coords, { latitude: -6.9025, longitude: 107.6187 });
    expect(uniqueVisitCount(planned.days)).toBe(3);
    const day1Ids = planned.days[0]?.stops.map((item) => item.place?.googlePlaceId) ?? [];
    expect(day1Ids).toContain("ChIJaaaaaaaaaaaaaaaaaaaa");
    expect(day1Ids).toContain("ChIJbbbbbbbbbbbbbbbbbbbb");
    expect(day1Ids).not.toContain("ChIJdddddddddddddddddddd");
  });

  it("packs a morning-to-evening clock after Google travel times are known", () => {
    const packed = packGeneratedSchedule({
      ...twoDayRepeat,
      days: [
        {
          ...twoDayRepeat.days[0]!,
          stops: [
            stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa", { travelDurationMinutes: 0 }),
            stop("Museum Geologi Bandung", "ChIJbbbbbbbbbbbbbbbbbbbb", { travelDurationMinutes: 15 }),
          ],
        },
      ],
    });
    expect(packed.days[0]?.stops[0]?.startTime).toBe("08:00");
    expect(packed.days[0]?.stops[0]?.durationMinutes).toBeGreaterThanOrEqual(75);
    expect(packed.days[0]?.stops[0]?.durationMinutes).toBeLessThanOrEqual(180);
    expect(packed.days[0]?.stops[1]?.startTime! > packed.days[0]?.stops[0]?.startTime!).toBe(true);
  });

  it("keeps warung visits short even when the day has spare time", () => {
    const packed = packGeneratedSchedule({
      ...twoDayRepeat,
      days: [
        {
          ...twoDayRepeat.days[0]!,
          stops: [
            stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa", { travelDurationMinutes: 0 }),
            stop("Warung Nasi Bandung", "ChIJeeeeeeeeeeeeeeeeeeee", {
              activityType: "makan",
              travelDurationMinutes: 10,
            }),
          ],
        },
      ],
    });
    const warung = packed.days[0]?.stops.find((item) => item.place?.name?.includes("Warung"));
    expect(warung?.durationMinutes).toBeLessThanOrEqual(75);
    expect(warung?.durationMinutes).toBeGreaterThanOrEqual(45);
  });

  it("returns the unique itinerary when no stop has coordinates", () => {
    const planned = planItineraryByProximity(twoDayRepeat, new Map());
    expect(uniqueVisitCount(planned.days)).toBe(3);
  });

  it("rebuilds backpacker costs from unique visits and route distance", () => {
    const priced = refineGeneratedBudget({
      ...twoDayRepeat,
      days: [
        {
          ...twoDayRepeat.days[0]!,
          stops: [
            stop("Gedung Sate", "ChIJaaaaaaaaaaaaaaaaaaaa", { travelDistanceMeters: 0 }),
            stop("Museum Geologi Bandung", "ChIJbbbbbbbbbbbbbbbbbbbb", { travelDistanceMeters: 800 }),
          ],
        },
        {
          ...twoDayRepeat.days[1]!,
          stops: [stop("Jalan Braga", "ChIJdddddddddddddddddddd", { travelDistanceMeters: 2500 })],
        },
      ],
      budgetItems: [
        {
          category: "TRANSPORT_ROUNDTRIP",
          label: "Kereta Jakarta-Bandung",
          quantity: "1.00",
          unit: "orang",
          unitCostLow: "150000.00",
          unitCostHigh: "220000.00",
          sourceType: "estimate",
          sourceReference: null,
          notes: null,
        },
      ],
    });
    const categories = priced.budgetItems.map((item) => item.category);
    expect(categories).toContain("TRANSPORT_ROUNDTRIP");
    expect(categories).toContain("LODGING");
    expect(categories).toContain("FOOD");
    expect(categories).toContain("TRANSPORT_LOCAL");
    expect(categories).toContain("ACTIVITIES");
    const local = priced.budgetItems.find((item) => item.category === "TRANSPORT_LOCAL");
    expect(local?.sourceReference).toContain("km");
  });

  it("uses cheaper backpacker rates and party-size notes", () => {
    const priced = refineGeneratedBudget(
      {
        ...twoDayRepeat,
        days: [twoDayRepeat.days[0]!],
        budgetItems: [],
      },
      { regenerateMode: "cheaper", partySize: 3 },
    );
    expect(priced.days).toHaveLength(1);
    expect(priced.budgetItems.some((item) => item.category === "LODGING")).toBe(false);
    const food = priced.budgetItems.find((item) => item.category === "FOOD");
    expect(food?.unitCostLow).toBe("40000.00");
    expect(food?.notes).toMatch(/x3 peserta/i);
    expect(priced.assumptions.join(" ")).toMatch(/backpacker/i);
  });

  it("prices long Banten-style hops as bus/travel, not a 900k car", () => {
    const priced = refineGeneratedBudget({
      ...twoDayRepeat,
      days: [{
        ...twoDayRepeat.days[0]!,
        stops: [
          stop("Serang", "ChIJeeeeeeeeeeeeeeeeeeee", { travelDistanceMeters: 0 }),
          stop("Anyer", "ChIJffffffffffffffffffff", { travelDistanceMeters: 213_000 }),
        ],
      }],
      budgetItems: [],
    });
    const local = priced.budgetItems.find((item) => item.category === "TRANSPORT_LOCAL");
    expect(local?.label).toMatch(/bus\/travel/i);
    expect(Number(local?.unitCostLow)).toBeLessThan(400_000);
    expect(Number(local?.unitCostLow)).toBeGreaterThan(50_000);
  });

  it("uses theme-park ticket bands for Dufan", () => {
    const priced = refineGeneratedBudget({
      ...twoDayRepeat,
      days: [{
        ...twoDayRepeat.days[0]!,
        stops: [stop("Dunia Fantasi", "ChIJdufan000000000000000")],
      }],
      budgetItems: [],
    });
    const activities = priced.budgetItems.find((item) => item.category === "ACTIVITIES");
    expect(Number(activities?.unitCostLow)).toBeGreaterThanOrEqual(150_000);
  });
});
