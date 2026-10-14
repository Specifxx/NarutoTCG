"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard } from "@/components/game/game-card";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { BASE_CHAKRA, sourceAmount, TERM_STYLES, type ChakraSource } from "./data";

/** The base-income "card": not a deck card, just every player's 5 Chakra as the Kage. */
export function KageSealCard({ active, reduce, compact }: { active: boolean; reduce: boolean; compact: boolean }) {
  return (
    <div
      className={cn(
        "relative aspect-[5/7] shrink-0 rounded-[11px] bg-gradient-to-br from-gold-200 via-energy-400 to-mist-600 p-[2px]",
        compact ? "w-[92px]" : "w-[136px]",
      )}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[9px] bg-shadow-900">
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#0f3a57_0%,#0b1220_55%,#07070b_100%)]">
          <div className="absolute inset-0 opacity-30 [background:repeating-conic-gradient(from_0deg_at_50%_48%,rgba(125,220,255,0.18)_0deg_3deg,transparent_3deg_15deg)]" />
          {/* Seal rings. */}
          <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 m-auto h-[86%] w-[86%]">
            <g className={cn("origin-center", active && !reduce && "animate-spin-slow")} style={{ transformBox: "fill-box" }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(125,220,255,0.45)" strokeWidth="1" strokeDasharray="2 4" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                return (
                  <line
                    key={i}
                    x1={50 + Math.cos(a) * 30}
                    y1={50 + Math.sin(a) * 30}
                    x2={50 + Math.cos(a) * 37}
                    y2={50 + Math.sin(a) * 37}
                    stroke="rgba(253,234,168,0.6)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
            <circle cx="50" cy="50" r="27" fill="rgba(14,165,233,0.12)" stroke="rgba(125,220,255,0.6)" strokeWidth="1.2" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-gold-200 drop-shadow-[0_0_14px_rgba(245,197,66,0.8)]">
            <Emblem name="kage" size={compact ? 30 : 44} />
          </div>
          <span
            className={cn(
              "absolute left-1 top-1 flex items-center justify-center rounded-full bg-gradient-to-br from-energy-300 to-energy-600 font-black text-white shadow-[0_0_10px_rgba(56,196,255,0.6)] ring-1 ring-energy-200/60",
              compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[13px]",
            )}
          >
            {BASE_CHAKRA}
          </span>
          <span className="absolute bottom-1 left-1 rounded bg-energy-500/90 px-1 text-[7px] font-black tracking-wider text-white">
            {compact ? "BASE" : "BASE CHAKRA"}
          </span>
        </div>
        <div className="relative border-t border-white/10 bg-black/50 px-1.5 py-1">
          <p className={cn("truncate font-black leading-tight text-white", compact ? "text-[9.5px]" : "text-[11.5px]")}>Kage Seal</p>
          <p className={cn("truncate font-medium leading-tight text-ash-400", compact ? "text-[7.5px]" : "text-[9px]")}>
            Base income · not a card
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A tappable Chakra source. Tapping pulses the card, bursts sparks and hands
 * the card element to `onCharge` so orbs can fly from it into the gauge.
 */
export function SourceTile({
  source,
  charged,
  onCharge,
  index,
  reduce,
  compact,
}: {
  source: ChakraSource;
  charged: boolean;
  onCharge: (source: ChakraSource, from: HTMLElement | null) => void;
  index: number;
  reduce: boolean;
  compact: boolean;
}) {
  const cardRef = useRef<HTMLSpanElement>(null);
  const [taps, setTaps] = useState(0);
  const amount = sourceAmount(source);
  const lead = TERM_STYLES[source.terms[0]?.kind ?? "base"];
  const breakdown = source.terms.map((t) => `${t.amount} ${t.label}`).join(" plus ");

  const tap = () => {
    if (charged) return;
    setTaps((n) => n + 1);
    onCharge(source, cardRef.current);
  };

  return (
    <motion.li
      className="flex justify-center"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 + index * 0.07 }}
    >
      <motion.button
        type="button"
        onClick={tap}
        aria-disabled={charged || undefined}
        aria-label={
          charged ? `${source.name}: charged, ${breakdown}.` : `Charge Chakra from ${source.name}${source.hidden ? " (face-down)" : ""}.`
        }
        whileHover={charged ? undefined : { y: -5 }}
        whileTap={charged ? undefined : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className={cn(
          "group relative flex flex-col items-center gap-2.5 rounded-2xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-energy-300 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900",
          compact ? "w-[100px]" : "w-[138px]",
          charged ? "cursor-default" : "cursor-pointer",
        )}
      >
        <span ref={cardRef} className="relative block">
          {/* "Tap me" halo while uncharged. */}
          {!charged && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1.5 rounded-[15px] border-2 border-energy-300/70 shadow-[0_0_22px_-2px_rgba(56,196,255,0.65)]"
              animate={reduce ? undefined : { opacity: [0.25, 0.95, 0.25], scale: [0.985, 1.025, 0.985] }}
              transition={reduce ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
            />
          )}
          {/* Charged glow ring. */}
          <AnimatePresence>
            {charged && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-[14px] ring-2 ring-leaf-300/80"
                initial={{ opacity: 0, scale: 1.12 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ boxShadow: `0 0 26px -4px ${lead.flash}` }}
              />
            )}
          </AnimatePresence>

          <motion.span
            className="relative block"
            animate={taps > 0 && !reduce ? { scale: [1, 1.09, 0.97, 1] } : undefined}
            transition={{ duration: 0.5, ease: "easeOut" }}
            key={taps}
          >
            {source.kind === "seal" || !source.card ? (
              <KageSealCard active={!charged} reduce={reduce} compact={compact} />
            ) : (
              <GameCard
                card={source.card}
                size={compact ? "sm" : "md"}
                faceDown={source.hidden}
                label={source.hidden ? "Hidden character" : undefined}
              />
            )}
          </motion.span>

          {/* Flash on tap. */}
          {taps > 0 && !reduce && (
            <motion.span
              key={`flash-${taps}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[11px]"
              style={{ background: `radial-gradient(circle at 50% 45%, ${lead.flash}, transparent 70%)` }}
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          )}

          {/* Charged badge. */}
          <AnimatePresence>
            {charged && (
              <motion.span
                aria-hidden="true"
                className="absolute -bottom-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-leaf-300 to-leaf-500 text-shadow-950 shadow-[0_0_14px_rgba(74,222,128,0.8)] ring-2 ring-shadow-900"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 15, delay: 0.15 }}
              >
                <Icon name="check" size={15} strokeWidth={3.2} />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Rising "+N". */}
          <AnimatePresence>
            {taps > 0 && charged && (
              <motion.span
                key={`plus-${taps}`}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-[30%] z-10 text-center font-black tabular-nums drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]",
                  compact ? "text-[24px]" : "text-[30px]",
                  lead.text,
                )}
                initial={{ opacity: 0, y: 10, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, -14, -30, -54], scale: [0.6, 1.25, 1.1, 1] }}
                transition={{ duration: 1.3, times: [0, 0.2, 0.6, 1], ease: "easeOut" }}
              >
                +{amount}
              </motion.span>
            )}
          </AnimatePresence>

          <ParticleBurst fire={taps} palette={lead.palette} count={18} spread={86} shape="orb" duration={0.8} />
        </span>

        {/* Caption: a call to action, then the yield once charged. */}
        <span className={cn("flex w-full flex-col items-center justify-start gap-1", compact ? "min-h-[44px]" : "min-h-[52px]")}>
          <AnimatePresence mode="wait" initial={false}>
            {charged ? (
              <motion.span
                key="yield"
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="flex flex-wrap justify-center gap-1">
                  {source.terms.map((t) => (
                    <span
                      key={t.key}
                      className={cn("rounded-md border px-1.5 py-px text-[10.5px] font-black tracking-wide", TERM_STYLES[t.kind].chip)}
                    >
                      +{t.amount} {t.kind === "bonus" ? t.label : t.kind === "base" ? "base" : t.kind === "hidden" ? "hidden" : "character"}
                    </span>
                  ))}
                </span>
                {!compact && <span className="text-[10.5px] font-semibold leading-tight text-ash-400">{source.why}</span>}
              </motion.span>
            ) : (
              <motion.span
                key="cta"
                className="mt-0.5 flex items-center gap-1.5 rounded-full border border-energy-400/30 bg-energy-500/10 px-2.5 py-1 text-[11px] font-bold text-energy-200 transition group-hover:border-energy-300/60 group-hover:bg-energy-500/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Icon name="hand" size={13} />
                {compact ? "Charge" : "Tap to charge"}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </motion.li>
  );
}
