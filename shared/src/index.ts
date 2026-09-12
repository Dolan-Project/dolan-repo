export type {
  ApiSuccess,
  ApiError,
  PublicUser,
  TripVisibility,
  TripStatus,
  JoinRequestStatus,
} from "./types/kickoff.js";

export {
  LOGIN_PAGE_PATH,
  DEFAULT_POST_AUTH_PATH,
  DEFAULT_POST_LOGOUT_PATH,
  SAFE_DRAFT_STORAGE_KEY,
  isAllowedNextPath,
  resolvePostAuthPath,
} from "./api/return-to-action.js";

export type { AuthSession, AuthErrorCode } from "./types/auth.js";
export { AUTH_ERROR_CODES, isProfileComplete } from "./types/auth.js";
export { AUTH_PATHS } from "./api/auth-paths.js";

export type { ProfileUpdate } from "./types/profile.js";
export type { TripSummary, MyTripRole } from "./types/trip.js";
export type { JoinRequest, JoinReviewDecision } from "./types/join.js";
export type { TripComment, ChatMessage } from "./types/chat.js";
export {
  API_V1_PREFIX,
  EXPRESS_PATHS,
  userByUsernamePath,
  tripPath,
  tripPublishPath,
  tripJoinRequestsPath,
  joinRequestReviewPath,
  joinRequestWithdrawPath,
  tripCommentsPath,
  tripMessagesPath,
} from "./api/express-paths.js";

