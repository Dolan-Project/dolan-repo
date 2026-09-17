import {
  AuthErrorCode,
  listMessagesQuerySchema,
  markReadSchema,
  presentInboxNotification,
  sendMessageSchema,
  tripDeletedHostMessage,
  type ChatMessage,
  type JoinRequest,
  type JoinReviewDecision,
  type PublicUser,
} from "@dolan/shared";
import { HttpError } from "../../lib/api-error.ts";
import type { ChatAccess, ChatStore, StoredNotification } from "./chat-store.ts";
import { senderFromId } from "./memory-chat-store.ts";

export type ChatRealtime = {
  emitToRoom(tripId: string, event: string, payload: unknown): void;
  emitToComments(tripId: string, event: string, payload: unknown): void;
  emitToUser(userId: string, event: string, payload: unknown): void;
  leaveRoom(userId: string, tripId: string): void;
};

export class ChatService {
  constructor(
    private readonly store: ChatStore,
    private realtime: ChatRealtime = {
      emitToRoom() {},
      emitToComments() {},
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
      sender: await this.store.resolveSender(userId).catch(() => this.toSender(userId)),
      clientMessageId: parsed.clientMessageId,
      body: parsed.body,
    });
    this.realtime.emitToRoom(tripId, "message.created", message);
    const members = await this.store.listActiveMemberIds(tripId);
    const tripTitle = access.tripTitle ?? null;
    const actorName = message.sender.displayName || message.sender.username || "Seseorang";
    const actorUsername = message.sender.username?.trim() || "";
    for (const memberId of members) {
      this.realtime.emitToUser(memberId, "message.created", message);
      if (memberId === userId) continue;
      const notification = await this.store.createNotification({
        recipientUserId: memberId,
        actorUserId: userId,
        type: "message.created",
        targetType: "trip",
        targetId: tripId,
        data: {
          messageId: message.id,
          preview: message.body,
          actorName,
          ...(actorUsername ? { actorUsername } : {}),
          ...(tripTitle ? { tripTitle } : {}),
        },
      });
      this.onNotificationCreated(memberId, {
        ...notification,
        ...presentInboxNotification(notification),
      });
    }
    return { message, created: true };
  }

  async markRead(tripId: string, userId: string, body: unknown) {
    const access = this.assertCanRead(await this.store.getAccess(tripId, userId));
    const parsed = markReadSchema.parse(body);
    await this.store.markRead(access.roomId, userId, parsed.lastReadMessageId);
    return { ok: true };
  }

  async evictFromRoom(tripId: string, userId: string, status: "LEFT" | "REMOVED" = "LEFT") {
    await this.store.evictMember(tripId, userId, status);
    this.realtime.leaveRoom(userId, tripId);
    await this.emitToActiveMembers(tripId, "trip.updated", { tripId, userId, membershipStatus: status });
    return { left: true };
  }

  async emitGenerationUpdated(job: {
    id: string;
    tripId: string;
    status: string;
    resultVersionId: string | null;
    errorCode: string | null;
  }) {
    await this.emitToActiveMembers(job.tripId, "generation.updated", {
      jobId: job.id,
      tripId: job.tripId,
      status: job.status,
      resultVersionId: job.resultVersionId,
      errorCode: job.errorCode,
    });
  }

  async emitTripEvent(tripId: string, event: string, payload: unknown, skipUserId?: string) {
    await this.emitToActiveMembers(tripId, event, payload, skipUserId);
  }

  onCommentCreated(tripId: string, comment: unknown) {
    this.realtime.emitToComments(tripId, "comment.created", comment);
  }

  onCommentUpdated(tripId: string, comment: unknown) {
    this.realtime.emitToComments(tripId, "comment.updated", comment);
  }

  onCommentDeleted(tripId: string, payload: { tripId: string; commentId: string }) {
    this.realtime.emitToComments(tripId, "comment.deleted", payload);
  }

  onJoinRequested(tripId: string, userId: string, join?: JoinRequest) {
    const payload = { tripId, userId, join };
    this.realtime.emitToComments(tripId, "join_request.created", payload);
    return this.emitJoinEvent(tripId, "join_request.created", payload, userId);
  }

  onJoinReviewed(tripId: string, userId: string, join: JoinRequest, decision: JoinReviewDecision) {
    const payload = { tripId, userId, join, decision };
    this.realtime.emitToComments(tripId, "join_request.reviewed", payload);
    this.realtime.emitToUser(userId, "join_request.reviewed", payload);
    return this.emitJoinEvent(tripId, "join_request.reviewed", payload);
  }

  onJoinClosed(tripId: string, userId: string) {
    const payload = { tripId, userId, decision: "withdrawn" };
    this.realtime.emitToComments(tripId, "join_request.reviewed", payload);
    return this.emitJoinEvent(tripId, "join_request.reviewed", payload);
  }

  onNotificationCreated(userId: string, payload: unknown) {
    this.realtime.emitToUser(userId, "notification.created", payload);
  }

  async recordUserNotification(input: Omit<StoredNotification, "id" | "createdAt" | "readAt">) {
    if (input.actorUserId && input.recipientUserId === input.actorUserId) return null;
    const notification = await this.store.createNotification(input);
    this.onNotificationCreated(input.recipientUserId, {
      ...notification,
      ...presentInboxNotification(input),
    });
    return notification;
  }

  async emitJoinEvent(
    tripId: string,
    event: "join_request.created" | "join_request.reviewed",
    payload: Record<string, unknown>,
    actorUserId?: string,
  ) {
    await this.emitToActiveMembers(tripId, event, { tripId, ...payload }, actorUserId);
  }

  private async emitToActiveMembers(
    tripId: string,
    event: string,
    payload: unknown,
    skipUserId?: string,
  ) {
    const members = await this.store.listActiveMemberIds(tripId);
    for (const memberId of members) {
      if (memberId === skipUserId) continue;
      this.realtime.emitToUser(memberId, event, payload);
    }
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

  async announceTripDeleted(tripId: string, hostUserId: string, reason: string) {
    const members = await this.store.listActiveMemberIds(tripId);
    const roomId = await this.store.getRoomId(tripId);
    if (roomId) {
      try {
        const message = await this.store.createMessage({
          roomId,
          tripId,
          sender: await this.store.resolveSender(hostUserId).catch(() => this.toSender(hostUserId)),
          clientMessageId: `trip-deleted-${tripId}`,
          body: tripDeletedHostMessage(reason),
        });
        this.realtime.emitToRoom(tripId, "message.created", message);
      } catch {
        /* still close the room even if the goodbye message fails */
      }
    }
    const payload = { tripId, reason };
    for (const memberId of members) {
      this.realtime.emitToUser(memberId, "trip.deleted", payload);
      this.realtime.leaveRoom(memberId, tripId);
    }
    this.realtime.emitToRoom(tripId, "trip.deleted", payload);
    await this.store.deleteRoom(tripId);
  }

  onTripDeleted(tripId: string, hostUserId: string, reason: string) {
    return this.announceTripDeleted(tripId, hostUserId, reason);
  }
}
