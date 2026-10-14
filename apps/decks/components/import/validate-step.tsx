"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, useState, type Dispatch } from "react";
import { EmptyState } from "@/components/ui/badges";
import { StatTile } from "@/components/ui/stat-tile";
import { formatNumber, pluralize } from "@/lib/format";
import { countIssues, issueLocation, type IngestIssue, type IngestSeverity } from "@/lib/ingest/types";
import { CheckCircleIcon } from "./icons";
import { filterIssues, groupIssuesBySeverity, issueSourceOptions, SEVERITIES, SEVERITY_LABEL, type IssueFilter } from "./issues";
import { SeverityIcon, SeverityTag } from "./status";
import { BUTTON_GHOST_SM, BUTTON_PRIMARY, FIELD_SM, FOCUS_RING } from "./styles";
import { VALIDATION_ISSUES_ID, type WizardAction, type WizardState } from "./wizard-state";

/** Issues rendered per severity group before "Show all". */
const GROUP_LIMIT = 50;

function StatusBanner({ counts, assembled }: { counts: Record<IngestSeverity, number>; assembled: boolean }) {
  const tally = SEVERITIES.map((severity) => `${formatNumber(counts[severity])} ${counts[severity] === 1 ? SEVERITY_LABEL[severity].one.toLowerCase() : SEVERITY_LABEL[severity].many.toLowerCase()}`).join(" · ");
  const blocked = counts.error > 0 || !assembled;
  const title = !assembled
    ? "No event could be assembled from these files."
    : counts.error > 0
      ? `${pluralize(counts.error, "error")} must be fixed before saving.`
      : counts.warning > 0
        ? `Ready to preview, with ${pluralize(counts.warning, "warning")} worth a look.`
        : "No blocking problems: ready to preview.";
  return (
    <div
      role="status"
      className={cx(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        blocked ? "border-status-critical/60 bg-shadow-800" : counts.warning > 0 ? "border-status-warning/50 bg-shadow-800" : "border-status-good/50 bg-shadow-800",
      )}
    >
      {blocked ? (
        <SeverityIcon severity="error" className="mt-0.5 h-5 w-5" />
      ) : counts.warning > 0 ? (
        <SeverityIcon severity="warning" className="mt-0.5 h-5 w-5" />
      ) : (
        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-status-good" />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-white">
          <span className="sr-only">{blocked ? "Blocked: " : "Passed: "}</span>
          {title}
        </p>
        <p className="mt-0.5 text-sm text-ash-400">
          {tally}. {blocked ? "Errors block saving; warnings and info don't." : "Warnings and info don't block saving."}
        </p>
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: IngestIssue }) {
  const location = issueLocation(issue);
  return (
    <li className="rounded-md border border-shadow-700 bg-shadow-800 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SeverityTag severity={issue.severity} label={SEVERITY_LABEL[issue.severity].one} />
        {location && <span className="break-all font-mono text-xs text-ash-300">{location}</span>}
        <span className="break-all font-mono text-[11px] text-ash-500">{issue.code}</span>
      </div>
      <p className="mt-1 break-words text-sm text-ash-100">{issue.message}</p>
      {issue.suggestion && (
        <p className="mt-1 break-words text-sm text-ash-400">
          <span className="font-semibold text-ash-300">Suggestion:</span> {issue.suggestion}
        </p>
      )}
    </li>
  );
}

function IssueGroup({ severity, issues }: { severity: IngestSeverity; issues: IngestIssue[] }) {
  const [showAll, setShowAll] = useState(false);
  const headingId = useId();
  const shown = showAll ? issues : issues.slice(0, GROUP_LIMIT);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h4 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-white">
        <SeverityIcon severity={severity} />
        {SEVERITY_LABEL[severity].many} <span className="font-normal text-ash-400">({formatNumber(issues.length)})</span>
      </h4>
      <ul className="flex flex-col gap-2">
        {shown.map((issue, index) => (
          <IssueItem key={`${issue.code}-${index}`} issue={issue} />
        ))}
      </ul>
      {issues.length > GROUP_LIMIT && (
        <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} className={cx(BUTTON_GHOST_SM, "self-start")}>
          {showAll ? `Show the first ${GROUP_LIMIT}` : `Show all ${formatNumber(issues.length)}`}
        </button>
      )}
    </section>
  );
}

