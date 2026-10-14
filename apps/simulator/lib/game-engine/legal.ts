import { fullName } from "../cards/meta";
import { getAbilities } from "./abilities";
import { FORMAT, MISSION_RANKS } from "./format";
import type { EngineContext, GameAction, GameState, PlayerAction, PlayerId } from "./types";

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function handCard(s: GameState, ctx: EngineContext, p: PlayerId, handId: string) {
  if (!s.players[p].hand.includes(handId)) return null;
  return ctx.cards[s.instances[handId].cardId] ?? null;
}

function missionError(s: GameState, missionIndex: number): string | null {
  const m = s.missions[missionIndex];
  if (!m) return "That mission does not exist.";
  if (!m.revealed) return `Mission ${MISSION_RANKS[missionIndex]} is not revealed yet.`;
  return null;
}

/** A face-up character the player controls, or an error. */
function friendlyFaceUp(s: GameState, p: PlayerId, id: string): string | null {
  const i = s.instances[id];
  if (!i || i.zone !== "mission") return "Target a character on a mission.";
  if (i.owner !== p) return "Target a character you control.";
  if (i.faceDown) return "Target a face-up character.";
  return null;
}

function nameConflict(s: GameState, ctx: EngineContext, p: PlayerId, missionIndex: number, name: string, exceptId?: string): boolean {
  return s.missions[missionIndex].characters[p].some((id) => {
    if (id === exceptId) return false;
    const i = s.instances[id];
    return !i.faceDown && sameName(ctx.cards[i.cardId].name, name);
  });
}

function afford(s: GameState, p: PlayerId, cost: number): string | null {
  const have = s.players[p].chakra;
  return have >= cost ? null : `Needs ${cost} Chakra (you have ${have}).`;
}

/** Returns why an action is illegal, or null if it may be applied. */
export function validateAction(s: GameState, ctx: EngineContext, a: GameAction): string | null {
  if (s.phase === "gameover") return "The game is over.";

  if (a.type === "ADVANCE") {
    return s.phase === "start" || s.phase === "mission" || s.phase === "end" ? null : "Nothing to advance.";
  }
  if (a.type === "CONCEDE") return null;

  const p = a.player;
  const pl = s.players[p];

  if (a.type === "MULLIGAN") {
    if (s.phase !== "setup") return "Mulligans happen before the first round.";
    if (s.activePlayer !== p) return `Waiting for ${s.players[s.activePlayer].name} to decide.`;
    if (pl.mulliganDecided) return "You already kept or mulliganed.";
    return null;
  }

  if (s.phase !== "action") return "You can only do that during the Action Phase.";
  if (s.activePlayer !== p) return `It is ${s.players[s.activePlayer].name}'s turn.`;
  if (pl.passed) return "You already passed this round.";

  switch (a.type) {
    case "PASS":
      return null;

    case "PLAY_CHARACTER": {
      const card = handCard(s, ctx, p, a.handId);
      if (!card) return "That card is not in your hand.";
      if (card.type !== "character") return "Only characters can be played to a mission.";
      const mErr = missionError(s, a.missionIndex);
      if (mErr) return mErr;
      if (!a.hidden && nameConflict(s, ctx, p, a.missionIndex, card.name))
        return `You already have ${card.name} face-up in this mission — Evolve it instead.`;
      return afford(s, p, a.hidden ? FORMAT.hiddenCost : card.cost);
    }

    case "REVEAL": {
      const i = s.instances[a.instanceId];
      if (!i || i.zone !== "mission" || i.owner !== p || !i.faceDown || i.missionIndex === null)
        return "Choose one of your hidden characters.";
      const card = ctx.cards[i.cardId];
      if (card.type !== "character") return "Only characters can be revealed.";
      if (nameConflict(s, ctx, p, i.missionIndex, card.name, i.id))
        return `${card.name} is already face-up in this mission.`;
      return afford(s, p, card.cost);
    }

    case "EVOLVE": {
      const card = handCard(s, ctx, p, a.handId);
      if (!card) return "That card is not in your hand.";
      if (card.type !== "character") return "Only characters can Evolve.";
      const tErr = friendlyFaceUp(s, p, a.targetId);
      if (tErr) return tErr;
      const target = ctx.cards[s.instances[a.targetId].cardId];
      if (!sameName(card.name, target.name)) return `${fullName(card)} can only Evolve a ${card.name}.`;
      if (card.cost <= target.cost) return `Evolving needs a higher cost than ${target.cost}.`;
      return afford(s, p, card.cost - target.cost);
    }

    case "PLAY_JUTSU": {
      const card = handCard(s, ctx, p, a.handId);
      if (!card) return "That card is not in your hand.";
      if (card.type !== "jutsu") return "That card is not a jutsu.";
      return missionError(s, a.missionIndex) ?? afford(s, p, card.cost);
    }

    case "ATTACH_ITEM": {
      const card = handCard(s, ctx, p, a.handId);
      if (!card) return "That card is not in your hand.";
      if (card.type !== "item") return "That card is not an item.";
      return friendlyFaceUp(s, p, a.targetId) ?? afford(s, p, card.cost);
    }

    case "LEADER_TECHNIQUE": {
      if (!pl.leader) return "You have no Leader.";
      const technique = getAbilities(ctx.cards[s.instances[pl.leader].cardId]).technique;
      if (!technique) return "Your Leader has no Technique.";
      if (pl.techniqueUsed) return "Leader Technique already used this round.";
      return missionError(s, a.missionIndex) ?? afford(s, p, technique.cost);
    }

    case "ADD_POWER_TOKEN":
      return friendlyFaceUp(s, p, a.targetId) ?? afford(s, p, FORMAT.powerTokenCost);

    case "DRAW_CARD":
      if (pl.deck.length === 0) return "Your deck is empty.";
      return afford(s, p, FORMAT.drawCardCost);
  }
}

