import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 text-right text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-muted disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
