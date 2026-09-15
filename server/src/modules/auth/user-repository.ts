import type { AuthIdentity, ProfileUpdateInput, UserRole, UserStatus } from "@dolan/shared";
import { hashPassword } from "./password.ts";

export type UpsertUserInput = {
  authReference: string;
  email: string;
  emailVerifiedAt: string | null;
};

export type CreateLocalUserInput = {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
  emailVerifiedAt?: string | null;
};

export type CreateOAuthUserInput = {
  authReference: string;
  email: string;
  emailVerifiedAt: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export interface UserRepository {
  upsertFromAuth(input: UpsertUserInput): Promise<AuthIdentity>;
  findByAuthReference(authReference: string): Promise<AuthIdentity | null>;
  findById(userId: string): Promise<AuthIdentity | null>;
  findByUsername(username: string): Promise<AuthIdentity | null>;
  findByEmail(email: string): Promise<AuthIdentity | null>;
  createLocalUser(input: CreateLocalUserInput): Promise<AuthIdentity>;
  createOAuthUser(input: CreateOAuthUserInput): Promise<AuthIdentity>;
  getPasswordHash(userId: string): Promise<string | null>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<AuthIdentity>;
  updateProfile(userId: string, input: ProfileUpdateInput): Promise<AuthIdentity>;
}

const DEFAULT_SEED_PASSWORD = "password123";

export function createSeededMemoryUsers(): AuthIdentity[] {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      authReference: "auth-verified-complete",
      email: "verified@dolan.test",
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
      username: "alya",
      displayName: "Alya",
      domicile: "Jakarta",
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      authReference: "auth-unverified",
      email: "unverified@dolan.test",
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: null,
      username: "baru",
      displayName: "User Baru",
      domicile: "Bandung",
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      authReference: "auth-incomplete",
      email: "incomplete@dolan.test",
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
      username: null,
      displayName: null,
      domicile: null,
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      authReference: "auth-admin",
      email: "admin@dolan.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
      username: "admin",
      displayName: "Admin Dolan",
      domicile: "Jakarta",
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      authReference: "auth-verified-budi",
      email: "budi@dolan.test",
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
      username: "budi",
      displayName: "Budi",
      domicile: "Yogyakarta",
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    },
  ];
}

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, AuthIdentity>();
  private readonly passwordHashes = new Map<string, string>();

  constructor(seed: AuthIdentity[] = createSeededMemoryUsers()) {
    const seedHash = hashPassword(DEFAULT_SEED_PASSWORD);
    for (const user of seed) {
      this.users.set(user.authReference, user);
      this.passwordHashes.set(user.id, seedHash);
    }
  }

  async findByAuthReference(authReference: string): Promise<AuthIdentity | null> {
    return this.users.get(authReference) ?? null;
  }

  async findById(userId: string): Promise<AuthIdentity | null> {
    return [...this.users.values()].find((user) => user.id === userId) ?? null;
  }

  async findByUsername(username: string): Promise<AuthIdentity | null> {
    return [...this.users.values()].find((user) => user.username === username) ?? null;
  }

  async findByEmail(email: string): Promise<AuthIdentity | null> {
    const normalized = email.trim().toLowerCase();
    return [...this.users.values()].find((user) => user.email.toLowerCase() === normalized) ?? null;
  }

  async createLocalUser(input: CreateLocalUserInput): Promise<AuthIdentity> {
    const email = input.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new Error("EMAIL_TAKEN");
    }
    if (input.username) {
      const taken = await this.findByUsername(input.username);
      if (taken) throw new Error("USERNAME_TAKEN");
    }
    const id = crypto.randomUUID();
    const created: AuthIdentity = {
      id,
      authReference: `local:${id}`,
      email,
      role: "USER" satisfies UserRole,
      status: "ACTIVE" satisfies UserStatus,
      emailVerifiedAt: input.emailVerifiedAt !== undefined ? input.emailVerifiedAt : new Date().toISOString(),
      username: input.username ?? null,
      displayName: input.displayName ?? null,
      domicile: null,
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    };
    this.users.set(created.authReference, created);
    this.passwordHashes.set(id, hashPassword(input.password));
    return created;
  }

  async createOAuthUser(input: CreateOAuthUserInput): Promise<AuthIdentity> {
    const email = input.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new Error("EMAIL_TAKEN");
    }
    if (await this.findByAuthReference(input.authReference)) {
      throw new Error("EMAIL_TAKEN");
    }
    const id = crypto.randomUUID();
    const baseUsername = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "traveler";
    let username = baseUsername;
    let attempt = 0;
    while (await this.findByUsername(username)) {
      attempt += 1;
      username = `${baseUsername}${attempt}`.slice(0, 64);
    }
    const created: AuthIdentity = {
      id,
      authReference: input.authReference,
      email,
      role: "USER" satisfies UserRole,
      status: "ACTIVE" satisfies UserStatus,
      emailVerifiedAt: input.emailVerifiedAt,
      username,
      displayName: input.displayName ?? username,
      domicile: null,
      avatarUrl: input.avatarUrl ?? null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    };
    this.users.set(created.authReference, created);
    return created;
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    return this.passwordHashes.get(userId) ?? null;
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    this.passwordHashes.set(userId, passwordHash);
  }

  async markEmailVerified(userId: string): Promise<AuthIdentity> {
    const existing = await this.findById(userId);
    if (!existing) throw new Error("USER_NOT_FOUND");
    const next: AuthIdentity = {
      ...existing,
      emailVerifiedAt: new Date().toISOString(),
    };
    this.users.set(existing.authReference, next);
    return next;
  }

  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<AuthIdentity> {
    const existing = await this.findById(userId);
    if (!existing) {
      throw new Error("USER_NOT_FOUND");
    }
    const taken = [...this.users.values()].some(
      (user) => user.username === input.username && user.id !== userId,
    );
    if (taken) {
      throw new Error("USERNAME_TAKEN");
    }
    const next: AuthIdentity = {
      ...existing,
      username: input.username,
      displayName: input.displayName,
      domicile: input.domicile,
      bio: input.bio ?? null,
      instagramUrl:
        input.instagramUrl !== undefined ? input.instagramUrl : existing.instagramUrl,
      tiktokUrl: input.tiktokUrl !== undefined ? input.tiktokUrl : existing.tiktokUrl,
    };
    this.users.set(existing.authReference, next);
    return next;
  }

  async upsertFromAuth(input: UpsertUserInput): Promise<AuthIdentity> {
    const existing = this.users.get(input.authReference);
    if (existing) {
      const next: AuthIdentity = {
        ...existing,
        email: input.email,
        emailVerifiedAt: input.emailVerifiedAt,
      };
      this.users.set(input.authReference, next);
      return next;
    }

    const created: AuthIdentity = {
      id: crypto.randomUUID(),
      authReference: input.authReference,
      email: input.email,
      role: "USER" satisfies UserRole,
      status: "ACTIVE" satisfies UserStatus,
      emailVerifiedAt: input.emailVerifiedAt,
      username: null,
      displayName: null,
      domicile: null,
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      instagramUrl: null,
      tiktokUrl: null,
    };
    this.users.set(input.authReference, created);
    return created;
  }
}
