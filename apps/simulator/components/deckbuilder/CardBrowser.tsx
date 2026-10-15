"use client";

import type { Deck } from "@naruto-tcg/types";
import { AnimatePresence, motion } from "framer-motion";
import { ListFilter, Minus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CARD_TYPES, compareByCost, ELEMENT_META, ELEMENTS, RARITIES, RARITY_META, rarityRank, TYPE_META } from "@/lib/cards/meta";
import type { CardDb, CardType, Element, Rarity, SimCard } from "@/lib/cards/types";
import { addBlocker, quantityOf } from "@/lib/deck/deck";
import { CardFace } from "../cards/CardFace";
import { hoverProps } from "../cards/HoverPreview";
import { cx } from "../ui/Button";
import { Chip } from "../ui/Chip";

type Sort = "cost" | "name" | "power" | "rarity";
const COSTS = [0, 1, 2, 3, 4, 5, 6, 7];

interface Filters {
  q: string;
  types: CardType[];
  elements: Element[];
  costs: number[];
  rarities: Rarity[];
  village: string;
  sort: Sort;
}

const EMPTY: Filters = { q: "", types: [], elements: [], costs: [], rarities: [], village: "", sort: "cost" };

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function matches(card: SimCard, f: Filters): boolean {
  if (f.types.length && !f.types.includes(card.type)) return false;
  if (f.elements.length && !f.elements.includes(card.element)) return false;
  if (f.costs.length && !f.costs.includes(Math.min(card.cost, 7))) return false;
  if (f.rarities.length && !f.rarities.includes(card.rarity)) return false;
  if (f.village && card.village !== f.village) return false;
  if (f.q) {
    const hay = [card.name, card.title, card.text, card.village, ...card.keywords].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const SORTS: Record<Sort, (a: SimCard, b: SimCard) => number> = {
  cost: compareByCost,
  name: (a, b) => a.name.localeCompare(b.name) || compareByCost(a, b),
  power: (a, b) => b.power - a.power || compareByCost(a, b),
  rarity: (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || compareByCost(a, b),
};

export function CardBrowser({
  cards,
  db,
  deck,
  readOnly,
  onAdd,
  onRemove,
}: {
  cards: SimCard[];
  db: CardDb;
  deck: Deck | null;
  readOnly: boolean;
  onAdd: (card: SimCard) => void;
  onRemove: (card: SimCard) => void;
}) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const villages = useMemo(() => [...new Set(cards.map((c) => c.village).filter((v): v is string => !!v))].sort(), [cards]);
  const types = useMemo(() => CARD_TYPES.filter((t) => cards.some((c) => c.type === t)), [cards]);
  const results = useMemo(() => cards.filter((c) => matches(c, f)).sort(SORTS[f.sort]), [cards, f]);
  const active = f.types.length + f.elements.length + f.costs.length + f.rarities.length + (f.village ? 1 : 0);

  const filterPanel = (
    <div className="space-y-4">
      <FilterGroup label="Card type">
        {types.map((t) => (
          <Chip key={t} active={f.types.includes(t)} onClick={() => setF({ ...f, types: toggle(f.types, t) })}>
            {TYPE_META[t].label}
          </Chip>
        ))}
      </FilterGroup>
      {cards.some((c) => c.element !== "neutral") && (
      <FilterGroup label="Element / Chakra">
        {ELEMENTS.filter((e) => cards.some((c) => c.element === e)).map((e) => (
          <Chip key={e} active={f.elements.includes(e)} color={ELEMENT_META[e].color} onClick={() => setF({ ...f, elements: toggle(f.elements, e) })}>
            <span style={{ color: ELEMENT_META[e].color }}>{ELEMENT_META[e].kanji}</span>
            {ELEMENT_META[e].label}
          </Chip>
        ))}
      </FilterGroup>
      )}
      <FilterGroup label="Chakra cost">
        {COSTS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={f.costs.includes(c)}
            onClick={() => setF({ ...f, costs: toggle(f.costs, c) })}
            className={cx(
              "grid h-8 w-8 place-items-center rounded-full font-display text-xs font-bold transition",
              f.costs.includes(c)
                ? "bg-gradient-to-br from-chakra-300 to-chakra-500 text-shadow-950 shadow-[0_0_12px_rgba(255,122,26,0.6)]"
                : "border border-white/10 text-ash-400 hover:border-chakra-400/50 hover:text-ash-100",
            )}
          >
            {c === 7 ? "7+" : c}
          </button>
        ))}
      </FilterGroup>
      <FilterGroup label="Rarity">
        {RARITIES.filter((r) => cards.some((c) => c.rarity === r)).map((r) => (
          <Chip key={r} active={f.rarities.includes(r)} color={RARITY_META[r].color} onClick={() => setF({ ...f, rarities: toggle(f.rarities, r) })} title={RARITY_META[r].label}>
            <span style={{ color: RARITY_META[r].color }}>◆</span>
            {RARITY_META[r].short}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Village">
        <select
          value={f.village}
          onChange={(e) => setF({ ...f, village: e.target.value })}
          className="h-8 w-full rounded-md border border-white/10 bg-shadow-900 px-2 text-xs text-ash-100 focus:border-chakra-400/60 focus:outline-none"
        >
          <option value="">All villages</option>
          {villages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </FilterGroup>
      {active > 0 && (
        <button type="button" onClick={() => setF({ ...EMPTY, q: f.q, sort: f.sort })} className="text-xs text-chakra-300 hover:underline">
          Clear {active} filter{active === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 gap-4">
      <aside className="scroll-thin hidden w-56 shrink-0 overflow-y-auto pr-1 xl:block">{filterPanel}</aside>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
            <input
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              placeholder="Search name, text, keyword…"
              className="h-10 w-full rounded-lg border border-white/10 bg-shadow-900/80 pl-9 pr-8 text-sm text-ash-50 placeholder:text-ash-500 focus:border-chakra-400/60 focus:outline-none"
            />
            {f.q && (
              <button type="button" aria-label="Clear search" onClick={() => setF({ ...f, q: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-ash-500 hover:text-ash-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold uppercase tracking-wider text-ash-300 xl:hidden"
            aria-expanded={showFilters}
          >
            <ListFilter className="h-4 w-4" /> Filters{active ? ` (${active})` : ""}
          </button>
          <select
            value={f.sort}
            onChange={(e) => setF({ ...f, sort: e.target.value as Sort })}
            aria-label="Sort cards"
            className="h-10 rounded-lg border border-white/10 bg-shadow-900 px-2 text-xs text-ash-100 focus:outline-none"
          >
            <option value="cost">Sort: Cost</option>
            <option value="name">Sort: Name</option>
            <option value="power">Sort: Power</option>
            <option value="rarity">Sort: Rarity</option>
          </select>
          <span className="text-xs text-ash-500">{results.length} cards</span>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden xl:hidden">
              <div className="panel p-4">{filterPanel}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {!readOnly && (
          <p className="mb-3 text-[11px] text-ash-500">Click to add · right-click to remove · hover to preview</p>
        )}

        <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] justify-items-center gap-3">
          {results.map((card) => {
            const qty = deck ? quantityOf(deck, card.id) : 0;
            const blocked = readOnly || !deck ? "Read-only deck" : addBlocker(deck, db, card);
            return (
              <motion.div
                key={card.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="relative"
              >
                <button
                  type="button"
                  {...hoverProps(card)}
                  onClick={() => onAdd(card)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (qty > 0) onRemove(card);
                  }}
                  aria-label={`Add ${card.name}${card.title ? ` — ${card.title}` : ""}`}
                  title={blocked && !readOnly ? blocked : undefined}
                  className={cx("block rounded-[0.75em] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400", blocked && !readOnly && qty === 0 && "opacity-50")}
                >
                  <CardFace card={card} size="md" />
                </button>
                {qty > 0 && (
                  <div className="absolute -right-2 -top-2 flex items-center overflow-hidden rounded-full border border-chakra-400/60 bg-shadow-950 shadow-[0_0_12px_rgba(255,122,26,0.5)]">
                    {!readOnly && (
                      <button type="button" aria-label={`Remove one ${card.name}`} onClick={() => onRemove(card)} className="grid h-6 w-6 place-items-center text-ash-300 hover:bg-white/10 hover:text-ash-50">
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                    <span className="px-2 font-display text-xs font-bold text-chakra-300">×{qty}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
        {results.length === 0 && <p className="py-16 text-center text-sm text-ash-500">No cards match these filters.</p>}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="panel-title mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
