"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isAllowedImageUrl } from "@/lib/cloudinary";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { changePasswordSchema, profileSchema } from "./validations";

export async function updateProfileAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const { firstName, lastName, phoneNumber, image } = parsed.data;
  if (image && !isAllowedImageUrl(image, user.id, user.image)) return fail("invalid_image", { image: "invalid_image" });

  // Explicit whitelist of updatable columns (mass-assignment protection).
  await db
    .update(users)
    .set({ firstName, lastName, phoneNumber: phoneNumber || null, image: image || null })
    .where(eq(users.id, user.id));
  revalidatePath("/[locale]", "layout");
  return ok();
}

export async function changePasswordAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!rateLimit(`password:${user.id}`, 5, 15 * 60_000).ok) return fail("rate_limited");

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (row?.passwordHash && !(await verifyPassword(row.passwordHash, parsed.data.currentPassword))) {
    return fail("wrong_password", { currentPassword: "wrong_password" });
  }
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.newPassword) }).where(eq(users.id, user.id));
  return ok();
}
