import { getAbilities, matchesGroup } from "./abilities";
import type { EngineContext, GameState, PlayerId } from "./types";

export interface PowerBreakdown {
  printed: number;
  tokens: number;
  equipment: number;
  auras: number;
  modifiers: number;
  total: number;
  hidden: boolean;
}

const EMPTY: PowerBreakdown = { printed: 0, tokens: 0, equipment: 0, auras: 0, modifiers: 0, total: 0, hidden: false };

/** Current Power of a character in a mission. Hidden characters always have 0 Power. */
export function powerBreakdown(s: GameState, ctx: EngineContext, id: string): PowerBreakdown {
  const inst = s.instances[id];
  if (!inst || inst.zone !== "mission" || inst.missionIndex === null) return EMPTY;
  if (inst.faceDown) return { ...EMPTY, tokens: inst.powerTokens, hidden: true };

  const card = ctx.cards[inst.cardId];
  const owner = inst.owner;
  const mission = s.missions[inst.missionIndex];
  let auras = 0;

  for (const fid of mission.characters[owner]) {
    const f = s.instances[fid];
    if (f.faceDown) continue;
    for (const a of getAbilities(ctx.cards[f.cardId]).auras) {
      if (a.kind === "other-friendly" && fid !== id) auras += a.amount;
      else if (a.kind === "friendly-group-mission" && matchesGroup(card, a.group)) auras += a.amount;
      else if (a.kind === "self-edge" && fid === id && s.edge === owner) auras += a.amount;
    }
  }

  for (const m of s.missions) {
    for (const fid of m.characters[owner]) {
      const f = s.instances[fid];
      if (f.faceDown) continue;
      for (const a of getAbilities(ctx.cards[f.cardId]).auras) {
        if (a.kind === "friendly-group-global" && matchesGroup(card, a.group)) auras += a.amount;
      }
    }
  }

  const leaderId = s.players[owner].leader;
  if (leaderId) {
    for (const a of getAbilities(ctx.cards[s.instances[leaderId].cardId]).auras) {
      if (a.kind === "friendly-group-global" && matchesGroup(card, a.group)) auras += a.amount;
    }
  }

  for (const a of getAbilities(ctx.cards[s.instances[mission.instanceId].cardId]).auras) {
    if (a.kind === "mission-group" && matchesGroup(card, a.group)) auras += a.amount;
  }

  let equipment = 0;
  for (const attId of inst.attachments) {
    for (const a of getAbilities(ctx.cards[s.instances[attId].cardId]).auras) {
      if (a.kind === "equip") equipment += a.amount;
    }
  }

  let modifiers = 0;
  for (const mod of s.modifiers) if (mod.targetId === id) modifiers += mod.amount;

  const printed = card.power;
  const total = Math.max(0, printed + inst.powerTokens + equipment + auras + modifiers);
  return { printed, tokens: inst.powerTokens, equipment, auras, modifiers, total, hidden: false };
}

export function characterPower(s: GameState, ctx: EngineContext, id: string): number {
  return powerBreakdown(s, ctx, id).total;
}

export function missionTotals(s: GameState, ctx: EngineContext, missionIndex: number): [number, number] {
  const m = s.missions[missionIndex];
  const sum = (p: PlayerId) => m.characters[p].reduce((acc, id) => acc + characterPower(s, ctx, id), 0);
  return [sum(0), sum(1)];
}

/** Who would win this mission if it were evaluated now (Edge breaks ties, at least 1 Power needed). */
export function projectedWinner(s: GameState, totals: [number, number], minPower: number): PlayerId | null {
  const [a, b] = totals;
  if (a < minPower && b < minPower) return null;
  if (a > b) return 0;
  if (b > a) return 1;
  return s.edge;
}
