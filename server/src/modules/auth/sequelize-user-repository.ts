import { UniqueConstraintError } from "sequelize";
import { getModels, type User, type UserProfile } from "@dolan/database";
import type { AuthIdentity, ProfileUpdateInput } from "@dolan/shared";
import { conflict, notFound } from "../../lib/api-error.ts";
import type { UpsertUserInput, UserRepository } from "./user-repository.ts";

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
        });
      } else {
        profile.username = input.username;
        profile.displayName = input.displayName;
        profile.domicile = input.domicile;
        profile.bio = input.bio ?? null;
        if (input.coverCaption !== undefined) {
          profile.coverCaption = input.coverCaption;
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
