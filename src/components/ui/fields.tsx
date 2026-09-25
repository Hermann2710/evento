import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "block w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-gray-100 aria-[invalid=true]:border-red-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-28 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(base, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-brand-600" {...props} />
      {label}
    </label>
  );
}

export function Radio({ className, label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700", className)}>
      <input type="radio" className="h-4 w-4 border-gray-300 accent-brand-600" {...props} />
      {label}
    </label>
  );
}

export function Switch({ className, label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 text-sm text-gray-700", className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  );
}
