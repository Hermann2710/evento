import type { ReactNode } from "react";
import { Header } from "./header";
import { NavLinks, type NavItem } from "./nav-links";

/** Shared shell for organizer & admin areas: header + sidebar (horizontal on mobile). */
export function DashboardShell({ title, items, children }: { title: string; items: NavItem[]; children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="container-page flex flex-col gap-6 py-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 lg:sticky lg:top-20">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
            <div className="hidden lg:block">
              <NavLinks items={items} label={title} />
            </div>
            <div className="lg:hidden">
              <NavLinks items={items} label={title} orientation="horizontal" />
            </div>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
