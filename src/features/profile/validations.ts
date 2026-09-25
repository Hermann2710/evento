import { z } from "zod";
import { nameField, passwordField, phoneField } from "@/features/auth/validations/auth";

/** Only these fields are editable: id, role, status, passwordHash and email verification are never accepted. */
export const profileSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  phoneNumber: phoneField,
  image: z.string().trim().max(1000),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(128, "too_long"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "passwords_mismatch", path: ["confirmPassword"] });

export type ProfileInput = z.infer<typeof profileSchema>;
