import cors from "cors";
import express from "express";
import { apiSuccess } from "@dolan/shared";
import { env } from "./config/env.ts";
import { createAuthenticate, requireLogin } from "./middleware/authenticate.ts";
import { requireCapability, withTripContext } from "./middleware/authorize.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";
import { requestContext } from "./middleware/request-context.ts";
import { createAuthRouter } from "./modules/auth/auth-routes.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";

export function createApp(
  authService: AuthService,
  disconnectUser: (userId: string) => number = () => 0,
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

  app.get(
    "/api/v1/trips/:tripId/messages",
    requireLogin,
    (req, _res, next) => {
      const status = String(req.query.membership ?? "");
      const role = String(req.query.role ?? "");
      withTripContext({
        tripId: String(req.params.tripId),
        memberRole: role === "HOST" || role === "PARTICIPANT" ? role : null,
        membershipStatus: status === "ACTIVE" ? "ACTIVE" : null,
        joinRequestStatus: status === "PENDING" ? "PENDING" : null,
      })(req, _res, next);
    },
    requireCapability("read_chat"),
    (_req, res) => {
      res.json(apiSuccess({ messages: [] }));
    },
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
