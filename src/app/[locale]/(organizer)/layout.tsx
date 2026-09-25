import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  await requireRole(["ORGANIZER", "ADMIN"]);
  const t = await getTranslations("organizer.nav");
  const items = [
    { href: "/organizer", label: t("dashboard"), icon: "📊", exact: true },
    { href: "/organizer/events", label: t("events"), icon: "📅" },
    { href: "/organizer/events/new", label: t("create"), icon: "➕", exact: true },
    { href: "/organizer/bookings", label: t("bookings"), icon: "🧾" },
    { href: "/organizer/profile", label: t("profile"), icon: "🏢" },
  ];
  return (
    <DashboardShell title={t("title")} items={items}>
      {children}
    </DashboardShell>
  );
}
