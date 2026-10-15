"use client";

import { useCallback } from "react";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerAction, PlayerId } from "@/lib/game-engine/types";
import { toast } from "../ui/Toast";
import { actorOf, canEvolve, useBoardUi } from "./boardUi";
import { actionFor, dropReason, type Zone } from "./dropZones";

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

  /** A hand card was dropped on a zone. */
  const drop = useCallback(
    (handId: string, zone: Zone | null) => {
      const p = actor();
      const { game: g, ctx } = useGameStore.getState();
      if (p === null || !zone || !g || !ctx) return;
      const action = actionFor(g, ctx, p, handId, zone);
      if (!action) {
        const reason = dropReason(g, ctx, p, handId, zone);
        if (reason) toast(reason, "info");
        return;
      }
      perform(action);
    },
    [perform],
  );

  return { perform, chooseMission, chooseCharacter, drop };
}
