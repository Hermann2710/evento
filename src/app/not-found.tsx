import Link from "next/link";
import { translate } from "@/lib/i18n/translate";
import "./globals.css";

// Rendered only for requests outside of a locale segment.
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-6xl font-extrabold text-brand-600">404</p>
        <h1 className="text-xl font-bold">{translate("fr", "notFound.title")}</h1>
        <p className="text-gray-500">{translate("en", "notFound.title")}</p>
        <Link href="/fr" className="mt-4 text-brand-700 underline">{translate("fr", "notFound.home")}</Link>
      </body>
    </html>
  );
}