export function ValidateStep({
  state,
  dispatch,
  onRerun,
}: {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  onRerun: () => void;
}) {
  const ids = useId();
  const result = state.result;
  if (!result) {
    return (
      <EmptyState title="Not validated yet">
        <button type="button" onClick={onRerun} className={cx(BUTTON_PRIMARY, "mt-2")}>
          Run validation
        </button>
      </EmptyState>
    );
  }

  const counts = countIssues(result.issues);
  const { summary, tournament } = result;
  const matchesPlayed = tournament ? tournament.matches.filter((match) => match.player2Id !== null).length : summary.matches;
  const filter = state.issueFilter;
  const filtered = filterIssues(result.issues, filter);
  const groups = groupIssuesBySeverity(filtered);
  const sources = issueSourceOptions(result.issues);
  const setFilter = (next: Partial<IssueFilter>) => dispatch({ type: "setIssueFilter", filter: next });
  const severityOptions: Array<{ value: IssueFilter["severity"]; label: string; count: number }> = [
    { value: "all", label: "All", count: result.issues.length },
    ...SEVERITIES.map((severity) => ({ value: severity, label: SEVERITY_LABEL[severity].many, count: counts[severity] })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatusBanner counts={counts} assembled={tournament !== null} />

      {tournament && (
        <p className="text-sm text-ash-300">
          <span className="font-semibold text-white">{tournament.name}</span>
          <span className="text-ash-500"> · </span>
          <span className="break-all font-mono text-xs text-ash-400">{tournament.id}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Players" value={formatNumber(summary.players)} />
        <StatTile label="Matches" value={formatNumber(matchesPlayed)} detail="Byes not counted" />
        <StatTile label="Decklists" value={formatNumber(summary.decklists)} />
        <StatTile label="Unknown cards" value={formatNumber(summary.unknownCards)} detail={summary.unknownCards > 0 ? "Listed as errors" : "Every card matched"} />
        <StatTile label="Decks from names" value={formatNumber(summary.archetypesFromLabel)} detail="Reported deck label" />
        <StatTile label="Decks from lists" value={formatNumber(summary.archetypesInferred)} detail="Classified by cards" />
        <StatTile label="Rogue" value={formatNumber(summary.rogue)} detail="No known archetype" />
      </div>

      <section id={VALIDATION_ISSUES_ID} tabIndex={-1} aria-labelledby={`${ids}-issues`} className="flex flex-col gap-4 rounded-md focus:outline-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h3 id={`${ids}-issues`} className="text-base font-bold text-white">
            Issues <span className="font-normal text-ash-400">({formatNumber(result.issues.length)})</span>
          </h3>
          {result.issues.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div role="group" aria-label="Filter by severity" className="flex flex-wrap gap-1">
                {severityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filter.severity === option.value}
                    onClick={() => setFilter({ severity: option.value })}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition",
                      filter.severity === option.value
                        ? "border-chakra-500 bg-shadow-700 text-white"
                        : "border-shadow-600 text-ash-300 hover:border-shadow-500 hover:text-white",
                      FOCUS_RING,
                    )}
                  >
                    {option.value !== "all" && <SeverityIcon severity={option.value} className="h-3.5 w-3.5" />}
                    {option.label}
                    <span className="tabular-nums text-ash-400">{formatNumber(option.count)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`${ids}-source`} className="text-xs text-ash-400">
                  Source
                </label>
                <select
                  id={`${ids}-source`}
                  value={filter.source}
                  onChange={(event) => setFilter({ source: event.target.value as IssueFilter["source"] })}
                  className={FIELD_SM}
                >
                  <option value="all">All sources</option>
                  {sources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label} ({formatNumber(source.count)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {result.issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ash-200">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-status-good" />
            No issues: every name, record and card checked out.
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No issues match these filters">
            <button type="button" onClick={() => setFilter({ severity: "all", source: "all" })} className={cx(BUTTON_GHOST_SM, "mt-1")}>
              Clear filters
            </button>
          </EmptyState>
        ) : (
          SEVERITIES.filter((severity) => groups[severity].length > 0).map((severity) => (
            <IssueGroup key={`${severity}-${filter.source}`} severity={severity} issues={groups[severity]} />
          ))
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRerun} className={BUTTON_GHOST_SM}>
          Validate again
        </button>
        <p className="text-xs text-ash-400">Fixed something in your files? Go back to Source, remove them and add the new versions.</p>
      </div>
    </div>
  );
}
