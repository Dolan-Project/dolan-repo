import { AuthErrorCode, type AuthCapability, type AuthzDecision, type SessionActor } from "@dolan/shared";

export function isProfileComplete(user: {
  username: string | null;
  displayName: string | null;
  domicile: string | null;
}): boolean {
  return Boolean(user.username?.trim() && user.displayName?.trim() && user.domicile?.trim());
}

export function isEmailVerified(user: { emailVerifiedAt: string | null }): boolean {
  return Boolean(user.emailVerifiedAt);
}

export function authorize(actor: SessionActor, capability: AuthCapability): AuthzDecision {
  if (capability === "read_public") {
    return { allowed: true };
  }

  if (actor.kind === "guest") {
    return {
      allowed: false,
      status: 401,
      code: AuthErrorCode.UNAUTHENTICATED,
      message: "Authentication required",
    };
  }

  const { user, trip } = actor;

  if (user.status === "SUSPENDED") {
    return deny(403, AuthErrorCode.ACCOUNT_SUSPENDED, "Account is suspended");
  }

  if (user.status === "RESTRICTED" && capability !== "upload_own_profile_asset") {
    return deny(403, AuthErrorCode.ACCOUNT_RESTRICTED, "Account is restricted");
  }

  if (
    capability === "create_draft" ||
    capability === "upload_own_profile_asset"
  ) {
    return { allowed: true };
  }

  if (capability === "admin_moderate") {
    return user.role === "ADMIN"
      ? { allowed: true }
      : deny(403, AuthErrorCode.FORBIDDEN, "Admin access required");
  }

  const verified = isEmailVerified(user);
  const complete = isProfileComplete(user);

  if (
    (capability === "publish_trip" ||
      capability === "join_trip" ||
      capability === "comment" ||
      capability === "follow") &&
    !verified
  ) {
    return deny(403, AuthErrorCode.EMAIL_UNVERIFIED, "Verified email is required");
  }

  if ((capability === "publish_trip" || capability === "join_trip") && !complete) {
    return deny(403, AuthErrorCode.PROFILE_INCOMPLETE, "Complete profile is required");
  }

  if (capability === "comment" || capability === "follow") {
    return { allowed: true };
  }

  if (capability === "publish_trip") {
    return { allowed: true };
  }

  if (capability === "approve_join") {
    return trip?.memberRole === "HOST"
      ? { allowed: true }
      : deny(403, AuthErrorCode.NOT_HOST, "Only the host can manage participants");
  }

  if (capability === "join_trip") {
    if (trip?.memberRole === "HOST") {
      return deny(403, AuthErrorCode.FORBIDDEN, "Host cannot join their own trip");
    }
    return { allowed: true };
  }

  const isActiveMember =
    Boolean(trip?.memberRole) && trip?.membershipStatus === "ACTIVE";

  if (capability === "read_chat" || capability === "send_message") {
    if (trip?.joinRequestStatus === "PENDING") {
      return deny(403, AuthErrorCode.PENDING_MEMBER, "Pending members cannot access chat");
    }
    if (!isActiveMember) {
      return deny(403, AuthErrorCode.NOT_MEMBER, "Active membership is required");
    }
    return { allowed: true };
  }

  if (capability === "edit_itinerary") {
    if (trip?.memberRole !== "HOST" || trip.membershipStatus !== "ACTIVE") {
      return deny(403, AuthErrorCode.NOT_HOST, "Only the host can perform this action");
    }
    return { allowed: true };
  }

  return deny(403, AuthErrorCode.FORBIDDEN, "You cannot perform this action");
}

function deny(status: 401 | 403, code: string, message: string): AuthzDecision {
  return { allowed: false, status, code, message };
}
