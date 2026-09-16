import { getModels } from "@dolan/database";
import { isShareActive } from "./location-privacy.ts";
import type { LocationShareRecord, LocationStore } from "./location-store.ts";

export class SequelizeLocationStore implements LocationStore {
  async findActive(tripId: string, userId: string, now = new Date()) {
    const { LocationShare, LocationLatest } = getModels();
    const rows = await LocationShare.findAll({ where: { tripId, userId } });
    const active = rows.find((row) => isShareActive({ expiresAt: row.expiresAt, revokedAt: row.revokedAt ?? null }, now));
    if (!active) return null;
    const latest = await LocationLatest.findOne({ where: { locationShareId: active.id } });
    return toRecord(active, latest);
  }

  async create(share: Omit<LocationShareRecord, "latest">) {
    const { LocationShare } = getModels();
    const row = await LocationShare.create({
      id: share.id,
      userId: share.userId,
      tripId: share.tripId,
      scope: share.scope,
      expiresAt: share.expiresAt,
      revokedAt: share.revokedAt,
    });
    return toRecord(row, null);
  }

  async update(id: string, patch: Partial<Pick<LocationShareRecord, "expiresAt" | "scope" | "revokedAt">>) {
    const { LocationShare, LocationLatest } = getModels();
    const row = await LocationShare.findByPk(id);
    if (!row) throw new Error("SHARE_NOT_FOUND");
    if (patch.expiresAt) row.expiresAt = patch.expiresAt;
    if (patch.scope) row.scope = patch.scope;
    if (patch.revokedAt !== undefined) row.revokedAt = patch.revokedAt;
    await row.save();
    const latest = await LocationLatest.findOne({ where: { locationShareId: id } });
    return toRecord(row, latest);
  }

  async setLatest(id: string, latest: LocationShareRecord["latest"]) {
    const { LocationLatest } = getModels();
    if (!latest) {
      await LocationLatest.destroy({ where: { locationShareId: id } });
      return;
    }
    const [row] = await LocationLatest.findOrCreate({
      where: { locationShareId: id },
      defaults: {
        locationShareId: id,
        latitude: latest.latitude,
        longitude: latest.longitude,
        recordedAt: latest.recordedAt,
      },
    });
    row.latitude = latest.latitude;
    row.longitude = latest.longitude;
    row.recordedAt = latest.recordedAt;
    await row.save();
  }

  async listForTrip(tripId: string) {
    const { LocationShare, LocationLatest } = getModels();
    const rows = await LocationShare.findAll({ where: { tripId } });
    const result: LocationShareRecord[] = [];
    for (const row of rows) {
      const latest = await LocationLatest.findOne({ where: { locationShareId: row.id } });
      result.push(toRecord(row, latest));
    }
    return result;
  }
}

function toRecord(
  row: {
    id: string;
    userId: string;
    tripId: string | null;
    scope: string;
    expiresAt: Date;
    revokedAt: Date | null;
  },
  latest: { latitude: number; longitude: number; recordedAt: Date } | null,
): LocationShareRecord {
  return {
    id: row.id,
    userId: row.userId,
    tripId: row.tripId ?? "",
    scope: row.scope as LocationShareRecord["scope"],
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    latest: latest
      ? { latitude: latest.latitude, longitude: latest.longitude, recordedAt: latest.recordedAt }
      : null,
  };
}
