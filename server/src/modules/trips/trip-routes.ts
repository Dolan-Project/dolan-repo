import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import {
  TripErrorCode,
  apiSuccess,
  createCommentBodySchema,
  createTripBodySchema,
  joinRequestBodySchema,
  joinReviewBodySchema,
  myTripsQuerySchema,
  paginationQuerySchema,
  publishTripBodySchema,
  updateCommentBodySchema,
  updateTripBodySchema,
  visibilityBodySchema,
} from "@dolan/shared";
import { badRequest } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { TripService } from "./trip-service.ts";
import { tripMutationError } from "./validation.ts";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export function createTripRouter(trips: TripService) {
  const router = Router();

  async function withTripContext(req: Request, _res: Response, next: NextFunction) {
    try {
      const userId = req.actor?.kind === "user" ? req.actor.user.id : null;
      const access = await trips.accessFor(param(req.params.id), userId);
      if (req.actor?.kind === "user" && access) {
        req.actor = { ...req.actor, trip: access };
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  async function withJoinContext(req: Request, _res: Response, next: NextFunction) {
    try {
      if (req.actor?.kind === "user") {
        const access = await trips.accessForJoinRequest(param(req.params.requestId), req.actor.user.id);
        if (access) req.actor = { ...req.actor, trip: access };
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  router.post("/trips", requireCapability("create_draft"), async (req, res, next) => {
    try {
      const parsed = createTripBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw tripMutationError(parsed.error);
      }
      const trip = await trips.createDraft(req.actor ?? { kind: "guest" }, parsed.data, req.header("idempotency-key"));
      res.status(201).json(apiSuccess(trip));
    } catch (error) {
      next(error);
    }
  });
  router.post("/trips/drafts", requireCapability("create_draft"), async (req, res, next) => {
    try {
      const parsed = createTripBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw tripMutationError(parsed.error);
      }
      const trip = await trips.createDraft(req.actor ?? { kind: "guest" }, parsed.data, req.header("idempotency-key"));
      res.status(201).json(apiSuccess(trip));
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/me", requireCapability("create_draft"), async (req, res, next) => {
    try {
      const parsed = myTripsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_FILTER, "Invalid My Trip filter", zodFields(parsed.error));
      }
      res.json(await trips.listMine(req.actor ?? { kind: "guest" }, parsed.data.role, parsed.data.page, parsed.data.limit));
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:id", requireCapability("read_public"), withTripContext, async (req, res, next) => {
    try {
      res.json(apiSuccess(await trips.getTrip(req.actor ?? { kind: "guest" }, param(req.params.id))));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/trips/:id", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      const parsed = updateTripBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw tripMutationError(parsed.error, "Invalid trip update");
      }
      res.json(apiSuccess(await trips.updateTrip(req.actor ?? { kind: "guest" }, param(req.params.id), parsed.data)));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/trips/:id", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.json(apiSuccess(await trips.deleteDraft(req.actor ?? { kind: "guest" }, param(req.params.id))));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:id/publish", requireCapability("publish_trip"), withTripContext, async (req, res, next) => {
    try {
      const parsed = publishTripBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw tripMutationError(parsed.error, "Invalid publish payload");
      }
      res.json(
        apiSuccess(
          await trips.publish(req.actor ?? { kind: "guest" }, param(req.params.id), parsed.data, req.header("idempotency-key")),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  for (const [path, handler] of [
    ["/trips/:id/close", (actor: Parameters<TripService["close"]>[0], id: string) => trips.close(actor, id)],
    ["/trips/:id/reopen", (actor: Parameters<TripService["reopen"]>[0], id: string) => trips.reopen(actor, id)],
    ["/trips/:id/start", (actor: Parameters<TripService["start"]>[0], id: string) => trips.start(actor, id)],
    ["/trips/:id/complete", (actor: Parameters<TripService["complete"]>[0], id: string) => trips.complete(actor, id)],
    ["/trips/:id/cancel", (actor: Parameters<TripService["cancel"]>[0], id: string) => trips.cancel(actor, id)],
  ] as const) {
    router.post(path, requireCapability("publish_trip"), withTripContext, async (req, res, next) => {
      try {
        res.json(apiSuccess(await handler(req.actor ?? { kind: "guest" }, param(req.params.id))));
      } catch (error) {
        next(error);
      }
    });
  }

  router.post("/trips/:id/visibility", requireCapability("publish_trip"), withTripContext, async (req, res, next) => {
    try {
      const parsed = visibilityBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw tripMutationError(parsed.error, "Invalid visibility payload");
      }
      res.json(apiSuccess(await trips.changeVisibility(req.actor ?? { kind: "guest" }, param(req.params.id), parsed.data)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:id/leave", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.json(apiSuccess(await trips.leaveTrip(req.actor ?? { kind: "guest" }, param(req.params.id))));
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:id/join-requests", withTripContext, requireCapability("approve_join"), async (req, res, next) => {
    try {
      const parsed = paginationQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_FILTER, "Invalid pagination", zodFields(parsed.error));
      }
      res.json(
        await trips.listJoinRequests(
          req.actor ?? { kind: "guest" },
          param(req.params.id),
          parsed.data.page,
          parsed.data.limit,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  async function createJoin(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = joinRequestBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Invalid join request", zodFields(parsed.error));
      }
      const join = await trips.requestJoin(
        req.actor ?? { kind: "guest" },
        param(req.params.id),
        parsed.data.message,
        req.header("idempotency-key"),
      );
      res.status(201).json(apiSuccess(join));
    } catch (error) {
      next(error);
    }
  }
  router.post("/trips/:id/join-requests", withTripContext, requireCapability("join_trip"), createJoin);
  router.post("/trips/:id/join", withTripContext, requireCapability("join_trip"), createJoin);

  router.post(
    "/join-requests/:requestId/review",
    withJoinContext,
    requireCapability("approve_join"),
    async (req, res, next) => {
      try {
        const parsed = joinReviewBodySchema.safeParse(req.body);
        if (!parsed.success) {
          throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Invalid review", zodFields(parsed.error));
        }
        res.json(
          apiSuccess(
            await trips.reviewJoin(
              req.actor ?? { kind: "guest" },
              param(req.params.requestId),
              parsed.data.decision,
              req.header("idempotency-key"),
            ),
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  router.post("/join-requests/:requestId/withdraw", requireCapability("join_trip"), async (req, res, next) => {
    try {
      res.json(apiSuccess(await trips.withdrawJoin(req.actor ?? { kind: "guest" }, param(req.params.requestId))));
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:id/comments", requireCapability("read_public"), withTripContext, async (req, res, next) => {
    try {
      const parsed = paginationQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_FILTER, "Invalid pagination", zodFields(parsed.error));
      }
      res.json(await trips.listComments(req.actor ?? { kind: "guest" }, param(req.params.id), parsed.data.page, parsed.data.limit));
    } catch (error) {
      next(error);
    }
  });
  router.post("/trips/:id/comments", requireCapability("comment"), withTripContext, async (req, res, next) => {
    try {
      const parsed = createCommentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Invalid comment", zodFields(parsed.error));
      }
      const comment = await trips.createComment(
        req.actor ?? { kind: "guest" },
        param(req.params.id),
        parsed.data,
        req.header("idempotency-key"),
      );
      res.status(201).json(apiSuccess(comment));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/trips/:id/comments/:commentId", requireCapability("comment"), withTripContext, async (req, res, next) => {
    try {
      const parsed = updateCommentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Invalid comment", zodFields(parsed.error));
      }
      res.json(
        apiSuccess(
          await trips.updateComment(
            req.actor ?? { kind: "guest" },
            param(req.params.id),
            param(req.params.commentId),
            parsed.data.body,
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/trips/:id/comments/:commentId", requireCapability("comment"), withTripContext, async (req, res, next) => {
    try {
      res.json(
        apiSuccess(
          await trips.deleteComment(req.actor ?? { kind: "guest" }, param(req.params.id), param(req.params.commentId)),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
