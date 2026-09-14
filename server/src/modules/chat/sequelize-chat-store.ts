import { getModels } from "@dolan/database";
import type { ChatMessage } from "@dolan/shared";
import { Op } from "sequelize";
import type { ChatAccess, ChatStore, StoredNotification } from "./chat-store.ts";
import { publicUserStub } from "./public-user.ts";

export class SequelizeChatStore implements ChatStore {
  async getAccess(tripId: string, userId: string): Promise<ChatAccess | null> {
    const { Trip, TripMember, TripJoinRequest, ChatRoom } = getModels();
    const trip = await Trip.findByPk(tripId);
    if (!trip) return null;
    const [member, pending, room] = await Promise.all([
      TripMember.findOne({ where: { tripId, userId } }),
      TripJoinRequest.findOne({ where: { tripId, userId, status: "PENDING" } }),
      ChatRoom.findOne({ where: { tripId } }),
    ]);
    const roomRow = room ?? (await ChatRoom.create({ tripId }));
    return {
      tripId,
      tripStatus: trip.status,
      roomId: roomRow.id,
      readOnly: Boolean(roomRow.readOnlyAt) || trip.status === "CANCELLED",
      memberRole: member?.role ?? null,
      membershipStatus: member?.membershipStatus ?? null,
      joinRequestStatus: pending?.status ?? null,
    };
  }

  async listActiveMemberIds(tripId: string): Promise<string[]> {
    const { TripMember } = getModels();
    const members = await TripMember.findAll({ where: { tripId, membershipStatus: "ACTIVE" } });
    return members.map((member) => member.userId);
  }

  async listMessages(input: {
    roomId: string;
    tripId: string;
    after?: string;
    before?: string;
    limit: number;
  }): Promise<ChatMessage[]> {
    const { Message } = getModels();
    const where: Record<string, unknown> = { chatRoomId: input.roomId, deletedAt: null };
    if (input.after) {
      const after = await Message.findByPk(input.after);
      if (after) where.sentAt = { [Op.gt]: after.sentAt };
    }
    if (input.before) {
      const before = await Message.findByPk(input.before);
      if (before) {
        where.sentAt = { ...(typeof where.sentAt === "object" ? where.sentAt : {}), [Op.lt]: before.sentAt };
      }
    }
    const rows = await Message.findAll({
      where,
      order: [
        ["sentAt", "ASC"],
        ["id", "ASC"],
      ],
      limit: input.limit,
    });
    return Promise.all(rows.map((row) => toMessage(row, input.tripId)));
  }

  async findByClientMessage(senderUserId: string, clientMessageId: string): Promise<ChatMessage | null> {
    const { Message, ChatRoom } = getModels();
    const row = await Message.findOne({ where: { senderUserId, clientMessageId } });
    if (!row) return null;
    const room = await ChatRoom.findByPk(row.chatRoomId);
    return toMessage(row, room?.tripId ?? "");
  }

  async createMessage(input: {
    roomId: string;
    tripId: string;
    sender: import("@dolan/shared").PublicUser;
    clientMessageId: string;
    body: string;
  }): Promise<ChatMessage> {
    const { Message } = getModels();
    try {
      const row = await Message.create({
        chatRoomId: input.roomId,
        senderUserId: input.sender.id,
        clientMessageId: input.clientMessageId,
        body: input.body,
        sentAt: new Date(),
      });
      return toMessage(row, input.tripId, input.sender);
    } catch {
      const existing = await this.findByClientMessage(input.sender.id, input.clientMessageId);
      if (existing) return existing;
      throw new Error("MESSAGE_CREATE_FAILED");
    }
  }

  async markRead(roomId: string, userId: string, lastReadMessageId: string): Promise<void> {
    const { MessageReadState } = getModels();
    const [state] = await MessageReadState.findOrCreate({
      where: { chatRoomId: roomId, userId },
      defaults: { chatRoomId: roomId, userId, lastReadMessageId, readAt: new Date() },
    });
    state.lastReadMessageId = lastReadMessageId;
    state.readAt = new Date();
    await state.save();
  }

  async createNotification(input: Omit<StoredNotification, "id" | "createdAt" | "readAt">) {
    const { Notification } = getModels();
    const row = await Notification.create({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
      targetType: input.targetType,
      targetId: input.targetId,
      data: input.data,
    });
    const targetType = input.targetType;
    const targetId = input.targetId;
    if (targetType && targetId) {
      void import("../push/push-delivery.ts").then(({ deliverPushNotification }) =>
        deliverPushNotification({
          recipientUserId: input.recipientUserId,
          type: input.type,
          targetType,
          targetId,
          data: input.data,
        }),
      );
    }
    return toNotification(row);
  }

  async listNotifications(userId: string, page: number, limit: number) {
    const { Notification } = getModels();
    const { count, rows } = await Notification.findAndCountAll({
      where: { recipientUserId: userId },
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });
    return { items: rows.map(toNotification), total: count };
  }

  async markNotificationRead(userId: string, id: string) {
    const { Notification } = getModels();
    const row = await Notification.findOne({ where: { id, recipientUserId: userId } });
    if (!row) return null;
    row.readAt = new Date();
    await row.save();
    return toNotification(row);
  }

  async evictMember(tripId: string, userId: string, status: "LEFT" | "REMOVED" = "LEFT"): Promise<void> {
    const { TripMember } = getModels();
    const member = await TripMember.findOne({ where: { tripId, userId } });
    if (!member) return;
    member.membershipStatus = status;
    member.leftAt = new Date();
    await member.save();
  }

  async resolveSender(userId: string) {
    return resolveProfile(userId);
  }
}

async function resolveProfile(userId: string) {
  const { UserProfile } = getModels();
  const profile = await UserProfile.findOne({ where: { userId } });
  return {
    ...publicUserStub(userId, profile?.username ?? ""),
    displayName: profile?.displayName ?? profile?.username ?? "",
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    bio: profile?.bio ?? null,
    domicile: profile?.domicile ?? null,
  };
}

async function toMessage(
  row: { id: string; senderUserId: string; clientMessageId: string; body: string; sentAt: Date },
  tripId: string,
  sender?: import("@dolan/shared").PublicUser,
): Promise<ChatMessage> {
  return {
    id: row.id,
    tripId,
    sender: sender ?? (await resolveProfile(row.senderUserId)),
    clientMessageId: row.clientMessageId,
    body: row.body,
    sentAt: row.sentAt.toISOString(),
  };
}

function toNotification(row: {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: string;
  targetType: string | null;
  targetId: string | null;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}): StoredNotification {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    actorUserId: row.actorUserId,
    type: row.type,
    targetType: row.targetType,
    targetId: row.targetId,
    data: row.data ?? {},
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
