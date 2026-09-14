import type { AuthIdentity, ProfileUpdateInput, SessionResponse } from "@dolan/shared";
import { conflict, notFound } from "../../lib/api-error.ts";
import type { AuthAdapter } from "../../integrations/supabase/auth-adapter.ts";
import { isEmailVerified, isProfileComplete } from "./authorization.ts";
import type { UserRepository } from "./user-repository.ts";

export class AuthService {
  constructor(
    private readonly authAdapter: AuthAdapter,
    private readonly users: UserRepository,
  ) {}

  async resolveSession(accessToken: string): Promise<AuthIdentity> {
    const providerUser = await this.authAdapter.validateAccessToken(accessToken);
    return this.users.upsertFromAuth({
      authReference: providerUser.authReference,
      email: providerUser.email,
      emailVerifiedAt: providerUser.emailVerifiedAt,
    });
  }

  toSessionResponse(user: AuthIdentity): SessionResponse {
    return {
      id: user.id,
      authReference: user.authReference,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: isEmailVerified(user),
      profileComplete: isProfileComplete(user),
      username: user.username,
      displayName: user.displayName,
      domicile: user.domicile,
    };
  }

  toMeSession(user: AuthIdentity) {
    return {
      emailVerified: isEmailVerified(user),
      profileComplete: isProfileComplete(user),
      user: {
        id: user.id,
        username: user.username ?? "",
        displayName: user.displayName ?? "",
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        bio: user.bio,
        domicile: user.domicile,
        followersCount: 0,
        followingCount: 0,
        hostTripCount: 0,
        participantTripCount: 0,
        rating: {
          overall: null,
          communication: null,
          attitude: null,
          reviewCount: 0,
        },
      },
    };
  }

  toPublicUser(user: AuthIdentity) {
    return this.toMeSession(user).user;
  }

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    try {
      const user = await this.users.updateProfile(userId, input);
      return this.toMeSession(user);
    } catch (error) {
      if (error instanceof Error && error.message === "USERNAME_TAKEN") {
        throw conflict("USERNAME_TAKEN", "Username sudah dipakai");
      }
      if (error instanceof Error && error.message === "USER_NOT_FOUND") {
        throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
      }
      throw error;
    }
  }

  async publicProfileByUsername(username: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
    return this.toPublicUser(user);
  }

  async resolveUser(usernameOrId: string) {
    const byId = await this.users.findById(usernameOrId);
    if (byId) return byId;
    const byUsername = await this.users.findByUsername(usernameOrId);
    if (!byUsername) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
    return byUsername;
  }

  async publicListItem(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) return null;
    const publicUser = this.toPublicUser(user);
    return {
      id: publicUser.id,
      username: publicUser.username,
      displayName: publicUser.displayName,
      avatarUrl: publicUser.avatarUrl,
    };
  }
}
