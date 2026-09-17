import { describe, expect, it } from "vitest";
import { chunkRouteStops, decodePolyline } from "./map-route";

describe("chunkRouteStops", () => {
  it("returns no chunks when fewer than two stops exist", () => {
    expect(chunkRouteStops([])).toEqual([]);
    expect(chunkRouteStops([{ lat: 1, lng: 2 }])).toEqual([]);
  });

  it("keeps a short trip in one driving request", () => {
    const stops = [
      { lat: -8.48, lng: 119.88 },
      { lat: -8.64, lng: 119.58 },
      { lat: -8.6, lng: 119.51 },
    ];
    expect(chunkRouteStops(stops)).toEqual([stops]);
  });

  it("overlaps chunk edges so consecutive road legs stay connected", () => {
    const stops = Array.from({ length: 6 }, (_, index) => ({ lat: index, lng: index }));
    expect(chunkRouteStops(stops, 2)).toEqual([
      [stops[0], stops[1], stops[2], stops[3]],
      [stops[3], stops[4], stops[5]],
    ]);
  });
});

describe("decodePolyline", () => {
  it("decodes a Google encoded polyline into lat/lng points", () => {
    const path = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]?.lat).toBeCloseTo(38.5, 1);
    expect(path[0]?.lng).toBeCloseTo(-120.2, 1);
  });

  it("returns an empty path for an empty encoding", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});
