export type {
  ApiSuccess,
  ApiError,
  PublicUser,
  TripVisibility,
  TripStatus,
  JoinRequestStatus,
} from "./types/kickoff";

export {
  LOGIN_PAGE_PATH,
  DEFAULT_POST_AUTH_PATH,
  DEFAULT_POST_LOGOUT_PATH,
  SAFE_DRAFT_STORAGE_KEY,
  isAllowedNextPath,
  resolvePostAuthPath,
} from "./api/return-to-action";

export type { AuthSession, AuthErrorCode } from "./types/auth";
export { AUTH_ERROR_CODES, isProfileComplete } from "./types/auth";
export { AUTH_PATHS } from "./api/auth-paths";

export type { ProfileUpdate } from "./types/profile";
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas/auth";
export type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./schemas/auth";
export { profileUpdateSchema } from "./schemas/profile";
export type { ProfileUpdateInput } from "./schemas/profile";
export {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_TYPES,
  validateUploadMeta,
} from "./schemas/upload";
export type { UploadMeta, UploadValidation } from "./schemas/upload";
export { fieldErrorsFromZod } from "./schemas/zod-fields";
export type { TripSummary, MyTripRole } from "./types/trip";
export type { JoinRequest, JoinReviewDecision } from "./types/join";
export type { TripComment, ChatMessage } from "./types/chat";
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
} from "./api/express-paths";
