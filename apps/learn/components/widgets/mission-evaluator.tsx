"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useParticleFlight } from "@/components/fx/particle-flight";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";
import { MissionTile, type TileStage } from "./mission-evaluator/mission-tile";
import { ResultsPanel } from "./mission-evaluator/results-panel";
import { EVAL_SCENARIOS, buildScenario, outcomeReason, toPrediction, type Prediction } from "./mission-evaluator/scenarios";
import { Scoreboard, type Gain } from "./mission-evaluator/scoreboard";
import { useMediaQuery, useScheduler } from "./mission-evaluator/use-scheduler";
import type { WidgetProps } from "./types";

type Phase = "predict" | "evaluating" | "results";
type ActiveStage = "clash" | "edge" | "verdict";

const RULES: Array<{ icon: IconName; text: string }> = [
  { icon: "swords", text: "Most Power wins" },
  { icon: "shield", text: "Tie: the [[Edge token|Edge]] holder wins" },
  { icon: "info", text: "You need **1+ Power** to win" },
  { icon: "eye-off", text: "[[Hidden]] = 0 + its tokens" },
  { icon: "star", text: "Points = base + rank" },
];

const NO_GAINS: Record<Side, Gain | null> = { you: null, opp: null };

export default function MissionEvaluator({ onComplete, completed }: WidgetProps) {
  const reduce = useReducedMotion() ?? false;
  const isWide = useMediaQuery("(min-width: 640px)");
  // `sm` cards keep full names and trigger badges; only the narrowest phones drop to `xs`.
  const roomyCards = useMediaQuery("(min-width: 360px)");
  const uid = useId();
  const edgeLayoutId = `${uid}-edge`;
  const { emit, layer } = useParticleFlight();
  const { schedule, clear } = useScheduler();
  /** Bumped on skip/retry so callbacks from an older run do nothing. */
  const gen = useRef(0);
  const gainSeq = useRef(0);
  const youAnchor = useRef<HTMLDivElement>(null);
  const oppAnchor = useRef<HTMLDivElement>(null);
  const tiles = useRef<Record<string, HTMLElement | null>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const built = useMemo(() => buildScenario(EVAL_SCENARIOS[scenarioIdx]!), [scenarioIdx]);
  const { scenario, state, evaluation } = built;
  const order = evaluation.outcomes;
  /** Score before each mission (in evaluation order) is scored. */
  const befores = useMemo(() => {
    let running: Record<Side, number> = { ...evaluation.scoreBefore };
    return evaluation.outcomes.map((o) => {
      const before = { ...running };
      if (o.winner) running = { ...running, [o.winner]: running[o.winner] + o.points };
      return before;
    });
  }, [evaluation]);

  const [predictions, setPredictions] = useState<Partial<Record<string, Prediction>>>({});
  const [phase, setPhase] = useState<Phase>("predict");
  const [cursor, setCursor] = useState(-1);
  const [stage, setStage] = useState<ActiveStage>("clash");
  const [score, setScore] = useState<Record<Side, number>>(scenario.score);
  const [edgeAt, setEdgeAt] = useState<string | null>(null);
  const [gains, setGains] = useState(NO_GAINS);
  const [tileBursts, setTileBursts] = useState<Record<string, number>>({});
  const [ticker, setTicker] = useState("");
  const [burst, setBurst] = useState(0);
  const [perfectOnce, setPerfectOnce] = useState(false);
  const [missed, setMissed] = useState<ReadonlySet<string>>(() => new Set());

  const calls = order.filter((o) => predictions[o.missionId]).length;
  const allCalled = calls === order.length;
  const other = EVAL_SCENARIOS[(scenarioIdx + 1) % EVAL_SCENARIOS.length]!;

  const resetTo = useCallback(
    (idx: number, keepHints: boolean, focusFirstCall = false) => {
      gen.current += 1;
      clear();
      const next = EVAL_SCENARIOS[idx]!;
      setScenarioIdx(idx);
      setPredictions({});
      setPhase("predict");
      setCursor(-1);
      setStage("clash");
      setScore(next.score);
      setEdgeAt(null);
      setGains(NO_GAINS);
      setTileBursts({});
      setTicker("");
      if (!keepHints) setMissed(new Set());
      if (focusFirstCall) {
        // The results panel (and the focused button in it) is going away: move focus to the first call.
        schedule(() => {
          rootRef.current?.querySelector<HTMLButtonElement>('[aria-label^="Who wins"] button')?.focus();
        }, 60);
      }
    },
    [clear, schedule],
  );

  const predict = (missionId: string, p: Prediction) => {
    if (phase !== "predict") return;
    setPredictions((prev) => ({ ...prev, [missionId]: p }));
  };

  const missionName = (missionId: string) => state.missions.find((m) => m.def.id === missionId)?.def.name ?? missionId;

  const finish = (g: number) => {
    if (gen.current !== g) return;
    clear();
    setPhase("results");
    setCursor(order.length);
    setEdgeAt(null);
    setGains(NO_GAINS);
    setScore(evaluation.scoreAfter);
    const wrong = order.filter((o) => predictions[o.missionId] !== toPrediction(o.winner)).map((o) => o.missionId);
    setMissed(new Set(wrong));
    if (wrong.length === 0) {
      setBurst((b) => b + 1);
      setPerfectOnce(true);
      setTicker("Perfect read: every call was right.");
      onComplete();
    } else {
      setTicker(`${order.length - wrong.length} of ${order.length} calls right. See why below.`);
    }
    schedule(() => headingRef.current?.focus(), 80);
  };

  const runMission = (i: number, g: number) => {
    if (gen.current !== g) return;
    const o = order[i];
    if (!o) {
      finish(g);
      return;
    }
    const name = missionName(o.missionId);
    setCursor(i);
    setStage("clash");
    setTicker(`Scoring the ${o.rank}-rank mission, ${name}: counting Power…`);
    tiles.current[o.missionId]?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    schedule(
      () => {
        if (o.reason === "edge-tiebreak") {
          setStage("edge");
          setEdgeAt(o.missionId);
          setTicker(`${name} is tied ${o.power.you}–${o.power.opp}. The Edge token decides…`);
          schedule(() => verdict(i, g), reduce ? 450 : 1300);
        } else {
          verdict(i, g);
        }
      },
      reduce ? 500 : 1500,
    );
  };

  const verdict = (i: number, g: number) => {
    if (gen.current !== g) return;
    const o = order[i]!;
    const right = predictions[o.missionId] === toPrediction(o.winner);
    setStage("verdict");
    setTileBursts((b) => ({ ...b, [o.missionId]: (b[o.missionId] ?? 0) + 1 }));
    setTicker(
      `${o.rank}-rank ${missionName(o.missionId)}: ${outcomeReason(o, scenario.edge)}${o.winner ? ` +${o.points} Mission points.` : ""} Your call was ${right ? "right" : "wrong"}.`,
    );
    const next = (delay: number) =>
      schedule(() => {
        setEdgeAt(null);
        runMission(i + 1, g);
      }, delay);
    const winner = o.winner;
    if (!winner) {
      next(reduce ? 800 : 1900);
      return;
    }
    const base = befores[i]![winner];
    schedule(
      () => {
        const tile = tiles.current[o.missionId];
        const from = tile?.querySelector("[data-points-anchor]") ?? tile;
        const to = winner === "you" ? youAnchor.current : oppAnchor.current;
        const count = Math.max(1, Math.min(o.points, 12));
        let landed = 0;
        emit(from, to, {
          count,
          palette: "gold",
          size: 11,
          duration: 0.85,
          stagger: 0.08,
          onArrive: () => {
            if (gen.current !== g) return;
            landed += 1;
            const value = base + Math.round((landed / count) * o.points);
            setScore((s) => ({ ...s, [winner]: value }));
          },
          onDone: () => {
            if (gen.current !== g) return;
            setScore((s) => ({ ...s, [winner]: base + o.points }));
            gainSeq.current += 1;
            setGains((gs) => ({ ...gs, [winner]: { id: gainSeq.current, amount: o.points } }));
            next(reduce ? 500 : 1000);
          },
        });
      },
      reduce ? 150 : 550,
    );
  };

  const start = () => {
    if (phase !== "predict" || !allCalled) return;
    gen.current += 1;
    clear();
    const g = gen.current;
    setPhase("evaluating");
    setScore(scenario.score);
    setGains(NO_GAINS);
    setTileBursts({});
    setTicker("Mission evaluation begins with the D-rank mission.");
    schedule(() => runMission(0, g), reduce ? 100 : 400);
    // The Evaluate button unmounts: keep keyboard focus on the next control.
    window.setTimeout(
      () => rootRef.current?.querySelector<HTMLElement>("[data-skip-results]")?.focus({ preventScroll: true }),
      50,
    );
  };

  const skip = () => {
    gen.current += 1;
    clear();
    finish(gen.current);
  };

  const stageFor = (i: number): TileStage => {
    if (phase === "predict") return "idle";
    if (phase === "results") return "done";
    if (i < cursor) return "done";
    if (i > cursor) return "pending";
    return stage;
  };

  const status =
    phase === "predict"
      ? "Make a call on every mission, then evaluate"
      : phase === "evaluating"
        ? cursor >= 0 && order[cursor]
          ? `Scoring ${order[cursor]!.rank}-rank: ${missionName(order[cursor]!.missionId)}`
          : "Evaluating…"
        : `Final: ${evaluation.winner === "you" ? "you win" : "your opponent wins"} the game${evaluation.decidedByEdge ? " on the Edge" : ""}`;

  return (
    <div ref={rootRef} className="panel relative overflow-x-clip p-3 sm:p-5">
      {layer}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-gold-300">
            <Icon name="target" size={13} />
            Round 4 · Mission evaluation
          </p>
          <h3 className="mt-1.5 text-xl font-black tracking-tight text-white">{scenario.title}</h3>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-ash-400">
            {scenario.tagline} {scenario.edgeNote}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {(completed || perfectOnce) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf-400/30 bg-leaf-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-leaf-300">
              <Icon name="check" size={12} strokeWidth={3} />
              Completed
            </span>
          )}
          <div role="group" aria-label="Choose a board" className="flex rounded-xl border border-white/[0.08] bg-black/25 p-1">
            {EVAL_SCENARIOS.map((s, i) => {
              const active = i === scenarioIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) resetTo(i, false);
                  }}
                  className={cn(
                    "relative rounded-lg px-3 py-1.5 text-[12px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300",
                    active ? "text-white" : "text-ash-400 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${uid}-board-tab`}
                      className="absolute inset-0 rounded-lg bg-gradient-to-b from-gold-400/30 to-gold-600/20 ring-1 ring-gold-400/40"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">
                    Board {i + 1}
                    <span className="sr-only">: {s.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rule chips */}
      <ul
        className="mt-4 flex flex-wrap gap-1.5"
        aria-label="Mission evaluation rules"
      >
        {RULES.map((r) => (
          <li
            key={r.text}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-semibold text-ash-300"
          >
            <Icon name={r.icon} size={12} className="text-gold-300" />
            <RichText text={r.text} />
          </li>
        ))}
      </ul>

      <Scoreboard
        className="mt-4"
        score={score}
        edge={scenario.edge}
        edgeAway={edgeAt !== null}
        edgeLayoutId={edgeLayoutId}
        youAnchor={youAnchor}
        oppAnchor={oppAnchor}
        gains={gains}
        status={status}
      />

      {/* Missions in evaluation order */}
      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
        {order.map((o, i) => {
          const mission = state.missions.find((m) => m.def.id === o.missionId)!;
          const spec = scenario.missions.find((m) => m.missionId === o.missionId)!;
          return (
            <MissionTile
              key={`${scenario.id}-${o.missionId}`}
              ref={(el) => {
                tiles.current[o.missionId] = el;
              }}
              mission={mission}
              spec={spec}
              outcome={o}
              edge={scenario.edge}
              stage={stageFor(i)}
              prediction={predictions[o.missionId]}
              onPredict={(p) => predict(o.missionId, p)}
              hint={missed.has(o.missionId)}
              edgeHere={edgeAt === o.missionId}
              edgeLayoutId={edgeLayoutId}
              idPrefix={`${uid}-tile`}
              burst={tileBursts[o.missionId] ?? 0}
              cardSize={isWide || roomyCards ? "sm" : "xs"}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1" aria-live="polite">
          {phase === "predict" ? (
            <div className="flex items-center gap-3">
              <div className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10" aria-hidden="true">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
                  initial={false}
                  animate={{ width: `${(calls / order.length) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 24 }}
                />
              </div>
              <p className="text-[13px] font-semibold text-ash-300">
                {calls} of {order.length} calls made
                {!allCalled && <span className="text-ash-500"> · pick You, Opponent or Nobody on each mission</span>}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={ticker}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="text-[13px] font-semibold text-ash-200"
              >
                {ticker}
              </motion.p>
            </AnimatePresence>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {phase === "predict" && (
            <>
              {calls > 0 && (
                <Button variant="ghost" onClick={() => setPredictions({})}>
                  Clear
                </Button>
              )}
              <Button variant="gold" size="lg" disabled={!allCalled} onClick={start} className="flex-1 sm:flex-none">
                <Icon name="swords" size={18} />
                Evaluate missions
              </Button>
            </>
          )}
          {phase === "evaluating" && (
            <Button variant="secondary" onClick={skip} data-skip-results>
              <Icon name="chevron-right" size={16} />
              Skip to results
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === "results" && (
          <ResultsPanel
            key={scenario.id}
            built={built}
            predictions={predictions}
            onRetry={() => resetTo(scenarioIdx, true, true)}
            onSwitch={() => resetTo((scenarioIdx + 1) % EVAL_SCENARIOS.length, false, true)}
            otherTitle={other.title}
            headingRef={headingRef}
            burst={burst}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
