import type {
  AuthIdentity,
  CreateCommentBody,
  CreateTripBody,
  JoinRequest,
  JoinRequestStatus,
  MembershipStatus,
  MyTripSummary,
  PlaceSummary,
  PublicUser,
  PublishTripBody,
  TripComment,
  TripDetail,
  TripMemberRole,
  TripStatus,
  TripVisibility,
  UpdateTripBody,
} from "@dolan/shared";

export type StoredTrip = {
  id: string;
  hostUserId: string;
  title: string;
  description: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  privateOriginLabel: string | null;
  privateOriginLatitude: number | null;
  privateOriginLongitude: number | null;
  destinationCity: string | null;
  publicMeetingPointLabel: string | null;
  publicMeetingPointLatitude: number | null;
  publicMeetingPointLongitude: number | null;
  transportMode: string | null;
  budgetAmount: string | null;
  budgetBasis: "PER_PERSON" | "GROUP";
  currency: string;
  planningPartySize: number;
  maxParticipants: number | null;
  currentItineraryVersionId: string | null;
  preferences: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredMember = {
  id: string;
  tripId: string;
  userId: string;
  role: TripMemberRole;
  membershipStatus: MembershipStatus;
  joinedAt: string;
  leftAt: string | null;
};

export type StoredJoin = {
  id: string;
  tripId: string;
  userId: string;
  message: string | null;
  status: JoinRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type StoredComment = {
  id: string;
  tripId: string;
  userId: string;
  parentCommentId: string | null;
  body: string;
  deletedAt: string | null;
  createdAt: string;
};

export type StoredIdempotency = {
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
};

export type TripAccess = {
  trip: StoredTrip;
  memberRole: TripMemberRole | null;
  membershipStatus: MembershipStatus | null;
  joinRequestStatus: JoinRequestStatus | null;
};

export type PageResult<T> = { items: T[]; total: number };

export interface TripStore {
  getUser(userId: string): Promise<AuthIdentity | null>;
  upsertUser(user: AuthIdentity): Promise<void>;
  getTrip(tripId: string): Promise<StoredTrip | null>;
  createTrip(input: Omit<StoredTrip, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<StoredTrip>;
  updateTrip(tripId: string, patch: Partial<StoredTrip>): Promise<StoredTrip>;
  deleteTrip(tripId: string): Promise<void>;
  listHosted(userId: string, page: number, limit: number): Promise<PageResult<StoredTrip>>;
  listJoined(userId: string, page: number, limit: number): Promise<PageResult<StoredTrip>>;
  listPending(userId: string, page: number, limit: number): Promise<PageResult<StoredTrip>>;
  getCoverPlace(tripId: string): Promise<PlaceSummary | null>;
  listMembers(tripId: string): Promise<StoredMember[]>;
  ensureHostMembership(tripId: string, userId: string): Promise<void>;
  addParticipant(tripId: string, userId: string): Promise<StoredMember>;
  leaveMembership(tripId: string, userId: string): Promise<StoredMember | null>;
  getJoinRequest(id: string): Promise<StoredJoin | null>;
  getJoinByTripUser(tripId: string, userId: string): Promise<StoredJoin | null>;
  listJoins(tripId: string): Promise<StoredJoin[]>;
  createJoin(input: Omit<StoredJoin, "id" | "createdAt"> & { id?: string }): Promise<StoredJoin>;
  updateJoin(id: string, patch: Partial<StoredJoin>): Promise<StoredJoin>;
  listComments(tripId: string, page: number, limit: number): Promise<PageResult<StoredComment>>;
  getComment(id: string): Promise<StoredComment | null>;
  createComment(input: Omit<StoredComment, "id" | "createdAt"> & { id?: string }): Promise<StoredComment>;
  updateComment(id: string, body: string): Promise<StoredComment>;
  softDeleteComment(id: string): Promise<void>;
  ensureChatRoom(tripId: string): Promise<void>;
  setChatReadOnly(tripId: string, at: Date): Promise<void>;
  isBlocked(userA: string, userB: string): Promise<boolean>;
  addBlock(blockerUserId: string, blockedUserId: string): Promise<void>;
  revokeTripLocation(userId: string, tripId: string): Promise<void>;
  createNotification(input: {
    recipientUserId: string;
    actorUserId: string;
    type: string;
    targetType: string;
    targetId: string;
    data?: Record<string, unknown>;
  }): Promise<void>;
  findIdempotency(actorUserId: string, operation: string, key: string): Promise<StoredIdempotency | null>;
  saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    expiresAt: Date,
  ): Promise<void>;
  withTripLock<T>(tripId: string, fn: (trip: StoredTrip) => Promise<T>): Promise<T>;
}

export type CreateDraftInput = CreateTripBody;
export type UpdateDraftInput = UpdateTripBody;
export type PublishInput = PublishTripBody;
export type CommentInput = CreateCommentBody;

export type AssembledTrip = {
  detail: TripDetail;
  summary: MyTripSummary;
  comments?: TripComment[];
  joins?: JoinRequest[];
};

export type { PublicUser };
