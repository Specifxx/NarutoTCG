"use client";

import { motion } from "framer-motion";
import type { KeyboardEvent, ReactNode } from "react";
import { Emblem } from "@/components/ui/emblem";
import { cn } from "@/lib/cn";
import type { CardDef, EffectTrigger, Faction } from "@/lib/game/types";

export type CardSize = "xs" | "sm" | "md" | "lg";

export const FACTION_STYLES: Record<Faction, { frame: string; art: string; emblem: string; label: string }> = {
  leaf: {
    frame: "from-leaf-300 via-chakra-400 to-leaf-600",
    art: "from-leaf-600/50 via-shadow-800 to-chakra-600/40",
    emblem: "text-chakra-200",
    label: "Leaf",
  },
  sand: {
    frame: "from-gold-200 via-gold-500 to-chakra-600",
    art: "from-gold-600/50 via-shadow-800 to-chakra-600/30",
    emblem: "text-gold-200",
    label: "Sand",
  },
  mist: {
    frame: "from-energy-200 via-energy-500 to-mist-600",
    art: "from-energy-600/50 via-shadow-800 to-mist-600/40",
    emblem: "text-energy-200",
    label: "Mist",
  },
  cloud: {
    frame: "from-gold-200 via-energy-300 to-energy-600",
    art: "from-gold-500/30 via-shadow-800 to-energy-600/40",
    emblem: "text-gold-200",
    label: "Cloud",
  },
  sound: {
    frame: "from-mist-300 via-mist-500 to-shadow-600",
    art: "from-mist-600/50 via-shadow-800 to-mist-900/60",
    emblem: "text-mist-200",
    label: "Sound",
  },
  akatsuki: {
    frame: "from-blood-400 via-blood-600 to-shadow-900",
    art: "from-blood-600/60 via-shadow-800 to-black",
    emblem: "text-blood-400",
    label: "Akatsuki",
  },
};

export const TRIGGER_STYLES: Record<EffectTrigger, { label: string; className: string }> = {
  MAIN: { label: "MAIN", className: "bg-chakra-500/90 text-shadow-950" },
  AMBUSH: { label: "AMBUSH", className: "bg-mist-500 text-white" },
  UPGRADE: { label: "UPGRADE", className: "bg-gold-400 text-shadow-950" },
  FIRST_STRIKE: { label: "FIRST STRIKE", className: "bg-blood-500 text-white" },
  SCORE: { label: "SCORE", className: "bg-leaf-500 text-shadow-950" },
  CONTINUOUS: { label: "CONT.", className: "bg-energy-400 text-shadow-950" },
};

const SIZE: Record<CardSize, { root: string; orb: string; name: string; title: string; emblem: number; text: string }> = {
  xs: { root: "w-16", orb: "h-5 w-5 text-[10px]", name: "text-[8px]", title: "hidden", emblem: 26, text: "hidden" },
  sm: { root: "w-[92px]", orb: "h-6 w-6 text-[11px]", name: "text-[9.5px]", title: "text-[7.5px]", emblem: 34, text: "hidden" },
  md: { root: "w-[136px]", orb: "h-7 w-7 text-[13px]", name: "text-[11.5px]", title: "text-[9px]", emblem: 46, text: "text-[8.5px]" },
  lg: { root: "w-[188px]", orb: "h-9 w-9 text-base", name: "text-[14px]", title: "text-[11px]", emblem: 64, text: "text-[10.5px]" },
};

function Orb({ value, kind, className, delta }: { value: number; kind: "cost" | "power"; className: string; delta?: number }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-black tabular-nums ring-1",
        kind === "cost"
          ? "bg-gradient-to-br from-energy-300 to-energy-600 text-white ring-energy-200/60 shadow-[0_0_10px_rgba(56,196,255,0.6)]"
          : delta && delta > 0
            ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950 ring-leaf-300/70 shadow-[0_0_12px_rgba(74,222,128,0.7)]"
            : "bg-gradient-to-br from-chakra-300 to-blood-500 text-white ring-chakra-200/60 shadow-[0_0_10px_rgba(255,122,26,0.55)]",
        className,
      )}
      title={kind === "cost" ? "Chakra cost" : "Power"}
    >
      {value}
    </span>
  );
}

