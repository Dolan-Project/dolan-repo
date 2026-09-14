export type AuthProviderUser = {
  authReference: string;
  email: string;
  emailVerifiedAt: string | null;
};

/** @deprecated Use AuthProviderUser — kept for gradual import updates. */
export type SupabaseAuthUser = AuthProviderUser;

export interface AuthAdapter {
  validateAccessToken(accessToken: string): Promise<AuthProviderUser>;
}

export function assertNoClientRolePayload(payload: Record<string, unknown>): void {
  if ("role" in payload || "status" in payload) {
    throw new Error("role and status must not be accepted from the client");
  }
}
