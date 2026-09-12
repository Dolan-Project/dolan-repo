import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .email("Format email belum tepat (contoh: nama@domain.com)");

const passwordField = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter");

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
