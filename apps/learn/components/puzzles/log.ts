import { describeAction, findMission } from "@/lib/game/engine";
import type { CardCatalog, EffectTrigger, GameEvent, GameState, MissionOutcome, Side } from "@/lib/game/types";
import type { StageFrame } from "./staging";

export type LogTone = "effect" | "power" | "defeat" | "hide" | "fizzle" | "edge";

export interface LogLine {
  tone: LogTone;
  text: string;
  trigger?: EffectTrigger;
}

export interface LogTurn {
  id: string;
  side: Side;
  kind: "play" | "reveal" | "upgrade" | "pass";
  headline: string;
  lines: LogLine[];
}

const TRIGGER_LABEL: Record<EffectTrigger, string> = {
  MAIN: "MAIN",
  AMBUSH: "AMBUSH",
  UPGRADE: "UPGRADE",
  FIRST_STRIKE: "FIRST STRIKE",
  SCORE: "SCORE",
  CONTINUOUS: "CONTINUOUS",
};

const trimPeriod = (text: string) => text.replace(/\.\s*$/, "");

function unitInfo(state: GameState, uid: string): { cardId: string; side: Side; hidden: boolean } | null {
  for (const m of state.missions) {
    const u = m.units.find((x) => x.uid === uid);
    if (u) return { cardId: u.stack[u.stack.length - 1]!, side: u.side, hidden: u.hidden };
  }
  return null;
}

/**
 * Turns one frame (a single action and what it caused) into a log entry.
 * Your actions use the engine's `describeAction`; the opponent's hidden plays
 * stay anonymous until they are revealed.
 */
export function frameToLog(frame: StageFrame, catalog: CardCatalog, id: string): LogTurn {
  const { action, before, state, events } = frame;
  const nameOf = (uid: string, cardId?: string): string => {
    const was = unitInfo(before, uid);
    const now = unitInfo(state, uid);
    const info = now ?? was;
    // An enemy that stays face-down keeps its identity secret.
    const secret = info?.side === "opp" && Boolean(now?.hidden) && (was ? was.hidden : true);
    if (secret) return "A hidden enemy";
    const card = cardId ?? info?.cardId;
    return (card && catalog[card]?.name) || "A character";
  };
  const missionName = (missionId: string) => findMission(before, missionId)?.def.name ?? "a mission";

  let headline = "";
  if (action.side === "you") {
    headline = describeAction(before, action, catalog);
  } else {
    switch (action.type) {
      case "play": {
        const card = catalog[action.cardId];
        headline = action.hidden
          ? `Opponent plays a character hidden on ${missionName(action.missionId)} (1 Chakra)`
          : `Opponent plays ${card?.name ?? "a character"} on ${missionName(action.missionId)} (${card?.cost ?? 0} Chakra)`;
        break;
      }
      case "reveal": {
        const info = unitInfo(before, action.uid);
        const card = info ? catalog[info.cardId] : undefined;
        headline = `Opponent reveals ${card?.name ?? "a hidden character"} (${card?.cost ?? 0} Chakra)`;
        break;
      }
      case "upgrade": {
        const info = unitInfo(before, action.uid);
        const from = info ? catalog[info.cardId] : undefined;
        const card = catalog[action.cardId];
        headline = `Opponent upgrades to ${card?.name ?? "a character"}${card ? ` — ${card.title}` : ""} (${(card?.cost ?? 0) - (from?.cost ?? 0)} Chakra)`;
        break;
      }
      case "pass":
        headline = "Opponent passes";
        break;
    }
  }

  const lines: LogLine[] = [];
  const skipFirst = (e: GameEvent) =>
    e.type === "played" || e.type === "revealed" || e.type === "upgraded" || e.type === "passed";

  events.forEach((event, i) => {
    if (i === 0 && skipFirst(event)) {
      if (event.type === "passed" && event.tookEdge) {
        // The first player to pass gains the Edge, or keeps it if they already held it.
        const kept = before.edge === event.side;
        headline +=
          event.side === "you" ? ` — you ${kept ? "keep" : "take"} the Edge` : ` — ${kept ? "keeps" : "takes"} the Edge`;
      }
      return;
    }
    switch (event.type) {
      case "effect":
        lines.push({
          tone: "effect",
          trigger: event.trigger,
          text: `${TRIGGER_LABEL[event.trigger]} — ${trimPeriod(event.text)}`,
        });
        break;
      case "powerup":
        lines.push({
          tone: "power",
          text: `${nameOf(event.uid)} gains ${event.amount} Power token${event.amount === 1 ? "" : "s"}`,
        });
        break;
      case "defeated":
        lines.push({ tone: "defeat", text: `${nameOf(event.uid, event.cardId)} is defeated` });
        break;
      case "hid":
        lines.push({ tone: "hide", text: `${nameOf(event.uid, event.cardId)} is turned face-down (hidden)` });
        break;
      case "fizzled":
        lines.push({ tone: "fizzle", text: "No valid target, so the effect does nothing" });
        break;
      case "passed": {
        const verb = event.side === "you" ? "You pass" : "Opponent passes";
        const kept = before.edge === event.side;
        const edge = event.tookEdge
          ? event.side === "you"
            ? ` and ${kept ? "keep" : "take"} the Edge`
            : ` and ${kept ? "keeps" : "takes"} the Edge`
          : "";
        lines.push({ tone: "edge", text: `${verb}${edge}` });
        break;
      }
      default:
        break;
    }
  });

  return { id, side: action.side, kind: action.type, headline, lines };
}

/** Plain-language explanation of a scored mission, from your point of view. */
export function outcomeReason(outcome: MissionOutcome, edge: Side): string {
  const { power } = outcome;
  const holder = edge === "you" ? "you hold" : "your opponent holds";
  switch (outcome.reason) {
    case "power":
      return outcome.winner === "you"
        ? `${power.you} Power beats ${power.opp}.`
        : `Opponent has more Power: ${power.opp} against your ${power.you}.`;
    case "edge-tiebreak":
      return `Tied at ${power.you}, and ${holder} the Edge token, which wins ties.`;
    case "no-power":
      return "Neither side has any Power here. You need at least 1 Power to win a mission.";
  }
}

/** Short verdict label for badges. */
export function outcomeLabel(outcome: Pick<MissionOutcome, "winner" | "reason">): string {
  if (!outcome.winner) return "No winner";
  const who = outcome.winner === "you" ? "You win" : "Opponent wins";
  return outcome.reason === "edge-tiebreak" ? `${who} (tie, Edge)` : who;
}
