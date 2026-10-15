"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard, type CardSize } from "@/components/game/game-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CardDef, UnitState } from "@/lib/game/types";
import { MoveButton } from "./move-button";
import type { MoveOption, UnitFx } from "./types";

export interface BoardUnitProps {
  unit: UnitState;
  card: CardDef;
  power: number;
  size: CardSize;
  layoutId: string;
  /** True when the unit arrived from your hand (the hand card flies in instead of fading in). */
  fromHand: boolean;
  scout: boolean;
  selected: boolean;
  selectable: boolean;
  onSelect: (uid: string) => void;
  options: readonly MoveOption[];
  onPerform: (option: MoveOption) => void;
  onBlocked: (option: MoveOption) => void;
  coachKey: string | null;
  coachHighlight: boolean;
  fx: UnitFx | undefined;
  registerRef: (uid: string, el: HTMLElement | null) => void;
}

export function BoardUnit({
  unit,
  card,
  power,
  size,
  layoutId,
  fromHand,
  scout,
  selected,
  selectable,
  onSelect,
  options,
  onPerform,
  onBlocked,
  coachKey,
  coachHighlight,
  fx,
  registerRef,
}: BoardUnitProps) {
  const mine = unit.side === "you";
  const [fire, setFire] = useState(0);
  const seen = useRef(0);

  useEffect(() => {
    if (fx && fx.seq > seen.current) {
      seen.current = fx.seq;
      setFire((f) => f + 1);
    }
  }, [fx]);

  const showName = unit.hidden && (mine || scout);
  const label = unit.hidden
    ? mine
      ? `Your hidden ${card.name}, ${power} Power. ${selectable ? `Select to reveal for ${card.cost} Chakra.` : ""}`
      : scout
        ? `Enemy hidden character (scouted: ${card.name}), ${power} Power.`
        : `Enemy hidden character, ${power} Power.`
    : `${mine ? "Your" : "Enemy"} ${card.name}, ${card.title}. ${power} Power${unit.powerTokens ? `, including ${unit.powerTokens} Power token${unit.powerTokens === 1 ? "" : "s"}` : ""}.`;

  // Exit animation chosen per unit: defeated units shatter, undone ones just fade.
  const exitVariants: Variants = {
    exit: (defeated: ReadonlySet<string> | undefined) =>
      defeated?.has(unit.uid)
        ? {
            opacity: 0,
            scale: 0.35,
            rotate: mine ? -28 : 28,
            y: mine ? 18 : -18,
            filter: "blur(3px) brightness(2.2)",
            transition: { duration: 0.55, ease: [0.4, 0, 1, 1] },
          }
        : { opacity: 0, scale: 0.85, transition: { duration: 0.18 } },
  };

  return (
    <motion.div
      layout="position"
      ref={(el) => registerRef(unit.uid, el)}
      variants={exitVariants}
      initial={fromHand ? false : { opacity: 0, scale: 0.7, y: mine ? 26 : -26 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit="exit"
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="relative flex min-w-0 flex-col items-center gap-1"
      data-uid={unit.uid}
    >
      <div className="relative">
        <GameCard
          card={card}
          size={size}
          faceDown={unit.hidden}
          conceal={!mine && !scout}
          power={power}
          powerTokens={unit.powerTokens}
          layoutId={layoutId}
          selected={selected}
          highlight={coachHighlight ? "gold" : selectable && unit.hidden ? "mist" : undefined}
          onClick={selectable ? () => onSelect(unit.uid) : undefined}
          label={label}
        />
        <ParticleBurst fire={fire} palette={fx?.palette ?? "chakra"} count={18} spread={70} shape="mixed" />
        <AnimatePresence>
          {fx?.float && fire > 0 && (
            <motion.span
              key={fire}
              aria-hidden="true"
              initial={{ opacity: 0, y: 6, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: "easeOut" }}
              className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 text-lg font-black text-gold-200 drop-shadow-[0_0_10px_rgba(245,197,66,0.95)]"
            >
              {fx.float}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {showName && (
        <span
          className={cn(
            "flex max-w-[92px] items-center gap-1 truncate rounded-md px-1.5 py-px text-[10px] font-bold",
            mine ? "bg-mist-500/15 text-mist-200" : "bg-energy-500/10 text-energy-200",
          )}
          title={mine ? `${card.name} (hidden)` : `Scouted: ${card.name}`}
        >
          <Icon name={mine ? "eye-off" : "eye"} size={10} className="shrink-0" />
          <span className="truncate">{card.name.split(" ")[0]}</span>
        </span>
      )}
      {size === "xs" && !unit.hidden && (
        <span
          className="line-clamp-2 max-w-[76px] rounded-md bg-white/[0.06] px-1.5 py-px text-center text-[9.5px] font-bold leading-tight text-ash-100"
          title={`${card.name}, ${card.title}`}
          aria-hidden="true"
        >
          {card.name.split(" ")[0]}
          {unit.stack.length > 1 && <span className="font-semibold text-gold-200"> · {card.title}</span>}
        </span>
      )}
      <AnimatePresence initial={false}>
        {options.map((o) => (
          <MoveButton
            key={o.key}
            option={o}
            onPerform={onPerform}
            onBlocked={onBlocked}
            coached={coachKey === o.key}
            compact
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
