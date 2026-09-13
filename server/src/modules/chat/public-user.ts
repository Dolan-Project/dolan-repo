import type { PublicUser } from "@dolan/shared";

export function publicUserStub(id: string, username = ""): PublicUser {
  return {
    id,
    username,
    displayName: username,
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    domicile: null,
    followersCount: 0,
    followingCount: 0,
    hostTripCount: 0,
    participantTripCount: 0,
    rating: { overall: null, communication: null, attitude: null, reviewCount: 0 },
  };
}
