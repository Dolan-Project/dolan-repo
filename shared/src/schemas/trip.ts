import { z } from "zod";

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
    planningPartySize: z.coerce
      .number()
      .int()
      .min(1, "Jumlah orang perencanaan minimal 1"),
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
        code: z.ZodIssueCode.custom,
        path: ["destinationCity"],
        message: "Tujuan wajib diisi kecuali jalur Bantu AI",
      });
    }
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      });
    }
    if (value.visibility === "PUBLIC") {
      const capacity = value.maxParticipants;
      if (capacity == null || Number.isNaN(capacity) || capacity < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxParticipants"],
          message: "Kapasitas publik termasuk host, minimal 2",
        });
      } else if (capacity < value.planningPartySize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxParticipants"],
          message: "Kapasitas tidak boleh lebih kecil dari jumlah perencanaan",
        });
      }
      if (!value.meetingPoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["meetingPoint"],
          message: "Titik temu publik wajib diisi",
        });
      } else if (
        value.meetingPoint.toLowerCase() === value.origin.toLowerCase()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["meetingPoint"],
          message: "Titik temu publik tidak boleh menyalin asal pribadi",
        });
      }
    }
  });

export const publishTripSchema = z.object({
  confirmPublish: z.literal(true, {
    errorMap: () => ({ message: "Konfirmasi publish wajib dicentang" }),
  }),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

export const updateTripSchema = createTripSchema;

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type PublishTripInput = z.infer<typeof publishTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
