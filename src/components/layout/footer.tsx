import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-extrabold text-brand-700">Evento</p>
          <p className="mt-1 text-sm text-gray-500">{t("tagline")}</p>
        </div>
        <nav aria-label={t("label")} className="flex flex-wrap gap-4 text-sm text-gray-600">
          <Link href="/discover" className="hover:text-gray-900">{t("discover")}</Link>
          <Link href="/search" className="hover:text-gray-900">{t("search")}</Link>
          <Link href="/onboarding" className="hover:text-gray-900">{t("organize")}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <p className="text-xs text-gray-400">{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
