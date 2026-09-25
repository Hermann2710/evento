"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { setEventStatusAction } from "../actions/event-actions";

type Action = "publish" | "unpublish" | "cancel" | "delete";

export function EventStatusActions({ eventId, status, slug }: { eventId: string; status: string; slug: string }) {
  const t = useTranslations("organizer.actions");
  const te = useTranslations("errors");
  const router = useRouter();
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: Action) =>
    startTransition(async () => {
      const res = await setEventStatusAction(eventId, action);
      setConfirm(null);
      if (!res.ok) return void toast.error(te(res.error));
      toast.success(t(`${action}Done`));
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/organizer/events/${eventId}`} className="inline-flex h-8 items-center rounded-xl border border-gray-300 bg-white px-3 text-sm">{t("bookings")}</Link>
      <Link href={`/organizer/events/${eventId}/edit`} className="inline-flex h-8 items-center rounded-xl border border-gray-300 bg-white px-3 text-sm">{t("edit")}</Link>
      <Link href={`/events/${slug}`} className="inline-flex h-8 items-center rounded-xl border border-gray-300 bg-white px-3 text-sm">{t("view")}</Link>
      {status === "draft" && <Button size="sm" loading={pending} onClick={() => run("publish")}>{t("publish")}</Button>}
      {status === "published" && <Button size="sm" variant="outline" loading={pending} onClick={() => run("unpublish")}>{t("unpublish")}</Button>}
      {(status === "published" || status === "draft") && <Button size="sm" variant="outline" onClick={() => setConfirm("cancel")}>{t("cancel")}</Button>}
      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirm("delete")}>{t("delete")}</Button>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm ? t(`${confirm}ConfirmTitle`) : ""}
        description={confirm ? t(`${confirm}ConfirmDescription`) : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>{t("back")}</Button>
            <Button variant="danger" loading={pending} onClick={() => confirm && run(confirm)}>{t("confirm")}</Button>
          </>
        }
      />
    </div>
  );
}
