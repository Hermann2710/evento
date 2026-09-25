"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSocketEvent, useSocketRoom } from "@/hooks/use-socket";
import { SOCKET_EVENTS } from "@/lib/realtime/events";
import { cancelBookingAction, startPaymentAction } from "../actions";

export function PayButton({ bookingId, label }: { bookingId: string; label: string }) {
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      className="w-full"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startPaymentAction(bookingId);
          if (!res.ok) {
            toast.error(te(res.error));
            router.refresh();
            return;
          }
          window.location.assign(res.data.redirectUrl);
        })
      }
    >
      {label}
    </Button>
  );
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("booking");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      className="w-full"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelBookingAction(bookingId);
          if (!res.ok) return void toast.error(te(res.error));
          toast.success(t("canceled"));
          router.refresh();
        })
      }
    >
      {t("cancelBooking")}
    </Button>
  );
}

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, router]);
  const total = Math.max(0, Math.floor(left / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800" role="timer" aria-live="off">
      {t("holdExpires", { time: `${mm}:${ss}` })}
    </p>
  );
}

/** Refreshes the page when the booking status changes (socket) with a polling fallback. */
export function BookingStatusWatcher({ bookingId, active }: { bookingId: string; active: boolean }) {
  const router = useRouter();
  useSocketRoom(SOCKET_EVENTS.joinBooking, active ? bookingId : null);
  const connected = useSocketEvent<{ bookingId: string }>(SOCKET_EVENTS.bookingStatus, (p) => {
    if (p.bookingId === bookingId) router.refresh();
  });
  useEffect(() => {
    if (!active || connected) return;
    let ticks = 0;
    const id = setInterval(() => {
      ticks++;
      router.refresh();
      if (ticks > 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [active, connected, router]);
  return null;
}
