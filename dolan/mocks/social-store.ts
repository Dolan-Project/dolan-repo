import type { ChatMessage, JoinRequest, PublicUser, TripComment } from "@/lib/contracts";
import { sampleOtherUser, samplePublicUser } from "@/mocks/fixtures";

export const TRIP_PUBLIC_ID = "trip_1";
export const TRIP_HOSTED_ID = "trip_host";
export const ROOT_COMMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export type AppNotification = {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  tripId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Store = {
  comments: TripComment[];
  joins: JoinRequest[];
  messages: ChatMessage[];
  notifications: AppNotification[];
};

const seedComments = (): TripComment[] => [
  {
    id: ROOT_COMMENT_ID,
    tripId: TRIP_PUBLIC_ID,
    author: samplePublicUser,
    parentId: null,
    body: "Join gratis, biaya masing-masing.",
    createdAt: "2026-09-12T00:00:00.000Z",
  },
];

const seedJoins = (): JoinRequest[] => [
  {
    id: "join_seed",
    tripId: TRIP_HOSTED_ID,
    applicant: sampleOtherUser,
    message: "Boleh ikut sailing-nya?",
    status: "PENDING",
  },
];

const seedMessages = (): ChatMessage[] => [
  {
    id: "m1",
    tripId: TRIP_PUBLIC_ID,
    sender: sampleOtherUser,
    clientMessageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    body: "Halo rombongan",
    sentAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "m2",
    tripId: TRIP_HOSTED_ID,
    sender: samplePublicUser,
    clientMessageId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    body: "Siap, titik kumpul Bandara LBJ",
    sentAt: "2026-09-12T00:30:00.000Z",
  },
];

const seedNotifications = (): AppNotification[] => [
  {
    id: "notif_1",
    recipientUserId: samplePublicUser.id,
    title: "Pengajuan join",
    body: "Host akan meninjau pengajuan kamu. Tidak ada biaya join.",
    tripId: TRIP_PUBLIC_ID,
    readAt: null,
    createdAt: "2026-09-12T01:00:00.000Z",
  },
];

let store: Store = {
  comments: seedComments(),
  joins: seedJoins(),
  messages: seedMessages(),
  notifications: seedNotifications(),
};

export function resetSocialMocks() {
  store = {
    comments: seedComments(),
    joins: seedJoins(),
    messages: seedMessages(),
    notifications: seedNotifications(),
  };
}

export function socialStore() {
  return store;
}

export function tripHost(tripId: string): PublicUser {
  return tripId === TRIP_HOSTED_ID ? samplePublicUser : sampleOtherUser;
}

export function nextId(prefix: string) {
  return `${prefix}_${store.comments.length + store.joins.length + Date.now()}`;
}
