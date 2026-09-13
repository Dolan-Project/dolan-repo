import { getModels } from "@dolan/database";
import type { ShareLinkRecord, ShareLinkStore } from "./share-link-service.ts";

export class SequelizeShareLinkStore implements ShareLinkStore {
  async create(link: ShareLinkRecord) {
    const { TripShareLink } = getModels();
    await TripShareLink.create({
      id: link.id,
      tripId: link.tripId,
      createdByUserId: link.createdByUserId,
      tokenHash: link.tokenHash,
      expiresAt: link.expiresAt,
      revokedAt: link.revokedAt,
      permittedFields: link.permittedFields as never,
    });
    return link;
  }

  async findByHash(tokenHash: string) {
    const { TripShareLink } = getModels();
    const row = await TripShareLink.findOne({ where: { tokenHash } });
    return row ? toRecord(row) : null;
  }

  async findById(id: string) {
    const { TripShareLink } = getModels();
    const row = await TripShareLink.findByPk(id);
    return row ? toRecord(row) : null;
  }

  async revoke(id: string) {
    const { TripShareLink } = getModels();
    const row = await TripShareLink.findByPk(id);
    if (!row) return null;
    row.revokedAt = new Date();
    await row.save();
    return toRecord(row);
  }
}

function toRecord(row: {
  id: string;
  tripId: string;
  createdByUserId: string;
  tokenHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  permittedFields: unknown;
}): ShareLinkRecord {
  return {
    id: row.id,
    tripId: row.tripId,
    createdByUserId: row.createdByUserId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    permittedFields: Array.isArray(row.permittedFields) ? (row.permittedFields as string[]) : [],
    preview: {},
  };
}
