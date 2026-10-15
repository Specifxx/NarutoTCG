import {
  RANK_BONUS,
  RANK_ORDER,
  otherSide,
  type ActionResult,
  type CardCatalog,
  type CardDef,
  type CardEffect,
  type EffectTrigger,
  type GameAction,
  type GameEvent,
  type GameSetup,
  type GameState,
  type MissionOutcome,
  type MissionState,
  type RoundEvaluation,
  type Side,
  type UnitState,
} from "./types";

/* ------------------------------------------------------------------ */
/* Setup and lookups                                                    */
/* ------------------------------------------------------------------ */

export function createGame(setup: GameSetup): GameState {
  let uid = 1;
  const missions: MissionState[] = setup.missions.map((m) => ({
    def: m.def,
    units: (m.units ?? []).map((u) => ({
      uid: `u${uid++}`,
      side: u.side,
      stack: [...u.stack],
      hidden: Boolean(u.hidden),
      powerTokens: u.powerTokens ?? 0,
    })),
  }));
  const passed = { you: Boolean(setup.passed?.you), opp: Boolean(setup.passed?.opp) };
  let active = setup.active ?? setup.edge;
  if (passed[active] && !passed[otherSide(active)]) active = otherSide(active);
  return {
    round: setup.round,
    missions,
    chakra: { ...setup.chakra },
    hands: { you: [...setup.hands.you], opp: [...setup.hands.opp] },
    edge: setup.edge,
    passed,
    active,
    score: { ...setup.score },
    playsThisRound: { you: 0, opp: 0 },
    nextUid: uid,
  };
}

export function getCard(catalog: CardCatalog, id: string): CardDef {
  const card = catalog[id];
  if (!card) throw new Error(`Unknown card id "${id}"`);
  return card;
}

/** The character's identity: the top card of its stack. */
export function topCard(unit: UnitState, catalog: CardCatalog): CardDef {
  return getCard(catalog, unit.stack[unit.stack.length - 1]!);
}

export function findUnit(state: GameState, uid: string): { mission: MissionState; unit: UnitState } | null {
  for (const mission of state.missions) {
    const unit = mission.units.find((u) => u.uid === uid);
    if (unit) return { mission, unit };
  }
  return null;
}

export function findMission(state: GameState, missionId: string): MissionState | null {
  return state.missions.find((m) => m.def.id === missionId) ?? null;
}

export const bothPassed = (state: GameState) => state.passed.you && state.passed.opp;

/* ------------------------------------------------------------------ */
/* Power                                                               */
/* ------------------------------------------------------------------ */

/**
 * Current Power of a character. Hidden characters have 0 printed Power but keep
 * any Power tokens. Continuous effects only apply while face-up.
 */
export function unitPower(unit: UnitState, mission: MissionState, catalog: CardCatalog): number {
  if (unit.hidden) return unit.powerTokens;
  const card = topCard(unit, catalog);
  let power = card.power + unit.powerTokens;
  for (const effect of card.effects) {
    if (effect.trigger === "CONTINUOUS" && effect.spec.kind === "power-per-friendly-here") {
      const others = mission.units.filter((u) => u.side === unit.side && u.uid !== unit.uid).length;
      power += effect.spec.amount * others;
    }
  }
  return Math.max(0, power);
}

export function sidePower(mission: MissionState, side: Side, catalog: CardCatalog): number {
  return mission.units
    .filter((u) => u.side === side)
    .reduce((sum, u) => sum + unitPower(u, mission, catalog), 0);
}

/** Start-phase Chakra: base 5, +1 per character in play (hidden included), plus CHAKRA +X. */
export function startPhaseChakra(
  characters: ReadonlyArray<{ hidden?: boolean; chakraBonus?: number }>,
  base = 5,
): number {
  return characters.reduce((sum, c) => sum + 1 + (c.hidden ? 0 : (c.chakraBonus ?? 0)), base);
}

/* ------------------------------------------------------------------ */
/* Legality                                                            */
/* ------------------------------------------------------------------ */

