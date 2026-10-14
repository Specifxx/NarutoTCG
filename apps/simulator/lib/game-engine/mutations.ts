import { fullName } from "../cards/meta";
import type { SimCard } from "../cards/types";
import type { CardInstance, EngineContext, GameState, LogKind, PlayerId } from "./types";

/** Helpers that mutate an Immer draft of the game state. */

export function inst(s: GameState, id: string): CardInstance {
  const i = s.instances[id];
  if (!i) throw new Error(`Unknown card instance "${id}".`);
  return i;
}

export function cardOf(s: GameState, ctx: EngineContext, id: string): SimCard {
  return ctx.cards[inst(s, id).cardId];
}

export function nameOf(s: GameState, ctx: EngineContext, id: string): string {
  return fullName(cardOf(s, ctx, id));
}

export function log(s: GameState, kind: LogKind, player: PlayerId | null, text: string, cardId?: string): void {
  s.log.push({ id: s.nextLogId++, seq: s.seq, round: s.round, phase: s.phase, player, kind, text, cardId });
}

export function playerName(s: GameState, p: PlayerId): string {
  return s.players[p].name;
}

export function spend(s: GameState, p: PlayerId, amount: number): void {
  const pl = s.players[p];
  if (amount > pl.chakra) throw new Error(`${pl.name} cannot pay ${amount} Chakra.`);
  pl.chakra -= amount;
  pl.chakraSpent += amount;
}

export function drawCards(s: GameState, p: PlayerId, count: number, reason: string): number {
  const pl = s.players[p];
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const id = pl.deck.shift();
    if (!id) break;
    pl.hand.push(id);
    inst(s, id).zone = "hand";
    drawn++;
  }
  if (drawn > 0) log(s, "draw", p, `${pl.name} draws ${drawn} card${drawn === 1 ? "" : "s"} (${reason}).`);
  if (drawn < count) log(s, "draw", p, `${pl.name}'s deck is empty — ${count - drawn} draw${count - drawn === 1 ? "" : "s"} skipped.`);
  return drawn;
}

function toDiscard(s: GameState, id: string): void {
  const i = inst(s, id);
  i.zone = "discard";
  i.missionIndex = null;
  i.faceDown = false;
  i.powerTokens = 0;
  i.attachedTo = null;
  i.stack = [];
  i.attachments = [];
  s.players[i.owner].discard.push(id);
}

/** Removes a character from its mission; it, every card beneath it and its items go to the discard pile. */
export function defeatInstance(s: GameState, ctx: EngineContext, id: string, reason: string): void {
  const i = inst(s, id);
  if (i.zone !== "mission" || i.missionIndex === null) return;
  const mission = s.missions[i.missionIndex];
  mission.characters[i.owner] = mission.characters[i.owner].filter((c) => c !== id);
  s.modifiers = s.modifiers.filter((m) => m.targetId !== id);
  const name = nameOf(s, ctx, id);
  const beneath = [...i.stack];
  const items = [...i.attachments];
  for (const sid of beneath) toDiscard(s, sid);
  for (const aid of items) toDiscard(s, aid);
  toDiscard(s, id);
  log(s, "defeat", i.owner, `${name} is defeated (${reason}).`, i.cardId);
}

export function charactersInPlay(s: GameState, p: PlayerId): string[] {
  return s.missions.flatMap((m) => m.characters[p]);
}
