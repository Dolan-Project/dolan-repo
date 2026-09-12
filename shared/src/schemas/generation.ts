import { z } from "zod";
import { budgetItemInputSchema } from "./budget.ts";

export const placeCandidateSchema = z.object({
  googlePlaceId: z.string().min(3),
  name: z.string().min(1),
  city: z.string().nullable(),
});

export const generatedStopSchema = z.object({
  sequence: z.number().int().positive(),
  place: placeCandidateSchema.nullable(),
  customTitle: z.string().nullable(),
  activityType: z.string().min(1),
  startTime: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  travelDurationMinutes: z.number().int().nonnegative().nullable(),
  notes: z.string().nullable(),
  isLocked: z.boolean(),
});

export const generatedDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().min(1),
  title: z.string().nullable(),
  stops: z.array(generatedStopSchema).min(1),
});

export const geminiItinerarySchema = z.object({
  summary: z.string().nullable(),
  assumptions: z.array(z.string()),
  days: z.array(generatedDaySchema).min(1),
  budgetItems: z.array(budgetItemInputSchema),
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
