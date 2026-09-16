import { describe, expect, it } from "vitest";
import { itineraryCircleSvg, itineraryPinSvg, itineraryStopColor, ITINERARY_ROUTE_COLOR } from "./itinerary-style";
import { provinceCoverUrl } from "./province-cover";
import { INDONESIA_PROVINCES } from "./provinces";

describe("itinerary style", () => {
  it("uses a unique color per stop and a teardrop pin", () => {
    expect(itineraryStopColor(0)).toBe("#004ac6");
    expect(itineraryStopColor(1)).toBe("#ef3b69");
    expect(itineraryStopColor(2)).toBe("#fe893c");
    expect(ITINERARY_ROUTE_COLOR).toBe("#004ac6");
    expect(itineraryCircleSvg(0, 1)).toContain("<circle");
    expect(itineraryCircleSvg(0, 1)).toContain(">1</text>");
    expect(itineraryPinSvg(1, 2)).toContain(">2</text>");
    expect(itineraryPinSvg(1, 2)).toContain("#ef3b69");
    expect(itineraryPinSvg(1, 2, false, ITINERARY_ROUTE_COLOR)).toContain(ITINERARY_ROUTE_COLOR);
    expect(itineraryPinSvg(1, 2, false, ITINERARY_ROUTE_COLOR)).not.toContain("#ef3b69");
  });
});

describe("province covers", () => {
  it("returns an image URL for every province", () => {
    for (const province of INDONESIA_PROVINCES) {
      expect(provinceCoverUrl(province)).toMatch(/^https:\/\//);
    }
    expect(provinceCoverUrl(INDONESIA_PROVINCES.find((item) => item.slug === "jawa-barat")!)).toMatch(/kawah|bandung|wikimedia/i);
    expect(provinceCoverUrl(INDONESIA_PROVINCES.find((item) => item.slug === "jawa-timur")!)).toMatch(/bromo|wikimedia/i);
    expect(provinceCoverUrl(INDONESIA_PROVINCES.find((item) => item.slug === "bali")!)).toMatch(/http/);
  });
});
