import { produce } from "immer";
import { fullName } from "../cards/meta";
import { getAbilities, triggersOf, type Trigger } from "./abilities";
import { resolveSteps, type EffectContext } from "./effects";
import { FORMAT, MISSION_RANKS, RANK_BONUS } from "./format";
import { validateAction } from "./legal";
import { cardOf, charactersInPlay, drawCards, inst, log, nameOf, spend } from "./mutations";
import { missionTotals, projectedWinner } from "./power";
import { nextFloat, shuffle } from "./rng";
import {
  other,
  PLAYER_IDS,
  type CardInstance,
  type ChakraIncome,
  type EngineContext,
  type GameAction,
  type GameSetup,
  type GameState,
  type MissionEvaluation,
  type MissionSlot,
  type PlayerId,
  type PlayerState,
} from "./types";

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalActionError";
  }
}

function newInstance(id: string, cardId: string, owner: PlayerId, zone: CardInstance["zone"]): CardInstance {
  return {
    id,
    cardId,
    owner,
    zone,
    faceDown: false,
    missionIndex: null,
    powerTokens: 0,
    stack: [],
    attachments: [],
    attachedTo: null,
    enteredAtSeq: 0,
    revealedAtSeq: null,
  };
}

/** Builds a new game in the Setup (mulligan) step. Throws if a deck references unknown cards. */
export function createGame(setup: GameSetup, ctx: EngineContext): GameState {
  const holder = { rng: setup.seed >>> 0 || 1 };
  const instances: Record<string, CardInstance> = {};
  const counters = [0, 0];
  const make = (owner: PlayerId, cardId: string, zone: CardInstance["zone"]) => {
    if (!ctx.cards[cardId]) throw new Error(`Deck "${setup.players[owner].deck.name}" uses unknown card "${cardId}".`);
    const id = `p${owner}-${counters[owner]++}`;
    instances[id] = newInstance(id, cardId, owner, zone);
    return id;
  };

  const firstPlayer: PlayerId = setup.firstPlayer ?? (nextFloat(holder) < 0.5 ? 0 : 1);
  const chosenMissions: [string[], string[]] = [[], []];

  const players = PLAYER_IDS.map((p): PlayerState => {
    const { deck, name, controller } = setup.players[p];
    const leader = deck.leaderId ? make(p, deck.leaderId, "leader") : null;
    const missionIds = shuffle(holder, deck.missionIds.map((cid) => make(p, cid, "reserve")));
    chosenMissions[p] = missionIds.slice(0, FORMAT.missionsPerPlayer);
    for (const id of chosenMissions[p]) instances[id].zone = "missionCard";
    const library = shuffle(holder, deck.mainIds.map((cid) => make(p, cid, "deck")));
    return {
      id: p,
      name,
      deckName: deck.name,
      controller,
      deck: library,
      hand: [],
      discard: [],
      leader,
      reserve: missionIds.slice(FORMAT.missionsPerPlayer),
      chakra: 0,
      chakraSpent: 0,
      lastIncome: null,
      score: 0,
      mulliganDecided: false,
      mulliganed: false,
      passed: false,
      techniqueUsed: false,
    };
  }) as [PlayerState, PlayerState];

  // Official layout: the first player's missions fill D and B, the other player's fill C and A.
  const second = other(firstPlayer);
  const order: Array<[PlayerId, number]> = [
    [firstPlayer, 0],
    [second, 0],
    [firstPlayer, 1],
    [second, 1],
  ];
  const missions: MissionSlot[] = MISSION_RANKS.map((rank, i) => {
    const [owner, n] = order[i];
    const instanceId = chosenMissions[owner][n];
    if (!instanceId) throw new Error(`${players[owner].name} needs ${FORMAT.missionsPerPlayer} mission cards.`);
    return { rank, instanceId, owner, revealed: false, characters: [[], []], wins: [0, 0] };
  });

  const s: GameState = {
    seed: setup.seed,
    rng: holder.rng,
    seq: 0,
    nextLogId: 1,
    round: 1,
    phase: "setup",
    activePlayer: firstPlayer,
    edge: firstPlayer,
    firstPlayer,
    players,
    missions,
    instances,
    modifiers: [],
    log: [],
    lastEvaluation: null,
    result: null,
  };

  log(s, "system", null, `Game start — seed ${setup.seed}. ${players[0].name} (${players[0].deckName}) vs ${players[1].name} (${players[1].deckName}).`);
  log(s, "edge", firstPlayer, `${players[firstPlayer].name} goes first and takes the Edge token.`);
  for (const p of PLAYER_IDS) drawCards(s, p, FORMAT.openingHand, "opening hand");
  log(s, "mulligan", firstPlayer, `${players[firstPlayer].name} decides on a mulligan first.`);
  return s;
}

