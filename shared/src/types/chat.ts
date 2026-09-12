import type { PublicUser } from "./kickoff.js";

export type TripComment = {
  id: string;
  tripId: string;
  author: PublicUser;
  parentId: string | null;
  body: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  tripId: string;
  sender: PublicUser;
  clientMessageId: string;
  body: string;
  sentAt: string;
};
