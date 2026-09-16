import { Op } from "sequelize";
import { Post, PostComment, PostLike } from "@dolan/database";
import type { PostStore, StoredPost, StoredPostComment } from "./post-store.ts";

function toPost(row: Post): StoredPost {
  return {
    id: row.id,
    authorUserId: row.authorUserId,
    caption: row.caption ?? "",
    imageUrl: row.imageUrl,
    imageFileId: row.imageFileId,
    tripId: row.tripId ?? null,
    templateId: row.templateId ?? null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toComment(row: PostComment): StoredPostComment {
  return {
    id: row.id,
    postId: row.postId,
    userId: row.userId,
    body: row.body,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class SequelizePostStore implements PostStore {
  async create(input: Omit<StoredPost, "id" | "createdAt" | "deletedAt">) {
    const row = await Post.create({
      authorUserId: input.authorUserId,
      caption: input.caption,
      imageUrl: input.imageUrl,
      imageFileId: input.imageFileId,
      tripId: input.tripId,
      templateId: input.templateId,
    });
    return toPost(row);
  }

  async get(id: string) {
    const row = await Post.findOne({ where: { id, deletedAt: null } });
    return row ? toPost(row) : null;
  }

  async list(input: { excludeAuthorIds: string[]; page: number; limit: number }) {
    const where =
      input.excludeAuthorIds.length > 0
        ? { deletedAt: null, authorUserId: { [Op.notIn]: input.excludeAuthorIds } }
        : { deletedAt: null };
    const { count, rows } = await Post.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: (input.page - 1) * input.limit,
      limit: input.limit,
    });
    return { items: rows.map(toPost), total: count };
  }

  async softDelete(id: string) {
    await Post.update({ deletedAt: new Date() }, { where: { id } });
  }

  async addLike(postId: string, userId: string) {
    const [, created] = await PostLike.findOrCreate({
      where: { postId, userId },
      defaults: { postId, userId },
    });
    return created;
  }

  async removeLike(postId: string, userId: string) {
    const deleted = await PostLike.destroy({ where: { postId, userId } });
    return deleted > 0;
  }

  async countLikes(postId: string) {
    return PostLike.count({ where: { postId } });
  }

  async likedBy(postId: string, userId: string) {
    const count = await PostLike.count({ where: { postId, userId } });
    return count > 0;
  }

  async addComment(input: { postId: string; userId: string; body: string }) {
    const row = await PostComment.create({
      postId: input.postId,
      userId: input.userId,
      body: input.body,
    });
    return toComment(row);
  }

  async listComments(postId: string, limit = 50) {
    const rows = await PostComment.findAll({
      where: { postId, deletedAt: null },
      order: [["createdAt", "ASC"]],
      limit,
    });
    return rows.map(toComment);
  }

  async getComment(id: string) {
    const row = await PostComment.findOne({ where: { id, deletedAt: null } });
    return row ? toComment(row) : null;
  }

  async softDeleteComment(id: string) {
    await PostComment.update({ deletedAt: new Date() }, { where: { id } });
  }

  async countComments(postId: string) {
    return PostComment.count({ where: { postId, deletedAt: null } });
  }
}
