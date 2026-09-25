"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, events, reports, reviews, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { reportSchema, type ReportInput } from "./validations";

async function targetExists(type: ReportInput["targetType"], id: string): Promise<boolean> {
  const table = { user: users, event: events, comment: comments, review: reviews }[type];
  const [row] = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  return Boolean(row);
}

export async function createReportAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!rateLimit(`report:${user.id}`, 10, 60 * 60_000).ok) return fail("rate_limited");
  const data = parsed.data;
  if (!(await targetExists(data.targetType, data.targetId))) return fail("not_found");

  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.reporterId, user.id), eq(reports.targetType, data.targetType), eq(reports.targetId, data.targetId), eq(reports.status, "open")))
    .limit(1);
  if (!existing) {
    await db.insert(reports).values({ reporterId: user.id, ...data, details: data.details || null });
  }
  return ok();
}