function CardFront({ card, size, power, tokens }: { card: CardDef; size: CardSize; power?: number; tokens: number }) {
  const s = SIZE[size];
  const faction = FACTION_STYLES[card.faction];
  const shown = power ?? card.power + tokens;
  return (
    <div className={cn("absolute inset-0 rounded-[11px] bg-gradient-to-br p-[2px]", faction.frame)}>
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[9px] bg-shadow-900">
        <div className={cn("relative flex-1 overflow-hidden bg-gradient-to-br", faction.art)}>
          <div className="absolute inset-0 opacity-30 [background:repeating-conic-gradient(from_0deg_at_50%_60%,rgba(255,255,255,0.08)_0deg_4deg,transparent_4deg_14deg)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("drop-shadow-[0_0_14px_currentColor]", faction.emblem)}>
              <Emblem name={card.emblem} size={s.emblem} />
            </span>
          </div>
          <div className="absolute inset-x-1 top-1 flex items-start justify-between">
            <Orb value={card.cost} kind="cost" className={s.orb} />
            <Orb value={shown} kind="power" className={s.orb} delta={shown - card.power} />
          </div>
          {card.chakraBonus ? (
            <span className="absolute bottom-1 left-1 rounded bg-energy-500/90 px-1 text-[7px] font-black tracking-wider text-white">
              CHAKRA +{card.chakraBonus}
            </span>
          ) : null}
        </div>
        <div className="relative border-t border-white/10 bg-black/50 px-1.5 py-1">
          <p className={cn("truncate font-black leading-tight text-white", s.name)}>{card.name}</p>
          <p className={cn("truncate font-medium leading-tight text-ash-400", s.title)}>{card.title}</p>
        </div>
        {card.effects.length > 0 && size !== "xs" && size !== "sm" && (
          <div className="flex flex-col gap-0.5 border-t border-white/5 bg-shadow-950/80 px-1.5 py-1">
            {card.effects.map((e, i) => (
              <p key={i} className={cn("leading-snug text-ash-200", s.text, size === "md" && "line-clamp-2")}>
                <span className={cn("mr-1 rounded-sm px-1 py-px text-[0.85em] font-black", TRIGGER_STYLES[e.trigger].className)}>
                  {TRIGGER_STYLES[e.trigger].label}
                </span>
                {e.text}
              </p>
            ))}
          </div>
        )}
        {card.effects.length > 0 && size === "sm" && (
          <div className="flex flex-wrap gap-0.5 border-t border-white/5 bg-shadow-950/80 px-1 py-0.5">
            {card.effects.map((e, i) => (
              <span key={i} className={cn("rounded-sm px-1 text-[6.5px] font-black", TRIGGER_STYLES[e.trigger].className)}>
                {TRIGGER_STYLES[e.trigger].label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardBack({ size, power, showLabel = true }: { size: CardSize; power?: number; showLabel?: boolean }) {
  const s = SIZE[size];
  return (
    <div className="absolute inset-0 rounded-[11px] bg-gradient-to-br from-mist-300 via-mist-600 to-shadow-700 p-[2px]">
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[9px] bg-[radial-gradient(circle_at_50%_40%,#2e1065_0%,#0d0d14_70%)]">
        <div className="absolute inset-0 opacity-40 [background:repeating-radial-gradient(circle_at_50%_45%,rgba(167,139,250,0.25)_0_1px,transparent_1px_9px)]" />
        <span className="relative text-mist-300 drop-shadow-[0_0_12px_rgba(167,139,250,0.9)]">
          <Emblem name="spiral" size={s.emblem} />
        </span>
        {size !== "xs" && showLabel && (
          <span className="eyebrow relative mt-1.5 !text-[8px] text-mist-200/90">Hidden</span>
        )}
        {power !== undefined && (
          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1 text-[10px] font-black text-mist-200 ring-1 ring-mist-400/50">
            {power}
          </span>
        )}
      </div>
    </div>
  );
}

export interface GameCardProps {
  card: CardDef;
  size?: CardSize;
  /** Show the hidden back. Toggling it animates a 3D flip. */
  faceDown?: boolean;
  /** Live Power to display (defaults to printed Power + tokens). */
  power?: number;
  powerTokens?: number;
  selected?: boolean;
  dimmed?: boolean;
  /** Extra glow ring, e.g. for a valid target. */
  highlight?: "chakra" | "mist" | "energy" | "leaf" | "gold" | "blood";
  onClick?: () => void;
  disabled?: boolean;
  /** Accessible label override. */
  label?: string;
  className?: string;
  layoutId?: string;
  /** Hide the Power badge on the hidden back (e.g. outside combat). */
  hideBackPower?: boolean;
  /** Hide the "Hidden" label on the back (e.g. for a deck pile). */
  hideBackLabel?: boolean;
  children?: ReactNode;
}

const HIGHLIGHT: Record<NonNullable<GameCardProps["highlight"]>, string> = {
  chakra: "ring-2 ring-chakra-400 shadow-[0_0_24px_rgba(255,122,26,0.7)]",
  mist: "ring-2 ring-mist-400 shadow-[0_0_24px_rgba(139,92,246,0.8)]",
  energy: "ring-2 ring-energy-400 shadow-[0_0_24px_rgba(56,196,255,0.7)]",
  leaf: "ring-2 ring-leaf-400 shadow-[0_0_24px_rgba(74,222,128,0.7)]",
  gold: "ring-2 ring-gold-400 shadow-[0_0_24px_rgba(245,197,66,0.7)]",
  blood: "ring-2 ring-blood-400 shadow-[0_0_24px_rgba(239,64,96,0.7)]",
};

/**
 * A practice card with a 3D flip between face-up and hidden. Interactive when
 * `onClick` is set (keyboard accessible).
 */
export function GameCard({
  card,
  size = "md",
  faceDown = false,
  power,
  powerTokens = 0,
  selected,
  dimmed,
  highlight,
  onClick,
  disabled,
  label,
  className,
  layoutId,
  hideBackPower,
  hideBackLabel,
  children,
}: GameCardProps) {
  const interactive = Boolean(onClick) && !disabled;
  const a11y =
    label ?? (faceDown ? `Hidden character${power !== undefined ? `, ${power} Power` : ""}` : `${card.name}, ${card.title}. Cost ${card.cost}, Power ${power ?? card.power + powerTokens}.`);
  const onKey = (e: KeyboardEvent) => {
    if (interactive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.();
    }
  };
  return (
    <motion.div
      layoutId={layoutId}
      role={onClick ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={a11y}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      aria-disabled={onClick && disabled ? true : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={onKey}
      whileHover={interactive ? { y: -6, rotate: -1 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      animate={{ y: selected ? -10 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "perspective-1000 relative aspect-[5/7] shrink-0 rounded-[11px] outline-none focus-visible:ring-2 focus-visible:ring-chakra-300",
        SIZE[size].root,
        interactive && "cursor-pointer",
        dimmed && "opacity-45 saturate-50",
        className,
      )}
    >
      <motion.div
        className={cn("preserve-3d relative h-full w-full rounded-[11px]", selected && HIGHLIGHT.chakra, highlight && HIGHLIGHT[highlight])}
        initial={false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      >
        <div className="backface-hidden absolute inset-0">
          <CardFront card={card} size={size} power={power} tokens={powerTokens} />
        </div>
        <div className="backface-hidden absolute inset-0 [transform:rotateY(180deg)]">
          <CardBack
            size={size}
            power={faceDown && !hideBackPower ? (power ?? powerTokens) : undefined}
            showLabel={!hideBackLabel}
          />
        </div>
      </motion.div>
      {powerTokens > 0 && (
        <motion.span
          key={powerTokens}
          initial={{ scale: 0.4, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="absolute -bottom-2 -right-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 px-1 text-[11px] font-black text-shadow-950 ring-2 ring-shadow-950 shadow-[0_0_12px_rgba(245,197,66,0.8)]"
          title={`${powerTokens} Power token${powerTokens === 1 ? "" : "s"}`}
        >
          +{powerTokens}
        </motion.span>
      )}
      {children}
    </motion.div>
  );
}
