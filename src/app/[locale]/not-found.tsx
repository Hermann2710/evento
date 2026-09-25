import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-gray-500">{t("description")}</p>
      <Link href="/" className={buttonClass({ className: "mt-6" })}>{t("home")}</Link>
    </main>
  );
}
