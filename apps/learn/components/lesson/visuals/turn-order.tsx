"use client";

import { motion } from "framer-motion";
import { EdgeToken } from "@/components/game/edge-token";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { otherSide, type Side } from "@/lib/game/types";
import { SIDE_STYLES, TURN_ACTION_META, useTimeline } from "./shared";

const LANES: readonly Side[] = ["you", "opp"];
const FIRST_MS = 250;
const GAP_MS = 420;

/** Analyses a sequence: the first passer (who takes the Edge) and the run of successive turns after it. */
export function analyseTurns(sequence: ReadonlyArray<{ side: Side; action: string }>) {
  const firstPass = sequence.findIndex((s) => s.action === "pass");
  const passer = firstPass >= 0 ? sequence[firstPass]!.side : null;
  let run: { side: Side; start: number; end: number } | null = null;
  if (passer) {
    const other = otherSide(passer);
    let end = firstPass;
    for (let j = firstPass + 1; j < sequence.length && sequence[j]!.side === other; j++) end = j;
    if (end - firstPass >= 2) run = { side: other, start: firstPass + 1, end };
  }
  const bothPassed = LANES.every((side) => sequence.some((s) => s.side === side && s.action === "pass"));
  return { firstPass, passer, run, bothPassed };
}

/** Two-lane timeline of Action-phase turns; the first pass grabs the Edge, then the other side plays on alone. */
export function TurnOrderVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "turn-order" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const seq = visual.sequence;
  const n = seq.length;
  const step = useTimeline(seq.map((_, i) => FIRST_MS + i * GAP_MS).concat(FIRST_MS + n * GAP_MS + 150));
  const { firstPass, passer, run, bothPassed } = analyseTurns(seq);
  const done = step > n;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 px-3 pb-5 sm:px-6" aria-hidden="true">
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1 pb-1 pt-3">
        <div
          className="grid items-center gap-x-[3px] gap-y-2 sm:gap-x-1.5"
          style={{ gridTemplateColumns: `auto repeat(${n}, minmax(32px, 1fr))` }}
        >
          {/* Turn numbers */}
          <span className="eyebrow pr-2 !text-[8.5px] text-ash-500">Turn</span>
          {seq.map((_, i) => (
            <span
              key={`n${i}`}
              className={cn(
                "text-center text-[10px] font-black tabular-nums transition-colors duration-300",
                step === i + 1 ? a.text : step > i ? "text-ash-300" : "text-ash-500/60",
              )}
            >
              {i + 1}
            </span>
          ))}

          {LANES.map((lane, laneIndex) => {
            const s = SIDE_STYLES[lane];
            const row = laneIndex + 2;
            return [
              <span key={`label-${lane}`} className={cn("flex items-center gap-1.5 pr-2 text-[11px] font-black", s.text)} style={{ gridRow: row, gridColumn: 1 }}>
                <span className={cn("h-2 w-2 rounded-full", s.solid)} />
                {s.short}
              </span>,
              // Lane rail behind the chips.
              <span
                key={`rail-${lane}`}
                className="h-px self-center bg-white/[0.07]"
                style={{ gridRow: row, gridColumn: `2 / ${n + 2}`, marginTop: -14 }}
              />,
              // Successive-turns band.
              run && run.side === lane ? (
                <motion.span
                  key={`run-${lane}`}
                  className={cn("h-[52px] self-start rounded-2xl border border-dashed", s.border, s.softBg)}
                  style={{ gridRow: row, gridColumn: `${run.start + 2} / ${run.end + 3}`, marginTop: -6 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step > run.start ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
              ) : null,
              ...seq.map((turn, i) => {
                const col = i + 2;
                if (turn.side !== lane) {
                  return (
                    <span key={`e-${lane}-${i}`} className="flex h-[46px] items-start justify-center pt-[15px]" style={{ gridRow: row, gridColumn: col }}>
                      <span className="h-1 w-1 rounded-full bg-white/10" />
                    </span>
                  );
                }
                const meta = TURN_ACTION_META[turn.action];
                const isPass = turn.action === "pass";
                const takesEdge = i === firstPass;
                const shown = step > i;
                return (
                  <motion.span
                    key={`c-${lane}-${i}`}
                    className="relative z-10 flex h-[46px] flex-col items-center"
                    style={{ gridRow: row, gridColumn: col }}
                    initial={{ opacity: 0, scale: 0.3, y: 6 }}
                    animate={shown ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 6 }}
                    transition={{ type: "spring", stiffness: 520, damping: 22 }}
                  >
                    <span
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full ring-2",
                        isPass
                          ? takesEdge
                            ? "bg-shadow-800 text-gold-300 ring-gold-400/80 shadow-[0_0_16px_rgba(245,197,66,0.6)]"
                            : "bg-shadow-800 text-ash-300 ring-white/20"
                          : cn(s.solid, "ring-white/20"),
                        step === i + 1 && "shadow-[0_0_0_4px_rgba(255,255,255,0.08)]",
                      )}
                    >
                      <Icon name={meta.icon} size={15} strokeWidth={2.2} />
                      {takesEdge && (
                        <motion.span
                          className="absolute -right-2.5 -top-3"
                          initial={{ opacity: 0, scale: 0, rotate: -90 }}
                          animate={shown ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -90 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 420, damping: 16 }}
                        >
                          <EdgeToken size={20} spin={false} />
                        </motion.span>
                      )}
                    </span>
                    <span className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-ash-300 sm:text-[9.5px]">{meta.label}</span>
                  </motion.span>
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* What the sequence shows */}
      <motion.ul
        className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-black/25 p-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <li className="flex items-center gap-2 text-[11.5px] font-semibold text-ash-200">
          <span className={a.text}>
            <Icon name="swords" size={14} />
          </span>
          {SIDE_STYLES[seq[0]!.side].label} {seq[0]!.side === "you" ? "lead" : "leads"} with the Edge. One card per turn, alternating.
        </li>
        {passer && (
          <motion.li
            className="flex items-center gap-2 text-[11.5px] font-semibold text-gold-200"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: step > firstPass ? 1 : 0.25 }}
          >
            <EdgeToken size={16} spin={false} />
            {SIDE_STYLES[passer].label} passed first and {passer === "you" ? "take" : "takes"} the Edge.
          </motion.li>
        )}
        {run && (
          <motion.li
            className={cn("flex items-center gap-2 text-[11.5px] font-semibold", SIDE_STYLES[run.side].text)}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: step > run.end ? 1 : 0.25 }}
          >
            <Icon name="layers" size={14} />
            {SIDE_STYLES[run.side].label} then {run.side === "you" ? "take" : "takes"} {run.end - run.start + 1} turns in a row.
          </motion.li>
        )}
        {bothPassed && (
          <motion.li
            className="flex items-center gap-2 text-[11.5px] font-semibold text-leaf-300"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: done ? 1 : 0.25 }}
          >
            <Icon name="check" size={14} strokeWidth={3} />
            Both passed: on to Mission evaluation.
          </motion.li>
        )}
      </motion.ul>
    </div>
  );
}
