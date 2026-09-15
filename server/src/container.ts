import { initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { FakePlacesClient } from "./integrations/google/fake-places-client.ts";
import { GooglePlacesClient, type PlacesProvider } from "./integrations/google/places-client.ts";
import type { AuthAdapter } from "./modules/auth/auth-adapter.ts";
import { MockAuthAdapter } from "./modules/auth/mock-auth-adapter.ts";
import { AuthService } from "./modules/auth/auth-service.ts";
import { LocalSessionAuthAdapter } from "./modules/auth/local-auth-adapter.ts";
import { ChatService } from "./modules/chat/chat-service.ts";
import { MemoryChatStore } from "./modules/chat/memory-chat-store.ts";
import { SequelizeChatStore } from "./modules/chat/sequelize-chat-store.ts";
import { SequelizeUserRepository } from "./modules/auth/sequelize-user-repository.ts";
import { MemoryUserRepository, type UserRepository } from "./modules/auth/user-repository.ts";
import {
  MemorySessionStore,
  SequelizeSessionStore,
  type SessionStore,
} from "./modules/auth/session-store.ts";
import { MockGeminiAdapter } from "./modules/jobs/gemini-adapter.ts";
import { GroqAdapter } from "./modules/jobs/groq-adapter.ts";
import { MemoryJobRepository } from "./modules/jobs/job-repository.ts";
import { GenerationJobService, type JobServiceOptions } from "./modules/jobs/job-service.ts";
import { createPlaceLookup } from "./modules/jobs/place-lookup.ts";
import { loadDraftTrip, loadLockedStops, persistGeneratedVersion, saveTripPreferences } from "./modules/jobs/persist-itinerary.ts";
import { GoogleRoutesClient, MockRoutesClient } from "./modules/jobs/routes-adapter.ts";
import { SequelizeJobRepository } from "./modules/jobs/sequelize-job-repository.ts";
import { MemorySearchStore } from "./modules/search/memory-store.ts";
import { MemoryQuotaStore, QuotaService } from "./modules/search/quota.ts";
import { SearchService } from "./modules/search/search-service.ts";
import { SequelizeQuotaStore } from "./modules/search/sequelize-quota.ts";
import { SequelizeSearchStore } from "./modules/search/sequelize-store.ts";
import { ItineraryExportService } from "./modules/location/itinerary-export.ts";
import { loadExportItinerary } from "./modules/location/load-export-itinerary.ts";
import { loadTripPreview } from "./modules/location/load-trip-preview.ts";
import { LocationService } from "./modules/location/location-service.ts";
import { MemoryLocationStore } from "./modules/location/memory-location-store.ts";
import { SequelizeLocationStore } from "./modules/location/sequelize-location-store.ts";
import { SequelizeShareLinkStore } from "./modules/location/sequelize-share-link-store.ts";
import { MemoryShareLinkStore, ShareLinkService } from "./modules/location/share-link-service.ts";
import { MemorySocialStore, SequelizeSocialStore } from "./modules/social/social-queries.ts";
import { MemoryTripStore } from "./modules/trips/memory-store.ts";
import { SequelizeTripStore } from "./modules/trips/sequelize-store.ts";
import { TripService, type TripBlockLookup, type TripRealtime } from "./modules/trips/trip-service.ts";
import { MemoryPostStore } from "./modules/posts/memory-post-store.ts";
import { PostService } from "./modules/posts/post-service.ts";
import { SequelizePostStore } from "./modules/posts/sequelize-post-store.ts";
import type { SocialQueryStore } from "./modules/social/social-queries.ts";

export function createSessionStore(useDatabase: boolean): SessionStore {
  return useDatabase ? new SequelizeSessionStore() : new MemorySessionStore();
}

export function createAuthAdapter(users?: UserRepository, sessions?: SessionStore): AuthAdapter {
  if (env.authAdapter === "mock") {
    return new MockAuthAdapter();
  }
  const userRepo = users ?? new MemoryUserRepository();
  const sessionStore = sessions ?? new MemorySessionStore();
  return new LocalSessionAuthAdapter(sessionStore, userRepo);
}

export function createUserRepository(useDatabase: boolean): UserRepository {
  return useDatabase ? new SequelizeUserRepository() : new MemoryUserRepository();
}

export function createAuthService(users?: UserRepository, sessions?: SessionStore) {
  const userRepo = users ?? new MemoryUserRepository();
  const sessionStore = sessions ?? new MemorySessionStore();
  return new AuthService(createAuthAdapter(userRepo, sessionStore), userRepo, sessionStore);
}

export function createChatService(useDatabase: boolean) {
  return new ChatService(useDatabase ? new SequelizeChatStore() : new MemoryChatStore());
}

export function createJobService(onJobUpdated?: JobServiceOptions["onJobUpdated"]) {
  const aiQuota = new QuotaService(new MemoryQuotaStore(), env.placesMaxRequestsPerUserPerDay);
  return new GenerationJobService(new MemoryJobRepository(), new MockGeminiAdapter(), {
    routes: new MockRoutesClient(),
    onJobUpdated,
    consumeAi: (userId) => aiQuota.consumeAi(userId),
    consumeRoutes: (userId) => aiQuota.consumeRoutes(userId),
  });
}

export function createProductionJobService(onJobUpdated?: JobServiceOptions["onJobUpdated"]) {
  initModels();
  if (!env.googleMapsServerKey) {
    throw new Error("GOOGLE_MAPS_SERVER_KEY is required for production job service");
  }
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is required for production job service");
  }
  const places = new GooglePlacesClient(env.googleMapsServerKey);
  const lookup = createPlaceLookup(places, { requireKnownPlace: true });
  const aiQuota = new QuotaService(new SequelizeQuotaStore(), env.placesMaxRequestsPerUserPerDay);
  return new GenerationJobService(
    new SequelizeJobRepository(),
    new GroqAdapter(env.groqApiKey, env.groqModel),
    {
      loadTrip: loadDraftTrip,
      savePreferences: saveTripPreferences,
      loadLockedStops,
      persistVersion: persistGeneratedVersion,
      routes: new GoogleRoutesClient(env.googleMapsServerKey),
      resolveCoords: lookup.resolveCoords,
      hydratePlaces: lookup.hydratePlaces,
      verifyPlaces: lookup.verifyPlaces,
      requireDatabaseTrip: true,
      onJobUpdated,
      consumeAi: (userId) => aiQuota.consumeAi(userId),
      consumeRoutes: (userId) => aiQuota.consumeRoutes(userId),
    },
  );
}

