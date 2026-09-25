import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["ADMIN"]);
  const t = await getTranslations("admin.nav");
  const items = [
    { href: "/admin", label: t("overview"), icon: "📊", exact: true },
    { href: "/admin/users", label: t("users"), icon: "👥" },
    { href: "/admin/organizers", label: t("organizers"), icon: "🏢" },
    { href: "/admin/events", label: t("events"), icon: "📅" },
    { href: "/admin/categories", label: t("categories"), icon: "🏷️" },
    { href: "/admin/bookings", label: t("bookings"), icon: "🧾" },
    { href: "/admin/payments", label: t("payments"), icon: "💳" },
    { href: "/admin/reports", label: t("reports"), icon: "🚩" },
    { href: "/admin/reviews", label: t("reviews"), icon: "⭐" },
    { href: "/admin/comments", label: t("comments"), icon: "💬" },
  ];
  return (
    <DashboardShell title={t("title")} items={items}>
      {children}
    </DashboardShell>
  );
}
