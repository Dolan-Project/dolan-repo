import { withMockOrUnavailable } from "@/lib/auth/adapter";
import {
  handleAttemptJoinRequest,
  handleBlockRequest,
  handleConfirmAttendanceRequest,
  handleGetAttendanceRequest,
  handleCreateReportRequest,
  handleCreateReviewRequest,
  handleFollowRequest,
  handleGetFollowersRequest,
  handleGetFollowingRequest,
  handleGetHistoryRequest,
  handleGetReviewsRequest,
  handleListOfflineItinerariesRequest,
  handleListReportsRequest,
  handleModerateReportRequest,
  handleSaveOfflineItineraryRequest,
  handleUnblockRequest,
  handleUnfollowRequest,
} from "@/lib/community/handle-community";

export const communityRouteHandlers = {
  follow: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleFollowRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/follow`,
    ),
  unfollow: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleUnfollowRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/follow`,
    ),
  followers: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleGetFollowersRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/followers`,
    ),
  following: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleGetFollowingRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/following`,
    ),
  block: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleBlockRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/block`,
    ),
  unblock: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleUnblockRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/block`,
    ),
  reviews: {
    GET: (request: Request, username: string) =>
      withMockOrUnavailable(
        request,
        (req) => handleGetReviewsRequest(req, username),
        `/api/v1/users/${encodeURIComponent(username)}/reviews`,
      ),
    POST: (request: Request, username: string) =>
      withMockOrUnavailable(
        request,
        (req) => handleCreateReviewRequest(req, username),
        `/api/v1/users/${encodeURIComponent(username)}/reviews`,
      ),
  },
  history: (request: Request, username: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleGetHistoryRequest(req, username),
      `/api/v1/users/${encodeURIComponent(username)}/history`,
    ),
  attendance: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(
        request,
        (req) => handleGetAttendanceRequest(req, tripId),
        `/api/v1/trips/${encodeURIComponent(tripId)}/attendance`,
      ),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(
        request,
        (req) => handleConfirmAttendanceRequest(req, tripId),
        `/api/v1/trips/${encodeURIComponent(tripId)}/attendance`,
      ),
  },
  join: (request: Request, tripId: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleAttemptJoinRequest(req, tripId),
      `/api/v1/trips/${encodeURIComponent(tripId)}/join-requests`,
    ),
  reports: (request: Request) =>
    withMockOrUnavailable(request, handleCreateReportRequest, "/api/v1/reports"),
  adminReports: (request: Request) =>
    withMockOrUnavailable(request, handleListReportsRequest, "/api/v1/admin/reports"),
  moderate: (request: Request, reportId: string) =>
    withMockOrUnavailable(
      request,
      (req) => handleModerateReportRequest(req, reportId),
      `/api/v1/admin/reports/${encodeURIComponent(reportId)}/moderate`,
    ),
  offline: {
    GET: (request: Request) =>
      withMockOrUnavailable(request, handleListOfflineItinerariesRequest),
    POST: (request: Request) =>
      withMockOrUnavailable(request, handleSaveOfflineItineraryRequest),
  },
};
