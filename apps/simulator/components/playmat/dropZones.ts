"use client";

import { validateAction } from "@/lib/game-engine/legal";
import type { EngineContext, GameState, PlayerAction, PlayerId } from "@/lib/game-engine/types";

/**
 * Drop zones are elements with `data-zone`:
 *   mission:<index>:faceup   mission:<index>:hidden   char:<instanceId>
 * The target is the smallest zone whose rectangle contains the pointer, so a character beats
 * the mission area around it, without depending on what is stacked under the dragged card.
 */
export type Zone = { kind: "mission"; index: number; hidden: boolean } | { kind: "char"; id: string };

export function parseZone(raw: string | null | undefined): Zone | null {
  if (!raw) return null;
  const [kind, a, b] = raw.split(":");
  if (kind === "mission") return { kind: "mission", index: Number(a), hidden: b === "hidden" };
  if (kind === "char" && a) return { kind: "char", id: a };
  return null;
}

export function zoneKey(z: Zone): string {
  return z.kind === "mission" ? `mission:${z.index}:${z.hidden ? "hidden" : "faceup"}` : `char:${z.id}`;
}

/** Zone under a viewport point (clientX/clientY). */
export function zoneAt(x: number, y: number): Zone | null {
  let best: { zone: Zone; area: number } | null = null;
  for (const el of document.querySelectorAll<HTMLElement>("[data-zone]")) {
    const r = el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const zone = parseZone(el.dataset.zone);
    const area = r.width * r.height;
    if (zone && (!best || area < best.area)) best = { zone, area };
  }
  return best?.zone ?? null;
}

/** The action a hand card performs when dropped on a zone (null when that combination makes no sense). */
export function actionFor(s: GameState, ctx: EngineContext, p: PlayerId, handId: string, zone: Zone): PlayerAction | null {
  const card = ctx.cards[s.instances[handId]?.cardId];
  if (!card) return null;
  if (zone.kind === "mission") {
    if (card.type === "character") return { type: "PLAY_CHARACTER", player: p, handId, missionIndex: zone.index, hidden: zone.hidden };
    if (card.type === "jutsu" && !zone.hidden) return { type: "PLAY_JUTSU", player: p, handId, missionIndex: zone.index };
    return null;
  }
  if (card.type === "item") return { type: "ATTACH_ITEM", player: p, handId, targetId: zone.id };
  if (card.type === "character") return { type: "EVOLVE", player: p, handId, targetId: zone.id };
  return null;
}

/** Why dropping this card here is illegal, or null if it is legal. */
export function dropReason(s: GameState, ctx: EngineContext, p: PlayerId, handId: string, zone: Zone): string | null {
  const action = actionFor(s, ctx, p, handId, zone);
  if (!action) {
    const card = ctx.cards[s.instances[handId]?.cardId];
    if (card?.type === "item") return "Drop items onto one of your face-up characters.";
    if (card?.type === "jutsu") return "Drop jutsu onto a mission's face-up area.";
    return "Can't play that card there.";
  }
  return validateAction(s, ctx, action);
}
