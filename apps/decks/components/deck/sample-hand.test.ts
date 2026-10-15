import { describe, expect, it } from "vitest";
import { cardsSeenByTurn } from "@/lib/probability/hypergeometric";
import { RULES } from "@/lib/rules";
import {
  canDrawNext,
  canMulligan,
  createSampleHand,
  freeMulligansLeft,
  handCards,
  hasTarget,
  mulliganTargetsFor,
  nextDrawTurn,
  sampleHandReducer,
  sampleHandStatus,
  type SampleHandAction,
  type SampleHandState,
} from "./sample-hand";

const DECK = Array.from({ length: RULES.mainDeckSize }, (_, i) => `card-${i % 13}`);
const TARGETS = ["card-0", "card-1"];

function run(state: SampleHandState, ...actions: SampleHandAction[]): SampleHandState {
  return actions.reduce(sampleHandReducer, state);
}

function sorted(cards: readonly string[]): string[] {
  return [...cards].sort();
}

describe("sample hand", () => {
  const fresh = createSampleHand({ deck: DECK, targets: TARGETS });

  it("starts empty, on the play, with nothing to mulligan or draw", () => {
    expect(fresh.onThePlay).toBe(true);
    expect(handCards(fresh)).toEqual([]);
    expect(canMulligan(fresh)).toBe(false);
    expect(canDrawNext(fresh)).toBe(false);
    expect(run(fresh, { type: "next" })).toBe(fresh);
    expect(run(fresh, { type: "mulligan", seed: 1 })).toBe(fresh);
  });

  it("deals an opening hand from the whole deck, deterministically per seed", () => {
    const a = run(fresh, { type: "draw", seed: 42 });
    const b = run(fresh, { type: "draw", seed: 42 });
    expect(a.opening).toHaveLength(RULES.openingHandSize);
    expect(a.library).toHaveLength(RULES.mainDeckSize - RULES.openingHandSize);
    expect(sorted([...a.opening, ...a.library])).toEqual(sorted(DECK));
    expect(a.opening).toEqual(b.opening);
    expect(a.tally).toEqual({ hands: 1, keepable: hasTarget(a.opening, TARGETS) ? 1 : 0 });
  });

  it("tallies keepable hands across draws and mulligans", () => {
    let state = fresh;
    let keepable = 0;
    for (let seed = 1; seed <= 30; seed++) {
      state = run(state, { type: "draw", seed });
      if (hasTarget(state.opening, TARGETS)) keepable++;
    }
    expect(state.tally).toEqual({ hands: 30, keepable });
    const mulled = run(state, { type: "mulligan", seed: 99 });
    expect(mulled.tally.hands).toBe(31);
    expect(run(mulled, { type: "resetTally" }).tally).toEqual({ hands: 0, keepable: 0 });
  });

  it("allows only the free mulligans, and only before drawing", () => {
    const dealt = run(fresh, { type: "draw", seed: 7 });
    expect(freeMulligansLeft(dealt)).toBe(RULES.freeMulligans);
    expect(canMulligan(dealt)).toBe(true);
    let state = dealt;
    for (let i = 0; i < RULES.freeMulligans; i++) state = run(state, { type: "mulligan", seed: 100 + i });
    expect(state.mulligansUsed).toBe(RULES.freeMulligans);
    expect(state.opening).toHaveLength(RULES.openingHandSize);
    expect(freeMulligansLeft(state)).toBe(0);
    expect(run(state, { type: "mulligan", seed: 5 })).toBe(state);

    const drawn = run(dealt, { type: "next" });
    expect(canMulligan(drawn)).toBe(false);
    expect(run(drawn, { type: "mulligan", seed: 5 })).toBe(drawn);

    // A new opening hand starts a new game with the mulligans back.
    expect(run(state, { type: "draw", seed: 8 }).mulligansUsed).toBe(0);
  });

  it("skips the turn-1 draw on the play and matches cardsSeenByTurn every turn", () => {
    let state = run(fresh, { type: "draw", seed: 3 });
    expect(nextDrawTurn(state)).toBe(RULES.firstPlayerSkipsDraw ? 2 : 1);
    const top = state.library.slice(0, 3);
    for (let i = 0; i < 3; i++) {
      state = run(state, { type: "next" });
      expect(handCards(state)).toHaveLength(cardsSeenByTurn(state.turn, { onThePlay: true }));
    }
    expect(state.draws.map((draw) => draw.cardId)).toEqual(top);
    expect(state.draws.map((draw) => draw.turn)).toEqual(RULES.firstPlayerSkipsDraw ? [2, 3, 4] : [1, 2, 3]);
  });

  it("draws on turn 1 when on the draw", () => {
    let state = run(createSampleHand({ deck: DECK, targets: TARGETS, onThePlay: false }), { type: "draw", seed: 3 });
    expect(nextDrawTurn(state)).toBe(1);
    state = run(state, { type: "next" }, { type: "next" });
    expect(state.turn).toBe(2);
    expect(handCards(state)).toHaveLength(cardsSeenByTurn(2, { onThePlay: false }));
  });

  it("rewinds to the opening hand when switching play/draw, replaying the same draws", () => {
    const dealt = run(fresh, { type: "draw", seed: 11 });
    const drawn = run(dealt, { type: "next" }, { type: "next" });
    const switched = run(drawn, { type: "setOnThePlay", onThePlay: false });
    expect(switched.turn).toBe(0);
    expect(switched.opening).toEqual(dealt.opening);
    expect(switched.library).toEqual(dealt.library);
    expect(run(switched, { type: "next" }).draws).toEqual([{ cardId: dealt.library[0], turn: 1 }]);
    expect(run(switched, { type: "setOnThePlay", onThePlay: false })).toBe(switched);
  });

  it("stops drawing when the library runs out", () => {
    const tiny = createSampleHand({ deck: DECK.slice(0, RULES.openingHandSize + 1), targets: TARGETS, onThePlay: false });
    const state = run(tiny, { type: "draw", seed: 1 }, { type: "next" });
    expect(state.library).toEqual([]);
    expect(canDrawNext(state)).toBe(false);
    expect(run(state, { type: "next" })).toBe(state);
  });
});

