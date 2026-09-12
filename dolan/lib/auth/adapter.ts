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
import { useMockApi } from "@/lib/auth/use-mock";
import { createApiError } from "@/mocks/scenarios";

export async function withMockOrUnavailable(
  request: Request,
  handle: (request: Request) => Promise<Response> | Response,
): Promise<Response> {
  if (!useMockApi()) {
    return jsonResult(
      createApiError(
        "PROVIDER_UNAVAILABLE",
        "Layanan auth tidak tersedia",
      ),
      statusForCode("PROVIDER_UNAVAILABLE"),
    );
  }
  return handle(request);
}

export const authRouteHandlers = {
  register: (request: Request) =>
    withMockOrUnavailable(request, handleRegisterRequest),
  login: (request: Request) =>
    withMockOrUnavailable(request, handleLoginRequest),
  logout: (request: Request) =>
    withMockOrUnavailable(request, handleLogoutRequest),
  forgotPassword: (request: Request) =>
    withMockOrUnavailable(request, handleForgotPasswordRequest),
  resetPassword: (request: Request) =>
    withMockOrUnavailable(request, handleResetPasswordRequest),
  callback: (request: Request) => {
    if (!useMockApi()) {
      return jsonResult(
        createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia"),
        503,
      );
    }
    return handleCallbackRequest(request);
  },
};

export const profileRouteHandlers = {
  me: {
    GET: (request: Request) => withMockOrUnavailable(request, handleGetMeRequest),
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
