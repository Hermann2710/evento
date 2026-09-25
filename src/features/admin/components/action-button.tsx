"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/result";

type Props = {
  action: () => Promise<ActionResult>;
  label: string;
  successMessage: string;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
};

/** Runs a bound server action (authorization is always re-checked server-side). */
export function ActionButton({ action, label, successMessage, confirmMessage, variant = "outline" }: Props) {
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={variant}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          const res = await action();
          if (!res.ok) return void toast.error(te(res.error));
          toast.success(successMessage);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}
