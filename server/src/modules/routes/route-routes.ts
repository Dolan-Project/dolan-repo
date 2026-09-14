import { Router } from "express";
import { z } from "zod";
import { apiSuccess } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { badRequest } from "../../lib/api-error.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import { GoogleRoutesClient } from "../jobs/routes-adapter.ts";
import { MemoryQuotaStore, QuotaService } from "../search/quota.ts";

const bodySchema = z.object({
  points: z
    .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
    .min(2)
    .max(10),
});

export function createRouteRouter(
  quota = new QuotaService(new MemoryQuotaStore(), env.placesMaxRequestsPerUserPerDay),
) {
  const router = Router();
  router.post("/routes/preview", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Titik rute tidak valid");
      if (!env.googleMapsServerKey) {
        return res.status(503).json({
          success: false,
          error: { code: "PROVIDER_UNAVAILABLE", message: "Google Routes API belum dikonfigurasi" },
        });
      }
      const userId = req.actor?.kind === "user" ? req.actor.user.id : null;
      await quota.consumeRoutes(userId);
      const client = new GoogleRoutesClient(env.googleMapsServerKey);
      const segments = [];
      for (let index = 1; index < parsed.data.points.length; index += 1) {
        const leg = await client.computeLeg(
          {
            latitude: parsed.data.points[index - 1]!.lat,
            longitude: parsed.data.points[index - 1]!.lng,
          },
          {
            latitude: parsed.data.points[index]!.lat,
            longitude: parsed.data.points[index]!.lng,
          },
        );
        segments.push(leg);
      }
      res.json(apiSuccess({ segments }));
    } catch (error) {
      next(error);
    }
  });
  return router;
}
