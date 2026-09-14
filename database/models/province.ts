import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export class Province extends Model<InferAttributes<Province>, InferCreationAttributes<Province>> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare name: string;
  declare capital: string;
  declare description: string;
  declare heroQuery: string;
  declare featuredRank: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ProvincePlace extends Model<InferAttributes<ProvincePlace>, InferCreationAttributes<ProvincePlace>> {
  declare id: CreationOptional<string>;
  declare provinceId: string;
  declare name: string;
  declare city: string;
  declare description: string;
  declare googlePlaceId: CreationOptional<string | null>;
  declare googleMapsUrl: string;
  declare searchQuery: string;
  declare rank: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initProvinceModels(sequelize: Sequelize) {
  Province.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    capital: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    heroQuery: { type: DataTypes.STRING(255), allowNull: false, field: "hero_query" },
    featuredRank: { type: DataTypes.INTEGER, allowNull: false, field: "featured_rank" },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, { sequelize, tableName: "provinces", modelName: "Province", underscored: true });

  ProvincePlace.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    provinceId: { type: DataTypes.UUID, allowNull: false, field: "province_id" },
    name: { type: DataTypes.STRING(200), allowNull: false },
    city: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    googlePlaceId: { type: DataTypes.STRING(255), allowNull: true, field: "google_place_id" },
    googleMapsUrl: { type: DataTypes.TEXT, allowNull: false, field: "google_maps_url" },
    searchQuery: { type: DataTypes.STRING(255), allowNull: false, field: "search_query" },
    rank: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, { sequelize, tableName: "province_places", modelName: "ProvincePlace", underscored: true });

  return { Province, ProvincePlace };
}
