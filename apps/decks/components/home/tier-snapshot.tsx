import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArchetypeDot, EmptyState, TierBadge } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { getArchetype } from "@/lib/data/archetypes";
import { formatPercent, formatPointDelta, pluralize } from "@/lib/format";
import { TIER_CONFIG } from "@/lib/meta/config";
import { ArrowRightIcon, TrendIcon } from "./icons";
import { TREND_EVENTS, type TierHighlight, type TrendDirection } from "./tiers";
import { MORE_LINK, PANEL, TEXT_LINK } from "./styles";

const SPOKEN: Record<TrendDirection, string> = { up: "Rising", down: "Falling", flat: "Steady" };

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ash-500">{label}</dt>
      <dd className="truncate font-semibold text-ash-100 tabular-nums">{children}</dd>
    </div>
  );
}

function Trend({ trend }: { trend: TierHighlight["trend"] }) {
  if (!trend) {
    return (
      <span className="text-ash-500">
        —<span className="sr-only"> no trend yet</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <TrendIcon direction={trend.direction} className={cx("h-3 w-3", trend.direction === "flat" ? "text-ash-500" : "text-ash-300")} />
      <span className="sr-only">{SPOKEN[trend.direction]}: </span>
      {formatPointDelta(trend.delta)}
    </span>
  );
}

function TierTile({ row }: { row: TierHighlight }) {
  const name = getArchetype(row.archetypeId)?.name ?? row.archetypeId;
  return (
    <li className="flex items-center gap-3 rounded-md border border-shadow-700 bg-shadow-800/70 px-3 py-2.5">
      <TierBadge tier={row.tier} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/decks?archetype=${encodeURIComponent(row.archetypeId)}`}
          className={`flex w-fit max-w-full min-w-0 items-center gap-2 font-semibold text-white ${TEXT_LINK}`}
        >
          <ArchetypeDot archetypeId={row.archetypeId} />
          <span className="truncate">{name}</span>
          <span className="sr-only"> decks</span>
        </Link>
        <dl className="mt-1.5 grid grid-cols-3 gap-x-3 text-xs">
          <Metric label="Adj. win rate">{formatPercent(row.adjustedWinRate)}</Metric>
          <Metric label="Meta share">{formatPercent(row.metaShare)}</Metric>
          <Metric label="Share trend">
            <Trend trend={row.trend} />
          </Metric>
        </dl>
      </div>
    </li>
  );
}

/** S and A tier archetypes as compact tiles, best first, with a link to the full tier list. */
export function TierSnapshot({ rows, eventCount }: { rows: TierHighlight[]; eventCount: number }) {
  return (
    <Section
      id="tier-snapshot"
      title="Tier snapshot"
      description={`S and A tier archetypes across ${pluralize(eventCount, "demo event")}.`}
      actions={
        <Link href="/meta" className={MORE_LINK}>
          Full tier list
          <ArrowRightIcon />
        </Link>
      }
    >
      {rows.length > 0 ? (
        <div className={`${PANEL} p-3`}>
          <ol aria-label="S and A tier archetypes, best first" className="flex flex-col gap-2">
            {rows.map((row) => (
              <TierTile key={row.archetypeId} row={row} />
            ))}
          </ol>
          <p className="mt-3 px-1 text-xs text-ash-500">
            Adjusted win rate blends in {TIER_CONFIG.priorMatches} pseudo-games at 50%. Share trend compares the latest{" "}
            {TREND_EVENTS} events with the {TREND_EVENTS} before them.
          </p>
        </div>
      ) : (
        <EmptyState title="No archetype is in S or A tier yet">
          <Link href="/meta" className={TEXT_LINK}>
            See the full tier list
          </Link>
        </EmptyState>
      )}
    </Section>
  );
}
