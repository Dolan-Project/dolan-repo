import { describe, expect, it } from "vitest";
import type { PublicUser } from "./kickoff.js";
import { isProfileComplete } from "./auth.js";

const baseUser: PublicUser = {
  id: "u1",
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
};

describe("isProfileComplete", () => {
  it("is true when username, displayName, and domicile are filled", () => {
    expect(isProfileComplete(baseUser)).toBe(true);
  });

  it("is false when domicile is missing", () => {
    expect(isProfileComplete({ ...baseUser, domicile: null })).toBe(false);
  });
});
