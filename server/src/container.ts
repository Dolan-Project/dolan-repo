import { initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { FakePlacesClient } from "./integrations/google/fake-places-client.ts";
import { GooglePlacesClient, type PlacesProvider } from "./integrations/google/places-client.ts";
import type { AuthAdapter } from "./integrations/supabase/auth-adapter.ts";
import { MockAuthAdapter } from "./integrations/supabase/mock-auth-adapter.ts";
import { SupabaseAuthAdapter } from "./integrations/supabase/supabase-auth-adapter.ts";
import { AuthService } from "./modules/auth/auth-service.ts";
import { ChatService } from "./modules/chat/chat-service.ts";
import { MemoryChatStore } from "./modules/chat/memory-chat-store.ts";
import { SequelizeChatStore } from "./modules/chat/sequelize-chat-store.ts";
import { SequelizeUserRepository } from "./modules/auth/sequelize-user-repository.ts";
import { MemoryUserRepository, type UserRepository } from "./modules/auth/user-repository.ts";
import { GeminiAdapter, MockGeminiAdapter } from "./modules/jobs/gemini-adapter.ts";
import { MemoryJobRepository } from "./modules/jobs/job-repository.ts";
import { GenerationJobService } from "./modules/jobs/job-service.ts";
import { createPlaceLookup } from "./modules/jobs/place-lookup.ts";
import { loadDraftTrip, loadLockedStops, persistGeneratedVersion } from "./modules/jobs/persist-itinerary.ts";
import { GoogleRoutesClient, MockRoutesClient } from "./modules/jobs/routes-adapter.ts";
import { SequelizeJobRepository } from "./modules/jobs/sequelize-job-repository.ts";
import { MemorySearchStore } from "./modules/search/memory-store.ts";
import { MemoryQuotaStore, QuotaService } from "./modules/search/quota.ts";
import { SearchService } from "./modules/search/search-service.ts";
import { SequelizeQuotaStore } from "./modules/search/sequelize-quota.ts";
import { SequelizeSearchStore } from "./modules/search/sequelize-store.ts";
import { MemoryTripStore } from "./modules/trips/memory-store.ts";
import { SequelizeTripStore } from "./modules/trips/sequelize-store.ts";
import { TripService } from "./modules/trips/trip-service.ts";

export function createAuthAdapter(): AuthAdapter {
  if (env.authAdapter === "supabase" && env.supabaseUrl && env.supabaseServiceRoleKey) {
    return new SupabaseAuthAdapter();
  }
  return new MockAuthAdapter();
}

export function createUserRepository(useDatabase: boolean): UserRepository {
  return useDatabase ? new SequelizeUserRepository() : new MemoryUserRepository();
}

export function createAuthService(users?: UserRepository) {
  return new AuthService(createAuthAdapter(), users ?? new MemoryUserRepository());
}

export function createChatService(useDatabase: boolean) {
  return new ChatService(useDatabase ? new SequelizeChatStore() : new MemoryChatStore());
}

export function createJobService() {
  return new GenerationJobService(new MemoryJobRepository(), new MockGeminiAdapter(), {
    routes: new MockRoutesClient(),
  });
}

export function createProductionJobService() {
  initModels();
  const places = env.googleMapsServerKey
    ? new GooglePlacesClient(env.googleMapsServerKey)
    : new FakePlacesClient();
  const lookup = createPlaceLookup(places, { requireKnownPlace: Boolean(env.googleMapsServerKey) });
  return new GenerationJobService(
    new SequelizeJobRepository(),
    env.geminiApiKey ? new GeminiAdapter(env.geminiApiKey, env.geminiModel) : new MockGeminiAdapter(),
    {
      loadTrip: loadDraftTrip,
      loadLockedStops,
      persistVersion: persistGeneratedVersion,
      routes: env.googleMapsServerKey ? new GoogleRoutesClient(env.googleMapsServerKey) : new MockRoutesClient(),
      resolveCoords: lookup.resolveCoords,
      verifyPlaces: lookup.verifyPlaces,
      requireDatabaseTrip: true,
    },
  );
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

export function createMemoryTripService(store = new MemoryTripStore()) {
  return new TripService(store);
}

export function createProductionTripService() {
  initModels();
  return new TripService(new SequelizeTripStore());
}
