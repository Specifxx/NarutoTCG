import type { Decklist } from "@naruto-tcg/types";
import { Section } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { averageCost, costCurve, typeCounts } from "@/lib/decks/deck-utils";
import { mainDeckSize } from "@/lib/decks/legality";
import { formatPercent } from "@/lib/format";
import { RULES } from "@/lib/rules";
import { CostCurveChart } from "./cost-curve-chart";

/** Type counts, average cost and the cost curve. Server-safe; the chart is the only client part. */
export function DeckStats({ decklist }: { decklist: Decklist }) {
  const size = mainDeckSize(decklist);
  const counts = typeCounts(decklist);
  const other = counts.item + counts.event + counts.leader;
  const share = (n: number) => (size > 0 ? formatPercent(n / size, 0) : "—");
  const tiles = [
    { label: "Characters", count: counts.character },
    { label: "Jutsus", count: counts.jutsu },
    { label: "Missions", count: counts.mission },
    ...(other > 0 ? [{ label: "Other", count: other }] : []),
  ];

  return (
    <Section id="stats" title="Deck stats">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
          <StatTile
            label="Main deck"
            value={size}
            detail={size === RULES.mainDeckSize ? "+ 1 Leader" : `Expected ${RULES.mainDeckSize} + 1 Leader`}
          />
          <StatTile label="Average cost" value={averageCost(decklist).toFixed(2)} detail="Per main-deck card" />
          {tiles.map((tile) => (
            <StatTile key={tile.label} label={tile.label} value={tile.count} detail={`${share(tile.count)} of the deck`} />
          ))}
        </div>
        <CostCurveChart curve={costCurve(decklist)} />
      </div>
    </Section>
  );
}
