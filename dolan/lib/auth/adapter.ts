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
import {
  handleCreateTripRequest,
  handleDeleteTripRequest,
  handleGetTripRequest,
  handleLeaveTripRequest,
  handleListMyTripsRequest,
  handlePublishTripRequest,
  handleTransitionTripRequest,
  handleUpdateTripRequest,
} from "@/lib/auth/handle-trip";
import {
  proxyCreateTrip,
  proxyDeleteTrip,
  proxyGetTrip,
  proxyLeaveTrip,
  proxyListMyTrips,
  proxyPublishTrip,
  proxyTransitionTrip,
  proxyUpdateTrip,
} from "@/lib/auth/handle-trip-live";
import { jsonResult, statusForCode } from "@/lib/auth/api-response";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { createApiError } from "@/mocks/scenarios";

export async function withMockOrUnavailable(
  request: Request,
  handle: (request: Request) => Promise<Response> | Response,
  expressPath?: string,
): Promise<Response> {
  if (shouldUseMockApi()) {
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

async function withMockOrExpress(
  request: Request,
  mock: (request: Request) => Promise<Response> | Response,
  live: (request: Request) => Promise<Response>,
): Promise<Response> {
  if (shouldUseMockApi()) return mock(request);
  return live(request);
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
      withMockOrUnavailable(request, handlePatchMeRequest, "/api/v1/users/me"),
  },
  avatar: (request: Request) =>
    withMockOrUnavailable(request, (req) => handleUploadRequest(req, "avatar")),
  cover: (request: Request) =>
    withMockOrUnavailable(request, (req) => handleUploadRequest(req, "cover")),
  byUsername: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      () => handleGetPublicProfileRequest(username),
      `/api/v1/users/${encodeURIComponent(username)}`,
    ),
};

export const tripRouteHandlers = {
  create: (request: Request) =>
    withMockOrExpress(request, handleCreateTripRequest, proxyCreateTrip),
  listMine: (request: Request) =>
    withMockOrExpress(request, handleListMyTripsRequest, proxyListMyTrips),
  get: (request: Request, tripId: string) =>
    withMockOrExpress(
      request,
      (req) => handleGetTripRequest(req, tripId),
      (req) => proxyGetTrip(req, tripId),
    ),
  update: (request: Request, tripId: string) =>
    withMockOrExpress(
      request,
      (req) => handleUpdateTripRequest(req, tripId),
      (req) => proxyUpdateTrip(req, tripId),
    ),
  delete: (request: Request, tripId: string) =>
    withMockOrExpress(request, handleDeleteTripRequest, (req) => proxyDeleteTrip(req, tripId)),
  publish: (request: Request, tripId: string) =>
    withMockOrExpress(
      request,
      (req) => handlePublishTripRequest(req, tripId),
      (req) => proxyPublishTrip(req, tripId),
    ),
  leave: (request: Request, tripId: string) =>
    withMockOrExpress(
      request,
      (req) => handleLeaveTripRequest(req, tripId),
      (req) => proxyLeaveTrip(req, tripId),
    ),
  transition: (request: Request, tripId: string) =>
    withMockOrExpress(
      request,
      (req) => handleTransitionTripRequest(req, tripId),
      (req) => proxyTransitionTrip(req, tripId),
    ),
};
