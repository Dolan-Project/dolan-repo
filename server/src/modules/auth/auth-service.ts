import {
  AuthErrorCode,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type AuthIdentity,
  type ProfileUpdateInput,
  type SessionResponse,
} from "@dolan/shared";
import { badRequest, conflict, notFound, unauthorized } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";
import type { AuthAdapter } from "./auth-adapter.ts";
import { env } from "../../config/env.ts";
import { resetPasswordEmailHtml, sendEmail } from "../../integrations/email/resend-client.ts";
import { isEmailVerified, isProfileComplete } from "./authorization.ts";
import {
  buildGoogleAuthorizeUrl,
  decodeOAuthState,
  exchangeGoogleCode,
  webCallbackUrl,
  webLoginErrorUrl,
  type GoogleProfile,
} from "./google-oauth.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import type { SessionStore } from "./session-store.ts";
import type { UserRepository } from "./user-repository.ts";
import type { SocialQueryStore } from "../social/social-queries.ts";

type ProfileTripCounts = (userId: string) => Promise<{
  hostTripCount: number;
  participantTripCount: number;
}>;

export class AuthService {
  constructor(
    private readonly authAdapter: AuthAdapter,
    private readonly users: UserRepository,
    private readonly sessions?: SessionStore,
    private readonly social?: SocialQueryStore,
    private readonly tripCounts?: ProfileTripCounts,
  ) {}

  async resolveSession(accessToken: string): Promise<AuthIdentity> {
    const providerUser = await this.authAdapter.validateAccessToken(accessToken);
    return this.users.upsertFromAuth({
      authReference: providerUser.authReference,
      email: providerUser.email,
      emailVerifiedAt: providerUser.emailVerifiedAt,
    });
  }

