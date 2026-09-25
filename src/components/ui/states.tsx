import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "./spinner";

export function EmptyState({ title, description, action, icon = "✨" }: { title: string; description?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <span aria-hidden="true" className="text-4xl">
        {icon}
      </span>
      <h2 className="mt-3 text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title?: string; description?: string; action?: ReactNode }) {
  const t = useTranslations("states");
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-14 text-center">
      <span aria-hidden="true" className="text-4xl">
        ⚠️
      </span>
      <h2 className="mt-3 text-lg font-semibold text-red-800">{title ?? t("errorTitle")}</h2>
      <p className="mt-1 max-w-md text-sm text-red-700">{description ?? t("errorDescription")}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations("states");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-brand-600">
      <Spinner size="lg" label={label ?? t("loading")} />
      <p className="text-sm text-gray-500">{label ?? t("loading")}</p>
    </div>
  );
}
