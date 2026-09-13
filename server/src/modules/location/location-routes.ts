import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { requireLogin } from "../../middleware/authenticate.ts";
import type { ItineraryExportService } from "./itinerary-export.ts";
import type { LocationService } from "./location-service.ts";
import type { ShareLinkService } from "./share-link-service.ts";

export function createLocationRouter(
  locations: LocationService,
  shareLinks: ShareLinkService,
  exports: ItineraryExportService,
) {
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

  router.get("/trips/:tripId/itinerary.pdf", requireLogin, async (req, res, next) => {
    try {
      const pdf = await exports.pdf(String(req.params.tripId), req.authUser!.id, queryString(req.query.versionId));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="itinerary.pdf"');
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:tripId/navigation", requireLogin, async (req, res, next) => {
    try {
      const day = req.query.day ? Number(req.query.day) : undefined;
      res.json(
        apiSuccess(
          await exports.navigation(String(req.params.tripId), req.authUser!.id, day, queryString(req.query.versionId)),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/share-links", requireLogin, async (req, res, next) => {
    try {
      const created = await shareLinks.create(String(req.params.tripId), req.authUser!.id, req.body ?? {});
      res.status(201).json(apiSuccess(created));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/share-links/:linkId/revoke", requireLogin, async (req, res, next) => {
    try {
      res.json(
        apiSuccess(await shareLinks.revoke(String(req.params.tripId), String(req.params.linkId), req.authUser!.id)),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/share/:token", async (req, res, next) => {
    try {
      res.json(apiSuccess(await shareLinks.preview(String(req.params.token))));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function queryString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