function cloneState(s: GameState): GameState {
  return {
    ...s,
    missions: s.missions.map((m) => ({ def: m.def, units: m.units.map((u) => ({ ...u, stack: [...u.stack] })) })),
    chakra: { ...s.chakra },
    hands: { you: [...s.hands.you], opp: [...s.hands.opp] },
    passed: { ...s.passed },
    score: { ...s.score },
    playsThisRound: { ...s.playsThisRound },
  };
}

/** Chakra an action costs, or null if it cannot be priced. */
export function actionCost(state: GameState, action: GameAction, catalog: CardCatalog): number | null {
  switch (action.type) {
    case "play":
      return action.hidden ? 1 : (catalog[action.cardId]?.cost ?? null);
    case "reveal": {
      const found = findUnit(state, action.uid);
      return found ? topCard(found.unit, catalog).cost : null;
    }
    case "upgrade": {
      const found = findUnit(state, action.uid);
      const next = catalog[action.cardId];
      return found && next ? next.cost - topCard(found.unit, catalog).cost : null;
    }
    case "pass":
      return 0;
  }
}

/** Returns why an action is illegal, or null when it is legal. */
export function checkAction(state: GameState, action: GameAction, catalog: CardCatalog): string | null {
  const { side } = action;
  if (bothPassed(state)) return "The Action phase is over.";
  if (state.passed[side]) return "You already passed this Round.";
  if (state.active !== side) return "It is not your turn.";
  if (action.type === "pass") return null;

  if (action.type === "play") {
    if (!state.hands[side].includes(action.cardId)) return "That card is not in your hand.";
    const card = catalog[action.cardId];
    if (!card) return "Unknown card.";
    const mission = findMission(state, action.missionId);
    if (!mission) return "Unknown mission.";
    const clash = mission.units.find((u) => u.side === side && topCard(u, catalog).name === card.name);
    if (clash) {
      const canUpgrade = !clash.hidden && card.cost > topCard(clash, catalog).cost;
      return canUpgrade
        ? `You already have ${card.name} on this mission. Upgrade it instead.`
        : `You already have ${card.name} on this mission (one character per name on your side).`;
    }
    const cost = action.hidden ? 1 : card.cost;
    if (state.chakra[side] < cost) return `Not enough Chakra (needs ${cost}).`;
    return null;
  }

  const found = findUnit(state, action.uid);
  if (!found || found.unit.side !== side) return "Choose one of your own characters.";
  const current = topCard(found.unit, catalog);

  if (action.type === "reveal") {
    if (!found.unit.hidden) return "That character is already face-up.";
    if (state.chakra[side] < current.cost) return `Not enough Chakra to reveal (needs ${current.cost}).`;
    return null;
  }

  // upgrade
  if (!state.hands[side].includes(action.cardId)) return "That card is not in your hand.";
  const next = catalog[action.cardId];
  if (!next) return "Unknown card.";
  if (found.unit.hidden) return "Reveal a hidden character before upgrading it.";
  if (next.name !== current.name) return "An upgrade must share the character's name.";
  if (next.cost <= current.cost) return "An upgrade must have a higher Chakra cost.";
  const cost = next.cost - current.cost;
  if (state.chakra[side] < cost) return `Not enough Chakra to upgrade (needs ${cost}).`;
  return null;
}

/** Every legal action for `side` right now (pass included while it is their turn). */
export function getLegalActions(state: GameState, catalog: CardCatalog, side: Side = state.active): GameAction[] {
  if (bothPassed(state) || state.passed[side] || state.active !== side) return [];
  const actions: GameAction[] = [];
  const handIds = [...new Set(state.hands[side])];
  for (const cardId of handIds) {
    for (const mission of state.missions) {
      for (const hidden of [false, true]) {
        const a: GameAction = { type: "play", side, cardId, missionId: mission.def.id, hidden };
        if (checkAction(state, a, catalog) === null) actions.push(a);
      }
    }
  }
  for (const mission of state.missions) {
    for (const unit of mission.units) {
      if (unit.side !== side) continue;
      if (unit.hidden) {
        const a: GameAction = { type: "reveal", side, uid: unit.uid };
        if (checkAction(state, a, catalog) === null) actions.push(a);
      } else {
        for (const cardId of handIds) {
          const a: GameAction = { type: "upgrade", side, cardId, uid: unit.uid };
          if (checkAction(state, a, catalog) === null) actions.push(a);
        }
      }
    }
  }
  actions.push({ type: "pass", side });
  return actions;
}

