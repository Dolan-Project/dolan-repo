import cors from "cors";
import express from "express";
import { apiSuccess, profileUpdateSchema } from "@dolan/shared";
import { badRequest } from "./lib/api-error.ts";
import { zodFields } from "./lib/zod-fields.ts";
import { env } from "./config/env.ts";
import { createJobService, createMemorySearchService, createMemoryTripService } from "./container.ts";
import { createAuthenticate, requireLogin } from "./middleware/authenticate.ts";
import { requireCapability } from "./middleware/authorize.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";
import { createRateLimit, envRateLimit, type RateLimitConfig } from "./middleware/rate-limit.ts";
import { requestContext } from "./middleware/request-context.ts";
import { createAuthRouter } from "./modules/auth/auth-routes.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";
import { createChatRouter } from "./modules/chat/chat-routes.ts";
import { ChatService } from "./modules/chat/chat-service.ts";
import { MemoryChatStore } from "./modules/chat/memory-chat-store.ts";
import { tripChatBridge } from "./modules/chat/trip-bridge.ts";
import { ItineraryExportService } from "./modules/location/itinerary-export.ts";
import { createLocationRouter } from "./modules/location/location-routes.ts";
import { LocationService } from "./modules/location/location-service.ts";
import { MemoryLocationStore } from "./modules/location/memory-location-store.ts";
import { MemoryShareLinkStore, ShareLinkService } from "./modules/location/share-link-service.ts";
import { createJobRouter } from "./modules/jobs/job-routes.ts";
import type { GenerationJobService } from "./modules/jobs/job-service.ts";
import { createSearchRouter } from "./modules/search/search-routes.ts";
import type { SearchService } from "./modules/search/search-service.ts";
import { MemorySocialStore, type SocialQueryStore } from "./modules/social/social-queries.ts";
import { createTripRouter } from "./modules/trips/trip-routes.ts";
import type { TripService } from "./modules/trips/trip-service.ts";

export function createApp(
  authService: AuthService,
  disconnectUser: (userId: string) => number = () => 0,
  search: SearchService = createMemorySearchService(),
  jobService: GenerationJobService = createJobService(),
  trips?: TripService,
  chatService?: ChatService,
  rateLimit: RateLimitConfig | false = env.nodeEnv === "test" ? false : envRateLimit(),
  social: SocialQueryStore = new MemorySocialStore(),
  locationService?: LocationService,
  shareLinkService?: ShareLinkService,
  itineraryExport?: ItineraryExportService,
) {
  const memoryChat = new MemoryChatStore();
  const chat = chatService ?? new ChatService(memoryChat);
  const tripService = trips ?? createMemoryTripService(undefined, tripChatBridge(memoryChat, chat));
  const location = locationService ?? new LocationService(new MemoryLocationStore(), chat);
  const shareLinks = shareLinkService ?? new ShareLinkService(new MemoryShareLinkStore(), chat, async (tripId) => ({
    title: `Trip ${tripId}`,
    destinationCity: "Yogyakarta",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    summary: "Ringkasan publik",
  }));
  const exports = itineraryExport ?? new ItineraryExportService(chat, async () => null);
  const app = express();
  app.disable("x-powered-by");
  if (env.nodeEnv === "production") {
    app.set("trust proxy", 1);
  }
  app.use(requestContext);
  app.use(express.json({ limit: "32kb" }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  if (rateLimit) {
    app.use(createRateLimit(rateLimit));
  }
  app.use(createAuthenticate(authService));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/ready", (_req, res) => {
    res.json({ status: "ready" });
  });

  app.use("/api/v1/auth", createAuthRouter(authService, disconnectUser));
  app.get("/api/v1/users/me", requireLogin, (req, res) => {
    res.json(apiSuccess(authService.toMeSession(req.authUser!)));
  });
  app.patch("/api/v1/users/me", requireLogin, async (req, res, next) => {
    try {
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
      }
      res.json(apiSuccess(await authService.updateProfile(req.authUser!.id, parsed.data)));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/v1/users/:username", requireCapability("read_public"), async (req, res, next) => {
    try {
      const username = Array.isArray(req.params.username)
        ? String(req.params.username[0])
        : String(req.params.username);
      res.json(apiSuccess(await authService.publicProfileByUsername(username)));
    } catch (error) {
      next(error);
    }
  });
  app.use("/api/v1", createSearchRouter(search));
  app.use("/api/v1", createJobRouter(jobService));
  app.use("/api/v1", createTripRouter(tripService));
  app.use("/api/v1", createChatRouter(chat));
  app.use("/api/v1", createLocationRouter(location, shareLinks, exports));

  app.get("/api/v1/public/ping", requireCapability("read_public"), (_req, res) => {
    res.json(apiSuccess({ ok: true }));
  });

  app.post("/api/v1/users/:userId/follow", requireCapability("follow"), async (req, res, next) => {
    try {
      const targetId = Array.isArray(req.params.userId) ? String(req.params.userId[0]) : String(req.params.userId);
      await social.follow(req.authUser!.id, targetId);
      res.status(201).json(apiSuccess({ followed: true }));
    } catch (error) {
      next(error);
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
