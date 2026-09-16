import { z } from "zod";
import { instagramProfileUrl, tiktokProfileUrl } from "../lib/social-links.ts";

function optionalSocialUrl(
  parse: (value: string) => string | null,
  message: string,
) {
  return z
    .string()
    .optional()
    .nullable()
    .transform((value, ctx) => {
      const raw = value?.trim() ?? "";
      if (!raw) return null;
      const url = parse(raw);
      if (!url) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return url;
    });
}

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
  instagramUrl: optionalSocialUrl(
    instagramProfileUrl,
    "Isi username atau tautan Instagram yang valid",
  ),
  tiktokUrl: optionalSocialUrl(
    tiktokProfileUrl,
    "Isi username atau tautan TikTok yang valid",
  ),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
