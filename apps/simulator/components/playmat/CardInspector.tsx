"use client";

import { EyeOff } from "lucide-react";
import { fullName } from "@/lib/cards/meta";
import { powerBreakdown } from "@/lib/game-engine/power";
import { useGameStore } from "@/lib/game-engine/store";
import { CardBack } from "../cards/CardFace";
import { CardDetail } from "../cards/CardDetail";
import { useBoardUi } from "./boardUi";

export function CardInspector() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const inspect = useBoardUi((s) => s.inspect);

  if (!inspect) {
    return (
      <div className="panel p-3">
        <span className="panel-title">Inspector</span>
        <p className="mt-2 text-xs text-ash-500">Hover any card to read it here.</p>
      </div>
    );
  }

  const inst = inspect.instanceId ? game.instances[inspect.instanceId] : null;
  if (!inspect.cardId) {
    return (
      <div className="panel flex gap-3 p-3">
        <CardBack size="md" />
        <div>
          <span className="panel-title">Hidden character</span>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ash-400">
            <EyeOff className="h-3.5 w-3.5 text-yin-400" /> Face-down. 0 Power and no effects until revealed for its full cost — then its AMBUSH triggers.
          </p>
        </div>
      </div>
    );
  }

  const card = ctx.cards[inspect.cardId];
  if (!card) return null;
  const inPlay = inst && inst.zone === "mission" && inst.cardId === card.id;
  const pb = inPlay ? powerBreakdown(game, ctx, inst.id) : null;

  return (
    <div className="panel p-3">
      <span className="panel-title">Inspector</span>
      <div className="mt-2">
        <CardDetail
          card={card}
          compact
          extra={
            pb && inst ? (
              <div className="rounded-lg border border-white/5 bg-shadow-950/60 p-2 text-[11px]">
                {inst.faceDown ? (
                  <p className="flex items-center gap-1.5 text-yin-400">
                    <EyeOff className="h-3.5 w-3.5" /> Hidden — 0 Power until revealed ({card.cost} Chakra).
                  </p>
                ) : (
                  <>
                    <p className="mb-1 font-display text-xs font-bold text-ash-50">Power {pb.total}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-ash-400">
                      <dt>Printed</dt>
                      <dd className="text-right text-ash-200">{pb.printed}</dd>
                      <dt>Power tokens</dt>
                      <dd className="text-right text-chakra-300">+{pb.tokens}</dd>
                      <dt>Equipment</dt>
                      <dd className="text-right text-sky-300">+{pb.equipment}</dd>
                      <dt>Auras</dt>
                      <dd className="text-right text-jade-400">{pb.auras >= 0 ? `+${pb.auras}` : pb.auras}</dd>
                      <dt>This round</dt>
                      <dd className="text-right text-blood-400">{pb.modifiers}</dd>
                    </dl>
                  </>
                )}
                {inst.stack.length > 0 && (
                  <p className="mt-1.5 text-ash-500">Evolved from: {inst.stack.map((s) => fullName(ctx.cards[game.instances[s].cardId])).join(" → ")}</p>
                )}
                {inst.attachments.length > 0 && (
                  <p className="mt-1 text-ash-500">Equipped: {inst.attachments.map((a) => ctx.cards[game.instances[a].cardId].name).join(", ")}</p>
                )}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
