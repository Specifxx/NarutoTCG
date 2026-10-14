"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { TRIGGER_STYLES } from "@/components/game/game-card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { LogLine, LogTone, LogTurn } from "./log";

const TONE: Record<LogTone, { icon: IconName; text: string }> = {
  effect: { icon: "sparkles", text: "text-ash-200" },
  power: { icon: "plus", text: "text-gold-200" },
  defeat: { icon: "swords", text: "text-blood-400" },
  hide: { icon: "eye-off", text: "text-mist-300" },
  fizzle: { icon: "minus", text: "text-ash-500" },
  edge: { icon: "flag", text: "text-gold-200" },
};

function Line({ line }: { line: LogLine }) {
  const tone = TONE[line.tone];
  if (line.tone === "effect" && line.trigger) {
    const style = TRIGGER_STYLES[line.trigger];
    const [, rest] = line.text.split(" — ");
    return (
      <li className="flex items-start gap-1.5 text-[12px] leading-snug text-ash-200">
        <span className={cn("mt-px shrink-0 rounded-sm px-1 text-[9.5px] font-black", style.className)}>{style.label}</span>
        <span className="min-w-0">{rest ?? line.text}</span>
      </li>
    );
  }
  return (
    <li className={cn("flex items-start gap-1.5 text-[12px] leading-snug", tone.text)}>
      <Icon name={tone.icon} size={12} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{line.text}</span>
    </li>
  );
}

const KIND_ICON: Record<LogTurn["kind"], IconName> = {
  play: "play",
  reveal: "eye",
  upgrade: "layers",
  pass: "flag",
};

export function ActionLog({ opening, turns, className }: { opening: LogTurn[]; turns: LogTurn[]; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const count = opening.length + turns.length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [count]);

  let yourIndex = 0;
  const all = [...opening.map((t) => ({ t, opening: true })), ...turns.map((t) => ({ t, opening: false }))];

  return (
    <section aria-labelledby="puzzle-log-title" className={cn("panel flex flex-col p-4 sm:p-5", className)}>
      <h2 id="puzzle-log-title" className="eyebrow flex items-center gap-2 text-ash-400">
        <Icon name="book" size={14} />
        Battle log
      </h2>
      <div ref={scroller} className="mt-3 max-h-80 min-h-[120px] flex-1 overflow-y-auto pr-1">
        {all.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[12.5px] text-ash-500">
            Your moves and your opponent&apos;s replies appear here.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {all.map(({ t, opening: before }) => {
                const mine = t.side === "you";
                if (mine) yourIndex += 1;
                return (
                  <motion.li
                    key={t.id}
                    layout="position"
                    initial={{ opacity: 0, x: mine ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      mine ? "border-energy-400/20 bg-energy-500/[0.05]" : "ml-3 border-blood-400/20 bg-blood-500/[0.05]",
                    )}
                  >
                    <p className="flex items-start gap-2 text-[12.5px] font-semibold leading-snug text-white">
                      <span
                        className={cn(
                          "mt-px flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-1 text-[9.5px] font-black",
                          mine ? "bg-energy-400/20 text-energy-200" : "bg-blood-500/20 text-blood-400",
                        )}
                        aria-hidden="true"
                      >
                        {mine ? yourIndex : <Icon name={KIND_ICON[t.kind]} size={10} />}
                      </span>
                      <span className="min-w-0">
                        {before && <span className="text-ash-500">Before your turn: </span>}
                        {t.headline}
                      </span>
                    </p>
                    {t.lines.length > 0 && <ul className="mt-1.5 flex flex-col gap-1 pl-6">{t.lines.map((l, i) => <Line key={i} line={l} />)}</ul>}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </section>
  );
}
