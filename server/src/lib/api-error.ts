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

export function forbidden(code = AuthErrorCode.FORBIDDEN, message = "You cannot perform this action") {
  return new HttpError(403, code, message);
}
