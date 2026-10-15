"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { GameCard } from "@/components/game/game-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { HIDDEN_COST, type Play, type PlayMode } from "./data";
import type { CardDef } from "@/lib/game/types";

export interface FocusTarget {
  cardId: string;
  which: "play" | "undo";
  nonce: number;
}

const ACTION =
  "flex h-8 w-full items-center justify-between gap-1 rounded-lg border px-2 text-[11.5px] font-bold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy-300 focus-visible:ring-offset-1 focus-visible:ring-offset-shadow-900 disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100";

function CostPill({ value, tone }: { value: number; tone: "energy" | "mist" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10.5px] font-black text-white ring-1",
        tone === "energy"
          ? "bg-gradient-to-br from-energy-300 to-energy-600 ring-energy-200/50 shadow-[0_0_8px_rgba(56,196,255,0.6)]"
          : "bg-gradient-to-br from-mist-300 to-mist-600 ring-mist-200/50 shadow-[0_0_8px_rgba(139,92,246,0.6)]",
      )}
    >
      {value}
    </span>
  );
}

/**
 * A card in hand with "play face-up" and "play hidden" options. Playing pops
 * an EXHAUST tag over the card; a played card can be taken back with Undo.
 */
export function HandSlot({
  card,
  play,
  remaining,
  locked,
  compact,
  index,
  flash,
  focusTarget,
  reduce,
  registerEl,
  onPlay,
  onUndo,
}: {
  card: CardDef;
  play: Play | undefined;
  remaining: number;
  /** End phase: no more changes. */
  locked: boolean;
  compact: boolean;
  index: number;
  /** Increments when spent Chakra lands on the card. */
  flash: number;
  focusTarget: FocusTarget | null;
  reduce: boolean;
  registerEl: (cardId: string, el: HTMLElement | null) => void;
  onPlay: (cardId: string, mode: PlayMode) => void;
  onUndo: (cardId: string) => void;
}) {
  const upRef = useRef<HTMLButtonElement>(null);
  const hiddenRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const canUp = !play && !locked && card.cost <= remaining;
  const canHidden = !play && !locked && HIDDEN_COST <= remaining;
  const stuck = !play && !locked && !canUp && !canHidden;

  // Keep keyboard focus on this slot when its buttons swap (play <-> undo).
  useEffect(() => {
    if (!focusTarget || focusTarget.cardId !== card.id) return;
    const candidates = focusTarget.which === "undo" ? [undoRef.current] : [upRef.current, hiddenRef.current];
    candidates.find((el) => el && !el.disabled)?.focus({ preventScroll: true });
  }, [focusTarget, card.id]);

  return (
    <motion.li
      className={cn("flex flex-col items-center gap-3", compact ? "w-[100px]" : "w-[138px]")}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 + index * 0.07 }}
    >
      <div ref={(el) => registerEl(card.id, el)} className="relative">
        <GameCard
          card={card}
          size={compact ? "sm" : "md"}
          faceDown={play?.mode === "hidden"}
          highlight={play ? (play.mode === "up" ? "chakra" : "mist") : undefined}
          dimmed={(locked && !play) || stuck}
          label={play?.mode === "hidden" ? `${card.name}, played hidden` : undefined}
        />

        {/* Chakra landing on the card. */}
        {flash > 0 && !reduce && (
          <motion.span
            key={flash}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[11px]"
            style={{
              background:
                play?.mode === "hidden"
                  ? "radial-gradient(circle at 50% 45%, rgba(167,139,250,0.8), transparent 70%)"
                  : "radial-gradient(circle at 50% 45%, rgba(56,196,255,0.8), transparent 70%)",
            }}
            initial={{ opacity: 0.95, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
        )}

        {/* EXHAUST pop. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[34%] z-10 flex justify-center">
          <AnimatePresence>
            {play && (
              <motion.span
                key={play.id}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-black tracking-wider shadow-lg",
                  compact ? "text-[9.5px]" : "text-[11px]",
                  play.mode === "up"
                    ? "border-chakra-200/70 bg-gradient-to-r from-chakra-400 to-blood-400 text-shadow-950 shadow-chakra-500/40"
                    : "border-mist-200/70 bg-gradient-to-r from-mist-400 to-mist-600 text-white shadow-mist-500/40",
                )}
                initial={{ opacity: 0, scale: 0.3, y: 12 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.2, 1, 0.95], y: [12, 0, -10, -34] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.9, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
              >
                <Icon name="bolt" size={compact ? 10 : 12} strokeWidth={2.4} />
                EXHAUST −{play.cost}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={cn("flex w-full flex-col items-center gap-1.5", locked ? "min-h-[26px]" : "min-h-[70px]")}>
        {play ? (
          <>
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-black tracking-wide",
                play.mode === "up"
                  ? "border-chakra-400/40 bg-chakra-500/10 text-chakra-200"
                  : "border-mist-400/40 bg-mist-500/10 text-mist-200",
              )}
            >
              <Icon name={play.mode === "up" ? "check" : "eye-off"} size={11} strokeWidth={2.6} />
              {play.mode === "up" ? "Face-up" : "Hidden"} −{play.cost}
            </motion.span>
            {!locked && (
              <button
                ref={undoRef}
                type="button"
                onClick={() => onUndo(card.id)}
                aria-label={`Undo: take ${card.name} back and refund ${play.cost} Chakra`}
                className={cn(
                  ACTION,
                  "justify-center border-white/10 bg-white/[0.05] text-ash-200 hover:border-white/25 hover:bg-white/10",
                )}
              >
                <Icon name="undo" size={13} />
                Undo
              </button>
            )}
          </>
        ) : locked ? (
          <span className="mt-1 text-[11px] font-semibold text-ash-500">Not played</span>
        ) : (
          <>
            <button
              ref={upRef}
              type="button"
              disabled={!canUp}
              onClick={() => onPlay(card.id, "up")}
              aria-label={`Play ${card.name} face-up for ${card.cost} Chakra${canUp ? "" : " (not enough Chakra)"}`}
              className={cn(
                ACTION,
                "border-energy-400/35 bg-energy-500/10 text-energy-100 enabled:hover:border-energy-300/70 enabled:hover:bg-energy-500/20",
              )}
            >
              <span className="flex min-w-0 items-center gap-1">
                {!compact && <Icon name="play" size={11} />}
                Face-up
              </span>
              <CostPill value={card.cost} tone="energy" />
            </button>
            <button
              ref={hiddenRef}
              type="button"
              disabled={!canHidden}
              onClick={() => onPlay(card.id, "hidden")}
              aria-label={`Play ${card.name} hidden for ${HIDDEN_COST} Chakra${canHidden ? "" : " (not enough Chakra)"}`}
              className={cn(
                ACTION,
                "border-mist-400/35 bg-mist-500/10 text-mist-200 enabled:hover:border-mist-300/70 enabled:hover:bg-mist-500/20",
              )}
            >
              <span className="flex min-w-0 items-center gap-1">
                {!compact && <Icon name="eye-off" size={12} />}
                Hidden
              </span>
              <CostPill value={HIDDEN_COST} tone="mist" />
            </button>
          </>
        )}
      </div>
    </motion.li>
  );
}
