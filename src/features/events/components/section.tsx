import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function Section({ id, title, description, href, linkLabel, children }: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="container-page py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {href && linkLabel && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function CategoryChips({ categories, active }: { categories: Array<{ slug: string; name: string; eventCount?: number }>; active?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/search?category=${c.slug}`}
            aria-current={active === c.slug ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
              active === c.slug ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {c.name}
            {c.eventCount !== undefined && <span className="text-xs opacity-70">({c.eventCount})</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
