import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class UserFollow extends Model<
  InferAttributes<UserFollow>,
  InferCreationAttributes<UserFollow>
> {
  declare id: CreationOptional<string>;
  declare followerUserId: string;
  declare followingUserId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class UserReview extends Model<
  InferAttributes<UserReview>,
  InferCreationAttributes<UserReview>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare reviewerUserId: string;
  declare revieweeUserId: string;
  declare communicationRating: number;
  declare attitudeRating: number;
  declare comment: CreationOptional<string | null>;
  declare moderationStatus: CreationOptional<"VISIBLE" | "HIDDEN" | "UNDER_REVIEW">;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class LocationShare extends Model<
  InferAttributes<LocationShare>,
  InferCreationAttributes<LocationShare>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare tripId: CreationOptional<string | null>;
  declare scope: "TRIP_PRECISE" | "PUBLIC_APPROXIMATE";
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class LocationLatest extends Model<
  InferAttributes<LocationLatest>,
  InferCreationAttributes<LocationLatest>
> {
  declare id: CreationOptional<string>;
  declare locationShareId: string;
  declare latitude: number;
  declare longitude: number;
  declare accuracyMeters: CreationOptional<number | null>;
  declare recordedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class UserBlock extends Model<
  InferAttributes<UserBlock>,
  InferCreationAttributes<UserBlock>
> {
  declare id: CreationOptional<string>;
  declare blockerUserId: string;
  declare blockedUserId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Report extends Model<
  InferAttributes<Report>,
  InferCreationAttributes<Report>
> {
  declare id: CreationOptional<string>;
  declare reporterUserId: string;
  declare targetType: string;
  declare targetId: string;
  declare reason: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<"OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED">;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ModerationAction extends Model<
  InferAttributes<ModerationAction>,
  InferCreationAttributes<ModerationAction>
> {
  declare id: CreationOptional<string>;
  declare reportId: string;
  declare adminUserId: string;
  declare action: string;
  declare reason: CreationOptional<string | null>;
  declare actedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initSocialModels(sequelize: Sequelize) {
  UserFollow.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      followerUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "follower_user_id",
      },
      followingUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "following_user_id",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "user_follows", modelName: "UserFollow", underscored: true },
  );

  UserReview.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      reviewerUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "reviewer_user_id",
      },
      revieweeUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "reviewee_user_id",
      },
      communicationRating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "communication_rating",
      },
      attitudeRating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "attitude_rating",
      },
      comment: { type: DataTypes.TEXT, allowNull: true },
      moderationStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "VISIBLE",
        field: "moderation_status",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "user_reviews", modelName: "UserReview", underscored: true },
  );

  LocationShare.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      tripId: { type: DataTypes.UUID, allowNull: true, field: "trip_id" },
      scope: { type: DataTypes.STRING(32), allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "location_shares", modelName: "LocationShare", underscored: true },
  );

  LocationLatest.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      locationShareId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: "location_share_id",
      },
      latitude: { type: DataTypes.DOUBLE, allowNull: false },
      longitude: { type: DataTypes.DOUBLE, allowNull: false },
      accuracyMeters: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "accuracy_meters",
      },
      recordedAt: { type: DataTypes.DATE, allowNull: false, field: "recorded_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "location_latest", modelName: "LocationLatest", underscored: true },
  );

  UserBlock.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      blockerUserId: { type: DataTypes.UUID, allowNull: false, field: "blocker_user_id" },
      blockedUserId: { type: DataTypes.UUID, allowNull: false, field: "blocked_user_id" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "user_blocks", modelName: "UserBlock", underscored: true },
  );

  Report.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      reporterUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "reporter_user_id",
      },
      targetType: { type: DataTypes.STRING(64), allowNull: false, field: "target_type" },
      targetId: { type: DataTypes.UUID, allowNull: false, field: "target_id" },
      reason: { type: DataTypes.STRING(120), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "OPEN" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "reports", modelName: "Report", underscored: true },
  );

  ModerationAction.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      reportId: { type: DataTypes.UUID, allowNull: false, field: "report_id" },
      adminUserId: { type: DataTypes.UUID, allowNull: false, field: "admin_user_id" },
      action: { type: DataTypes.STRING(64), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: true },
      actedAt: { type: DataTypes.DATE, allowNull: false, field: "acted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "moderation_actions",
      modelName: "ModerationAction",
      underscored: true,
    },
  );

  return {
    UserFollow,
    UserReview,
    LocationShare,
    LocationLatest,
    UserBlock,
    Report,
    ModerationAction,
  };
}
