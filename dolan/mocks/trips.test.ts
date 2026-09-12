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
    expect(pending.success).toBe(true);
    if (pending.success) {
      expect(pending.data).toHaveLength(0);
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
