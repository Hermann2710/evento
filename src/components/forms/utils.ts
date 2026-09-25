import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { FieldErrors } from "@/lib/result";

/** Maps server-side field error codes back onto react-hook-form fields. */
export function applyFieldErrors<T extends FieldValues>(setError: UseFormSetError<T>, fieldErrors?: FieldErrors): void {
  if (!fieldErrors) return;
  for (const [name, code] of Object.entries(fieldErrors)) {
    setError(name as Path<T>, { type: "server", message: code });
  }
}
