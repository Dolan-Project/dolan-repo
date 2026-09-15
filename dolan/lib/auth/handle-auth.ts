import {
  forgotPasswordSchema,
  isProfileComplete,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
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
import { extractAccessToken, proxyToExpress } from "./express-proxy";
import { resolveAfterAuth } from "./post-auth-path";
import { readSessionId, sessionCookieHeader } from "./session-cookie";
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
    emailVerified: true,
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

async function fetchExpressSession(accessToken: string): Promise<AuthSession | null> {
  const origin = process.env.EXPRESS_ORIGIN?.trim();
  if (!origin) return null;
  try {
    const response = await fetch(`${origin.replace(/\/$/, "")}/api/v1/users/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      success?: boolean;
      data?: AuthSession;
    };
    if (!json.success || !json.data?.user) return null;
    return {
      user: json.data.user,
      emailVerified: Boolean(json.data.emailVerified),
      profileComplete: Boolean(json.data.profileComplete),
    };
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

type LocalAuthPayload = {
  success: true;
  data: {
    session?: AuthSession;
    accessToken?: string;
    message?: string;
    debugResetToken?: string;
    debugVerifyToken?: string;
    reset?: boolean;
    loggedOut?: boolean;
    verified?: boolean;
    alreadyVerified?: boolean;
  };
};

async function parseAuthPayload(response: Response): Promise<LocalAuthPayload | null> {
  try {
    const json = (await response.json()) as LocalAuthPayload & { success?: boolean };
    if (!json || json.success === false || !json.data) return null;
    return json;
  } catch {
    return null;
  }
}

async function proxyAuthJson(
  request: Request,
  path: string,
  body: unknown,
): Promise<Response> {
  const upstream = await proxyToExpress(request, path, { method: "POST", json: body });
  if (!upstream.ok) {
    const text = await upstream.text();
    try {
      const parsed = JSON.parse(text) as { success: false; error?: { code?: string; message?: string } };
      return jsonResult(
        createApiError(
          parsed.error?.code ?? "VALIDATION_ERROR",
          parsed.error?.message ?? "Permintaan auth gagal",
        ),
        upstream.status,
      );
    } catch {
      return jsonResult(
        createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia"),
        statusForCode("PROVIDER_UNAVAILABLE"),
      );
    }
  }
  return upstream;
}

export async function handleRegisterRequest(request: Request): Promise<Response> {
  const parsed = registerSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);

  if (!shouldUseMockApi()) {
    const upstream = await proxyAuthJson(request, "/api/v1/auth/register", parsed.data);
    if (!upstream.ok) return upstream;
    const json = await parseAuthPayload(upstream);
    if (!json) {
      return jsonResult(
        createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia"),
        statusForCode("PROVIDER_UNAVAILABLE"),
      );
    }
    const token = json.data.accessToken;
    const session = json.data.session ?? registerSession();
    return jsonResult(
      {
        success: true,
        data: {
          ...session,
          ...(json.data.debugVerifyToken ? { debugVerifyToken: json.data.debugVerifyToken } : {}),
        },
      },
      200,
      token ?? undefined,
    );
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
    const upstream = await proxyAuthJson(request, "/api/v1/auth/login", parsed.data);
    if (!upstream.ok) return upstream;
    const json = await parseAuthPayload(upstream);
    if (!json) {
      return jsonResult(
        createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia"),
        statusForCode("PROVIDER_UNAVAILABLE"),
      );
    }
    const token = json.data.accessToken;
    const session = json.data.session ?? loginSession();
    return jsonResult({ success: true, data: session }, 200, token ?? undefined);
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
    await proxyToExpress(request, "/api/v1/auth/logout", { method: "POST", json: {} });
    await proxyToExpress(request, "/api/v1/auth/disconnect-sockets", { method: "POST", json: {} });
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
    const upstream = await proxyAuthJson(request, "/api/v1/auth/forgot-password", parsed.data);
    if (!upstream.ok) return upstream;
    const json = (await upstream.json()) as LocalAuthPayload;
    return jsonResult({ success: true, data: json.data }, 200);
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
    const upstream = await proxyAuthJson(request, "/api/v1/auth/reset-password", parsed.data);
    if (!upstream.ok) return upstream;
    return jsonResult({ success: true, data: { reset: true } }, 200);
  }
  const mock = mockResetPassword(
    parsed.data.token === "expired" ? "unauthorized" : "success",
  );
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleVerifyEmailRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  const next = url.searchParams.get("next");
  const body =
    request.method === "GET"
      ? { token: tokenFromQuery ?? "" }
      : await readBody(request);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    if (request.method === "GET") {
      const dest = new URL("/cek-email", url.origin);
      dest.searchParams.set("error", "invalid");
      return Response.redirect(dest, 302);
    }
    return validationError(parsed.error);
  }

  if (!shouldUseMockApi()) {
    const upstream = await proxyAuthJson(request, "/api/v1/auth/verify-email", parsed.data);
    if (!upstream.ok) {
      if (request.method === "GET") {
        const dest = new URL("/cek-email", url.origin);
        dest.searchParams.set("error", "invalid");
        return Response.redirect(dest, 302);
      }
      return upstream;
    }
    const json = (await upstream.json()) as LocalAuthPayload & {
      data: { session?: AuthSession; verified?: boolean };
    };
    const session = json.data.session ?? {
      ...registerSession(),
      emailVerified: true,
    };
    if (request.method === "GET") {
      const dest = new URL(resolveAfterAuth(session, next), url.origin);
      const headers = new Headers({ Location: dest.toString() });
      const cookie = extractAccessToken(request);
      if (cookie) headers.set("Set-Cookie", sessionCookieHeader(cookie));
      return new Response(null, { status: 302, headers });
    }
    return jsonResult({ success: true, data: session }, 200);
  }

  if (parsed.data.token === "expired") {
    if (request.method === "GET") {
      const dest = new URL("/cek-email", url.origin);
      dest.searchParams.set("error", "invalid");
      return Response.redirect(dest, 302);
    }
    return jsonResult(
      createApiError("INVALID_TOKEN", "Tautan verifikasi tidak valid"),
      statusForCode("UNAUTHORIZED"),
    );
  }

  const session: AuthSession = {
    user: incompleteUser(),
    emailVerified: true,
    profileComplete: false,
  };
  if (request.method === "GET") {
    const dest = new URL(resolveAfterAuth(session, next), url.origin);
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        "Set-Cookie": sessionCookieHeader("pending"),
      },
    });
  }
  return jsonResult({ success: true, data: session }, 200, "pending");
}

export async function handleResendVerificationRequest(request: Request): Promise<Response> {
  const body = (await readBody(request)) as { next?: string };
  if (!shouldUseMockApi()) {
    const upstream = await proxyAuthJson(request, "/api/v1/auth/resend-verification", body ?? {});
    if (!upstream.ok) return upstream;
    const json = (await upstream.json()) as LocalAuthPayload & {
      data: { message?: string; alreadyVerified?: boolean; debugVerifyToken?: string };
    };
    return jsonResult({ success: true, data: json.data }, 200);
  }
  return jsonResult({
    success: true,
    data: { message: "Tautan verifikasi telah dikirim ulang." },
  }, 200);
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
    const accessToken = token;
    const session = (await fetchExpressSession(accessToken)) ?? {
      user: incompleteUser(),
      emailVerified: true,
      profileComplete: false,
    };
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

