"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { LogEntry, LogTone } from "./use-duel";

const TONE: Record<LogTone, { icon: IconName | "edge"; className: string }> = {
  play: { icon: "hand", className: "text-ash-200" },
  hidden: { icon: "eye-off", className: "text-mist-300" },
  reveal: { icon: "eye", className: "text-mist-200" },
  upgrade: { icon: "layers", className: "text-gold-200" },
  effect: { icon: "sparkles", className: "text-ash-400" },
  defeat: { icon: "x", className: "text-blood-400" },
  pass: { icon: "flag", className: "text-ash-300" },
  edge: { icon: "edge", className: "text-gold-200 font-bold" },
};

/** Running log of every play, effect and pass, newest first. */
export function DuelLog({ log }: { log: LogEntry[] }) {
  const entries = [...log].reverse();
  return (
    <section aria-label="Action log" className="rounded-2xl border border-white/[0.07] bg-black/25 p-3 sm:p-4">
      <p className="eyebrow flex items-center gap-1.5 text-ash-400">
        <Icon name="book" size={13} />
        Action log
      </p>
      {entries.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-ash-500">Nothing yet. Every play and pass will appear here.</p>
      ) : (
        <ol className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {entries.map((e, i) => {
              const tone = TONE[e.tone];
              return (
                <motion.li
                  key={e.id}
                  layout="position"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i === 0 ? 1 : 0.78, x: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12.5px] leading-snug",
                    e.tone === "edge" ? "bg-gold-400/10" : i === 0 ? "bg-white/[0.04]" : "",
                    tone.className,
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center",
                      e.side === "you" ? "text-energy-300" : e.side === "opp" ? "text-blood-400" : "text-ash-500",
                      e.tone === "edge" && "text-gold-300",
                    )}
                    aria-hidden="true"
                  >
                    {tone.icon === "edge" ? <Emblem name="edge" size={14} /> : <Icon name={tone.icon} size={13} />}
                  </span>
                  <span className="min-w-0">{e.text}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}
