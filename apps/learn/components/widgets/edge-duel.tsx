"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DuelBoard } from "./edge-duel/duel-board";
import { DUELS } from "./edge-duel/duels";
import type { WidgetProps } from "./types";

/** Progress dots: won duels glow gold, locked ones wait for the previous win. */
function DuelTrack({
  current,
  won,
  unlocked,
  onSelect,
}: {
  current: number;
  won: Record<string, boolean>;
  unlocked: (i: number) => boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <nav aria-label="Duels">
      <ol className="flex items-center">
        {DUELS.map((duel, i) => {
          const isWon = Boolean(won[duel.id]);
          const open = unlocked(i);
          const isCurrent = i === current;
          return (
            <li key={duel.id} className={cn("flex items-center", i < DUELS.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                disabled={!open}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Duel ${i + 1}: ${duel.title}${isWon ? ", won" : open ? "" : ", locked until you win the previous duel"}`}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition sm:pr-3",
                  isCurrent ? "bg-white/[0.07] ring-1 ring-white/15" : "hover:bg-white/[0.04]",
                  !open && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-black transition-colors",
                    isWon
                      ? "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950 shadow-[0_0_16px_rgba(245,197,66,0.6)]"
                      : isCurrent
                        ? "bg-gradient-to-br from-energy-300 to-energy-600 text-shadow-950"
                        : "border border-white/15 bg-shadow-900 text-ash-300",
                  )}
                >
                  {isWon ? (
                    <Icon name="check" size={15} strokeWidth={3} />
                  ) : open ? (
                    i + 1
                  ) : (
                    <Icon name="lock" size={13} />
                  )}
                  {isCurrent && (
                    <motion.span
                      layoutId="edge-duel-track-ring"
                      className="absolute -inset-1 rounded-full ring-2 ring-energy-300/60"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </span>
                <span
                  className={cn("hidden text-[12.5px] font-bold sm:inline", isCurrent ? "text-white" : "text-ash-400")}
                >
                  {duel.title}
                </span>
              </button>
              {i < DUELS.length - 1 && (
                <span
                  className="mx-2 h-[2px] min-w-4 flex-1 overflow-hidden rounded-full bg-white/10"
                  aria-hidden="true"
                >
                  <motion.span
                    className="block h-full bg-gradient-to-r from-gold-300 to-gold-500"
                    initial={false}
                    animate={{ width: isWon ? "100%" : "0%" }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Edge Duel: three short engine-driven duels against a scripted rival, each
 * decided by who holds the Edge token (or by refusing to let it matter).
 */
export default function EdgeDuel({ onComplete, completed }: WidgetProps) {
  const [current, setCurrent] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [won, setWon] = useState<Record<string, boolean>>(() =>
    completed ? Object.fromEntries(DUELS.map((d) => [d.id, true])) : {},
  );
  const [hints, setHints] = useState<Record<string, number>>({});
  const [celebrate, setCelebrate] = useState(0);

  const duel = DUELS[current]!;
  const allWon = DUELS.every((d) => won[d.id]);
  const unlocked = (i: number) => completed || i === 0 || Boolean(won[DUELS[i - 1]!.id]);

  const onFinish = useCallback(
    (didWin: boolean) => {
      if (!didWin) return;
      const next = { ...won, [duel.id]: true };
      const wasAll = DUELS.every((d) => won[d.id]);
      setWon(next);
      if (DUELS.every((d) => next[d.id])) {
        onComplete();
        if (!wasAll) setCelebrate((c) => c + 1);
      }
    },
    [won, duel.id, onComplete],
  );

  const select = (i: number) => {
    if (!unlocked(i) || i === current) return;
    setCurrent(i);
    setAttempt((a) => a + 1);
  };

  const isLast = current === DUELS.length - 1;

  return (
    <div className="panel relative overflow-hidden p-4 sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-energy-500/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <DuelTrack current={current} won={won} unlocked={unlocked} onSelect={select} />
        </div>
        {completed && (
          <span className="flex items-center gap-1 rounded-full border border-leaf-400/40 bg-leaf-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-leaf-300">
            <Icon name="check" size={12} strokeWidth={3} />
            Cleared
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {allWon && celebrate > 0 && (
          <motion.div
            key="all-clear"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative mt-4 flex items-center gap-3 rounded-2xl border border-gold-400/40 bg-gradient-to-r from-gold-400/20 via-gold-400/5 to-transparent px-4 py-3"
            role="status"
          >
            <ParticleBurst fire={celebrate} palette="gold" shape="star" count={34} spread={160} />
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950">
              <Emblem name="edge" size={22} />
            </span>
            <p className="relative text-sm text-ash-200">
              <span className="font-black text-gold-200">Edge mastered.</span> You kept it, stole it and beat it. Ties
              are never an accident again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mt-5">
        <DuelBoard
          key={`${duel.id}-${attempt}`}
          duel={duel}
          index={current}
          total={DUELS.length}
          hintsShown={hints[duel.id] ?? 0}
          onHint={() => setHints((h) => ({ ...h, [duel.id]: Math.min(duel.hints.length, (h[duel.id] ?? 0) + 1) }))}
          onFinish={onFinish}
          onRetry={() => setAttempt((a) => a + 1)}
          onNext={isLast ? undefined : () => select(current + 1)}
          nextLabel={isLast ? undefined : `Next: ${DUELS[current + 1]!.title}`}
          intro={attempt > 0}
          finale={allWon && celebrate > 0}
        />
      </div>
    </div>
  );
}
