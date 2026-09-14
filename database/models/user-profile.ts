import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class UserProfile extends Model<
  InferAttributes<UserProfile>,
  InferCreationAttributes<UserProfile>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare username: string;
  declare displayName: string;
  declare avatarUrl: CreationOptional<string | null>;
  declare avatarFileId: CreationOptional<string | null>;
  declare coverUrl: CreationOptional<string | null>;
  declare coverFileId: CreationOptional<string | null>;
  declare coverCaption: CreationOptional<string | null>;
  declare bio: CreationOptional<string | null>;
  declare domicile: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserProfileModel(sequelize: Sequelize): typeof UserProfile {
  UserProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: "user_id",
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      displayName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "display_name",
      },
      avatarUrl: { type: DataTypes.TEXT, allowNull: true, field: "avatar_url" },
      avatarFileId: { type: DataTypes.STRING(255), allowNull: true, field: "avatar_file_id" },
      coverUrl: { type: DataTypes.TEXT, allowNull: true, field: "cover_url" },
      coverFileId: { type: DataTypes.STRING(255), allowNull: true, field: "cover_file_id" },
      coverCaption: {
        type: DataTypes.STRING(280),
        allowNull: true,
        field: "cover_caption",
      },
      bio: { type: DataTypes.TEXT, allowNull: true },
      domicile: { type: DataTypes.STRING(120), allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "user_profiles",
      modelName: "UserProfile",
      underscored: true,
    },
  );

  return UserProfile;
}
