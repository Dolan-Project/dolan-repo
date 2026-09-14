import {
  AUTH_ERROR_CODES,
  forgotPasswordSchema,
  isProfileComplete,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthSession,
  type PublicUser,
} from "@/lib/contracts";
import {
  mockForgotPassword,
  mockLogin,
  mockLogout,
  mockRegister,
  mockResetPassword,
} from "@/mocks/auth";
import { samplePublicUser } from "@/mocks/fixtures";
import { clearOfflineForSessionId } from "@/mocks/community-store";
import { createApiError } from "@/mocks/scenarios";
import { jsonResult, statusForCode, validationError } from "./api-response";
import { proxyToExpress } from "./express-proxy";
import { resolveAfterAuth } from "./post-auth-path";
import { readSessionId, sessionCookieHeader } from "./session-cookie";
import { getSupabaseAnon } from "./supabase-anon";
import { shouldUseMockApi } from "./use-mock";

const TAKEN_EMAIL = "taken@dolan.test";
const RATE_EMAIL = "rate@dolan.test";
const WRONG_PASSWORD = "salah123";

function incompleteUser(): PublicUser {
  return {
    ...samplePublicUser,
    username: "",
    displayName: "",
    domicile: null,
    bio: null,
  };
}

function registerSession(): AuthSession {
  const user = incompleteUser();
  return {
    user,
    emailVerified: false,
    profileComplete: isProfileComplete(user),
  };
}

function loginSession(): AuthSession {
  return {
    user: samplePublicUser,
    emailVerified: true,
    profileComplete: isProfileComplete(samplePublicUser),
  };
}

function sessionFromAuthUser(user: {
  id: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthSession {
  const meta = user.user_metadata ?? {};
  const publicUser: PublicUser = {
    id: user.id,
    username: String(meta.username ?? ""),
    displayName: String(meta.display_name ?? meta.displayName ?? ""),
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    coverUrl: typeof meta.cover_url === "string" ? meta.cover_url : null,
    bio: typeof meta.bio === "string" ? meta.bio : null,
    domicile: typeof meta.domicile === "string" ? meta.domicile : null,
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
  };
  return {
    user: publicUser,
    emailVerified: Boolean(user.email_confirmed_at),
    profileComplete: isProfileComplete(publicUser),
  };
}

async function sessionAfterAccessToken(
  accessToken: string,
  user: {
    id: string;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  },
): Promise<AuthSession> {
  try {
    const me = await proxyToExpress(
      new Request("http://localhost/api/v1/users/me", {
        headers: { authorization: `Bearer ${accessToken}` },
      }),
      "/api/v1/users/me",
    );
    if (me.ok) {
      const json = (await me.json()) as
        | { success: true; data: AuthSession }
        | { success: false };
      if (json.success) return json.data;
    }
  } catch {
    // Express down or malformed — fall back to Supabase metadata.
  }
  return sessionFromAuthUser(user);
}

function providerUnavailable() {
  return jsonResult(
    createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia"),
    statusForCode("PROVIDER_UNAVAILABLE"),
  );
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleRegisterRequest(request: Request): Promise<Response> {
  const parsed = registerSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);

  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    if (!client) return providerUnavailable();
    const { data, error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          username: parsed.data.username ?? "",
          display_name: parsed.data.displayName ?? "",
        },
      },
    });
    if (error?.message.toLowerCase().includes("already")) {
      return jsonResult(
        createApiError(AUTH_ERROR_CODES.EMAIL_TAKEN, "Email sudah terdaftar"),
        statusForCode(AUTH_ERROR_CODES.EMAIL_TAKEN),
      );
    }
    if (error || !data.user) {
      return jsonResult(
        createApiError(AUTH_ERROR_CODES.VALIDATION_ERROR, "Pendaftaran gagal"),
        400,
      );
    }
    const token = data.session?.access_token;
    const session = token
      ? await sessionAfterAccessToken(token, data.user)
      : sessionFromAuthUser(data.user);
    return jsonResult({ success: true, data: session }, 200, token ?? undefined);
  }

  const mock = mockRegister(
    parsed.data.email === TAKEN_EMAIL ? "validationError" : "success",
  );
  if (!mock.success) {
    return jsonResult(mock, statusForCode(mock.error.code));
  }

  return jsonResult({ success: true, data: registerSession() }, 200, "pending");
}

