"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParticleFlight } from "@/components/fx/particle-flight";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { KeywordChip } from "@/components/ui/keyword-chip";
import { RichText } from "@/components/ui/rich-text";
import { getPuzzle, PUZZLES, puzzleKey } from "@/content/puzzles";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import {
  actionCost,
  checkAction,
  describeAction,
  evaluateRound,
  findUnit,
  getLegalActions,
  topCard,
} from "@/lib/game/engine";
import { actionKey, startRun, stepRun, undoRun, type PuzzleDef, type PuzzleRun } from "@/lib/game/puzzle";
import { RANK_ORDER, type GameAction, type GameState, type MissionOutcome, type Side } from "@/lib/game/types";
import { useProgress } from "@/lib/progress";
import { ActionLog } from "./action-log";
import { CoachPanel, CommandBar } from "./command-bar";
import { DIFFICULTY_STYLES } from "./difficulty";
import { HandTray, handLayoutId, type HandEntry } from "./hand-tray";
import { HintsDrawer } from "./hints-drawer";
import { frameToLog, type LogTurn } from "./log";
import { MissionLane, type LaneEvalStatus } from "./mission-lane";
import { DifficultyBadge } from "./puzzle-grid";
import { ProjectionStrip } from "./projection-strip";
import { ResultOverlay, type ClearInfo } from "./result-overlay";
import { Scoreboard, type PhaseLabel } from "./scoreboard";
import { openingFrames, stepFrames, type StageFrame } from "./staging";
import { StarRow } from "./star-row";
import { shortReason, type CoachTarget, type Feedback, type LaneFx, type MoveOption, type UnitFx } from "./types";
import { useMediaQuery } from "./use-media-query";
import { starsForRun, usePuzzleStars } from "./use-puzzle-stars";

type Selection = { kind: "card"; cardId: string; copy: number } | { kind: "unit"; uid: string } | null;

interface Stage {
  frames: StageFrame[];
  index: number;
}

interface EvalProgress {
  /** Index of the mission being looked at. */
  focus: number;
  /** How many missions have been scored. */
  revealed: number;
}

const EMPTY_OPTIONS: readonly MoveOption[] = [];

/** Elements registered by id, for aiming particle flights and scrolling lanes into view. */
function useElementMap() {
  const map = useRef(new Map<string, HTMLElement>());
  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) map.current.set(id, el);
    else map.current.delete(id);
  }, []);
  return [map, register] as const;
}

/** Bottom edge of the sticky site header (with its sub-nav), in viewport px. */
function stickyHeaderBottom() {
  const el = document.querySelector("header.sticky");
  return el ? Math.max(0, el.getBoundingClientRect().bottom) : 112;
}

function sortedMissions(state: GameState) {
  return [...state.missions].sort((a, b) => RANK_ORDER.indexOf(a.def.rank) - RANK_ORDER.indexOf(b.def.rank));
}

export function PuzzlePlayer({ puzzleId }: { puzzleId: string }) {
  const puzzle = getPuzzle(puzzleId);
  if (!puzzle) return null;
  return <PuzzleGame key={puzzle.id} puzzle={puzzle} />;
}

