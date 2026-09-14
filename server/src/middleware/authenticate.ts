import type { NextFunction, Request, Response } from "express";
import type { AuthIdentity, SessionActor } from "@dolan/shared";
import { AuthErrorCode } from "@dolan/shared";
import { unauthorized } from "../lib/api-error.ts";
import type { AuthService } from "../modules/auth/auth-service.ts";

export function createAuthenticate(authService: AuthService) {
  return async function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
      const token =
        readBearerToken(req.header("authorization")) ?? readSessionCookie(req.header("cookie"));
      if (!token) {
        req.actor = { kind: "guest" };
        next();
        return;
      }

      try {
        const user = await authService.resolveSession(token);
        req.actor = { kind: "user", user };
        req.authUser = user;
      } catch {
        // Invalid/expired cookie must not block public routes like login/register.
        req.actor = { kind: "guest" };
        delete req.authUser;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireLogin(req: Request, _res: Response, next: NextFunction) {
  if (!req.authUser || req.actor?.kind !== "user") {
    next(unauthorized(AuthErrorCode.UNAUTHENTICATED, "Silakan masuk dulu untuk melanjutkan."));
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

function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)dolan_session=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

declare global {
  namespace Express {
    interface Request {
      actor?: SessionActor;
      authUser?: AuthIdentity;
    }
  }
}
