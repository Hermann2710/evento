import { relations } from "drizzle-orm";
import { accounts, users, verificationTokens } from "./schema/users";
import { categories, eventImages, events, organizers, ticketTypes } from "./schema/events";
import { bookingItems, bookings, payments, tickets } from "./schema/bookings";
import { comments, favorites, notifications, reviews } from "./schema/social";

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  tokens: many(verificationTokens),
  organizer: one(organizers, { fields: [users.id], references: [organizers.userId] }),
  bookings: many(bookings),
  tickets: many(tickets),
  favorites: many(favorites),
  reviews: many(reviews),
  comments: many(comments),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}));

export const organizersRelations = relations(organizers, ({ one, many }) => ({
  user: one(users, { fields: [organizers.userId], references: [users.id] }),
  events: many(events),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, { fields: [events.organizerId], references: [organizers.id] }),
  category: one(categories, { fields: [events.categoryId], references: [categories.id] }),
  images: many(eventImages),
  ticketTypes: many(ticketTypes),
  bookings: many(bookings),
  reviews: many(reviews),
  comments: many(comments),
  favorites: many(favorites),
}));

export const eventImagesRelations = relations(eventImages, ({ one }) => ({
  event: one(events, { fields: [eventImages.eventId], references: [events.id] }),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, { fields: [ticketTypes.eventId], references: [events.id] }),
  bookingItems: many(bookingItems),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  event: one(events, { fields: [bookings.eventId], references: [events.id] }),
  items: many(bookingItems),
  payments: many(payments),
  tickets: many(tickets),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one, many }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  ticketType: one(ticketTypes, { fields: [bookingItems.ticketTypeId], references: [ticketTypes.id] }),
  tickets: many(tickets),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, { fields: [tickets.bookingId], references: [bookings.id] }),
  bookingItem: one(bookingItems, { fields: [tickets.bookingItemId], references: [bookingItems.id] }),
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  event: one(events, { fields: [tickets.eventId], references: [events.id] }),
  ticketType: one(ticketTypes, { fields: [tickets.ticketTypeId], references: [ticketTypes.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  event: one(events, { fields: [favorites.eventId], references: [events.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  event: one(events, { fields: [reviews.eventId], references: [events.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  event: one(events, { fields: [comments.eventId], references: [events.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