export function createLocationService(chat: ChatService, useDatabase: boolean) {
  return new LocationService(useDatabase ? new SequelizeLocationStore() : new MemoryLocationStore(), chat);
}

export function createShareLinkService(chat: ChatService, useDatabase: boolean) {
  return new ShareLinkService(
    useDatabase ? new SequelizeShareLinkStore() : new MemoryShareLinkStore(),
    chat,
    useDatabase
      ? loadTripPreview
      : async (tripId) => ({
          title: `Trip ${tripId}`,
          destinationCity: "Yogyakarta",
          startDate: "2026-10-01",
          endDate: "2026-10-03",
          summary: "Ringkasan publik",
        }),
  );
}

export function createItineraryExportService(chat: ChatService, useDatabase: boolean) {
  return new ItineraryExportService(chat, useDatabase ? loadExportItinerary : async () => null);
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
  if (!env.googleMapsServerKey) {
    throw new Error("GOOGLE_MAPS_SERVER_KEY is required for production search service");
  }
  return new SearchService(
    new GooglePlacesClient(env.googleMapsServerKey),
    new SequelizeSearchStore(),
    new QuotaService(new SequelizeQuotaStore(), env.placesMaxRequestsPerUserPerDay),
  );
}

export function createRuntimeSearchService(databaseReady: boolean) {
  if (databaseReady) return createProductionSearchService();
  return createMemorySearchService({
    placesProvider: env.googleMapsServerKey
      ? new GooglePlacesClient(env.googleMapsServerKey)
      : undefined,
    store: new MemorySearchStore({ seedPublicTrips: false }),
  });
}

export function createMemoryTripService(
  store = new MemoryTripStore(),
  realtime?: TripRealtime,
  social?: TripBlockLookup,
) {
  return new TripService(store, realtime, social);
}

export function createProductionTripService(realtime?: TripRealtime) {
  initModels();
  return new TripService(new SequelizeTripStore(), realtime);
}

export function createMemorySocialStore() {
  return new MemorySocialStore();
}

export function createProductionSocialStore() {
  initModels();
  return new SequelizeSocialStore();
}

export function createPostService(
  trips: TripService,
  search: SearchService,
  social: SocialQueryStore,
  chat: ChatService,
  useDatabase: boolean,
) {
  return new PostService(
    useDatabase ? new SequelizePostStore() : new MemoryPostStore(),
    trips,
    search,
    social,
    chat,
  );
}
