import { describe, expect, it } from "vitest";
import { AUTH_PATHS } from "./auth-paths.js";

describe("AUTH_PATHS", () => {
  it("locks Next.js auth routes from TEAM-D1 spec", () => {
    expect(AUTH_PATHS.register).toBe("/api/auth/register");
    expect(AUTH_PATHS.login).toBe("/api/auth/login");
    expect(AUTH_PATHS.logout).toBe("/api/auth/logout");
    expect(AUTH_PATHS.callback).toBe("/api/auth/callback");
    expect(AUTH_PATHS.google).toBe("/api/auth/google");
    expect(AUTH_PATHS.forgotPassword).toBe("/api/auth/forgot-password");
    expect(AUTH_PATHS.resetPassword).toBe("/api/auth/reset-password");
    expect(AUTH_PATHS.verifyEmail).toBe("/api/auth/verify-email");
    expect(AUTH_PATHS.resendVerification).toBe("/api/auth/resend-verification");
  });
});
