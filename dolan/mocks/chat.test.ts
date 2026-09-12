import { describe, expect, it } from "vitest";
import { mockListMessages } from "./chat";

describe("chat mocks", () => {
  it("denies pending members from reading messages", () => {
    const result = mockListMessages("success", "pending");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_MEMBER");
    }
  });

  it("allows host to read messages", () => {
    const result = mockListMessages("success", "host");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]?.clientMessageId).toBeTruthy();
    }
  });
});
