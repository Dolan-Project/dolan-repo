import { describe, expect, it } from "vitest";
import {
  applyLiveRoadRoutes,
  encodedRoutePolylines,
  formatDistanceKm,
  formatStopTravel,
  formatTravelMinutes,
  itineraryHasUnavailableRoute,
  ROUTE_UNAVAILABLE_TEXT,
} from "./route-travel";

describe("route travel labels", () => {
  it("formats GMaps distance and duration", () => {
    expect(formatDistanceKm(12300)).toBe("12,3 km");
    expect(formatTravelMinutes(25)).toBe("25 menit");
    expect(formatTravelMinutes(90)).toBe("1 jam 30 menit");
  });

  it("shows unavailable copy instead of a fake straight-line distance", () => {
    expect(formatStopTravel({ routeStatus: "UNAVAILABLE", travelDistanceMeters: 40000 }, false)).toBe(
      ROUTE_UNAVAILABLE_TEXT,
    );
    expect(formatStopTravel({ routeStatus: "AVAILABLE", travelDistanceMeters: 8500, travelDurationMinutes: 18 }, false)).toBe(
      "8,5 km · 18 menit",
    );
    expect(formatStopTravel({ routeStatus: "UNAVAILABLE" }, true)).toBeNull();
    expect(formatStopTravel({ travelDurationMinutes: 20, travelDistanceMeters: 8000 }, false)).toBeNull();
    expect(formatStopTravel({ routeStatus: "AVAILABLE", travelDistanceMeters: 100_000, travelDurationMinutes: 20 }, false)).toMatch(
      /perlu verifikasi/,
    );
  });

  it("keeps encoded polylines only for available segments", () => {
    const days = [
      {
        stops: [
          { routePolyline: null, routeStatus: "PENDING" },
          { routePolyline: "abc", routeStatus: "AVAILABLE" },
          { routePolyline: "xyz", routeStatus: "UNAVAILABLE" },
        ],
      },
    ];
    expect(encodedRoutePolylines(days)).toEqual(["abc"]);
    expect(itineraryHasUnavailableRoute(days)).toBe(true);
  });

  it("writes Google road polylines onto stops after a location edit", async () => {
    const days = [
      {
        stops: [
          { place: { latitude: -6.9025, longitude: 107.6187 }, travelDurationMinutes: 0, routePolyline: null, routeStatus: "PENDING" as const },
          { place: { latitude: -6.9174, longitude: 107.609 }, travelDurationMinutes: null, routePolyline: "stale", routeStatus: "AVAILABLE" as const },
        ],
      },
    ];
    const routed = await applyLiveRoadRoutes(days, async () =>
      new Response(JSON.stringify({
        data: { segments: [{ ok: true, encodedPolyline: "newroad", durationMinutes: 12, distanceMeters: 2800 }] },
      }), { status: 200 }),
    );
    expect(routed[0]?.stops[1]?.routePolyline).toBe("newroad");
    expect(routed[0]?.stops[1]?.travelDurationMinutes).toBe(12);
    expect(routed[0]?.stops[1]?.routeStatus).toBe("AVAILABLE");
  });
});
