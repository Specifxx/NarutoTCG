import type { Decklist } from "@naruto-tcg/types";
import { getArchetype } from "@/lib/data/archetypes";
import { randInt, shuffle, type Rng } from "@/lib/random";
import { RULES } from "@/lib/rules";

/**
 * An archetype's template list for tests: its core plus flex cards up to 50. Without `rng` the
 * flex options are taken in order, one copy at a time; with it, in random order and amounts.
 */
export function templateDecklist(archetypeId: string, options: { leaderId?: string; rng?: Rng } = {}): Decklist {
  const archetype = getArchetype(archetypeId);
  if (!archetype) throw new Error(`Unknown archetype ${archetypeId}`);
  const copies = new Map<string, number>(archetype.core);
  let remaining = RULES.mainDeckSize - archetype.core.reduce((sum, [, quantity]) => sum + quantity, 0);
  const flex = options.rng ? shuffle(options.rng, archetype.flex) : archetype.flex;
  while (remaining > 0) {
    for (const [cardId] of flex) {
      const room = Math.min(RULES.maxCopies - (copies.get(cardId) ?? 0), remaining);
      if (room <= 0) continue;
      const add = options.rng ? randInt(options.rng, 1, room) : 1;
      copies.set(cardId, (copies.get(cardId) ?? 0) + add);
      remaining -= add;
    }
  }
  return {
    leaderId: options.leaderId ?? archetype.leaderIds[0]!,
    cards: [...copies].map(([cardId, quantity]) => ({ cardId, quantity })),
  };
}
