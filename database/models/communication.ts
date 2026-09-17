import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class TripComment extends Model<
  InferAttributes<TripComment>,
  InferCreationAttributes<TripComment>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare userId: string;
  declare parentCommentId: CreationOptional<string | null>;
  declare body: string;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ChatRoom extends Model<
  InferAttributes<ChatRoom>,
  InferCreationAttributes<ChatRoom>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare readOnlyAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Message extends Model<
  InferAttributes<Message>,
  InferCreationAttributes<Message>
> {
  declare id: CreationOptional<string>;
  declare chatRoomId: string;
  declare senderUserId: string;
  declare clientMessageId: string;
  declare body: string;
  declare sentAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class MessageReadState extends Model<
  InferAttributes<MessageReadState>,
  InferCreationAttributes<MessageReadState>
> {
  declare id: CreationOptional<string>;
  declare chatRoomId: string;
  declare userId: string;
  declare lastReadMessageId: CreationOptional<string | null>;
  declare readAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>;
  declare recipientUserId: string;
  declare actorUserId: CreationOptional<string | null>;
  declare type: string;
  declare targetType: CreationOptional<string | null>;
  declare targetId: CreationOptional<string | null>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PushSubscription extends Model<
  InferAttributes<PushSubscription>,
  InferCreationAttributes<PushSubscription>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare endpoint: string;
  declare p256dhEncrypted: string;
  declare authEncrypted: string;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCommunicationModels(sequelize: Sequelize) {
  TripComment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      parentCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "parent_comment_id",
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "trip_comments", modelName: "TripComment", underscored: true },
  );

  ChatRoom.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "trip_id" },
      readOnlyAt: { type: DataTypes.DATE, allowNull: true, field: "read_only_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "chat_rooms", modelName: "ChatRoom", underscored: true },
  );

  Message.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      chatRoomId: { type: DataTypes.UUID, allowNull: false, field: "chat_room_id" },
      senderUserId: { type: DataTypes.UUID, allowNull: false, field: "sender_user_id" },
      clientMessageId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "client_message_id",
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      sentAt: { type: DataTypes.DATE, allowNull: false, field: "sent_at" },
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "messages", modelName: "Message", underscored: true },
  );

  MessageReadState.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      chatRoomId: { type: DataTypes.UUID, allowNull: false, field: "chat_room_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      lastReadMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "last_read_message_id",
      },
      readAt: { type: DataTypes.DATE, allowNull: false, field: "read_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "message_read_states",
      modelName: "MessageReadState",
      underscored: true,
    },
  );

  Notification.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      recipientUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "recipient_user_id",
      },
      actorUserId: { type: DataTypes.UUID, allowNull: true, field: "actor_user_id" },
      type: { type: DataTypes.STRING(64), allowNull: false },
      targetType: { type: DataTypes.STRING(64), allowNull: true, field: "target_type" },
      targetId: { type: DataTypes.UUID, allowNull: true, field: "target_id" },
      data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      readAt: { type: DataTypes.DATE, allowNull: true, field: "read_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "notifications", modelName: "Notification", underscored: true },
  );

  PushSubscription.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      endpoint: { type: DataTypes.TEXT, allowNull: false, unique: true },
      p256dhEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "p256dh_encrypted",
      },
      authEncrypted: { type: DataTypes.TEXT, allowNull: false, field: "auth_encrypted" },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "push_subscriptions",
      modelName: "PushSubscription",
      underscored: true,
    },
  );

  return {
    TripComment,
    ChatRoom,
    Message,
    MessageReadState,
    Notification,
    PushSubscription,
  };
}
