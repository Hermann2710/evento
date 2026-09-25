import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { googleSignInAction } from "../actions/oauth-actions";

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
    </div>
  );
}

export function OAuthButtons({ enabled }: { enabled: boolean }) {
  const t = useTranslations("auth");
  if (!enabled) return null;
  return (
    <div className="mb-6 space-y-4">
      <form action={googleSignInAction}>
        <button type="submit" className={buttonClass({ variant: "outline", className: "w-full" })}>
          <span aria-hidden="true" className="font-bold text-blue-600">G</span>
          {t("continueWithGoogle")}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs uppercase text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        {t("or")}
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-center text-sm text-gray-600">{children}</p>;
}
