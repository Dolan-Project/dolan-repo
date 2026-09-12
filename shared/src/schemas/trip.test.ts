import { describe, expect, it } from "vitest";
import { createTripBodySchema, idempotencyKeySchema, joinReviewBodySchema, myTripsQuerySchema } from "./trip.ts";

describe("trip schemas", () => {
  it("rejects an end date before the start date", () => {
    const parsed = createTripBodySchema.safeParse({
      title: "Yogya",
      startDate: "2026-10-03",
      endDate: "2026-10-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults a new trip to private visibility", () => {
    const parsed = createTripBodySchema.parse({ title: "Yogya" });
    expect(parsed.visibility).toBe("PRIVATE");
    expect(parsed.planningPartySize).toBe(1);
  });

  it("accepts join review decisions used by the host panel", () => {
    expect(joinReviewBodySchema.parse({ decision: "accept" }).decision).toBe("accept");
    expect(joinReviewBodySchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });

  it("filters My Trip by hosted, joined, or pending", () => {
    expect(myTripsQuerySchema.parse({}).role).toBe("hosted");
    expect(myTripsQuerySchema.parse({ role: "pending" }).role).toBe("pending");
  });

  it("requires idempotency keys to be UUIDs", () => {
    expect(idempotencyKeySchema.safeParse("not-a-uuid").success).toBe(false);
    expect(idempotencyKeySchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(true);
  });
});
