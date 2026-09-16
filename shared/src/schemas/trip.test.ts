import { describe, expect, it } from "vitest";
import {
  createTripBodySchema,
  createTripSchema,
  deleteTripBodySchema,
  idempotencyKeySchema,
  joinReviewBodySchema,
  myTripsQuerySchema,
  publishTripSchema,
  tripDeletedHostMessage,
} from "./trip.ts";

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

const knownBase = {
  path: "known" as const,
  title: "Sailing Komodo 4D3N",
  description: "Patungan phinisi swadaya",
  origin: "Bandara Soekarno-Hatta (CGK), Jakarta",
  destinationCity: "Labuan Bajo",
  startDate: "2026-10-24",
  endDate: "2026-10-27",
  transport: "Kapal Phinisi",
  planningPartySize: 4,
  budgetAmount: 2_000_000,
  budgetBasis: "PER_PERSON" as const,
  visibility: "PRIVATE" as const,
};

describe("createTripSchema", () => {
  it("requires destinationCity on the known-destination path", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      destinationCity: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty destinationCity on the AI path", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      path: "ai",
      destinationCity: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      startDate: "2026-10-27",
      endDate: "2026-10-24",
    });
    expect(result.success).toBe(false);
  });

  it("rejects public trip when capacity equals planning party size is missing or below host-inclusive minimum", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      visibility: "PUBLIC",
      maxParticipants: 1,
      meetingPoint: "Bandara Komodo (LBJ)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects public meetingPoint that copies the private origin", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      visibility: "PUBLIC",
      maxParticipants: 7,
      meetingPoint: knownBase.origin,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a public draft payload with separate capacity and meeting point", () => {
    const result = createTripSchema.safeParse({
      ...knownBase,
      visibility: "PUBLIC",
      maxParticipants: 7,
      meetingPoint: "Bandara Komodo (LBJ)",
    });
    expect(result.success).toBe(true);
  });
});

describe("publishTripSchema", () => {
  it("requires explicit confirmation", () => {
    const result = publishTripSchema.safeParse({
      confirmPublish: false,
      visibility: "PRIVATE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a confirmed private publish", () => {
    const result = publishTripSchema.safeParse({
      confirmPublish: true,
      visibility: "PRIVATE",
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteTripBodySchema", () => {
  it("requires a reason of at least 3 characters", () => {
    expect(deleteTripBodySchema.safeParse({}).success).toBe(false);
    expect(deleteTripBodySchema.safeParse({ reason: "ab" }).success).toBe(false);
    expect(deleteTripBodySchema.parse({ reason: "  Rencana berubah.  " }).reason).toBe("Rencana berubah.");
  });

  it("builds a host goodbye that includes the reason", () => {
    expect(tripDeletedHostMessage("Kuota tidak cukup.")).toBe(
      "Grup trip ini dihapus host. Alasan: Kuota tidak cukup.",
    );
  });
});
