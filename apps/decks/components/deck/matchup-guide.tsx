import { cx } from "@naruto-tcg/ui";
import { ArchetypeBadge, ArchetypeDot, EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import type { WinRateTone } from "@/lib/colors";
import { ROGUE_ID, getArchetype } from "@/lib/data/archetypes";
import { formatPercent, pluralize } from "@/lib/format";
import { formatRecord } from "@/lib/tournament/standings";
import { ChevronIcon, EvenIcon, FavoredIcon, NoDataIcon, UnfavoredIcon, WarningIcon } from "./icons";
import { OPEN_MATCHUPS, formatInterval, matchupNumbers, matchupVerdict, winRateChipColors } from "./matchup-verdict";
import { FOCUS_RING } from "./styles";
import type { DeckContext, MatchupEntry } from "./types";

const VERDICT_ICON: Record<WinRateTone, { Icon: typeof FavoredIcon; className: string }> = {
  favored: { Icon: FavoredIcon, className: "text-favored" },
  even: { Icon: EvenIcon, className: "text-ash-300" },
  unfavored: { Icon: UnfavoredIcon, className: "text-unfavored" },
  none: { Icon: NoDataIcon, className: "text-ash-500" },
};

const nameOf = (archetypeId: string) => getArchetype(archetypeId)?.name ?? archetypeId;

function VerdictPill({ tone, label }: { tone: WinRateTone; label: string }) {
  const { Icon, className } = VERDICT_ICON[tone];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-shadow-600 bg-shadow-800 px-2 py-0.5 text-xs font-semibold text-ash-100">
      <Icon className={cx("h-3.5 w-3.5", className)} />
      {label}
    </span>
  );
}

function LowSampleNote({ minGames }: { minGames: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ash-300" title={`Fewer than ${minGames} games: treat the verdict as tentative`}>
      <WarningIcon className="h-3.5 w-3.5 text-status-warning" />
      Low sample
    </span>
  );
}

/**
 * The win rate on its diverging fill; low-sample chips are dimmed and dashed (and labeled beside).
 * Hidden from assistive tech: the summary's screen-reader text reads the full numbers.
 */
function WinRateChip({ entry, lowSample }: { entry: MatchupEntry; lowSample: boolean }) {
  const colors = winRateChipColors(entry.games > 0 ? entry.winRate : null, lowSample);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex min-w-14 justify-center rounded-md px-2 py-0.5 text-sm font-bold tabular-nums",
        lowSample && "border border-dashed border-ash-400",
      )}
      style={{ backgroundColor: colors.background, color: colors.color }}
    >
      {/* One decimal, like /meta: a rounded "53%" could sit beside an Even verdict (52.6%). */}
      {entry.games > 0 ? formatPercent(entry.winRate) : "—"}
    </span>
  );
}

