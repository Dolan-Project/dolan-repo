import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { AuthService } from "../auth/auth-service.ts";
import type { TripService } from "../trips/trip-service.ts";
import { SocialService } from "./social-service.ts";
import type { SocialQueryStore } from "./social-queries.ts";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export function createSocialRouter(authService: AuthService, social: SocialQueryStore, trips: TripService) {
  const router = Router();
  const service = new SocialService(authService, social, trips);

  async function itemsFor(ids: string[]) {
    const items = [];
    for (const id of ids) {
      const item = await authService.publicListItem(id);
      if (item) items.push(item);
    }
    return items;
  }

  router.get(
    "/users/:username/followers",
    requireCapability("read_public"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        res.json(apiSuccess({ items: await itemsFor(await social.listFollowerIds(target.id)) }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/users/:username/following",
    requireCapability("read_public"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        res.json(apiSuccess({ items: await itemsFor(await social.listFollowingIds(target.id)) }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/users/:username/follow",
    requireCapability("follow"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        await social.follow(req.authUser!.id, target.id);
        await trips.notifyUser(target.id, req.authUser!.id, "follower.created", "user", req.authUser!.id);
        res.status(201).json(apiSuccess({ following: true, followed: true }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/users/:username/follow",
    requireCapability("follow"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        await social.unfollow(req.authUser!.id, target.id);
        res.json(apiSuccess({ following: false }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/users/:username/block",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        await social.block(req.authUser!.id, target.id);
        res.json(apiSuccess({ blocked: true }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/users/:username/block",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const target = await authService.resolveUser(param(req.params.username));
        const existed = await social.unblock(req.authUser!.id, target.id);
        if (!existed) throw notFound("NOT_FOUND", "Blokir tidak ditemukan");
        res.json(apiSuccess({ blocked: false }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/trips/:tripId/attendance",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(apiSuccess(await service.getAttendance(req.actor!, param(req.params.tripId))));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/trips/:tripId/attendance",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(apiSuccess(await service.confirmAttendance(req.actor!, param(req.params.tripId), req.body)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/users/:username/reviews",
    requireCapability("read_public"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(apiSuccess(await service.listReviews(param(req.params.username))));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/users/:username/reviews",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(201).json(apiSuccess(await service.createReview(req.actor!, param(req.params.username), req.body)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/users/:username/history",
    requireCapability("read_public"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(apiSuccess(await service.history(param(req.params.username), req.actor ?? { kind: "guest" })));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/reports",
    requireLogin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(201).json(apiSuccess(await service.createReport(req.actor!, req.body)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/admin/reports",
    requireCapability("admin_moderate"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(apiSuccess(await service.listReports(req.actor!)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/reports/:reportId/moderate",
    requireCapability("admin_moderate"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(
          apiSuccess(await service.moderateReport(req.actor!, param(req.params.reportId), req.body)),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
