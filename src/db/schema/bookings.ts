import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { bookingStatusEnum, paymentStatusEnum, ticketStatusEnum, webhookStatusEnum } from "./enums";
import { events, ticketTypes } from "./events";
import { timestamps, users } from "./users";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: bookingStatusEnum("status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    fees: integer("fees").notNull(),
    total: integer("total").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bookings_user_idx").on(t.userId, t.createdAt),
    index("bookings_event_idx").on(t.eventId),
    index("bookings_status_expires_idx").on(t.status, t.expiresAt),
  ],
);

export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
  },
  (t) => [index("booking_items_booking_idx").on(t.bookingId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 128 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    uniqueIndex("payments_provider_ref_idx").on(t.provider, t.providerPaymentId),
    index("payments_status_idx").on(t.status),
  ],
);

/** Webhook log used for idempotency, retries and auditing. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 32 }).notNull(),
    eventId: varchar("event_id", { length: 128 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookStatusEnum("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    bookingItemId: uuid("booking_item_id")
      .notNull()
      .references(() => bookingItems.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    ticketNumber: varchar("ticket_number", { length: 32 }).notNull(),
    qrCode: text("qr_code").notNull(),
    status: ticketStatusEnum("status").notNull().default("valid"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tickets_number_idx").on(t.ticketNumber),
    index("tickets_user_idx").on(t.userId, t.createdAt),
    index("tickets_event_idx").on(t.eventId),
    index("tickets_booking_idx").on(t.bookingId),
  ],
);
