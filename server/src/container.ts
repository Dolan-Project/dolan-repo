import { env } from "./config/env.ts";
import type { AuthAdapter } from "./integrations/supabase/auth-adapter.ts";
import { MockAuthAdapter } from "./integrations/supabase/mock-auth-adapter.ts";
import { SupabaseAuthAdapter } from "./integrations/supabase/supabase-auth-adapter.ts";
import { AuthService } from "./modules/auth/auth-service.ts";
import { MemoryUserRepository } from "./modules/auth/user-repository.ts";
import { MockGeminiAdapter } from "./modules/jobs/gemini-adapter.ts";
import { MemoryJobRepository } from "./modules/jobs/job-repository.ts";
import { GenerationJobService } from "./modules/jobs/job-service.ts";

export function createAuthAdapter(): AuthAdapter {
  if (env.authAdapter === "supabase" && env.supabaseUrl && env.supabaseServiceRoleKey) {
    return new SupabaseAuthAdapter();
  }
  return new MockAuthAdapter();
}

export function createAuthService() {
  return new AuthService(createAuthAdapter(), new MemoryUserRepository());
}

export function createJobService() {
  return new GenerationJobService(new MemoryJobRepository(), new MockGeminiAdapter());
}
