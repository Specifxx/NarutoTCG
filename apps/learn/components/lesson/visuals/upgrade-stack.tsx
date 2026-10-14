"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard, TRIGGER_STYLES } from "@/components/game/game-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { cardById, selfPowerup, useTimeline } from "./shared";

// Cues: lower card in, upper card slides on, lands (tokens carry over), equation resolves.
const CUES = [250, 950, 1500, 1900] as const;

function CostOrb({ value, caption, tone }: { value: ReactNode; caption: string; tone: "energy" | "result" }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-[17px] font-black tabular-nums ring-2",
          tone === "energy"
            ? "bg-gradient-to-br from-energy-300 to-energy-600 text-white ring-energy-200/50 shadow-[0_0_14px_rgba(56,196,255,0.55)]"
            : "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950 ring-gold-200/60 shadow-[0_0_18px_rgba(245,197,66,0.7)]",
        )}
      >
        {value}
      </span>
      <span className="max-w-[78px] truncate text-[9.5px] font-semibold text-ash-400">{caption}</span>
    </span>
  );
}

/** A same-name, higher-cost card slides onto the lower one: pay only the difference. */
export function UpgradeStackVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "upgrade-stack" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const from = cardById(visual.fromCardId);
  const to = cardById(visual.toCardId);
  const step = useTimeline(CUES);
  const [burst, setBurst] = useState(0);
  const landed = step >= 3;
  useEffect(() => {
    if (landed) setBurst((b) => b + 1);
  }, [landed]);

  if (!from || !to) {
    return <div className="flex flex-1 items-center justify-center px-4 pb-6 text-sm text-ash-400">Unknown practice card.</div>;
  }

  const legal = from.name === to.name && to.cost > from.cost;
  const diff = Math.max(0, to.cost - from.cost);
  const before = selfPowerup(from, ["MAIN"]);
  const after = before + (legal ? selfPowerup(to, ["MAIN", "UPGRADE"]) : 0);
  const firing = to.effects.filter((e) => e.trigger === "MAIN" || e.trigger === "UPGRADE");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-5 sm:flex-row sm:gap-8 sm:px-6" aria-hidden="true">
      {/* The stack */}
      <div className="relative h-[232px] w-[142px] shrink-0">
        <motion.div
          className="absolute left-0 top-0"
          initial={{ opacity: 0, y: 24 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <GameCard card={from} size="md" powerTokens={landed ? 0 : before} dimmed={landed && legal} />
        </motion.div>
        <motion.div
          className="absolute left-1.5 top-[42px] z-10"
          initial={{ opacity: 0, x: 150, y: -110, rotate: 16 }}
          animate={step >= 2 ? { opacity: 1, x: 0, y: legal ? 0 : -26, rotate: legal ? 0 : 6 } : { opacity: 0, x: 150, y: -110, rotate: 16 }}
          transition={{ type: "spring", stiffness: 200, damping: 19 }}
        >
          <GameCard card={to} size="md" powerTokens={landed && legal ? after : 0} highlight={landed ? (legal ? "gold" : "blood") : undefined} />
        </motion.div>
        <ParticleBurst fire={burst} palette={legal ? "gold" : "blood"} count={26} spread={120} shape="star" />
      </div>

      {/* The maths */}
      <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
        <span className={cn("eyebrow", a.text)}>Pay only the difference</span>
        <div className="flex items-start gap-2">
          <CostOrb value={to.cost} caption={to.title} tone="energy" />
          <span className="mt-2 text-xl font-black text-ash-500">−</span>
          <CostOrb value={from.cost} caption={from.title} tone="energy" />
          <span className="mt-2 text-xl font-black text-ash-500">=</span>
          <CostOrb value={step >= 4 ? <AnimatedNumber value={diff} /> : "?"} caption="Chakra to pay" tone="result" />
        </div>
        <motion.ul
          className="flex flex-col gap-1.5"
          initial="hidden"
          animate={step >= 4 ? "show" : "hidden"}
          variants={{ show: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
        >
          {legal ? (
            <>
              <Row>
                <span className="flex gap-1">
                  {(["MAIN", "UPGRADE"] as const).map((t) => (
                    <span key={t} className={cn("rounded-sm px-1 text-[9.5px] font-black", TRIGGER_STYLES[t].className)}>
                      {TRIGGER_STYLES[t].label}
                    </span>
                  ))}
                </span>
                {firing.length > 0 ? `fire: ${firing.map((e) => e.text).join(" ")}` : "effects fire (none on this card)"}
              </Row>
              <Row>
                <span className="text-gold-300">
                  <Icon name="layers" size={13} />
                </span>
                Power tokens stay{before !== after ? `: ${before} → ${after}` : ""}
              </Row>
              <Row>
                <span className="text-leaf-300">
                  <Icon name="check" size={13} strokeWidth={3} />
                </span>
                Still one character: +1 Chakra
              </Row>
            </>
          ) : (
            <Row>
              <span className="text-blood-400">
                <Icon name="x" size={13} strokeWidth={3} />
              </span>
              Not legal: needs the same name and a higher cost
            </Row>
          )}
        </motion.ul>
      </div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
      className="flex items-center gap-2 text-[11.5px] font-semibold text-ash-200"
    >
      {children}
    </motion.li>
  );
}
