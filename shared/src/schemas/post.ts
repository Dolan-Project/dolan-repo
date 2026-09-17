import { z } from "zod";
import { paginationQuerySchema } from "./search.ts";

export const createPostFieldsSchema = z.object({
  caption: z.string().trim().max(2200).default(""),
  tripId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
});

export const createPostCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const listPostsQuerySchema = paginationQuerySchema;

export type CreatePostFields = z.infer<typeof createPostFieldsSchema>;
export type CreatePostCommentBody = z.infer<typeof createPostCommentBodySchema>;
