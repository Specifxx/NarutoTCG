import type { Decklist } from "@naruto-tcg/types";
import { getArchetype, ROGUE_ID } from "@/lib/data/archetypes";
import { isCardLegalOn } from "@/lib/data/cards";
import { checkDecklistLegality } from "@/lib/decks/legality";
import { pick, weightedPick, type Rng } from "@/lib/random";
import { RULES } from "@/lib/rules";
import { ALTERNATE_LEADER_RATE, FLEX_COPY_WEIGHTS } from "@/lib/seed/config";

const COPY_OPTIONS = FLEX_COPY_WEIGHTS.map((weight, index) => ({ copies: index + 1, weight }));

/**
 * Builds a legal list for `archetypeId` as of `date`: the archetype's first legal Leader (or
 * a legal alternate {@link ALTERNATE_LEADER_RATE} of the time), its 40-card core, and the
 * remaining slots filled from legal flex options by weighted pick, 1–4 copies each (topping
 * up picked cards once every option is in).
 * Unknown archetypes use the rogue template. Throws if the result is not legal.
 */
export function buildSeedDecklist(archetypeId: string, date: string, rng: Rng): Decklist {
  const archetype = getArchetype(archetypeId) ?? getArchetype(ROGUE_ID)!;
  const leaders = archetype.leaderIds.filter((id) => isCardLegalOn(id, date));
  if (leaders.length === 0) throw new Error(`No legal ${archetype.id} Leader on ${date}`);
  const [primary, ...alternates] = leaders;
  const leaderId = alternates.length > 0 && rng() < ALTERNATE_LEADER_RATE ? pick(rng, alternates) : primary!;

  const copies = new Map<string, number>();
  for (const [cardId, quantity] of archetype.core) copies.set(cardId, (copies.get(cardId) ?? 0) + quantity);
  let remaining = RULES.mainDeckSize - [...copies.values()].reduce((sum, n) => sum + n, 0);

  const room = (cardId: string) => RULES.maxCopies - (copies.get(cardId) ?? 0);
  const options = archetype.flex.filter(([cardId]) => isCardLegalOn(cardId, date));
  const picked = new Set<string>();
  while (remaining > 0) {
    const fresh = options.filter(([cardId]) => !picked.has(cardId) && room(cardId) > 0);
    const open = fresh.length > 0 ? fresh : options.filter(([cardId]) => room(cardId) > 0);
    if (open.length === 0) throw new Error(`Not enough legal flex cards for ${archetype.id} on ${date}`);
    const [cardId] = weightedPick(rng, open, ([, weight]) => weight);
    const { copies: wanted } = weightedPick(rng, COPY_OPTIONS, (o) => o.weight);
    const quantity = Math.min(wanted, room(cardId), remaining);
    picked.add(cardId);
    copies.set(cardId, (copies.get(cardId) ?? 0) + quantity);
    remaining -= quantity;
  }

  const decklist: Decklist = {
    leaderId,
    cards: [...copies]
      .map(([cardId, quantity]) => ({ cardId, quantity }))
      .sort((a, b) => (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0)),
  };
  const issues = checkDecklistLegality(decklist, { date });
  if (issues.length > 0) throw new Error(`Generated an illegal ${archetype.id} list: ${issues.map((i) => i.message).join(" ")}`);
  return decklist;
}
