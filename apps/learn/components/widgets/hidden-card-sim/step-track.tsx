"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type StepStatus = "todo" | "current" | "done" | "missed";

export interface TrackStep {
  id: string;
  title: string;
  text: string;
  status: StepStatus;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  todo: "not started",
  current: "in progress",
  done: "done",
  missed: "skipped",
};

/** Vertical checklist of the ambush line: Hide → Bluff → Ambush → Score. */
export function StepTrack({ steps }: { steps: TrackStep[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative space-y-3.5">
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex gap-3">
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-[13px] top-8 h-[calc(100%-14px)] w-px",
                s.status === "done" ? "bg-gradient-to-b from-leaf-400/70 to-leaf-400/20" : "bg-white/10",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ring-1 transition-colors duration-300",
              s.status === "done" && "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950 ring-leaf-300/60",
              s.status === "current" && "bg-mist-500/25 text-mist-200 ring-mist-300/70 shadow-[0_0_16px_rgba(139,92,246,0.6)]",
              s.status === "todo" && "bg-white/[0.03] text-ash-500 ring-white/10",
              s.status === "missed" && "bg-blood-500/20 text-blood-400 ring-blood-400/50",
            )}
          >
            {s.status === "done" ? (
              <Icon name="check" size={14} strokeWidth={3} />
            ) : s.status === "missed" ? (
              <Icon name="x" size={13} strokeWidth={3} />
            ) : (
              i + 1
            )}
            {s.status === "current" && !reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full ring-2 ring-mist-300"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.45, opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p
              className={cn(
                "text-sm font-bold",
                s.status === "todo" ? "text-ash-400" : s.status === "missed" ? "text-blood-400" : "text-white",
              )}
            >
              {s.title}
              <span className="sr-only">, {STATUS_LABEL[s.status]}</span>
            </p>
            <p className="text-[12.5px] leading-snug text-ash-400">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
