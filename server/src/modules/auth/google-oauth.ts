import { createHmac, timingSafeEqual } from "node:crypto";
import { isAllowedNextPath, resolvePostAuthPath } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { badRequest, providerUnavailable } from "../../lib/api-error.ts";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

type OAuthState = {
  next: string;
  exp: number;
};

function oauthConfigured() {
  return Boolean(env.googleOAuthClientId && env.googleOAuthClientSecret && env.googleOAuthRedirectUri);
}

function signState(payload: string): string {
  return createHmac("sha256", env.shareTokenSecret).update(payload).digest("base64url");
}

export function encodeOAuthState(next: string | null | undefined): string {
  const body: OAuthState = {
    next: resolvePostAuthPath(next),
    exp: Date.now() + 10 * 60_000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function decodeOAuthState(state: string | undefined): string {
  if (!state?.includes(".")) {
    throw badRequest("VALIDATION_ERROR", "State OAuth tidak valid");
  }
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    throw badRequest("VALIDATION_ERROR", "State OAuth tidak valid");
  }
  const expected = signState(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw badRequest("VALIDATION_ERROR", "State OAuth tidak valid");
  }
  let parsed: OAuthState;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
  } catch {
    throw badRequest("VALIDATION_ERROR", "State OAuth tidak valid");
  }
  if (!parsed.exp || parsed.exp < Date.now()) {
    throw badRequest("VALIDATION_ERROR", "State OAuth kedaluwarsa. Coba masuk lagi.");
  }
  return isAllowedNextPath(parsed.next) ? parsed.next : "/";
}

export function buildGoogleAuthorizeUrl(next: string | null | undefined): string {
  if (!oauthConfigured()) {
    throw providerUnavailable(
      "PROVIDER_UNAVAILABLE",
      "Google login belum dikonfigurasi (GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI)",
      503,
    );
  }
  const params = new URLSearchParams({
    client_id: env.googleOAuthClientId,
    redirect_uri: env.googleOAuthRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
    state: encodeOAuthState(next),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleProfile> {
  if (!oauthConfigured()) {
    throw providerUnavailable(
      "PROVIDER_UNAVAILABLE",
      "Google login belum dikonfigurasi (GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI)",
      503,
    );
  }
  const tokenRes = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      redirect_uri: env.googleOAuthRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw badRequest("INVALID_CREDENTIALS", "Gagal menukar kode Google OAuth");
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw badRequest("INVALID_CREDENTIALS", "Token Google tidak tersedia");
  }

  const profileRes = await fetchImpl("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    throw badRequest("INVALID_CREDENTIALS", "Gagal membaca profil Google");
  }
  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.sub || !profile.email) {
    throw badRequest("INVALID_CREDENTIALS", "Profil Google tidak lengkap");
  }
  return {
    sub: profile.sub,
    email: profile.email.trim().toLowerCase(),
    emailVerified: Boolean(profile.email_verified),
    name: profile.name ?? null,
    picture: profile.picture ?? null,
  };
}

export function webCallbackUrl(accessToken: string, next: string): string {
  const url = new URL("/api/auth/callback", env.webUrl);
  url.searchParams.set("token", accessToken);
  url.searchParams.set("next", next);
  return url.toString();
}

export function webLoginErrorUrl(message: string): string {
  const url = new URL("/masuk", env.webUrl);
  url.searchParams.set("error", "google");
  url.searchParams.set("message", message.slice(0, 180));
  return url.toString();
}
