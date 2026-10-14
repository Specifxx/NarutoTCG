import Link from "next/link";
import type { ReactNode } from "react";
import { ArchetypeDot, TierBadge } from "@/components/ui/badges";
import { getArchetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { formatNumber, formatPercent } from "@/lib/format";
import { TIER_CONFIG, TIER_META } from "@/lib/meta/config";
import type { ArchetypeTrend } from "@/lib/meta/stats";
import type { ArchetypeStats, TierId } from "@/lib/meta/types";
import { formatLift, unrankedReason } from "./derive";
import { TrendValue } from "./trend";

const RANKED_TIERS: readonly Exclude<TierId, "unranked">[] = ["S", "A", "B", "C"];

const LINK_CLASS = "rounded-sm outline-none hover:text-chakra-300 focus-visible:ring-2 focus-visible:ring-chakra-400";

function archetypeHref(id: string): string {
  return `/decks?archetype=${encodeURIComponent(id)}`;
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ash-500">{label}</dt>
      <dd className="truncate font-medium text-ash-100 tabular-nums">{children}</dd>
    </div>
  );
}

function ArchetypeTile({ stat, trend }: { stat: ArchetypeStats; trend: ArchetypeTrend | undefined }) {
  const archetype = getArchetype(stat.archetypeId);
  const leaderId = archetype?.leaderIds[0];
  const leader = leaderId ? getCard(leaderId) : undefined;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-md border border-shadow-700 bg-shadow-800/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={archetypeHref(stat.archetypeId)}
            className={`flex items-center gap-2 font-semibold text-white ${LINK_CLASS}`}
          >
            <ArchetypeDot archetypeId={stat.archetypeId} />
            <span className="truncate">{archetype?.name ?? stat.archetypeId}</span>
          </Link>
          {leader && <div className="mt-0.5 truncate text-xs text-ash-400">Leader: {leader.name}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg leading-tight font-bold text-white">{stat.score.toFixed(1)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ash-500">Score</div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Metric label="Adj. win rate">{formatPercent(stat.adjustedWinRate)}</Metric>
        <Metric label="Meta share">{formatPercent(stat.metaShare)}</Metric>
        <Metric label="Top-cut conversion">
          {formatPercent(stat.conversionRate)} · {formatLift(stat.conversionLift)} field
        </Metric>
        <Metric label="Share trend">
          <TrendValue trend={trend} />
        </Metric>
        <Metric label="Event wins">{formatNumber(stat.eventWins)}</Metric>
        <Metric label="Entries">{formatNumber(stat.entries)}</Metric>
      </dl>
    </li>
  );
}

function unrankedNote(stat: ArchetypeStats): string {
  switch (unrankedReason(stat)) {
    case "rogue":
      return "Rogue lists are never ranked";
    case "entries":
      return `Too few entries (needs ${formatNumber(TIER_CONFIG.minEntries)})`;
    case "share":
      return `Too small a share (needs ${formatPercent(TIER_CONFIG.minShare)})`;
    default:
      return "Not ranked";
  }
}

/** MOBAFire-style tier list: S–C rows with archetype tiles in score order, then the unranked. */
export function TierList({ tiers, trends }: { tiers: Record<TierId, ArchetypeStats[]>; trends: Record<string, ArchetypeTrend> }) {
  return (
    <div className="flex flex-col gap-3">
      {RANKED_TIERS.map((tier) => (
        <div
          key={tier}
          className="grid gap-4 rounded-lg border border-shadow-700 bg-shadow-900 p-3 sm:p-4 lg:grid-cols-[14rem_minmax(0,1fr)]"
        >
          <div className="flex items-start gap-3">
            <TierBadge tier={tier} size="lg" />
            <div className="min-w-0">
              <h3 className="font-bold text-white">{TIER_META[tier].label}</h3>
              <p className="mt-0.5 text-xs text-ash-400">{TIER_META[tier].blurb}</p>
            </div>
          </div>
          {tiers[tier].length > 0 ? (
            <ol
              aria-label={`${TIER_META[tier].label} archetypes, best first`}
              className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            >
              {tiers[tier].map((stat) => (
                <ArchetypeTile key={stat.archetypeId} stat={stat} trend={trends[stat.archetypeId]} />
              ))}
            </ol>
          ) : (
            <p className="self-center text-sm text-ash-500">No archetype scores in this tier for the selected events.</p>
          )}
        </div>
      ))}
      {tiers.unranked.length > 0 && (
        <div className="rounded-lg border border-dashed border-shadow-600 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <TierBadge tier="unranked" size="sm" />
            <h3 className="text-sm font-semibold text-ash-200">{TIER_META.unranked.label}</h3>
          </div>
          <p className="mt-1 text-xs text-ash-400">{TIER_META.unranked.blurb}</p>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {tiers.unranked.map((stat) => (
              <li key={stat.archetypeId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link
                  href={archetypeHref(stat.archetypeId)}
                  className={`flex min-w-0 items-center gap-2 text-ash-100 ${LINK_CLASS}`}
                >
                  <ArchetypeDot archetypeId={stat.archetypeId} />
                  <span className="truncate">{getArchetype(stat.archetypeId)?.name ?? stat.archetypeId}</span>
                </Link>
                <span className="text-xs text-ash-500">
                  {formatNumber(stat.entries)} {stat.entries === 1 ? "entry" : "entries"} · {unrankedNote(stat)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
