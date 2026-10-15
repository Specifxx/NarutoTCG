"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { ChakraPool } from "@/components/game/chakra-pool";
import { EdgeToken } from "@/components/game/edge-token";
import { GameCard } from "@/components/game/game-card";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CardCatalog, Side } from "@/lib/game/types";
import { EDGE_LAYOUT_ID, SIDE_STYLE } from "./sides";
import type { EdgeFlourish } from "./use-duel";

/** Plays the "Takes the Edge!" flourish for ~1.8s whenever a new one targets this side. */
function useFlourish(side: Side, flourish: EdgeFlourish | null) {
  const [shown, setShown] = useState<EdgeFlourish | null>(null);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (!flourish || flourish.side !== side) return;
    setShown(flourish);
    setBurst((b) => b + 1);
    const t = window.setTimeout(() => setShown(null), 1800);
    return () => window.clearTimeout(t);
  }, [flourish, side]);
  return { shown, burst };
}

/**
 * A player's seat: avatar, Chakra, pass state and the Edge slot. The Edge
 * token shares one layoutId, so it flies to whichever seat holds it.
 */
export function Seat({
  side,
  chakra,
  passed,
  holdsEdge,
  flourish,
  active,
  hand,
  cards,
}: {
  side: Side;
  chakra: number;
  passed: boolean;
  holdsEdge: boolean;
  flourish: EdgeFlourish | null;
  /** Whose turn it is (for the "thinking" glow). */
  active: boolean;
  /** Rival's hand, shown face-up for training. */
  hand?: string[];
  cards: CardCatalog;
}) {
  const s = SIDE_STYLE[side];
  const reduce = useReducedMotion();
  const { shown, burst } = useFlourish(side, flourish);

  return (
    <div
      className={cn(
        "relative rounded-2xl border px-3 py-3 transition-[border-color,box-shadow,background-color] duration-500 sm:px-4",
        holdsEdge
          ? "border-gold-400/45 bg-gold-400/[0.05] shadow-[0_0_36px_-10px_rgba(245,197,66,0.55)]"
          : "border-white/[0.07] bg-black/20",
      )}
    >
      {holdsEdge && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 rounded-r-2xl"
          style={{ background: "radial-gradient(ellipse 60% 90% at 100% 50%, rgba(245,197,66,0.16), transparent 70%)" }}
        />
      )}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <span
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-shadow-950 ring-2",
            s.solid,
            active ? "ring-white/60" : "ring-white/10",
          )}
          aria-hidden="true"
        >
          <Emblem name={s.emblem} size={22} />
          {active && !passed && !reduce && (
            <motion.span
              className={cn("absolute -inset-1 rounded-full ring-2", s.ring)}
              animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0, 0.9] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("eyebrow !text-[10px]", s.text)}>{s.label}</p>
          <p className="truncate text-sm font-black text-white">{s.title}</p>
        </div>
        <div className="order-last flex w-full flex-wrap items-center gap-2 sm:order-none sm:w-auto">
          <ChakraPool value={chakra} size="sm" label={side === "you" ? "Your Chakra" : "Rival Chakra"} />
          <AnimatePresence initial={false}>
            {passed && (
              <motion.span
                key="passed"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] font-black uppercase tracking-wider text-ash-200"
              >
                <Icon name="flag" size={12} strokeWidth={2.4} />
                Passed
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="relative z-20 flex h-12 w-12 shrink-0 items-center justify-center">
          <ParticleBurst fire={burst} palette="gold" shape="star" count={20} spread={80} />
          {holdsEdge ? (
            <EdgeToken size={44} layoutId={EDGE_LAYOUT_ID} spin={!reduce} />
          ) : (
            <span
              className="h-11 w-11 rounded-full border border-dashed border-white/15"
              role="img"
              aria-label={`${s.label}: no Edge`}
            />
          )}
        </div>
      </div>

      {hand && (
        <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <p className="w-full text-[11px] font-semibold text-ash-500 sm:w-auto sm:pr-1">
            Hand <span className="text-ash-500/80">(shown for training)</span>
          </p>
          {hand.length === 0 ? (
            <span className="text-xs text-ash-500">Empty</span>
          ) : (
            hand.map((id, i) => {
              const card = cards[id];
              if (!card) return null;
              const affordable = card.cost <= chakra;
              return (
                <div key={`${id}-${i}`} className="flex items-center gap-1.5">
                  <GameCard card={card} size="xs" dimmed={!affordable} />
                  {!affordable && (
                    <span className="max-w-[72px] text-[10px] leading-tight text-ash-500">
                      Needs {card.cost} Chakra face-up
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.id}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-shadow-950/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.span
              className="flex items-center gap-2 rounded-full border border-gold-300/60 bg-gradient-to-r from-gold-500/30 via-gold-300/25 to-gold-500/30 px-4 py-2 shadow-[0_0_40px_-6px_rgba(245,197,66,0.8)]"
              initial={{ scale: 0.5, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
            >
              <Emblem name="edge" size={20} className="text-gold-200" />
              <span className="text-gold-gradient text-base font-black uppercase tracking-[0.12em] sm:text-lg">
                {shown.kind === "takes" ? "Takes the Edge!" : "Keeps the Edge!"}
              </span>
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
