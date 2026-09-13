import { AuthErrorCode } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { AuthAdapter, SupabaseAuthUser } from "./auth-adapter.ts";

export const MOCK_TOKENS: Record<string, SupabaseAuthUser> = {
  "mock-verified-complete": {
    authReference: "auth-verified-complete",
    email: "verified@dolan.test",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  },
  "mock-unverified": {
    authReference: "auth-unverified",
    email: "unverified@dolan.test",
    emailVerifiedAt: null,
  },
  "mock-incomplete-profile": {
    authReference: "auth-incomplete",
    email: "incomplete@dolan.test",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  },
  "mock-admin": {
    authReference: "auth-admin",
    email: "admin@dolan.test",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  },
  "mock-verified-budi": {
    authReference: "auth-verified-budi",
    email: "budi@dolan.test",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  },
};

export class MockAuthAdapter implements AuthAdapter {
  async validateAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
    const user = MOCK_TOKENS[accessToken];
    if (!user) {
      throw new HttpError(401, AuthErrorCode.INVALID_TOKEN, "Invalid or expired session");
    }
    return user;
  }
}
