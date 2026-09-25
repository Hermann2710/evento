import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-white to-sky-50">
      <header className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-extrabold text-brand-700">
          Evento
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-brand-100/50 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
