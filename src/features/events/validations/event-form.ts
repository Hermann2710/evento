import { z } from "zod";
import { isValidTimeZone, zonedLocalToUtc } from "@/lib/format";
import { SUPPORTED_CURRENCIES } from "@/lib/pricing";

export const TIMEZONES = [
  "Africa/Douala",
  "Africa/Lagos",
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Kinshasa",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Toronto",
  "UTC",
] as const;

export const ticketTypeInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "required").max(100, "too_long"),
  description: z.string().trim().max(500, "too_long"),
  price: z.number("invalid_number").min(0, "min_value").max(10_000_000, "max_value"),
  quantity: z.number("invalid_number").int("invalid_number").min(1, "min_value").max(100_000, "max_value"),
  salesStart: z.string(),
  salesEnd: z.string(),
});

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(3, "too_short").max(160, "too_long"),
    description: z.string().trim().min(20, "too_short").max(10_000, "too_long"),
    categoryId: z.string().uuid("required"),
    coverImage: z.string().trim().max(1000),
    gallery: z.array(z.string().url("invalid_url")).max(8, "max_value"),
    location: z.string().trim().min(2, "required").max(200, "too_long"),
    city: z.string().trim().min(2, "required").max(100, "too_long"),
    country: z.string().trim().min(2, "required").max(100, "too_long"),
    startDate: z.string().min(1, "required"),
    endDate: z.string().min(1, "required"),
    timezone: z.string().refine(isValidTimeZone, "invalid_timezone"),
    capacity: z.number("invalid_number").int("invalid_number").min(1, "min_value").max(1_000_000, "max_value"),
    currency: z.enum(SUPPORTED_CURRENCIES),
    ticketTypes: z.array(ticketTypeInputSchema).min(1, "ticket_types_required").max(10, "max_value"),
  })
  .superRefine((d, ctx) => {
    if (!isValidTimeZone(d.timezone)) return;
    const start = zonedLocalToUtc(d.startDate, d.timezone);
    const end = zonedLocalToUtc(d.endDate, d.timezone);
    if (!start) ctx.addIssue({ code: "custom", path: ["startDate"], message: "invalid_date" });
    if (!end) ctx.addIssue({ code: "custom", path: ["endDate"], message: "invalid_date" });
    if (start && end && end.getTime() < start.getTime()) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "end_before_start" });
    }
    const totalQty = d.ticketTypes.reduce((s, t) => s + t.quantity, 0);
    if (totalQty > d.capacity) ctx.addIssue({ code: "custom", path: ["capacity"], message: "capacity_exceeded" });
    d.ticketTypes.forEach((tt, i) => {
      const ss = tt.salesStart ? zonedLocalToUtc(tt.salesStart, d.timezone) : null;
      const se = tt.salesEnd ? zonedLocalToUtc(tt.salesEnd, d.timezone) : null;
      if (ss && se && se < ss) ctx.addIssue({ code: "custom", path: ["ticketTypes", i, "salesEnd"], message: "end_before_start" });
    });
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeInputSchema>;
