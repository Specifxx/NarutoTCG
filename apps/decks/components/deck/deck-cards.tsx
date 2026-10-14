"use client";

import type { Decklist } from "@naruto-tcg/types";
import { useMemo, useState } from "react";
import { Section } from "@/components/ui/page-header";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { getArchetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { cardCounts, groupDecklist } from "@/lib/decks/deck-utils";
import { mainDeckSize } from "@/lib/decks/legality";
import { pluralize } from "@/lib/format";
import { CardFrame, splitCardName } from "./card-frame";
import { CARD_TYPE_LABEL, RARITY_MARK } from "./card-style";
import { CardIdTile, CardTile } from "./card-tile";
import type { MulliganTargets } from "./sample-hand";
import { SEGMENTED, segmentClass } from "./styles";

type View = "visual" | "list";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "visual", label: "Visual" },
  { id: "list", label: "List" },
];

function LeaderShowcase({ decklist, archetypeId, targets }: { decklist: Decklist; archetypeId: string; targets: MulliganTargets }) {
  const leader = getCard(decklist.leaderId);
  const archetype = getArchetype(archetypeId);
  const [title, epithet] = leader ? splitCardName(leader.name) : [decklist.leaderId, null];
  return (
    <div className="grid gap-5 rounded-lg border border-shadow-700 bg-shadow-900 p-4 @lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-60">
        {leader ? <CardFrame card={leader} quantity={1} size="lg" /> : <CardIdTile cardId={decklist.leaderId} quantity={1} />}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chakra-400">Leader</p>
          <h3 className="mt-1 text-xl font-bold text-white">
            {title}
            {epithet && <span className="block text-sm font-medium text-ash-300">{epithet}</span>}
          </h3>
          {leader && (
            <p className="mt-1 text-xs text-ash-400">
              {[leader.village, ...(leader.traits ?? [])].filter(Boolean).join(" · ")} · {RARITY_MARK[leader.rarity].label} · {leader.id}
            </p>
          )}
        </div>
        {leader?.text && (
          <p className="rounded-md border border-shadow-700 bg-shadow-800 px-3 py-2 text-sm leading-relaxed text-ash-100">{leader.text}</p>
        )}
        {leader?.power !== undefined && (
          <p className="text-sm text-ash-300">
            Power <span className="font-semibold tabular-nums text-white">{leader.power}</span>
          </p>
        )}
        {archetype && archetype.gamePlan && archetype.signatureCardIds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ash-400">Game plan</h4>
            <p className="mt-1 text-sm leading-relaxed text-ash-200">{archetype.gamePlan}</p>
          </div>
        )}
        {targets.cardIds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ash-400">Mulligan for</h4>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {targets.cardIds.map((id) => (
                <li key={id} className="rounded bg-shadow-800 px-2 py-0.5 text-xs text-ash-200">
                  {getCard(id)?.name ?? id}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function VisualList({ decklist, archetypeId, targets }: { decklist: Decklist; archetypeId: string; targets: MulliganTargets }) {
  const { sections, unknownCardIds } = useMemo(() => groupDecklist(decklist), [decklist]);
  const counts = useMemo(() => cardCounts(decklist), [decklist]);
  const unknownInDeck = unknownCardIds.filter((id) => counts.has(id));
  return (
    <div className="flex flex-col gap-8">
      <LeaderShowcase decklist={decklist} archetypeId={archetypeId} targets={targets} />
      {sections.map((section) => (
        <section key={section.key} aria-label={`${section.title}, ${pluralize(section.count, "card")}`}>
          <h3 className="mb-3 flex items-baseline gap-2 text-base font-bold text-white">
            {section.title}
            <span className="text-sm font-medium tabular-nums text-ash-400">{section.count}</span>
          </h3>
          <ul className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6">
            {section.entries.map(({ card, quantity }) => (
              <li key={card.id}>
                <CardTile card={card} quantity={quantity} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {unknownInDeck.length > 0 && (
        <section aria-label="Cards missing from the card pool">
          <h3 className="mb-1 text-base font-bold text-white">Unrecognized cards</h3>
          <p className="mb-3 text-sm text-ash-400">These ids are not in the card pool, so they are left out of the stats and odds.</p>
          <ul className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6">
            {unknownInDeck.map((id) => (
              <li key={id}>
                <CardIdTile cardId={id} quantity={counts.get(id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TableList({ decklist }: { decklist: Decklist }) {
  const { leader, sections, unknownCardIds } = useMemo(() => groupDecklist(decklist), [decklist]);
  const counts = useMemo(() => cardCounts(decklist), [decklist]);
  const unknownInDeck = unknownCardIds.filter((id) => counts.has(id));
  const groupRow = (label: string) => (
    <tr className="border-t border-shadow-700 bg-shadow-800/70">
      <th scope="colgroup" colSpan={5} className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-ash-300">
        {label}
      </th>
    </tr>
  );
  return (
    <DataTable>
      <caption className="sr-only">Decklist: quantity, name, cost, type and power of every card</caption>
      <THead>
        <tr>
          <Th numeric>Qty</Th>
          <Th>Name</Th>
          <Th numeric>Cost</Th>
          <Th>Type</Th>
          <Th numeric>Power</Th>
        </tr>
      </THead>
      <tbody>
        {groupRow("Leader")}
        <Tr>
          <Td numeric>1</Td>
          <Td className="font-medium text-white">{leader?.name ?? decklist.leaderId}</Td>
          <Td numeric className="text-ash-500">—</Td>
          <Td className="text-ash-300">{leader ? CARD_TYPE_LABEL[leader.type] : "Unknown"}</Td>
          <Td numeric>{leader?.power ?? "—"}</Td>
        </Tr>
      </tbody>
      {sections.map((section) => (
        <tbody key={section.key}>
          {groupRow(`${section.title} (${section.count})`)}
          {section.entries.map(({ card, quantity }) => (
            <Tr key={card.id}>
              <Td numeric className="font-semibold text-white">
                {quantity}
              </Td>
              <Td>
                <span className="font-medium text-ash-100">{card.name}</span>
                <span className="ml-2 text-xs text-ash-500">{card.id}</span>
              </Td>
              <Td numeric>{card.cost ?? "—"}</Td>
              <Td className="text-ash-300">
                {CARD_TYPE_LABEL[card.type]}
                {card.traits && card.traits.length > 0 && <span className="text-ash-500"> · {card.traits.join(" · ")}</span>}
              </Td>
              <Td numeric>{card.power ?? "—"}</Td>
            </Tr>
          ))}
        </tbody>
      ))}
      {unknownInDeck.length > 0 && (
        <tbody>
          {groupRow(`Unrecognized (${unknownInDeck.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)})`)}
          {unknownInDeck.map((id) => (
            <Tr key={id}>
              <Td numeric>{counts.get(id)}</Td>
              <Td className="text-ash-300">{id}</Td>
              <Td numeric>—</Td>
              <Td className="text-ash-500">Not in the card pool</Td>
              <Td numeric>—</Td>
            </Tr>
          ))}
        </tbody>
      )}
    </DataTable>
  );
}

/** The decklist: a visual card layout or a compact table, switchable. */
export function DeckCards({ decklist, archetypeId, targets }: { decklist: Decklist; archetypeId: string; targets: MulliganTargets }) {
  const [view, setView] = useState<View>("visual");
  const size = mainDeckSize(decklist);
  return (
    <Section
      id="decklist"
      title="Decklist"
      description={`1 Leader + ${pluralize(size, "card")} in the main deck.${view === "visual" ? " Hover, focus or tap a card for its full text." : ""}`}
      actions={
        <div role="group" aria-label="Decklist view" className={SEGMENTED}>
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => setView(option.id)}
              className={segmentClass(view === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="@container min-w-0">
        {view === "visual" ? <VisualList decklist={decklist} archetypeId={archetypeId} targets={targets} /> : <TableList decklist={decklist} />}
      </div>
    </Section>
  );
}
