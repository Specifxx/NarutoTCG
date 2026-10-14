import type { Decklist } from "@naruto-tcg/types";
import type { Archetype } from "@/lib/data/archetypes";
import { RULES } from "@/lib/rules";

/**
 * Test fixture: a deterministic, legal 50-card list built from an archetype's 40-card core
 * topped up from its heaviest flex options.
 */
export function templateDecklist(archetype: Archetype): Decklist {
  const copies = new Map<string, number>();
  for (const [cardId, quantity] of archetype.core) copies.set(cardId, (copies.get(cardId) ?? 0) + quantity);
  let remaining = RULES.mainDeckSize - [...copies.values()].reduce((sum, n) => sum + n, 0);
  for (const [cardId] of [...archetype.flex].sort((a, b) => b[1] - a[1])) {
    const take = Math.min(RULES.maxCopies - (copies.get(cardId) ?? 0), remaining);
    if (take <= 0) continue;
    copies.set(cardId, (copies.get(cardId) ?? 0) + take);
    remaining -= take;
  }
  return { leaderId: archetype.leaderIds[0], cards: [...copies].map(([cardId, quantity]) => ({ cardId, quantity })) };
}
