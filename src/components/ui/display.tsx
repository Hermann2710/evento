import type { ComponentProps, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";
import { SmartImage } from "./smart-image";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-gray-200 bg-white shadow-sm", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "gray" | "brand" | "green" | "yellow" | "red" | "blue";
const tones: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  brand: "bg-brand-100 text-brand-700",
  green: "bg-green-100 text-green-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "gray", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

const STATUS_TONES: Record<string, Tone> = {
  active: "green", published: "green", confirmed: "green", succeeded: "green", valid: "green", resolved: "green",
  pending: "yellow", processing: "yellow", draft: "gray", open: "yellow", suspended: "yellow",
  canceled: "red", failed: "red", banned: "red", hidden: "red", expired: "gray", refunded: "blue", used: "gray", dismissed: "gray",
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? "gray";
}

export function Avatar({
  src,
  firstName,
  lastName,
  alt,
  size = 40,
}: {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  alt: string;
  size?: number;
}) {
  if (src) {
    return (
      <SmartImage src={src} alt={alt} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      role="img"
      aria-label={alt}
      className="inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}
