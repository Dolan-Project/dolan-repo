import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .email("Format email belum tepat (contoh: nama@domain.com)");

const passwordField = z.string().min(8, "Kata sandi minimal 8 karakter");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Kata sandi wajib diisi"),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Ulangi kata sandi"),
    username: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || (/^[a-z0-9._]+$/i.test(value) && value.length >= 3 && value.length <= 30), {
        message: "Username 3–30 karakter, hanya huruf, angka, titik, atau underscore",
      }),
    displayName: z.string().trim().max(80).optional(),
    next: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Ulangi kata sandi tidak sama",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Tautan reset tidak valid"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Ulangi kata sandi"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Ulangi kata sandi tidak sama",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Tautan verifikasi tidak valid"),
});

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
