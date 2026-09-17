import { describe, expect, it } from "vitest";
import type { TripSummary } from "@dolan/shared";
import { normalizeTripSort, sortTrips } from "../src/modules/search/trip-rank.ts";

const TODAY = "2026-09-13";

function trip(id: string, patch: Partial<TripSummary> = {}): TripSummary {
  return {
    id,
    title: id,
    destinationCity: "Yogyakarta",
    visibility: "PUBLIC",
    status: "OPEN",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    participantCount: 1,
    pendingRequestCount: 0,
    coverPlace: null,
    publicMeetingPointLabel: null,
    publicMeetingPointLatitude: null,
    publicMeetingPointLongitude: null,
    ...patch,
  };
}

describe("trip search ranking (PRD F02)", () => {
  it("treats recent as soonest departure", () => {
    expect(normalizeTripSort("recent")).toBe("soonest");
  });

  it("sorts soonest upcoming start dates first", () => {
    const items = [
      trip("later", { startDate: "2026-12-01" }),
      trip("soon", { startDate: "2026-09-20" }),
      trip("undated", { startDate: null }),
      trip("past", { startDate: "2026-08-01" }),
    ];
    expect(sortTrips(items, "soonest", undefined, TODAY).map((item) => item.id)).toEqual([
      "soon",
      "later",
      "past",
      "undated",
    ]);
    expect(sortTrips(items, "recent", undefined, TODAY)[0].id).toBe("soon");
  });

  it("sorts nearest by public meeting point, not missing coords first", () => {
    const malioboro = trip("malioboro", {
      publicMeetingPointLatitude: -7.7928,
      publicMeetingPointLongitude: 110.3658,
    });
    const prambanan = trip("prambanan", {
      publicMeetingPointLatitude: -7.752,
      publicMeetingPointLongitude: 110.4915,
    });
    const unknown = trip("unknown");
    const origin = { latitude: -7.752, longitude: 110.4915 };
    expect(sortTrips([malioboro, prambanan, unknown], "nearest", origin, TODAY).map((item) => item.id)).toEqual([
      "prambanan",
      "malioboro",
      "unknown",
    ]);
  });

  it("keeps popular ranking by non-host participants then pending", () => {
    const quiet = trip("quiet", { participantCount: 1, pendingRequestCount: 9 });
    const busy = trip("busy", { participantCount: 8, pendingRequestCount: 0 });
    expect(sortTrips([quiet, busy], "popular", undefined, TODAY)[0].id).toBe("busy");
  });
});