function chakraIncome(s: GameState, ctx: EngineContext, p: PlayerId): ChakraIncome {
  const inPlay = charactersInPlay(s, p);
  let bonus = 0;
  for (const id of inPlay) {
    const i = s.instances[id];
    if (!i.faceDown) bonus += getAbilities(ctx.cards[i.cardId]).chakraBonus;
  }
  const leader = s.players[p].leader;
  if (leader) bonus += getAbilities(cardOf(s, ctx, leader)).chakraBonus;
  const characters = inPlay.length * FORMAT.chakraPerCharacter;
  return { base: FORMAT.baseChakra, characters, bonus, total: FORMAT.baseChakra + characters + bonus };
}

function enterStart(s: GameState, ctx: EngineContext): void {
  s.phase = "start";
  log(s, "phase", null, `Round ${s.round} — Start Phase.`);
  const mission = s.missions[s.round - 1];
  if (mission && !mission.revealed) {
    mission.revealed = true;
    const card = cardOf(s, ctx, mission.instanceId);
    log(s, "mission", mission.owner, `Mission ${mission.rank} revealed: ${card.name} (${card.points} pts + ${RANK_BONUS[mission.rank]} rank bonus).`, card.id);
  }
  const edgeFirst: PlayerId[] = [s.edge, other(s.edge)];
  for (const p of edgeFirst) {
    const pl = s.players[p];
    const income = chakraIncome(s, ctx, p);
    pl.chakra += income.total;
    pl.lastIncome = income;
    pl.passed = false;
    pl.techniqueUsed = false;
    const parts = [`${income.base} base`, `${income.characters} from characters`];
    if (income.bonus) parts.push(`${income.bonus} from CHAKRA`);
    log(s, "chakra", p, `${pl.name} gains ${income.total} Chakra (${parts.join(" + ")}).`);
  }
  for (const p of edgeFirst) drawCards(s, p, FORMAT.drawPerRound, "Start Phase");
}

function enterAction(s: GameState): void {
  s.phase = "action";
  s.activePlayer = s.edge;
  log(s, "phase", null, `Action Phase — ${s.players[s.edge].name} holds the Edge and acts first.`);
}

function enterMission(s: GameState, ctx: EngineContext): void {
  s.phase = "mission";
  log(s, "phase", null, `Mission Evaluation Phase.`);
  const evaluations: MissionEvaluation[] = [];
  s.missions.forEach((mission, missionIndex) => {
    if (!mission.revealed || s.phase !== "mission") return;
    const totals = missionTotals(s, ctx, missionIndex);
    const winner = projectedWinner(s, totals, FORMAT.minPowerToWin);
    const card = cardOf(s, ctx, mission.instanceId);
    const points = card.points + RANK_BONUS[mission.rank];
    const edgeTiebreak = winner !== null && totals[0] === totals[1];
    evaluations.push({ missionIndex, rank: mission.rank, totals, winner, points: winner === null ? 0 : points, edgeTiebreak });

    if (winner === null) {
      log(s, "score", null, `Mission ${mission.rank} (${card.name}): ${totals[0]}–${totals[1]}, nobody has ${FORMAT.minPowerToWin}+ Power — no winner.`, card.id);
      return;
    }
    s.players[winner].score += points;
    mission.wins[winner]++;
    const how = edgeTiebreak ? " (tie broken by the Edge)" : "";
    log(s, "score", winner, `Mission ${mission.rank} (${card.name}): ${totals[0]}–${totals[1]} — ${s.players[winner].name} wins${how} and scores ${points}.`, card.id);

    const base = { controller: winner, missionIndex };
    for (const t of triggersOf(card, "SCORE")) {
      resolveSteps(s, ctx, t.steps, { ...base, sourceName: card.name, sourceCardId: card.id, selfId: null });
    }
    for (const id of [...mission.characters[winner]]) {
      const i = s.instances[id];
      if (i.zone !== "mission" || i.faceDown) continue;
      const c = cardOf(s, ctx, id);
      for (const t of triggersOf(c, "SCORE")) {
        resolveSteps(s, ctx, t.steps, { ...base, sourceName: fullName(c), sourceCardId: c.id, selfId: id });
      }
    }
  });
  s.lastEvaluation = evaluations;
}

