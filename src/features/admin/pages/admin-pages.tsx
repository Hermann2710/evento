import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/guards";
import { Badge, Card, StatCard, statusTone } from "@/components/ui/display";
import { Input } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { formatDate, formatMoney } from "@/lib/format";
import { cn, totalPages } from "@/lib/utils";
import type { ReportStatus } from "@/db/schema";
import { listCategories } from "@/features/categories/queries";
import {
  ADMIN_PAGE_SIZE, adminStats, listBookingsAdmin, listCommentsAdmin, listEventsAdmin, listOrganizersAdmin,
  listPaymentsAdmin, listReportsAdmin, listReviewsAdmin, listUsers,
} from "../queries";
import {
  deleteCategoryAction, resolveReportAction, setCommentHiddenAction, setEventHiddenAction, setReviewHiddenAction,
  setUserRoleAction, setUserStatusAction, toggleFeaturedAction,
} from "../actions";
import { ActionButton } from "../components/action-button";
import { CategoryForm } from "../components/category-form";

function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty: boolean }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>{headers.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-2.5">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
      {empty && <EmptyRow />}
    </Card>
  );
}

async function EmptyRow() {
  const t = await getTranslations("admin");
  return <p className="p-6 text-center text-sm text-gray-500">{t("empty")}</p>;
}

const td = "px-4 py-3 align-top";

async function SearchBox({ q, path }: { q?: string; path: string }) {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  return (
    <form action={`/${locale}${path}`} method="get" role="search" className="mb-4 max-w-sm">
      <label htmlFor="admin-q" className="sr-only">{t("search")}</label>
      <Input id="admin-q" name="q" type="search" defaultValue={q} placeholder={t("search")} />
    </form>
  );
}

export async function AdminOverviewPage() {
  await requireRole(["ADMIN"]);
  const [t, locale, s] = await Promise.all([getTranslations("admin"), getLocale(), adminStats()]);
  const revenue = s.revenue.length ? s.revenue.map((r) => formatMoney(r.amount, r.currency, locale)).join(" · ") : "—";
  return (
    <div>
      <PageHeading title={t("overviewTitle")} description={t("overviewSubtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stats.users")} value={s.users} />
        <StatCard label={t("stats.organizers")} value={s.organizers} />
        <StatCard label={t("stats.events")} value={Object.values(s.events).reduce((a, b) => a + b, 0)} hint={t("stats.published", { count: s.events.published ?? 0 })} />
        <StatCard label={t("stats.bookings")} value={s.confirmedBookings} />
        <StatCard label={t("stats.revenue")} value={revenue} />
        <StatCard label={t("stats.payments")} value={s.payments} />
        <StatCard label={t("stats.openReports")} value={<Link href="/admin/reports" className="text-brand-700 hover:underline">{s.openReports}</Link>} />
      </div>
    </div>
  );
}

