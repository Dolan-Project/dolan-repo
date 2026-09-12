import type { NextFunction, Request, Response } from "express";
import type { AuthIdentity, SessionActor } from "@dolan/shared";
import { AuthErrorCode } from "@dolan/shared";
import { unauthorized } from "../lib/api-error.ts";
import type { AuthService } from "../modules/auth/auth-service.ts";

export function createAuthenticate(authService: AuthService) {
  return async function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = readBearerToken(req.header("authorization"));
      if (!token) {
        req.actor = { kind: "guest" };
        next();
        return;
      }

      const user = await authService.resolveSession(token);
      req.actor = { kind: "user", user };
      req.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireLogin(req: Request, _res: Response, next: NextFunction) {
  if (!req.authUser || req.actor?.kind !== "user") {
    next(unauthorized(AuthErrorCode.UNAUTHENTICATED, "Authentication required"));
    return;
  }
  next();
}

export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

declare global {
  namespace Express {
    interface Request {
      actor?: SessionActor;
      authUser?: AuthIdentity;
    }
  }
}
