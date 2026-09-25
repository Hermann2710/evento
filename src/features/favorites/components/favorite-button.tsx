"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { toggleFavoriteAction } from "../actions";

export function FavoriteButton({ eventId, initial, isAuthenticated }: { eventId: string; initial: boolean; isAuthenticated: boolean }) {
  const t = useTranslations("favorites");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [favorited, setOptimistic] = useOptimistic(initial);

  if (!isAuthenticated) {
    return (
      <Link href="/login" className={buttonClass({ variant: "outline" })}>
        <span aria-hidden="true">🤍</span> {t("add")}
      </Link>
    );
  }

  return (
    <Button
      variant="outline"
      aria-pressed={favorited}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!favorited);
          const res = await toggleFavoriteAction(eventId);
          if (!res.ok) return void toast.error(te(res.error));
          toast.success(res.data.favorited ? t("added") : t("removed"));
        })
      }
    >
      <span aria-hidden="true">{favorited ? "❤️" : "🤍"}</span>
      {favorited ? t("remove") : t("add")}
    </Button>
  );
}
