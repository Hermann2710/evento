"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookings, eventImages, events, payments, tickets, ticketTypes } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import { isAllowedImageUrl } from "@/lib/cloudinary";
import { toMinor, zonedLocalToUtc } from "@/lib/format";
import { DomainError, errorFromUnknown, fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { randomCode, slugify } from "@/lib/utils";
import { cancelPendingBookingTx, refundBookingTx } from "@/features/booking/services/booking-service";
import { getPaymentProvider } from "@/features/payments/providers";
import { notifyMany } from "@/features/notifications/services/notify";
import { eventFormSchema, type EventFormValues } from "../validations/event-form";
import { getOrganizerForUser, getOwnedEvent } from "../services/ownership";

async function requireOrganizerUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && (user.role === "ORGANIZER" || user.role === "ADMIN") ? user : null;
}

function toDates(values: EventFormValues) {
  return {
    startDate: zonedLocalToUtc(values.startDate, values.timezone)!,
    endDate: zonedLocalToUtc(values.endDate, values.timezone)!,
  };
}

function ticketRow(tt: EventFormValues["ticketTypes"][number], values: EventFormValues) {
  return {
    name: tt.name,
    description: tt.description || null,
    price: toMinor(tt.price),
    currency: values.currency,
    quantity: tt.quantity,
    salesStart: tt.salesStart ? zonedLocalToUtc(tt.salesStart, values.timezone) : null,
    salesEnd: tt.salesEnd ? zonedLocalToUtc(tt.salesEnd, values.timezone) : null,
  };
}

function validateImages(values: EventFormValues, userId: string, previous: string[] = []): boolean {
  const urls = [values.coverImage, ...values.gallery].filter(Boolean);
  return urls.every((url) => isAllowedImageUrl(url, userId, previous.includes(url) ? url : null));
}

const revalidateEvents = () => revalidatePath("/[locale]", "layout");

async function holderIds(eventId: string): Promise<string[]> {
  const rows = await db.selectDistinct({ userId: bookings.userId }).from(bookings).where(and(eq(bookings.eventId, eventId), eq(bookings.status, "confirmed")));
  return rows.map((r) => r.userId);
}

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireOrganizerUser();
  if (!user) return fail("forbidden");
  const organizer = await getOrganizerForUser(user.id);
  if (!organizer) return fail("forbidden");
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const values = parsed.data;
  if (!validateImages(values, user.id)) return fail("invalid_image", { coverImage: "invalid_image" });

  const slug = `${slugify(values.title) || "event"}-${randomCode(5).toLowerCase()}`;
  const id = await db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        organizerId: organizer.id,
        categoryId: values.categoryId,
        title: values.title,
        slug,
        description: values.description,
        coverImage: values.coverImage || null,
        location: values.location,
        city: values.city,
        country: values.country,
        timezone: values.timezone,
        capacity: values.capacity,
        status: "draft",
        ...toDates(values),
      })
      .returning({ id: events.id });
    await tx.insert(ticketTypes).values(values.ticketTypes.map((tt) => ({ ...ticketRow(tt, values), eventId: event.id })));
    if (values.gallery.length) {
      await tx.insert(eventImages).values(values.gallery.map((url, position) => ({ eventId: event.id, url, position })));
    }
    return event.id;
  });
  revalidateEvents();
  return ok({ id, slug });
}

