"use client";

import { useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Input } from "./fields";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("common");
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-20" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-brand-700 hover:text-brand-900"
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? t("hidePassword") : t("showPassword")}
      </button>
    </div>
  );
}
