import { withMockOrUnavailable } from "@/lib/auth/adapter";
import {
  handleCreateCommentRequest,
  handleGetTripRequest,
  handleListCommentsRequest,
  handleListJoinRequestsRequest,
  handleListMessagesRequest,
  handleListNotificationsRequest,
  handleMarkNotificationReadRequest,
  handleRequestJoinRequest,
  handleReviewJoinRequest,
  handleSendMessageRequest,
  handleWithdrawJoinRequest,
} from "@/lib/social/handle-social";

export const socialRouteHandlers = {
  trip: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleGetTripRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}`),
  },
  comments: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListCommentsRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/comments`),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleCreateCommentRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/comments`),
  },
  joinRequests: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListJoinRequestsRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/join-requests`),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleRequestJoinRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/join-requests`),
  },
  review: (request: Request, requestId: string) =>
    withMockOrUnavailable(request, (req) => handleReviewJoinRequest(req, requestId), `/api/v1/join-requests/${encodeURIComponent(requestId)}/review`),
  withdraw: (request: Request, requestId: string) =>
    withMockOrUnavailable(request, (req) => handleWithdrawJoinRequest(req, requestId), `/api/v1/join-requests/${encodeURIComponent(requestId)}/withdraw`),
  messages: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListMessagesRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/messages`),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleSendMessageRequest(req, tripId), `/api/v1/trips/${encodeURIComponent(tripId)}/messages`),
  },
  notifications: {
    GET: (request: Request) =>
      withMockOrUnavailable(request, handleListNotificationsRequest, "/api/v1/notifications"),
    markRead: (request: Request, id: string) =>
      withMockOrUnavailable(request, (req) => handleMarkNotificationReadRequest(req, id), `/api/v1/notifications/${encodeURIComponent(id)}/read`),
  },
};
