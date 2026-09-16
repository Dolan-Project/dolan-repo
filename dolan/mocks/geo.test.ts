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

  it("suggests city wisata, not only the city name", () => {
    const hits = searchGeoPlaces("kota", { nearbyCity: "Jakarta" });
    expect(hits.some((place) => /Kota Tua/i.test(place.label))).toBe(true);
    expect(hits[0]?.latitude).not.toBeCloseTo(-6.2088, 3);
  });

  it("suggests provinces while the name is still being typed", () => {
    expect(searchGeoPlaces("jam")[0]?.label).toMatch(/Jambi/i);
    expect(searchGeoPlaces("lamp").some((place) => /Lampung/i.test(place.label))).toBe(true);
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

describe("Cirebon geo search", () => {
  it("suggests Cirebon as a destination city", () => {
    const hits = searchGeoPlaces("cirebon");
    expect(hits.some((place) => /cirebon/i.test(place.label) || /cirebon/i.test(place.city))).toBe(true);
  });
});
