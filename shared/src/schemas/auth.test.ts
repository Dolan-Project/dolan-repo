import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.js";

describe("registerSchema", () => {
  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "traveler.dolan@bukanemail",
      password: "rahasia8",
      confirmPassword: "rahasia8",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toMatch(/email/i);
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "rani@dolan.test",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when confirm password does not match", () => {
    const result = registerSchema.safeParse({
      email: "rani@dolan.test",
      password: "rahasia8",
      confirmPassword: "lain1234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload and optional next path", () => {
    const result = registerSchema.safeParse({
      email: "rani@dolan.test",
      password: "rahasia8",
      confirmPassword: "rahasia8",
      next: "/buat-trip",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid optional username", () => {
    expect(
      registerSchema.safeParse({
        email: "rani@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
        username: "rani_trip",
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        email: "rani@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
        username: "ab",
      }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email and password", () => {
    const result = loginSchema.safeParse({
      email: "salsa@dolan.test",
      password: "rahasia8",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bukan" }).success).toBe(
      false,
    );
    expect(
      forgotPasswordSchema.safeParse({ email: "salsa@dolan.test" }).success,
    ).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("requires token and matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: "reset_ok",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }).success,
    ).toBe(true);
  });
});
