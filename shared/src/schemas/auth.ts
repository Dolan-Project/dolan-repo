import { z } from "zod";

export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  authReference: z.string(),
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]),
  status: z.enum(["ACTIVE", "RESTRICTED", "SUSPENDED"]),
  emailVerified: z.boolean(),
  profileComplete: z.boolean(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  domicile: z.string().nullable(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;
