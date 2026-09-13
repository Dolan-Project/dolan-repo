import { env } from "../../config/env.ts";
import { HttpError } from "../../lib/api-error.ts";
import type { ChatService } from "../chat/chat-service.ts";
import { hashShareToken, newShareToken } from "./token-hash.ts";

export const PRIVATE_SHARE_FIELDS = [
  "privateOriginLabel",
  "privateOriginLatitude",
  "privateOriginLongitude",
  "email",
  "preciseLocation",
] as const;

export type ShareLinkRecord = {
  id: string;
  tripId: string;
  createdByUserId: string;
  tokenHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  permittedFields: string[];
  preview: Record<string, unknown>;
};

export interface ShareLinkStore {
  create(link: ShareLinkRecord): Promise<ShareLinkRecord>;
  findByHash(tokenHash: string): Promise<ShareLinkRecord | null>;
  findById(id: string): Promise<ShareLinkRecord | null>;
  revoke(id: string): Promise<ShareLinkRecord | null>;
}

export class MemoryShareLinkStore implements ShareLinkStore {
  readonly links: ShareLinkRecord[] = [];

  async create(link: ShareLinkRecord) {
    this.links.push(link);
    return link;
  }

  async findByHash(tokenHash: string) {
    return this.links.find((link) => link.tokenHash === tokenHash) ?? null;
  }

  async findById(id: string) {
    return this.links.find((link) => link.id === id) ?? null;
  }

  async revoke(id: string) {
    const link = this.links.find((item) => item.id === id);
    if (!link) return null;
    link.revokedAt = new Date();
    return link;
  }
}

const DEFAULT_FIELDS = ["title", "destinationCity", "startDate", "endDate", "summary"];

export function stripPrivateShareFields(input: Record<string, unknown>, permitted: string[]) {
  return Object.fromEntries(
    permitted
      .filter((field) => !PRIVATE_SHARE_FIELDS.includes(field as (typeof PRIVATE_SHARE_FIELDS)[number]))
      .filter((field) => field in input)
      .map((field) => [field, input[field]]),
  );
}

export class ShareLinkService {
  constructor(
    private readonly store: ShareLinkStore,
    private readonly chat: ChatService,
    private readonly loadPreview: (tripId: string) => Promise<Record<string, unknown>>,
  ) {}

  async create(tripId: string, userId: string, body: { permittedFields?: string[]; hours?: number } = {}) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const permitted = (body.permittedFields ?? DEFAULT_FIELDS).filter(
      (field) => !PRIVATE_SHARE_FIELDS.includes(field as (typeof PRIVATE_SHARE_FIELDS)[number]),
    );
    const preview = stripPrivateShareFields(await this.loadPreview(tripId), permitted);
    const token = newShareToken();
    const hours = body.hours ?? env.shareLinkTtlHours;
    const record = await this.store.create({
      id: crypto.randomUUID(),
      tripId,
      createdByUserId: userId,
      tokenHash: hashShareToken(token),
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      revokedAt: null,
      permittedFields: permitted,
      preview,
    });
    return {
      id: record.id,
      token,
      expiresAt: record.expiresAt?.toISOString() ?? null,
      url: `${env.webUrl}/share/${token}`,
      permittedFields: permitted,
    };
  }

  async preview(token: string) {
    const link = await this.store.findByHash(hashShareToken(token));
    if (!link || link.revokedAt || (link.expiresAt && link.expiresAt.getTime() <= Date.now())) {
      throw new HttpError(404, "NOT_FOUND", "Share link is not available");
    }
    const live = stripPrivateShareFields(await this.loadPreview(link.tripId), link.permittedFields);
    const preview = Object.keys(live).length > 0 ? live : stripPrivateShareFields(link.preview, link.permittedFields);
    return {
      tripId: link.tripId,
      permittedFields: link.permittedFields,
      preview,
    };
  }

  async revoke(tripId: string, linkId: string, userId: string) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const link = await this.store.findById(linkId);
    if (!link || link.tripId !== tripId) throw new HttpError(404, "NOT_FOUND", "Share link not found");
    await this.store.revoke(linkId);
    return { revoked: true };
  }
}
