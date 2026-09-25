import { z } from "zod";

export const REPORT_REASONS = ["spam", "abuse", "inappropriate", "fraud", "other"] as const;

export const reportSchema = z.object({
  targetType: z.enum(["user", "event", "comment", "review"]),
  targetId: z.uuid("invalid"),
  reason: z.enum(REPORT_REASONS, "required"),
  details: z.string().trim().max(1000, "too_long"),
});

export type ReportInput = z.infer<typeof reportSchema>;