/* ------------------------------------------------------------------ */
/* Applying actions                                                    */
/* ------------------------------------------------------------------ */

function removeFromHand(state: GameState, side: Side, cardId: string) {
  const i = state.hands[side].indexOf(cardId);
  if (i >= 0) state.hands[side].splice(i, 1);
}

function strongest(
  candidates: UnitState[],
  mission: MissionState,
  catalog: CardCatalog,
): UnitState | undefined {
  // Highest Power wins; on equal Power the most recently played character is chosen.
  let best: UnitState | undefined;
  let bestPower = -1;
  for (const u of candidates) {
    const p = unitPower(u, mission, catalog);
    if (p >= bestPower) {
      best = u;
      bestPower = p;
    }
  }
  return best;
}

function resolveEffects(
  state: GameState,
  unit: UnitState,
  mission: MissionState,
  card: CardDef,
  triggers: ReadonlySet<EffectTrigger>,
  catalog: CardCatalog,
  events: GameEvent[],
) {
  for (const effect of card.effects) {
    if (!triggers.has(effect.trigger)) continue;
    applyEffect(state, unit, mission, effect, catalog, events);
  }
}

function applyEffect(
  _state: GameState,
  unit: UnitState,
  mission: MissionState,
  effect: CardEffect,
  catalog: CardCatalog,
  events: GameEvent[],
) {
  const { spec } = effect;
  events.push({ type: "effect", side: unit.side, uid: unit.uid, trigger: effect.trigger, text: effect.text });
  switch (spec.kind) {
    case "powerup": {
      const targets =
        spec.target === "self"
          ? [unit]
          : mission.units.filter(
              (u) => u.side === unit.side && (spec.target === "all-friendlies-here" || u.uid !== unit.uid),
            );
      if (targets.length === 0) events.push({ type: "fizzled", uid: unit.uid, text: effect.text });
      for (const t of targets) {
        t.powerTokens += spec.amount;
        events.push({ type: "powerup", uid: t.uid, amount: spec.amount });
      }
      return;
    }
    case "defeat-enemy": {
      const target = strongest(
        mission.units.filter((u) => u.side !== unit.side && unitPower(u, mission, catalog) <= spec.maxPower),
        mission,
        catalog,
      );
      if (!target) {
        events.push({ type: "fizzled", uid: unit.uid, text: effect.text });
        return;
      }
      mission.units = mission.units.filter((u) => u.uid !== target.uid);
      events.push({ type: "defeated", uid: target.uid, cardId: target.stack[target.stack.length - 1]! });
      return;
    }
    case "hide-enemy": {
      const target = strongest(
        mission.units.filter(
          (u) => u.side !== unit.side && !u.hidden && unitPower(u, mission, catalog) <= spec.maxPower,
        ),
        mission,
        catalog,
      );
      if (!target) {
        events.push({ type: "fizzled", uid: unit.uid, text: effect.text });
        return;
      }
      target.hidden = true;
      events.push({ type: "hid", uid: target.uid, cardId: target.stack[target.stack.length - 1]! });
      return;
    }
    case "gain-points":
    case "power-per-friendly-here":
      // Resolved during evaluation / power calculation, never on play.
      return;
  }
}

function endTurn(state: GameState, side: Side) {
  const other = otherSide(side);
  if (!state.passed[other]) state.active = other;
  else if (!state.passed[side]) state.active = side;
}

