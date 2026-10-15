import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRACTICE_CARDS, practiceMission } from "./cards";
import {
  applyAction,
  autoplayOpponent,
  createGame,
  evaluateRound,
  findUnit,
  getLegalActions,
  sidePower,
  startPhaseChakra,
  unitPower,
} from "./engine";
import type { GameSetup, GameState } from "./types";

const cards = PRACTICE_CARDS;

function setup(overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    round: 4,
    missions: [{ def: practiceMission("catch-tora", "D") }, { def: practiceMission("bridge-escort", "A") }],
    chakra: { you: 10, opp: 10 },
    hands: { you: ["kakashi-copy", "naruto-genin", "naruto-sage", "sakura-medic"], opp: [] },
    edge: "you",
    score: { you: 0, opp: 0 },
    ...overrides,
  };
}

function act(state: GameState, action: Parameters<typeof applyAction>[1]) {
  const result = applyAction(state, action, cards);
  assert.ok(result.ok, result.ok ? "" : result.reason);
  return result;
}

describe("chakra", () => {
  it("gains 5 base + 1 per character (hidden included) + CHAKRA +X", () => {
    assert.equal(startPhaseChakra([]), 5);
    assert.equal(startPhaseChakra([{}, { hidden: true }]), 7);
    assert.equal(startPhaseChakra([{ chakraBonus: 1 }, {}]), 8);
  });
});

describe("playing characters", () => {
  it("hidden play costs 1 and has 0 Power", () => {
    const game = createGame(setup({ passed: { opp: true } }));
    const { state, events } = act(game, { type: "play", side: "you", cardId: "kakashi-copy", missionId: "catch-tora", hidden: true });
    assert.equal(state.chakra.you, 9);
    const mission = state.missions[0]!;
    assert.equal(sidePower(mission, "you", cards), 0);
    assert.ok(!events.some((e) => e.type === "effect"), "hidden play must not trigger effects");
  });

  it("revealing pays the printed cost and triggers AMBUSH", () => {
    let state = createGame(setup({ passed: { opp: true } }));
    state = act(state, { type: "play", side: "you", cardId: "kakashi-copy", missionId: "catch-tora", hidden: true }).state;
    const uid = state.missions[0]!.units[0]!.uid;
    const { state: after, events } = act(state, { type: "reveal", side: "you", uid });
    assert.equal(after.chakra.you, 10 - 1 - 4);
    const found = findUnit(after, uid)!;
    assert.equal(unitPower(found.unit, found.mission, cards), 3 + 2);
    assert.ok(events.some((e) => e.type === "effect" && e.trigger === "AMBUSH"));
  });

  it("face-up play does not trigger AMBUSH", () => {
    const game = createGame(setup({ passed: { opp: true } }));
    const { state } = act(game, { type: "play", side: "you", cardId: "kakashi-copy", missionId: "catch-tora", hidden: false });
    assert.equal(sidePower(state.missions[0]!, "you", cards), 3);
  });

  it("forbids two same-name characters on one mission side", () => {
    let state = createGame(setup({ passed: { opp: true } }));
    state = act(state, { type: "play", side: "you", cardId: "naruto-genin", missionId: "catch-tora", hidden: false }).state;
    const result = applyAction(state, { type: "play", side: "you", cardId: "naruto-sage", missionId: "catch-tora", hidden: false }, cards);
    assert.equal(result.ok, false);
  });

  it("upgrade pays only the difference and keeps Power tokens", () => {
    let state = createGame(setup({ passed: { opp: true } }));
    state = act(state, { type: "play", side: "you", cardId: "naruto-genin", missionId: "catch-tora", hidden: false }).state;
    const uid = state.missions[0]!.units[0]!.uid;
    const { state: after } = act(state, { type: "upgrade", side: "you", cardId: "naruto-sage", uid });
    assert.equal(after.chakra.you, 10 - 2 - 3);
    const found = findUnit(after, uid)!;
    // printed 5 + 1 token from Genin MAIN + 2 from Sage UPGRADE + Sage has no MAIN
    assert.equal(unitPower(found.unit, found.mission, cards), 5 + 1 + 2);
  });

  it("Sakura powers up the friends already there", () => {
    let state = createGame(setup({ passed: { opp: true } }));
    state = act(state, { type: "play", side: "you", cardId: "naruto-genin", missionId: "catch-tora", hidden: false }).state;
    state = act(state, { type: "play", side: "you", cardId: "sakura-medic", missionId: "catch-tora", hidden: false }).state;
    // Naruto 2 + 1 (own MAIN) + 1 (Sakura) ; Sakura 1
    assert.equal(sidePower(state.missions[0]!, "you", cards), 5);
  });
});

