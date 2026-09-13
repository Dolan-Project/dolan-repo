import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { AuthService } from "../auth/auth-service.ts";
import type { SocialQueryStore } from "./social-queries.ts";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export function createSocialRouter(authService: AuthService, social: SocialQueryStore) {
  const router = Router();

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

  return router;
}
