import type { AuthIdentity, SessionResponse } from "@dolan/shared";
import type { AuthAdapter } from "../../integrations/supabase/auth-adapter.ts";
import { isEmailVerified, isProfileComplete } from "./authorization.ts";
import type { UserRepository } from "./user-repository.ts";

export class AuthService {
  constructor(
    private readonly authAdapter: AuthAdapter,
    private readonly users: UserRepository,
  ) {}

  async resolveSession(accessToken: string): Promise<AuthIdentity> {
    const providerUser = await this.authAdapter.validateAccessToken(accessToken);
    return this.users.upsertFromAuth({
      authReference: providerUser.authReference,
      email: providerUser.email,
      emailVerifiedAt: providerUser.emailVerifiedAt,
    });
  }

  toSessionResponse(user: AuthIdentity): SessionResponse {
    return {
      id: user.id,
      authReference: user.authReference,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: isEmailVerified(user),
      profileComplete: isProfileComplete(user),
      username: user.username,
      displayName: user.displayName,
      domicile: user.domicile,
    };
  }
}
