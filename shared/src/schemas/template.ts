import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const useTemplateBodySchema = z
  .object({
    originLabel: z.string().trim().max(255).optional(),
    startDate: isoDate,
    endDate: isoDate.optional(),
    transportMode: z.string().trim().max(64).optional(),
    planningPartySize: z.number().int().min(1).max(50).default(1),
    budgetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    budgetBasis: z.enum(["PER_PERSON", "GROUP"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "endDate must be on or after startDate",
      });
    }
  });

export type UseTemplateBody = z.infer<typeof useTemplateBodySchema>;
