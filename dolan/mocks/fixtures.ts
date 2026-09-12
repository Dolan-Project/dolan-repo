import {
  isProfileComplete,
  type AuthSession,
  type PublicUser,
} from "@dolan/shared";

export const samplePublicUser: PublicUser = {
  id: "user_salsa",
  username: "salsa",
  displayName: "Salsa",
  avatarUrl: null,
  coverUrl: null,
  bio: "Traveler",
  domicile: "Jakarta",
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

export const sampleAuthSession: AuthSession = {
  user: samplePublicUser,
  emailVerified: false,
  profileComplete: isProfileComplete(samplePublicUser),
};
