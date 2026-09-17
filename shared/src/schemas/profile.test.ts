import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "./profile.js";

describe("profileUpdateSchema", () => {
  it("requires username, displayName, and domicile", () => {
    const result = profileUpdateSchema.safeParse({
      username: "",
      displayName: "",
      domicile: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects bio longer than 160 characters", () => {
    const result = profileUpdateSchema.safeParse({
      username: "salsa.trek",
      displayName: "Salsa",
      domicile: "Jakarta",
      bio: "x".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete profile payload", () => {
    const result = profileUpdateSchema.safeParse({
      username: "salsa.trek",
      displayName: "Salsa",
      domicile: "Jakarta",
      bio: "Traveler",
      coverCaption: "Sunrise Rinjani",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instagramUrl).toBeNull();
      expect(result.data.tiktokUrl).toBeNull();
    }
  });

  it("normalizes Instagram and TikTok handles to profile URLs", () => {
    const result = profileUpdateSchema.safeParse({
      username: "salsa.trek",
      displayName: "Salsa",
      domicile: "Jakarta",
      instagramUrl: "@salsa.trek",
      tiktokUrl: "https://www.tiktok.com/@salsa_trek",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instagramUrl).toBe("https://www.instagram.com/salsa.trek");
      expect(result.data.tiktokUrl).toBe("https://www.tiktok.com/@salsa_trek");
    }
  });

  it("rejects invalid Instagram or TikTok values", () => {
    const result = profileUpdateSchema.safeParse({
      username: "salsa.trek",
      displayName: "Salsa",
      domicile: "Jakarta",
      instagramUrl: "https://example.com/salsa",
      tiktokUrl: "x",
    });
    expect(result.success).toBe(false);
  });
});
