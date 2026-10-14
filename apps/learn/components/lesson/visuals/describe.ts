import type { StepVisual } from "@/content/schema";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import { RANK_BONUS, RANK_ORDER } from "@/lib/game/types";

const sideName = (side: "you" | "opp") => (side === "you" ? "You" : "Your opponent");

const ACTION_TEXT = {
  play: ["play a card face-up", "plays a card face-up"],
  hidden: ["play a card hidden", "plays a card hidden"],
  reveal: ["reveal a hidden card", "reveals a hidden card"],
  upgrade: ["upgrade a character", "upgrades a character"],
  pass: ["pass", "passes"],
} as const;

const PHASE_TEXT = {
  start: "Start phase: reveal the next mission, gain Chakra and draw 2 cards.",
  action: "Action phase: players alternate playing one card per turn, or pass.",
  mission: "Mission evaluation: every mission is scored from D to A; most Power wins and ties go to the Edge holder.",
  end: "End phase: leftover Chakra and all Power tokens are discarded.",
} as const;

/** Plain-language description of a step visual, for screen readers. */
export function describeVisual(visual: StepVisual): string {
  switch (visual.kind) {
    case "phase-track":
      return `Round phases in order: Start, Action, Mission evaluation, End. Highlighted: ${PHASE_TEXT[visual.active]}`;
    case "deck-stack":
      return `A deck of ${visual.deckSize} cards (at least 30 are required), ${visual.missions} Mission card${visual.missions === 1 ? "" : "s"} kept outside the deck${
        visual.hand > 0 ? `, and an opening hand of ${visual.hand} cards` : ""
      }.`;
    case "chakra-formula": {
      const total = visual.base + visual.characters + (visual.bonus ?? 0);
      return `Start-phase Chakra: ${visual.base} base plus ${visual.characters} for characters in play${
        visual.bonus !== undefined ? ` plus ${visual.bonus} from CHAKRA +X` : ""
      } equals ${total} Chakra.`;
    }
    case "card": {
      const card = PRACTICE_CARDS[visual.cardId];
      if (!card) return "A practice card.";
      const tokens = visual.tokens ?? 0;
      const name = `${card.name}, ${card.title} (cost ${card.cost}, Power ${card.power})`;
      const tokenText = tokens > 0 ? ` It carries ${tokens} Power token${tokens === 1 ? "" : "s"}.` : "";
      switch (visual.face ?? "up") {
        case "hidden":
          return `${name}, played hidden for 1 Chakra: it has 0 Power plus its tokens and no active effects.${tokenText}`;
        case "flip":
          return `${name}, shown flipping from hidden to revealed. Revealing costs its printed ${card.cost} Chakra and fires its MAIN and AMBUSH effects.${tokenText}`;
        default:
          return `${name}, played face-up for ${card.cost} Chakra.${tokenText}`;
      }
    }
    case "mission-ladder":
      return `Mission ranks, scored in this order: ${RANK_ORDER.map((r, i) => `${r}-rank (enters in Round ${i + 1}, +${RANK_BONUS[r]} points)`).join(", ")}.${
        visual.highlight ? ` Highlighted: the ${visual.highlight}-rank mission.` : ""
      }`;
    case "power-clash": {
      const { you, opp, edge } = visual;
      const prefix = visual.label ? `${visual.label}. ` : "";
      let verdict: string;
      if (you > opp) verdict = you >= 1 ? "You win with more Power." : "Nobody wins.";
      else if (opp > you) verdict = "Your opponent wins with more Power.";
      else if (you >= 1) verdict = `It's a tie, so the Edge holder (${edge === "you" ? "you" : "your opponent"}) wins.`;
      else verdict = "Neither side has any Power, so nobody wins.";
      const edgeNote = you !== opp ? ` ${sideName(edge)} ${edge === "you" ? "hold" : "holds"} the Edge, which only matters on a tie.` : "";
      return `${prefix}You have ${you} Power, your opponent has ${opp}. ${verdict}${edgeNote}`;
    }
    case "edge-token":
      return `${sideName(visual.holder)} ${visual.holder === "you" ? "hold" : "holds"} the Edge token: first turn, wins tied missions and wins a tied game.${
        visual.caption ? ` ${visual.caption}` : ""
      }`;
    case "upgrade-stack": {
      const from = PRACTICE_CARDS[visual.fromCardId];
      const to = PRACTICE_CARDS[visual.toCardId];
      if (!from || !to) return "An upgrade stack.";
      if (from.name !== to.name || to.cost <= from.cost)
        return `${to.name}, ${to.title} cannot upgrade ${from.name}, ${from.title}: an upgrade needs the same name and a higher cost.`;
      return `${to.name}, ${to.title} (cost ${to.cost}) is played on top of ${from.title} (cost ${from.cost}). You pay only the difference, ${
        to.cost - from.cost
      } Chakra; its MAIN and UPGRADE effects fire, Power tokens stay, and the stack is still one character.`;
    }
    case "turn-order": {
      const turns = visual.sequence.map((t, i) => `${i + 1}. ${t.side === "you" ? "You" : "Opponent"} ${ACTION_TEXT[t.action][t.side === "you" ? 0 : 1]}`).join("; ");
      const firstPass = visual.sequence.find((t) => t.action === "pass");
      return `Action phase turns: ${turns}.${firstPass ? ` ${sideName(firstPass.side)} passed first and ${firstPass.side === "you" ? "take" : "takes"} the Edge.` : ""}`;
    }
  }
}
