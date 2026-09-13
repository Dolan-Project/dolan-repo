import type { NextFunction, Request, Response } from "express";
import { AuthErrorCode } from "@dolan/shared";
import { env } from "../config/env.ts";
import { tooManyRequests } from "../lib/api-error.ts";

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  searchMax: number;
};

export function envRateLimit(): RateLimitConfig {
  return {
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    searchMax: env.rateLimitSearchMax,
  };
}

export function createRateLimit(config: RateLimitConfig) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    if (req.path === "/health" || req.path === "/ready") {
      next();
      return;
    }

    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "local";
    const search = req.path.startsWith("/api/v1/search") || req.path.startsWith("/api/v1/places");
    const max = search ? config.searchMax : config.max;
    const key = `${search ? "search" : "api"}:${ip}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      next(tooManyRequests(AuthErrorCode.RATE_LIMITED, "Too many requests"));
      return;
    }
    next();
  };
}
