import type { AuthIdentity, PublicUser } from "@dolan/shared";

export function toPublicUser(user: AuthIdentity): PublicUser {
  return {
    id: user.id,
    username: user.username ?? "user",
    displayName: user.displayName ?? "Traveler",
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    bio: user.bio,
    domicile: user.domicile,
    followersCount: 0,
    followingCount: 0,
    hostTripCount: 0,
    participantTripCount: 0,
    rating: {
      overall: null,
      communication: null,
      attitude: null,
      reviewCount: 0,
    },
  };
}

export function placeholderUser(userId: string): PublicUser {
  return toPublicUser({
    id: userId,
    authReference: userId,
    email: "",
    role: "USER",
    status: "ACTIVE",
    emailVerifiedAt: null,
    username: "user",
    displayName: "Traveler",
    domicile: null,
    avatarUrl: null,
    coverUrl: null,
    bio: null,
  });
}