function enterEnd(s: GameState): void {
  s.phase = "end";
  log(s, "phase", null, `End Phase.`);
  for (const p of PLAYER_IDS) {
    const pl = s.players[p];
    if (pl.chakra > 0) log(s, "chakra", p, `${pl.name} loses ${pl.chakra} unspent Chakra.`);
    pl.chakra = 0;
    pl.chakraSpent = 0;
  }
  let tokens = 0;
  for (const i of Object.values(s.instances)) {
    tokens += i.powerTokens;
    i.powerTokens = 0;
  }
  if (tokens > 0) log(s, "token", null, `${tokens} Power token${tokens === 1 ? "" : "s"} removed.`);
  s.modifiers = [];
}

function finishGame(s: GameState): void {
  const [a, b] = [s.players[0].score, s.players[1].score];
  const winner: PlayerId = a > b ? 0 : b > a ? 1 : s.edge;
  s.result = { winner, scores: [a, b], reason: a === b ? "edge-tiebreak" : "points" };
  s.phase = "gameover";
  const how = a === b ? ` — tied, ${s.players[winner].name} holds the Edge` : "";
  log(s, "gameover", winner, `Game over: ${s.players[winner].name} wins ${Math.max(a, b)}–${Math.min(a, b)}${how}.`);
}

/** After a non-pass action the turn alternates unless the opponent has already passed. */
function endTurn(s: GameState, p: PlayerId): void {
  if (s.phase !== "action") return;
  const o = other(p);
  s.activePlayer = s.players[o].passed ? p : o;
}

function trigger(s: GameState, ctx: EngineContext, id: string, which: Trigger, missionIndex: number | null, selfId: string | null): void {
  const card = cardOf(s, ctx, id);
  for (const t of triggersOf(card, which)) {
    const ec: EffectContext = {
      controller: s.instances[id].owner,
      sourceName: fullName(card),
      sourceCardId: card.id,
      selfId,
      missionIndex,
    };
    resolveSteps(s, ctx, t.steps, ec);
  }
}

function placeOnMission(s: GameState, id: string, missionIndex: number, faceDown: boolean): void {
  const i = inst(s, id);
  const pl = s.players[i.owner];
  pl.hand = pl.hand.filter((h) => h !== id);
  i.zone = "mission";
  i.missionIndex = missionIndex;
  i.faceDown = faceDown;
  i.enteredAtSeq = s.seq;
  i.revealedAtSeq = null;
  s.missions[missionIndex].characters[i.owner].push(id);
}

