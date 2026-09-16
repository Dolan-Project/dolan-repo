import { AuthErrorCode } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { AuthAdapter } from "./auth-adapter.ts";
import { MOCK_TOKENS } from "./mock-auth-adapter.ts";
import type { SessionStore } from "./session-store.ts";
import type { UserRepository } from "./user-repository.ts";

/** Validates opaque local session tokens; falls back to mock tokens for tests. */
export class LocalSessionAuthAdapter implements AuthAdapter {
  constructor(
    private readonly sessions: SessionStore,
    private readonly users: UserRepository,
  ) {}

  async validateAccessToken(accessToken: string) {
    const mock = MOCK_TOKENS[accessToken];
    if (mock) return mock;

    const session = await this.sessions.findValidSession(accessToken);
    if (!session) {
      throw new HttpError(401, AuthErrorCode.INVALID_TOKEN, "Sesi kamu sudah berakhir. Silakan masuk lagi.");
    }
    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new HttpError(401, AuthErrorCode.INVALID_TOKEN, "Sesi kamu sudah berakhir. Silakan masuk lagi.");
    }
    return {
      authReference: user.authReference,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