/** Applies an action immutably. Returns the next state and the events it produced. */
export function applyAction(state: GameState, action: GameAction, catalog: CardCatalog): ActionResult {
  const reason = checkAction(state, action, catalog);
  if (reason) return { ok: false, reason };
  const next = cloneState(state);
  const events: GameEvent[] = [];
  const { side } = action;

  switch (action.type) {
    case "pass": {
      const tookEdge = !next.passed[otherSide(side)];
      next.passed[side] = true;
      if (tookEdge) next.edge = side;
      events.push({ type: "passed", side, tookEdge });
      endTurn(next, side);
      return { ok: true, state: next, events };
    }
    case "play": {
      const card = getCard(catalog, action.cardId);
      const mission = findMission(next, action.missionId)!;
      const cost = action.hidden ? 1 : card.cost;
      const isFirst = next.playsThisRound[side] === 0;
      removeFromHand(next, side, action.cardId);
      next.chakra[side] -= cost;
      next.playsThisRound[side] += 1;
      const unit: UnitState = {
        uid: `u${next.nextUid++}`,
        side,
        stack: [action.cardId],
        hidden: action.hidden,
        powerTokens: 0,
      };
      mission.units.push(unit);
      events.push({
        type: "played",
        side,
        uid: unit.uid,
        cardId: card.id,
        missionId: mission.def.id,
        hidden: action.hidden,
        cost,
      });
      if (!action.hidden) {
        const triggers = new Set<EffectTrigger>(isFirst ? ["MAIN", "FIRST_STRIKE"] : ["MAIN"]);
        resolveEffects(next, unit, mission, card, triggers, catalog, events);
      }
      break;
    }
    case "reveal": {
      const { mission, unit } = findUnit(next, action.uid)!;
      const card = topCard(unit, catalog);
      const isFirst = next.playsThisRound[side] === 0;
      next.chakra[side] -= card.cost;
      next.playsThisRound[side] += 1;
      unit.hidden = false;
      events.push({ type: "revealed", side, uid: unit.uid, cardId: card.id, cost: card.cost });
      const triggers = new Set<EffectTrigger>(isFirst ? ["MAIN", "AMBUSH", "FIRST_STRIKE"] : ["MAIN", "AMBUSH"]);
      resolveEffects(next, unit, mission, card, triggers, catalog, events);
      break;
    }
    case "upgrade": {
      const { mission, unit } = findUnit(next, action.uid)!;
      const from = topCard(unit, catalog);
      const card = getCard(catalog, action.cardId);
      const cost = card.cost - from.cost;
      const isFirst = next.playsThisRound[side] === 0;
      removeFromHand(next, side, action.cardId);
      next.chakra[side] -= cost;
      next.playsThisRound[side] += 1;
      unit.stack.push(card.id);
      events.push({ type: "upgraded", side, uid: unit.uid, fromCardId: from.id, cardId: card.id, cost });
      const triggers = new Set<EffectTrigger>(
        isFirst ? ["MAIN", "UPGRADE", "FIRST_STRIKE"] : ["MAIN", "UPGRADE"],
      );
      resolveEffects(next, unit, mission, card, triggers, catalog, events);
      break;
    }
  }

  endTurn(next, side);
  return { ok: true, state: next, events };
}

/* ------------------------------------------------------------------ */
/* Scripted opponent                                                   */
/* ------------------------------------------------------------------ */

export type ScriptedAction =
  | { type: "play"; cardId: string; missionId: string; hidden: boolean }
  | { type: "reveal"; uid: string }
  | { type: "upgrade"; cardId: string; uid: string }
  | { type: "pass" };

/**
 * Plays the opponent's turns from a fixed script until it is your turn or both
 * players have passed. Each opponent turn uses the next script entry; if that
 * entry is missing or illegal, the opponent passes.
 */
export function autoplayOpponent(
  state: GameState,
  catalog: CardCatalog,
  script: readonly ScriptedAction[],
  cursor: number,
): { state: GameState; events: GameEvent[]; cursor: number } {
  let current = state;
  const events: GameEvent[] = [];
  let guard = 0;
  while (!bothPassed(current) && current.active === "opp" && !current.passed.opp && guard++ < 64) {
    const entry = script[cursor];
    let result: ActionResult | null = null;
    if (entry && entry.type !== "pass") {
      result = applyAction(current, { ...entry, side: "opp" } as GameAction, catalog);
      if (result.ok) cursor += 1;
    }
    if (!result || !result.ok) {
      result = applyAction(current, { type: "pass", side: "opp" }, catalog);
      cursor = script.length;
    }
    if (!result.ok) break;
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events, cursor };
}

