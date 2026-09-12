import { describe, expect, it } from "vitest";
import { mockRequestJoin } from "./joins";

describe("join mocks", () => {
  it("creates a pending join request without payment fields", () => {
    const result = mockRequestJoin("success");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("PENDING");
      expect("joinFee" in result.data).toBe(false);
    }
  });

  it("returns TRIP_FULL on quota scenario", () => {
    const result = mockRequestJoin("quotaError");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("TRIP_FULL");
    }
  });
});
