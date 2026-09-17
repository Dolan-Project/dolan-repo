import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, createOpaqueToken, hashToken } from "../src/modules/auth/password.ts";

describe("password helpers", () => {
  it("hashes and verifies a password", () => {
    const stored = hashPassword("rahasia8");
    expect(verifyPassword("rahasia8", stored)).toBe(true);
    expect(verifyPassword("salah", stored)).toBe(false);
    expect(verifyPassword("rahasia8", null)).toBe(false);
    expect(verifyPassword("rahasia8", "plain")).toBe(false);
    expect(verifyPassword("rahasia8", "scrypt$ab$zz")).toBe(false);
  });

  it("creates opaque tokens", () => {
    expect(createOpaqueToken().length).toBeGreaterThan(20);
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
  });
});
