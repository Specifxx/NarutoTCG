import type { FxPalette } from "@/lib/accents";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import { startPhaseChakra } from "@/lib/game/engine";
import type { CardDef } from "@/lib/game/types";

/**
 * Scenario for the Chakra Charger: the Start phase of Round 3. Three of your
 * characters are already in play (one of them hidden), so your income is
 * 5 base + 1 per character + CHAKRA +X bonuses.
 */

export const BASE_CHAKRA = 5;
export const HIDDEN_COST = 1;
export const ROUND = 3;
/** Particle orbs that fly per point of Chakra while charging. */
export const ORBS_PER_POINT = 3;

export type TermKind = "base" | "character" | "hidden" | "bonus";

export interface ChargeTerm {
  key: string;
  kind: TermKind;
  amount: number;
  /** Short label under the number in the formula. */
  label: string;
}

export interface ChakraSource {
  id: string;
  /** The Kage Seal (base income) or a character on the board. */
  kind: "seal" | "unit";
  card?: CardDef;
  hidden?: boolean;
  /** Name used in announcements and labels. */
  name: string;
  /** One-line explanation revealed once charged. */
  why: string;
  terms: ChargeTerm[];
}

export const TERM_STYLES: Record<TermKind, { box: string; text: string; label: string; chip: string; palette: FxPalette; flash: string }> =
  {
    base: {
      box: "border-energy-300/50 bg-gradient-to-b from-energy-400/25 to-energy-900/60 shadow-[0_0_18px_-6px_rgba(56,196,255,0.8)]",
      text: "text-energy-200",
      label: "text-energy-300",
      chip: "border-energy-400/40 bg-energy-500/15 text-energy-200",
      palette: "energy",
      flash: "rgba(56,196,255,0.75)",
    },
    character: {
      box: "border-leaf-300/50 bg-gradient-to-b from-leaf-400/20 to-leaf-600/25 shadow-[0_0_18px_-6px_rgba(74,222,128,0.7)]",
      text: "text-leaf-300",
      label: "text-leaf-300",
      chip: "border-leaf-400/40 bg-leaf-500/15 text-leaf-300",
      palette: "leaf",
      flash: "rgba(74,222,128,0.7)",
    },
    hidden: {
      box: "border-mist-300/50 bg-gradient-to-b from-mist-400/25 to-mist-900/60 shadow-[0_0_18px_-6px_rgba(139,92,246,0.85)]",
      text: "text-mist-200",
      label: "text-mist-300",
      chip: "border-mist-400/40 bg-mist-500/15 text-mist-200",
      palette: "mist",
      flash: "rgba(167,139,250,0.75)",
    },
    bonus: {
      box: "border-gold-300/50 bg-gradient-to-b from-gold-400/25 to-gold-600/25 shadow-[0_0_18px_-6px_rgba(245,197,66,0.8)]",
      text: "text-gold-200",
      label: "text-gold-300",
      chip: "border-gold-400/40 bg-gold-400/15 text-gold-200",
      palette: "gold",
      flash: "rgba(245,197,66,0.75)",
    },
  };

export function practiceCard(id: string): CardDef {
  const card = PRACTICE_CARDS[id];
  if (!card) throw new Error(`Unknown practice card "${id}"`);
  return card;
}

/** Your characters in play at the start of Round 3. */
export const BOARD: ReadonlyArray<{ card: CardDef; hidden: boolean }> = [
  { card: practiceCard("naruto-genin"), hidden: false },
  { card: practiceCard("hinata-byakugan"), hidden: true },
  { card: practiceCard("choji-akimichi"), hidden: false },
];

const boardCharacters = BOARD.map((b) => ({ hidden: b.hidden, chakraBonus: b.card.chakraBonus }));

/** Total Start-phase Chakra, straight from the engine's formula. */
export const TOTAL_CHAKRA = startPhaseChakra(boardCharacters, BASE_CHAKRA);

