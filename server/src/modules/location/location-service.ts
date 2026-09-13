import { AuthErrorCode, pingLocationSchema, startLocationShareSchema } from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { ChatService } from "../chat/chat-service.ts";
import {
  isShareActive,
  presentLocation,
  shareExpiresAt,
} from "./location-privacy.ts";

export type LocationShareRecord = {
  id: string;
  userId: string;
  tripId: string;
  scope: "TRIP_PRECISE" | "PUBLIC_APPROXIMATE";
  expiresAt: Date;
  revokedAt: Date | null;
  latest: { latitude: number; longitude: number; recordedAt: Date } | null;
};

export class MemoryLocationStore {
  readonly shares: LocationShareRecord[] = [];

  findActive(tripId: string, userId: string, now = new Date()) {
    return (
      this.shares.find(
        (share) => share.tripId === tripId && share.userId === userId && isShareActive(share, now),
      ) ?? null
    );
  }

  listForTrip(tripId: string) {
    return this.shares.filter((share) => share.tripId === tripId);
  }
}

export class LocationService {
  constructor(
    private readonly store: MemoryLocationStore,
    private readonly chat: ChatService,
  ) {}

  async start(tripId: string, userId: string, body: unknown, tripEnd?: Date | null) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const parsed = startLocationShareSchema.parse(body);
    const existing = this.store.findActive(tripId, userId);
    if (existing) {
      existing.expiresAt = shareExpiresAt(parsed.duration, tripEnd);
      existing.scope = parsed.scope;
      existing.revokedAt = null;
      return toPublicShare(existing);
    }
    const share: LocationShareRecord = {
      id: crypto.randomUUID(),
      userId,
      tripId,
      scope: parsed.scope,
      expiresAt: shareExpiresAt(parsed.duration, tripEnd),
      revokedAt: null,
      latest: null,
    };
    this.store.shares.push(share);
    return toPublicShare(share);
  }

  async ping(tripId: string, userId: string, body: unknown) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const share = this.store.findActive(tripId, userId);
    if (!share) {
      throw new HttpError(404, "NOT_FOUND", "Location sharing is not active");
    }
    const parsed = pingLocationSchema.parse(body);
    share.latest = { latitude: parsed.latitude, longitude: parsed.longitude, recordedAt: new Date() };
    const point = presentLocation({
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      recordedAt: share.latest.recordedAt,
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
    const share = this.store.findActive(tripId, userId);
    if (share) {
      share.revokedAt = new Date();
      share.latest = null;
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
    return this.store
      .listForTrip(tripId)
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

function toPublicShare(share: LocationShareRecord) {
  return {
    id: share.id,
    tripId: share.tripId,
    userId: share.userId,
    scope: share.scope,
    expiresAt: share.expiresAt.toISOString(),
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
  };
}
