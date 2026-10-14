"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpCircle, Crown, EyeOff, Flag, Layers, LogOut, Plus, RotateCcw, Scroll, Shuffle, SkipForward, Skull, Sparkles, Sword, X } from "lucide-react";
import { useState } from "react";
import { fullName } from "@/lib/cards/meta";
import { FORMAT } from "@/lib/game-engine/format";
import { validateAction } from "@/lib/game-engine/legal";
import { SPEEDS, useGameStore, type Speed } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { Btn } from "../ui/Button";
import { Segmented } from "../ui/Chip";
import { Modal } from "../ui/Modal";
import { actorOf, evolvableHand, handOptions, legalCharacters, techniqueOf, useBoardUi } from "./boardUi";
import { useBoardActions } from "./useBoardActions";

function Control({
  label,
  icon,
  onClick,
  reason,
  cost,
  variant = "secondary",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  reason: string | null;
  cost?: number;
  variant?: "secondary" | "primary" | "hidden" | "danger";
}) {
  return (
    <span title={reason ?? undefined} className="block">
      <Btn variant={variant} className="h-auto min-h-10 w-full justify-start gap-1.5 px-2.5 py-1.5 text-[11px] tracking-[0.04em]" onClick={onClick} disabled={reason !== null} icon={icon}>
        <span className="min-w-0 flex-1 text-left leading-tight">{label}</span>
        {cost !== undefined && (
          <span className="shrink-0 rounded bg-black/25 px-1 py-px font-display text-[10px] font-bold normal-case tracking-normal" aria-label={`${cost} Chakra`}>
            {cost}◉
          </span>
        )}
      </Btn>
    </span>
  );
}

export function ControlPanel() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const exit = useGameStore((s) => s.exit);
  const rematch = useGameStore((s) => s.rematch);
  const intent = useBoardUi((s) => s.intent);
  const setIntent = useBoardUi((s) => s.setIntent);
  const setGraveyard = useBoardUi((s) => s.setGraveyard);
  const { perform } = useBoardActions();
  const [confirmConcede, setConfirmConcede] = useState(false);

  const actor = actorOf(game);
  const p: PlayerId = actor ?? (game.players[0].controller === "human" ? 0 : game.activePlayer);
  const waiting = actor === null ? (game.phase === "gameover" ? "The game is over." : "Not your turn.") : null;
  const check = (r: string | null) => waiting ?? r;

  const drawReason = check(validateAction(game, ctx, { type: "DRAW_CARD", player: p }));
  const passReason = check(validateAction(game, ctx, { type: "PASS", player: p }));
  const mulliganReason = check(validateAction(game, ctx, { type: "MULLIGAN", player: p, mulligan: true }));
  const evolveReason = check(game.phase !== "action" ? "Only during the Action Phase." : evolvableHand(game, ctx, p).length ? null : "No character in hand can Evolve one of yours.");
  const tokenTargets = actor !== null ? legalCharacters(game, ctx, p, { kind: "token" }) : [];
  const tokenReason = check(
    game.phase !== "action"
      ? "Only during the Action Phase."
      : game.players[p].chakra < FORMAT.powerTokenCost
        ? `Needs ${FORMAT.powerTokenCost} Chakra.`
        : tokenTargets.length
          ? null
          : "You have no face-up character.",
  );
  const technique = techniqueOf(game, ctx, p);
  const techniqueReason = check(
    !technique
      ? "Your Leader has no Technique."
      : game.missions.some((_, i) => validateAction(game, ctx, { type: "LEADER_TECHNIQUE", player: p, missionIndex: i }) === null)
        ? null
        : validateAction(game, ctx, { type: "LEADER_TECHNIQUE", player: p, missionIndex: 0 }),
  );

  return (
    <div className="panel p-3">
      <ContextArea />

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Control label="Draw Card" icon={<Layers className="h-4 w-4" />} cost={FORMAT.drawCardCost} reason={drawReason} onClick={() => perform({ type: "DRAW_CARD", player: p })} />
        <Control label="Mulligan" icon={<Shuffle className="h-4 w-4" />} reason={mulliganReason} onClick={() => perform({ type: "MULLIGAN", player: p, mulligan: true })} />
        <Control label="Pass Turn" variant="primary" icon={<SkipForward className="h-4 w-4" />} reason={passReason} onClick={() => perform({ type: "PASS", player: p })} />
        <Control
          label="Evolve Character"
          icon={<ArrowUpCircle className="h-4 w-4" />}
          reason={evolveReason}
          onClick={() => setIntent(intent.kind === "evolve-pick" ? { kind: "none" } : { kind: "evolve-pick" })}
        />
        <Control
          label="Add Power Token"
          icon={<Plus className="h-4 w-4" />}
          cost={FORMAT.powerTokenCost}
          reason={tokenReason}
          onClick={() => setIntent(intent.kind === "token" ? { kind: "none" } : { kind: "token" })}
        />
        <Control label="View Graveyard" icon={<Skull className="h-4 w-4" />} reason={null} onClick={() => setGraveyard(p)} />
        <Control
          label="Leader Technique"
          icon={<Crown className="h-4 w-4" />}
          cost={technique?.cost}
          reason={techniqueReason}
          onClick={() => setIntent(intent.kind === "technique" ? { kind: "none" } : { kind: "technique" })}
        />
        <Control label="Concede" variant="danger" icon={<Flag className="h-4 w-4" />} reason={game.phase === "gameover" ? "The game is over." : null} onClick={() => setConfirmConcede(true)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <Segmented<Speed>
          label="Game speed"
          value={speed}
          onChange={setSpeed}
          options={(Object.keys(SPEEDS) as Speed[]).map((s) => ({ value: s, label: SPEEDS[s].label }))}
        />
        <div className="flex gap-1.5">
          <Btn size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={rematch} title="Rematch with a new seed">
            Rematch
          </Btn>
          <Btn size="sm" variant="ghost" icon={<LogOut className="h-3.5 w-3.5" />} onClick={exit} title="Back to game setup">
            Setup
          </Btn>
        </div>
      </div>

      <Modal
        open={confirmConcede}
        onClose={() => setConfirmConcede(false)}
        title="Concede the game?"
        width="max-w-sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmConcede(false)}>
              Keep playing
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setConfirmConcede(false);
                perform({ type: "CONCEDE", player: p });
              }}
            >
              Concede
            </Btn>
          </>
        }
      >
        <p className="text-sm text-ash-400">Your opponent wins immediately.</p>
      </Modal>
    </div>
  );
}