/** Every legal action for a player (excluding CONCEDE). */
export function getLegalActions(s: GameState, ctx: EngineContext, p: PlayerId): PlayerAction[] {
  const out: PlayerAction[] = [];
  const pl = s.players[p];

  if (s.phase === "setup") {
    out.push({ type: "MULLIGAN", player: p, mulligan: false }, { type: "MULLIGAN", player: p, mulligan: true });
  } else if (s.phase === "action") {
    const missions = s.missions.map((_, i) => i).filter((i) => s.missions[i].revealed);
    const friendly = missions.flatMap((i) => s.missions[i].characters[p]);
    const faceUp = friendly.filter((id) => !s.instances[id].faceDown);

    for (const handId of pl.hand) {
      const card = ctx.cards[s.instances[handId].cardId];
      if (card.type === "character") {
        for (const mi of missions) {
          out.push({ type: "PLAY_CHARACTER", player: p, handId, missionIndex: mi, hidden: false });
          out.push({ type: "PLAY_CHARACTER", player: p, handId, missionIndex: mi, hidden: true });
        }
        for (const targetId of faceUp) out.push({ type: "EVOLVE", player: p, handId, targetId });
      } else if (card.type === "jutsu") {
        for (const mi of missions) out.push({ type: "PLAY_JUTSU", player: p, handId, missionIndex: mi });
      } else if (card.type === "item") {
        for (const targetId of faceUp) out.push({ type: "ATTACH_ITEM", player: p, handId, targetId });
      }
    }
    for (const id of friendly) if (s.instances[id].faceDown) out.push({ type: "REVEAL", player: p, instanceId: id });
    for (const mi of missions) out.push({ type: "LEADER_TECHNIQUE", player: p, missionIndex: mi });
    for (const targetId of faceUp) out.push({ type: "ADD_POWER_TOKEN", player: p, targetId });
    out.push({ type: "DRAW_CARD", player: p }, { type: "PASS", player: p });
  }

  return out.filter((a) => validateAction(s, ctx, a) === null);
}
