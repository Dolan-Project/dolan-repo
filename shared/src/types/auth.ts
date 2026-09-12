import type { PublicUser } from "./kickoff.js";
import type {
  JoinRequestStatus,
  MembershipStatus,
  TripMemberRole,
  UserRole,
  UserStatus,
} from "./enums.ts";

export type AuthSession = {
  user: PublicUser;
  emailVerified: boolean;
  profileComplete: boolean;
};

export const AUTH_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export function isProfileComplete(user: PublicUser): boolean {
  return Boolean(user.username && user.displayName && user.domicile);
}

export type AuthIdentity = {
  id: string;
  authReference: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  username: string | null;
  displayName: string | null;
  domicile: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
};

export type TripAccessContext = {
  tripId: string;
  memberRole: TripMemberRole | null;
  membershipStatus: MembershipStatus | null;
  joinRequestStatus: JoinRequestStatus | null;
};

export type SessionActor =
  | { kind: "guest" }
  | { kind: "user"; user: AuthIdentity; trip?: TripAccessContext };

export type AuthCapability =
  | "read_public"
  | "create_draft"
  | "publish_trip"
  | "join_trip"
  | "comment"
  | "follow"
  | "read_chat"
  | "send_message"
  | "approve_join"
  | "edit_itinerary"
  | "upload_own_profile_asset"
  | "admin_moderate";

export type AuthzDecision =
  | { allowed: true }
  | { allowed: false; code: string; message: string; status: 401 | 403 };
