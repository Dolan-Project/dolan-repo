import { sampleOtherUser, samplePublicUser } from "@/mocks/fixtures";
import type { PublicUser } from "@/lib/contracts";

export type CommunityUser = PublicUser & { showPublicHistory: boolean };

export type FollowRow = { followerId: string; followingId: string };
export type BlockRow = { blockerId: string; blockedId: string };
export type ReviewRow = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  tripId: string;
  communication: number;
  attitude: number;
  comment: string | null;
  moderationStatus: "VISIBLE" | "HIDDEN";
};
export type ReportRow = {
  id: string;
  reporterId: string;
  targetType: "user" | "trip" | "comment" | "message" | "review";
  targetId: string;
  reason: string;
  status: "OPEN" | "HIDDEN" | "DISMISSED";
};
export type AttendanceRow = {
  tripId: string;
  userId: string;
  confirmed: boolean;
};
export type OfflineItinerary = {
  id: string;
  title: string;
  path: string;
  ownerUserId: string;
};
export type HistoryRow = {
  userId: string;
  title: string;
  visibility: "PUBLIC" | "PRIVATE";
};
export type TripRow = {
  id: string;
  hostId: string;
  status: "OPEN" | "COMPLETED";
};

export const COMPLETED_TRIP_ID = "trip_completed";
export const OPEN_TRIP_ID = "trip_open";

const emptyRating = {
  overall: null as number | null,
  communication: null as number | null,
  attitude: null as number | null,
  reviewCount: 0,
};

function asUser(base: PublicUser, extra: Partial<CommunityUser> = {}): CommunityUser {
  return { ...base, rating: { ...base.rating }, showPublicHistory: true, ...extra };
}

type Store = {
  users: CommunityUser[];
  follows: FollowRow[];
  blocks: BlockRow[];
  reviews: ReviewRow[];
  reports: ReportRow[];
  attendance: AttendanceRow[];
  offline: OfflineItinerary[];
  history: HistoryRow[];
  trips: TripRow[];
  completedPairs: Array<{ tripId: string; userA: string; userB: string }>;
};

let ids = 0;
let store: Store = createStore();

function createStore(): Store {
  ids = 0;
  return {
    users: [
      asUser(samplePublicUser),
      asUser(sampleOtherUser),
      asUser(sampleOtherUser, {
        id: "user_private",
        username: "private_host",
        displayName: "Private Host",
        showPublicHistory: false,
      }),
      asUser(samplePublicUser, {
        id: "user_admin",
        username: "admin",
        displayName: "Admin Dolan",
        bio: "Moderasi komunitas",
      }),
    ],
    follows: [],
    blocks: [],
    reviews: [],
    reports: [],
    attendance: [],
    offline: [],
    history: [
      { userId: sampleOtherUser.id, title: "Sailing Komodo", visibility: "PUBLIC" },
      { userId: sampleOtherUser.id, title: "Private weekend", visibility: "PRIVATE" },
      { userId: "user_private", title: "Secret beach", visibility: "PUBLIC" },
    ],
    trips: [
      { id: OPEN_TRIP_ID, hostId: sampleOtherUser.id, status: "OPEN" },
      { id: COMPLETED_TRIP_ID, hostId: sampleOtherUser.id, status: "COMPLETED" },
    ],
    completedPairs: [
      {
        tripId: COMPLETED_TRIP_ID,
        userA: samplePublicUser.id,
        userB: sampleOtherUser.id,
      },
    ],
  };
}

export function resetCommunityMocks() {
  store = createStore();
}

export function communityStore() {
  return store;
}

export function nextId(prefix: string) {
  ids += 1;
  return `${prefix}_${ids}`;
}

export function userByUsername(username: string) {
  return store.users.find((row) => row.username === username) ?? null;
}

export function userById(id: string) {
  return store.users.find((row) => row.id === id) ?? null;
}

export function actorFromSessionId(sessionId: string | null) {
  if (!sessionId) return null;
  if (sessionId === "admin") {
    const user = userById("user_admin");
    return user ? { user, isAdmin: true, emailVerified: true } : null;
  }
  if (sessionId === "host") {
    const user = userById(sampleOtherUser.id);
    return user ? { user, isAdmin: false, emailVerified: true } : null;
  }
  if (sessionId === "unverified") {
    const user = userById(samplePublicUser.id);
    return user ? { user, isAdmin: false, emailVerified: false } : null;
  }
  const user = userById(samplePublicUser.id);
  return user ? { user, isAdmin: false, emailVerified: true } : null;
}

export function isBlockedEitherWay(userA: string, userB: string) {
  return store.blocks.some(
    (row) =>
      (row.blockerId === userA && row.blockedId === userB) ||
      (row.blockerId === userB && row.blockedId === userA),
  );
}

export function completedTogether(tripId: string, userA: string, userB: string) {
  return store.completedPairs.some(
    (row) =>
      row.tripId === tripId &&
      ((row.userA === userA && row.userB === userB) || (row.userA === userB && row.userB === userA)),
  );
}

export function bothAttendanceConfirmed(tripId: string, userA: string, userB: string) {
  const store = communityStore();
  const confirmed = (userId: string) =>
    store.attendance.some((row) => row.tripId === tripId && row.userId === userId && row.confirmed);
  return confirmed(userA) && confirmed(userB);
}

export function refreshFollowCounts() {
  for (const user of store.users) {
    user.followersCount = store.follows.filter((row) => row.followingId === user.id).length;
    user.followingCount = store.follows.filter((row) => row.followerId === user.id).length;
  }
}

export function refreshRating(userId: string) {
  const user = userById(userId);
  if (!user) return;
  const rows = store.reviews.filter((row) => row.revieweeId === userId && row.moderationStatus === "VISIBLE");
  if (rows.length === 0) {
    user.rating = { ...emptyRating };
    return;
  }
  const communication = rows.reduce((sum, row) => sum + row.communication, 0) / rows.length;
  const attitude = rows.reduce((sum, row) => sum + row.attitude, 0) / rows.length;
  user.rating = {
    overall: Number(((communication + attitude) / 2).toFixed(2)),
    communication: Number(communication.toFixed(2)),
    attitude: Number(attitude.toFixed(2)),
    reviewCount: rows.length,
  };
}

export function publicUserListItem(user: CommunityUser) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

export function clearOfflineForSessionId(sessionId: string | null) {
  const actor = actorFromSessionId(sessionId);
  if (!actor) return;
  store.offline = store.offline.filter((row) => row.ownerUserId !== actor.user.id);
}
