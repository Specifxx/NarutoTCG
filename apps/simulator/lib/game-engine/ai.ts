import { applyUnchecked } from "./engine";
import { FORMAT, RANK_BONUS } from "./format";
import { getLegalActions } from "./legal";
import { charactersInPlay } from "./mutations";
import { powerBreakdown } from "./power";
import { other, type EngineContext, type GameState, type PlayerAction, type PlayerId } from "./types";

/**
 * One-ply search AI ("Rogue Ninja"). Every legal action is applied with the real engine and the
 * resulting position is scored by `evaluate`. The AI never reads the opponent's hidden cards:
 * enemy hidden characters are valued at a flat estimate.
 */

const HIDDEN_ESTIMATE = 1.6;

export function evaluate(s: GameState, ctx: EngineContext, p: PlayerId): number {
  const o = other(p);
  const me = s.players[p];
  const them = s.players[o];
  if (s.phase === "gameover" && s.result) return s.result.winner === p ? 1000 : -1000;

  let v = me.score - them.score;
  const futureRounds = FORMAT.rounds - s.round;
  const pendingThisRound = s.phase === "setup" || s.phase === "start" || s.phase === "action";
  const edgeBias = s.edge === p ? 0.4 : -0.4;

  s.missions.forEach((m) => {
    if (!m.revealed) return;
    const value = ctx.cards[s.instances[m.instanceId].cardId].points + RANK_BONUS[m.rank];
    let mine = 0;
    let minePerm = 0;
    let theirs = 0;
    let theirsPerm = 0;
    for (const id of m.characters[p]) {
      const i = s.instances[id];
      if (i.faceDown) {
        const card = ctx.cards[i.cardId];
        const potential = Math.min(card.power, 5) * (card.cost <= me.chakra ? 0.6 : 0.25);
        mine += potential;
        minePerm += potential;
      } else {
        const b = powerBreakdown(s, ctx, id);
        mine += b.total;
        minePerm += Math.max(0, b.total - b.tokens - b.modifiers);
      }
    }
    for (const id of m.characters[o]) {
      const i = s.instances[id];
      if (i.faceDown) {
        theirs += HIDDEN_ESTIMATE;
        theirsPerm += HIDDEN_ESTIMATE;
      } else {
        const b = powerBreakdown(s, ctx, id);
        theirs += b.total;
        theirsPerm += Math.max(0, b.total - b.tokens - b.modifiers);
      }
    }
    if (pendingThisRound && (mine > 0 || theirs > 0)) v += value * Math.tanh((mine - theirs + edgeBias) * 0.7);
    v += value * 0.55 * futureRounds * Math.tanh((minePerm - theirsPerm) * 0.45);
  });

  v += 0.45 * futureRounds * (charactersInPlay(s, p).length - charactersInPlay(s, o).length);
  v += 0.3 * (Math.min(me.hand.length, 8) - Math.min(them.hand.length, 8));
  v += 0.04 * me.chakra;
  return v;
}

function noise(seq: number, index: number): number {
  const h = (Math.imul(seq + 1, 2654435761) ^ Math.imul(index + 7, 40503)) >>> 0;
  return (h % 1000) / 50000;
}

export function chooseMulligan(s: GameState, ctx: EngineContext, p: PlayerId): boolean {
  const cheap = s.players[p].hand.filter((id) => {
    const c = ctx.cards[s.instances[id].cardId];
    return c.type === "character" && c.cost <= 3;
  }).length;
  return cheap < 2;
}

export function chooseAiAction(s: GameState, ctx: EngineContext, p: PlayerId): PlayerAction {
  if (s.phase === "setup") return { type: "MULLIGAN", player: p, mulligan: chooseMulligan(s, ctx, p) };

  const actions = getLegalActions(s, ctx, p);
  const opponent = s.players[other(p)];
  let best: PlayerAction = { type: "PASS", player: p };
  let bestScore = Number.NEGATIVE_INFINITY;

  actions.forEach((action, index) => {
    const next = applyUnchecked(s, action, ctx);
    let score = evaluate(next, ctx, p) + noise(s.seq, index);
    // Passing hands the rest of the round to an opponent who still has Chakra to spend.
    if (action.type === "PASS" && !opponent.passed) score -= 0.15 + opponent.chakra * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  });
  return best;
}