export async function AdminUsersPage({ q, page }: { q?: string; page: number }) {
  const admin = await requireRole(["ADMIN"]);
  const [t, ts, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("status"), getLocale(), listUsers(q, page)]);
  return (
    <div>
      <PageHeading title={t("nav.users")} />
      <SearchBox q={q} path="/admin/users" />
      <Table headers={[t("cols.user"), t("cols.role"), t("cols.status"), t("cols.created"), t("cols.actions")]} empty={!items.length}>
        {items.map((u) => (
          <tr key={u.id}>
            <td className={td}><span className="font-medium">{u.firstName} {u.lastName}</span><span className="block text-xs text-gray-500">{u.email}</span></td>
            <td className={td}><Badge tone="brand">{ts(`role.${u.role}`)}</Badge></td>
            <td className={td}><Badge tone={statusTone(u.status)}>{ts(`user.${u.status}`)}</Badge></td>
            <td className={td}>{formatDate(u.createdAt, locale)}</td>
            <td className={td}>
              {u.id !== admin.id && (
                <div className="flex flex-wrap gap-1.5">
                  {u.status !== "active" && <ActionButton action={setUserStatusAction.bind(null, u.id, "active")} label={t("restore")} successMessage={t("done")} />}
                  {u.status === "active" && <ActionButton action={setUserStatusAction.bind(null, u.id, "suspended")} label={t("suspend")} successMessage={t("done")} confirmMessage={t("confirm")} />}
                  {u.status !== "banned" && <ActionButton variant="danger" action={setUserStatusAction.bind(null, u.id, "banned")} label={t("ban")} successMessage={t("done")} confirmMessage={t("confirm")} />}
                  {u.role !== "ADMIN" && <ActionButton variant="ghost" action={setUserRoleAction.bind(null, u.id, "ADMIN")} label={t("makeAdmin")} successMessage={t("done")} confirmMessage={t("confirm")} />}
                  {u.role === "ADMIN" && <ActionButton variant="ghost" action={setUserRoleAction.bind(null, u.id, "USER")} label={t("removeAdmin")} successMessage={t("done")} confirmMessage={t("confirm")} />}
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/users" searchParams={{ q }} />
    </div>
  );
}

export async function AdminOrganizersPage({ page }: { page: number }) {
  await requireRole(["ADMIN"]);
  const [t, ts, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("status"), getLocale(), listOrganizersAdmin(page)]);
  return (
    <div>
      <PageHeading title={t("nav.organizers")} />
      <Table headers={[t("cols.organizer"), t("cols.events"), t("cols.status"), t("cols.created"), t("cols.actions")]} empty={!items.length}>
        {items.map((o) => (
          <tr key={o.id}>
            <td className={td}><span className="font-medium">{o.name}</span><span className="block text-xs text-gray-500">{o.email}</span></td>
            <td className={td}>{o.eventCount}</td>
            <td className={td}><Badge tone={statusTone(o.status)}>{ts(`user.${o.status}`)}</Badge></td>
            <td className={td}>{formatDate(o.createdAt, locale)}</td>
            <td className={td}>
              {o.status === "active"
                ? <ActionButton action={setUserStatusAction.bind(null, o.userId, "suspended")} label={t("suspend")} successMessage={t("done")} confirmMessage={t("confirm")} />
                : <ActionButton action={setUserStatusAction.bind(null, o.userId, "active")} label={t("restore")} successMessage={t("done")} />}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/organizers" />
    </div>
  );
}

export async function AdminEventsPage({ q, page }: { q?: string; page: number }) {
  await requireRole(["ADMIN"]);
  const [t, ts, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("status"), getLocale(), listEventsAdmin(q, page)]);
  return (
    <div>
      <PageHeading title={t("nav.events")} />
      <SearchBox q={q} path="/admin/events" />
      <Table headers={[t("cols.event"), t("cols.organizer"), t("cols.date"), t("cols.status"), t("cols.actions")]} empty={!items.length}>
        {items.map((e) => (
          <tr key={e.id}>
            <td className={td}><Link href={`/events/${e.slug}`} className="font-medium hover:underline">{e.title}</Link>{e.isFeatured && <Badge tone="brand" className="ml-2">★</Badge>}</td>
            <td className={td}>{e.organizerName}</td>
            <td className={td}>{formatDate(e.startDate, locale)}</td>
            <td className={td}><Badge tone={statusTone(e.status)}>{ts(`event.${e.status}`)}</Badge></td>
            <td className={td}>
              <div className="flex flex-wrap gap-1.5">
                {e.status === "hidden"
                  ? <ActionButton action={setEventHiddenAction.bind(null, e.id, false)} label={t("unhide")} successMessage={t("done")} />
                  : <ActionButton variant="danger" action={setEventHiddenAction.bind(null, e.id, true)} label={t("hide")} successMessage={t("done")} confirmMessage={t("confirm")} />}
                <ActionButton variant="ghost" action={toggleFeaturedAction.bind(null, e.id, !e.isFeatured)} label={e.isFeatured ? t("unfeature") : t("feature")} successMessage={t("done")} />
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/events" searchParams={{ q }} />
    </div>
  );
}

export async function AdminCategoriesPage() {
  await requireRole(["ADMIN"]);
  const [t, items] = await Promise.all([getTranslations("admin"), listCategories()]);
  return (
    <div className="space-y-4">
      <PageHeading title={t("nav.categories")} />
      <Card className="p-4"><CategoryForm /></Card>
      <Card className="divide-y divide-gray-100">
        {items.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center">
            <div className="flex-1"><CategoryForm category={c} /></div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {t("eventCount", { count: c.eventCount })}
              <ActionButton variant="ghost" action={deleteCategoryAction.bind(null, c.id)} label={t("delete")} successMessage={t("done")} confirmMessage={t("confirm")} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export async function AdminBookingsPage({ page }: { page: number }) {
  await requireRole(["ADMIN"]);
  const [t, ts, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("status"), getLocale(), listBookingsAdmin(page)]);
  return (
    <div>
      <PageHeading title={t("nav.bookings")} />
      <Table headers={[t("cols.reference"), t("cols.user"), t("cols.event"), t("cols.amount"), t("cols.status"), t("cols.created")]} empty={!items.length}>
        {items.map((b) => (
          <tr key={b.id}>
            <td className={cn(td, "font-mono text-xs")}>{b.id.slice(0, 8).toUpperCase()}</td>
            <td className={td}>{b.email}</td>
            <td className={td}>{b.eventTitle}</td>
            <td className={td}>{formatMoney(b.total, b.currency, locale)}</td>
            <td className={td}><Badge tone={statusTone(b.status)}>{ts(`booking.${b.status}`)}</Badge></td>
            <td className={td}>{formatDate(b.createdAt, locale)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/bookings" />
    </div>
  );
}

export async function AdminPaymentsPage({ page }: { page: number }) {
  await requireRole(["ADMIN"]);
  const [t, ts, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("status"), getLocale(), listPaymentsAdmin(page)]);
  return (
    <div>
      <PageHeading title={t("nav.payments")} />
      <Table headers={[t("cols.provider"), t("cols.reference"), t("cols.user"), t("cols.amount"), t("cols.status"), t("cols.created")]} empty={!items.length}>
        {items.map((p) => (
          <tr key={p.id}>
            <td className={td}>{p.provider}</td>
            <td className={cn(td, "font-mono text-xs")}>{p.providerPaymentId}</td>
            <td className={td}>{p.email}</td>
            <td className={td}>{formatMoney(p.amount, p.currency, locale)}</td>
            <td className={td}><Badge tone={statusTone(p.status)}>{ts(`payment.${p.status}`)}</Badge></td>
            <td className={td}>{formatDate(p.createdAt, locale)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/payments" />
    </div>
  );
}

export async function AdminReportsPage({ status, page }: { status: ReportStatus; page: number }) {
  await requireRole(["ADMIN"]);
  const [t, tr, locale, { items, total }] = await Promise.all([getTranslations("admin"), getTranslations("reports"), getLocale(), listReportsAdmin(status, page)]);
  const tabs: ReportStatus[] = ["open", "resolved", "dismissed"];
  return (
    <div>
      <PageHeading title={t("nav.reports")} />
      <div className="mb-4 flex gap-2" role="group" aria-label={t("filter")}>
        {tabs.map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} aria-current={s === status ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", s === status ? "bg-brand-600 text-white" : "border border-gray-200 bg-white text-gray-600")}>
            {t(`reportStatus.${s}`)}
          </Link>
        ))}
      </div>
      <Table headers={[t("cols.target"), t("cols.reason"), t("cols.reporter"), t("cols.created"), t("cols.actions")]} empty={!items.length}>
        {items.map((r) => (
          <tr key={r.id}>
            <td className={td}><Badge>{t(`targets.${r.targetType}`)}</Badge><span className="mt-1 block font-mono text-xs text-gray-500">{r.targetId.slice(0, 8)}</span></td>
            <td className={td}><span className="font-medium">{tr(`reasons.${r.reason}`)}</span>{r.details && <p className="mt-1 max-w-xs text-xs text-gray-600">{r.details}</p>}</td>
            <td className={td}>{r.reporterEmail}</td>
            <td className={td}>{formatDate(r.createdAt, locale)}</td>
            <td className={td}>
              {r.status === "open" && (
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton variant="danger" action={resolveReportAction.bind(null, r.id, "resolved", true)} label={t("resolveAndHide")} successMessage={t("done")} confirmMessage={t("confirm")} />
                  <ActionButton action={resolveReportAction.bind(null, r.id, "resolved", false)} label={t("resolve")} successMessage={t("done")} />
                  <ActionButton variant="ghost" action={resolveReportAction.bind(null, r.id, "dismissed", false)} label={t("dismiss")} successMessage={t("done")} />
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/reports" searchParams={{ status }} />
    </div>
  );
}

export async function AdminReviewsPage({ page }: { page: number }) {
  await requireRole(["ADMIN"]);
  const [t, locale, { items, total }] = await Promise.all([getTranslations("admin"), getLocale(), listReviewsAdmin(page)]);
  return (
    <div>
      <PageHeading title={t("nav.reviews")} />
      <Table headers={[t("cols.content"), t("cols.event"), t("cols.user"), t("cols.created"), t("cols.actions")]} empty={!items.length}>
        {items.map((r) => (
          <tr key={r.id} className={r.hidden ? "bg-red-50/40" : undefined}>
            <td className={td}><span className="text-amber-500">{"★".repeat(r.rating)}</span><p className="max-w-sm text-gray-700">{r.content}</p></td>
            <td className={td}><Link href={`/events/${r.eventSlug}`} className="hover:underline">{r.eventTitle}</Link></td>
            <td className={td}>{r.email}</td>
            <td className={td}>{formatDate(r.createdAt, locale)}</td>
            <td className={td}>
              {r.hidden
                ? <ActionButton action={setReviewHiddenAction.bind(null, r.id, false)} label={t("unhide")} successMessage={t("done")} />
                : <ActionButton variant="danger" action={setReviewHiddenAction.bind(null, r.id, true)} label={t("hide")} successMessage={t("done")} />}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/reviews" />
    </div>
  );
}

export async function AdminCommentsPage({ page }: { page: number }) {
  await requireRole(["ADMIN"]);
  const [t, locale, { items, total }] = await Promise.all([getTranslations("admin"), getLocale(), listCommentsAdmin(page)]);
  return (
    <div>
      <PageHeading title={t("nav.comments")} />
      <Table headers={[t("cols.content"), t("cols.event"), t("cols.user"), t("cols.created"), t("cols.actions")]} empty={!items.length}>
        {items.map((c) => (
          <tr key={c.id} className={c.hidden ? "bg-red-50/40" : undefined}>
            <td className={td}><p className="max-w-sm text-gray-700">{c.content}</p></td>
            <td className={td}><Link href={`/events/${c.eventSlug}`} className="hover:underline">{c.eventTitle}</Link></td>
            <td className={td}>{c.email}</td>
            <td className={td}>{formatDate(c.createdAt, locale)}</td>
            <td className={td}>
              {c.hidden
                ? <ActionButton action={setCommentHiddenAction.bind(null, c.id, false)} label={t("unhide")} successMessage={t("done")} />
                : <ActionButton variant="danger" action={setCommentHiddenAction.bind(null, c.id, true)} label={t("hide")} successMessage={t("done")} />}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={totalPages(total, ADMIN_PAGE_SIZE)} pathname="/admin/comments" />
    </div>
  );
}
