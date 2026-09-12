import { z } from "zod";

export const profileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(24, "Username maksimal 24 karakter")
    .regex(
      /^[a-z0-9._]+$/,
      "Username hanya huruf kecil, angka, titik, atau underscore",
    ),
  displayName: z.string().trim().min(1, "Nama tampilan wajib diisi").max(80),
  domicile: z.string().trim().min(1, "Domisili wajib diisi"),
  bio: z
    .string()
    .max(160, "Bio maksimal 160 karakter")
    .optional()
    .nullable(),
  coverCaption: z
    .string()
    .max(160, "Caption maksimal 160 karakter")
    .optional()
    .nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
