import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthErrorCode } from "@dolan/shared";
import { HttpError, toApiError } from "../lib/api-error.ts";
import { logger } from "../lib/logger.ts";

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId ?? "unknown";

  if (error instanceof HttpError) {
    res.status(error.status).json(toApiError(error, requestId));
    return;
  }

  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "body", issue.message]));
    res.status(422).json(toApiError(new HttpError(422, "VALIDATION_ERROR", "Request validation failed", fields), requestId));
    return;
  }

  logger.error("Unhandled error", {
    requestId,
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error",
  });

  res.status(500).json(
    toApiError(new HttpError(500, "INTERNAL_ERROR", "Unexpected server error"), requestId),
  );
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: req.requestId ?? "unknown",
    },
  });
}

export { AuthErrorCode };
