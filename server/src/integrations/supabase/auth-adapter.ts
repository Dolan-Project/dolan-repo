/** Re-export for existing test imports. Prefer `modules/auth/mock-auth-adapter`. */
export { MOCK_TOKENS, MockAuthAdapter } from "../../modules/auth/mock-auth-adapter.ts";
export type { AuthAdapter, AuthProviderUser, SupabaseAuthUser } from "../../modules/auth/auth-adapter.ts";
export { assertNoClientRolePayload } from "../../modules/auth/auth-adapter.ts";
