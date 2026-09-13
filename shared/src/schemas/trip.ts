import { z } from "zod";
import { paginationQuerySchema } from "./search.ts";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const money = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a decimal string");
const optionalCoordLat = z.number().min(-90).max(90).optional();
const optionalCoordLng = z.number().min(-180).max(180).optional();

function dateOrderIssue(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (startDate && endDate && endDate < startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "endDate must be on or after startDate",
    });
  }
}

export const createTripBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    timezone: z.string().trim().min(1).max(64).default("Asia/Jakarta"),
    originLabel: z.string().trim().max(255).optional(),
    originLatitude: optionalCoordLat,
    originLongitude: optionalCoordLng,
    destinationCity: z.string().trim().max(120).optional(),
    transportMode: z.string().trim().max(64).optional(),
    planningPartySize: z.number().int().min(1).max(50).default(1),
    budgetAmount: money.optional(),
    budgetBasis: z.enum(["PER_PERSON", "GROUP"]).optional(),
    maxParticipants: z.number().int().min(1).max(50).optional(),
    publicMeetingPointLabel: z.string().trim().max(255).optional(),
    publicMeetingPointLatitude: optionalCoordLat,
    publicMeetingPointLongitude: optionalCoordLng,
    preferences: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => dateOrderIssue(value.startDate, value.endDate, ctx));

export const updateTripBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    startDate: isoDate.nullable().optional(),
    endDate: isoDate.nullable().optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    originLabel: z.string().trim().max(255).nullable().optional(),
    originLatitude: z.number().min(-90).max(90).nullable().optional(),
    originLongitude: z.number().min(-180).max(180).nullable().optional(),
    destinationCity: z.string().trim().max(120).nullable().optional(),
    transportMode: z.string().trim().max(64).nullable().optional(),
    planningPartySize: z.number().int().min(1).max(50).optional(),
    budgetAmount: money.nullable().optional(),
    budgetBasis: z.enum(["PER_PERSON", "GROUP"]).optional(),
    maxParticipants: z.number().int().min(1).max(50).nullable().optional(),
    publicMeetingPointLabel: z.string().trim().max(255).nullable().optional(),
    publicMeetingPointLatitude: z.number().min(-90).max(90).nullable().optional(),
    publicMeetingPointLongitude: z.number().min(-180).max(180).nullable().optional(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })
  .superRefine((value, ctx) => dateOrderIssue(value.startDate, value.endDate, ctx));

export const publishTripBodySchema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  destinationCity: z.string().trim().max(120).optional(),
  maxParticipants: z.number().int().min(1).max(50).optional(),
  publicMeetingPointLabel: z.string().trim().max(255).optional(),
  publicMeetingPointLatitude: optionalCoordLat,
  publicMeetingPointLongitude: optionalCoordLng,
});

export const visibilityBodySchema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  destinationCity: z.string().trim().max(120).optional(),
  maxParticipants: z.number().int().min(1).max(50).optional(),
  publicMeetingPointLabel: z.string().trim().max(255).optional(),
  publicMeetingPointLatitude: optionalCoordLat,
  publicMeetingPointLongitude: optionalCoordLng,
});

export const joinRequestBodySchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const joinReviewBodySchema = z.object({
  decision: z.enum(["accept", "reject"]),
});

export const createCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

export const updateCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const idempotencyKeySchema = z.string().uuid();

export const myTripsQuerySchema = paginationQuerySchema.extend({
  role: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value) ?? "hosted",
    z.enum(["hosted", "joined", "pending"]).default("hosted"),
  ),
});

export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
export type PublishTripBody = z.infer<typeof publishTripBodySchema>;
export type VisibilityBody = z.infer<typeof visibilityBodySchema>;
export type JoinRequestBody = z.infer<typeof joinRequestBodySchema>;
export type JoinReviewBody = z.infer<typeof joinReviewBodySchema>;
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;
export type MyTripsQuery = z.infer<typeof myTripsQuerySchema>;

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belum valid");

export const createTripSchema = z
  .object({
    path: z.enum(["known", "ai"]),
    title: z.string().trim().min(3, "Judul minimal 3 karakter"),
    description: z.string().trim().max(2000).optional().default(""),
    origin: z.string().trim().min(1, "Asal wajib diisi"),
    destinationCity: z.string().trim().optional().default(""),
    startDate: dateField,
    endDate: dateField,
    transport: z.string().trim().min(1, "Moda transportasi wajib diisi"),
    planningPartySize: z.coerce.number().int().min(1, "Jumlah orang perencanaan minimal 1"),
    budgetAmount: z.coerce.number().positive("Budget harus lebih dari 0"),
    budgetBasis: z.enum(["PER_PERSON", "GROUP"]),
    activityPrefs: z.array(z.string()).optional().default([]),
    lodgingPref: z.string().trim().optional().default(""),
    visibility: z.enum(["PRIVATE", "PUBLIC"]),
    maxParticipants: z.coerce.number().int().optional(),
    meetingPoint: z.string().trim().optional().default(""),
    companionNote: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.path === "known" && !value.destinationCity) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationCity"],
        message: "Tujuan wajib diisi kecuali jalur Bantu AI",
      });
    }
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      });
    }
    if (value.visibility === "PUBLIC") {
      const capacity = value.maxParticipants;
      if (capacity == null || Number.isNaN(capacity) || capacity < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["maxParticipants"],
          message: "Kapasitas publik termasuk host, minimal 2",
        });
      } else if (capacity < value.planningPartySize) {
        ctx.addIssue({
          code: "custom",
          path: ["maxParticipants"],
          message: "Kapasitas tidak boleh lebih kecil dari jumlah perencanaan",
        });
      }
      if (!value.meetingPoint) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingPoint"],
          message: "Titik temu publik wajib diisi",
        });
      } else if (value.meetingPoint.toLowerCase() === value.origin.toLowerCase()) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingPoint"],
          message: "Titik temu publik tidak boleh menyalin asal pribadi",
        });
      }
    }
  });

export const publishTripSchema = z.object({
  confirmPublish: z.literal(true),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

export const updateTripSchema = createTripSchema;

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type PublishTripInput = z.infer<typeof publishTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
