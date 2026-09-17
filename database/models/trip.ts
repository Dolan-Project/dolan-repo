import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class Trip extends Model<InferAttributes<Trip>, InferCreationAttributes<Trip>> {
  declare id: CreationOptional<string>;
  declare hostUserId: string;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare visibility: CreationOptional<"PRIVATE" | "PUBLIC">;
  declare status: CreationOptional<
    "DRAFT" | "OPEN" | "CLOSED" | "ONGOING" | "COMPLETED" | "CANCELLED"
  >;
  declare startDate: CreationOptional<string | null>;
  declare endDate: CreationOptional<string | null>;
  declare timezone: CreationOptional<string>;
  declare privateOriginLabel: CreationOptional<string | null>;
  declare privateOriginLatitude: CreationOptional<number | null>;
  declare privateOriginLongitude: CreationOptional<number | null>;
  declare destinationCity: CreationOptional<string | null>;
  declare publicMeetingPointLabel: CreationOptional<string | null>;
  declare publicMeetingPointLatitude: CreationOptional<number | null>;
  declare publicMeetingPointLongitude: CreationOptional<number | null>;
  declare transportMode: CreationOptional<string | null>;
  declare budgetAmount: CreationOptional<string | null>;
  declare budgetBasis: CreationOptional<"PER_PERSON" | "GROUP">;
  declare currency: CreationOptional<string>;
  declare planningPartySize: CreationOptional<number>;
  declare maxParticipants: CreationOptional<number | null>;
  declare genderRule: CreationOptional<"ALL_GENDERS" | "FEMALE_ONLY" | "MALE_ONLY">;
  declare communityRules: CreationOptional<string | null>;
  declare currentItineraryVersionId: CreationOptional<string | null>;
  declare preferences: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TripMember extends Model<
  InferAttributes<TripMember>,
  InferCreationAttributes<TripMember>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare userId: string;
  declare role: "HOST" | "PARTICIPANT";
  declare membershipStatus: CreationOptional<"ACTIVE" | "LEFT" | "REMOVED">;
  declare hostAttendance: CreationOptional<"UNCONFIRMED" | "PRESENT" | "ABSENT" | "DISPUTED">;
  declare selfAttendance: CreationOptional<"UNCONFIRMED" | "PRESENT" | "ABSENT" | "DISPUTED">;
  declare showOnProfile: CreationOptional<boolean>;
  declare joinedAt: CreationOptional<Date>;
  declare leftAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TripJoinRequest extends Model<
  InferAttributes<TripJoinRequest>,
  InferCreationAttributes<TripJoinRequest>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare userId: string;
  declare message: CreationOptional<string | null>;
  declare status: CreationOptional<"PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN">;
  declare reviewedByUserId: CreationOptional<string | null>;
  declare reviewedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initTripModels(sequelize: Sequelize) {
  Trip.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      hostUserId: { type: DataTypes.UUID, allowNull: false, field: "host_user_id" },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      visibility: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "PRIVATE" },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "DRAFT" },
      startDate: { type: DataTypes.DATEONLY, allowNull: true, field: "start_date" },
      endDate: { type: DataTypes.DATEONLY, allowNull: true, field: "end_date" },
      timezone: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "Asia/Jakarta" },
      privateOriginLabel: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "private_origin_label",
      },
      privateOriginLatitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "private_origin_latitude",
      },
      privateOriginLongitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "private_origin_longitude",
      },
      destinationCity: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "destination_city",
      },
      publicMeetingPointLabel: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "public_meeting_point_label",
      },
      publicMeetingPointLatitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "public_meeting_point_latitude",
      },
      publicMeetingPointLongitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "public_meeting_point_longitude",
      },
      transportMode: { type: DataTypes.STRING(64), allowNull: true, field: "transport_mode" },
      budgetAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: "budget_amount" },
      budgetBasis: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PER_PERSON",
        field: "budget_basis",
      },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "IDR" },
      planningPartySize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "planning_party_size",
      },
      maxParticipants: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "max_participants",
      },
      genderRule: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "ALL_GENDERS", field: "gender_rule" },
      communityRules: { type: DataTypes.TEXT, allowNull: true, field: "community_rules" },
      currentItineraryVersionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "current_itinerary_version_id",
      },
      preferences: { type: DataTypes.JSONB, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "trips", modelName: "Trip", underscored: true },
  );

  TripMember.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      role: { type: DataTypes.STRING(32), allowNull: false },
      membershipStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
        field: "membership_status",
      },
      hostAttendance: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "UNCONFIRMED",
        field: "host_attendance",
      },
      selfAttendance: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "UNCONFIRMED",
        field: "self_attendance",
      },
      showOnProfile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "show_on_profile",
      },
      joinedAt: { type: DataTypes.DATE, allowNull: false, field: "joined_at" },
      leftAt: { type: DataTypes.DATE, allowNull: true, field: "left_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "trip_members", modelName: "TripMember", underscored: true },
  );

  TripJoinRequest.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      message: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "PENDING" },
      reviewedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "reviewed_by_user_id",
      },
      reviewedAt: { type: DataTypes.DATE, allowNull: true, field: "reviewed_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "trip_join_requests",
      modelName: "TripJoinRequest",
      underscored: true,
    },
  );

  return { Trip, TripMember, TripJoinRequest };
}