export async function updateEventAction(eventId: unknown, input: unknown): Promise<ActionResult<{ slug: string }>> {
  const user = await requireOrganizerUser();
  if (!user) return fail("forbidden");
  const id = z.uuid().safeParse(eventId);
  if (!id.success) return fail("invalid_input");
  const event = await getOwnedEvent(user, id.data);
  if (!event) return fail("not_found");
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const values = parsed.data;

  const previousImages = [event.coverImage, ...(await db.select({ url: eventImages.url }).from(eventImages).where(eq(eventImages.eventId, event.id))).map((r) => r.url)].filter((u): u is string => Boolean(u));
  if (!validateImages(values, user.id, previousImages)) return fail("invalid_image", { coverImage: "invalid_image" });

  const dates = toDates(values);
  try {
    await db.transaction(async (tx) => {
      const existing = await tx.select().from(ticketTypes).where(eq(ticketTypes.eventId, event.id));
      const sold = existing.some((t) => t.soldQuantity > 0);
      if (sold && existing.some((t) => t.currency !== values.currency)) throw new DomainError("has_bookings");

      const keepIds = new Set(values.ticketTypes.map((t) => t.id).filter(Boolean));
      for (const old of existing) {
        if (!keepIds.has(old.id)) {
          if (old.soldQuantity > 0) throw new DomainError("has_bookings");
          await tx.delete(ticketTypes).where(eq(ticketTypes.id, old.id));
        }
      }
      for (const tt of values.ticketTypes) {
        const current = existing.find((e) => e.id === tt.id);
        if (current) {
          if (tt.quantity < current.soldQuantity) throw new DomainError("capacity_exceeded");
          await tx.update(ticketTypes).set(ticketRow(tt, values)).where(eq(ticketTypes.id, current.id));
        } else {
          await tx.insert(ticketTypes).values({ ...ticketRow(tt, values), eventId: event.id });
        }
      }
      await tx
        .update(events)
        .set({
          categoryId: values.categoryId,
          title: values.title,
          description: values.description,
          coverImage: values.coverImage || null,
          location: values.location,
          city: values.city,
          country: values.country,
          timezone: values.timezone,
          capacity: values.capacity,
          ...dates,
        })
        .where(eq(events.id, event.id));
      await tx.delete(eventImages).where(eq(eventImages.eventId, event.id));
      if (values.gallery.length) {
        await tx.insert(eventImages).values(values.gallery.map((url, position) => ({ eventId: event.id, url, position })));
      }
    });
  } catch (error) {
    return fail(errorFromUnknown(error));
  }

  const changed = event.startDate.getTime() !== dates.startDate.getTime() || event.location !== values.location || event.city !== values.city;
  if (changed && event.status === "published") {
    await notifyMany(await holderIds(event.id), { type: "event_updated", key: "eventUpdated", params: { event: values.title }, link: `/events/${event.slug}`, email: true });
  }
  revalidateEvents();
  return ok({ slug: event.slug });
}

export async function setEventStatusAction(eventId: unknown, action: unknown): Promise<ActionResult> {
  const user = await requireOrganizerUser();
  if (!user) return fail("forbidden");
  const input = z.object({ id: z.uuid(), action: z.enum(["publish", "unpublish", "cancel", "delete"]) }).safeParse({ id: eventId, action });
  if (!input.success) return fail("invalid_input");
  const event = await getOwnedEvent(user, input.data.id);
  if (!event) return fail("not_found");
  if (event.status === "hidden" && user.role !== "ADMIN") return fail("forbidden");

  const [anyBooking] = await db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.eventId, event.id), ne(bookings.status, "expired"), ne(bookings.status, "failed"), ne(bookings.status, "canceled"))).limit(1);

  switch (input.data.action) {
    case "publish": {
      if (event.status !== "draft") return fail("invalid_input");
      const [tt] = await db.select({ id: ticketTypes.id }).from(ticketTypes).where(eq(ticketTypes.eventId, event.id)).limit(1);
      if (!tt) return fail("invalid_input");
      await db.update(events).set({ status: "published" }).where(eq(events.id, event.id));
      break;
    }
    case "unpublish": {
      if (event.status !== "published") return fail("invalid_input");
      if (anyBooking) return fail("has_bookings");
      await db.update(events).set({ status: "draft" }).where(eq(events.id, event.id));
      break;
    }
    case "delete": {
      if (anyBooking) return fail("has_bookings");
      await db.delete(events).where(eq(events.id, event.id));
      break;
    }
    case "cancel": {
      if (event.status === "canceled") return ok();
      const holders = await holderIds(event.id);
      const affected = await db.select({ id: bookings.id, status: bookings.status }).from(bookings).where(and(eq(bookings.eventId, event.id), inArray(bookings.status, ["pending", "confirmed"])));
      for (const b of affected) {
        await db.transaction(async (tx) => {
          if (b.status === "pending") return void (await cancelPendingBookingTx(tx, b.id, "canceled"));
          const paid = await tx.select().from(payments).where(and(eq(payments.bookingId, b.id), eq(payments.status, "succeeded")));
          for (const p of paid) {
            await getPaymentProvider(p.provider)?.refund(p.providerPaymentId, p.amount);
            await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, p.id));
          }
          await refundBookingTx(tx, b.id);
        });
      }
      await db.update(tickets).set({ status: "canceled" }).where(eq(tickets.eventId, event.id));
      await db.update(events).set({ status: "canceled" }).where(eq(events.id, event.id));
      await notifyMany(holders, { type: "event_canceled", key: "eventCanceled", params: { event: event.title }, link: `/events/${event.slug}`, email: true });
      break;
    }
  }
  revalidateEvents();
  return ok();
}
