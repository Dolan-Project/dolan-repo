import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { GenerationJobService } from "./job-service.ts";

export function createJobRouter(jobs: GenerationJobService) {
  const router = Router();

  router.post("/trips/:tripId/generate", requireLogin, requireCapability("create_draft"), async (req, res, next) => {
    try {
      const result = await jobs.enqueue({
        trip: {
          id: String(req.params.tripId),
          hostUserId: req.authUser!.id,
          selectedVersionId: null,
          exists: true,
        },
        actorId: req.authUser!.id,
        body: req.body,
        idempotencyKey: req.header("idempotency-key") ?? undefined,
      });
      res.status(result.created ? 202 : 200).json(apiSuccess(result.job));
    } catch (error) {
      next(error);
    }
  });

  router.get("/generation-jobs/:jobId", requireLogin, async (req, res, next) => {
    try {
      const job = await jobs.getById(String(req.params.jobId), req.authUser!.id);
      res.json(apiSuccess(job));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
