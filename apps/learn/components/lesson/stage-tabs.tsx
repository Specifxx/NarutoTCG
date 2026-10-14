"use client";

import { motion } from "framer-motion";
import { useRef, type KeyboardEvent } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Icon } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./stage-stars";
import { STAGES, stageIndex, type Stage } from "./types";

export const STAGE_PANEL_ID = "lesson-stage-panel";
export const stageTabId = (stage: Stage) => `lesson-stage-tab-${stage}`;

/**
 * Sticky Learn → Train → Test segmented control (ARIA tabs with arrow-key
 * support). A shared layoutId pill slides between stages; each tab shows its
 * star and bursts when that star is earned.
 */
export function StageTabs({
  stage,
  onSelect,
  accent,
  earned,
  hydrated,
  hints,
  bursts,
}: {
  stage: Stage;
  onSelect: (stage: Stage) => void;
  accent: Accent;
  earned: readonly [boolean, boolean, boolean];
  hydrated: boolean;
  hints: Record<Stage, string>;
  bursts: Record<Stage, number>;
}) {
  const a = ACCENT_STYLES[accent];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = stageIndex(stage);
    let to = -1;
    if (e.key === "ArrowRight") to = (idx + 1) % STAGES.length;
    else if (e.key === "ArrowLeft") to = (idx - 1 + STAGES.length) % STAGES.length;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = STAGES.length - 1;
    if (to === -1) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(STAGES[to]!.id);
    refs.current[to]?.focus();
  };

  return (
    <div className="sticky top-[106px] z-30 -mx-4 mt-8 flex justify-center bg-shadow-950/85 px-4 pb-2 pt-1.5 backdrop-blur-xl sm:-mx-6 sm:mt-10 sm:px-6">
      <div
        role="tablist"
        aria-label="Lesson stages"
        onKeyDown={onKeyDown}
        className="relative grid w-full max-w-xl grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-shadow-950/80 p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      >
        <ParticleBurst
          fire={bursts.learn + bursts.train + bursts.test}
          palette="chakra"
          shape="mixed"
          count={34}
          spread={230}
          duration={1.1}
        />
        {STAGES.map((s, i) => {
          const active = s.id === stage;
          const lit = hydrated && earned[i];
          return (
            <button
              key={s.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={stageTabId(s.id)}
              aria-selected={active}
              aria-controls={STAGE_PANEL_ID}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(s.id)}
              className={cn(
                "relative flex min-w-0 items-center justify-center rounded-xl px-1.5 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:px-3",
                active ? "text-white" : "text-ash-400 hover:bg-white/[0.04] hover:text-ash-100",
              )}
            >
              {active && (
                <motion.span
                  layoutId="lesson-stage-indicator"
                  className={cn("absolute inset-0 rounded-xl border", a.border, a.softBg, a.glow)}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors max-[379px]:hidden sm:h-7 sm:w-7",
                    active ? a.solidBg : "bg-white/[0.06] text-ash-400",
                  )}
                >
                  <Icon name={s.icon} size={14} strokeWidth={2.2} />
                </span>
                <span className="flex min-w-0 flex-col items-start leading-none">
                  <span className="text-[13px] font-bold sm:text-sm">
                    <span className="sr-only">Stage {i + 1}: </span>
                    {s.label}
                  </span>
                  <span className="mt-1 hidden truncate text-[10.5px] font-medium text-ash-500 sm:block">{hints[s.id]}</span>
                </span>
                <span className="relative flex shrink-0">
                  <StarGlyph filled={lit} size={14} />
                  <span className="sr-only">{lit ? ", star earned" : ", star not yet earned"}</span>
                  <ParticleBurst fire={bursts[s.id]} palette="gold" shape="star" count={18} spread={70} duration={0.85} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
