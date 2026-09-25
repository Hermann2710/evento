import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ORGANIZER", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "banned"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "canceled", "hidden"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "canceled",
  "failed",
  "expired",
  "refunded",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);
export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used", "canceled"]);
export const tokenTypeEnum = pgEnum("token_type", ["email_verification", "password_reset"]);
export const reportTargetEnum = pgEnum("report_target", ["user", "event", "comment", "review"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_confirmed",
  "payment_succeeded",
  "payment_failed",
  "event_canceled",
  "event_updated",
  "moderation",
  "system",
]);
export const webhookStatusEnum = pgEnum("webhook_status", ["received", "processed", "failed"]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type EventStatus = (typeof eventStatusEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type ReportTarget = (typeof reportTargetEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
