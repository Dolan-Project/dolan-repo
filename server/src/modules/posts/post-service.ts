import { randomUUID } from "node:crypto";
import {
  AuthErrorCode,
  SearchErrorCode,
  apiPage,
  createPostCommentBodySchema,
  createPostFieldsSchema,
  listPostsQuerySchema,
  type HomeComposerOptions,
  type HomeStreamItem,
  type ItineraryTemplateSummary,
  type PostCard,
  type PostComment,
  type SessionActor,
} from "@dolan/shared";
import { MAX_POST_UPLOAD_BYTES, validateUploadMeta } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { deleteImageKitFile, uploadPostImage } from "../../integrations/imagekit/imagekit-client.ts";
import { badRequest, forbidden, notFound, providerUnavailable, unauthorized } from "../../lib/api-error.ts";
import { isProfileComplete } from "../auth/authorization.ts";
import type { ChatService } from "../chat/chat-service.ts";
import type { SearchService } from "../search/search-service.ts";
import type { SocialQueryStore } from "../social/social-queries.ts";
import type { TripService } from "../trips/trip-service.ts";
import { mixHomeStream } from "./mix-stream.ts";
import type { PostStore, StoredPost, StoredPostComment } from "./post-store.ts";

function requireUser(actor: SessionActor) {
  if (actor.kind !== "user") throw unauthorized();
  return actor.user;
}

