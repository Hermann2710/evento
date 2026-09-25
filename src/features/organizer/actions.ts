"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organizers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isAllowedImageUrl } from "@/lib/cloudinary";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { randomCode, slugify } from "@/lib/utils";
import { organizerProfileSchema } from "./validations";

/** Creates or updates the organizer profile. Creating one upgrades a USER to ORGANIZER. */
export async function saveOrganizerProfileAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = organizerProfileSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const data = parsed.data;

  const [existing] = await db.select().from(organizers).where(eq(organizers.userId, user.id)).limit(1);
  if (data.image && !isAllowedImageUrl(data.image, user.id, existing?.image)) return fail("invalid_image", { image: "invalid_image" });

  const values_ = {
    name: data.name,
    description: data.description || null,
    website: data.website || null,
    image: data.image || null,
  };

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(organizers).set(values_).where(eq(organizers.id, existing.id));
    } else {
      await tx.insert(organizers).values({ ...values_, userId: user.id, slug: `${slugify(data.name) || "organizer"}-${randomCode(5).toLowerCase()}` });
      if (user.role === "USER") await tx.update(users).set({ role: "ORGANIZER" }).where(eq(users.id, user.id));
    }
  });
  revalidatePath("/[locale]", "layout");
  return ok();
}
