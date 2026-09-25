import { z } from "zod";

export const organizerProfileSchema = z.object({
  name: z.string().trim().min(2, "too_short").max(120, "too_long"),
  description: z.string().trim().max(2000, "too_long"),
  website: z
    .string()
    .trim()
    .max(300, "too_long")
    .refine((v) => v === "" || /^https?:\/\/[^\s]+$/.test(v), "invalid_url"),
  image: z.string().trim().max(1000),
});

export type OrganizerProfileInput = z.infer<typeof organizerProfileSchema>;
