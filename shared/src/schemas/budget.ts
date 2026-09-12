import { z } from "zod";

export const moneyStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid money amount");

export const budgetItemInputSchema = z.object({
  category: z.string().min(1),
  label: z.string().min(1),
  quantity: moneyStringSchema,
  unit: z.string().min(1),
  unitCostLow: moneyStringSchema,
  unitCostHigh: moneyStringSchema,
  sourceType: z.string().min(1),
  sourceReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const budgetItemSchema = budgetItemInputSchema.extend({
  id: z.string().uuid(),
  subtotalLow: moneyStringSchema,
  subtotalHigh: moneyStringSchema,
  checkedAt: z.string().nullable(),
});

export const budgetSummarySchema = z.object({
  currency: z.literal("IDR"),
  basis: z.enum(["PER_PERSON", "GROUP"]),
  totalLow: moneyStringSchema,
  totalHigh: moneyStringSchema,
  items: z.array(budgetItemSchema),
});

export type BudgetItemInput = z.infer<typeof budgetItemInputSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type BudgetSummary = z.infer<typeof budgetSummarySchema>;
