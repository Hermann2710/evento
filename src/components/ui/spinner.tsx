import { cn } from "@/lib/utils";

export function Spinner({ size = "md", className, label }: { size?: "sm" | "md" | "lg"; className?: string; label?: string }) {
  const dims = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-10 w-10 border-4" }[size];
  return (
    <span role={label ? "status" : undefined} aria-label={label} className="inline-flex">
      <span aria-hidden="true" className={cn("animate-spin rounded-full border-current border-t-transparent", dims, className)} />
    </span>
  );
}
