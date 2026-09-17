import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class GenerationJob extends Model<
  InferAttributes<GenerationJob>,
  InferCreationAttributes<GenerationJob>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare requestedByUserId: string;
  declare type: string;
  declare status: CreationOptional<"QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED">;
  declare idempotencyKey: string;
  declare resultVersionId: CreationOptional<string | null>;
  declare selectedItineraryVersionId: CreationOptional<string | null>;
  declare attemptCount: CreationOptional<number>;
  declare lockedBy: CreationOptional<string | null>;
  declare lockedAt: CreationOptional<Date | null>;
  declare startedAt: CreationOptional<Date | null>;
  declare finishedAt: CreationOptional<Date | null>;
  declare errorCode: CreationOptional<string | null>;
  declare requestPayload: CreationOptional<Record<string, unknown>>;
  declare resultPayload: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TripShareLink extends Model<
  InferAttributes<TripShareLink>,
  InferCreationAttributes<TripShareLink>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare createdByUserId: string;
  declare tokenHash: string;
  declare expiresAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare permittedFields: CreationOptional<unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ApiUsageCounter extends Model<
  InferAttributes<ApiUsageCounter>,
  InferCreationAttributes<ApiUsageCounter>
> {
  declare id: CreationOptional<string>;
  declare provider: string;
  declare operation: string;
  declare period: string;
  declare userId: CreationOptional<string | null>;
  declare requestCount: CreationOptional<number>;
  declare estimatedCost: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class IdempotencyKey extends Model<
  InferAttributes<IdempotencyKey>,
  InferCreationAttributes<IdempotencyKey>
> {
  declare id: CreationOptional<string>;
  declare actorUserId: string;
  declare operation: string;
  declare key: string;
  declare requestHash: string;
  declare responseStatus: CreationOptional<number | null>;
  declare responseBody: CreationOptional<unknown | null>;
  declare expiresAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TripInvitation extends Model<
  InferAttributes<TripInvitation>,
  InferCreationAttributes<TripInvitation>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare invitedByUserId: string;
  declare invitedUserId: CreationOptional<string | null>;
  declare tokenHash: CreationOptional<string | null>;
  declare channel: "DOLAN" | "WHATSAPP";
  declare status: CreationOptional<"PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED">;
  declare expiresAt: CreationOptional<Date | null>;
  declare acceptedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initSupportModels(sequelize: Sequelize) {
  TripInvitation.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      invitedByUserId: { type: DataTypes.UUID, allowNull: false, field: "invited_by_user_id" },
      invitedUserId: { type: DataTypes.UUID, allowNull: true, field: "invited_user_id" },
      tokenHash: { type: DataTypes.STRING(128), allowNull: true, unique: true, field: "token_hash" },
      channel: { type: DataTypes.STRING(20), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "PENDING" },
      expiresAt: { type: DataTypes.DATE, allowNull: true, field: "expires_at" },
      acceptedAt: { type: DataTypes.DATE, allowNull: true, field: "accepted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "trip_invitations", modelName: "TripInvitation", underscored: true },
  );
  GenerationJob.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      requestedByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "requested_by_user_id",
      },
      type: { type: DataTypes.STRING(64), allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "QUEUED" },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "idempotency_key",
      },
      resultVersionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "result_version_id",
      },
      selectedItineraryVersionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "selected_itinerary_version_id",
      },
      attemptCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "attempt_count",
      },
      lockedBy: { type: DataTypes.STRING(128), allowNull: true, field: "locked_by" },
      lockedAt: { type: DataTypes.DATE, allowNull: true, field: "locked_at" },
      startedAt: { type: DataTypes.DATE, allowNull: true, field: "started_at" },
      finishedAt: { type: DataTypes.DATE, allowNull: true, field: "finished_at" },
      errorCode: { type: DataTypes.STRING(64), allowNull: true, field: "error_code" },
      requestPayload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: "request_payload" },
      resultPayload: { type: DataTypes.JSONB, allowNull: true, field: "result_payload" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "generation_jobs", modelName: "GenerationJob", underscored: true },
  );

  TripShareLink.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "created_by_user_id",
      },
      tokenHash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        field: "token_hash",
      },
      expiresAt: { type: DataTypes.DATE, allowNull: true, field: "expires_at" },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
      permittedFields: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: "permitted_fields",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "trip_share_links",
      modelName: "TripShareLink",
      underscored: true,
    },
  );

  ApiUsageCounter.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      provider: { type: DataTypes.STRING(64), allowNull: false },
      operation: { type: DataTypes.STRING(64), allowNull: false },
      period: { type: DataTypes.STRING(32), allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: true, field: "user_id" },
      requestCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "request_count",
      },
      estimatedCost: {
        type: DataTypes.DECIMAL(14, 6),
        allowNull: false,
        defaultValue: 0,
        field: "estimated_cost",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "api_usage_counters",
      modelName: "ApiUsageCounter",
      underscored: true,
    },
  );

  IdempotencyKey.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      actorUserId: { type: DataTypes.UUID, allowNull: false, field: "actor_user_id" },
      operation: { type: DataTypes.STRING(128), allowNull: false },
      key: { type: DataTypes.STRING(128), allowNull: false },
      requestHash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "request_hash",
      },
      responseStatus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "response_status",
      },
      responseBody: { type: DataTypes.JSONB, allowNull: true, field: "response_body" },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "idempotency_keys",
      modelName: "IdempotencyKey",
      underscored: true,
    },
  );

  return { GenerationJob, TripShareLink, ApiUsageCounter, IdempotencyKey, TripInvitation };
}
