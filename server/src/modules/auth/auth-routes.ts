import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import { requireOwnProfileUpload } from "../../middleware/upload-auth.ts";
import type { AuthService } from "./auth-service.ts";

export function createAuthRouter(
  authService: AuthService,
  disconnectUser: (userId: string) => number,
) {
  const router = Router();

  router.get("/session", requireLogin, (req, res) => {
    res.json(apiSuccess(authService.toSessionResponse(req.authUser!)));
  });

  router.post("/disconnect-sockets", requireLogin, (req, res) => {
    const closed = disconnectUser(req.authUser!.id);
    res.json(apiSuccess({ closed }));
  });

  router.post(
    "/uploads/profile",
    requireLogin,
    requireCapability("upload_own_profile_asset"),
    requireOwnProfileUpload,
    (req, res) => {
      res.status(202).json(
        apiSuccess({
          authorized: true,
          ownerUserId: req.authUser!.id,
          kind: req.body?.kind === "cover" ? "cover" : "avatar",
        }),
      );
    },
  );

  return router;
}
