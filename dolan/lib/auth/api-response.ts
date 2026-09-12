import {
  AUTH_ERROR_CODES,
  fieldErrorsFromZod,
  type ApiError,
  type ApiSuccess,
} from "@/lib/contracts";
import { sessionCookieHeader } from "./session-cookie";

export function jsonResult(
  payload: ApiSuccess<unknown> | ApiError,
  status: number,
  sessionId?: string | null,
): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (sessionId !== undefined) {
    headers.append("set-cookie", sessionCookieHeader(sessionId));
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function validationError(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
  issues: { path: (string | number)[]; message: string }[];
}): Response {
  return jsonResult(
    {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.VALIDATION_ERROR,
        message: "Periksa kembali isian form",
        fields: fieldErrorsFromZod(error as never),
        requestId: "req_mock",
      },
    },
    400,
  );
}

export function statusForCode(code: string): number {
  switch (code) {
    case AUTH_ERROR_CODES.EMAIL_TAKEN:
    case "USERNAME_TAKEN":
      return 409;
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
    case AUTH_ERROR_CODES.UNAUTHORIZED:
      return 401;
    case AUTH_ERROR_CODES.RATE_LIMITED:
      return 429;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "NOT_FOUND":
      return 404;
    default:
      return 400;
  }
}
