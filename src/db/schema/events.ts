import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { eventStatusEnum } from "./enums";
import { timestamps, users } from "./users";

export const organizers = pgTable(
  "organizers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    image: text("image"),
    website: text("website"),
    ...timestamps,
  },
  (t) => [uniqueIndex("organizers_user_idx").on(t.userId), uniqueIndex("organizers_slug_idx").on(t.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    title: varchar("title", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description").notNull(),
    coverImage: text("cover_image"),
    location: varchar("location", { length: 200 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    status: eventStatusEnum("status").notNull().default("draft"),
    capacity: integer("capacity").notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("events_slug_idx").on(t.slug),
    index("events_status_start_idx").on(t.status, t.startDate),
    index("events_category_idx").on(t.categoryId),
    index("events_organizer_idx").on(t.organizerId),
    index("events_city_idx").on(t.city),
    check("events_dates_check", sql`${t.endDate} >= ${t.startDate}`),
    check("events_capacity_check", sql`${t.capacity} > 0`),
  ],
);

export const eventImages = pgTable(
  "event_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("event_images_event_idx").on(t.eventId)],
);

/** Prices are stored in minor units (x100) to avoid floating point errors. */
export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    quantity: integer("quantity").notNull(),
    soldQuantity: integer("sold_quantity").notNull().default(0),
    salesStart: timestamp("sales_start", { withTimezone: true }),
    salesEnd: timestamp("sales_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("ticket_types_event_idx").on(t.eventId),
    check("ticket_types_sold_check", sql`${t.soldQuantity} >= 0 AND ${t.soldQuantity} <= ${t.quantity}`),
    check("ticket_types_price_check", sql`${t.price} >= 0`),
  ],
);
