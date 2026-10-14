import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { templateTournament } from "./__fixtures__/files";
import { detectJsonFormat, EventMetaOverridesSchema, EventMetaSchema, formatIssuePath, TournamentSchema, zodIssues, type SameType } from "./schema";

describe("TournamentSchema", () => {
  it("round-trips the canonical template unchanged", () => {
    const tournament = templateTournament();
    const parsed = TournamentSchema.parse(JSON.parse(JSON.stringify(tournament)));
    expect(parsed).toEqual(tournament);
    expect(JSON.stringify(TournamentSchema.parse(parsed))).toBe(JSON.stringify(parsed));
  });

  it("matches the domain type exactly, optional keys included (checked by tsc)", () => {
    const withoutImportedAt = TournamentSchema.omit({ importedAt: true });
    const exact: SameType<z.infer<typeof TournamentSchema>, Tournament> = true;
    // @ts-expect-error: a schema that drops an optional field no longer mirrors Tournament.
    const drifted: SameType<z.infer<typeof withoutImportedAt>, Tournament> = true;
    expect([exact, drifted]).toEqual([true, true]);
  });

  it("strips unknown keys", () => {
    const parsed = TournamentSchema.parse({ ...templateTournament(), extra: true });
    expect("extra" in parsed).toBe(false);
  });

  it("reports violations with readable paths", () => {
    const tournament = templateTournament();
    const broken = {
      ...tournament,
      bestOf: 2,
      players: tournament.players.map((p, i) => (i === 2 ? { ...p, placement: 0 } : p)),
      matches: tournament.matches.map((m, i) => (i === 0 ? { ...m, outcome: "won" } : m)),
    };
    const result = TournamentSchema.safeParse(broken);
    expect(result.success).toBe(false);
    const issues = zodIssues(result.error!, "json");
    expect(issues.map((i) => i.field).sort()).toEqual(["bestOf", "matches[0].outcome", "players[2].placement"]);
    for (const issue of issues) {
      expect(issue).toMatchObject({ severity: "error", code: "schema", source: "json" });
      expect(issue.message.startsWith(`${issue.field}: `)).toBe(true);
    }
  });

  it("requires null, not a missing value, for a bye's player 2", () => {
    const tournament = templateTournament();
    const bye = tournament.matches.findIndex((m) => m.outcome === "bye");
    const { player2Id: _, ...withoutPlayer2 } = tournament.matches[bye]!;
    const result = TournamentSchema.safeParse({ ...tournament, matches: tournament.matches.map((m, i) => (i === bye ? withoutPlayer2 : m)) });
    expect(result.success).toBe(false);
    expect(zodIssues(result.error!, "json")[0]!.field).toBe(`matches[${bye}].player2Id`);
  });
});

describe("EventMetaSchema", () => {
  it("defaults location and organizer", () => {
    expect(EventMetaSchema.parse({ name: " Fixture Cup ", date: "2026-08-22", tier: "online-open" })).toEqual({
      name: "Fixture Cup",
      date: "2026-08-22",
      tier: "online-open",
      location: {},
      organizer: "",
    });
  });

  it("requires a name, date and known tier", () => {
    const result = EventMetaSchema.safeParse({ name: "", tier: "worlds" });
    expect(result.success).toBe(false);
    expect(zodIssues(result.error!, "meta").map((i) => i.field).sort()).toEqual(["date", "name", "tier"]);
  });

  it("leaves unspecified override fields out", () => {
    expect(EventMetaOverridesSchema.parse({ date: "2026-08-23" })).toEqual({ date: "2026-08-23" });
  });
});

describe("detectJsonFormat", () => {
  it("tells canonical records from scraped exports", () => {
    expect(detectJsonFormat(templateTournament())).toBe("canonical");
    expect(detectJsonFormat({ event: { name: "x" }, standings: [] })).toBe("scraped");
    expect(detectJsonFormat({ event: { name: "x" } })).toBe("scraped");
    expect(detectJsonFormat({ players: [] })).toBe("unknown");
    expect(detectJsonFormat([templateTournament()])).toBe("unknown");
    expect(detectJsonFormat(null)).toBe("unknown");
    expect(detectJsonFormat("text")).toBe("unknown");
  });
});

describe("formatIssuePath", () => {
  it("joins keys and indexes", () => {
    expect(formatIssuePath(["players", 3, "decklist", "cards", 0, "quantity"])).toBe("players[3].decklist.cards[0].quantity");
    expect(formatIssuePath([])).toBe("");
  });

  it("prefixes nested paths", () => {
    const result = EventMetaSchema.safeParse({ name: "x", date: "2026-08-22", tier: "online-open", location: { online: "yes" } });
    expect(zodIssues(result.error!, "json", "event")[0]!.field).toBe("event.location.online");
  });
});
