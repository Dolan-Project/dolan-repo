import { describe, expect, it } from "vitest";
import type { AuthSession } from "@/lib/contracts";
import { resolveAfterAuth } from "./post-auth-path";

const base: AuthSession = {
  user: {
    id: "u1",
    username: "salsa",
    displayName: "Salsa",
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    domicile: "Jakarta",
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
  emailVerified: true,
  profileComplete: true,
};

describe("resolveAfterAuth", () => {
  it("sends unverified users to cek-email and keeps next", () => {
    expect(
      resolveAfterAuth({ ...base, emailVerified: false }, "/buat-trip"),
    ).toBe("/cek-email?next=%2Fbuat-trip");
  });

  it("sends incomplete profiles to edit before the intended action", () => {
    expect(
      resolveAfterAuth({ ...base, profileComplete: false }, "/buat-trip"),
    ).toBe("/profil/edit?next=%2Fbuat-trip");
  });

  it("uses the allowlist after a complete verified session", () => {
    expect(resolveAfterAuth(base, "/buat-trip")).toBe("/buat-trip");
    expect(resolveAfterAuth(base, "https://phish.test")).toBe("/");
  });
});
