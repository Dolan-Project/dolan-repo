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
  handleGetTripRequest,
  handleLeaveTripRequest,
  handleListMyTripsRequest,
  handlePublishTripRequest,
  handleTransitionTripRequest,
  handleUpdateTripRequest,
} from "@/lib/auth/handle-trip";
import {
  proxyCreateTrip,
  proxyGetTrip,
  proxyLeaveTrip,
  proxyListMyTrips,
  proxyPublishTrip,
  proxyTransitionTrip,
  proxyUpdateTrip,
} from "@/lib/auth/handle-trip-live";
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

async function withMockOrExpress(
  request: Request,
  mock: (request: Request) => Promise<Response> | Response,
  live: (request: Request) => Promise<Response>,
): Promise<Response> {
  if (useMockApi()) return mock(request);
  return live(request);
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
