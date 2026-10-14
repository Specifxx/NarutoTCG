"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual as StepVisualSpec } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import { CardVisual } from "./visuals/card-visual";
import { ChakraFormulaVisual } from "./visuals/chakra-formula";
import { DeckStackVisual } from "./visuals/deck-stack";
import { describeVisual } from "./visuals/describe";
import { EdgeTokenVisual } from "./visuals/edge-token-visual";
import { MissionLadderVisual } from "./visuals/mission-ladder";
import { PhaseTrackVisual } from "./visuals/phase-track";
import { PowerClashVisual } from "./visuals/power-clash";
import { TurnOrderVisual } from "./visuals/turn-order";
import { UpgradeStackVisual } from "./visuals/upgrade-stack";

const META: Record<StepVisualSpec["kind"], { label: string; emblem: EmblemName }> = {
  "phase-track": { label: "Round flow", emblem: "spiral" },
  "deck-stack": { label: "Deck & setup", emblem: "scroll" },
  "chakra-formula": { label: "Chakra income", emblem: "chakra" },
  card: { label: "Practice card", emblem: "kunai" },
  "mission-ladder": { label: "Mission ranks", emblem: "target" },
  "power-clash": { label: "Mission clash", emblem: "fist" },
  "edge-token": { label: "The Edge", emblem: "edge" },
  "upgrade-stack": { label: "Upgrade", emblem: "seal" },
  "turn-order": { label: "Action phase turns", emblem: "shuriken" },
};

function renderVisual(visual: StepVisualSpec, accent: Accent): ReactNode {
  switch (visual.kind) {
    case "phase-track":
      return <PhaseTrackVisual visual={visual} accent={accent} />;
    case "deck-stack":
      return <DeckStackVisual visual={visual} accent={accent} />;
    case "chakra-formula":
      return <ChakraFormulaVisual visual={visual} accent={accent} />;
    case "card":
      return <CardVisual visual={visual} accent={accent} />;
    case "mission-ladder":
      return <MissionLadderVisual visual={visual} accent={accent} />;
    case "power-clash":
      return <PowerClashVisual visual={visual} accent={accent} />;
    case "edge-token":
      return <EdgeTokenVisual visual={visual} accent={accent} />;
    case "upgrade-stack":
      return <UpgradeStackVisual visual={visual} accent={accent} />;
    case "turn-order":
      return <TurnOrderVisual visual={visual} accent={accent} />;
    default: {
      const unreachable: never = visual;
      return unreachable;
    }
  }
}

/** Corner bracket ornament for the frame. */
function Corner({ className }: { className: string }) {
  return <span className={cn("pointer-events-none absolute h-4 w-4 border-current opacity-40", className)} />;
}

/**
 * Animated illustration for a lesson step: a themed frame (~4:3 on wider
 * screens, content-height on phones) that re-plays its entrance whenever the
 * visual changes, with a replay button for one-shot sequences.
 */
export function StepVisual({ visual, accent }: { visual: StepVisualSpec; accent: Accent }) {
  const [run, setRun] = useState(0);
  const a = ACCENT_STYLES[accent];
  const meta = META[visual.kind];
  const key = JSON.stringify(visual);

  return (
    <figure className="panel relative isolate flex min-h-[320px] w-full min-w-0 flex-col overflow-clip sm:aspect-[4/3] sm:max-h-[480px] sm:min-h-auto">
      <figcaption className="sr-only">
        {meta.label}: {describeVisual(visual)}
      </figcaption>
      {/* Backdrop: accent glow, faint grid, vignette, corner brackets. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(110% 70% at 50% -8%, ${a.hex[1]}2e, transparent 62%), radial-gradient(70% 55% at 100% 110%, ${a.hex[2]}29, transparent 70%), radial-gradient(60% 45% at 0% 100%, ${a.hex[1]}14, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]" />
        <span className={cn("absolute -bottom-10 -right-8 opacity-[0.05]", a.text)}>
          <Emblem name={meta.emblem} size={190} />
        </span>
        <div className={a.text}>
          <Corner className="left-3 top-3 rounded-tl-md border-l-2 border-t-2" />
          <Corner className="right-3 top-3 rounded-tr-md border-r-2 border-t-2" />
          <Corner className="bottom-3 left-3 rounded-bl-md border-b-2 border-l-2" />
          <Corner className="bottom-3 right-3 rounded-br-md border-b-2 border-r-2" />
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-2 px-5 pt-4 sm:px-6">
        <span aria-hidden="true" className={cn("eyebrow flex min-w-0 items-center gap-2", a.text)}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-current" />
          </span>
          <span className="truncate">{meta.label}</span>
        </span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="group inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-bold text-ash-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300"
          aria-label={`Replay the ${meta.label.toLowerCase()} animation`}
        >
          <span className="transition-transform duration-500 group-hover:-rotate-180">
            <Icon name="refresh" size={13} />
          </span>
          <span className="hidden sm:inline">Replay</span>
        </button>
      </div>

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial>
          <motion.div
            key={`${key}#${run}`}
            className="flex flex-1 flex-col pt-2"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {renderVisual(visual, accent)}
          </motion.div>
        </AnimatePresence>
      </div>
    </figure>
  );
}
