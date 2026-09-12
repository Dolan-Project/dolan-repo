import type { AuthIdentity, UserRole, UserStatus } from "@dolan/shared";

export type UpsertUserInput = {
  authReference: string;
  email: string;
  emailVerifiedAt: string | null;
};

export interface UserRepository {
  upsertFromAuth(input: UpsertUserInput): Promise<AuthIdentity>;
  findByAuthReference(authReference: string): Promise<AuthIdentity | null>;
}

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
    },
  ];
}

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, AuthIdentity>();

  constructor(seed: AuthIdentity[] = createSeededMemoryUsers()) {
    for (const user of seed) {
      this.users.set(user.authReference, user);
    }
  }

  async findByAuthReference(authReference: string): Promise<AuthIdentity | null> {
    return this.users.get(authReference) ?? null;
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
    };
    this.users.set(input.authReference, created);
    return created;
  }
}
