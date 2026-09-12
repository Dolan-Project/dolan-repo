import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class ItineraryVersion extends Model<
  InferAttributes<ItineraryVersion>,
  InferCreationAttributes<ItineraryVersion>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare versionNumber: number;
  declare createdByUserId: string;
  declare source: CreationOptional<"MANUAL" | "AI" | "TEMPLATE" | "REGENERATED">;
  declare summary: CreationOptional<string | null>;
  declare assumptions: CreationOptional<unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ItineraryDay extends Model<
  InferAttributes<ItineraryDay>,
  InferCreationAttributes<ItineraryDay>
> {
  declare id: CreationOptional<string>;
  declare itineraryVersionId: string;
  declare dayNumber: number;
  declare date: CreationOptional<string | null>;
  declare title: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ItineraryStop extends Model<
  InferAttributes<ItineraryStop>,
  InferCreationAttributes<ItineraryStop>
> {
  declare id: CreationOptional<string>;
  declare itineraryDayId: string;
  declare placeId: CreationOptional<string | null>;
  declare sequence: number;
  declare activityType: CreationOptional<string>;
  declare customTitle: CreationOptional<string | null>;
  declare startTime: CreationOptional<string | null>;
  declare durationMinutes: CreationOptional<number>;
  declare travelDurationMinutes: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare isLocked: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class BudgetItem extends Model<
  InferAttributes<BudgetItem>,
  InferCreationAttributes<BudgetItem>
> {
  declare id: CreationOptional<string>;
  declare itineraryVersionId: string;
  declare itineraryStopId: CreationOptional<string | null>;
  declare category: string;
  declare label: string;
  declare quantity: CreationOptional<string>;
  declare unit: CreationOptional<string>;
  declare unitCostLow: CreationOptional<string>;
  declare unitCostHigh: CreationOptional<string>;
  declare sourceType: CreationOptional<string>;
  declare sourceReference: CreationOptional<string | null>;
  declare checkedAt: CreationOptional<Date | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TripChecklistItem extends Model<
  InferAttributes<TripChecklistItem>,
  InferCreationAttributes<TripChecklistItem>
> {
  declare id: CreationOptional<string>;
  declare tripId: string;
  declare userId: CreationOptional<string | null>;
  declare title: string;
  declare dueDate: CreationOptional<string | null>;
  declare isCompleted: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initItineraryModels(sequelize: Sequelize) {
  ItineraryVersion.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: "version_number" },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "created_by_user_id",
      },
      source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "MANUAL" },
      summary: { type: DataTypes.TEXT, allowNull: true },
      assumptions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "itinerary_versions",
      modelName: "ItineraryVersion",
      underscored: true,
    },
  );

  ItineraryDay.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      itineraryVersionId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "itinerary_version_id",
      },
      dayNumber: { type: DataTypes.INTEGER, allowNull: false, field: "day_number" },
      date: { type: DataTypes.DATEONLY, allowNull: true },
      title: { type: DataTypes.STRING(200), allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "itinerary_days", modelName: "ItineraryDay", underscored: true },
  );

  ItineraryStop.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      itineraryDayId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "itinerary_day_id",
      },
      placeId: { type: DataTypes.UUID, allowNull: true, field: "place_id" },
      sequence: { type: DataTypes.INTEGER, allowNull: false },
      activityType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "VISIT",
        field: "activity_type",
      },
      customTitle: { type: DataTypes.STRING(200), allowNull: true, field: "custom_title" },
      startTime: { type: DataTypes.TIME, allowNull: true, field: "start_time" },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        field: "duration_minutes",
      },
      travelDurationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "travel_duration_minutes",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      isLocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_locked",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "itinerary_stops", modelName: "ItineraryStop", underscored: true },
  );

  BudgetItem.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      itineraryVersionId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "itinerary_version_id",
      },
      itineraryStopId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "itinerary_stop_id",
      },
      category: { type: DataTypes.STRING(64), allowNull: false },
      label: { type: DataTypes.STRING(200), allowNull: false },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unit: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "item" },
      unitCostLow: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        field: "unit_cost_low",
      },
      unitCostHigh: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        field: "unit_cost_high",
      },
      sourceType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "ESTIMATE",
        field: "source_type",
      },
      sourceReference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "source_reference",
      },
      checkedAt: { type: DataTypes.DATE, allowNull: true, field: "checked_at" },
      notes: { type: DataTypes.TEXT, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "budget_items", modelName: "BudgetItem", underscored: true },
  );

  TripChecklistItem.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tripId: { type: DataTypes.UUID, allowNull: false, field: "trip_id" },
      userId: { type: DataTypes.UUID, allowNull: true, field: "user_id" },
      title: { type: DataTypes.STRING(200), allowNull: false },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: "due_date" },
      isCompleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_completed",
      },
      completedAt: { type: DataTypes.DATE, allowNull: true, field: "completed_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "trip_checklist_items",
      modelName: "TripChecklistItem",
      underscored: true,
    },
  );

  return {
    ItineraryVersion,
    ItineraryDay,
    ItineraryStop,
    BudgetItem,
    TripChecklistItem,
  };
}