describe("turn order and the Edge", () => {
  it("first player to pass takes the Edge, then the other plays successive turns", () => {
    let state = createGame(setup({ edge: "you", hands: { you: ["naruto-genin", "rock-lee"], opp: ["neji-gentle-fist"] } }));
    assert.equal(state.active, "you");
    state = act(state, { type: "play", side: "you", cardId: "naruto-genin", missionId: "catch-tora", hidden: false }).state;
    assert.equal(state.active, "opp");
    const pass = act(state, { type: "pass", side: "opp" });
    assert.equal(pass.state.edge, "opp");
    assert.ok(pass.events.some((e) => e.type === "passed" && e.tookEdge));
    state = pass.state;
    assert.equal(state.active, "you");
    state = act(state, { type: "play", side: "you", cardId: "rock-lee", missionId: "catch-tora", hidden: false }).state;
    assert.equal(state.active, "you", "you keep acting after the opponent passed");
    state = act(state, { type: "pass", side: "you" }).state;
    assert.equal(state.edge, "opp", "second passer does not take the Edge");
  });

  it("only offers pass once you are out of options", () => {
    const state = createGame(setup({ chakra: { you: 0, opp: 0 }, hands: { you: ["rock-lee"], opp: [] }, passed: { opp: true } }));
    assert.deepEqual(getLegalActions(state, cards), [{ type: "pass", side: "you" }]);
  });

  it("scripted opponent plays its script then passes", () => {
    const state = createGame(setup({ edge: "opp", hands: { you: [], opp: ["neji-gentle-fist"] } }));
    const run = autoplayOpponent(state, cards, [{ type: "play", cardId: "neji-gentle-fist", missionId: "catch-tora", hidden: false }], 0);
    assert.equal(run.state.active, "you");
    assert.equal(sidePower(run.state.missions[0]!, "opp", cards), 3);
  });
});

describe("mission evaluation", () => {
  it("scores in rank order, Edge breaks ties, and 0 Power cannot win", () => {
    const state = createGame({
      round: 4,
      missions: [
        { def: practiceMission("bridge-escort", "A"), units: [{ side: "you", stack: ["rock-lee"] }, { side: "opp", stack: ["kisame-shark"] }] },
        { def: practiceMission("catch-tora", "D"), units: [{ side: "opp", stack: ["kakashi-copy"], hidden: true }] },
      ],
      chakra: { you: 0, opp: 0 },
      hands: { you: [], opp: [] },
      edge: "you",
      passed: { you: true, opp: true },
      score: { you: 10, opp: 10 },
    });
    const evaluation = evaluateRound(state, cards);
    assert.deepEqual(evaluation.outcomes.map((o) => o.rank), ["D", "A"]);
    assert.equal(evaluation.outcomes[0]!.winner, null, "hidden-only side has 0 Power");
    assert.equal(evaluation.outcomes[1]!.reason, "edge-tiebreak");
    assert.equal(evaluation.outcomes[1]!.winner, "you");
    assert.equal(evaluation.outcomes[1]!.points, 2 + 4);
    assert.equal(evaluation.winner, "you");
  });

  it("final score ties go to the Edge holder", () => {
    const state = createGame({
      round: 4,
      missions: [{ def: practiceMission("catch-tora", "D") }],
      chakra: { you: 0, opp: 0 },
      hands: { you: [], opp: [] },
      edge: "opp",
      passed: { you: true, opp: true },
      score: { you: 12, opp: 12 },
    });
    const evaluation = evaluateRound(state, cards);
    assert.equal(evaluation.decidedByEdge, true);
    assert.equal(evaluation.winner, "opp");
  });

  it("SCORE effects add Mission points for face-up winners", () => {
    const state = createGame({
      round: 4,
      missions: [{ def: practiceMission("catch-tora", "D"), units: [{ side: "you", stack: ["orochimaru-sannin"] }] }],
      chakra: { you: 0, opp: 0 },
      hands: { you: [], opp: [] },
      edge: "opp",
      passed: { you: true, opp: true },
      score: { you: 0, opp: 0 },
    });
    assert.equal(evaluateRound(state, cards).outcomes[0]!.points, 1 + 1 + 1);
  });
});
