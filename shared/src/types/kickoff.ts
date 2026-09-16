export type ApiSuccess<T> = { success: true; data: T };

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  domicile: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  followersCount: number;
  followingCount: number;
  hostTripCount: number;
  participantTripCount: number;
  rating: {
    overall: number | null;
    communication: number | null;
    attitude: number | null;
    reviewCount: number;
  };
};

export type TripVisibility = "PRIVATE" | "PUBLIC";
export type TripStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";
export type JoinRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";
