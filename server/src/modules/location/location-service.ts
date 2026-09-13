import { AuthErrorCode, pingLocationSchema, startLocationShareSchema } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { ChatService } from "../chat/chat-service.ts";
import { isShareActive, presentLocation, shareExpiresAt } from "./location-privacy.ts";
import type { LocationStore } from "./location-store.ts";

export class LocationService {
  constructor(
    private readonly store: LocationStore,
    private readonly chat: ChatService,
  ) {}

  async start(tripId: string, userId: string, body: unknown, tripEnd?: Date | null) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const parsed = startLocationShareSchema.parse(body);
    const existing = await this.store.findActive(tripId, userId);
    if (existing) {
      const updated = await this.store.update(existing.id, {
        expiresAt: shareExpiresAt(parsed.duration, tripEnd),
        scope: parsed.scope,
        revokedAt: null,
      });
      return toPublicShare(updated);
    }
    const created = await this.store.create({
      id: crypto.randomUUID(),
      userId,
      tripId,
      scope: parsed.scope,
      expiresAt: shareExpiresAt(parsed.duration, tripEnd),
      revokedAt: null,
    });
    return toPublicShare(created);
  }

  async ping(tripId: string, userId: string, body: unknown) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const share = await this.store.findActive(tripId, userId);
    if (!share) {
      throw new HttpError(404, "NOT_FOUND", "Location sharing is not active");
    }
    const parsed = pingLocationSchema.parse(body);
    const recordedAt = new Date();
    await this.store.setLatest(share.id, {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      recordedAt,
    });
    const point = presentLocation({
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      recordedAt,
      scope: share.scope,
      viewer: "TRIP_MEMBER",
    });
    await this.chat.emitTripEvent(tripId, "location.updated", {
      tripId,
      userId,
      shareId: share.id,
      ...point,
    });
    return toPublicShare(share);
  }

  async stop(tripId: string, userId: string) {
    const share = await this.store.findActive(tripId, userId);
    if (share) {
      await this.store.update(share.id, { revokedAt: new Date() });
      await this.store.setLatest(share.id, null);
      await this.chat.emitTripEvent(tripId, "location.stopped", { tripId, userId, shareId: share.id });
    }
    return { stopped: true };
  }

  async listForViewer(tripId: string, userId: string, now = new Date()) {
    const access = await this.chat.accessFor(tripId, userId);
    if (access?.joinRequestStatus === "PENDING") {
      throw new HttpError(403, AuthErrorCode.PENDING_MEMBER, "Pending members cannot see live location");
    }
    this.chat.assertCanRead(access);
    const shares = await this.store.listForTrip(tripId);
    return shares
      .filter((share) => isShareActive(share, now) && share.latest)
      .map((share) => {
        const presented = presentLocation({
          latitude: share.latest!.latitude,
          longitude: share.latest!.longitude,
          recordedAt: share.latest!.recordedAt,
          scope: share.scope,
          viewer: "TRIP_MEMBER",
          now,
        });
        if (!presented) return null;
        return { userId: share.userId, shareId: share.id, scope: share.scope, ...presented };
      })
      .filter(Boolean);
  }
}

function toPublicShare(share: { id: string; tripId: string; userId: string; scope: string; expiresAt: Date; revokedAt: Date | null }) {
  return {
    id: share.id,
    tripId: share.tripId,
    userId: share.userId,
    scope: share.scope,
    expiresAt: share.expiresAt.toISOString(),
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
  };
}
