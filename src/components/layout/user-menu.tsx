"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/display";
import { Dropdown, menuItemClass } from "@/components/ui/dropdown";
import { logoutAction } from "@/features/auth/actions/auth-actions";

type UserMenuProps = {
  user: { firstName: string; lastName: string; email: string; image: string | null; role: string };
};

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = () =>
    startTransition(async () => {
      await logoutAction();
      toast.success(t("loggedOut"));
      router.push("/");
      router.refresh();
    });

  return (
    <Dropdown
      label={t("userMenu")}
      trigger={<Avatar src={user.image} firstName={user.firstName} lastName={user.lastName} alt={`${user.firstName} ${user.lastName}`} size={36} />}
    >
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="truncate text-sm font-semibold">{`${user.firstName} ${user.lastName}`}</p>
        <p className="truncate text-xs text-gray-500">{user.email}</p>
      </div>
      <Link role="menuitem" href="/profile" className={menuItemClass}>{t("profile")}</Link>
      <Link role="menuitem" href="/tickets" className={menuItemClass}>{t("tickets")}</Link>
      <Link role="menuitem" href="/bookings" className={menuItemClass}>{t("bookings")}</Link>
      <Link role="menuitem" href="/favorites" className={menuItemClass}>{t("favorites")}</Link>
      <Link role="menuitem" href="/notifications" className={menuItemClass}>{t("notifications")}</Link>
      {(user.role === "ORGANIZER" || user.role === "ADMIN") && (
        <Link role="menuitem" href="/organizer" className={menuItemClass}>{t("organizer")}</Link>
      )}
      {user.role === "USER" && (
        <Link role="menuitem" href="/onboarding" className={menuItemClass}>{t("becomeOrganizer")}</Link>
      )}
      {user.role === "ADMIN" && (
        <Link role="menuitem" href="/admin" className={menuItemClass}>{t("admin")}</Link>
      )}
      <button role="menuitem" type="button" onClick={logout} disabled={pending} className={`${menuItemClass} text-red-600`}>
        {t("logout")}
      </button>
    </Dropdown>
  );
}
