import type { PublicUser } from "@dolan/shared";

export function publicUserStub(id: string, username = ""): PublicUser {
  return {
    id,
    username,
    displayName: username || "Traveler",
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    domicile: null,
    instagramUrl: null,
    tiktokUrl: null,
    followersCount: 0,
    followingCount: 0,
    hostTripCount: 0,
    participantTripCount: 0,
    rating: { overall: null, communication: null, attitude: null, reviewCount: 0 },
  };
}

export async function publicUserFromId(id: string, username = ""): Promise<PublicUser> {
  const base = publicUserStub(id, username);
  try {
    const { getModels } = await import("@dolan/database");
    const { UserProfile, UserFollow, Trip, TripMember } = getModels();
    const profile = await UserProfile.findOne({ where: { userId: id } });
    const [followersCount, followingCount, hostTripCount, participantTripCount] = await Promise.all([
      UserFollow.count({ where: { followingUserId: id } }),
      UserFollow.count({ where: { followerUserId: id } }),
      Trip.count({ where: { hostUserId: id } }),
      TripMember.count({ where: { userId: id, membershipStatus: "ACTIVE" } }),
    ]);
    return {
      ...base,
      username: profile?.username ?? username ?? "user",
      displayName: (profile?.displayName ?? username) || "Traveler",
      avatarUrl: profile?.avatarUrl ?? null,
      coverUrl: profile?.coverUrl ?? null,
      bio: profile?.bio ?? null,
      domicile: profile?.domicile ?? null,
      instagramUrl: profile?.instagramUrl ?? null,
      tiktokUrl: profile?.tiktokUrl ?? null,
      followersCount,
      followingCount,
      hostTripCount,
      participantTripCount,
    };
  } catch {
    return base;
  }
}