export type PostImageUpload = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export class PostService {
  constructor(
    private readonly store: PostStore,
    private readonly trips: TripService,
    private readonly search: SearchService,
    private readonly social: SocialQueryStore,
    private readonly chat: ChatService,
    private readonly upload: (input: {
      bytes: Uint8Array;
      fileName: string;
      mimeType: string;
      userId: string;
    }) => Promise<{ url: string; fileId: string }> = defaultPostUpload,
  ) {}

  async list(actor: SessionActor, query: unknown) {
    const parsed = listPostsQuerySchema.parse(query);
    const viewerId = actor.kind === "user" ? actor.user.id : null;
    const excludeAuthorIds = viewerId ? await this.social.listBlockedUserIds(viewerId) : [];
    const page = await this.store.list({ ...parsed, excludeAuthorIds });
    const items: PostCard[] = [];
    for (const row of page.items) items.push(await this.toCard(row, viewerId));
    return apiPage(items, parsed.page, parsed.limit, page.total);
  }

  async homeStream(actor: SessionActor, templates: ItineraryTemplateSummary[]): Promise<HomeStreamItem[]> {
    const listed = await this.list(actor, { page: 1, limit: 20 });
    return mixHomeStream(listed.data, templates);
  }

  async composerOptions(actor: SessionActor): Promise<HomeComposerOptions> {
    const [hosted, joined, templates] = await Promise.all([
      this.trips.listMine(actor, "hosted", 1, 20),
      this.trips.listMine(actor, "joined", 1, 20),
      this.search.searchTemplates({ sort: "popular", page: 1, limit: 20 }),
    ]);
    const trips = [...hosted.data, ...joined.data]
      .filter((trip, index, all) => all.findIndex((row) => row.id === trip.id) === index)
      .map((trip) => ({ id: trip.id, title: trip.title }));
    return { trips, templates: templates.data };
  }

  async create(actor: SessionActor, fields: unknown, image: PostImageUpload) {
    const user = requireUser(actor);
    if (!isProfileComplete(user)) {
      throw forbidden(AuthErrorCode.PROFILE_INCOMPLETE, "Lengkapi profil dulu sebelum mengunggah momen");
    }
    const parsed = createPostFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form");
    }
    const validation = validateUploadMeta(
      { type: image.mimeType, size: image.bytes.byteLength },
      MAX_POST_UPLOAD_BYTES,
    );
    if (!validation.ok || image.bytes.byteLength === 0) {
      throw badRequest(
        validation.ok ? "UPLOAD_INVALID_TYPE" : validation.code,
        validation.ok ? "Foto wajib ada" : validation.message,
      );
    }
    const tripId = parsed.data.tripId ?? null;
    const templateId = parsed.data.templateId ?? null;
    if (tripId) await this.trips.requireLinkedTrip(actor, tripId);
    let template: ItineraryTemplateSummary | null = null;
    if (templateId) {
      try {
        template = await this.search.getTemplate(templateId);
      } catch {
        throw badRequest(SearchErrorCode.TEMPLATE_UNAVAILABLE, "Template tidak tersedia", {
          templateId: "Tidak valid",
        });
      }
    }
    const uploaded = await this.upload({
      bytes: image.bytes,
      fileName: image.fileName,
      mimeType: image.mimeType,
      userId: user.id,
    });
    const post = await this.store.create({
      authorUserId: user.id,
      caption: parsed.data.caption,
      imageUrl: uploaded.url,
      imageFileId: uploaded.fileId,
      tripId,
      templateId,
    });
    return this.toCard(post, user.id, template);
  }

  async remove(actor: SessionActor, postId: string) {
    const user = requireUser(actor);
    const post = await this.requirePost(postId);
    if (post.authorUserId !== user.id && user.role !== "ADMIN") {
      throw forbidden(AuthErrorCode.FORBIDDEN, "Hanya penulis yang bisa menghapus momen ini");
    }
    await this.store.softDelete(postId);
    void deleteImageKitFile(post.imageFileId);
    return { deleted: true as const };
  }

  async like(actor: SessionActor, postId: string) {
    const user = requireUser(actor);
    const post = await this.requirePost(postId);
    const created = await this.store.addLike(postId, user.id);
    if (created) {
      await this.notify(post.authorUserId, user, "post.liked", post.id, {});
    }
    return this.toCard(post, user.id);
  }

  async unlike(actor: SessionActor, postId: string) {
    const user = requireUser(actor);
    const post = await this.requirePost(postId);
    await this.store.removeLike(postId, user.id);
    return this.toCard(post, user.id);
  }

  async listComments(postId: string) {
    await this.requirePost(postId);
    const rows = await this.store.listComments(postId, 50);
    const items: PostComment[] = [];
    for (const row of rows) items.push(await this.toComment(row));
    return items;
  }

  async comment(actor: SessionActor, postId: string, body: unknown) {
    const user = requireUser(actor);
    const post = await this.requirePost(postId);
    const parsed = createPostCommentBodySchema.safeParse(body);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Komentar tidak valid");
    const row = await this.store.addComment({ postId, userId: user.id, body: parsed.data.body });
    await this.notify(post.authorUserId, user, "post.commented", post.id, { preview: parsed.data.body });
    return this.toComment(row);
  }

  async removeComment(actor: SessionActor, postId: string, commentId: string) {
    const user = requireUser(actor);
    const post = await this.requirePost(postId);
    const comment = await this.store.getComment(commentId);
    if (!comment || comment.postId !== postId) throw notFound("NOT_FOUND", "Komentar tidak ditemukan");
    if (comment.userId !== user.id && post.authorUserId !== user.id && user.role !== "ADMIN") {
      throw forbidden(AuthErrorCode.FORBIDDEN, "Kamu tidak bisa menghapus komentar ini");
    }
    await this.store.softDeleteComment(commentId);
    return { deleted: true as const };
  }

  private async requirePost(postId: string) {
    const post = await this.store.get(postId);
    if (!post) throw notFound("NOT_FOUND", "Momen tidak ditemukan");
    return post;
  }

  private async notify(
    recipientUserId: string,
    actor: { id: string; username: string | null; displayName: string | null },
    type: "post.liked" | "post.commented",
    postId: string,
    extra: Record<string, unknown>,
  ) {
    await this.chat.recordUserNotification({
      recipientUserId,
      actorUserId: actor.id,
      type,
      targetType: "post",
      targetId: postId,
      data: {
        ...extra,
        actorUsername: actor.username,
        actorName: actor.displayName,
        postId,
      },
    });
  }

  private async toCard(
    post: StoredPost,
    viewerId: string | null,
    templateHint: ItineraryTemplateSummary | null = null,
  ): Promise<PostCard> {
    const [author, likeCount, commentCount, likedByMe, comments, trip, template] = await Promise.all([
      this.trips.publicAuthor(post.authorUserId),
      this.store.countLikes(post.id),
      this.store.countComments(post.id),
      viewerId ? this.store.likedBy(post.id, viewerId) : Promise.resolve(false),
      this.store.listComments(post.id, 3),
      post.tripId ? this.trips.tripRef(post.tripId) : Promise.resolve(null),
      templateHint
        ? Promise.resolve(templateHint)
        : post.templateId
          ? this.search.getTemplate(post.templateId).catch(() => null)
          : Promise.resolve(null),
    ]);
    const commentItems: PostComment[] = [];
    for (const row of comments) commentItems.push(await this.toComment(row));
    return {
      id: post.id,
      caption: post.caption,
      imageUrl: post.imageUrl,
      author,
      trip,
      template,
      likeCount,
      commentCount,
      likedByMe,
      comments: commentItems,
      createdAt: post.createdAt,
    };
  }

  private async toComment(row: StoredPostComment): Promise<PostComment> {
    return {
      id: row.id,
      postId: row.postId,
      author: await this.trips.publicAuthor(row.userId),
      body: row.body,
      createdAt: row.createdAt,
    };
  }
}

async function defaultPostUpload(input: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  userId: string;
}) {
  try {
    return await uploadPostImage(input);
  } catch {
    if (env.nodeEnv === "production") {
      throw providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "Unggahan foto sedang tidak tersedia");
    }
    const fileId = `mem-${randomUUID()}`;
    return {
      url: `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80#${fileId}`,
      fileId,
    };
  }
}
