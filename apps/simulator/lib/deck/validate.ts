import type { Deck } from "@naruto-tcg/types";
import { fullName } from "../cards/meta";
import type { CardDb } from "../cards/types";
import { FORMAT } from "../game-engine/format";
import { splitDeck } from "./deck";

export interface DeckCheck {
  id: "leader" | "main" | "missions" | "copies" | "pool";
  label: string;
  ok: boolean;
  detail: string;
}

export interface DeckValidation {
  legal: boolean;
  checks: DeckCheck[];
  counts: { main: number; leaders: number; missions: number };
  /** Card ids whose name is over the copy limit. */
  overLimit: string[];
}

export function validateDeck(deck: Deck, db: CardDb): DeckValidation {
  const parts = splitDeck(deck, db);
  const main = parts.main.reduce((n, r) => n + r.quantity, 0);
  const leaders = parts.leaders.reduce((n, r) => n + r.quantity, 0);
  const missions = parts.missions.reduce((n, r) => n + r.quantity, 0);
  const missionNames = new Set(parts.missions.map((r) => r.card.name.toLowerCase()));

  const byName = new Map<string, { label: string; count: number; ids: string[] }>();
  for (const r of [...parts.main, ...parts.leaders, ...parts.missions]) {
    const key = fullName(r.card).toLowerCase();
    const cur = byName.get(key) ?? { label: fullName(r.card), count: 0, ids: [] };
    cur.count += r.quantity;
    cur.ids.push(r.card.id);
    byName.set(key, cur);
  }
  const over = [...byName.values()].filter((v) => v.count > FORMAT.maxCopiesPerName);

  const checks: DeckCheck[] = [
    {
      id: "leader",
      label: `Exactly ${FORMAT.leaderCount} Leader`,
      ok: leaders === FORMAT.leaderCount,
      detail: leaders === 0 ? "No Leader selected." : leaders === 1 ? fullName(parts.leaders[0].card) : `${leaders} Leaders.`,
    },
    {
      id: "main",
      label: `${FORMAT.mainDeckSize}-card main deck`,
      ok: main === FORMAT.mainDeckSize,
      detail:
        main === FORMAT.mainDeckSize
          ? `${main} / ${FORMAT.mainDeckSize}`
          : main < FORMAT.mainDeckSize
            ? `${main} / ${FORMAT.mainDeckSize} — add ${FORMAT.mainDeckSize - main}.`
            : `${main} / ${FORMAT.mainDeckSize} — remove ${main - FORMAT.mainDeckSize}.`,
    },
    {
      id: "missions",
      label: `${FORMAT.missionCount} missions, different names`,
      ok: missions === FORMAT.missionCount && missionNames.size === missions,
      detail:
        missionNames.size !== missions
          ? "Two missions share a name."
          : `${missions} / ${FORMAT.missionCount}`,
    },
    {
      id: "copies",
      label: `Max ${FORMAT.maxCopiesPerName} copies per card name`,
      ok: over.length === 0,
      detail: over.length === 0 ? "All within limit." : over.map((o) => `${o.label} ×${o.count}`).join(", "),
    },
    {
      id: "pool",
      label: "All cards playable",
      ok: parts.missing.length === 0 && parts.other.length === 0,
      detail:
        parts.missing.length > 0
          ? `${parts.missing.length} card${parts.missing.length === 1 ? "" : "s"} not in the card pool.`
          : parts.other.length > 0
            ? `${parts.other.map((r) => r.card.name).join(", ")} cannot be played in this format.`
            : "Every card is in the pool.",
    },
  ];

  return {
    legal: checks.every((c) => c.ok),
    checks,
    counts: { main, leaders, missions },
    overLimit: over.flatMap((o) => o.ids),
  };
}
