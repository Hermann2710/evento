"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, comments, events, reports, reviews, users } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { slugify } from "@/lib/utils";
import { notify } from "@/features/notifications/services/notify";

async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}

const uuid = z.uuid();
const refresh = () => revalidatePath("/[locale]", "layout");

export async function setUserStatusAction(userId: string, status: "active" | "suspended" | "banned"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  const input = z.object({ id: uuid, status: z.enum(["active", "suspended", "banned"]) }).safeParse({ id: userId, status });
  if (!input.success) return fail("invalid_input");
  if (input.data.id === admin.id) return fail("cannot_moderate_self");
  const updated = await db.update(users).set({ status: input.data.status }).where(eq(users.id, input.data.id)).returning({ id: users.id });
  if (!updated.length) return fail("not_found");
  await notify({ userId: input.data.id, type: "moderation", key: "accountStatus", params: { status: input.data.status } });
  refresh();
  return ok();
}

export async function setUserRoleAction(userId: string, role: "USER" | "ORGANIZER" | "ADMIN"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  const input = z.object({ id: uuid, role: z.enum(["USER", "ORGANIZER", "ADMIN"]) }).safeParse({ id: userId, role });
  if (!input.success) return fail("invalid_input");
  if (input.data.id === admin.id) return fail("cannot_moderate_self");
  await db.update(users).set({ role: input.data.role }).where(eq(users.id, input.data.id));
  refresh();
  return ok();
}

export async function setEventHiddenAction(eventId: string, hidden: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(eventId).success) return fail("invalid_input");
  const [event] = await db.update(events).set({ status: hidden ? "hidden" : "published" }).where(eq(events.id, eventId)).returning({ title: events.title, organizerId: events.organizerId });
  if (!event) return fail("not_found");
  refresh();
  return ok();
}

export async function toggleFeaturedAction(eventId: string, featured: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(eventId).success) return fail("invalid_input");
  await db.update(events).set({ isFeatured: featured }).where(eq(events.id, eventId));
  refresh();
  return ok();
}

export async function setReviewHiddenAction(reviewId: string, hidden: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(reviewId).success) return fail("invalid_input");
  const [row] = await db.update(reviews).set({ hidden }).where(eq(reviews.id, reviewId)).returning({ userId: reviews.userId });
  if (!row) return fail("not_found");
  if (hidden) await notify({ userId: row.userId, type: "moderation", key: "contentHidden", params: {} });
  refresh();
  return ok();
}

export async function setCommentHiddenAction(commentId: string, hidden: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(commentId).success) return fail("invalid_input");
  const [row] = await db.update(comments).set({ hidden }).where(eq(comments.id, commentId)).returning({ userId: comments.userId });
  if (!row) return fail("not_found");
  if (hidden) await notify({ userId: row.userId, type: "moderation", key: "contentHidden", params: {} });
  refresh();
  return ok();
}

/** Resolves a report; with `enforce`, the reported content is hidden (or the user suspended). */
export async function resolveReportAction(reportId: string, status: "resolved" | "dismissed", enforce: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(reportId).success) return fail("invalid_input");
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!report) return fail("not_found");
  if (enforce && status === "resolved") {
    const result =
      report.targetType === "comment" ? await setCommentHiddenAction(report.targetId, true)
      : report.targetType === "review" ? await setReviewHiddenAction(report.targetId, true)
      : report.targetType === "event" ? await setEventHiddenAction(report.targetId, true)
      : await setUserStatusAction(report.targetId, "suspended");
    if (!result.ok && result.error !== "not_found") return result;
  }
  await db.update(reports).set({ status, resolvedById: admin.id, resolvedAt: new Date() }).where(eq(reports.id, reportId));
  refresh();
  return ok();
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "too_short").max(80, "too_long"),
  description: z.string().trim().max(500, "too_long"),
});

export async function saveCategoryAction(categoryId: string | null, values: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const data = { name: parsed.data.name, description: parsed.data.description || null, slug: slugify(parsed.data.name) };
  try {
    if (categoryId) {
      if (!uuid.safeParse(categoryId).success) return fail("invalid_input");
      await db.update(categories).set(data).where(eq(categories.id, categoryId));
    } else {
      await db.insert(categories).values(data);
    }
  } catch {
    return fail("invalid_input", { name: "slug_taken" });
  }
  refresh();
  return ok();
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail("forbidden");
  if (!uuid.safeParse(categoryId).success) return fail("invalid_input");
  await db.delete(categories).where(eq(categories.id, categoryId));
  refresh();
  return ok();
}
