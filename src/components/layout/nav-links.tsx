"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon?: string; exact?: boolean };

export function NavLinks({ items, label, orientation = "vertical" }: { items: NavItem[]; label: string; orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className={cn(orientation === "vertical" ? "space-y-1" : "flex gap-1 overflow-x-auto")}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
