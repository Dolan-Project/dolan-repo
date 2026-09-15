import { UniqueConstraintError } from "sequelize";
import { getModels, type User, type UserProfile } from "@dolan/database";
import type { AuthIdentity, ProfileUpdateInput } from "@dolan/shared";
import { conflict, notFound } from "../../lib/api-error.ts";
import { isUuid } from "../../lib/is-uuid.ts";
import { hashPassword } from "./password.ts";
import type { CreateLocalUserInput, CreateOAuthUserInput, UpsertUserInput, UserRepository } from "./user-repository.ts";

export function toAuthIdentity(user: User, profile: UserProfile | null): AuthIdentity {
  return {
    id: user.id,
    authReference: user.authReference,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? null,
    domicile: profile?.domicile ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    bio: profile?.bio ?? null,
    instagramUrl: profile?.instagramUrl ?? null,
    tiktokUrl: profile?.tiktokUrl ?? null,
  };
}

export class SequelizeUserRepository implements UserRepository {
  async findByAuthReference(authReference: string): Promise<AuthIdentity | null> {
    const { User, UserProfile } = getModels();
    const user = await User.findOne({ where: { authReference } });
    if (!user) return null;
    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    return toAuthIdentity(user, profile);
  }

  async upsertFromAuth(input: UpsertUserInput): Promise<AuthIdentity> {
    const { User, UserProfile } = getModels();
    const [user, created] = await User.findOrCreate({
      where: { authReference: input.authReference },
      defaults: {
        authReference: input.authReference,
        email: input.email,
        emailVerifiedAt: input.emailVerifiedAt ? new Date(input.emailVerifiedAt) : null,
        role: "USER",
        status: "ACTIVE",
      },
    });

    if (!created) {
      user.email = input.email;
      user.emailVerifiedAt = input.emailVerifiedAt ? new Date(input.emailVerifiedAt) : null;
      await user.save({ fields: ["email", "emailVerifiedAt"] });
    }

    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    return toAuthIdentity(user, profile);
  }

  async findById(userId: string): Promise<AuthIdentity | null> {
    if (!isUuid(userId)) return null;
    const { User, UserProfile } = getModels();
    const user = await User.findByPk(userId);
    if (!user) return null;
    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    return toAuthIdentity(user, profile);
  }

  async findByUsername(username: string): Promise<AuthIdentity | null> {
    const { User, UserProfile } = getModels();
    const profile = await UserProfile.findOne({ where: { username } });
    if (!profile) return null;
    const user = await User.findByPk(profile.userId);
    if (!user) return null;
    return toAuthIdentity(user, profile);
  }

  async findByEmail(email: string): Promise<AuthIdentity | null> {
    const { User, UserProfile } = getModels();
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user) return null;
    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    return toAuthIdentity(user, profile);
  }

  async createLocalUser(input: CreateLocalUserInput): Promise<AuthIdentity> {
    const { User, UserProfile } = getModels();
    const email = input.email.trim().toLowerCase();
    const id = crypto.randomUUID();
    try {
      const user = await User.create({
        id,
        authReference: `local:${id}`,
        email,
        passwordHash: hashPassword(input.password),
        emailVerifiedAt:
          input.emailVerifiedAt !== undefined
            ? input.emailVerifiedAt
              ? new Date(input.emailVerifiedAt)
              : null
            : new Date(),
        role: "USER",
        status: "ACTIVE",
      });
      let profile: UserProfile | null = null;
      if (input.username || input.displayName) {
        profile = await UserProfile.create({
          userId: user.id,
          username: input.username ?? `user_${user.id.slice(0, 8)}`,
          displayName: input.displayName ?? input.username ?? "Traveler",
          domicile: null,
          bio: null,
          instagramUrl: null,
          tiktokUrl: null,
        });
      }
      return toAuthIdentity(user, profile);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const fields = error.errors?.map((item) => item.path) ?? [];
        if (fields.includes("email") || fields.includes("auth_reference")) {
          throw new Error("EMAIL_TAKEN");
        }
        if (fields.includes("username")) {
          throw new Error("USERNAME_TAKEN");
        }
        throw new Error("EMAIL_TAKEN");
      }
      throw error;
    }
  }

  async createOAuthUser(input: CreateOAuthUserInput): Promise<AuthIdentity> {
    const { User, UserProfile } = getModels();
    const email = input.email.trim().toLowerCase();
    const id = crypto.randomUUID();
    const baseUsername =
      email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `user_${id.slice(0, 8)}`;
    let username = baseUsername;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const taken = await UserProfile.findOne({ where: { username } });
      if (!taken) break;
      username = `${baseUsername}${attempt + 1}`.slice(0, 64);
    }
    try {
      const user = await User.create({
        id,
        authReference: input.authReference,
        email,
        passwordHash: null,
        emailVerifiedAt: input.emailVerifiedAt ? new Date(input.emailVerifiedAt) : null,
        role: "USER",
        status: "ACTIVE",
      });
      const profile = await UserProfile.create({
        userId: user.id,
        username,
        displayName: input.displayName ?? username,
        avatarUrl: input.avatarUrl ?? null,
        domicile: null,
        bio: null,
        instagramUrl: null,
        tiktokUrl: null,
      });
      return toAuthIdentity(user, profile);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const fields = error.errors?.map((item) => item.path) ?? [];
        if (fields.includes("email") || fields.includes("auth_reference")) {
          throw new Error("EMAIL_TAKEN");
        }
        if (fields.includes("username")) {
          throw new Error("USERNAME_TAKEN");
        }
        throw new Error("EMAIL_TAKEN");
      }
      throw error;
    }
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const { User } = getModels();
    const user = await User.findByPk(userId);
    return user?.passwordHash ?? null;
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const { User } = getModels();
    const user = await User.findByPk(userId);
    if (!user) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
    user.passwordHash = passwordHash;
    await user.save({ fields: ["passwordHash"] });
  }

  async markEmailVerified(userId: string): Promise<AuthIdentity> {
    const { User, UserProfile } = getModels();
    const user = await User.findByPk(userId);
    if (!user) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
    user.emailVerifiedAt = new Date();
    await user.save({ fields: ["emailVerifiedAt"] });
    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    return toAuthIdentity(user, profile);
  }

  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<AuthIdentity> {
    const { User, UserProfile } = getModels();
    const user = await User.findByPk(userId);
    if (!user) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");

    try {
      let profile = await UserProfile.findOne({ where: { userId } });
      if (!profile) {
        profile = await UserProfile.create({
          userId,
          username: input.username,
          displayName: input.displayName,
          domicile: input.domicile,
          bio: input.bio ?? null,
          coverCaption: input.coverCaption ?? null,
          instagramUrl: input.instagramUrl ?? null,
          tiktokUrl: input.tiktokUrl ?? null,
        });
      } else {
        profile.username = input.username;
        profile.displayName = input.displayName;
        profile.domicile = input.domicile;
        profile.bio = input.bio ?? null;
        if (input.coverCaption !== undefined) {
          profile.coverCaption = input.coverCaption;
        }
        if (input.instagramUrl !== undefined) {
          profile.instagramUrl = input.instagramUrl;
        }
        if (input.tiktokUrl !== undefined) {
          profile.tiktokUrl = input.tiktokUrl;
        }
        await profile.save();
      }
      return toAuthIdentity(user, profile);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw conflict("USERNAME_TAKEN", "Username sudah dipakai");
      }
      throw error;
    }
  }
}
