import { randomUUID } from "node:crypto";
import type { PostStore, StoredPost, StoredPostComment } from "./post-store.ts";

export class MemoryPostStore implements PostStore {
  readonly posts: StoredPost[] = [];
  readonly likes: Array<{ postId: string; userId: string }> = [];
  readonly comments: StoredPostComment[] = [];

  async create(input: Omit<StoredPost, "id" | "createdAt" | "deletedAt">) {
    const post: StoredPost = {
      ...input,
      id: randomUUID(),
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.posts.unshift(post);
    return post;
  }

  async get(id: string) {
    return this.posts.find((post) => post.id === id && !post.deletedAt) ?? null;
  }

  async list(input: { excludeAuthorIds: string[]; page: number; limit: number }) {
    const blocked = new Set(input.excludeAuthorIds);
    const items = this.posts
      .filter((post) => !post.deletedAt && !blocked.has(post.authorUserId))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const start = (input.page - 1) * input.limit;
    return { items: items.slice(start, start + input.limit), total: items.length };
  }

  async softDelete(id: string) {
    const post = this.posts.find((row) => row.id === id);
    if (post) post.deletedAt = new Date().toISOString();
  }

  async addLike(postId: string, userId: string) {
    if (this.likes.some((row) => row.postId === postId && row.userId === userId)) return false;
    this.likes.push({ postId, userId });
    return true;
  }

  async removeLike(postId: string, userId: string) {
    const index = this.likes.findIndex((row) => row.postId === postId && row.userId === userId);
    if (index < 0) return false;
    this.likes.splice(index, 1);
    return true;
  }

  async countLikes(postId: string) {
    return this.likes.filter((row) => row.postId === postId).length;
  }

  async likedBy(postId: string, userId: string) {
    return this.likes.some((row) => row.postId === postId && row.userId === userId);
  }

  async addComment(input: { postId: string; userId: string; body: string }) {
    const comment: StoredPostComment = {
      id: randomUUID(),
      postId: input.postId,
      userId: input.userId,
      body: input.body,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.comments.push(comment);
    return comment;
  }

  async listComments(postId: string, limit = 50) {
    return this.comments
      .filter((row) => row.postId === postId && !row.deletedAt)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }

  async getComment(id: string) {
    return this.comments.find((row) => row.id === id && !row.deletedAt) ?? null;
  }

  async softDeleteComment(id: string) {
    const comment = this.comments.find((row) => row.id === id);
    if (comment) comment.deletedAt = new Date().toISOString();
  }

  async countComments(postId: string) {
    return this.comments.filter((row) => row.postId === postId && !row.deletedAt).length;
  }
}
