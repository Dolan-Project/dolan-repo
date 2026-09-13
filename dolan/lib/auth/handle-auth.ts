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
import { jsonResult, statusForCode, validationError } from "./api-response";
import { resolveAfterAuth } from "./post-auth-path";
import { readSessionId, sessionCookieHeader } from "./session-cookie";

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
  const mock = mockForgotPassword("success");
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleResetPasswordRequest(
  request: Request,
): Promise<Response> {
  const parsed = resetPasswordSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const mock = mockResetPassword(
    parsed.data.token === "expired" ? "unauthorized" : "success",
  );
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export function handleCallbackRequest(request: Request): Response {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? url.searchParams.get("code");
  const next = url.searchParams.get("next");
  if (!token || token === "expired") {
    const dest = new URL("/cek-email", url.origin);
    dest.searchParams.set("error", "invalid");
    return Response.redirect(dest, 302);
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