function PuzzleGame({ puzzle }: { puzzle: PuzzleDef }) {
  const cards = puzzle.cards;
  const reduce = useReducedMotion() ?? false;
  const wide = useMediaQuery("(min-width: 640px)");
  const { hydrated, award } = useProgress();
  const { ready: starsReady, starsFor, record } = usePuzzleStars();
  const { emit, layer } = useParticleFlight();

  const ordered = useMemo(() => [...PUZZLES].sort((a, b) => a.order - b.order), []);
  const position = ordered.findIndex((p) => p.id === puzzle.id);
  const next = ordered[position + 1] ?? null;
  const style = DIFFICULTY_STYLES[puzzle.difficulty];
  const accent = ACCENT_STYLES[style.accent];

  const opening = useMemo(
    () => openingFrames(puzzle).map((frame, i) => frameToLog(frame, cards, `open-${i}`)),
    [puzzle, cards],
  );

  /* ---------------------------------------------------------------- */
  /* State                                                              */
  /* ---------------------------------------------------------------- */

  const [run, setRun] = useState<PuzzleRun>(() => startRun(puzzle));
  const [steps, setSteps] = useState<LogTurn[][]>([]);
  const [stage, setStage] = useState<Stage | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const [unitFx, setUnitFx] = useState<Record<string, UnitFx>>({});
  const [laneFx, setLaneFx] = useState<Record<string, LaneFx>>({});
  const [defeated, setDefeated] = useState<ReadonlySet<string>>(() => new Set());
  const [handOrigins, setHandOrigins] = useState<Record<string, string>>({});
  const [evalProgress, setEvalProgress] = useState<EvalProgress | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [sawSolution, setSawSolution] = useState(false);
  const [coach, setCoach] = useState<{ index: number; error: string | null } | null>(null);
  const [scout, setScout] = useState(false);
  const [clear, setClear] = useState<ClearInfo | null>(null);

  const fxSeq = useRef(0);
  const attempt = useRef(0);
  const awardedAttempt = useRef(-1);
  const autoOpened = useRef(-1);
  const poolEl = useRef<HTMLDivElement>(null);
  const [laneEls, registerLane] = useElementMap();
  const [zoneEls, registerZone] = useElementMap();
  const [unitEls, registerUnit] = useElementMap();
  const [scoreEls, registerScore] = useElementMap();
  const performedOn = useRef<PuzzleRun | null>(null);
  const plateEls = useRef<Partial<Record<Side, HTMLElement>>>({});
  const boardScroll = useRef<HTMLDivElement>(null);
  const commandEl = useRef<HTMLDivElement>(null);
  const revealTimer = useRef<number | undefined>(undefined);

  const registerPlate = useCallback((side: Side, el: HTMLElement | null) => {
    if (el) plateEls.current[side] = el;
    else delete plateEls.current[side];
  }, []);

  /* ---------------------------------------------------------------- */
  /* Derived                                                            */
  /* ---------------------------------------------------------------- */

  const display = stage ? stage.frames[stage.index]!.state : run.state;
  const staging = stage !== null;
  const evaluation = staging ? null : run.evaluation;
  const evalDone = Boolean(evaluation && evalProgress && evalProgress.focus >= evaluation.outcomes.length);
  const myTurn = !run.evaluation && !staging && display.active === "you" && !display.passed.you;
  const inCoach = coach !== null;
  const won = evaluation?.winner === "you";

  const phase: PhaseLabel = staging
    ? "opponent"
    : evaluation
      ? evalDone
        ? "over"
        : "evaluating"
      : "action";

  const missions = useMemo(() => sortedMissions(display), [display]);
  const projection = useMemo(() => evaluateRound(display, cards), [display, cards]);
  const projectionById = useMemo(
    () => new Map<string, MissionOutcome>(projection.outcomes.map((o) => [o.missionId, o])),
    [projection],
  );

  const legalKeys = useMemo(
    () => new Set(myTurn ? getLegalActions(run.state, cards, "you").map(actionKey) : []),
    [myTurn, run.state, cards],
  );

  // Solution walkthrough: the next step, and what to highlight for it.
  const coachStep = coach ? (puzzle.solution[coach.index] ?? null) : null;
  const coachTarget: CoachTarget | null = useMemo(() => {
    if (!coachStep || staging || run.evaluation) return null;
    const a = coachStep.action;
    const key = actionKey(a);
    switch (a.type) {
      case "play":
        return { cardId: a.cardId, missionId: a.missionId, actionKey: key };
      case "upgrade":
        return { cardId: a.cardId, uid: a.uid, actionKey: key };
      case "reveal":
        return { uid: a.uid, actionKey: key };
      case "pass":
        return { pass: true, actionKey: key };
    }
  }, [coachStep, staging, run.evaluation]);

  // In the walkthrough the selection follows the next step so its buttons show up.
  const effectiveSelection: Selection = useMemo(() => {
    if (!inCoach) return selection;
    if (!coachStep || staging || run.evaluation) return null;
    const a = coachStep.action;
    if (a.type === "play" || a.type === "upgrade") {
      const copies = run.state.hands.you.filter((id) => id === a.cardId).length;
      return { kind: "card", cardId: a.cardId, copy: Math.max(0, copies - 1) };
    }
    if (a.type === "reveal") return { kind: "unit", uid: a.uid };
    return null;
  }, [inCoach, selection, coachStep, staging, run.evaluation, run.state.hands.you]);

  const makeOption = useCallback(
    (action: GameAction, variant: MoveOption["variant"], name: string): MoveOption => {
      const key = actionKey(action);
      const enabled = legalKeys.has(key);
      const reason = enabled
        ? null
        : (checkAction(run.state, action, cards) ?? (myTurn ? "That move is not available right now." : "Wait for your turn."));
      const cost = actionCost(run.state, action, cards) ?? 0;
      return { key, action, variant, label: `${name} · ${cost}`, cost, enabled, reason, short: reason ? shortReason(reason) : null };
    },
    [legalKeys, run.state, cards, myTurn],
  );

  const { laneMoves, unitOptions } = useMemo(() => {
    const lanes: Record<string, MoveOption[]> = {};
    const units: Record<string, MoveOption[]> = {};
    if (!myTurn || !effectiveSelection) return { laneMoves: lanes, unitOptions: units };
    if (effectiveSelection.kind === "card") {
      const card = cards[effectiveSelection.cardId];
      if (!card) return { laneMoves: lanes, unitOptions: units };
      for (const m of run.state.missions) {
        lanes[m.def.id] = [
          makeOption({ type: "play", side: "you", cardId: card.id, missionId: m.def.id, hidden: false }, "faceup", "Play face-up"),
          makeOption({ type: "play", side: "you", cardId: card.id, missionId: m.def.id, hidden: true }, "hidden", "Play hidden"),
        ];
        for (const u of m.units) {
          if (u.side !== "you" || topCard(u, cards).name !== card.name) continue;
          units[u.uid] = [makeOption({ type: "upgrade", side: "you", cardId: card.id, uid: u.uid }, "upgrade", "Upgrade")];
        }
      }
    } else {
      const found = findUnit(run.state, effectiveSelection.uid);
      if (found && found.unit.side === "you" && found.unit.hidden) {
        units[found.unit.uid] = [makeOption({ type: "reveal", side: "you", uid: found.unit.uid }, "reveal", "Reveal")];
      }
    }
    return { laneMoves: lanes, unitOptions: units };
  }, [myTurn, effectiveSelection, cards, run.state, makeOption]);

  const handEntries: HandEntry[] = useMemo(() => {
    const seen: Record<string, number> = {};
    return display.hands.you.map((cardId) => {
      const copy = seen[cardId] ?? 0;
      seen[cardId] = copy + 1;
      const playable = [...legalKeys].some(
        (k) => k.startsWith(`play:${cardId}@`) || k.startsWith(`upgrade:${cardId}>`),
      );
      return { cardId, copy, playable: myTurn ? playable : true };
    });
  }, [display.hands.you, legalKeys, myTurn]);

  const selectableUids = useMemo(() => {
    const set = new Set<string>();
    if (!myTurn || inCoach) return set;
    for (const m of display.missions) for (const u of m.units) if (u.side === "you" && u.hidden) set.add(u.uid);
    return set;
  }, [display, myTurn, inCoach]);

  /* ---------------------------------------------------------------- */
  /* Effects of a step: bursts, floating numbers, defeats               */
  /* ---------------------------------------------------------------- */

  const applyFx = useCallback((frame: StageFrame) => {
    const units: Record<string, UnitFx> = {};
    const lanes: Record<string, LaneFx> = {};
    const gone: string[] = [];
    const amounts: Record<string, number> = {};
    const bump = (uid: string, palette: UnitFx["palette"], amount = 0) => {
      const prev = units[uid];
      amounts[uid] = (amounts[uid] ?? 0) + amount;
      units[uid] = {
        seq: ++fxSeq.current,
        palette: prev?.palette ?? palette,
        float: amounts[uid] ? `+${amounts[uid]}` : prev?.float,
      };
    };
    for (const e of frame.events) {
      switch (e.type) {
        case "played":
          bump(e.uid, e.hidden ? "mist" : "chakra");
          break;
        case "revealed":
          bump(e.uid, "mist");
          break;
        case "upgraded":
          bump(e.uid, "gold");
          break;
        case "powerup":
          bump(e.uid, "gold", e.amount);
          break;
        case "hid":
          bump(e.uid, "mist");
          break;
        case "defeated": {
          const found = findUnit(frame.before, e.uid);
          if (found) lanes[found.mission.def.id] = { seq: ++fxSeq.current, side: found.unit.side };
          gone.push(e.uid);
          break;
        }
        default:
          break;
      }
    }
    if (Object.keys(units).length) setUnitFx((prev) => ({ ...prev, ...units }));
    if (Object.keys(lanes).length) setLaneFx((prev) => ({ ...prev, ...lanes }));
    if (gone.length) setDefeated((prev) => new Set([...prev, ...gone]));
  }, []);

  /* ---------------------------------------------------------------- */
  /* Actions                                                            */
  /* ---------------------------------------------------------------- */

  const clearTransient = useCallback(() => {
    setStage(null);
    setSelection(null);
    setNotice(null);
    setUnitFx({});
    setLaneFx({});
    setDefeated(new Set());
    setEvalProgress(null);
    setResultOpen(false);
    setClear(null);
  }, []);

  const perform = useCallback(
    (action: GameAction): boolean => {
      // A second click before React re-renders would replay the same step.
      if (stage || run.evaluation || performedOn.current === run) return false;
      const result = stepRun(puzzle, run, action);
      if (!result.ok) {
        setNotice({ tone: "warn", text: result.reason });
        return false;
      }
      performedOn.current = run;
      const frames = stepFrames(puzzle, run, action);
      attempt.current += 1;

      if (action.type === "play") {
        const uid = `u${run.state.nextUid}`;
        const copies = run.state.hands.you.filter((id) => id === action.cardId).length;
        setHandOrigins((o) => ({ ...o, [uid]: handLayoutId(action.cardId, Math.max(0, copies - 1)) }));
      }

      const cost = actionCost(run.state, action, cards) ?? 0;
      if (cost > 0) {
        const target =
          action.type === "play"
            ? zoneEls.current.get(action.missionId)
            : action.type === "pass"
              ? null
              : unitEls.current.get(action.uid);
        const mist = (action.type === "play" && action.hidden) || action.type === "reveal";
        emit(poolEl.current, target, {
          count: Math.min(12, 3 + cost * 2),
          palette: mist ? "mist" : "energy",
          duration: 0.7,
          stagger: 0.045,
          size: 10,
        });
      }

      const turns = frames.map((f, i) => frameToLog(f, cards, `s${run.actions.length}-${i}`));
      setRun(result.run);
      setSteps((s) => [...s, turns]);
      setSelection(null);
      setNotice(null);
      // Keep keyboard focus on the board: the move button that was pressed unmounts with the selection.
      const focusUid = action.type === "play" ? `u${run.state.nextUid}` : action.type === "pass" ? null : action.uid;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (document.activeElement && document.activeElement !== document.body) return;
          const unit = focusUid ? unitEls.current.get(focusUid) : undefined;
          const target = unit?.querySelector<HTMLElement>('[role="button"]') ?? document.getElementById("puzzle-hand");
          target?.focus({ preventScroll: true });
        }),
      );
      const [first, ...rest] = frames;
      if (first) applyFx(first);
      if (rest.length > 0) {
        if (reduce) rest.forEach(applyFx);
        else setStage({ frames, index: 0 });
      }
      return true;
    },
    [stage, run, puzzle, cards, emit, applyFx, reduce, zoneEls, unitEls],
  );

  const onPerformOption = useCallback(
    (option: MoveOption) => {
      if (inCoach) {
        if (coachTarget && option.key === coachTarget.actionKey && coach) {
          if (perform(option.action)) setCoach({ index: coach.index + 1, error: null });
        } else {
          setNotice({ tone: "warn", text: "Follow the highlighted move, or exit the walkthrough to play freely." });
        }
        return;
      }
      perform(option.action);
    },
    [inCoach, coachTarget, coach, perform],
  );

  const onBlocked = useCallback((option: MoveOption) => {
    setNotice({ tone: "warn", text: option.reason ?? "That move is not available right now." });
  }, []);

  const undo = useCallback(() => {
    if (run.history.length === 0) return;
    attempt.current += 1;
    clearTransient();
    const restored = undoRun(run);
    // Unit ids are handed out again after an undo; forget hand origins for ids that no longer exist,
    // so a later unit can't share a layout id with a card still in your hand.
    const limit = restored.state.nextUid;
    setHandOrigins((o) => Object.fromEntries(Object.entries(o).filter(([uid]) => Number(uid.slice(1)) < limit)));
    setRun(restored);
    setSteps((s) => s.slice(0, -1));
    setNotice({ tone: "info", text: "Took back your last move." });
  }, [run, clearTransient]);

  const resetBoard = useCallback(() => {
    attempt.current += 1;
    clearTransient();
    setRun(startRun(puzzle));
    setSteps([]);
    setHandOrigins({});
  }, [puzzle, clearTransient]);

  const reset = useCallback(() => {
    resetBoard();
    setCoach(null);
    setNotice({ tone: "info", text: "Puzzle reset. Same board, fresh start." });
  }, [resetBoard]);

  const pass = useCallback(() => {
    if (inCoach) {
      if (coachTarget?.pass && coach) {
        if (perform({ type: "pass", side: "you" })) setCoach({ index: coach.index + 1, error: null });
      } else {
        setNotice({ tone: "warn", text: "Follow the walkthrough, or exit it to play freely." });
      }
      return;
    }
    perform({ type: "pass", side: "you" });
  }, [inCoach, coachTarget, coach, perform]);

  const startSolution = useCallback(() => {
    setSawSolution(true);
    setHintsOpen(false);
    resetBoard();
    setCoach({ index: 0, error: null });
  }, [resetBoard]);

  const coachNext = useCallback(() => {
    if (!coach || !coachStep || stage || run.evaluation) return;
    if (perform(coachStep.action)) setCoach({ index: coach.index + 1, error: null });
    else setCoach({ ...coach, error: "This step could not be played on the current board. Exit and reset to try again." });
  }, [coach, coachStep, stage, run.evaluation, perform]);

  const exitCoach = useCallback(() => {
    const finished = coach !== null && coach.index >= puzzle.solution.length;
    setCoach(null);
    if (!finished) {
      resetBoard();
      setNotice({ tone: "info", text: "Walkthrough closed. The board is reset: try the line yourself." });
    }
  }, [coach, puzzle.solution.length, resetBoard]);

  const selectUnit = useCallback(
    (uid: string) => {
      if (!myTurn || inCoach) return;
      setNotice(null);
      setSelection((prev) => (prev?.kind === "unit" && prev.uid === uid ? null : { kind: "unit", uid }));
    },
    [myTurn, inCoach],
  );

  /** Where scoring flights land: the on-screen score readout, else the scoreboard plate. */
  const scoreTarget = useCallback(
    (side: Side): HTMLElement | null => {
      for (const key of [`${side}:m`, `${side}:d`]) {
        const el = scoreEls.current.get(key);
        if (el && el.getClientRects().length > 0) return el;
      }
      return plateEls.current[side] ?? null;
    },
    [scoreEls],
  );

  /**
   * Bring a lane into view: centre it in the swipeable board, then scroll the window so it sits between the
   * sticky header and the sticky command bar. When it is too tall, `prefer` picks which end stays visible.
   */
  const revealLane = useCallback(
    (missionId: string, prefer: "top" | "bottom" = "top") => {
      const lane = laneEls.current.get(missionId);
      if (!lane) return;
      const behavior: ScrollBehavior = reduce ? "instant" : "smooth";
      const box = boardScroll.current;
      if (box && box.scrollWidth > box.clientWidth + 1) {
        const b = box.getBoundingClientRect();
        const r = lane.getBoundingClientRect();
        box.scrollTo({ left: box.scrollLeft + r.left - b.left - (b.width - r.width) / 2, behavior });
      }
      const r = lane.getBoundingClientRect();
      const top = stickyHeaderBottom() + 12;
      const bottom = window.innerHeight - (commandEl.current?.offsetHeight ?? 0) - 24;
      if (r.top >= top && r.bottom <= bottom) return;
      const fits = r.height <= bottom - top;
      const delta = fits
        ? r.top < top
          ? r.top - top
          : r.bottom - bottom
        : prefer === "bottom"
          ? r.bottom - bottom
          : r.top - top;
      window.scrollTo({ top: window.scrollY + delta, behavior });
    },
    [laneEls, reduce],
  );

  /** Reveal a lane once newly shown move buttons have expanded. */
  const scheduleReveal = useCallback(
    (missionId: string, prefer: "top" | "bottom") => {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => revealLane(missionId, prefer), reduce ? 0 : 300);
    },
    [revealLane, reduce],
  );
  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  const jumpToLane = useCallback((missionId: string) => revealLane(missionId, "top"), [revealLane]);

  // Walkthrough: keep the lane of the next highlighted move on screen.
  useEffect(() => {
    if (!coachTarget || coachTarget.pass) return;
    const lane =
      coachTarget.missionId ?? (coachTarget.uid ? findUnit(run.state, coachTarget.uid)?.mission.def.id : undefined);
    if (lane) scheduleReveal(lane, "bottom");
  }, [coachTarget, run.state, scheduleReveal]);

  const selectCard = useCallback(
    (entry: HandEntry) => {
      if (!myTurn) return;
      if (inCoach) {
        setNotice({ tone: "info", text: "In the walkthrough the next move is chosen for you. Press Next step." });
        return;
      }
      setNotice(null);
      const same = selection?.kind === "card" && selection.cardId === entry.cardId && selection.copy === entry.copy;
      setSelection(same ? null : { kind: "card", cardId: entry.cardId, copy: entry.copy });
      // On phones the lanes are far above the hand: bring the first lane with a legal move into view.
      if (!same && !wide) {
        const upgrade = [...legalKeys].find((k) => k.startsWith(`upgrade:${entry.cardId}>`));
        const upgradeLane = upgrade ? findUnit(run.state, upgrade.slice(upgrade.indexOf(">") + 1))?.mission.def.id : undefined;
        const lane =
          upgradeLane ??
          missions.find(
            (m) => legalKeys.has(`play:${entry.cardId}@${m.def.id}`) || legalKeys.has(`play:${entry.cardId}@${m.def.id}:hidden`),
          )?.def.id;
        if (lane) scheduleReveal(lane, "bottom");
      }
    },
    [myTurn, inCoach, selection, wide, legalKeys, run.state, missions, scheduleReveal],
  );

  /* ---------------------------------------------------------------- */
  /* Timelines                                                          */
  /* ---------------------------------------------------------------- */

  // Opponent replies, one beat at a time.
  useEffect(() => {
    if (!stage) return;
    const t = setTimeout(
      () => {
        const nextIndex = stage.index + 1;
        const frame = stage.frames[nextIndex];
        if (frame) applyFx(frame);
        if (nextIndex >= stage.frames.length - 1) setStage(null);
        else setStage({ frames: stage.frames, index: nextIndex });
      },
      stage.index === 0 ? 700 : 900,
    );
    return () => clearTimeout(t);
  }, [stage, applyFx]);

  // Start mission evaluation once the Action phase is over.
  useEffect(() => {
    if (!evaluation || evalProgress || resultOpen) return;
    const t = setTimeout(() => setEvalProgress({ focus: 0, revealed: 0 }), reduce ? 50 : 500);
    return () => clearTimeout(t);
  }, [evaluation, evalProgress, resultOpen, reduce]);

  // Mission by mission, D → A: focus, verdict, points fly to the scoreboard.
  useEffect(() => {
    if (!evaluation || !evalProgress) return;
    if (evalProgress.focus >= evaluation.outcomes.length) return;
    const outcome = evaluation.outcomes[evalProgress.focus]!;
    if (evalProgress.revealed <= evalProgress.focus) {
      if (evalProgress.revealed === evalProgress.focus) jumpToLane(outcome.missionId);
      const t = setTimeout(
        () => {
          const lane = laneEls.current.get(outcome.missionId);
          const plate = outcome.winner ? scoreTarget(outcome.winner) : null;
          if (outcome.winner && lane && plate) {
            emit(lane, plate, {
              count: Math.min(16, 4 + outcome.points * 2),
              palette: "gold",
              duration: 0.85,
              stagger: 0.035,
              size: 11,
            });
          }
          setEvalProgress({ focus: evalProgress.focus, revealed: evalProgress.focus + 1 });
        },
        reduce ? 250 : 800,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setEvalProgress({ focus: evalProgress.focus + 1, revealed: evalProgress.revealed }),
      reduce ? 250 : 950,
    );
    return () => clearTimeout(t);
  }, [evaluation, evalProgress, reduce, emit, jumpToLane, laneEls, scoreTarget]);

  // Open the result once per attempt; closing it to study the board keeps it closed.
  useEffect(() => {
    if (!evalDone || autoOpened.current === attempt.current) return;
    const t = setTimeout(
      () => {
        autoOpened.current = attempt.current;
        setResultOpen(true);
      },
      reduce ? 150 : 650,
    );
    return () => clearTimeout(t);
  }, [evalDone, reduce]);

  const skipEvaluation = useCallback(() => {
    if (!evaluation) return;
    const n = evaluation.outcomes.length;
    autoOpened.current = attempt.current;
    setEvalProgress({ focus: n, revealed: n });
    setResultOpen(true);
  }, [evaluation]);

  const closeResult = useCallback(() => setResultOpen(false), []);
  const closeHints = useCallback(() => setHintsOpen(false), []);
  const openHintsFromResult = useCallback(() => {
    setResultOpen(false);
    setHintsOpen(true);
  }, []);

  // Award XP and stars when a win is shown.
  useEffect(() => {
    if (!resultOpen || !evaluation || evaluation.winner !== "you" || !hydrated) return;
    if (awardedAttempt.current === attempt.current) return;
    awardedAttempt.current = attempt.current;
    const stars = starsForRun({ hintsUsed, sawSolution });
    const xp = sawSolution ? Math.ceil(puzzle.xp / 2) : puzzle.xp;
    const previous = starsFor(puzzle) ?? 0;
    const granted = award(puzzleKey(puzzle.id), xp, `Puzzle cleared: ${puzzle.title}`);
    record(puzzle.id, stars, granted);
    setClear({ stars, xpGranted: granted ? xp : 0, bestStars: granted ? stars : Math.max(previous, stars) });
  }, [resultOpen, evaluation, hydrated, hintsUsed, sawSolution, puzzle, award, record, starsFor]);

  // Escape clears the current selection.
  useEffect(() => {
    if (!selection || hintsOpen || resultOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, hintsOpen, resultOpen]);

  /* ---------------------------------------------------------------- */
  /* Evaluation display                                                 */
  /* ---------------------------------------------------------------- */

  const shownScore = useMemo(() => {
    if (!evaluation || !evalProgress) return display.score;
    const s = { ...evaluation.scoreBefore };
    for (const o of evaluation.outcomes.slice(0, evalProgress.revealed)) if (o.winner) s[o.winner] += o.points;
    return s;
  }, [evaluation, evalProgress, display.score]);

  const evalIndex = useMemo(
    () => new Map<string, number>(evaluation ? evaluation.outcomes.map((o, i) => [o.missionId, i]) : []),
    [evaluation],
  );

  const laneStatus = (missionId: string): LaneEvalStatus => {
    if (!evaluation || !evalProgress) return "idle";
    const i = evalIndex.get(missionId) ?? -1;
    if (i < evalProgress.revealed) return "done";
    if (i === evalProgress.focus) return "focus";
    return "waiting";
  };

  const revealedIds = useMemo(() => {
    if (!evaluation || !evalProgress) return null;
    return new Set(evaluation.outcomes.slice(0, evalProgress.revealed).map((o) => o.missionId));
  }, [evaluation, evalProgress]);

  const focusId =
    evaluation && evalProgress && evalProgress.focus < evaluation.outcomes.length
      ? evaluation.outcomes[evalProgress.focus]!.missionId
      : null;

  /* ---------------------------------------------------------------- */
  /* Feedback line                                                      */
  /* ---------------------------------------------------------------- */

  const visibleSteps = useMemo(
    () => steps.map((turns, i) => (stage && i === steps.length - 1 ? turns.slice(0, stage.index + 1) : turns)),
    [steps, stage],
  );
  // The latest opponent move that hid or defeated one of your characters, shown on a loss.
  const turningPoint = useMemo(() => {
    for (const turn of steps.flat().reverse()) {
      if (turn.side !== "opp") continue;
      const line = turn.lines.find((l) => l.tone === "defeat" || l.tone === "hide");
      if (line) return `${turn.headline}. ${line.text}.`;
    }
    return null;
  }, [steps]);
  const lastTurn = visibleSteps.length ? visibleSteps[visibleSteps.length - 1]!.at(-1) : undefined;

  const feedback: Feedback = useMemo(() => {
    if (notice) return notice;
    if (staging) return { tone: "opp", text: lastTurn ? `${lastTurn.headline}…` : "Opponent is responding…" };
    if (run.evaluation) {
      if (!evalDone) return { tone: "info", text: "Mission evaluation: scoring D, C, B, then A." };
      const after = run.evaluation.scoreAfter;
      return won
        ? { tone: "good", text: `Lethal! You win ${after.you}–${after.opp}.` }
        : { tone: "warn", text: `You lose ${after.you}–${after.opp}. Undo your last move or retry.` };
    }
    if (inCoach) return { tone: "info", text: "Walkthrough: press Next step to play the highlighted move." };
    if (effectiveSelection?.kind === "card") {
      const card = cards[effectiveSelection.cardId];
      const upgrades = Object.keys(unitOptions).length;
      const effects = card?.effects.map((e) => `${e.trigger.replace("_", " ")}: ${e.text}`).join(" ") ?? "";
      return {
        tone: "info",
        text: `${card ? `${card.name}, ${card.title}` : "Card"} selected${effects ? ` (${effects})` : ""}. Choose a mission${upgrades ? " or upgrade your matching character" : ""}. Esc to cancel.`,
      };
    }
    if (effectiveSelection?.kind === "unit") {
      const found = findUnit(run.state, effectiveSelection.uid);
      const card = found ? topCard(found.unit, cards) : null;
      return {
        tone: "info",
        text: card ? `Reveal ${card.name} for ${card.cost} Chakra to fire MAIN and AMBUSH effects.` : "Choose a move.",
      };
    }
    if (myTurn) {
      const prefix = lastTurn && lastTurn.side === "opp" ? `${lastTurn.headline}. ` : "";
      return {
        tone: lastTurn?.side === "opp" ? "opp" : "info",
        text: `${prefix}${display.passed.opp ? "Opponent has passed: keep playing, or pass to score." : "Your turn: select a card or one of your hidden characters."}`,
      };
    }
    return { tone: "info", text: "Waiting…" };
  }, [notice, staging, lastTurn, run.evaluation, run.state, evalDone, won, inCoach, effectiveSelection, cards, unitOptions, myTurn, display.passed.opp]);

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  const selectedKey = effectiveSelection?.kind === "card" ? `${effectiveSelection.cardId}:${effectiveSelection.copy}` : null;
  const selectedUid = effectiveSelection?.kind === "unit" ? effectiveSelection.uid : null;
  const layoutIdFor = useCallback((uid: string) => handOrigins[uid] ?? `puzzle-unit-${uid}`, [handOrigins]);
  const fromHand = useCallback((uid: string) => uid in handOrigins, [handOrigins]);
  const canUndo = run.history.length > 0 && !inCoach;
  const passLabel = display.passed.opp ? "Pass & score" : "Pass";
  const passHint = display.passed.opp
    ? "Your opponent has passed, so passing ends the Action phase and the missions are scored D to A."
    : `You would be the first to pass, so you ${display.edge === "you" ? "keep" : "take"} the Edge token. Your opponent keeps playing until they pass too.`;
  const bestStars = starsReady ? starsFor(puzzle) : null;
  const potentialStars = starsForRun({ hintsUsed, sawSolution });
  const startState = useMemo(() => startRun(puzzle).state, [puzzle]);
  const maxChakra = puzzle.setup.chakra.you;
  const coachFinished = coach !== null && coach.index >= puzzle.solution.length;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
      {layer}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px]">
        <Link href="/puzzles" className="flex items-center gap-1 font-semibold text-ash-400 transition hover:text-white">
          <Icon name="arrow-left" size={14} />
          Lethal Puzzles
        </Link>
        <span className="text-ash-500" aria-hidden="true">
          /
        </span>
        <span className="text-ash-300" aria-current="page">
          Puzzle {String(position + 1).padStart(2, "0")} of {String(ordered.length).padStart(2, "0")}
        </span>
      </nav>

      {/* Header */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 22 }}
          className="min-w-0"
        >
          <div className="flex items-start gap-4">
            <span className="relative hidden shrink-0 sm:block">
              <span aria-hidden="true" className={cn("absolute inset-0 animate-pulse-glow rounded-2xl", accent.softBg)} />
              <span className={cn("relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br p-px", accent.gradient)}>
                <span className="flex h-full w-full items-center justify-center rounded-[15px] bg-[radial-gradient(circle_at_50%_35%,#1d1d2c,#0b0b12_75%)]">
                  <Emblem name={puzzle.emblem} size={38} className={cn(accent.text, "drop-shadow-[0_0_10px_currentColor]")} />
                </span>
              </span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={puzzle.difficulty} />
                <span className="flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/10 px-2 py-1 text-[11px] font-black text-gold-200">
                  <Icon name="sparkles" size={12} />
                  {puzzle.xp} XP
                </span>
                {bestStars !== null && (
                  <span className="flex items-center gap-1.5 rounded-full border border-leaf-400/30 bg-leaf-500/10 px-2 py-0.5 text-[11px] font-bold text-leaf-300">
                    <Icon name="check" size={12} />
                    Cleared
                    <StarRow value={bestStars} size={12} label={`Best: ${bestStars} of 3 stars`} />
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">{puzzle.title}</h1>
              <p className="mt-1.5 text-base font-semibold text-ash-300 sm:text-lg">{puzzle.tagline}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-gold-400/30 bg-gradient-to-r from-gold-400/[0.12] via-gold-400/[0.04] to-transparent p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950 shadow-[0_0_18px_rgba(245,197,66,0.45)]">
              <Icon name="target" size={18} />
            </span>
            <div className="min-w-0">
              <p className="eyebrow !text-[10px] text-gold-300">Objective</p>
              <p className="mt-0.5 text-[15px] font-bold leading-snug text-white">{puzzle.objective}</p>
            </div>
          </div>

          <div className="panel mt-4 p-4 sm:p-5">
            <p className="eyebrow !text-[10px] text-ash-500">Briefing</p>
            <RichText as="p" text={puzzle.briefing} className="mt-1.5 text-[14.5px] leading-relaxed text-ash-300" />
            <ul className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-semibold" aria-label="Situation">
              <li className="flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/[0.06] px-2 py-0.5 text-gold-200">
                <Icon name="shield" size={12} />
                {startState.edge === "you" ? "You hold the Edge" : "Opponent holds the Edge"}
              </li>
              <li className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-ash-200">
                <Icon name="hand" size={12} />
                {startState.passed.opp
                  ? "Opponent passed: you play back to back"
                  : puzzle.opponentScript.length > 0
                    ? "Opponent replies after each of your moves"
                    : "Opponent will pass on their turn"}
              </li>
              <li className="flex items-center gap-1 rounded-full border border-energy-400/25 bg-energy-500/[0.06] px-2 py-0.5 text-energy-200">
                <Icon name="bolt" size={12} />
                {maxChakra} Chakra to spend
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[11px] font-semibold text-ash-500">Teaches</span>
                {puzzle.teaches.map((k) => (
                  <KeywordChip key={k} query={k} className="!mx-0" />
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setHintsOpen(true)} aria-haspopup="dialog">
                <Icon name="lightbulb" size={14} className="text-gold-300" />
                Hints {hintsUsed}/{puzzle.hints.length}
              </Button>
            </div>
          </div>
        </motion.header>

        <div className="min-w-0">
          <Scoreboard
            state={display}
            score={shownScore}
            phase={phase}
            maxChakra={maxChakra}
            projected={
              evaluation
                ? null
                : { score: projection.scoreAfter, winner: projection.winner, decidedByEdge: projection.decidedByEdge }
            }
            registerPlate={registerPlate}
          />
        </div>
      </div>

      {/* Board */}
      <section aria-label="Board" className="relative z-20 mt-8">
        <ProjectionStrip
          missions={missions}
          outcomes={evaluation ? new Map(evaluation.outcomes.map((o) => [o.missionId, o])) : projectionById}
          revealed={revealedIds}
          focusId={focusId}
          onJump={jumpToLane}
          scout={scout}
          onToggleScout={() => setScout((s) => !s)}
          oppHand={display.hands.opp}
          cards={cards}
        />
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-ash-500 lg:hidden">
          <Icon name="arrow-right" size={13} />
          Swipe the board to see all {missions.length} missions, or tap a mission above.
        </p>
        <motion.div
          layoutScroll
          ref={boardScroll}
          className="scrollbar-none -mx-4 mt-2 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:snap-none lg:overflow-visible lg:px-0"
        >
          <div className="grid auto-cols-[minmax(256px,82vw)] grid-flow-col grid-rows-[auto_auto_auto] gap-x-3 gap-y-0 sm:auto-cols-[minmax(280px,44vw)] lg:auto-cols-[minmax(0,1fr)]">
            {missions.map((m) => {
              const i = evalIndex.get(m.def.id) ?? -1;
              const verdict =
                evaluation && evalProgress && i >= 0 && i < evalProgress.revealed ? evaluation.outcomes[i]! : null;
              return (
                <MissionLane
                  key={m.def.id}
                  mission={m}
                  cards={cards}
                  projection={projectionById.get(m.def.id)!}
                  verdict={verdict}
                  evalStatus={laneStatus(m.def.id)}
                  edge={display.edge}
                  cardSelected={effectiveSelection?.kind === "card"}
                  laneMoves={laneMoves[m.def.id] ?? EMPTY_OPTIONS}
                  unitOptions={unitOptions}
                  selectedUid={selectedUid}
                  selectableUids={selectableUids}
                  onSelectUnit={selectUnit}
                  onPerform={onPerformOption}
                  onBlocked={onBlocked}
                  scout={scout}
                  unitFx={unitFx}
                  laneFx={laneFx[m.def.id]}
                  defeated={defeated}
                  layoutIdFor={layoutIdFor}
                  fromHand={fromHand}
                  coach={coachTarget}
                  registerLane={registerLane}
                  registerZone={registerZone}
                  registerUnit={registerUnit}
                />
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Hand and log */}
      <div className="relative z-10 mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <HandTray
          entries={handEntries}
          cards={cards}
          selectedKey={selectedKey}
          onSelect={selectCard}
          locked={!myTurn}
          wide={wide}
          coachCardId={coachTarget?.cardId ?? null}
        />
        <ActionLog opening={opening} turns={visibleSteps.flat()} />
      </div>

      {/* Command bar */}
      <div ref={commandEl} className="sticky bottom-3 z-30 mt-6">
        {inCoach ? (
          <CoachPanel
            poolRef={poolEl}
            chakra={display.chakra.you}
            maxChakra={maxChakra}
            step={coach.index}
            total={puzzle.solution.length}
            headline={
              coachFinished
                ? "That is the lethal line."
                : coachStep
                  ? describeAction(run.state, coachStep.action, cards)
                  : ""
            }
            why={
              coachFinished
                ? "Watch the missions score from D to A. Then exit and play it yourself to lock in the move order."
                : (coachStep?.why ?? "")
            }
            busy={staging || Boolean(run.evaluation)}
            finished={coachFinished}
            error={coach.error}
            onNext={coachNext}
            onExit={exitCoach}
          />
        ) : (
          <CommandBar
            poolRef={poolEl}
            chakra={display.chakra.you}
            maxChakra={maxChakra}
            feedback={feedback}
            score={shownScore}
            scoreOnMobile={phase === "evaluating" || phase === "over"}
            registerScore={registerScore}
            canUndo={canUndo}
            canPass={myTurn}
            passLabel={passLabel}
            passHint={passHint}
            locked={!myTurn}
            showResultButton={Boolean(evaluation && evalDone && !resultOpen)}
            showSkip={Boolean(evaluation && !evalDone)}
            onSkip={skipEvaluation}
            onUndo={undo}
            onReset={reset}
            onPass={pass}
            onShowResult={() => setResultOpen(true)}
          />
        )}
      </div>

      <HintsDrawer
        open={hintsOpen}
        onClose={closeHints}
        hints={puzzle.hints}
        revealed={hintsUsed}
        onReveal={() => setHintsUsed((n) => Math.min(puzzle.hints.length, n + 1))}
        sawSolution={sawSolution}
        onShowSolution={startSolution}
        potentialStars={potentialStars}
      />

      <ResultOverlay
        open={resultOpen}
        evaluation={evaluation}
        edge={display.edge}
        missions={display.missions}
        puzzle={puzzle}
        next={next}
        clear={won ? clear : null}
        hintsUsed={hintsUsed}
        sawSolution={sawSolution}
        canUndo={run.history.length > 0}
        onUndo={undo}
        onRetry={reset}
        onReview={closeResult}
        onHints={openHintsFromResult}
        turningPoint={turningPoint}
      />
    </div>
  );
}
