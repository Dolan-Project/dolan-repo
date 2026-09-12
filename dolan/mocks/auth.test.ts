import { describe, expect, it } from "vitest";
import { mockForgotPassword, mockLogin, mockRegister } from "./auth";

describe("auth mocks", () => {
  it("returns AuthSession without password or token on success", () => {
    const result = mockLogin("success");
    expect(result.success).toBe(true);
    if (result.success) {
      expect("password" in result.data).toBe(false);
      expect("accessToken" in result.data).toBe(false);
      expect("email" in result.data.user).toBe(false);
    }
  });

  it("returns EMAIL_TAKEN on register conflict", () => {
    const result = mockRegister("validationError");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("EMAIL_TAKEN");
    }
  });

  it("forgot-password success does not reveal whether email exists", () => {
    const result = mockForgotPassword("success");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe(
        "Jika email terdaftar, tautan reset telah dikirim.",
      );
    }
  });
});
