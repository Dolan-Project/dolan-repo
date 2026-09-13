import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { requireLogin } from "../../middleware/authenticate.ts";
import type { LocationService } from "./location-service.ts";

export function createLocationRouter(locations: LocationService) {
  const router = Router();

  router.post("/trips/:tripId/location/start", requireLogin, async (req, res, next) => {
    try {
      const share = await locations.start(String(req.params.tripId), req.authUser!.id, req.body);
      res.status(201).json(apiSuccess(share));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/location/ping", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await locations.ping(String(req.params.tripId), req.authUser!.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/location/stop", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await locations.stop(String(req.params.tripId), req.authUser!.id)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:tripId/locations", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess({ locations: await locations.listForViewer(String(req.params.tripId), req.authUser!.id) }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
