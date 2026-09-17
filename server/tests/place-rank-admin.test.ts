import { describe, expect, it } from "vitest";
import {
  destinationScore,
  distanceKm,
  isAdministrativePlace,
  looksLikeLodgingOrFoodQuery,
} from "../src/modules/search/place-rank.ts";

describe("administrative place filter", () => {
  it("rejects a province that is not a tourist attraction", () => {
    expect(
      isAdministrativePlace({
        name: "Jawa Barat",
        types: ["administrative_area_level_1", "political"],
      }),
    ).toBe(true);
  });

  it("keeps a real tourist place even if the name mentions a region", () => {
    expect(
      isAdministrativePlace({
        name: "Gedung Sate",
        types: ["tourist_attraction", "point_of_interest"],
      }),
    ).toBe(false);
  });

  it("rejects a short province-like name without tourist types", () => {
    expect(isAdministrativePlace({ name: "Bali" })).toBe(true);
    expect(isAdministrativePlace({ name: "  " })).toBe(false);
  });
});

describe("place ranking helpers", () => {
  it("detects lodging and food search queries", () => {
    expect(looksLikeLodgingOrFoodQuery("hotel di Bandung")).toBe(true);
    expect(looksLikeLodgingOrFoodQuery("Gedung Sate")).toBe(false);
  });

  it("scores lodging below food below attractions", () => {
    expect(destinationScore({ types: ["hotel"] } as never)).toBe(-3);
    expect(destinationScore({ types: ["cafe"] } as never)).toBe(-2);
    expect(destinationScore({ types: ["museum"] } as never)).toBe(2);
    expect(destinationScore({ types: ["store"] } as never)).toBe(0);
  });

  it("computes haversine distance in kilometers", () => {
    const km = distanceKm(
      { latitude: -6.9025, longitude: 107.6187 },
      { latitude: -6.9174, longitude: 107.609 },
    );
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(5);
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
  });
});

