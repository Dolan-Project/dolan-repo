import { describe, expect, it } from "vitest";
import { isJobReadyForClaim, retryWaitMs } from "../src/modules/jobs/backoff.ts";

describe("job retry backoff", () => {
  it("does not delay a fresh job", () => {
    expect(retryWaitMs(0, 2000)).toBe(0);
    expect(
      isJobReadyForClaim({ attemptCount: 0, updatedAt: new Date().toISOString() }, new Date(), 2000),
    ).toBe(true);
  });

  it("doubles the wait after the first attempt", () => {
    expect(retryWaitMs(1, 2000)).toBe(2000);
    expect(retryWaitMs(2, 2000)).toBe(4000);
    const updatedAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
    expect(isJobReadyForClaim({ attemptCount: 1, updatedAt }, new Date("2026-01-01T00:00:01.000Z"), 2000)).toBe(
      false,
    );
    expect(isJobReadyForClaim({ attemptCount: 1, updatedAt }, new Date("2026-01-01T00:00:02.000Z"), 2000)).toBe(
      true,
    );
  });
});
