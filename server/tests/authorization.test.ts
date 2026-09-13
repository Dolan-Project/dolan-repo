import { describe, expect, it } from "vitest";
import type { AuthIdentity, SessionActor, TripAccessContext } from "@dolan/shared";
import { authorize } from "../src/modules/auth/authorization.ts";

const completeUser: AuthIdentity = {
  id: "11111111-1111-4111-8111-111111111111",
  authReference: "auth-verified-complete",
  email: "verified@dolan.test",
  role: "USER",
  status: "ACTIVE",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  username: "alya",
  displayName: "Alya",
  domicile: "Jakarta",
  avatarUrl: null,
  coverUrl: null,
  bio: null,
};

function userActor(overrides: Partial<AuthIdentity> = {}, trip?: TripAccessContext): SessionActor {
  return {
    kind: "user",
    user: { ...completeUser, ...overrides },
    trip,
  };
}

describe("authorization rules", () => {
  it("allows guests to read public features", () => {
    expect(authorize({ kind: "guest" }, "read_public").allowed).toBe(true);
  });

  it("requires login to create a draft", () => {
    const decision = authorize({ kind: "guest" }, "create_draft");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.status).toBe(401);
  });

  it("requires verified email for publish, join, comment, and follow", () => {
    const actor = userActor({ emailVerifiedAt: null });
    for (const capability of ["publish_trip", "join_trip", "comment", "follow"] as const) {
      const decision = authorize(actor, capability);
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) expect(decision.code).toBe("EMAIL_UNVERIFIED");
    }
  });

  it("requires a complete profile for publish and join only", () => {
    const actor = userActor({ username: null, displayName: null, domicile: null });
    expect(authorize(actor, "publish_trip").allowed).toBe(false);
    expect(authorize(actor, "join_trip").allowed).toBe(false);
    expect(authorize(actor, "comment").allowed).toBe(true);
    expect(authorize(actor, "follow").allowed).toBe(true);
  });

  it("blocks pending members from chat", () => {
    const actor = userActor({}, {
      tripId: "trip-1",
      memberRole: null,
      membershipStatus: null,
      joinRequestStatus: "PENDING",
    });
    const decision = authorize(actor, "read_chat");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.code).toBe("PENDING_MEMBER");
  });

  it("blocks suspended accounts from draft creation", () => {
    const decision = authorize(userActor({ status: "SUSPENDED" }), "create_draft");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("lets login reach join approval so the service can hide unknown trips", () => {
    const decision = authorize(userActor(), "approve_join");
    expect(decision.allowed).toBe(true);
  });

  it("allows active participants to read chat", () => {
    const actor = userActor({}, {
      tripId: "trip-1",
      memberRole: "PARTICIPANT",
      membershipStatus: "ACTIVE",
      joinRequestStatus: "ACCEPTED",
    });
    expect(authorize(actor, "read_chat").allowed).toBe(true);
  });
});
