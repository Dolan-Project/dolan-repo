import express, { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { badRequest } from "../../lib/api-error.ts";
import { parseMultipartForm } from "../../lib/multipart.ts";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { PostService } from "./post-service.ts";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0]) : String(value ?? "");
}

export function createPostRouter(posts: PostService) {
  const router = Router();

  router.get("/posts", requireLogin, async (req, res, next) => {
    try {
      res.json(await posts.list(req.actor ?? { kind: "guest" }, req.query));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/posts",
    requireLogin,
    requireCapability("comment"),
    express.raw({
      type: (req) => Boolean(req.headers["content-type"]?.includes("multipart/form-data")),
      limit: "6mb",
    }),
    async (req, res, next) => {
      try {
        const contentType = req.header("content-type") ?? "";
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        const parsed = parseMultipartForm(buffer, contentType);
        const file = parsed.files.find((item) => item.field === "file") ?? parsed.files[0];
        if (!file) throw badRequest("UPLOAD_INVALID_TYPE", "Foto wajib ada");
        const created = await posts.create(
          req.actor ?? { kind: "guest" },
          {
            caption: parsed.fields.caption ?? "",
            tripId: parsed.fields.tripId?.trim() || undefined,
            templateId: parsed.fields.templateId?.trim() || undefined,
          },
          { bytes: file.bytes, mimeType: file.mimeType, fileName: file.filename },
        );
        res.status(201).json(apiSuccess(created));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/posts/:postId", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await posts.remove(req.actor ?? { kind: "guest" }, param(req.params.postId))));
    } catch (error) {
      next(error);
    }
  });

  router.post("/posts/:postId/likes", requireLogin, requireCapability("comment"), async (req, res, next) => {
    try {
      res.json(apiSuccess(await posts.like(req.actor ?? { kind: "guest" }, param(req.params.postId))));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/posts/:postId/likes", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await posts.unlike(req.actor ?? { kind: "guest" }, param(req.params.postId))));
    } catch (error) {
      next(error);
    }
  });

  router.get("/posts/:postId/comments", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await posts.listComments(param(req.params.postId))));
    } catch (error) {
      next(error);
    }
  });

  router.post("/posts/:postId/comments", requireLogin, requireCapability("comment"), async (req, res, next) => {
    try {
      res.status(201).json(
        apiSuccess(await posts.comment(req.actor ?? { kind: "guest" }, param(req.params.postId), req.body)),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete(
    "/posts/:postId/comments/:commentId",
    requireLogin,
    async (req, res, next) => {
      try {
        res.json(
          apiSuccess(
            await posts.removeComment(
              req.actor ?? { kind: "guest" },
              param(req.params.postId),
              param(req.params.commentId),
            ),
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
