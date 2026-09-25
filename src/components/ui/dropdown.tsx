"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DropdownProps = {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  triggerClassName?: string;
};

/** Accessible menu button: Escape closes, arrow keys move focus, click outside closes. */
export function Dropdown({ trigger, label, children, align = "right", triggerClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    const first = rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center rounded-xl", triggerClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-50 mt-2 min-w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const menuItemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none";
