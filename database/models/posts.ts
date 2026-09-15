import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  declare id: CreationOptional<string>;
  declare authorUserId: string;
  declare caption: CreationOptional<string>;
  declare imageUrl: string;
  declare imageFileId: string;
  declare tripId: CreationOptional<string | null>;
  declare templateId: CreationOptional<string | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PostLike extends Model<InferAttributes<PostLike>, InferCreationAttributes<PostLike>> {
  declare id: CreationOptional<string>;
  declare postId: string;
  declare userId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PostComment extends Model<
  InferAttributes<PostComment>,
  InferCreationAttributes<PostComment>
> {
  declare id: CreationOptional<string>;
  declare postId: string;
  declare userId: string;
  declare body: string;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPostModels(sequelize: Sequelize) {
  Post.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      authorUserId: { type: DataTypes.UUID, allowNull: false, field: "author_user_id" },
      caption: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
      imageUrl: { type: DataTypes.TEXT, allowNull: false, field: "image_url" },
      imageFileId: { type: DataTypes.STRING(255), allowNull: false, field: "image_file_id" },
      tripId: { type: DataTypes.UUID, allowNull: true, field: "trip_id" },
      templateId: { type: DataTypes.UUID, allowNull: true, field: "template_id" },
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "posts", modelName: "Post", underscored: true },
  );

  PostLike.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      postId: { type: DataTypes.UUID, allowNull: false, field: "post_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "post_likes", modelName: "PostLike", underscored: true },
  );

  PostComment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      postId: { type: DataTypes.UUID, allowNull: false, field: "post_id" },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      body: { type: DataTypes.TEXT, allowNull: false },
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: "post_comments", modelName: "PostComment", underscored: true },
  );
}
