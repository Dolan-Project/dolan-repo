import {
  handleCallbackRequest,
  handleForgotPasswordRequest,
  handleLoginRequest,
  handleLogoutRequest,
  handleRegisterRequest,
  handleResetPasswordRequest,
} from "@/lib/auth/handle-auth";
import {
  handleGetMeRequest,
  handleGetPublicProfileRequest,
  handlePatchMeRequest,
  handleUploadRequest,
} from "@/lib/auth/handle-profile";
import { jsonResult, statusForCode } from "@/lib/auth/api-response";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { useMockApi } from "@/lib/auth/use-mock";
import { createApiError } from "@/mocks/scenarios";

export async function withMockOrUnavailable(
  request: Request,
  handle: (request: Request) => Promise<Response> | Response,
  expressPath?: string,
): Promise<Response> {
  if (useMockApi()) {
    return handle(request);
  }
  if (expressPath) {
    return proxyToExpress(request, expressPath);
  }
  return jsonResult(
    createApiError(
      "PROVIDER_UNAVAILABLE",
      "Layanan auth tidak tersedia",
    ),
    statusForCode("PROVIDER_UNAVAILABLE"),
  );
}

export const authRouteHandlers = {
  register: (request: Request) => handleRegisterRequest(request),
  login: (request: Request) => handleLoginRequest(request),
  logout: (request: Request) => handleLogoutRequest(request),
  forgotPassword: (request: Request) => handleForgotPasswordRequest(request),
  resetPassword: (request: Request) => handleResetPasswordRequest(request),
  callback: (request: Request) => handleCallbackRequest(request),
};

export const profileRouteHandlers = {
  me: {
    GET: (request: Request) =>
      withMockOrUnavailable(request, handleGetMeRequest, "/api/v1/users/me"),
    PATCH: (request: Request) =>
      withMockOrUnavailable(request, handlePatchMeRequest),
  },
  avatar: (request: Request) =>
    withMockOrUnavailable(request, (req) => handleUploadRequest(req, "avatar")),
  cover: (request: Request) =>
    withMockOrUnavailable(request, (req) => handleUploadRequest(req, "cover")),
  byUsername: (request: Request, username: string) =>
    withMockOrUnavailable(request, () => handleGetPublicProfileRequest(username)),
};
