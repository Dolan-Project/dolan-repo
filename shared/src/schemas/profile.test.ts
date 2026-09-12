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
  });
});
