import { z } from "zod";

export const searchQuerySchema = z.object({
  city: z.string().trim().min(2, "Masukkan minimal 2 karakter nama kota.").max(80),
  startDate: z.string().optional(),
  budget: z.enum(["hemat", "nyaman", "premium"]).optional(),
  filters: z.array(z.string()).max(5).default([]),
});
