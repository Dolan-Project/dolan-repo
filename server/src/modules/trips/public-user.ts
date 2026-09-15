import type { AuthIdentity, PublicUser } from "@dolan/shared";

function emptyPublicUser(user: AuthIdentity): PublicUser {
  return {
    id: user.id,
    username: user.username ?? "user",
    displayName: user.displayName ?? "Traveler",
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    bio: user.bio,
    domicile: user.domicile,
    instagramUrl: user.instagramUrl,
    tiktokUrl: user.tiktokUrl,
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

async function loadSocialCounts(userId: string) {
  try {
    const { getModels } = await import("@dolan/database");
    const { UserFollow, Trip, TripMember } = getModels();
    const [followersCount, followingCount, hostTripCount, participantTripCount] = await Promise.all([
      UserFollow.count({ where: { followingUserId: userId } }),
      UserFollow.count({ where: { followerUserId: userId } }),
      Trip.count({ where: { hostUserId: userId } }),
      TripMember.count({ where: { userId, membershipStatus: "ACTIVE" } }),
    ]);
    return { followersCount, followingCount, hostTripCount, participantTripCount };
  } catch {
    return {
      followersCount: 0,
      followingCount: 0,
      hostTripCount: 0,
      participantTripCount: 0,
    };
  }
}

export async function toPublicUser(user: AuthIdentity): Promise<PublicUser> {
  const base = emptyPublicUser(user);
  const counts = await loadSocialCounts(user.id);
  return { ...base, ...counts };
}

export function placeholderUser(userId: string): PublicUser {
  return emptyPublicUser({
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
    instagramUrl: null,
    tiktokUrl: null,
  });
}