describe("sampleHandStatus", () => {
  const list = (hand: readonly string[]) => hand.join(", ");
  const dealt = run(createSampleHand({ deck: DECK, targets: TARGETS }), { type: "draw", seed: 7 });

  it("is empty before the first hand and describes the opening hand with the turn order", () => {
    expect(sampleHandStatus(createSampleHand({ deck: DECK, targets: TARGETS }), "", list)).toBe("");
    expect(sampleHandStatus(dealt, "", list)).toBe(`Opening hand, on the play: ${dealt.opening.join(", ")}`);
    const mulled = run(dealt, { type: "mulligan", seed: 8 });
    expect(sampleHandStatus(mulled, "", list)).toBe(`Opening hand after mulligan, on the play: ${mulled.opening.join(", ")}`);
  });

  it("announces the latest draw while draws are on the table", () => {
    const drawn = run(dealt, { type: "next" });
    expect(sampleHandStatus(drawn, "Turn 2 draw: X.", list)).toBe("Turn 2 draw: X.");
  });

  it("drops a draw announcement the turn-order switch undid, and names the new order", () => {
    const drawn = run(dealt, { type: "next" }, { type: "next" });
    const rewound = run(drawn, { type: "setOnThePlay", onThePlay: false });
    const status = sampleHandStatus(rewound, "Turn 3 draw: X.", list);
    expect(status).toBe(`Opening hand, on the draw: ${dealt.opening.join(", ")}`);
    // Switching back changes the text again, so each switch is announced.
    const back = run(rewound, { type: "setOnThePlay", onThePlay: true });
    expect(sampleHandStatus(back, "Turn 3 draw: X.", list)).not.toBe(status);
    // The next draw is announced again.
    expect(sampleHandStatus(run(rewound, { type: "next" }), "Turn 1 draw: X.", list)).toBe("Turn 1 draw: X.");
  });
});

describe("mulliganTargetsFor", () => {
  const list = { leaderId: "L", cards: [{ cardId: "a", quantity: 4 }, { cardId: "b", quantity: 2 }, { cardId: "z", quantity: 0 }] };

  it("keeps the archetype's targets the list runs", () => {
    expect(mulliganTargetsFor(list, ["a", "c", "a"], ["b"])).toEqual({ cardIds: ["a"], source: "archetype" });
  });

  it("falls back to key cards, then to nothing", () => {
    expect(mulliganTargetsFor(list, ["c", "z"], ["b", "L"])).toEqual({ cardIds: ["b"], source: "key-cards" });
    expect(mulliganTargetsFor(list, [], ["L"])).toEqual({ cardIds: [], source: "none" });
  });
});
