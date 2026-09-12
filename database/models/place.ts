import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class Place extends Model<
  InferAttributes<Place>,
  InferCreationAttributes<Place>
> {
  declare id: CreationOptional<string>;
  declare googlePlaceId: string;
  declare cachedName: CreationOptional<string | null>;
  declare cachedCity: CreationOptional<string | null>;
  declare cachedLatitude: CreationOptional<number | null>;
  declare cachedLongitude: CreationOptional<number | null>;
  declare cacheCheckedAt: CreationOptional<Date | null>;
  declare status: CreationOptional<"ACTIVE" | "INACTIVE">;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPlaceModel(sequelize: Sequelize): typeof Place {
  Place.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      googlePlaceId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: "google_place_id",
      },
      cachedName: { type: DataTypes.STRING(255), allowNull: true, field: "cached_name" },
      cachedCity: { type: DataTypes.STRING(120), allowNull: true, field: "cached_city" },
      cachedLatitude: { type: DataTypes.DOUBLE, allowNull: true, field: "cached_latitude" },
      cachedLongitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "cached_longitude",
      },
      cacheCheckedAt: { type: DataTypes.DATE, allowNull: true, field: "cache_checked_at" },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "places",
      modelName: "Place",
      underscored: true,
    },
  );

  return Place;
}
