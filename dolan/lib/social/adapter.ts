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
      withMockOrUnavailable(request, (req) => handleGetTripRequest(req, tripId)),
  },
  comments: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListCommentsRequest(req, tripId)),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleCreateCommentRequest(req, tripId)),
  },
  joinRequests: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListJoinRequestsRequest(req, tripId)),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleRequestJoinRequest(req, tripId)),
  },
  review: (request: Request, requestId: string) =>
    withMockOrUnavailable(request, (req) => handleReviewJoinRequest(req, requestId)),
  withdraw: (request: Request, requestId: string) =>
    withMockOrUnavailable(request, (req) => handleWithdrawJoinRequest(req, requestId)),
  messages: {
    GET: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleListMessagesRequest(req, tripId)),
    POST: (request: Request, tripId: string) =>
      withMockOrUnavailable(request, (req) => handleSendMessageRequest(req, tripId)),
  },
  notifications: {
    GET: (request: Request) =>
      withMockOrUnavailable(request, handleListNotificationsRequest),
    markRead: (request: Request, id: string) =>
      withMockOrUnavailable(request, (req) => handleMarkNotificationReadRequest(req, id)),
  },
};
