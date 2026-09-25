import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
  param?: string;
};

export function Pagination({ page, totalPages, pathname, searchParams = {}, param = "page" }: PaginationProps) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v) params.set(k, v);
    params.set(param, String(p));
    return `${pathname}?${params.toString()}`;
  };

  const linkClass = "inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50";
  const disabledClass = "pointer-events-none opacity-50";

  return (
    <nav aria-label={t("pagination")} className="mt-8 flex items-center justify-center gap-3">
      <Link href={href(Math.max(1, page - 1))} className={cn(linkClass, page <= 1 && disabledClass)} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>
        {t("previous")}
      </Link>
      <span className="text-sm text-gray-600" aria-current="page">
        {t("pageOf", { page, total: totalPages })}
      </span>
      <Link
        href={href(Math.min(totalPages, page + 1))}
        className={cn(linkClass, page >= totalPages && disabledClass)}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
      >
        {t("next")}
      </Link>
    </nav>
  );
}
