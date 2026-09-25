import { z } from "zod";
import { MAX_TICKETS_PER_BOOKING, MAX_TICKETS_PER_TYPE } from "@/lib/pricing";

export const createBookingSchema = z
  .object({
    eventId: z.uuid("invalid"),
    items: z
      .array(
        z.object({
          ticketTypeId: z.uuid("invalid"),
          quantity: z.number().int().min(1, "min_value").max(MAX_TICKETS_PER_TYPE, "max_value"),
        }),
      )
      .min(1, "ticket_selection_required")
      .max(20),
  })
  .refine((d) => new Set(d.items.map((i) => i.ticketTypeId)).size === d.items.length, { message: "invalid", path: ["items"] })
  .refine((d) => d.items.reduce((s, i) => s + i.quantity, 0) <= MAX_TICKETS_PER_BOOKING, {
    message: "max_value",
    path: ["items"],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
