import { describe, expect, it } from "vitest";
import { mockGetMe, mockGetPublicProfile } from "./profile";
import { samplePublicUser } from "./fixtures";

describe("profile mocks", () => {
  it("get me returns AuthSession", () => {
    const result = mockGetMe("success");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.id).toBe(samplePublicUser.id);
      expect(typeof result.data.profileComplete).toBe("boolean");
    }
  });

  it("public profile has no email", () => {
    const result = mockGetPublicProfile("success");
    expect(result.success).toBe(true);
    if (result.success) {
      expect("email" in result.data).toBe(false);
    }
  });

  it("unauthorized me returns UNAUTHORIZED", () => {
    const result = mockGetMe("unauthorized");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });
});
