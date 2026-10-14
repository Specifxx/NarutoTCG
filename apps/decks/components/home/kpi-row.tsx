import { cx } from "@naruto-tcg/ui";
import { StatTile } from "@/components/ui/stat-tile";
import { formatNumber, pluralize } from "@/lib/format";
import { formatDateRange, type OverviewKpis } from "./events";

/** Five headline counts; two columns on phones (the last tile spans both), five from `lg`. */
export function KpiRow({ kpis }: { kpis: OverviewKpis }) {
  const tiles = [
    {
      label: "Events tracked",
      value: formatNumber(kpis.events),
      detail: kpis.dateRange ? formatDateRange(kpis.dateRange.from, kpis.dateRange.to) : "No events yet",
    },
    { label: "Players", value: formatNumber(kpis.players), detail: pluralize(kpis.entries, "entry", "entries") },
    { label: "Matches", value: formatNumber(kpis.matches), detail: "Byes and intentional draws excluded" },
    {
      label: "Published decklists",
      value: formatNumber(kpis.decklists),
      detail: `${formatNumber(kpis.eventDecklists)} from events · ${formatNumber(kpis.communityDecklists)} community`,
    },
    {
      label: "Archetypes ranked",
      value: formatNumber(kpis.rankedArchetypes),
      detail: `of ${formatNumber(kpis.playedArchetypes)} played`,
    },
  ];
  return (
    <section aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="sr-only">
        At a glance
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile, index) => (
          <li key={tile.label} className={cx(index === tiles.length - 1 && "col-span-2 sm:col-span-1")}>
            <StatTile label={tile.label} value={tile.value} detail={tile.detail} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
