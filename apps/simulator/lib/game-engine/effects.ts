import { fullName } from "../cards/meta";
import { matchesGroup, type Condition, type Effect, type EffectStep, type EnemyTarget, type FriendlyTarget } from "./abilities";
import { MISSION_RANKS } from "./format";
import { cardOf, defeatInstance, drawCards, inst, log, nameOf } from "./mutations";
import { characterPower } from "./power";
import { other, type EngineContext, type GameState, type PlayerId } from "./types";

export interface EffectContext {
  controller: PlayerId;
  /** Name shown in the log. */
  sourceName: string;
  sourceCardId: string;
  /** The character "this character" / "POWERUP n" refers to (an item's bearer for items). */
  selfId: string | null;
  missionIndex: number | null;
}

function faceUpIn(s: GameState, missionIndex: number, p: PlayerId): string[] {
  return s.missions[missionIndex].characters[p].filter((id) => !s.instances[id].faceDown);
}

/** Lowest/highest current Power; ties go to the character that entered play first. */
function pick(s: GameState, ctx: EngineContext, ids: string[], mode: "weakest" | "strongest"): string | null {
  let best: string | null = null;
  let bestPower = 0;
  for (const id of ids) {
    const pw = characterPower(s, ctx, id);
    if (
      best === null ||
      (mode === "weakest" ? pw < bestPower : pw > bestPower) ||
      (pw === bestPower && s.instances[id].enteredAtSeq < s.instances[best].enteredAtSeq)
    ) {
      best = id;
      bestPower = pw;
    }
  }
  return best;
}

function friendlyTargets(s: GameState, ctx: EngineContext, ec: EffectContext, target: FriendlyTarget): string[] {
  if (target === "self") {
    const self = ec.selfId ? s.instances[ec.selfId] : null;
    return self && self.zone === "mission" && !self.faceDown ? [self.id] : [];
  }
  if (ec.missionIndex === null) return [];
  const pool = faceUpIn(s, ec.missionIndex, ec.controller);
  switch (target) {
    case "each-friendly":
      return pool;
    case "each-other-friendly":
      return pool.filter((id) => id !== ec.selfId);
    case "weakest-friendly": {
      const id = pick(s, ctx, pool, "weakest");
      return id ? [id] : [];
    }
    case "strongest-friendly": {
      const id = pick(s, ctx, pool, "strongest");
      return id ? [id] : [];
    }
  }
}

function enemyTargets(s: GameState, ctx: EngineContext, ec: EffectContext, target: EnemyTarget, maxPower: number | null = null): string[] {
  if (ec.missionIndex === null) return [];
  let pool = faceUpIn(s, ec.missionIndex, other(ec.controller));
  if (maxPower !== null) pool = pool.filter((id) => characterPower(s, ctx, id) <= maxPower);
  if (target === "each-enemy") return pool;
  const id = pick(s, ctx, pool, target === "weakest-enemy" ? "weakest" : "strongest");
  return id ? [id] : [];
}

export function conditionMet(s: GameState, ctx: EngineContext, condition: Condition, ec: EffectContext): boolean {
  if (condition.kind === "edge") return s.edge === ec.controller;
  if (ec.missionIndex === null) return false;
  return faceUpIn(s, ec.missionIndex, ec.controller).some(
    (id) => id !== ec.selfId && matchesGroup(cardOf(s, ctx, id), condition.group),
  );
}

function missionLabel(s: GameState, ec: EffectContext): string {
  return ec.missionIndex === null ? "" : ` in Mission ${MISSION_RANKS[ec.missionIndex]}`;
}

