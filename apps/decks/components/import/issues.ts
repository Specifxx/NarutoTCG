import type { IngestIssue, IngestSeverity, IngestSource } from "@/lib/ingest/types";

/** Issues without a source (e.g. "no players found") filter under this key. */
export type IssueSourceKey = IngestSource | "general";

export interface IssueFilter {
  severity: IngestSeverity | "all";
  source: IssueSourceKey | "all";
}

export const DEFAULT_ISSUE_FILTER: IssueFilter = { severity: "all", source: "all" };

export const SEVERITIES: readonly IngestSeverity[] = ["error", "warning", "info"];

export const SEVERITY_LABEL: Record<IngestSeverity, { one: string; many: string }> = {
  error: { one: "Error", many: "Errors" },
  warning: { one: "Warning", many: "Warnings" },
  info: { one: "Info", many: "Info" },
};

export const SOURCE_LABEL: Record<IssueSourceKey, string> = {
  json: "JSON file",
  standings: "Standings",
  pairings: "Pairings",
  decklists: "Decklists",
  meta: "Event details",
  tournament: "Assembled event",
  general: "General",
};

const SOURCE_ORDER: readonly IssueSourceKey[] = ["json", "meta", "standings", "pairings", "decklists", "tournament", "general"];

export function issueSourceKey(issue: IngestIssue): IssueSourceKey {
  return issue.source ?? "general";
}

/** Sources present in `issues`, in a fixed order, with their issue counts (for the source filter). */
export function issueSourceOptions(issues: readonly IngestIssue[]): Array<{ value: IssueSourceKey; label: string; count: number }> {
  const counts = new Map<IssueSourceKey, number>();
  for (const issue of issues) counts.set(issueSourceKey(issue), (counts.get(issueSourceKey(issue)) ?? 0) + 1);
  return SOURCE_ORDER.filter((key) => counts.has(key)).map((key) => ({ value: key, label: SOURCE_LABEL[key], count: counts.get(key)! }));
}

export function filterIssues(issues: readonly IngestIssue[], filter: IssueFilter): IngestIssue[] {
  return issues.filter(
    (issue) =>
      (filter.severity === "all" || issue.severity === filter.severity) &&
      (filter.source === "all" || issueSourceKey(issue) === filter.source),
  );
}

/** Issues split by severity, each group in its original order. */
export function groupIssuesBySeverity(issues: readonly IngestIssue[]): Record<IngestSeverity, IngestIssue[]> {
  const groups: Record<IngestSeverity, IngestIssue[]> = { error: [], warning: [], info: [] };
  for (const issue of issues) groups[issue.severity].push(issue);
  return groups;
}
