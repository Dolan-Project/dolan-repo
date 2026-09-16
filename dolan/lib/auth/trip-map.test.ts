import { describe, expect, it } from "vitest";
import {
  aliasTripDetail,
  createTripBodyFromInput,
  hostTransitionPath,
  publishBodyFromUi,
  updateTripBodyFromInput,
} from "./trip-map";

const input = {
  path: "known" as const,
  title: "Sailing Komodo 4D3N",
  description: "Patungan phinisi",
  origin: "Jakarta",
  destinationCity: "Labuan Bajo",
  startDate: "2026-10-24",
  endDate: "2026-10-27",
  transport: "Kapal Phinisi",
  planningPartySize: 4,
  budgetAmount: 2_000_000,
  budgetBasis: "PER_PERSON" as const,
  activityPrefs: ["Snorkeling"],
  lodgingPref: "Homestay",
  visibility: "PUBLIC" as const,
  maxParticipants: 7,
  meetingPoint: "Bandara Komodo (LBJ)",
  companionNote: "Join gratis",
};

describe("createTripBodyFromInput", () => {
  it("maps wizard fields onto the Express create-trip body", async () => {
    const body = await createTripBodyFromInput(input);
    expect(body.originLabel).toBe("Jakarta");
    expect(body.originLatitude).toBeCloseTo(-6.2088, 3);
    expect(body.transportMode).toBe("Kapal Phinisi");
    expect(body.budgetAmount).toBe("2000000");
    expect(body.publicMeetingPointLabel).toBe("Bandara Komodo (LBJ)");
    expect(body.publicMeetingPointLatitude).toBeCloseTo(-8.4866, 3);
    expect(body.preferences).toMatchObject({ path: "known" });
    expect("origin" in body).toBe(false);
    expect("meetingPoint" in body).toBe(false);
  });
});

describe("updateTripBodyFromInput", () => {
  it("sends origin and meeting point under Express field names", async () => {
    const body = await updateTripBodyFromInput(input);
    expect(body.originLabel).toBe("Jakarta");
    expect(body.publicMeetingPointLabel).toBe("Bandara Komodo (LBJ)");
    expect(body.budgetAmount).toBe("2000000");
  });
});

describe("publishBodyFromUi", () => {
  it("drops confirmPublish before calling Express", () => {
    expect(publishBodyFromUi({ confirmPublish: true, visibility: "PUBLIC" })).toEqual({
      visibility: "PUBLIC",
    });
  });
});

describe("hostTransitionPath", () => {
  it("maps UI actions onto Wira transition URLs", () => {
    expect(hostTransitionPath("t1", "close")).toBe("/api/v1/trips/t1/close");
    expect(hostTransitionPath("t1", "reopen")).toBe("/api/v1/trips/t1/reopen");
    expect(hostTransitionPath("t1", "start")).toBe("/api/v1/trips/t1/start");
    expect(hostTransitionPath("t1", "complete")).toBe("/api/v1/trips/t1/complete");
    expect(hostTransitionPath("t1", "cancel")).toBe("/api/v1/trips/t1/cancel");
    expect(hostTransitionPath("t1", "nope")).toBeNull();
  });
});

describe("aliasTripDetail", () => {
  it("fills wizard aliases from Express field names", () => {
    const aliased = aliasTripDetail({
      id: "t1",
      title: "Jelajah Yogyakarta",
      description: null,
      visibility: "PUBLIC",
      status: "OPEN",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      timezone: "Asia/Jakarta",
      destinationCity: "Yogyakarta",
      transportMode: "Kereta",
      budgetAmount: "1500000",
      budgetBasis: "PER_PERSON",
      currency: "IDR",
      planningPartySize: 4,
      maxParticipants: 6,
      publicMeetingPointLabel: "Stasiun Tugu",
      publicMeetingPointLatitude: -7.7891,
      publicMeetingPointLongitude: 110.3636,
      privateOriginLabel: "Jakarta",
      privateOriginLatitude: -6.2088,
      privateOriginLongitude: 106.8456,
      preferences: { path: "known" },
      host: {
        id: "user_salsa",
        username: "salsa",
        displayName: "Salsa",
        avatarUrl: null,
        coverUrl: null,
        bio: null,
        domicile: "Jakarta",
        instagramUrl: null,
        tiktokUrl: null,
        followersCount: 0,
        followingCount: 0,
        hostTripCount: 0,
        participantTripCount: 0,
        rating: {
          overall: null,
          communication: null,
          attitude: null,
          reviewCount: 0,
        },
      },
      viewerRole: "host",
      activeParticipantCount: 1,
      pendingRequestCount: 0,
      joinFree: true,
      currentItineraryVersionId: null,
      myJoinRequest: null,
    });
    expect(aliased.origin).toBe("Jakarta");
    expect(aliased.meetingPoint).toBe("Stasiun Tugu");
    expect(aliased.transport).toBe("Kereta");
  });
});