export async function handleLoginRequest(request: Request): Promise<Response> {
  const parsed = loginSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);

  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    if (!client) return providerUnavailable();
    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error || !data.session || !data.user) {
      return jsonResult(
        createApiError(
          AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          "Email atau password salah",
        ),
        statusForCode(AUTH_ERROR_CODES.INVALID_CREDENTIALS),
      );
    }
    const session = await sessionAfterAccessToken(data.session.access_token, data.user);
    return jsonResult({ success: true, data: session }, 200, data.session.access_token);
  }

  if (parsed.data.email === RATE_EMAIL) {
    const mock = mockLogin("quotaError");
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }

  if (parsed.data.password === WRONG_PASSWORD) {
    const mock = mockLogin("unauthorized");
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }

  const mock = mockLogin("success");
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult({ success: true, data: loginSession() }, 200, "complete");
}

export async function handleLogoutRequest(request: Request): Promise<Response> {
  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    await client?.auth.signOut();
    const tokenHeader = request.headers.get("authorization") ?? request.headers.get("cookie");
    if (tokenHeader) {
      await proxyToExpress(request, "/api/v1/auth/disconnect-sockets");
    }
    return jsonResult({ success: true, data: { loggedOut: true } }, 200, null);
  }
  const mock = mockLogout("success");
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  clearOfflineForSessionId(readSessionId(request.headers.get("cookie")));
  return jsonResult(mock, 200, null);
}

export async function handleForgotPasswordRequest(
  request: Request,
): Promise<Response> {
  const parsed = forgotPasswordSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    if (!client) return providerUnavailable();
    await client.auth.resetPasswordForEmail(parsed.data.email);
    return jsonResult({
      success: true,
      data: { message: "Jika email terdaftar, tautan reset telah dikirim." },
    }, 200);
  }
  const mock = mockForgotPassword("success");
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleResetPasswordRequest(
  request: Request,
): Promise<Response> {
  const parsed = resetPasswordSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    if (!client) return providerUnavailable();
    const { data, error } = await client.auth.verifyOtp({
      token_hash: parsed.data.token,
      type: "recovery",
    });
    if (error || !data.session) {
      return jsonResult(
        createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tautan reset tidak valid"),
        statusForCode(AUTH_ERROR_CODES.UNAUTHORIZED),
      );
    }
    const updated = await client.auth.updateUser({ password: parsed.data.password });
    if (updated.error) {
      return jsonResult(
        createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tautan reset tidak valid"),
        statusForCode(AUTH_ERROR_CODES.UNAUTHORIZED),
      );
    }
    return jsonResult({ success: true, data: { reset: true } }, 200);
  }
  const mock = mockResetPassword(
    parsed.data.token === "expired" ? "unauthorized" : "success",
  );
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleCallbackRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? url.searchParams.get("code");
  const next = url.searchParams.get("next");
  if (!token || token === "expired") {
    const dest = new URL("/cek-email", url.origin);
    dest.searchParams.set("error", "invalid");
    return Response.redirect(dest, 302);
  }

  if (!shouldUseMockApi()) {
    const client = getSupabaseAnon();
    if (!client) {
      const dest = new URL("/cek-email", url.origin);
      dest.searchParams.set("error", "invalid");
      return Response.redirect(dest, 302);
    }
    const code = url.searchParams.get("code");
    const exchanged = code
      ? await client.auth.exchangeCodeForSession(code)
      : await client.auth.verifyOtp({ token_hash: token, type: "email" });
    const accessToken = exchanged.data.session?.access_token;
    const user = exchanged.data.user;
    if (exchanged.error || !accessToken || !user) {
      const dest = new URL("/cek-email", url.origin);
      dest.searchParams.set("error", "invalid");
      return Response.redirect(dest, 302);
    }
    const session = await sessionAfterAccessToken(accessToken, user);
    const dest = new URL(resolveAfterAuth(session, next), url.origin);
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        "Set-Cookie": sessionCookieHeader(accessToken),
      },
    });
  }

  const session: AuthSession = {
    user: incompleteUser(),
    emailVerified: true,
    profileComplete: false,
  };
  const dest = new URL(resolveAfterAuth(session, next), url.origin);
  return new Response(null, {
    status: 302,
    headers: {
      Location: dest.toString(),
      "Set-Cookie": sessionCookieHeader("pending"),
    },
  });
}