function reduce(s: GameState, a: GameAction, ctx: EngineContext): void {
  s.seq++;

  if (a.type === "ADVANCE") {
    if (s.phase === "start") enterAction(s);
    else if (s.phase === "mission") enterEnd(s);
    else if (s.phase === "end") {
      if (s.round >= FORMAT.rounds) finishGame(s);
      else {
        s.round++;
        enterStart(s, ctx);
      }
    }
    return;
  }

  if (a.type === "CONCEDE") {
    const winner = other(a.player);
    s.result = { winner, scores: [s.players[0].score, s.players[1].score], reason: "concede" };
    s.phase = "gameover";
    log(s, "gameover", a.player, `${s.players[a.player].name} concedes. ${s.players[winner].name} wins.`);
    return;
  }

  const p = a.player;
  const pl = s.players[p];

  switch (a.type) {
    case "MULLIGAN": {
      pl.mulliganDecided = true;
      if (a.mulligan) {
        const holder = { rng: s.rng };
        for (const id of pl.hand) inst(s, id).zone = "deck";
        pl.deck = shuffle(holder, [...pl.deck, ...pl.hand]);
        pl.hand = [];
        s.rng = holder.rng;
        pl.mulliganed = true;
        log(s, "mulligan", p, `${pl.name} mulligans.`);
        drawCards(s, p, FORMAT.openingHand, "mulligan");
      } else {
        log(s, "mulligan", p, `${pl.name} keeps their opening hand.`);
      }
      const o = other(p);
      if (!s.players[o].mulliganDecided) s.activePlayer = o;
      else enterStart(s, ctx);
      return;
    }

    case "PLAY_CHARACTER": {
      const card = cardOf(s, ctx, a.handId);
      const rank = MISSION_RANKS[a.missionIndex];
      if (a.hidden) {
        spend(s, p, FORMAT.hiddenCost);
        placeOnMission(s, a.handId, a.missionIndex, true);
        log(s, "hidden", p, `${pl.name} plays a character Hidden in Mission ${rank} (${FORMAT.hiddenCost} Chakra).`);
      } else {
        spend(s, p, card.cost);
        placeOnMission(s, a.handId, a.missionIndex, false);
        log(s, "play", p, `${pl.name} plays ${fullName(card)} in Mission ${rank} (${card.cost} Chakra).`, card.id);
        trigger(s, ctx, a.handId, "MAIN", a.missionIndex, a.handId);
      }
      endTurn(s, p);
      return;
    }

    case "REVEAL": {
      const i = inst(s, a.instanceId);
      const card = cardOf(s, ctx, a.instanceId);
      spend(s, p, card.cost);
      i.faceDown = false;
      i.revealedAtSeq = s.seq;
      log(s, "reveal", p, `${pl.name} reveals ${fullName(card)} in Mission ${MISSION_RANKS[i.missionIndex!]} (${card.cost} Chakra) — AMBUSH!`, card.id);
      trigger(s, ctx, i.id, "MAIN", i.missionIndex, i.id);
      if (i.zone === "mission") trigger(s, ctx, i.id, "AMBUSH", i.missionIndex, i.id);
      endTurn(s, p);
      return;
    }

    case "EVOLVE": {
      const target = inst(s, a.targetId);
      const from = cardOf(s, ctx, a.targetId);
      const to = cardOf(s, ctx, a.handId);
      const missionIndex = target.missionIndex!;
      const diff = to.cost - from.cost;
      spend(s, p, diff);
      const next = inst(s, a.handId);
      pl.hand = pl.hand.filter((h) => h !== a.handId);
      next.zone = "mission";
      next.missionIndex = missionIndex;
      next.faceDown = false;
      next.stack = [...target.stack, target.id];
      next.powerTokens = target.powerTokens;
      next.attachments = target.attachments;
      next.enteredAtSeq = target.enteredAtSeq;
      next.revealedAtSeq = null;
      for (const att of next.attachments) inst(s, att).attachedTo = next.id;
      for (const m of s.modifiers) if (m.targetId === target.id) m.targetId = next.id;
      target.zone = "stack";
      target.missionIndex = null;
      target.powerTokens = 0;
      target.attachments = [];
      target.stack = [];
      const row = s.missions[missionIndex].characters[p];
      row[row.indexOf(target.id)] = next.id;
      log(s, "evolve", p, `${pl.name} evolves ${fullName(from)} into ${fullName(to)} (${diff} Chakra).`, to.id);
      trigger(s, ctx, next.id, "MAIN", missionIndex, next.id);
      if (next.zone === "mission") trigger(s, ctx, next.id, "UPGRADE", missionIndex, next.id);
      endTurn(s, p);
      return;
    }

    case "PLAY_JUTSU": {
      const card = cardOf(s, ctx, a.handId);
      spend(s, p, card.cost);
      pl.hand = pl.hand.filter((h) => h !== a.handId);
      inst(s, a.handId).zone = "discard";
      pl.discard.push(a.handId);
      log(s, "jutsu", p, `${pl.name} casts ${fullName(card)} on Mission ${MISSION_RANKS[a.missionIndex]} (${card.cost} Chakra).`, card.id);
      trigger(s, ctx, a.handId, "MAIN", a.missionIndex, null);
      endTurn(s, p);
      return;
    }

    case "ATTACH_ITEM": {
      const card = cardOf(s, ctx, a.handId);
      const target = inst(s, a.targetId);
      spend(s, p, card.cost);
      pl.hand = pl.hand.filter((h) => h !== a.handId);
      const item = inst(s, a.handId);
      item.zone = "attached";
      item.attachedTo = target.id;
      target.attachments.push(item.id);
      log(s, "item", p, `${pl.name} equips ${fullName(card)} to ${nameOf(s, ctx, target.id)} (${card.cost} Chakra).`, card.id);
      trigger(s, ctx, item.id, "MAIN", target.missionIndex, target.id);
      endTurn(s, p);
      return;
    }

    case "LEADER_TECHNIQUE": {
      const leaderCard = cardOf(s, ctx, pl.leader!);
      const technique = getAbilities(leaderCard).technique!;
      spend(s, p, technique.cost);
      pl.techniqueUsed = true;
      log(s, "technique", p, `${pl.name}'s Leader ${fullName(leaderCard)} uses a Technique on Mission ${MISSION_RANKS[a.missionIndex]} (${technique.cost} Chakra).`, leaderCard.id);
      resolveSteps(s, ctx, technique.steps, {
        controller: p,
        sourceName: fullName(leaderCard),
        sourceCardId: leaderCard.id,
        selfId: null,
        missionIndex: a.missionIndex,
      });
      endTurn(s, p);
      return;
    }

    case "ADD_POWER_TOKEN": {
      spend(s, p, FORMAT.powerTokenCost);
      const target = inst(s, a.targetId);
      target.powerTokens += 1;
      log(s, "token", p, `${pl.name} adds a Power token to ${nameOf(s, ctx, target.id)} (${FORMAT.powerTokenCost} Chakra).`, target.cardId);
      endTurn(s, p);
      return;
    }

    case "DRAW_CARD": {
      spend(s, p, FORMAT.drawCardCost);
      drawCards(s, p, 1, `Draw Card, ${FORMAT.drawCardCost} Chakra`);
      endTurn(s, p);
      return;
    }

    case "PASS": {
      pl.passed = true;
      const o = other(p);
      if (!s.players[o].passed) {
        if (s.edge !== p) {
          s.edge = p;
          log(s, "pass", p, `${pl.name} passes first and takes the Edge token.`);
        } else {
          log(s, "pass", p, `${pl.name} passes first and keeps the Edge token.`);
        }
        s.activePlayer = o;
      } else {
        log(s, "pass", p, `${pl.name} passes.`);
        enterMission(s, ctx);
      }
      return;
    }
  }
}

/** Validates and applies an action, returning the next immutable state. */
export function applyAction(state: GameState, action: GameAction, ctx: EngineContext): GameState {
  const error = validateAction(state, ctx, action);
  if (error) throw new IllegalActionError(error);
  return produce(state, (draft: GameState) => {
    reduce(draft, action, ctx);
  });
}

/** Applies an action that is already known to be legal (AI search). */
export function applyUnchecked(state: GameState, action: GameAction, ctx: EngineContext): GameState {
  return produce(state, (draft: GameState) => {
    reduce(draft, action, ctx);
  });
}
