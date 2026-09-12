export type SupabaseAuthUser = {
  authReference: string;
  email: string;
  emailVerifiedAt: string | null;
};

export interface AuthAdapter {
  validateAccessToken(accessToken: string): Promise<SupabaseAuthUser>;
}

export function assertNoClientRolePayload(payload: Record<string, unknown>): void {
  if ("role" in payload || "status" in payload) {
    throw new Error("role and status must not be accepted from the client");
  }
}
