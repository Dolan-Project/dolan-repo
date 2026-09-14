import { Op } from "sequelize";
import { getModels } from "@dolan/database";
import { createOpaqueToken, hashToken } from "./password.ts";

export type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export interface SessionStore {
  createSession(userId: string, ttlMs?: number): Promise<{ token: string; record: SessionRecord }>;
  findValidSession(token: string): Promise<SessionRecord | null>;
  revokeSession(token: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  createResetToken(userId: string, ttlMs?: number): Promise<{ token: string; record: ResetTokenRecord }>;
  consumeResetToken(token: string): Promise<ResetTokenRecord | null>;
  createEmailVerificationToken(
    userId: string,
    ttlMs?: number,
  ): Promise<{ token: string; record: ResetTokenRecord }>;
  consumeEmailVerificationToken(token: string): Promise<ResetTokenRecord | null>;
}

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_RESET_TTL_MS = 1000 * 60 * 30;
const DEFAULT_VERIFY_TTL_MS = 1000 * 60 * 60 * 24;

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly resets = new Map<string, ResetTokenRecord>();
  private readonly verifications = new Map<string, ResetTokenRecord>();

  async createSession(userId: string, ttlMs = DEFAULT_SESSION_TTL_MS) {
    const token = createOpaqueToken();
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      revokedAt: null,
    };
    this.sessions.set(record.tokenHash, record);
    return { token, record };
  }

  async findValidSession(token: string) {
    const record = this.sessions.get(hashToken(token));
    if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) return null;
    return record;
  }

  async revokeSession(token: string) {
    const record = this.sessions.get(hashToken(token));
    if (record) record.revokedAt = new Date();
  }

  async revokeAllForUser(userId: string) {
    for (const record of this.sessions.values()) {
      if (record.userId === userId) record.revokedAt = new Date();
    }
  }

  async createResetToken(userId: string, ttlMs = DEFAULT_RESET_TTL_MS) {
    const token = createOpaqueToken();
    const record: ResetTokenRecord = {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      usedAt: null,
    };
    this.resets.set(record.tokenHash, record);
    return { token, record };
  }

  async consumeResetToken(token: string) {
    const record = this.resets.get(hashToken(token));
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
    record.usedAt = new Date();
    return record;
  }

  async createEmailVerificationToken(userId: string, ttlMs = DEFAULT_VERIFY_TTL_MS) {
    const token = createOpaqueToken();
    const record: ResetTokenRecord = {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      usedAt: null,
    };
    this.verifications.set(record.tokenHash, record);
    return { token, record };
  }

  async consumeEmailVerificationToken(token: string) {
    const record = this.verifications.get(hashToken(token));
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
    record.usedAt = new Date();
    return record;
  }
}

export class SequelizeSessionStore implements SessionStore {
  async createSession(userId: string, ttlMs = DEFAULT_SESSION_TTL_MS) {
    const { AuthSession } = getModels();
    const token = createOpaqueToken();
    const row = await AuthSession.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      revokedAt: null,
    });
    return {
      token,
      record: {
        id: row.id,
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt ?? null,
      },
    };
  }

  async findValidSession(token: string) {
    const { AuthSession } = getModels();
    const row = await AuthSession.findOne({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt ?? null,
    };
  }

  async revokeSession(token: string) {
    const { AuthSession } = getModels();
    await AuthSession.update(
      { revokedAt: new Date() },
      { where: { tokenHash: hashToken(token), revokedAt: null } },
    );
  }

  async revokeAllForUser(userId: string) {
    const { AuthSession } = getModels();
    await AuthSession.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
  }

  async createResetToken(userId: string, ttlMs = DEFAULT_RESET_TTL_MS) {
    const { PasswordResetToken } = getModels();
    const token = createOpaqueToken();
    const row = await PasswordResetToken.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      usedAt: null,
    });
    return {
      token,
      record: {
        id: row.id,
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt ?? null,
      },
    };
  }

  async consumeResetToken(token: string) {
    const { PasswordResetToken } = getModels();
    const row = await PasswordResetToken.findOne({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) return null;
    row.usedAt = new Date();
    await row.save({ fields: ["usedAt"] });
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
    };
  }

  async createEmailVerificationToken(userId: string, ttlMs = DEFAULT_VERIFY_TTL_MS) {
    const { EmailVerificationToken } = getModels();
    const token = createOpaqueToken();
    const row = await EmailVerificationToken.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      usedAt: null,
    });
    return {
      token,
      record: {
        id: row.id,
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt ?? null,
      },
    };
  }

  async consumeEmailVerificationToken(token: string) {
    const { EmailVerificationToken } = getModels();
    const row = await EmailVerificationToken.findOne({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) return null;
    row.usedAt = new Date();
    await row.save({ fields: ["usedAt"] });
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
    };
  }
}
