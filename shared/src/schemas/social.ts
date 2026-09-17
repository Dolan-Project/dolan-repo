import { z } from "zod";

export const attendanceBodySchema = z.object({
  confirmed: z.boolean().default(true),
  /** Host marks a participant's attendance; omit to confirm own attendance. */
  targetUserId: z.string().uuid().optional(),
});

export const createReviewBodySchema = z.object({
  tripId: z.string().uuid(),
  communication: z.number().int().min(1).max(5),
  attitude: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const createReportBodySchema = z.object({
  targetType: z.enum(["user", "trip", "comment", "message", "review"]),
  targetId: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(1).max(120),
});

export const moderateReportBodySchema = z.object({
  action: z.enum(["hide", "dismiss"]),
  reason: z.string().trim().max(500).optional(),
});