/* ------------------------------------------------------------------ */
/* Mission evaluation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Scores every mission in rank order (D → C → B → A). The side with more Power
 * wins; ties go to the Edge holder; a side needs at least 1 Power to win.
 */
export function evaluateRound(state: GameState, catalog: CardCatalog): RoundEvaluation {
  const scoreAfter = { ...state.score };
  const ordered = [...state.missions].sort(
    (a, b) => RANK_ORDER.indexOf(a.def.rank) - RANK_ORDER.indexOf(b.def.rank),
  );
  const outcomes: MissionOutcome[] = ordered.map((mission) => {
    const power = { you: sidePower(mission, "you", catalog), opp: sidePower(mission, "opp", catalog) };
    let winner: Side | null;
    let reason: MissionOutcome["reason"];
    if (power.you !== power.opp) {
      winner = power.you > power.opp ? "you" : "opp";
      reason = "power";
    } else {
      winner = state.edge;
      reason = "edge-tiebreak";
    }
    if (power[winner] < 1) {
      winner = null;
      reason = "no-power";
    }
    let points = 0;
    const scoreEffects: string[] = [];
    if (winner) {
      points = mission.def.basePoints + RANK_BONUS[mission.def.rank];
      const sources: CardEffect[] = [];
      if (mission.def.scoreEffect) sources.push(mission.def.scoreEffect);
      for (const unit of mission.units) {
        if (unit.side !== winner || unit.hidden) continue;
        for (const effect of topCard(unit, catalog).effects) if (effect.trigger === "SCORE") sources.push(effect);
      }
      for (const effect of sources) {
        if (effect.spec.kind === "gain-points") points += effect.spec.amount;
        scoreEffects.push(effect.text);
      }
      scoreAfter[winner] += points;
    }
    return { missionId: mission.def.id, rank: mission.def.rank, power, winner, reason, points, scoreEffects };
  });
  const decidedByEdge = scoreAfter.you === scoreAfter.opp;
  const winner: Side = decidedByEdge ? state.edge : scoreAfter.you > scoreAfter.opp ? "you" : "opp";
  return { outcomes, scoreBefore: { ...state.score }, scoreAfter, winner, decidedByEdge };
}

/* ------------------------------------------------------------------ */
/* Descriptions                                                        */
/* ------------------------------------------------------------------ */

export function describeAction(state: GameState, action: GameAction, catalog: CardCatalog): string {
  const mine = action.side === "you";
  const who = mine ? "You" : "Opponent";
  const verb = (base: string) => (mine ? base : `${base}s`);
  switch (action.type) {
    case "pass":
      return `${who} ${mine ? "pass" : "passes"}`;
    case "play": {
      const card = getCard(catalog, action.cardId);
      const mission = findMission(state, action.missionId);
      const where = mission ? ` on ${mission.def.name}` : "";
      if (action.hidden) {
        // Never name an opponent's face-down card.
        return mine ? `You play ${card.name} hidden${where} (1 Chakra)` : `Opponent plays a face-down card${where} (1 Chakra)`;
      }
      return `${who} ${verb("play")} ${card.name}${where} (${card.cost} Chakra)`;
    }
    case "reveal": {
      const found = findUnit(state, action.uid);
      const card = found ? topCard(found.unit, catalog) : null;
      return card ? `${who} ${verb("reveal")} ${card.name} (${card.cost} Chakra)` : `${who} ${verb("reveal")} a hidden character`;
    }
    case "upgrade": {
      const found = findUnit(state, action.uid);
      const card = getCard(catalog, action.cardId);
      const cost = found ? card.cost - topCard(found.unit, catalog).cost : card.cost;
      return `${who} ${verb("upgrade")} to ${card.name} — ${card.title} (${cost} Chakra)`;
    }
  }
}
