"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { RankBadge } from "@/components/game/mission-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { PuzzleDef } from "@/lib/game/puzzle";
import type { MissionState, RoundEvaluation, Side } from "@/lib/game/types";
import { outcomeReason } from "./log";
import { StarRow } from "./star-row";
import { useModalFocus } from "./use-modal-focus";

export interface ClearInfo {
  stars: number;
  /** XP granted by this clear (0 when it was already cleared before). */
  xpGranted: number;
  /** Best stars on record after this clear. */
  bestStars: number;
}

export function ResultOverlay({
  open,
  evaluation,
  edge,
  missions,
  puzzle,
  next,
  clear,
  hintsUsed,
  sawSolution,
  canUndo,
  onUndo,
  onRetry,
  onReview,
  onHints,
  turningPoint = null,
}: {
  open: boolean;
  evaluation: RoundEvaluation | null;
  edge: Side;
  missions: readonly MissionState[];
  puzzle: PuzzleDef;
  next: PuzzleDef | null;
  clear: ClearInfo | null;
  hintsUsed: number;
  sawSolution: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onRetry: () => void;
  onReview: () => void;
  onHints: () => void;
  /** On a loss: the opponent move that hid or defeated one of your characters, if any. */
  turningPoint?: string | null;
}) {
  const reduce = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(0);
  const win = evaluation?.winner === "you";

  useModalFocus(open && Boolean(evaluation), dialog, onReview, () =>
    dialog.current?.querySelector<HTMLElement>("[data-autofocus]"),
  );

  useEffect(() => {
    if (!open || !win) return;
    setBurst((b) => b + 1);
    const t1 = setTimeout(() => setBurst((b) => b + 1), 380);
    const t2 = setTimeout(() => setBurst((b) => b + 1), 820);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, win]);

  const nameOf = (id: string) => missions.find((m) => m.def.id === id)?.def.name ?? id;
  const lost = evaluation?.outcomes.filter((o) => o.winner !== "you") ?? [];
  const after = evaluation?.scoreAfter ?? { you: 0, opp: 0 };
  const gap = after.opp - after.you;

  return (
    <AnimatePresence>
      {open && evaluation && (
        <motion.div
          key="result"
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="puzzle-result-title"
            aria-describedby="puzzle-result-summary"
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className={cn(
              "panel relative my-auto w-full max-w-lg overflow-visible p-5 sm:p-7",
              win ? "border-gold-400/30" : "border-blood-400/25",
            )}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.25rem]">
              <span
                className={cn(
                  "absolute -top-24 left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-full blur-3xl",
                  win ? "bg-gold-400/25" : "bg-blood-500/20",
                )}
              />
              {win && !reduce && (
                <span className="absolute -inset-1/2 animate-spin-slow opacity-[0.08] [background:repeating-conic-gradient(from_0deg,#fdeaa8_0deg_6deg,transparent_6deg_18deg)]" />
              )}
            </span>

            <div className="relative flex flex-col items-center text-center">
              <span className="relative">
                <ParticleBurst fire={burst} palette="gold" count={34} spread={180} shape="mixed" duration={1.2} />
                <motion.span
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl",
                    win
                      ? "from-gold-200 via-gold-400 to-chakra-500 text-shadow-950 shadow-gold-500/40"
                      : "from-blood-400 to-blood-600 text-white shadow-blood-600/40",
                  )}
                >
                  <Emblem name={win ? puzzle.emblem : "target"} size={34} />
                </motion.span>
              </span>

              {win ? (
                <motion.h2
                  id="puzzle-result-title"
                  initial={{ scale: 2.4, opacity: 0, letterSpacing: "0.4em" }}
                  animate={{ scale: 1, opacity: 1, letterSpacing: "0.04em" }}
                  transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }}
                  className="mt-4 -skew-x-6 text-5xl font-black text-chakra-gradient drop-shadow-[0_4px_24px_rgba(255,122,26,0.45)] sm:text-6xl"
                >
                  LETHAL!
                </motion.h2>
              ) : (
                <motion.h2
                  id="puzzle-result-title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl"
                >
                  Not lethal yet
                </motion.h2>
              )}

              <p id="puzzle-result-summary" className="mt-2 text-sm text-ash-300">
                Final score{" "}
                <span className="font-black tabular-nums text-white">
                  {after.you}–{after.opp}
                </span>
                {win
                  ? evaluation.decidedByEdge
                    ? ". Tied on points, and you hold the Edge token, so you win the game."
                    : `. ${puzzle.title} cleared.`
                  : evaluation.decidedByEdge
                    ? ". Tied on points, and your opponent holds the Edge token, so they win the game."
                    : `. You were ${gap} point${gap === 1 ? "" : "s"} short.`}
              </p>

              {win && clear && (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <StarRow value={clear.stars} size={34} pop delay={0.35} label={`${clear.stars} of 3 stars`} />
                  <p className="text-[12px] font-semibold text-ash-400">
                    {sawSolution ? "Solution shown" : hintsUsed > 0 ? `${hintsUsed} hint${hintsUsed === 1 ? "" : "s"} used` : "No hints. Flawless."}
                  </p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className={cn(
                      "mt-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-black",
                      clear.xpGranted > 0
                        ? "border-gold-400/40 bg-gold-400/10 text-gold-200"
                        : "border-white/10 bg-white/[0.04] text-ash-300",
                    )}
                  >
                    <Icon name="sparkles" size={14} />
                    {clear.xpGranted > 0
                      ? `+${clear.xpGranted} XP${sawSolution ? " (half, solution shown)" : ""}`
                      : `Already cleared · best ${clear.bestStars}★`}
                  </motion.p>
                </div>
              )}

              {!win && turningPoint && (
                <p className="mt-5 flex w-full items-start gap-2 rounded-xl border border-blood-400/30 bg-blood-500/10 px-3 py-2 text-left text-[12.5px] leading-snug text-ash-200">
                  <Icon name="bolt" size={14} className="mt-0.5 shrink-0 text-blood-400" />
                  <span>
                    <span className="font-black text-blood-400">Turning point: </span>
                    {turningPoint}
                  </span>
                </p>
              )}

              <ul className="mt-5 w-full space-y-1.5 text-left" aria-label="Mission results">
                {evaluation.outcomes.map((o, i) => {
                    const mine = o.winner === "you";
                    return (
                      <motion.li
                        key={o.missionId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.07 }}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border px-2.5 py-2",
                          mine ? "border-leaf-400/20 bg-leaf-500/[0.05]" : "border-blood-400/25 bg-blood-500/[0.06]",
                        )}
                      >
                        <RankBadge rank={o.rank} size={24} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-bold text-white">{nameOf(o.missionId)}</span>
                            <span
                              className={cn(
                                "flex shrink-0 items-center gap-1 text-[11px] font-black",
                                mine ? "text-leaf-300" : o.winner ? "text-blood-400" : "text-ash-400",
                              )}
                            >
                              <Icon name={mine ? "check" : o.winner ? "x" : "minus"} size={12} />
                              {mine ? `Won · +${o.points}` : o.winner ? `Lost · Opp +${o.points}` : "Nobody scores"}
                            </span>
                          </span>
                          <span className="block text-[11.5px] leading-snug text-ash-400">{outcomeReason(o, edge)}</span>
                        </span>
                      </motion.li>
                    );
                  })}
              </ul>

              {!win && lost.length > 0 && (
                <p className="mt-3 text-[12px] leading-relaxed text-ash-400">
                  Look at the missions you lost or tied. Remember that the Edge holder wins every tie and a mission with 0 Power
                  on both sides scores for nobody.
                </p>
              )}

              <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                {win ? (
                  <>
                    {next ? (
                      <ButtonLink
                        href={`/puzzles/${next.id}`}
                        data-autofocus
                      >
                        Next puzzle
                        <Icon name="arrow-right" size={16} />
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        href="/puzzles"
                        data-autofocus
                      >
                        <Icon name="trophy" size={16} />
                        All puzzles
                      </ButtonLink>
                    )}
                    {next && (
                      <ButtonLink href="/puzzles" variant="secondary">
                        All puzzles
                      </ButtonLink>
                    )}
                    <Button variant="ghost" onClick={onRetry}>
                      <Icon name="refresh" size={15} />
                      Replay
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={onRetry}
                        data-autofocus
                    >
                      <Icon name="refresh" size={15} />
                      Retry
                    </Button>
                    <Button variant="secondary" onClick={onUndo} disabled={!canUndo}>
                      <Icon name="undo" size={15} />
                      Undo last move
                    </Button>
                    <Button variant="ghost" onClick={onHints}>
                      <Icon name="lightbulb" size={15} />
                      Hints
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={onReview}>
                  <Icon name="eye" size={15} />
                  View board
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
