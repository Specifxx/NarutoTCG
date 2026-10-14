import type { EventTier } from "@naruto-tcg/types";
import type { ReactNode } from "react";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { archetypeColor, getArchetype } from "@/lib/data/archetypes";
import { winRateTone, type WinRateTone } from "@/lib/colors";
import { EVENT_TIER_LABEL, EVENT_TIER_SHORT, formatPercent } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";
import { placementLabel } from "@/lib/tournament/standings";

const TIER_CLASS: Record<TierId, string> = {
  S: "bg-tier-s text-shadow-950",
  A: "bg-tier-a text-shadow-950",
  B: "bg-tier-b text-ash-100",
  C: "bg-tier-c text-ash-100",
  unranked: "border border-shadow-500 text-ash-400",
};

export function TierBadge({ tier, size = "md" }: { tier: TierId; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      title={tier === "unranked" ? "Unranked: not enough data" : `${tier} tier`}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-black",
        size === "sm" && "h-5 min-w-5 px-1 text-[11px]",
        size === "md" && "h-7 min-w-7 px-1.5 text-sm",
        size === "lg" && "h-12 min-w-12 px-2 text-2xl",
        TIER_CLASS[tier],
      )}
    >
      {tier === "unranked" ? "—" : tier}
    </span>
  );
}

/** Color swatch carrying archetype identity; the adjacent name stays in text ink. */
export function ArchetypeDot({ archetypeId, className }: { archetypeId: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: archetypeColor(archetypeId) }}
    />
  );
}

export function ArchetypeBadge({
  archetypeId,
  href,
  short = false,
  size = "md",
  className,
}: {
  archetypeId: string;
  /** Link target; pass `true` to link to the deck directory filtered by this archetype. */
  href?: string | true;
  short?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const archetype = getArchetype(archetypeId);
  const label = archetype ? (short ? archetype.shortName : archetype.name) : archetypeId;
  const content = (
    <>
      <ArchetypeDot archetypeId={archetypeId} />
      <span className="truncate">{label}</span>
    </>
  );
  const classes = cx(
    "inline-flex min-w-0 items-center gap-2 font-medium text-ash-100",
    size === "sm" ? "text-xs" : "text-sm",
    className,
  );
  if (!href) return <span className={classes}>{content}</span>;
  const target = href === true ? `/decks?archetype=${encodeURIComponent(archetypeId)}` : href;
  return (
    <Link
      href={target}
      className={cx(classes, "rounded-sm hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400")}
    >
      {content}
    </Link>
  );
}

const EVENT_TIER_CLASS: Record<EventTier, string> = {
  "national-championship": "border-chakra-400 text-chakra-300",
  "regional-championship": "border-chakra-600 text-chakra-400",
  "online-open": "border-shadow-500 text-ash-200",
  "store-championship": "border-shadow-600 text-ash-300",
};

export function EventTierBadge({ tier, short = false }: { tier: EventTier; short?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-full border bg-shadow-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        EVENT_TIER_CLASS[tier],
      )}
    >
      {short ? EVENT_TIER_SHORT[tier] : EVENT_TIER_LABEL[tier]}
    </span>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M5 2h10v2h3v2.5A3.5 3.5 0 0 1 14.6 10a5 5 0 0 1-3.6 3V15h3v3H6v-3h3v-2a5 5 0 0 1-3.6-3A3.5 3.5 0 0 1 2 6.5V4h3V2Zm0 4H4v.5c0 .8.4 1.4 1 1.7V6Zm10 0v2.2c.6-.3 1-.9 1-1.7V6h-1Z"
      />
    </svg>
  );
}

/** Placement tag such as "Winner", "Top 8" or "23rd". */
export function PlacementTag({ placement, topCutSize }: { placement: number; topCutSize: number }) {
  const label = placementLabel(placement, topCutSize);
  const inCut = placement <= Math.max(topCutSize, 2);
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
        placement === 1
          ? "bg-chakra-500 text-shadow-950"
          : inCut
            ? "border border-chakra-600 bg-shadow-800 text-chakra-300"
            : "border border-shadow-600 bg-shadow-800 text-ash-300",
      )}
    >
      {placement === 1 && <TrophyIcon className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

const TONE_MARK: Record<WinRateTone, string> = {
  favored: "bg-favored",
  unfavored: "bg-unfavored",
  even: "bg-ash-500",
  none: "bg-shadow-500",
};

/** Win rate pill: neutral pill + small diverging marker, the number stays in text ink. */
export function WinRateBadge({
  winRate,
  record,
  label,
}: {
  winRate: number | null | undefined;
  record?: { wins: number; losses: number; draws: number };
  label?: string;
}) {
  const tone = winRateTone(winRate);
  const recordText = record ? (record.draws ? `${record.wins}-${record.losses}-${record.draws}` : `${record.wins}-${record.losses}`) : null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-shadow-600 bg-shadow-800 px-2 py-0.5 text-xs text-ash-200"
      title={label ? `${label}${recordText ? ` (${recordText})` : ""}` : undefined}
    >
      <span aria-hidden="true" className={cx("h-2 w-2 rounded-full", TONE_MARK[tone])} />
      <span className="font-semibold tabular-nums text-white">{formatPercent(winRate ?? null, 0)}</span>
      {label && <span className="text-ash-400">{label}</span>}
      {recordText && <span className="tabular-nums text-ash-400">{recordText}</span>}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-shadow-600 px-6 py-10 text-center">
      <p className="font-semibold text-ash-200">{title}</p>
      {children && <div className="mt-2 text-sm text-ash-400">{children}</div>}
    </div>
  );
}
