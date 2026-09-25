import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, comments, events, organizers, payments, reports, reviews, users, type ReportStatus } from "@/db/schema";

export const ADMIN_PAGE_SIZE = 20;
const offset = (page: number) => (page - 1) * ADMIN_PAGE_SIZE;
const like = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

export async function adminStats() {
  const [[u], [o], eventsByStatus, [b], revenue, [p], [r]] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(organizers),
    db.select({ status: events.status, total: count() }).from(events).groupBy(events.status),
    db.select({ total: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
    db.select({ currency: payments.currency, amount: sql<number>`sum(${payments.amount})::bigint` }).from(payments).where(eq(payments.status, "succeeded")).groupBy(payments.currency),
    db.select({ total: count() }).from(payments),
    db.select({ total: count() }).from(reports).where(eq(reports.status, "open")),
  ]);
  return {
    users: u.total,
    organizers: o.total,
    events: Object.fromEntries(eventsByStatus.map((e) => [e.status, e.total])) as Record<string, number>,
    confirmedBookings: b.total,
    revenue: revenue.map((x) => ({ currency: x.currency, amount: Number(x.amount) })),
    payments: p.total,
    openReports: r.total,
  };
}

async function paged<T>(rows: Promise<T[]>, total: Promise<Array<{ total: number }>>) {
  const [items, [t]] = await Promise.all([rows, total]);
  return { items, total: t?.total ?? 0 };
}

export function listUsers(q: string | undefined, page: number) {
  const where: SQL | undefined = q ? or(ilike(users.email, like(q)), ilike(users.firstName, like(q)), ilike(users.lastName, like(q))) : undefined;
  return paged(
    db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role, status: users.status, isEmailVerified: users.isEmailVerified, createdAt: users.createdAt })
      .from(users).where(where).orderBy(desc(users.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(users).where(where),
  );
}

export function listOrganizersAdmin(page: number) {
  return paged(
    db.select({
      id: organizers.id, name: organizers.name, slug: organizers.slug, createdAt: organizers.createdAt, userId: users.id, email: users.email, status: users.status,
      eventCount: sql<number>`(select count(*)::int from events e where e.organizer_id = ${organizers.id})`,
    }).from(organizers).innerJoin(users, eq(users.id, organizers.userId)).orderBy(desc(organizers.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(organizers),
  );
}

export function listEventsAdmin(q: string | undefined, page: number) {
  const where = q ? ilike(events.title, like(q)) : undefined;
  return paged(
    db.select({ id: events.id, title: events.title, slug: events.slug, status: events.status, isFeatured: events.isFeatured, startDate: events.startDate, organizerName: organizers.name })
      .from(events).innerJoin(organizers, eq(organizers.id, events.organizerId)).where(where).orderBy(desc(events.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(events).where(where),
  );
}

export function listBookingsAdmin(page: number) {
  return paged(
    db.select({ id: bookings.id, status: bookings.status, total: bookings.total, currency: bookings.currency, createdAt: bookings.createdAt, email: users.email, eventTitle: events.title })
      .from(bookings).innerJoin(users, eq(users.id, bookings.userId)).innerJoin(events, eq(events.id, bookings.eventId))
      .orderBy(desc(bookings.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(bookings),
  );
}

export function listPaymentsAdmin(page: number) {
  return paged(
    db.select({ id: payments.id, provider: payments.provider, providerPaymentId: payments.providerPaymentId, status: payments.status, amount: payments.amount, currency: payments.currency, createdAt: payments.createdAt, bookingId: payments.bookingId, email: users.email })
      .from(payments).innerJoin(bookings, eq(bookings.id, payments.bookingId)).innerJoin(users, eq(users.id, bookings.userId))
      .orderBy(desc(payments.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(payments),
  );
}

export function listReportsAdmin(status: ReportStatus, page: number) {
  const where = eq(reports.status, status);
  return paged(
    db.select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, details: reports.details, status: reports.status, createdAt: reports.createdAt, reporterEmail: users.email })
      .from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(where).orderBy(desc(reports.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(reports).where(where),
  );
}

export function listReviewsAdmin(page: number) {
  return paged(
    db.select({ id: reviews.id, rating: reviews.rating, content: reviews.content, hidden: reviews.hidden, createdAt: reviews.createdAt, email: users.email, eventTitle: events.title, eventSlug: events.slug })
      .from(reviews).innerJoin(users, eq(users.id, reviews.userId)).innerJoin(events, eq(events.id, reviews.eventId))
      .orderBy(desc(reviews.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(reviews),
  );
}

export function listCommentsAdmin(page: number) {
  return paged(
    db.select({ id: comments.id, content: comments.content, hidden: comments.hidden, createdAt: comments.createdAt, email: users.email, eventTitle: events.title, eventSlug: events.slug })
      .from(comments).innerJoin(users, eq(users.id, comments.userId)).innerJoin(events, eq(events.id, comments.eventId))
      .orderBy(desc(comments.createdAt)).limit(ADMIN_PAGE_SIZE).offset(offset(page)),
    db.select({ total: count() }).from(comments).where(and()),
  );
}