function unitSource(unit: { card: CardDef; hidden: boolean }, index: number): ChakraSource {
  const id = `unit-${index}`;
  const { card, hidden } = unit;
  const terms: ChargeTerm[] = [
    hidden
      ? { key: `${id}:hidden`, kind: "hidden", amount: 1, label: "hidden character" }
      : { key: `${id}:character`, kind: "character", amount: 1, label: "character" },
  ];
  // Hidden characters have no active effects, so a CHAKRA +X bonus waits until revealed.
  if (!hidden && card.chakraBonus) {
    terms.push({ key: `${id}:bonus`, kind: "bonus", amount: card.chakraBonus, label: `CHAKRA +${card.chakraBonus}` });
  }
  return {
    id,
    kind: "unit",
    card,
    hidden,
    name: hidden ? "Hidden character" : card.name,
    why: hidden
      ? "Face-down still counts: +1"
      : card.chakraBonus
        ? `+1 in play, +${card.chakraBonus} from CHAKRA +${card.chakraBonus}`
        : "+1 for a character in play",
    terms,
  };
}

export const SOURCES: readonly ChakraSource[] = [
  {
    id: "seal",
    kind: "seal",
    name: "Kage Seal",
    why: "Every player's base income",
    terms: [{ key: "seal:base", kind: "base", amount: BASE_CHAKRA, label: "base" }],
  },
  ...BOARD.map(unitSource),
];

export const sourceAmount = (s: ChakraSource) => s.terms.reduce((n, t) => n + t.amount, 0);

/** Every term in canonical formula order: base first, then the board left to right. */
export const ALL_TERMS: readonly ChargeTerm[] = SOURCES.flatMap((s) => s.terms);

if (process.env.NODE_ENV !== "production" && ALL_TERMS.reduce((n, t) => n + t.amount, 0) !== TOTAL_CHAKRA) {
  console.error("Chakra Charger: formula terms do not add up to startPhaseChakra()");
}

/** Cards in hand for the Action phase, with short labels for the ledger. */
export const HAND: ReadonlyArray<{ card: CardDef; short: string }> = [
  { card: practiceCard("kakashi-copy"), short: "Kakashi" },
  { card: practiceCard("rock-lee"), short: "Rock Lee" },
  { card: practiceCard("sakura-medic"), short: "Sakura" },
  { card: practiceCard("ino-yamanaka"), short: "Ino" },
];

export type PlayMode = "up" | "hidden";

export interface Play {
  id: number;
  cardId: string;
  mode: PlayMode;
  cost: number;
}

export const playCost = (card: CardDef, mode: PlayMode) => (mode === "up" ? card.cost : HIDDEN_COST);

export const handEntry = (cardId: string) => HAND.find((h) => h.card.id === cardId);

/** Next Round's income if every character on the board survives. */
export function nextRoundIncome(plays: readonly Play[]) {
  const played = plays.map((p) => {
    const card = practiceCard(p.cardId);
    return { hidden: p.mode === "hidden", chakraBonus: card.chakraBonus };
  });
  const all = [...boardCharacters, ...played];
  const bonus = all.reduce((n, c) => n + (c.hidden ? 0 : (c.chakraBonus ?? 0)), 0);
  return { characters: all.length, bonus, total: startPhaseChakra(all, BASE_CHAKRA) };
}

/** A gentle hint after wasting Chakra. */
export function wasteHint(plays: readonly Play[], leftover: number): string {
  const unplayed = HAND.filter((h) => !plays.some((p) => p.cardId === h.card.id));
  if (unplayed.length === 0) {
    return `Every card is on the board, but ${leftover} Chakra went unused. Play a card face-up instead of hidden to soak it up.`;
  }
  const faceUp = unplayed.filter((h) => h.card.cost <= leftover).map((h) => `${h.short} face-up (${h.card.cost})`);
  const options = [...faceUp, `any card hidden (${HIDDEN_COST})`];
  const list = options.length > 1 ? `${options.slice(0, -1).join(", ")} or ${options[options.length - 1]}` : options[0];
  return `You still had ${leftover} to spend: ${list}.`;
}
