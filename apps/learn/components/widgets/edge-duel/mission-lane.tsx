"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard } from "@/components/game/game-card";
import { MissionCard } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { sidePower, topCard, unitPower } from "@/lib/game/engine";
import { cn } from "@/lib/cn";
import type { CardCatalog, GameState, MissionState, Side } from "@/lib/game/types";
import { SIDE_STYLE } from "./sides";

type Projection = { winner: Side | null; byEdge: boolean };

/** Who would win this mission if it were scored right now. */
export function projectMission(
  mission: MissionState,
  edge: Side,
  cards: CardCatalog,
): Projection & Record<Side, number> {
  const you = sidePower(mission, "you", cards);
  const opp = sidePower(mission, "opp", cards);
  if (you !== opp) return { you, opp, winner: you > opp ? "you" : "opp", byEdge: false };
  return { you, opp, winner: you >= 1 ? edge : null, byEdge: you >= 1 };
}

function UnitRow({
  side,
  mission,
  cards,
  fresh,
  compact,
}: {
  side: Side;
  mission: MissionState;
  cards: CardCatalog;
  fresh: string[];
  compact: boolean;
}) {
  const units = mission.units.filter((u) => u.side === side);
  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-2.5",
        compact ? "min-h-[96px]" : "min-h-[132px]",
        side === "opp" ? "items-start" : "items-end",
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {units.map((unit) => {
          const card = topCard(unit, cards);
          const power = unitPower(unit, mission, cards);
          const isFresh = fresh.includes(unit.uid);
          const label = unit.hidden
            ? side === "you"
              ? `Your hidden ${card.name}, ${power} Power. Reveal it for ${card.cost} Chakra.`
              : `Rival's hidden character, ${power} Power.`
            : `${side === "you" ? "Your" : "Rival's"} ${card.name}, ${card.title}. ${power} Power.`;
          return (
            <motion.div
              key={unit.uid}
              layout
              initial={{ opacity: 0, y: side === "you" ? 40 : -40, scale: 0.7, rotate: side === "you" ? 6 : -6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 12, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative flex flex-col items-center gap-1"
            >
              <GameCard
                card={card}
                size={compact ? "xs" : "sm"}
                faceDown={unit.hidden}
                power={power}
                powerTokens={unit.hidden ? 0 : unit.powerTokens}
                highlight={isFresh ? (side === "you" ? "energy" : "blood") : undefined}
                label={label}
              />
              {unit.hidden && side === "you" && (
                <span className="max-w-[92px] truncate text-[10px] font-semibold text-mist-300">{card.name}</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {units.length === 0 && (
        <span
          className={cn(
            "flex items-center justify-center rounded-xl border border-dashed border-white/10 px-3 text-center text-[11px] text-ash-500",
            compact ? "h-[90px] w-16" : "h-[128px] w-[92px]",
          )}
        >
          {side === "you" ? "Your ninjas" : "Rival ninjas"}
        </span>
      )}
    </div>
  );
}

/** Tug-of-war bar between the two Power totals. */
function PowerBalance({ you, opp }: { you: number; opp: number }) {
  const total = you + opp;
  const share = total === 0 ? 50 : Math.round((you / total) * 100);
  const level = you === opp && total > 0;
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
      <motion.span
        className={cn("absolute inset-y-0 left-0 rounded-l-full bg-gradient-to-r", SIDE_STYLE.you.bar)}
        initial={false}
        animate={{ width: `${share}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
      />
      <motion.span
        className={cn("absolute inset-y-0 right-0 rounded-r-full bg-gradient-to-l", SIDE_STYLE.opp.bar)}
        initial={false}
        animate={{ width: `${100 - share}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
      />
      <span
        className={cn(
          "absolute inset-y-[-2px] left-1/2 w-[3px] -translate-x-1/2 rounded-full transition-colors",
          level ? "bg-gold-200 shadow-[0_0_10px_rgba(245,197,66,1)]" : "bg-white/40",
        )}
      />
    </div>
  );
}

function PowerPill({ side, value }: { side: Side; value: number }) {
  const s = SIDE_STYLE[side];
  return (
    <span className={cn("flex items-baseline gap-1 rounded-lg border px-2 py-1", s.border, s.soft)}>
      <span className={cn("text-[10px] font-black uppercase tracking-wider", s.text)}>{s.label}</span>
      <span className="text-lg font-black leading-none tabular-nums text-white">
        <AnimatedNumber value={value} />
      </span>
    </span>
  );
}

/** One mission: rival ninjas above, yours below, live Power totals and who wins it right now. */
export function MissionLane({
  mission,
  state,
  cards,
  fresh,
  compact,
}: {
  mission: MissionState;
  state: GameState;
  cards: CardCatalog;
  fresh: string[];
  compact: boolean;
}) {
  const p = projectMission(mission, state.edge, cards);
  const [burst, setBurst] = useState<{ n: number; side: Side }>({ n: 0, side: "you" });
  const last = useRef({ you: p.you, opp: p.opp });

  useEffect(() => {
    const prev = last.current;
    if (p.you > prev.you) setBurst((b) => ({ n: b.n + 1, side: "you" }));
    else if (p.opp > prev.opp) setBurst((b) => ({ n: b.n + 1, side: "opp" }));
    last.current = { you: p.you, opp: p.opp };
  }, [p.you, p.opp]);

  const verdict =
    p.winner === null
      ? "Nobody has Power here yet"
      : p.byEdge
        ? `Level: the Edge gives it to ${p.winner === "you" ? "you" : "your rival"}`
        : p.winner === "you"
          ? `You lead by ${p.you - p.opp}`
          : `Rival leads by ${p.opp - p.you}`;

  return (
    <section
      aria-label={`${mission.def.rank}-rank mission: ${mission.def.name}. You ${p.you} Power, rival ${p.opp} Power. ${verdict}.`}
      className={cn(
        "relative rounded-2xl border bg-gradient-to-b from-shadow-800/60 via-shadow-900/70 to-shadow-800/60 p-3 sm:p-4",
        p.byEdge ? "border-gold-400/30" : "border-white/[0.08]",
      )}
    >
      <ParticleBurst fire={burst.n} palette={SIDE_STYLE[burst.side].palette} count={18} spread={90} />
      <UnitRow side="opp" mission={mission} cards={cards} fresh={fresh} compact={compact} />
      <div className="my-3 space-y-2">
        <MissionCard mission={mission.def} compact highlight={p.byEdge} />
        <div className="flex items-center gap-2">
          <PowerPill side="you" value={p.you} />
          <div className="min-w-0 flex-1">
            <PowerBalance you={p.you} opp={p.opp} />
          </div>
          <PowerPill side="opp" value={p.opp} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={verdict}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex items-center justify-center gap-1.5 text-center text-[12px] font-bold",
              p.byEdge
                ? "text-gold-200"
                : p.winner === "you"
                  ? "text-energy-300"
                  : p.winner === "opp"
                    ? "text-blood-400"
                    : "text-ash-500",
            )}
          >
            {p.byEdge && <Emblem name="edge" size={14} className="shrink-0" />}
            {verdict}
          </motion.p>
        </AnimatePresence>
      </div>
      <UnitRow side="you" mission={mission} cards={cards} fresh={fresh} compact={compact} />
    </section>
  );
}
