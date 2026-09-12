import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AuthErrorCode } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { HttpError } from "../../lib/api-error.ts";
import type { AuthAdapter, SupabaseAuthUser } from "./auth-adapter.ts";

export class SupabaseAuthAdapter implements AuthAdapter {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client =
      client ??
      createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
  }

  async validateAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user || !data.user.email) {
      throw new HttpError(401, AuthErrorCode.INVALID_TOKEN, "Invalid or expired session");
    }

    const verifiedAt = data.user.email_confirmed_at ?? data.user.confirmed_at ?? null;
    return {
      authReference: data.user.id,
      email: data.user.email,
      emailVerifiedAt: verifiedAt,
    };
  }
}
