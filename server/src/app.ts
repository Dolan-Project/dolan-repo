import cors from "cors";
import express from "express";
import { apiSuccess } from "@dolan/shared";
import { env } from "./config/env.ts";
import { createJobService, createMemorySearchService } from "./container.ts";
import { createAuthenticate, requireLogin } from "./middleware/authenticate.ts";
import { requireCapability } from "./middleware/authorize.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";
import { requestContext } from "./middleware/request-context.ts";
import { createAuthRouter } from "./modules/auth/auth-routes.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";
import { createChatRouter } from "./modules/chat/chat-routes.ts";
import { ChatService } from "./modules/chat/chat-service.ts";
import { MemoryChatStore } from "./modules/chat/memory-chat-store.ts";
import { createJobRouter } from "./modules/jobs/job-routes.ts";
import type { GenerationJobService } from "./modules/jobs/job-service.ts";
import { createSearchRouter } from "./modules/search/search-routes.ts";
import type { SearchService } from "./modules/search/search-service.ts";

export function createApp(
  authService: AuthService,
  disconnectUser: (userId: string) => number = () => 0,
  search: SearchService = createMemorySearchService(),
  jobService: GenerationJobService = createJobService(),
  chatService: ChatService = new ChatService(new MemoryChatStore()),
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(express.json({ limit: "32kb" }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
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
  app.use("/api/v1", createSearchRouter(search));
  app.use("/api/v1", createJobRouter(jobService));
  app.use("/api/v1", createChatRouter(chatService));

  app.get("/api/v1/public/ping", requireCapability("read_public"), (_req, res) => {
    res.json(apiSuccess({ ok: true }));
  });

  app.post("/api/v1/trips/drafts", requireCapability("create_draft"), (_req, res) => {
    res.status(201).json(apiSuccess({ created: true }));
  });

  app.post("/api/v1/trips/:tripId/publish", requireCapability("publish_trip"), (_req, res) => {
    res.json(apiSuccess({ published: true }));
  });

  app.post("/api/v1/trips/:tripId/join", requireCapability("join_trip"), (_req, res) => {
    res.status(201).json(apiSuccess({ requested: true }));
  });

  app.post("/api/v1/trips/:tripId/comments", requireCapability("comment"), (_req, res) => {
    res.status(201).json(apiSuccess({ commented: true }));
  });

  app.post("/api/v1/users/:userId/follow", requireCapability("follow"), (_req, res) => {
    res.status(201).json(apiSuccess({ followed: true }));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
