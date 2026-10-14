import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Loading placeholder shown while a widget's code streams in. */
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("panel flex h-[420px] items-center justify-center", className)} aria-busy="true" aria-label="Loading widget">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-chakra-400" />
    </div>
  );
}

/** Placeholder frame used by unimplemented widgets. */
export function WidgetPlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="eyebrow text-chakra-300">Widget</p>
      <p className="text-lg font-bold text-white">{title}</p>
      {children}
    </div>
  );
}
