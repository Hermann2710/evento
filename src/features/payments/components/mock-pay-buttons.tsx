"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { simulateMockPaymentAction } from "../actions";

export function MockPayButtons({ paymentId, bookingId }: { paymentId: string; bookingId: string }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (outcome: "success" | "failure") =>
    startTransition(async () => {
      const res = await simulateMockPaymentAction(paymentId, outcome);
      if (!res.ok) toast.error(te(res.error));
      else toast[outcome === "success" ? "success" : "error"](outcome === "success" ? t("approved") : t("declined"));
      router.push(`/bookings/${bookingId}`);
      router.refresh();
    });

  return (
    <div className="grid gap-3">
      <Button size="lg" loading={pending} onClick={() => run("success")}>{t("approve")}</Button>
      <Button size="lg" variant="outline" disabled={pending} onClick={() => run("failure")}>{t("decline")}</Button>
    </div>
  );
}
