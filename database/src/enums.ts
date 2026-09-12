/** Database-level enum values aligned with DOLAN_TECHNICAL_KICKOFF_FINAL.md §7 */

export const USER_ROLES = ["USER", "ADMIN"] as const;
export const USER_STATUSES = ["ACTIVE", "RESTRICTED", "SUSPENDED"] as const;
export const PLACE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const TRIP_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const;
export const TRIP_STATUSES = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;
export const TRIP_MEMBER_ROLES = ["HOST", "PARTICIPANT"] as const;
export const MEMBERSHIP_STATUSES = ["ACTIVE", "LEFT", "REMOVED"] as const;
export const JOIN_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export const ATTENDANCE_STATUSES = [
  "UNCONFIRMED",
  "PRESENT",
  "ABSENT",
  "DISPUTED",
] as const;
export const GENERATION_JOB_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
] as const;
export const ITINERARY_SOURCES = ["MANUAL", "AI", "TEMPLATE", "REGENERATED"] as const;
export const TEMPLATE_SOURCES = ["CURATED", "USER_TRIP"] as const;
export const TEMPLATE_PUBLICATION_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export const MODERATION_STATUSES = ["VISIBLE", "HIDDEN", "UNDER_REVIEW"] as const;
export const LOCATION_SCOPES = ["TRIP_PRECISE", "PUBLIC_APPROXIMATE"] as const;
export const BUDGET_BASES = ["PER_PERSON", "GROUP"] as const;
export const REPORT_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;
