import { initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { FakePlacesClient } from "./integrations/google/fake-places-client.ts";
import { GooglePlacesClient, type PlacesProvider } from "./integrations/google/places-client.ts";
import type { AuthAdapter } from "./integrations/supabase/auth-adapter.ts";
import { MockAuthAdapter } from "./integrations/supabase/mock-auth-adapter.ts";
import { SupabaseAuthAdapter } from "./integrations/supabase/supabase-auth-adapter.ts";
import { AuthService } from "./modules/auth/auth-service.ts";
import { MemoryUserRepository } from "./modules/auth/user-repository.ts";
import { MemorySearchStore } from "./modules/search/memory-store.ts";
import { MemoryQuotaStore, QuotaService } from "./modules/search/quota.ts";
import { SearchService } from "./modules/search/search-service.ts";
import { SequelizeQuotaStore } from "./modules/search/sequelize-quota.ts";
import { SequelizeSearchStore } from "./modules/search/sequelize-store.ts";

export function createAuthAdapter(): AuthAdapter {
  if (env.authAdapter === "supabase" && env.supabaseUrl && env.supabaseServiceRoleKey) {
    return new SupabaseAuthAdapter();
  }
  return new MockAuthAdapter();
}

export function createAuthService() {
  return new AuthService(createAuthAdapter(), new MemoryUserRepository());
}

export function createMemorySearchService(options?: {
  placesProvider?: PlacesProvider;
  quotaLimit?: number;
  store?: MemorySearchStore;
}) {
  return new SearchService(
    options?.placesProvider ?? new FakePlacesClient(),
    options?.store ?? new MemorySearchStore(),
    new QuotaService(new MemoryQuotaStore(), options?.quotaLimit ?? env.placesMaxRequestsPerUserPerDay),
  );
}

export function createProductionSearchService() {
  initModels();
  return new SearchService(
    new GooglePlacesClient(env.googleMapsServerKey),
    new SequelizeSearchStore(),
    new QuotaService(new SequelizeQuotaStore(), env.placesMaxRequestsPerUserPerDay),
  );
}
