"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Radio, Textarea } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { createReportAction } from "../actions";
import { REPORT_REASONS, type ReportInput } from "../validations";

export function ReportButton({ targetType, targetId, compact = false }: { targetType: ReportInput["targetType"]; targetId: string; compact?: boolean }) {
  const t = useTranslations("reports");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportInput["reason"] | "">("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      if (!reason) return void toast.error(t("chooseReason"));
      const res = await createReportAction({ targetType, targetId, reason, details });
      if (!res.ok) return void toast.error(te(res.error));
      toast.success(t("sent"));
      setOpen(false);
      setReason("");
      setDetails("");
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? "text-xs text-gray-500 hover:text-red-600" : "text-sm text-gray-500 hover:text-red-600"}>
        {t("report")}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("title")}
        description={t("description")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button variant="danger" loading={pending} onClick={submit}>{t("submit")}</Button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t("reason")}</legend>
          {REPORT_REASONS.map((r) => (
            <div key={r}>
              <Radio name={`reason-${targetId}`} value={r} checked={reason === r} onChange={() => setReason(r)} label={t(`reasons.${r}`)} />
            </div>
          ))}
        </fieldset>
        <label htmlFor={`details-${targetId}`} className="mt-4 block text-sm font-medium">{t("details")}</label>
        <Textarea id={`details-${targetId}`} rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className="mt-1" />
      </Modal>
    </>
  );
}