function MatchupItem({
  entry,
  open,
  minGames,
  authorNote,
  authorName,
}: {
  entry: MatchupEntry;
  open: boolean;
  minGames: number;
  authorNote: string | undefined;
  authorName: string;
}) {
  const verdict = matchupVerdict(entry);
  const interval = formatInterval(entry.interval);
  const guide = entry.guide;
  return (
    <li>
      <details open={open} className="group rounded-lg border border-shadow-700 bg-shadow-900 open:border-shadow-600">
        <summary
          className={cx(
            "flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-3 hover:bg-shadow-800/60 sm:px-4 [&::-webkit-details-marker]:hidden",
            FOCUS_RING,
          )}
        >
          <ChevronIcon className="h-4 w-4 shrink-0 text-ash-400 transition group-open:rotate-90 motion-reduce:transition-none" />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <ArchetypeDot archetypeId={entry.opponentId} />
            <h3 className="min-w-0 text-sm font-semibold text-white sm:text-base">
              <span className="sr-only">Versus </span>
              {nameOf(entry.opponentId)}
            </h3>
            <span className="hidden shrink-0 text-xs text-ash-500 sm:inline">{formatPercent(entry.opponentShare, 0)} of the field</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {verdict.lowSample && <LowSampleNote minGames={minGames} />}
            <VerdictPill tone={verdict.tone} label={verdict.label} />
            <WinRateChip entry={entry} lowSample={verdict.lowSample} />
            <span className="sr-only">{matchupNumbers(entry)}</span>
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-5 border-t border-shadow-700 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex min-w-0 flex-col gap-3 text-sm leading-relaxed">
            {guide ? (
              <>
                <p className="text-ash-100">{guide.summary}</p>
                {guide.keys.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-ash-400">Keys to the matchup</h4>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ash-200 marker:text-chakra-500">
                      {guide.keys.map((key) => (
                        <li key={key}>{key}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {guide.mulligan && (
                  <p className="text-ash-200">
                    <span className="font-semibold text-white">Mulligan: </span>
                    {guide.mulligan}
                  </p>
                )}
                <p className="text-xs text-ash-500">{guide.source === "curated" ? "Community guide" : "Generated from archetype data"}</p>
              </>
            ) : (
              <p className="text-ash-400">No strategy guide for this pairing yet.</p>
            )}
            {authorNote && (
              <figure className="rounded-md border-l-2 border-chakra-500 bg-shadow-800 px-3 py-2">
                <blockquote className="text-ash-100">{authorNote}</blockquote>
                <figcaption className="mt-1 text-xs text-ash-400">{authorName}, deck author</figcaption>
              </figure>
            )}
          </div>

          <div className="flex h-fit flex-col gap-2 rounded-md border border-shadow-700 bg-shadow-950/40 p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-1">
              <div>
                <dt className="text-xs text-ash-400">Win rate</dt>
                <dd className="font-semibold tabular-nums text-white">{entry.games > 0 ? formatPercent(entry.winRate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ash-400">Games (record)</dt>
                <dd className="tabular-nums text-ash-100">
                  {entry.games > 0 ? `n = ${entry.games} (${formatRecord(entry.record)})` : "None recorded"}
                </dd>
              </div>
              {interval && (
                <div>
                  <dt className="text-xs text-ash-400">95% interval</dt>
                  <dd className="tabular-nums text-ash-100">{interval}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-ash-400">Opponent share</dt>
                <dd className="tabular-nums text-ash-100">{formatPercent(entry.opponentShare)} of entries</dd>
              </div>
            </dl>
            {verdict.lowSample && (
              <p className="text-xs text-ash-400">Fewer than {pluralize(minGames, "game")}: the verdict may swing with a few more results.</p>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

/**
 * Matchup strategy guide: one accordion per opponent, most-played first (the top three open), with
 * the head-to-head numbers, a verdict, the strategy guide and the author's own notes.
 */
export function MatchupGuide({
  archetypeId,
  context,
  matchupNotes,
  authorName,
}: {
  archetypeId: string;
  context: DeckContext;
  matchupNotes: Record<string, string> | undefined;
  authorName: string;
}) {
  const { matchups, minGames, eventCount } = context;
  const archetype = getArchetype(archetypeId);
  return (
    <Section
      id="matchups"
      title="Matchup guide"
      description={
        matchups.length > 0 ? (
          <>
            {archetype?.name ?? archetypeId} head-to-head results across {pluralize(eventCount, "event")} of fictional demo data,
            most-played opponents first. Results under {pluralize(minGames, "game")} are marked low sample.
            {archetypeId === ROGUE_ID && " Rogue lists share one bucket, so these numbers mix many different decks."}
          </>
        ) : undefined
      }
    >
      {matchups.length === 0 ? (
        <EmptyState title="No matchup data for this deck">
          Head-to-head numbers and guides come from the tracked seed events; imported lists are not part of them yet. See{" "}
          <ArchetypeBadge archetypeId={archetypeId} href className="align-middle" /> decks for how the archetype is played.
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-2">
          {matchups.map((entry, index) => (
            <MatchupItem
              key={entry.opponentId}
              entry={entry}
              open={index < OPEN_MATCHUPS}
              minGames={minGames}
              authorNote={matchupNotes?.[entry.opponentId]}
              authorName={authorName}
            />
          ))}
        </ol>
      )}
    </Section>
  );
}
