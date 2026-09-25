"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

/** Label + control + hint + translated error (error is a validation code). */
export function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  const t = useTranslations("validation");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {t.has(error) ? t(error) : t("invalid")}
        </p>
      )}
    </div>
  );
}

export function fieldAria(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}
