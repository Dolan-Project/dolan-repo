import {
  AuthErrorCode,
  listMessagesQuerySchema,
  markReadSchema,
  sendMessageSchema,
  type ChatMessage,
  type PublicUser,
} from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { ChatAccess, ChatStore, StoredNotification } from "./chat-store.ts";
import { senderFromId } from "./memory-chat-store.ts";

export type ChatRealtime = {
  emitToRoom(tripId: string, event: string, payload: unknown): void;
  emitToUser(userId: string, event: string, payload: unknown): void;
  leaveRoom(userId: string, tripId: string): void;
};

export class ChatService {
  constructor(
    private readonly store: ChatStore,
    private realtime: ChatRealtime = {
      emitToRoom() {},
      emitToUser() {},
      leaveRoom() {},
    },
    private readonly toSender: (userId: string) => PublicUser = senderFromId,
  ) {}

  setRealtime(realtime: ChatRealtime) {
    this.realtime = realtime;
  }

  async accessFor(tripId: string, userId: string): Promise<ChatAccess | null> {
    return this.store.getAccess(tripId, userId);
  }

  assertCanRead(access: ChatAccess | null): ChatAccess {
    if (!access) {
      throw new HttpError(404, "NOT_FOUND", "Trip not found");
    }
    if (access.joinRequestStatus === "PENDING") {
      throw new HttpError(403, AuthErrorCode.PENDING_MEMBER, "Pending members cannot access chat");
    }
    if (access.membershipStatus !== "ACTIVE" || !access.memberRole) {
      throw new HttpError(403, AuthErrorCode.NOT_MEMBER, "Active membership is required");
    }
    return access;
  }

  async listMessages(tripId: string, userId: string, query: unknown) {
    const access = this.assertCanRead(await this.store.getAccess(tripId, userId));
    const parsed = listMessagesQuerySchema.parse(query);
    return this.store.listMessages({
      roomId: access.roomId,
      tripId,
      after: parsed.after,
      before: parsed.before,
      limit: parsed.limit,
    });
  }

  async sendMessage(tripId: string, userId: string, body: unknown): Promise<{ message: ChatMessage; created: boolean }> {
    const access = this.assertCanRead(await this.store.getAccess(tripId, userId));
    if (access.readOnly) {
      throw new HttpError(403, AuthErrorCode.ROOM_READ_ONLY, "This chat room is read-only");
    }
    const parsed = sendMessageSchema.parse(body);
    const existing = await this.store.findByClientMessage(userId, parsed.clientMessageId);
    if (existing) {
      return { message: existing, created: false };
    }
    const message = await this.store.createMessage({
      roomId: access.roomId,
      tripId,
      sender: this.toSender(userId),
      clientMessageId: parsed.clientMessageId,
      body: parsed.body,
    });
    this.realtime.emitToRoom(tripId, "message.created", message);
    const members = await this.store.listActiveMemberIds(tripId);
    for (const memberId of members) {
      if (memberId === userId) continue;
      const notification = await this.store.createNotification({
        recipientUserId: memberId,
        actorUserId: userId,
        type: "message.created",
        targetType: "trip",
        targetId: tripId,
        data: { messageId: message.id },
      });
      this.realtime.emitToUser(memberId, "notification.created", notification);
    }
    return { message, created: true };
  }

  async markRead(tripId: string, userId: string, body: unknown) {
    const access = this.assertCanRead(await this.store.getAccess(tripId, userId));
    const parsed = markReadSchema.parse(body);
    await this.store.markRead(access.roomId, userId, parsed.lastReadMessageId);
    return { ok: true };
  }

  async evictFromRoom(tripId: string, userId: string) {
    this.realtime.leaveRoom(userId, tripId);
    return { left: true };
  }

  async listNotifications(userId: string, page = 1, limit = 20) {
    return this.store.listNotifications(userId, page, limit);
  }

  async markNotificationRead(userId: string, id: string): Promise<StoredNotification> {
    const item = await this.store.markNotificationRead(userId, id);
    if (!item) {
      throw new HttpError(404, "NOT_FOUND", "Notification not found");
    }
    return item;
  }
}
