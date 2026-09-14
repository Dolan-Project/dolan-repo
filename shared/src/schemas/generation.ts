import { z } from "zod";
import { budgetItemInputSchema, moneyStringSchema } from "./budget.ts";

const moneyish = z.union([
  moneyStringSchema,
  z.number().transform((value) => value.toFixed(2)),
]);

export const placeCandidateSchema = z.object({
  googlePlaceId: z.string().min(1).optional().default("unknown"),
  name: z.string().min(1),
  city: z.string().nullable().optional().default(null),
});

export const generatedStopSchema = z.object({
  sequence: z.coerce.number().int().positive(),
  place: placeCandidateSchema.nullable(),
  customTitle: z.string().nullable().optional().default(null),
  activityType: z.string().min(1).optional().default("wisata"),
  startTime: z.string().nullable().optional().default(null),
  durationMinutes: z.coerce.number().int().positive(),
  travelDurationMinutes: z.coerce.number().int().nonnegative().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
  isLocked: z.boolean().optional().default(false),
});

export const generatedDaySchema = z.object({
  dayNumber: z.coerce.number().int().positive(),
  date: z.string().min(1),
  title: z.string().nullable().optional().default(null),
  stops: z.array(generatedStopSchema).min(1),
});

const generatedBudgetItemSchema = budgetItemInputSchema.extend({
  quantity: moneyish,
  unitCostLow: moneyish,
  unitCostHigh: moneyish,
  sourceType: z.string().min(1).optional().default("estimate"),
});

export const geminiItinerarySchema = z.object({
  summary: z.string().nullable().optional().default(null),
  assumptions: z.array(z.string()).optional().default([]),
  days: z.array(generatedDaySchema).min(1),
  budgetItems: z.array(generatedBudgetItemSchema).optional().default([]),
});

export const generationJobSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string(),
  requestedBy: z.string().uuid(),
  type: z.enum(["GENERATE_ITINERARY", "REGENERATE_ITINERARY"]),
  status: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "FAILED"]),
  attemptCount: z.number().int().nonnegative(),
  resultVersionId: z.string().uuid().nullable(),
  selectedVersionId: z.string().uuid().nullable(),
  errorCode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const enqueueGenerationSchema = z.object({
  type: z.enum(["GENERATE_ITINERARY", "REGENERATE_ITINERARY"]).default("GENERATE_ITINERARY"),
  idempotencyKey: z.string().uuid(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export type GeminiItinerary = z.infer<typeof geminiItinerarySchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;
export type EnqueueGeneration = z.infer<typeof enqueueGenerationSchema>;
