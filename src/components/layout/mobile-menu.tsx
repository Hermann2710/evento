"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useUiStore } from "@/stores/ui-store";
import { NavLinks, type NavItem } from "./nav-links";

export function MobileMenu({ items }: { items: NavItem[] }) {
  const t = useTranslations("common");
  const open = useUiStore((s) => s.mobileMenuOpen);
  const setOpen = useUiStore((s) => s.setMobileMenu);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname, setOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-700 hover:bg-gray-100"
      >
        <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-16 z-40 border-b border-gray-200 bg-white p-4 shadow-lg">
          <NavLinks items={items} label={t("menu")} />
        </div>
      )}
    </div>
  );
}
