import { describe, expect, it } from "vitest";
import { createTripSchema, publishTripSchema } from "./trip.js";

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
