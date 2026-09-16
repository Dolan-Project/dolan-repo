import type { ChatMessage, PublicUser } from "@dolan/shared";
import { publicUserStub } from "./public-user.ts";
import type { ChatAccess, ChatStore, StoredNotification } from "./chat-store.ts";

type Member = {
  role: "HOST" | "PARTICIPANT";
  status: "ACTIVE" | "LEFT" | "REMOVED";
};

type MemoryTrip = {
  status: string;
  title: string | null;
  readOnly: boolean;
  roomId: string;
  members: Map<string, Member>;
  pending: Set<string>;
};

export class MemoryChatStore implements ChatStore {
  readonly trips = new Map<string, MemoryTrip>();
  readonly messages: ChatMessage[] = [];
  readonly notifications: StoredNotification[] = [];
  readonly reads = new Map<string, string>();

  seedTrip(input: {
    tripId: string;
    hostUserId: string;
    participants?: string[];
    pending?: string[];
    status?: string;
    title?: string;
    readOnly?: boolean;
  }) {
    const members = new Map<string, Member>();
    members.set(input.hostUserId, { role: "HOST", status: "ACTIVE" });
    for (const userId of input.participants ?? []) {
      members.set(userId, { role: "PARTICIPANT", status: "ACTIVE" });
    }
    this.trips.set(input.tripId, {
      status: input.status ?? "OPEN",
      title: input.title ?? null,
      readOnly: Boolean(input.readOnly),
      roomId: `room-${input.tripId}`,
      members,
      pending: new Set(input.pending ?? []),
    });
  }

  evict(tripId: string, userId: string, status: "LEFT" | "REMOVED" = "LEFT") {
    const trip = this.trips.get(tripId);
    const member = trip?.members.get(userId);
    if (member) member.status = status;
    trip?.pending.delete(userId);
  }

  addPending(tripId: string, userId: string) {
    this.trips.get(tripId)?.pending.add(userId);
  }

  addParticipant(tripId: string, userId: string) {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    trip.pending.delete(userId);
    trip.members.set(userId, { role: "PARTICIPANT", status: "ACTIVE" });
  }

  clearPending(tripId: string, userId: string) {
    this.trips.get(tripId)?.pending.delete(userId);
  }

  setReadOnly(tripId: string, readOnly = true) {
    const trip = this.trips.get(tripId);
    if (trip) {
      trip.readOnly = readOnly;
      trip.status = readOnly ? "CANCELLED" : "OPEN";
    }
  }

  async getAccess(tripId: string, userId: string): Promise<ChatAccess | null> {
    const trip = this.trips.get(tripId);
    if (!trip) return null;
    const member = trip.members.get(userId);
    return {
      tripId,
      tripStatus: trip.status,
      roomId: trip.roomId,
      readOnly: trip.readOnly || trip.status === "CANCELLED",
      memberRole: member?.role ?? null,
      membershipStatus: member?.status ?? null,
      joinRequestStatus: trip.pending.has(userId) ? "PENDING" : null,
      tripTitle: trip.title,
    };
  }

  async listActiveMemberIds(tripId: string): Promise<string[]> {
    const trip = this.trips.get(tripId);
    if (!trip) return [];
    return [...trip.members.entries()]
      .filter(([, member]) => member.status === "ACTIVE")
      .map(([userId]) => userId);
  }

  async listMessages(input: {
    roomId: string;
    tripId: string;
    after?: string;
    before?: string;
    limit: number;
  }): Promise<ChatMessage[]> {
    let items = this.messages.filter((message) => message.tripId === input.tripId);
    if (input.after) {
      const index = items.findIndex((message) => message.id === input.after);
      items = index >= 0 ? items.slice(index + 1) : items;
    }
    if (input.before) {
      const index = items.findIndex((message) => message.id === input.before);
      items = index >= 0 ? items.slice(0, index) : items;
    }
    return items.slice(-input.limit);
  }

  async findByClientMessage(senderUserId: string, clientMessageId: string): Promise<ChatMessage | null> {
    return (
      this.messages.find(
        (message) => message.sender.id === senderUserId && message.clientMessageId === clientMessageId,
      ) ?? null
    );
  }

  async createMessage(input: {
    roomId: string;
    tripId: string;
    sender: PublicUser;
    clientMessageId: string;
    body: string;
  }): Promise<ChatMessage> {
    const existing = await this.findByClientMessage(input.sender.id, input.clientMessageId);
    if (existing) return existing;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      tripId: input.tripId,
      sender: input.sender,
      clientMessageId: input.clientMessageId,
      body: input.body,
      sentAt: new Date().toISOString(),
    };
    this.messages.push(message);
    return message;
  }

  async markRead(roomId: string, userId: string, lastReadMessageId: string): Promise<void> {
    this.reads.set(`${roomId}:${userId}`, lastReadMessageId);
  }

  async createNotification(
    input: Omit<StoredNotification, "id" | "createdAt" | "readAt">,
  ): Promise<StoredNotification> {
    const notification: StoredNotification = {
      ...input,
      id: crypto.randomUUID(),
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notification);
    return notification;
  }

  async listNotifications(userId: string, page: number, limit: number) {
    const items = this.notifications
      .filter((item) => item.recipientUserId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total: items.length,
      unreadCount: items.filter((item) => item.readAt === null).length,
    };
  }

  async evictMember(tripId: string, userId: string, status: "LEFT" | "REMOVED" = "LEFT"): Promise<void> {
    this.evict(tripId, userId, status);
  }

  async resolveSender(userId: string): Promise<PublicUser> {
    return senderFromId(userId);
  }

  async markNotificationRead(userId: string, id: string): Promise<StoredNotification | null> {
    const item = this.notifications.find((notification) => notification.id === id && notification.recipientUserId === userId);
    if (!item) return null;
    item.readAt = new Date().toISOString();
    return item;
  }

  async getRoomId(tripId: string): Promise<string | null> {
    return this.trips.get(tripId)?.roomId ?? null;
  }

  async deleteRoom(tripId: string): Promise<void> {
    this.trips.delete(tripId);
    const leftover = this.messages.filter((message) => message.tripId !== tripId);
    this.messages.length = 0;
    this.messages.push(...leftover);
  }
}

export function senderFromId(userId: string): PublicUser {
  const names: Record<string, string> = {
    "11111111-1111-4111-8111-111111111111": "alya",
    "22222222-2222-4222-8222-222222222222": "baru",
    "33333333-3333-4333-8333-333333333333": "lala",
    "44444444-4444-4444-8444-444444444444": "admin",
  };
  return publicUserStub(userId, names[userId] ?? userId.slice(0, 8));
}
