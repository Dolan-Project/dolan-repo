import { AuthErrorCode, type ApiErrorBody } from "@dolan/shared";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function toApiError(error: HttpError, requestId: string): ApiErrorBody {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      fields: error.fields,
      requestId,
    },
  };
}

export function unauthorized(code = AuthErrorCode.UNAUTHENTICATED, message = "Authentication required") {
  return new HttpError(401, code, message);
}

export function forbidden(code: string = AuthErrorCode.FORBIDDEN, message = "You cannot perform this action") {
  return new HttpError(403, code, message);
}

export function badRequest(code: string, message: string, fields?: Record<string, string>) {
  return new HttpError(400, code, message, fields);
}

export function notFound(code: string, message: string) {
  return new HttpError(404, code, message);
}

export function conflict(code: string, message: string, fields?: Record<string, string>) {
  return new HttpError(409, code, message, fields);
}

export function tooManyRequests(code: string, message: string) {
  return new HttpError(429, code, message);
}

export function providerUnavailable(code: string, message: string, status = 502) {
  return new HttpError(status, code, message);
}
