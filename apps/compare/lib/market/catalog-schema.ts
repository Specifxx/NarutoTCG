/**
 * File format for `pnpm db:catalog <file.json>`: the sets and printings ingestion can price.
 * Validated strictly (no coercion) because a catalog is curated, not scraped.
 */
import { z } from "zod";
import { CARD_TYPES, FINISH_ORDER, RARITY_ORDER } from "./labels";
import type { CardFinish, CardSet, MarketCard, Rarity } from "./types";

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !value.includes("\u0000"), "must not contain NUL characters");

const CatalogSetSchema = z.object({
  code: z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,31}$/, "use upper-case letters, digits and dashes"),
  name: text(200),
  releasedOn: z.iso.date(),
});

const CatalogCardSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "use lower-case letters, digits and dashes"),
  name: text(200),
  /** Groups printings of the same card on the card page ("Other printings"). */
  character: text(200),
  setCode: z.string().min(1),
  number: text(32),
  type: z.enum(CARD_TYPES),
  rarity: z.enum(RARITY_ORDER as [Rarity, ...Rarity[]]),
  finish: z.enum(FINISH_ORDER as [CardFinish, ...CardFinish[]]),
  village: text(100).optional(),
  cost: z.number().int().min(0).max(99).optional(),
  power: z.number().int().min(0).max(99_999).optional(),
  text: text(1000).optional(),
  imageUrl: z.url({ protocol: /^https$/ }).max(2048).optional(),
});

export const CatalogSchema = z
  .object({
    sets: z.array(CatalogSetSchema).min(1),
    cards: z.array(CatalogCardSchema).min(1),
  })
  .superRefine((catalog, ctx) => {
    const codes = new Set<string>();
    catalog.sets.forEach((set, i) => {
      if (codes.has(set.code)) ctx.addIssue({ code: "custom", path: ["sets", i, "code"], message: `duplicate set ${set.code}` });
      codes.add(set.code);
    });
    const ids = new Set<string>();
    catalog.cards.forEach((card, i) => {
      // Card references match ids case-insensitively; ids are already lower-case.
      if (ids.has(card.id)) ctx.addIssue({ code: "custom", path: ["cards", i, "id"], message: `duplicate card ${card.id}` });
      ids.add(card.id);
      if (!codes.has(card.setCode)) {
        ctx.addIssue({ code: "custom", path: ["cards", i, "setCode"], message: `unknown set ${card.setCode}` });
      }
    });
  });

export type CatalogFile = z.infer<typeof CatalogSchema>;

export interface Catalog {
  sets: CardSet[];
  cards: MarketCard[];
}

/** Catalog file → domain objects (each card carries its set's display name). */
export function toCatalog(file: CatalogFile): Catalog {
  const names = new Map(file.sets.map((set) => [set.code, set.name]));
  return {
    sets: file.sets.map(({ code, name, releasedOn }) => ({ code, name, releasedOn })),
    cards: file.cards.map((card) => ({ ...card, set: names.get(card.setCode)! })),
  };
}
