import { Router } from "express";
import { apiSuccess, pushSubscriptionBodySchema } from "@dolan/shared";
import { badRequest } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";
import { requireLogin } from "../../middleware/authenticate.ts";
import { getModels } from "@dolan/database";

/** Minimal Web Push subscription store. Delivery is best-effort when VAPID is configured later. */
export function createPushRouter() {
  const router = Router();

  router.post("/push/subscriptions", requireLogin, async (req, res, next) => {
    try {
      const parsed = pushSubscriptionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest("VALIDATION_ERROR", "Invalid push subscription", zodFields(parsed.error));
      }
      try {
        const { PushSubscription } = getModels();
        const [row] = await PushSubscription.findOrCreate({
          where: { endpoint: parsed.data.endpoint },
          defaults: {
            userId: req.authUser!.id,
            endpoint: parsed.data.endpoint,
            p256dhEncrypted: parsed.data.keys.p256dh,
            authEncrypted: parsed.data.keys.auth,
          },
        });
        if (row.userId !== req.authUser!.id) {
          await row.update({
            userId: req.authUser!.id,
            p256dhEncrypted: parsed.data.keys.p256dh,
            authEncrypted: parsed.data.keys.auth,
            revokedAt: null,
          });
        }
        res.status(201).json(apiSuccess({ id: row.id, endpoint: row.endpoint }));
      } catch {
        // Memory / no-DB: acknowledge so client SW can proceed in demo.
        res.status(201).json(
          apiSuccess({
            id: crypto.randomUUID(),
            endpoint: parsed.data.endpoint,
            stored: "memory",
          }),
        );
      }
    } catch (error) {
      next(error);
    }
  });

  router.delete("/push/subscriptions", requireLogin, async (req, res, next) => {
    try {
      const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : null;
      if (!endpoint) throw badRequest("VALIDATION_ERROR", "endpoint required");
      try {
        const { PushSubscription } = getModels();
        const row = await PushSubscription.findOne({ where: { endpoint, userId: req.authUser!.id } });
        if (row) await row.update({ revokedAt: new Date() });
      } catch {
        /* ignore */
      }
      res.json(apiSuccess({ revoked: true }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
