import type { NextFunction, Request, Response } from "express";
import { AuthErrorCode } from "@dolan/shared";
import { forbidden, unauthorized } from "../lib/api-error.ts";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export type UploadIntent = {
  ownerUserId: string;
  mimeType: string;
  byteSize: number;
  kind: "avatar" | "cover";
};

export function authorizeProfileUpload(actorUserId: string | undefined, intent: UploadIntent) {
  if (!actorUserId) {
    throw unauthorized(AuthErrorCode.UNAUTHENTICATED, "Authentication required");
  }
  if (actorUserId !== intent.ownerUserId) {
    throw forbidden(AuthErrorCode.FORBIDDEN, "You can only upload your own profile assets");
  }
  if (!ALLOWED_MIME.has(intent.mimeType)) {
    throw forbidden(AuthErrorCode.FORBIDDEN, "Unsupported upload type");
  }
  if (intent.byteSize > MAX_BYTES) {
    throw forbidden(AuthErrorCode.FORBIDDEN, "Upload exceeds size limit");
  }
}

export function requireOwnProfileUpload(req: Request, _res: Response, next: NextFunction) {
  try {
    const ownerUserId = String(req.body?.ownerUserId ?? req.authUser?.id ?? "");
    authorizeProfileUpload(req.authUser?.id, {
      ownerUserId,
      mimeType: String(req.body?.mimeType ?? ""),
      byteSize: Number(req.body?.byteSize ?? 0),
      kind: req.body?.kind === "cover" ? "cover" : "avatar",
    });
    next();
  } catch (error) {
    next(error);
  }
}
