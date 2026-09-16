import type { NextFunction, Request, Response } from "express";
import type { AuthCapability, TripAccessContext } from "@dolan/shared";
import { HttpError } from "../lib/api-error.ts";
import { authorize } from "../modules/auth/authorization.ts";

export function requireCapability(capability: AuthCapability) {
  return function capabilityGuard(req: Request, _res: Response, next: NextFunction) {
    const actor = req.actor ?? { kind: "guest" as const };
    const decision = authorize(actor, capability);
    if (!decision.allowed) {
      next(new HttpError(decision.status, decision.code, decision.message));
      return;
    }
    next();
  };
}

export function withTripContext(trip: TripAccessContext) {
  return function attachTrip(req: Request, _res: Response, next: NextFunction) {
    if (req.actor?.kind === "user") {
      req.actor = { ...req.actor, trip };
    }
    next();
  };
}
