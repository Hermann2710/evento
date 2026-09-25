import { z } from "zod";

const PHONE_RE = /^\+?[0-9\s().-]{6,20}$/;

export const emailField = z.string().trim().min(1, "required").max(255, "too_long").email("invalid_email");

export const passwordField = z
  .string()
  .min(8, "password_too_short")
  .max(128, "too_long")
  .regex(/[A-Za-z]/, "password_weak")
  .regex(/[0-9]/, "password_weak");

export const nameField = z.string().trim().min(1, "required").max(100, "too_long");

export const phoneField = z
  .string()
  .trim()
  .max(32, "too_long")
  .refine((v) => v === "" || PHONE_RE.test(v), "invalid_phone");

export const registerSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    email: emailField,
    phoneNumber: phoneField,
    password: passwordField,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "passwords_mismatch", path: ["confirmPassword"] });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "required").max(128, "too_long"),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "invalid"),
    password: passwordField,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "passwords_mismatch", path: ["confirmPassword"] });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
