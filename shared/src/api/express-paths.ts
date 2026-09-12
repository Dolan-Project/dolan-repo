export const API_V1_PREFIX = "/api/v1";

export const EXPRESS_PATHS = {
  usersMe: "/users/me",
  usersMeAvatar: "/users/me/avatar",
  usersMeCover: "/users/me/cover",
  trips: "/trips",
  tripsMe: "/trips/me",
} as const;

export function userByUsernamePath(username: string): string {
  return `/users/${username}`;
}

export function tripPath(tripId: string): string {
  return `/trips/${tripId}`;
}

export function tripPublishPath(tripId: string): string {
  return `/trips/${tripId}/publish`;
}

export function tripJoinRequestsPath(tripId: string): string {
  return `/trips/${tripId}/join-requests`;
}

export function joinRequestReviewPath(requestId: string): string {
  return `/join-requests/${requestId}/review`;
}

export function joinRequestWithdrawPath(requestId: string): string {
  return `/join-requests/${requestId}/withdraw`;
}

export function tripCommentsPath(tripId: string): string {
  return `/trips/${tripId}/comments`;
}

export function tripMessagesPath(tripId: string): string {
  return `/trips/${tripId}/messages`;
};
