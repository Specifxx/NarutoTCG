"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyAction,
  autoplayOpponent,
  bothPassed,
  createGame,
  evaluateRound,
  findMission,
  findUnit,
  getCard,
  topCard,
} from "@/lib/game/engine";
import type { CardCatalog, GameAction, GameEvent, GameState, RoundEvaluation, Side } from "@/lib/game/types";
import type { DuelDef } from "./duels";

export type DuelPhase = "rival-turn" | "resolving" | "your-turn" | "scoring" | "over";

export type LogTone = "play" | "hidden" | "reveal" | "upgrade" | "effect" | "defeat" | "pass" | "edge";

export interface LogEntry {
  id: number;
  side: Side | null;
  tone: LogTone;
  text: string;
}

/** A "Takes the Edge!" / "Keeps the Edge!" moment. */
export interface EdgeFlourish {
  id: number;
  side: Side;
  kind: "takes" | "keeps";
}

interface Frame {
  before: GameState;
  state: GameState;
  events: GameEvent[];
}

interface Run {
  state: GameState;
  phase: DuelPhase;
  log: LogEntry[];
  evaluation: RoundEvaluation | null;
  firstPasser: Side | null;
  flourish: EdgeFlourish | null;
  /** Characters touched by the latest action. */
  fresh: string[];
  yourActions: GameAction[];
  seq: number;
}

const who = (side: Side) => (side === "you" ? "You" : "Rival");

/** Rebuilds the action behind an engine event, so opponent turns can be replayed one frame at a time. */
function eventAction(e: GameEvent): GameAction | null {
  switch (e.type) {
    case "played":
      return { type: "play", side: e.side, cardId: e.cardId, missionId: e.missionId, hidden: e.hidden };
    case "revealed":
      return { type: "reveal", side: e.side, uid: e.uid };
    case "upgraded":
      return { type: "upgrade", side: e.side, cardId: e.cardId, uid: e.uid };
    case "passed":
      return { type: "pass", side: e.side };
    default:
      return null;
  }
}

/**
 * Runs the rival's turns with the engine's `autoplayOpponent`, then replays
 * them action by action so each one can be shown on its own beat.
 */
export function rivalFrames(state: GameState, duel: DuelDef, cursor: number): { frames: Frame[]; cursor: number } {
  const auto = autoplayOpponent(state, duel.cards, duel.opponentScript, cursor);
  const frames: Frame[] = [];
  let current = state;
  for (const event of auto.events) {
    const action = eventAction(event);
    if (!action) continue;
    const result = applyAction(current, action, duel.cards);
    if (!result.ok) break;
    frames.push({ before: current, state: result.state, events: result.events });
    current = result.state;
  }
  if (JSON.stringify(current) !== JSON.stringify(auto.state)) {
    // Replay diverged (should never happen): fall back to the engine's result.
    frames.push({ before: current, state: auto.state, events: [] });
  }
  return { frames, cursor: auto.cursor };
}

function unitName(state: GameState, uid: string, cards: CardCatalog) {
  const found = findUnit(state, uid);
  return found ? topCard(found.unit, cards).name : "A character";
}

function describe(frame: Frame, cards: CardCatalog, nextId: () => number): LogEntry[] {
  const { before, state, events } = frame;
  const out: LogEntry[] = [];
  for (const e of events) {
    switch (e.type) {
      case "played": {
        const card = getCard(cards, e.cardId);
        const mission = findMission(state, e.missionId)?.def.name ?? "a mission";
        const text = e.hidden
          ? e.side === "you"
            ? `You played ${card.name} hidden on ${mission} (1 Chakra, 0 Power).`
            : `Rival played a hidden character on ${mission} (1 Chakra).`
          : `${who(e.side)} played ${card.name} on ${mission} (${e.cost} Chakra).`;
        out.push({ id: nextId(), side: e.side, tone: e.hidden ? "hidden" : "play", text });
        break;
      }
      case "revealed":
        out.push({
          id: nextId(),
          side: e.side,
          tone: "reveal",
          text: `${who(e.side)} revealed ${getCard(cards, e.cardId).name} (${e.cost} Chakra).`,
        });
        break;
      case "upgraded":
        out.push({
          id: nextId(),
          side: e.side,
          tone: "upgrade",
          text: `${who(e.side)} upgraded to ${getCard(cards, e.cardId).name}, ${getCard(cards, e.cardId).title} (${e.cost} Chakra).`,
        });
        break;
      case "effect":
        out.push({
          id: nextId(),
          side: e.side,
          tone: "effect",
          text: `${e.trigger.replace("_", " ")}: ${e.uid ? `${unitName(state, e.uid, cards)}: ` : ""}${e.text}`,
        });
        break;
      case "defeated":
        out.push({ id: nextId(), side: null, tone: "defeat", text: `${getCard(cards, e.cardId).name} was defeated.` });
        break;
      case "hid":
        out.push({
          id: nextId(),
          side: null,
          tone: "defeat",
          text: `${getCard(cards, e.cardId).name} was turned face-down.`,
        });
        break;
      case "fizzled":
        out.push({ id: nextId(), side: null, tone: "effect", text: "No legal target, so the effect did nothing." });
        break;
      case "passed": {
        if (e.tookEdge) {
          const kept = before.edge === e.side;
          out.push({
            id: nextId(),
            side: e.side,
            tone: "edge",
            text: `${who(e.side)} passed first and ${kept ? "kept" : "took"} the Edge.`,
          });
        } else {
          out.push({
            id: nextId(),
            side: e.side,
            tone: "pass",
            text: `${who(e.side)} passed too. The Action phase is over.`,
          });
        }
        break;
      }
      case "powerup":
        break;
    }
  }
  return out;
}

