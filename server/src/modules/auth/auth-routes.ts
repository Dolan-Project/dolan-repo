import express, { Router } from "express";
import { apiSuccess, validateUploadMeta } from "@dolan/shared";
import { getModels } from "@dolan/database";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import { requireOwnProfileUpload } from "../../middleware/upload-auth.ts";
import type { AuthService } from "./auth-service.ts";
import { badRequest } from "../../lib/api-error.ts";
import { deleteImageKitFile, uploadProfileImage } from "../../integrations/imagekit/imagekit-client.ts";

export function createAuthRouter(
  authService: AuthService,
  disconnectUser: (userId: string) => number,
) {
  const router = Router();

  router.get("/session", requireLogin, (req, res) => {
    res.json(apiSuccess(authService.toSessionResponse(req.authUser!)));
  });

  router.get("/me", requireLogin, (req, res) => {
    res.json(apiSuccess(authService.toMeSession(req.authUser!)));
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

  router.post("/uploads/profile/:kind", requireLogin, requireCapability("upload_own_profile_asset"), express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "2mb" }), async (req, res, next) => {
    try {
      const kind = String(req.params.kind) === "cover" ? "cover" : "avatar";
      const bytes = req.body instanceof Buffer ? req.body : Buffer.alloc(0);
      const mimeType = req.header("content-type")?.split(";")[0] ?? "";
      const validation = validateUploadMeta({ type: mimeType, size: bytes.byteLength });
      if (!validation.ok || bytes.byteLength === 0) throw badRequest(validation.ok ? "UPLOAD_INVALID_TYPE" : validation.code, validation.ok ? "File unggahan wajib ada" : validation.message);
      const uploaded = await uploadProfileImage({ bytes, mimeType, userId: req.authUser!.id, kind, fileName: `${kind}-${Date.now()}.${mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"}` });
      let oldFileId: string | null = null;
      try {
        const { UserProfile } = getModels();
        const profile = await UserProfile.findOne({ where: { userId: req.authUser!.id } });
        if (profile) {
          oldFileId = kind === "avatar" ? profile.avatarFileId : profile.coverFileId;
          if (kind === "avatar") { profile.avatarUrl = uploaded.url; profile.avatarFileId = uploaded.fileId; }
          else { profile.coverUrl = uploaded.url; profile.coverFileId = uploaded.fileId; }
          await profile.save();
        }
      } catch { /* Memory development mode returns upload result without DB persistence. */ }
      if (oldFileId && oldFileId !== uploaded.fileId) void deleteImageKitFile(oldFileId);
      res.json(apiSuccess(uploaded));
    } catch (error) { next(error); }
  });

  return router;
}
