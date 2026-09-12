import { describe, expect, it } from "vitest";
import { toAuthIdentity } from "../src/modules/auth/sequelize-user-repository.ts";

describe("sequelize user mapping", () => {
  it("maps a user without a profile as incomplete and never invents a role", () => {
    const identity = toAuthIdentity(
      {
        id: "11111111-1111-4111-8111-111111111111",
        authReference: "auth-1",
        email: "host@dolan.test",
        role: "USER",
        status: "ACTIVE",
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as never,
      null,
    );

    expect(identity.username).toBeNull();
    expect(identity.role).toBe("USER");
    expect(identity.emailVerifiedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("maps profile fields when Wira's user_profiles row exists", () => {
    const identity = toAuthIdentity(
      {
        id: "11111111-1111-4111-8111-111111111111",
        authReference: "auth-1",
        email: "host@dolan.test",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: null,
      } as never,
      {
        username: "wira",
        displayName: "Wira",
        domicile: "Yogyakarta",
        avatarUrl: null,
        coverUrl: null,
        bio: "dev",
      } as never,
    );

    expect(identity.username).toBe("wira");
    expect(identity.displayName).toBe("Wira");
    expect(identity.domicile).toBe("Yogyakarta");
    expect(identity.role).toBe("ADMIN");
    expect(identity.emailVerifiedAt).toBeNull();
  });
});
