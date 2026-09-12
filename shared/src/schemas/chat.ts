import { z } from "zod";

export const sendMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const listMessagesQuerySchema = z.object({
  after: z.string().uuid().optional(),
  before: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const markReadSchema = z.object({
  lastReadMessageId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