  async register(body: unknown) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const parsed = registerSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    }
    try {
      const user = await this.users.createLocalUser({
        email: parsed.data.email,
        password: parsed.data.password,
        username: parsed.data.username,
        displayName: parsed.data.displayName,
        emailVerifiedAt: new Date().toISOString(),
      });
      const { token } = await this.sessions.createSession(user.id);
      return {
        session: await this.toMeSession(user),
        accessToken: token,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        throw conflict("EMAIL_TAKEN", "Email sudah terdaftar");
      }
      if (error instanceof Error && error.message === "USERNAME_TAKEN") {
        throw conflict("USERNAME_TAKEN", "Username sudah dipakai");
      }
      throw error;
    }
  }

  async login(body: unknown) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const parsed = loginSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    }
    let user = await this.users.findByEmail(parsed.data.email);
    const hash = user ? await this.users.getPasswordHash(user.id) : null;
    if (!user || !verifyPassword(parsed.data.password, hash)) {
      throw unauthorized(
        "INVALID_CREDENTIALS",
        "Email atau kata sandi belum cocok. Periksa lagi, atau gunakan Lupa Password.",
      );
    }
    if (!isEmailVerified(user)) {
      user = await this.users.markEmailVerified(user.id);
    }
    const { token } = await this.sessions.createSession(user.id);
    return { session: await this.toMeSession(user), accessToken: token };
  }

  async logout(accessToken: string | null) {
    if (this.sessions && accessToken) {
      await this.sessions.revokeSession(accessToken);
    }
    return { loggedOut: true as const };
  }

  async forgotPassword(body: unknown) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const parsed = forgotPasswordSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    }
    const message = "Jika email terdaftar, tautan reset telah dikirim.";
    const user = await this.users.findByEmail(parsed.data.email);
    if (!user) return { message };

    const { token } = await this.sessions.createResetToken(user.id);
    const resetUrl = `${env.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      const sent = await sendEmail({
        to: user.email,
        subject: "Reset kata sandi Dolan",
        html: resetPasswordEmailHtml(resetUrl),
        text: `Reset kata sandi Dolan: ${resetUrl}`,
      });
      if (!sent && env.nodeEnv !== "production") {
        return { message, debugResetToken: token };
      }
    } catch (error) {
      console.error("[auth] failed to send reset email", error);
      if (env.nodeEnv !== "production") {
        return { message, debugResetToken: token };
      }
      throw badRequest("PROVIDER_UNAVAILABLE", "Gagal mengirim email reset. Coba lagi sebentar.");
    }

    return { message };
  }

  async resetPassword(body: unknown) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const parsed = resetPasswordSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    }
    const reset = await this.sessions.consumeResetToken(parsed.data.token);
    if (!reset) {
      throw unauthorized(AuthErrorCode.INVALID_TOKEN, "Tautan reset tidak valid");
    }
    await this.users.setPasswordHash(reset.userId, hashPassword(parsed.data.password));
    await this.sessions.revokeAllForUser(reset.userId);
    return { reset: true as const };
  }

  async verifyEmail(body: unknown) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const parsed = verifyEmailSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Tautan verifikasi tidak valid", zodFields(parsed.error));
    }
    const record = await this.sessions.consumeEmailVerificationToken(parsed.data.token);
    if (!record) {
      throw unauthorized(AuthErrorCode.INVALID_TOKEN, "Tautan verifikasi tidak valid atau sudah kedaluwarsa");
    }
    const user = await this.users.markEmailVerified(record.userId);
    return { session: await this.toMeSession(user), verified: true as const };
  }

  async resendVerification(userId: string, _next?: string | null) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    const user = await this.users.findById(userId);
    if (!user) throw notFound("NOT_FOUND", "Pengguna tidak ditemukan");
    if (!isEmailVerified(user)) {
      await this.users.markEmailVerified(user.id);
    }
    return { message: "Email sudah terverifikasi.", alreadyVerified: true as const };
  }

  beginGoogleLogin(next: string | null | undefined) {
    return buildGoogleAuthorizeUrl(next);
  }

  async completeGoogleLogin(input: {
    code: string | undefined;
    state: string | undefined;
    fetchImpl?: typeof fetch;
  }) {
    if (!this.sessions) throw badRequest("PROVIDER_UNAVAILABLE", "Local auth is not configured");
    if (!input.code) throw badRequest("VALIDATION_ERROR", "Kode Google tidak ada");
    const next = decodeOAuthState(input.state);
    const profile = await exchangeGoogleCode(input.code, input.fetchImpl);
    const user = await this.findOrCreateGoogleUser(profile);
    const { token } = await this.sessions.createSession(user.id);
    return { redirectUrl: webCallbackUrl(token, next) };
  }

  googleLoginErrorRedirect(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Login Google gagal. Coba lagi atau masuk dengan email.";
    return webLoginErrorUrl(message);
  }

  private async findOrCreateGoogleUser(profile: GoogleProfile) {
    const authReference = `google:${profile.sub}`;
    const existingByRef = await this.users.findByAuthReference(authReference);
    if (existingByRef) {
      return this.users.upsertFromAuth({
        authReference,
        email: profile.email,
        emailVerifiedAt: existingByRef.emailVerifiedAt ?? new Date().toISOString(),
      });
    }
    const existingByEmail = await this.users.findByEmail(profile.email);
    if (existingByEmail) {
      return existingByEmail;
    }
    try {
      return await this.users.createOAuthUser({
        authReference,
        email: profile.email,
        emailVerifiedAt: new Date().toISOString(),
        displayName: profile.name,
        avatarUrl: profile.picture,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        const again = await this.users.findByEmail(profile.email);
        if (again) return again;
      }
      throw error;
    }
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

  async toMeSession(user: AuthIdentity) {
    const stats = await this.loadProfileStats(user.id);
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
        instagramUrl: user.instagramUrl,
        tiktokUrl: user.tiktokUrl,
        followersCount: stats.followersCount,
        followingCount: stats.followingCount,
        hostTripCount: stats.hostTripCount,
        participantTripCount: stats.participantTripCount,
        rating: stats.rating,
      },
    };
  }

  async toPublicUser(user: AuthIdentity) {
    return (await this.toMeSession(user)).user;
  }

  private async loadProfileStats(userId: string) {
    const [followersCount, followingCount, rating, tripCounts] = await Promise.all([
      this.social?.countFollowers(userId) ?? Promise.resolve(0),
      this.social?.countFollowing(userId) ?? Promise.resolve(0),
      this.social?.ratingFor(userId) ?? Promise.resolve({
        overall: null,
        communication: null,
        attitude: null,
        reviewCount: 0,
      }),
      this.tripCounts?.(userId) ?? Promise.resolve({ hostTripCount: 0, participantTripCount: 0 }),
    ]);
    return {
      followersCount,
      followingCount,
      hostTripCount: tripCounts.hostTripCount,
      participantTripCount: tripCounts.participantTripCount,
      rating,
    };
  }

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    try {
      const user = await this.users.updateProfile(userId, input);
      return await this.toMeSession(user);
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
    return await this.toPublicUser(user);
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
    const publicUser = await this.toPublicUser(user);
    return {
      id: publicUser.id,
      username: publicUser.username,
      displayName: publicUser.displayName,
      avatarUrl: publicUser.avatarUrl,
    };
  }
}
