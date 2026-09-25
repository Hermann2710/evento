import { z } from "zod";

export const reviewSchema = z.object({
  eventId: z.uuid("invalid"),
  rating: z.number("rating_range").int("rating_range").min(1, "rating_range").max(5, "rating_range"),
  content: z.string().trim().min(3, "too_short").max(2000, "too_long"),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
