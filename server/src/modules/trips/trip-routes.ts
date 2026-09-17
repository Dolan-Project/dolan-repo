import type { NextFunction, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { Op } from "sequelize";
import {
  TripErrorCode,
  apiSuccess,
  createCommentBodySchema,
  createTripBodySchema,
  deleteTripBodySchema,
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
import { getModels, getSequelize } from "@dolan/database";
import { tripMutationError } from "./validation.ts";
import {
  deleteChecklist,
  getItinerarySnapshot,
  saveItineraryVersion,
  selectItineraryVersion,
  upsertChecklist,
} from "./itinerary-editor.ts";

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

  router.get("/trips/:id/itinerary", requireCapability("read_public"), withTripContext, async (req, res, next) => {
    try {
      await trips.getTrip(req.actor ?? { kind: "guest" }, param(req.params.id));
      const actorId = req.actor?.kind === "user" ? req.actor.user.id : null;
      res.json(apiSuccess(await getItinerarySnapshot(param(req.params.id), actorId)));
    } catch (error) {
      next(error);
    }
  });
  router.post("/trips/:id/itinerary-versions", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.status(201).json(apiSuccess(await saveItineraryVersion(param(req.params.id), req.authUser!.id, req.body)));
    } catch (error) {
      next(error);
    }
  });
  router.patch("/trips/:id/current-itinerary-version", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.json(apiSuccess(await selectItineraryVersion(param(req.params.id), req.authUser!.id, req.body)));
    } catch (error) {
      next(error);
    }
  });
  router.post("/trips/:id/checklist", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.status(201).json(apiSuccess(await upsertChecklist(param(req.params.id), req.authUser!.id, req.body)));
    } catch (error) {
      next(error);
    }
  });
  router.delete("/trips/:id/checklist/:itemId", requireCapability("create_draft"), withTripContext, async (req, res, next) => {
    try {
      res.json(apiSuccess(await deleteChecklist(param(req.params.id), req.authUser!.id, param(req.params.itemId))));
    } catch (error) {
      next(error);
    }
  });

  async function sendRouteMap(req: Request, res: Response, next: NextFunction) {
    try {
      await trips.getTrip(req.actor ?? { kind: "guest" }, param(req.params.id));
      const { Trip, ItineraryDay, ItineraryStop, Place } = getModels();
      const trip = await Trip.findByPk(param(req.params.id));
      if (!trip?.currentItineraryVersionId) return res.json(apiSuccess({ points: [], polylines: [] }));
      const days = await ItineraryDay.findAll({ where: { itineraryVersionId: trip.currentItineraryVersionId }, order: [["dayNumber", "ASC"]] });
      const points: Array<{ id: string; label: string; lat: number; lng: number }> = [];
      const polylines: string[] = [];
      for (const day of days) {
        const stops = await ItineraryStop.findAll({ where: { itineraryDayId: day.id }, order: [["sequence", "ASC"]] });
        for (const stop of stops) {
          const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
          if (place?.cachedLatitude != null && place.cachedLongitude != null) points.push({ id: stop.id, label: place.cachedName ?? stop.customTitle ?? "Destinasi", lat: place.cachedLatitude, lng: place.cachedLongitude });
          if (stop.routePolyline) polylines.push(stop.routePolyline);
        }
      }
      res.json(apiSuccess({ points, polylines }));
    } catch (error) { next(error); }
  }
  router.get("/trips/:id/route-map", requireCapability("read_public"), withTripContext, sendRouteMap);
  router.get("/trips/:id/route", requireCapability("read_public"), withTripContext, sendRouteMap);

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
      const parsed = deleteTripBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw tripMutationError(parsed.error, "Alasan penghapusan wajib diisi");
      }
      res.json(apiSuccess(await trips.deleteTrip(req.actor ?? { kind: "guest" }, param(req.params.id), parsed.data)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:id/invitations", requireCapability("approve_join"), withTripContext, async (req, res, next) => {
    try {
      const channel = req.body?.channel === "WHATSAPP" ? "WHATSAPP" : "DOLAN";
      const username = typeof req.body?.username === "string" ? req.body.username.trim().replace(/^@/, "") : "";
      const { TripInvitation, UserFollow, UserProfile } = getModels();
      let invitedUserId: string | null = null;
      if (channel === "DOLAN") {
        if (!username) throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Username teman wajib diisi");
        const profile = await UserProfile.findOne({ where: { username } });
        if (!profile) throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Traveler tidak ditemukan");
        invitedUserId = profile.userId;
        const actorId = req.authUser!.id;
        const links = await UserFollow.count({ where: { [Op.or]: [
          { followerUserId: actorId, followingUserId: invitedUserId },
          { followerUserId: invitedUserId, followingUserId: actorId },
        ] } });
        if (links < 2) throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Undangan DOLAN hanya untuk teman yang saling terhubung");
      }
      const token = randomBytes(24).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const invitation = await TripInvitation.create({
        tripId: param(req.params.id), invitedByUserId: req.authUser!.id, invitedUserId,
        tokenHash, channel, status: "PENDING", expiresAt: new Date(Date.now() + 7 * 86_400_000),
      });
      if (invitedUserId) {
        await trips.notifyUser(invitedUserId, req.authUser!.id, "trip.invited", "trip", param(req.params.id), {
          invitationId: invitation.id,
          invitePath: `/undangan/${token}`,
        });
      }
      res.status(201).json(apiSuccess({ id: invitation.id, channel, invitePath: `/undangan/${token}`, expiresAt: invitation.expiresAt?.toISOString() ?? null }));
    } catch (error) { next(error); }
  });

  router.get("/trip-invitations/:token/preview", requireCapability("read_public"), async (req, res, next) => {
    try {
      const tokenHash = createHash("sha256").update(param(req.params.token)).digest("hex");
      const { TripInvitation, Trip } = getModels();
      const invitation = await TripInvitation.findOne({ where: { tokenHash } });
      if (!invitation || invitation.status !== "PENDING" || (invitation.expiresAt && invitation.expiresAt <= new Date())) {
        return res.status(404).json({ success: false, error: { code: "INVITATION_NOT_FOUND", message: "Undangan tidak tersedia atau sudah kedaluwarsa" } });
      }
      const trip = await Trip.findByPk(invitation.tripId);
      if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip tidak ditemukan" } });
      res.json(apiSuccess({ tripId: trip.id, title: trip.title, destinationCity: trip.destinationCity, startDate: trip.startDate, endDate: trip.endDate, requiresLogin: req.actor?.kind !== "user" }));
    } catch (error) { next(error); }
  });

  router.post("/trip-invitations/:token/accept", requireCapability("create_draft"), async (req, res, next) => {
    try {
      const tokenHash = createHash("sha256").update(param(req.params.token)).digest("hex");
      const { TripInvitation, TripMember } = getModels();
      const userId = req.authUser!.id;
      const result = await getSequelize().transaction(async (transaction) => {
        const invitation = await TripInvitation.findOne({ where: { tokenHash }, transaction, lock: transaction.LOCK.UPDATE });
        if (!invitation || invitation.status !== "PENDING" || (invitation.expiresAt && invitation.expiresAt <= new Date())) throw badRequest(TripErrorCode.INVALID_TRANSITION, "Undangan tidak tersedia atau sudah kedaluwarsa");
        if (invitation.invitedUserId && invitation.invitedUserId !== userId) throw badRequest(TripErrorCode.INVALID_TRANSITION, "Undangan ini ditujukan untuk traveler lain");
        await TripMember.findOrCreate({ where: { tripId: invitation.tripId, userId }, defaults: { tripId: invitation.tripId, userId, role: "PARTICIPANT", membershipStatus: "ACTIVE", joinedAt: new Date(), leftAt: null }, transaction });
        await invitation.update({ status: "ACCEPTED", acceptedAt: new Date(), invitedUserId: userId }, { transaction });
        return { tripId: invitation.tripId, accepted: true as const };
      });
      res.json(apiSuccess(result));
    } catch (error) { next(error); }
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

  router.post("/trips/:id/publish-as-template", requireCapability("publish_trip"), withTripContext, async (req, res, next) => {
    try {
      res.status(201).json(
        apiSuccess(await trips.publishAsTemplate(req.actor ?? { kind: "guest" }, param(req.params.id))),
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

  router.get("/trips/:id/join-requests", requireCapability("approve_join"), withTripContext, async (req, res, next) => {
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
    requireCapability("approve_join"),
    withJoinContext,
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