function applyEffect(s: GameState, ctx: EngineContext, effect: Effect, ec: EffectContext): void {
  const p = ec.controller;
  const who = s.players[p].name;
  const src = ec.sourceName;
  const fizzle = (why: string) => log(s, "effect", p, `${src}: ${why}`, ec.sourceCardId);

  switch (effect.op) {
    case "powerup": {
      const targets = friendlyTargets(s, ctx, ec, effect.target);
      if (!targets.length) return fizzle("POWERUP has no target.");
      for (const id of targets) {
        inst(s, id).powerTokens += effect.amount;
        log(s, "token", p, `${src}: ${nameOf(s, ctx, id)} gains ${effect.amount} Power token${effect.amount === 1 ? "" : "s"}.`, s.instances[id].cardId);
      }
      return;
    }
    case "draw":
      drawCards(s, p, effect.amount, src);
      return;
    case "gainChakra":
      s.players[p].chakra += effect.amount;
      log(s, "chakra", p, `${src}: ${who} gains ${effect.amount} Chakra.`, ec.sourceCardId);
      return;
    case "removeTokens": {
      const targets = enemyTargets(s, ctx, ec, effect.target).filter((id) => s.instances[id].powerTokens > 0);
      if (!targets.length) return fizzle("no enemy Power tokens to remove.");
      for (const id of targets) {
        const i = inst(s, id);
        const removed = Math.min(i.powerTokens, effect.amount);
        i.powerTokens -= removed;
        log(s, "token", p, `${src}: removes ${removed} Power token${removed === 1 ? "" : "s"} from ${nameOf(s, ctx, id)}.`, i.cardId);
      }
      return;
    }
    case "weaken": {
      const targets = enemyTargets(s, ctx, ec, effect.target);
      if (!targets.length) return fizzle(`no enemy character${missionLabel(s, ec)}.`);
      for (const id of targets) {
        s.modifiers.push({ targetId: id, amount: -effect.amount, sourceCardId: ec.sourceCardId });
        log(s, "effect", p, `${src}: ${nameOf(s, ctx, id)} gets -${effect.amount} Power this round.`, s.instances[id].cardId);
      }
      return;
    }
    case "defeat": {
      const [target] = enemyTargets(s, ctx, ec, effect.target, effect.maxPower);
      if (!target) return fizzle(`no valid enemy character to defeat${missionLabel(s, ec)}.`);
      defeatInstance(s, ctx, target, src);
      return;
    }
    case "defeatHidden": {
      if (ec.missionIndex === null) return fizzle("no mission.");
      const target = s.missions[ec.missionIndex].characters[other(p)].find((id) => s.instances[id].faceDown);
      if (!target) return fizzle(`no enemy hidden character${missionLabel(s, ec)}.`);
      defeatInstance(s, ctx, target, `${src} — hidden card exposed`);
      return;
    }
    case "hideFromDeck": {
      if (ec.missionIndex === null) return fizzle("no mission.");
      const pl = s.players[p];
      const top = pl.deck.shift();
      if (!top) return fizzle("deck is empty.");
      const card = cardOf(s, ctx, top);
      const i = inst(s, top);
      if (card.type !== "character") {
        i.zone = "discard";
        pl.discard.push(top);
        log(s, "effect", p, `${src}: top card ${fullName(card)} is not a character and is discarded.`, card.id);
        return;
      }
      i.zone = "mission";
      i.faceDown = true;
      i.missionIndex = ec.missionIndex;
      i.enteredAtSeq = s.seq;
      i.revealedAtSeq = null;
      s.missions[ec.missionIndex].characters[p].push(top);
      log(s, "hidden", p, `${src}: ${who} puts the top card of their deck Hidden${missionLabel(s, ec)}.`);
      return;
    }
    case "takeEdge":
      if (s.edge === p) return fizzle(`${who} already holds the Edge.`);
      s.edge = p;
      log(s, "edge", p, `${src}: ${who} takes the Edge token.`, ec.sourceCardId);
      return;
  }
}

export function resolveSteps(s: GameState, ctx: EngineContext, steps: EffectStep[], ec: EffectContext): void {
  for (const step of steps) {
    if (s.phase === "gameover") return;
    if (step.condition && !conditionMet(s, ctx, step.condition, ec)) {
      log(s, "effect", ec.controller, `${ec.sourceName}: condition not met — "${step.text}".`, ec.sourceCardId);
      continue;
    }
    applyEffect(s, ctx, step.effect, ec);
  }
}
