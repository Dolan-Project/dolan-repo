import type { ChatMessage, PublicUser } from "@dolan/shared";

export type ChatAccess = {
  tripId: string;
  tripStatus: string;
  roomId: string;
  readOnly: boolean;
  memberRole: "HOST" | "PARTICIPANT" | null;
  membershipStatus: "ACTIVE" | "LEFT" | "REMOVED" | null;
  joinRequestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | null;
};

export type StoredNotification = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: string;
  targetType: string | null;
  targetId: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type ChatStore = {
  getAccess(tripId: string, userId: string): Promise<ChatAccess | null>;
  listActiveMemberIds(tripId: string): Promise<string[]>;
  listMessages(input: {
    roomId: string;
    tripId: string;
    after?: string;
    before?: string;
    limit: number;
  }): Promise<ChatMessage[]>;
  findByClientMessage(senderUserId: string, clientMessageId: string): Promise<ChatMessage | null>;
  createMessage(input: {
    roomId: string;
    tripId: string;
    sender: PublicUser;
    clientMessageId: string;
    body: string;
  }): Promise<ChatMessage>;
  markRead(roomId: string, userId: string, lastReadMessageId: string): Promise<void>;
  createNotification(input: Omit<StoredNotification, "id" | "createdAt" | "readAt">): Promise<StoredNotification>;
  listNotifications(userId: string, page: number, limit: number): Promise<{ items: StoredNotification[]; total: number }>;
  markNotificationRead(userId: string, id: string): Promise<StoredNotification | null>;
  evictMember(tripId: string, userId: string, status?: "LEFT" | "REMOVED"): Promise<void>;
  resolveSender(userId: string): Promise<PublicUser>;
};
