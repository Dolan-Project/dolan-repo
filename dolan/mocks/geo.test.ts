import { describe, expect, it } from "vitest";
import {
  projectToPercent,
  resolveCityPoint,
  resolveGeoPlace,
  searchGeoPlaces,
} from "./geo";

describe("searchGeoPlaces", () => {
  it("finds a public meeting point by partial name", () => {
    const hits = searchGeoPlaces("tugu");
    expect(hits.some((place) => place.label === "Stasiun Tugu")).toBe(true);
  });

  it("does not suggest the private origin as a meeting point", () => {
    const hits = searchGeoPlaces("jakarta", { excludeLabel: "Jakarta" });
    expect(hits.every((place) => place.label.toLowerCase() !== "jakarta")).toBe(
      true,
    );
  });

  it("ranks Gunung Bromo above city-center guesses when searching bromo", () => {
    const hits = searchGeoPlaces("bromo");
    expect(hits[0]?.label).toMatch(/Gunung Bromo|Cemoro Lawang/i);
    expect(hits[0]?.latitude).toBeCloseTo(-7.94, 1);
  });
});

describe("resolveGeoPlace", () => {
  it("returns Yogyakarta Tugu coordinates", () => {
    const place = resolveGeoPlace("Stasiun Tugu");
    expect(place?.latitude).toBeCloseTo(-7.7891, 3);
    expect(place?.longitude).toBeCloseTo(110.3636, 3);
  });
});

describe("resolveCityPoint", () => {
  it("maps a destination city to a point on the Indonesia view", () => {
    const point = resolveCityPoint("Yogyakarta");
    expect(point).not.toBeNull();
    const projected = projectToPercent(point!.latitude, point!.longitude);
    expect(projected.left).toBeGreaterThan(20);
    expect(projected.left).toBeLessThan(80);
    expect(projected.top).toBeGreaterThan(20);
    expect(projected.top).toBeLessThan(90);
  });
});
