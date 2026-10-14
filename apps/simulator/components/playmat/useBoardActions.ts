"use client";

import { useCallback } from "react";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerAction, PlayerId } from "@/lib/game-engine/types";
import { toast } from "../ui/Toast";
import { actorOf, canEvolve, useBoardUi } from "./boardUi";

export type DropTarget = { kind: "mission"; index: number; hidden: boolean } | { kind: "char"; id: string };

export function parseDrop(el: Element | null): DropTarget | null {
  const node = el?.closest("[data-drop]");
  const raw = node?.getAttribute("data-drop");
  if (!raw) return null;
  const [kind, a, b] = raw.split(":");
  if (kind === "mission") return { kind: "mission", index: Number(a), hidden: b === "hidden" };
  if (kind === "char") return { kind: "char", id: a };
  return null;
}

/** Turns clicks, intents and drops into engine actions. */
export function useBoardActions() {
  const perform = useCallback((action: PlayerAction) => {
    const error = useGameStore.getState().dispatch(action);
    useBoardUi.getState().setIntent({ kind: "none" });
    if (error) toast(error, "error");
    return error === null;
  }, []);

  const actor = (): PlayerId | null => {
    const g = useGameStore.getState().game;
    return g ? actorOf(g) : null;
  };

  /** A mission was clicked while an intent is pending. */
  const chooseMission = useCallback(
    (index: number, hiddenSlot = false) => {
      const p = actor();
      const intent = useBoardUi.getState().intent;
      if (p === null) return;
      if (intent.kind === "play") perform({ type: "PLAY_CHARACTER", player: p, handId: intent.handId, missionIndex: index, hidden: intent.hidden });
      else if (intent.kind === "jutsu") perform({ type: "PLAY_JUTSU", player: p, handId: intent.handId, missionIndex: index });
      else if (intent.kind === "technique") perform({ type: "LEADER_TECHNIQUE", player: p, missionIndex: index });
      else if (intent.kind === "card") {
        const g = useGameStore.getState().game!;
        const ctx = useGameStore.getState().ctx!;
        const card = ctx.cards[g.instances[intent.handId].cardId];
        if (card.type === "character") perform({ type: "PLAY_CHARACTER", player: p, handId: intent.handId, missionIndex: index, hidden: hiddenSlot });
        else if (card.type === "jutsu") perform({ type: "PLAY_JUTSU", player: p, handId: intent.handId, missionIndex: index });
      }
    },
    [perform],
  );

  /** A character on the board was clicked while an intent is pending. Returns true if it was consumed. */
  const chooseCharacter = useCallback(
    (id: string): boolean => {
      const p = actor();
      const intent = useBoardUi.getState().intent;
      if (p === null) return false;
      if (intent.kind === "evolve") return perform({ type: "EVOLVE", player: p, handId: intent.handId, targetId: id }), true;
      if (intent.kind === "item") return perform({ type: "ATTACH_ITEM", player: p, handId: intent.handId, targetId: id }), true;
      if (intent.kind === "token") return perform({ type: "ADD_POWER_TOKEN", player: p, targetId: id }), true;
      if (intent.kind === "card") {
        const g = useGameStore.getState().game!;
        const ctx = useGameStore.getState().ctx!;
        const card = ctx.cards[g.instances[intent.handId].cardId];
        if (card.type === "item") return perform({ type: "ATTACH_ITEM", player: p, handId: intent.handId, targetId: id }), true;
        if (card.type === "character" && canEvolve(g, ctx, p, intent.handId))
          return perform({ type: "EVOLVE", player: p, handId: intent.handId, targetId: id }), true;
      }
      return false;
    },
    [perform],
  );

  /** A hand card was dropped somewhere on the board. */
  const drop = useCallback(
    (handId: string, target: DropTarget | null) => {
      const p = actor();
      if (p === null || !target) return;
      const { game: g, ctx } = useGameStore.getState();
      if (!g || !ctx) return;
      const card = ctx.cards[g.instances[handId].cardId];
      if (target.kind === "mission") {
        if (card.type === "character") perform({ type: "PLAY_CHARACTER", player: p, handId, missionIndex: target.index, hidden: target.hidden });
        else if (card.type === "jutsu") perform({ type: "PLAY_JUTSU", player: p, handId, missionIndex: target.index });
        else toast("Drop items onto one of your face-up characters.", "info");
      } else if (card.type === "item") perform({ type: "ATTACH_ITEM", player: p, handId, targetId: target.id });
      else if (card.type === "character") perform({ type: "EVOLVE", player: p, handId, targetId: target.id });
      else toast("Drop jutsu onto a mission.", "info");
    },
    [perform],
  );

  return { perform, chooseMission, chooseCharacter, drop };
}