/** Contextual prompt: what the selected card can do, or which target to pick. */
function ContextArea() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const intent = useBoardUi((s) => s.intent);
  const setIntent = useBoardUi((s) => s.setIntent);
  const { perform } = useBoardActions();
  const actor = actorOf(game);
  const cancel = () => setIntent({ kind: "none" });

  let body: React.ReactNode = null;
  if (actor === null || game.phase !== "action") {
    body = <Prompt text={game.phase === "action" ? "Watch your opponent's move…" : "Phases resolve automatically."} />;
  } else if (intent.kind === "none") {
    body = <Prompt text="Select or drag a card from your hand. Click your characters for more actions." />;
  } else if (intent.kind === "card") {
    const o = handOptions(game, ctx, actor, intent.handId);
    const c = o.card;
    body = (
      <div>
        <Header title={fullName(c)} onCancel={cancel} />
        <div className="grid grid-cols-2 gap-1.5">
          {o.faceUp !== undefined && (
            <Control label="Play" variant="primary" icon={<Sword className="h-4 w-4" />} cost={c.cost} reason={o.faceUp} onClick={() => setIntent({ kind: "play", handId: intent.handId, hidden: false })} />
          )}
          {o.hidden !== undefined && (
            <Control label="Hidden" variant="hidden" icon={<EyeOff className="h-4 w-4" />} cost={FORMAT.hiddenCost} reason={o.hidden} onClick={() => setIntent({ kind: "play", handId: intent.handId, hidden: true })} />
          )}
          {o.evolve !== undefined && (
            <Control label="Evolve" icon={<ArrowUpCircle className="h-4 w-4" />} reason={o.evolve} onClick={() => setIntent({ kind: "evolve", handId: intent.handId })} />
          )}
          {o.jutsu !== undefined && (
            <Control label="Cast" variant="primary" icon={<Scroll className="h-4 w-4" />} cost={c.cost} reason={o.jutsu} onClick={() => setIntent({ kind: "jutsu", handId: intent.handId })} />
          )}
          {o.item !== undefined && (
            <Control label="Equip" variant="primary" icon={<Sparkles className="h-4 w-4" />} cost={c.cost} reason={o.item} onClick={() => setIntent({ kind: "item", handId: intent.handId })} />
          )}
        </div>
      </div>
    );
  } else if (intent.kind === "play" || intent.kind === "jutsu" || intent.kind === "technique") {
    const what = intent.kind === "play" ? (intent.hidden ? "Hidden play: choose a mission's Hidden slot" : "Choose a highlighted mission") : intent.kind === "jutsu" ? "Cast on which mission?" : "Use Technique on which mission?";
    body = <Header title={what} onCancel={cancel} />;
  } else if (intent.kind === "evolve-pick") {
    body = <Header title="Choose a hand card to Evolve with" onCancel={cancel} />;
  } else if (intent.kind === "evolve" || intent.kind === "item" || intent.kind === "token") {
    const what = intent.kind === "evolve" ? "Choose the character to Evolve" : intent.kind === "item" ? "Choose a character to equip" : `Add a Power token (${FORMAT.powerTokenCost} Chakra) to…`;
    body = <Header title={what} onCancel={cancel} />;
  } else if (intent.kind === "reveal") {
    const inst = game.instances[intent.instanceId];
    const c = ctx.cards[inst.cardId];
    const reason = validateAction(game, ctx, { type: "REVEAL", player: actor, instanceId: intent.instanceId });
    body = (
      <div>
        <Header title={`Reveal ${fullName(c)}?`} onCancel={cancel} />
        <p className="mb-2 text-xs text-ash-400">Pay its full cost. MAIN and AMBUSH effects trigger.</p>
        <Control label="Reveal · Ambush" variant="hidden" icon={<Sparkles className="h-4 w-4" />} cost={c.cost} reason={reason} onClick={() => perform({ type: "REVEAL", player: actor, instanceId: intent.instanceId })} />
      </div>
    );
  } else if (intent.kind === "unit") {
    const inst = game.instances[intent.instanceId];
    if (inst && inst.zone === "mission") {
      const c = ctx.cards[inst.cardId];
      const tokenReason = validateAction(game, ctx, { type: "ADD_POWER_TOKEN", player: actor, targetId: intent.instanceId });
      const evolvers = game.players[actor].hand.filter(
        (h) => validateAction(game, ctx, { type: "EVOLVE", player: actor, handId: h, targetId: intent.instanceId }) === null,
      );
      body = (
        <div>
          <Header title={fullName(c)} onCancel={cancel} />
          <div className="grid gap-1.5">
            <Control label="Add Power Token" icon={<Plus className="h-4 w-4" />} cost={FORMAT.powerTokenCost} reason={tokenReason} onClick={() => perform({ type: "ADD_POWER_TOKEN", player: actor, targetId: intent.instanceId })} />
            {evolvers.map((h) => {
              const e = ctx.cards[game.instances[h].cardId];
              return (
                <Control
                  key={h}
                  label={`Evolve → ${e.title ?? e.name}`}
                  icon={<ArrowUpCircle className="h-4 w-4" />}
                  cost={e.cost - c.cost}
                  reason={null}
                  onClick={() => perform({ type: "EVOLVE", player: actor, handId: h, targetId: intent.instanceId })}
                />
              );
            })}
          </div>
        </div>
      );
    } else body = <Prompt text="That character is no longer in play." />;
  }

  return (
    <div className="min-h-[76px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={JSON.stringify(intent) + game.phase + String(actor)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Header({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate font-display text-xs font-bold uppercase tracking-[0.12em] text-chakra-300">{title}</p>
      <button type="button" onClick={onCancel} className="grid h-6 w-6 place-items-center rounded text-ash-400 hover:bg-white/10 hover:text-ash-50" aria-label="Cancel">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Prompt({ text }: { text: string }) {
  return <p className="py-2 text-xs leading-relaxed text-ash-400">{text}</p>;
}
