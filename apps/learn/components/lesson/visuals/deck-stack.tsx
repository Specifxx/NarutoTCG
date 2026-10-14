"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { GameCard } from "@/components/game/game-card";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { PRACTICE_MISSIONS } from "@/lib/game/cards";
import { cardById, useTimeline } from "./shared";

const HAND_POOL = [
  "naruto-genin",
  "sakura-medic",
  "kakashi-copy",
  "rock-lee",
  "hinata-byakugan",
  "shikamaru-shadow",
  "choji-akimichi",
  "ino-yamanaka",
] as const;

const MISSION_POOL = Object.values(PRACTICE_MISSIONS);
const PILE_LAYERS = 6;

/** Back of a deck card (not a hidden character, so no "Hidden" label). */
function DeckBack({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[10px] bg-gradient-to-br from-chakra-300 via-chakra-600 to-shadow-700 p-[2px]", className)}>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_50%_40%,#3a1a06_0%,#0d0d14_75%)]">
        <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(45deg,rgba(255,169,92,0.25)_0_1px,transparent_1px_8px)]" />
        <span className="relative text-chakra-300 drop-shadow-[0_0_10px_rgba(255,122,26,0.9)]">
          <Emblem name="leaf" size={30} />
        </span>
      </div>
    </div>
  );
}

function MiniMission({ name, base, accentText }: { name: string; base: number; accentText: string }) {
  return (
    <div className="relative h-[62px] w-[104px] overflow-hidden rounded-lg bg-gradient-to-br from-gold-200 via-gold-500 to-chakra-600 p-[1.5px] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]">
      <div className="relative flex h-full w-full flex-col justify-between rounded-[7px] bg-gradient-to-br from-shadow-800 to-shadow-900 px-2 py-1.5">
        <span className="pointer-events-none absolute -right-2 -top-2 text-white/[0.06]">
          <Emblem name="scroll" size={48} />
        </span>
        <span className={cn("eyebrow !text-[7.5px]", accentText)}>Mission</span>
        <span className="line-clamp-2 text-[9.5px] font-black leading-tight text-white">{name}</span>
        <span className="text-[8.5px] font-bold text-gold-300">{base} pts base</span>
      </div>
    </div>
  );
}

/** Deck pile with its size, the Mission cards kept beside it, and the opening hand fanning out. */
export function DeckStackVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "deck-stack" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const { deckSize, missions, hand } = visual;
  const step = useTimeline([150]);
  const legal = deckSize >= 30;
  const missionCount = Math.min(missions, 5);
  const handCards = Array.from({ length: Math.min(hand, 8) }, (_, i) => cardById(HAND_POOL[i % HAND_POOL.length]!)).filter(
    (c) => c !== undefined,
  );
  const n = handCards.length;
  const spacing = n <= 5 ? 44 : n === 6 ? 38 : 32;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 sm:px-6" aria-hidden="true">
      <div className="flex w-full flex-wrap items-end justify-center gap-x-6 gap-y-5 sm:gap-x-10">
        {/* Deck pile */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-[118px] w-[84px]">
            {Array.from({ length: PILE_LAYERS }, (_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                initial={{ opacity: 0, y: -40, rotate: -6 }}
                animate={{ opacity: 1, y: -i * 2, x: -i * 1.5, rotate: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 380, damping: 26 }}
                style={{ zIndex: i }}
              >
                <DeckBack className="h-full w-full shadow-[0_6px_14px_-6px_rgba(0,0,0,0.9)]" />
              </motion.div>
            ))}
            <motion.span
              className={cn(
                "absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-baseline gap-0.5 rounded-full px-2.5 py-0.5 text-[15px] font-black tabular-nums ring-2 ring-shadow-900",
                legal ? "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950" : "bg-blood-500 text-white",
              )}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 500, damping: 20 }}
            >
              <AnimatedNumber value={step >= 1 ? deckSize : 0} />
              {deckSize === 30 && <span className="text-[12px]">+</span>}
            </motion.span>
          </div>
          <div className="mt-1 max-w-[118px] text-center sm:max-w-none">
            <p className="text-[12px] font-black text-white">Your deck</p>
            <p className={cn("flex flex-wrap items-center justify-center gap-x-1 text-[10.5px] font-semibold", legal ? "text-leaf-300" : "text-blood-400")}>
              <Icon name={legal ? "check" : "x"} size={11} strokeWidth={3} />
              {legal ? "30+ cards" : "Needs 30+ cards"}
              <span className="font-normal text-ash-500">
                <span className="hidden sm:inline">· </span>max 2 per version
              </span>
            </p>
          </div>
        </div>

        {/* Missions, kept outside the deck */}
        {missionCount > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-[118px] w-[150px]">
              {Array.from({ length: missionCount }, (_, i) => {
                const t = i - (missionCount - 1) / 2;
                const m = MISSION_POOL[i % MISSION_POOL.length]!;
                return (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2"
                    style={{ zIndex: i, marginLeft: -52, marginTop: -31 }}
                    initial={{ opacity: 0, x: 0, y: 30, rotate: 0 }}
                    animate={{ opacity: 1, x: t * 22, y: Math.abs(t) * 6 - 4, rotate: t * 11 }}
                    transition={{ delay: 0.35 + i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <MiniMission name={m.name} base={m.basePoints} accentText={a.text} />
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-1 max-w-[150px] text-center sm:max-w-none">
              <p className="text-[12px] font-black text-white">
                {missions} Mission{missions === 1 ? "" : "s"}
              </p>
              <p className="text-[10.5px] text-ash-500">
                Outside the deck<span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">2 drawn at random</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Opening hand */}
      {n > 0 && (
        <div className="flex w-full flex-col items-center gap-1">
          <div className="relative h-[142px] w-full max-w-[340px]">
            {handCards.map((card, i) => {
              const t = i - (n - 1) / 2;
              return (
                <motion.div
                  key={`${card.id}-${i}`}
                  className="absolute left-1/2 top-0"
                  style={{ marginLeft: -46, zIndex: i }}
                  initial={{ opacity: 0, x: -150, y: -150, rotate: -40, scale: 0.7 }}
                  animate={{ opacity: 1, x: t * spacing, y: t * t * 3, rotate: t * 6, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 210, damping: 21 }}
                  whileHover={{ y: t * t * 3 - 12, zIndex: 20 }}
                >
                  <GameCard card={card} size="sm" />
                </motion.div>
              );
            })}
          </div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + n * 0.12 }}
            className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-black text-white"
          >
            Opening hand: {hand}
            <span className={cn("eyebrow rounded-full border px-2 py-0.5 !text-[8.5px]", a.border, a.text)}>1 mulligan each</span>
          </motion.p>
        </div>
      )}
    </div>
  );
}
