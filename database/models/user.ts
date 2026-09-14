import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare authReference: string;
  declare email: string;
  declare passwordHash: CreationOptional<string | null>;
  declare role: CreationOptional<"USER" | "ADMIN">;
  declare status: CreationOptional<"ACTIVE" | "RESTRICTED" | "SUSPENDED">;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      authReference: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: "auth_reference",
      },
      email: {
        type: DataTypes.STRING(320),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "password_hash",
      },
      role: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "USER",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      emailVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "email_verified_at",
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "users",
      modelName: "User",
      underscored: true,
    },
  );

  return User;
}
