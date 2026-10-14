import { describe, expect, it } from "vitest";
import type { IngestIssue } from "@/lib/ingest/types";
import { DEFAULT_ISSUE_FILTER, filterIssues, groupIssuesBySeverity, issueSourceOptions } from "./issues";

const issues: IngestIssue[] = [
  { severity: "error", code: "a", message: "A", source: "pairings", row: 3 },
  { severity: "warning", code: "b", message: "B", source: "standings" },
  { severity: "warning", code: "c", message: "C", source: "pairings" },
  { severity: "info", code: "d", message: "D" },
];

describe("issue filters", () => {
  it("lists present sources in a fixed order with counts", () => {
    expect(issueSourceOptions(issues)).toEqual([
      { value: "standings", label: "Standings", count: 1 },
      { value: "pairings", label: "Pairings", count: 2 },
      { value: "general", label: "General", count: 1 },
    ]);
  });

  it("filters by severity and source", () => {
    expect(filterIssues(issues, DEFAULT_ISSUE_FILTER)).toHaveLength(4);
    expect(filterIssues(issues, { severity: "warning", source: "all" }).map((i) => i.code)).toEqual(["b", "c"]);
    expect(filterIssues(issues, { severity: "all", source: "pairings" }).map((i) => i.code)).toEqual(["a", "c"]);
    expect(filterIssues(issues, { severity: "warning", source: "pairings" }).map((i) => i.code)).toEqual(["c"]);
    expect(filterIssues(issues, { severity: "all", source: "general" }).map((i) => i.code)).toEqual(["d"]);
  });

  it("groups by severity", () => {
    const groups = groupIssuesBySeverity(issues);
    expect(groups.error).toHaveLength(1);
    expect(groups.warning.map((i) => i.code)).toEqual(["b", "c"]);
    expect(groups.info).toHaveLength(1);
  });
});
