import type { PublicUser } from "./kickoff.js";

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

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export function isProfileComplete(user: PublicUser): boolean {
  return Boolean(user.username && user.displayName && user.domicile);
}
