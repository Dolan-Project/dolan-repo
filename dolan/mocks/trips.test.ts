import { describe, expect, it } from "vitest";
import { mockCreateTrip, mockListMyTrips } from "./trips";

describe("trip mocks", () => {
  it("does not include joinFee on trip summaries", () => {
    const result = mockListMyTrips("success", "hosted");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.every((trip) => !("joinFee" in trip))).toBe(true);
    }
  });

  it("keeps pending lists separate from joined", () => {
    const pending = mockListMyTrips("success", "pending");
    const joined = mockListMyTrips("success", "joined");
    expect(pending.success && joined.success).toBe(true);
    if (pending.success && joined.success) {
      const joinedIds = new Set(joined.data.map((trip) => trip.id));
      expect(pending.data.length).toBeGreaterThan(0);
      expect(pending.data.every((trip) => !joinedIds.has(trip.id))).toBe(true);
    }
  });

  it("create trip empty scenario returns no trip body payment fields", () => {
    const created = mockCreateTrip("success");
    expect(created.success).toBe(true);
    if (created.success) {
      expect("joinFee" in created.data).toBe(false);
    }
  });
});
