import { z } from "zod";
import { budgetItemInputSchema } from "./budget.ts";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Waktu harus menggunakan format HH:mm");

export const editableStopInputSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  googlePlaceId: z.string().min(3).nullable(),
  customTitle: z.string().trim().min(1).nullable(),
  activityType: z.string().trim().min(1),
  startTime: timeSchema.nullable(),
  durationMinutes: z.number().int().min(15).max(1440),
  travelDurationMinutes: z.number().int().nonnegative().nullable(),
  notes: z.string().trim().max(1000).nullable(),
  isLocked: z.boolean(),
});

export const editableDayInputSchema = z.object({
  id: z.string().min(1),
  dayNumber: z.number().int().positive(),
  date: z.iso.date(),
  title: z.string().trim().max(120).nullable(),
  stops: z.array(editableStopInputSchema).min(1),
});

export const saveItineraryVersionSchema = z.object({
  baseVersionId: z.string().min(1),
  summary: z.string().trim().max(500).nullable(),
  days: z.array(editableDayInputSchema).min(1),
  budgetItems: z.array(budgetItemInputSchema),
});

export const selectItineraryVersionSchema = z.object({
  versionId: z.string().min(1),
});

export const reorderStopsSchema = z.object({
  dayId: z.string().min(1),
  orderedStopIds: z.array(z.string().min(1)).min(1),
});

export const checklistMutationSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  dueDate: z.iso.date().nullable(),
  isCompleted: z.boolean().default(false),
});

export type SaveItineraryVersionInput = z.infer<typeof saveItineraryVersionSchema>;
export type ChecklistMutationInput = z.infer<typeof checklistMutationSchema>;
