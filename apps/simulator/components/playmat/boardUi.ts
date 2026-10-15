"use client";

import { create } from "zustand";
import { getAbilities } from "@/lib/game-engine/abilities";
import { validateAction } from "@/lib/game-engine/legal";
import type { EngineContext, GameState, PlayerAction, PlayerId } from "@/lib/game-engine/types";

export type Intent =
  | { kind: "none" }
  | { kind: "card"; handId: string }
  | { kind: "play"; handId: string; hidden: boolean }
  | { kind: "jutsu"; handId: string }
  | { kind: "item"; handId: string }
  | { kind: "evolve-pick" }
  | { kind: "evolve"; handId: string }
  | { kind: "technique" }
  | { kind: "token" }
  | { kind: "reveal"; instanceId: string }
  | { kind: "unit"; instanceId: string };

export interface Inspect {
  cardId: string | null;
  instanceId: string | null;
}

interface BoardUi {
  intent: Intent;
  inspect: Inspect | null;
  graveyard: PlayerId | null;
  dragging: string | null;
  /** Zone key under the pointer while dragging. */
  hoverZone: string | null;
  setHoverZone: (zone: string | null) => void;
  setIntent: (intent: Intent) => void;
  setInspect: (inspect: Inspect | null) => void;
  setGraveyard: (p: PlayerId | null) => void;
  setDragging: (handId: string | null) => void;
  reset: () => void;
}

export const useBoardUi = create<BoardUi>((set) => ({
  intent: { kind: "none" },
  inspect: null,
  graveyard: null,
  dragging: null,
  hoverZone: null,
  setHoverZone: (hoverZone) => set({ hoverZone }),
  setIntent: (intent) => set({ intent }),
  setInspect: (inspect) => set({ inspect }),
  setGraveyard: (graveyard) => set({ graveyard }),
  setDragging: (dragging) => set({ dragging }),
  reset: () => set({ intent: { kind: "none" }, inspect: null, graveyard: null, dragging: null, hoverZone: null }),
}));

/** The player the local user may act for right now, if any. */
export function actorOf(s: GameState): PlayerId | null {
  if (s.phase !== "action" && s.phase !== "setup") return null;
  return s.players[s.activePlayer].controller === "human" ? s.activePlayer : null;
}

const ok = (s: GameState, ctx: EngineContext, a: PlayerAction) => validateAction(s, ctx, a) === null;

/** Missions an intent (or a dragged card) can legally target. */
export function legalMissions(s: GameState, ctx: EngineContext, p: PlayerId, intent: Intent): number[] {
  const idx = s.missions.map((_, i) => i);
  switch (intent.kind) {
    case "play":
      return idx.filter((i) => ok(s, ctx, { type: "PLAY_CHARACTER", player: p, handId: intent.handId, missionIndex: i, hidden: intent.hidden }));
    case "jutsu":
      return idx.filter((i) => ok(s, ctx, { type: "PLAY_JUTSU", player: p, handId: intent.handId, missionIndex: i }));
    case "technique":
      return idx.filter((i) => ok(s, ctx, { type: "LEADER_TECHNIQUE", player: p, missionIndex: i }));
    default:
      return [];
  }
}

/** Characters an intent can legally target. */
export function legalCharacters(s: GameState, ctx: EngineContext, p: PlayerId, intent: Intent): string[] {
  const ids = s.missions.flatMap((m) => m.characters[p]);
  switch (intent.kind) {
    case "evolve":
      return ids.filter((id) => ok(s, ctx, { type: "EVOLVE", player: p, handId: intent.handId, targetId: id }));
    case "item":
      return ids.filter((id) => ok(s, ctx, { type: "ATTACH_ITEM", player: p, handId: intent.handId, targetId: id }));
    case "token":
      return ids.filter((id) => ok(s, ctx, { type: "ADD_POWER_TOKEN", player: p, targetId: id }));
    default:
      return [];
  }
}

export function canEvolve(s: GameState, ctx: EngineContext, p: PlayerId, handId: string): boolean {
  return legalCharacters(s, ctx, p, { kind: "evolve", handId }).length > 0;
}

export function evolvableHand(s: GameState, ctx: EngineContext, p: PlayerId): string[] {
  return s.players[p].hand.filter((h) => canEvolve(s, ctx, p, h));
}

/** Options for a selected hand card: what it can do and why not. */
export function handOptions(s: GameState, ctx: EngineContext, p: PlayerId, handId: string) {
  const card = ctx.cards[s.instances[handId].cardId];
  const first = (actions: PlayerAction[]) => {
    let reason: string | null = "No legal target.";
    for (const a of actions) {
      reason = validateAction(s, ctx, a);
      if (reason === null) return null;
    }
    return reason;
  };
  const missions = s.missions.map((_, i) => i);
  const chars = s.missions.flatMap((m) => m.characters[p]);
  return {
    card,
    faceUp:
      card.type === "character"
        ? first(missions.map((i) => ({ type: "PLAY_CHARACTER", player: p, handId, missionIndex: i, hidden: false }) as const))
        : undefined,
    hidden:
      card.type === "character"
        ? first(missions.map((i) => ({ type: "PLAY_CHARACTER", player: p, handId, missionIndex: i, hidden: true }) as const))
        : undefined,
    evolve: card.type === "character" ? first(chars.map((t) => ({ type: "EVOLVE", player: p, handId, targetId: t }) as const)) : undefined,
    jutsu: card.type === "jutsu" ? first(missions.map((i) => ({ type: "PLAY_JUTSU", player: p, handId, missionIndex: i }) as const)) : undefined,
    item: card.type === "item" ? first(chars.map((t) => ({ type: "ATTACH_ITEM", player: p, handId, targetId: t }) as const)) : undefined,
  };
}

export function techniqueOf(s: GameState, ctx: EngineContext, p: PlayerId) {
  const leader = s.players[p].leader;
  return leader ? getAbilities(ctx.cards[s.instances[leader].cardId]).technique : null;
}
