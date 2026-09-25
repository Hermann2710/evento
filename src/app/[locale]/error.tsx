"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("states");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-16">
      <ErrorState action={<Button onClick={reset}>{t("retry")}</Button>} />
    </div>
  );
}
