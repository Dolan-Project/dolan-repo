import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class ItineraryTemplate extends Model<
  InferAttributes<ItineraryTemplate>,
  InferCreationAttributes<ItineraryTemplate>
> {
  declare id: CreationOptional<string>;
  declare creatorUserId: CreationOptional<string | null>;
  declare sourceTripId: CreationOptional<string | null>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare city: string;
  declare provinceId: CreationOptional<string | null>;
  declare featuredRank: CreationOptional<number | null>;
  declare budgetLow: CreationOptional<string | null>;
  declare budgetHigh: CreationOptional<string | null>;
  declare durationDays: number;
  declare transportMode: CreationOptional<string | null>;
  declare source: CreationOptional<"CURATED" | "USER_TRIP">;
  declare publicationStatus: CreationOptional<"DRAFT" | "PUBLISHED" | "ARCHIVED">;
  declare publishedAt: CreationOptional<Date | null>;
  declare coverPlaceId: CreationOptional<string | null>;
  declare usageCount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TemplateDay extends Model<
  InferAttributes<TemplateDay>,
  InferCreationAttributes<TemplateDay>
> {
  declare id: CreationOptional<string>;
  declare templateId: string;
  declare dayNumber: number;
  declare title: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TemplateStop extends Model<
  InferAttributes<TemplateStop>,
  InferCreationAttributes<TemplateStop>
> {
  declare id: CreationOptional<string>;
  declare templateDayId: string;
  declare placeId: CreationOptional<string | null>;
  declare sequence: number;
  declare activityType: CreationOptional<string>;
  declare customTitle: CreationOptional<string | null>;
  declare durationMinutes: CreationOptional<number>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TemplateUsage extends Model<
  InferAttributes<TemplateUsage>,
  InferCreationAttributes<TemplateUsage>
> {
  declare id: CreationOptional<string>;
  declare templateId: string;
  declare userId: string;
  declare createdTripId: string;
  declare usedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initTemplateModels(sequelize: Sequelize) {
  ItineraryTemplate.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      creatorUserId: { type: DataTypes.UUID, allowNull: true, field: "creator_user_id" },
      sourceTripId: { type: DataTypes.UUID, allowNull: true, field: "source_trip_id" },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: false },
      provinceId: { type: DataTypes.UUID, allowNull: true, field: "province_id" },
      featuredRank: { type: DataTypes.INTEGER, allowNull: true, field: "featured_rank" },
      budgetLow: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: "budget_low" },
      budgetHigh: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: "budget_high" },
      durationDays: { type: DataTypes.INTEGER, allowNull: false, field: "duration_days" },
      transportMode: { type: DataTypes.STRING(64), allowNull: true, field: "transport_mode" },
      source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "CURATED" },
      publicationStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PUBLISHED",
        field: "publication_status",
      },
      publishedAt: { type: DataTypes.DATE, allowNull: true, field: "published_at" },
      coverPlaceId: { type: DataTypes.UUID, allowNull: true, field: "cover_place_id" },
      usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "usage_count",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "itinerary_templates", modelName: "ItineraryTemplate", underscored: true },
  );

  TemplateDay.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      templateId: { type: DataTypes.UUID, allowNull: false, field: "template_id" },
      dayNumber: { type: DataTypes.INTEGER, allowNull: false, field: "day_number" },
      title: { type: DataTypes.STRING(200), allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "template_days", modelName: "TemplateDay", underscored: true },
  );

  TemplateStop.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      templateDayId: { type: DataTypes.UUID, allowNull: false, field: "template_day_id" },
      placeId: { type: DataTypes.UUID, allowNull: true, field: "place_id" },
      sequence: { type: DataTypes.INTEGER, allowNull: false },
      activityType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "VISIT",
        field: "activity_type",
      },
      customTitle: { type: DataTypes.STRING(200), allowNull: true, field: "custom_title" },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        field: "duration_minutes",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "template_stops", modelName: "TemplateStop", underscored: true },
  );

  TemplateUsage.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      templateId: { type: DataTypes.UUID, allowNull: false, field: "template_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      createdTripId: { type: DataTypes.UUID, allowNull: false, field: "created_trip_id" },
      usedAt: { type: DataTypes.DATE, allowNull: false, field: "used_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "template_usages", modelName: "TemplateUsage", underscored: true },
  );

  return { ItineraryTemplate, TemplateDay, TemplateStop, TemplateUsage };
}
