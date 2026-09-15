export type StoredPost = {
  id: string;
  authorUserId: string;
  caption: string;
  imageUrl: string;
  imageFileId: string;
  tripId: string | null;
  templateId: string | null;
  deletedAt: string | null;
  createdAt: string;
};

export type StoredPostComment = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  deletedAt: string | null;
  createdAt: string;
};

export type PostStore = {
  create(input: Omit<StoredPost, "id" | "createdAt" | "deletedAt">): Promise<StoredPost>;
  get(id: string): Promise<StoredPost | null>;
  list(input: { excludeAuthorIds: string[]; page: number; limit: number }): Promise<{
    items: StoredPost[];
    total: number;
  }>;
  softDelete(id: string): Promise<void>;
  addLike(postId: string, userId: string): Promise<boolean>;
  removeLike(postId: string, userId: string): Promise<boolean>;
  countLikes(postId: string): Promise<number>;
  likedBy(postId: string, userId: string): Promise<boolean>;
  addComment(input: { postId: string; userId: string; body: string }): Promise<StoredPostComment>;
  listComments(postId: string, limit?: number): Promise<StoredPostComment[]>;
  getComment(id: string): Promise<StoredPostComment | null>;
  softDeleteComment(id: string): Promise<void>;
  countComments(postId: string): Promise<number>;
};