const freshUids = (events: GameEvent[]) =>
  events.flatMap((e) =>
    e.type === "played" || e.type === "revealed" || e.type === "upgraded" || e.type === "powerup" ? [e.uid] : [],
  );

function initialRun(duel: DuelDef): Run {
  const state = createGame(duel.setup);
  return {
    state,
    phase: state.active === "opp" ? "rival-turn" : "your-turn",
    log: [],
    evaluation: null,
    firstPasser: null,
    flourish: null,
    fresh: [],
    yourActions: [],
    seq: 0,
  };
}

export interface DuelController {
  state: GameState;
  phase: DuelPhase;
  log: LogEntry[];
  evaluation: RoundEvaluation | null;
  firstPasser: Side | null;
  flourish: EdgeFlourish | null;
  fresh: string[];
  yourActions: GameAction[];
  /** Plays one of your actions; ignored unless it is your turn. */
  act: (action: GameAction) => void;
}

/**
 * Drives one duel through the teaching engine: your actions apply instantly,
 * the scripted rival answers on a short beat, and the Round is scored with
 * `evaluateRound` once both players have passed. Remount (change `key`) to retry.
 */
export function useDuel(duel: DuelDef): DuelController {
  const reduce = useReducedMotion();
  const [run, setRun] = useState<Run>(() => initialRun(duel));
  const timers = useRef<number[]>([]);
  const cursor = useRef(0);
  const locked = useRef(false);
  const seq = useRef(0);

  const timing = reduce
    ? { think: 200, step: 260, move: 160, score: 260 }
    : { think: 750, step: 950, move: 560, score: 950 };

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const applyFrame = useCallback(
    (frame: Frame, extra?: (r: Run) => Partial<Run>) => {
      // Ids are minted here, outside the updater, so React may re-run it safely.
      const entries = describe(frame, duel.cards, () => ++seq.current);
      let flourish: EdgeFlourish | null = null;
      for (const e of frame.events) {
        if (e.type === "passed" && e.tookEdge) {
          flourish = { id: ++seq.current, side: e.side, kind: frame.before.edge === e.side ? "keeps" : "takes" };
        }
      }
      const fresh = freshUids(frame.events);
      setRun((r) => ({
        ...r,
        ...extra?.(r),
        state: frame.state,
        log: [...r.log, ...entries],
        firstPasser: flourish ? flourish.side : r.firstPasser,
        flourish: flourish ?? r.flourish,
        fresh,
      }));
    },
    [duel.cards],
  );

  const proceed = useCallback(
    function proceed(after: GameState, at: number) {
      if (bothPassed(after)) {
        setRun((r) => ({ ...r, phase: "scoring" }));
        schedule(
          () => setRun((r) => ({ ...r, phase: "over", evaluation: evaluateRound(after, duel.cards) })),
          timing.score,
        );
        return;
      }
      if (after.active === "opp") {
        setRun((r) => ({ ...r, phase: "rival-turn" }));
        const { frames, cursor: next } = rivalFrames(after, duel, at);
        let t = timing.think;
        for (const frame of frames) {
          schedule(() => applyFrame(frame), t);
          t += timing.step;
        }
        const last = frames.length > 0 ? frames[frames.length - 1]!.state : after;
        schedule(
          () => {
            cursor.current = next;
            proceed(last, next);
          },
          Math.max(timing.think, t - timing.step + timing.move),
        );
        return;
      }
      locked.current = false;
      setRun((r) => ({ ...r, phase: "your-turn" }));
    },
    [applyFrame, duel, schedule, timing.move, timing.score, timing.step, timing.think],
  );

  // Kick off: if the rival leads, they move first. Timers are cleared on unmount.
  useEffect(() => {
    const initial = createGame(duel.setup);
    locked.current = initial.active === "opp";
    cursor.current = 0;
    proceed(initial, 0);
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.length = 0;
    };
    // Runs once per mounted duel; the board remounts (new key) to retry.
  }, []); // intentionally once

  const act = useCallback(
    (action: GameAction) => {
      if (locked.current || run.phase !== "your-turn") return;
      const result = applyAction(run.state, action, duel.cards);
      if (!result.ok) return;
      locked.current = true;
      applyFrame({ before: run.state, state: result.state, events: result.events }, (r) => ({
        phase: "resolving",
        yourActions: [...r.yourActions, action],
      }));
      schedule(() => proceed(result.state, cursor.current), timing.move);
    },
    [applyFrame, duel.cards, proceed, run.phase, run.state, schedule, timing.move],
  );

  return {
    state: run.state,
    phase: run.phase,
    log: run.log,
    evaluation: run.evaluation,
    firstPasser: run.firstPasser,
    flourish: run.flourish,
    fresh: run.fresh,
    yourActions: run.yourActions,
    act,
  };
}
