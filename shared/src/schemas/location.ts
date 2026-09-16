import { z } from "zod";

export const startLocationShareSchema = z.object({
  duration: z.enum(["ONE_HOUR", "UNTIL_TRIP_END"]).default("ONE_HOUR"),
  scope: z.enum(["TRIP_PRECISE", "PUBLIC_APPROXIMATE"]).default("TRIP_PRECISE"),
});

export const pingLocationSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracyMeters: z.number().positive().nullable().optional(),
});

export type StartLocationShareInput = z.infer<typeof startLocationShareSchema>;
