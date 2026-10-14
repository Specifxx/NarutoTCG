import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { readFixture, readTemplate, templateMeta, templateTournament } from "./__fixtures__/files";
import { ingestCsv, ingestJson } from "./pipeline";
import type { IngestIssue, IngestResult } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";

const standingsCsv = () => readTemplate("standings-template.csv");
const pairingsCsv = () => readTemplate("pairings-template.csv");
const decklistsCsv = () => readTemplate("decklists-template.csv");

const codes = (issues: readonly IngestIssue[], severity?: IngestIssue["severity"]) =>
  issues.filter((issue) => !severity || issue.severity === severity).map((issue) => issue.code);

/** Drops the CSV column at `index` from every line. */
const dropColumn = (text: string, index: number) =>
  text
    .trimEnd()
    .split("\n")
    .map((line) => line.split(",").filter((_, i) => i !== index).join(","))
    .join("\n");

/** Rewrites data lines of a CSV (header kept). */
const mapLines = (text: string, fn: (cells: string[]) => string[]) => {
  const [header, ...lines] = text.trimEnd().split("\n");
  return [header, ...lines.map((line) => fn(line.split(",")).join(","))].join("\n");
};

const expected = (): Tournament => ({ ...templateTournament(), importedAt: NOW });

function ingestTemplates(overrides: Partial<Parameters<typeof ingestCsv>[0]> = {}): IngestResult {
  return ingestCsv({
    meta: templateMeta(),
    standings: { text: standingsCsv() },
    pairings: { text: pairingsCsv() },
    decklists: { text: decklistsCsv() },
    now: NOW,
    ...overrides,
  });
}

describe("templates", () => {
  it("ingests the CSV set with no issues into the canonical template", () => {
    const result = ingestTemplates();
    expect(result.issues).toEqual([]);
    expect(result.tournament).toEqual(expected());
    expect(result.summary).toEqual({
      players: 8,
      matches: 15,
      decklists: 4,
      archetypesFromLabel: 8,
      archetypesInferred: 0,
      rogue: 1,
      unknownCards: 0,
    });
  });

  it("ingests the standings alone", () => {
    const result = ingestCsv({ meta: templateMeta(), standings: { text: standingsCsv() }, now: NOW });
    expect(codes(result.issues)).toEqual(["no-pairings"]);
    const t = result.tournament!;
    expect(t.matches).toEqual([]);
    expect(t.players.map((p) => [p.id, p.placement, p.archetypeId])).toEqual(expected().players.map((p) => [p.id, p.placement, p.archetypeId]));
    expect(t.players.every((p) => !p.decklist)).toBe(true);
  });

  it("ingests the pairings alone, placing players by their results", () => {
    const result = ingestCsv({ meta: templateMeta(), pairings: { text: pairingsCsv() }, now: NOW });
    expect(codes(result.issues, "error")).toEqual([]);
    expect(codes(result.issues)).toEqual(["missing-archetype", "players-from-pairings"]);
    const t = result.tournament!;
    expect(t.players.map((p) => p.name)).toEqual(["Kenji Morrow", "Priya Castellane", "Juniper Aldana", "Odette Nwosu", "Bram Ohlsson", "Zoe Marchetti", "Felix Arkwright", "Dmitri Halvorsen"]);
    expect(t.players.map((p) => p.placement)).toEqual(expected().players.map((p) => p.placement));
    expect(t.players.every((p) => p.archetypeId === "rogue")).toBe(true);
    expect(t.players.find((p) => p.name === "Zoe Marchetti")!.id).toBe("zoe-marchetti");
  });

  it("ingests the canonical JSON template", () => {
    const result = ingestJson(readTemplate("tournament-template.json"), { now: NOW });
    expect(result.issues).toEqual([]);
    expect(result.tournament).toEqual(expected());
    expect(result.summary).toMatchObject({ players: 8, matches: 15, decklists: 4, archetypesFromLabel: 8 });
  });

  it("ingests the scraped JSON template into the same event", () => {
    const result = ingestJson(readTemplate("scraped-template.json"), { now: NOW });
    expect(result.issues).toEqual([]);
    const t = result.tournament!;
    const reference = expected();
    expect(t.players).toEqual(reference.players);
    expect({ ...t, players: [], matches: [], notes: undefined }).toEqual({ ...reference, players: [], matches: [], notes: undefined });
    expect(t.notes).toContain("Source: https://example.com/events/riverbend-sc-2026-09-12");
    // The winner-only row carries no game score; everything else matches exactly.
    const withoutGames = (m: Tournament["matches"][number]) => ({ ...m, games: undefined });
    expect(t.matches.map(withoutGames)).toEqual(reference.matches.map(withoutGames));
    expect(t.matches.filter((m) => !m.games && m.outcome !== "bye" && !m.intentionalDraw)).toHaveLength(1);
  });
});

describe("malformed CSV set", () => {
  const result = ingestCsv({
    meta: JSON.parse(readFixture("bad-meta.json")),
    standings: { text: readFixture("bad-standings.csv") },
    pairings: { text: readFixture("bad-pairings.csv") },
    decklists: { text: readFixture("bad-decklists.csv") },
    now: NOW,
  });
  const find = (code: string) => result.issues.filter((issue) => issue.code === code);

  it("still assembles the event", () => {
    const t = result.tournament!;
    expect(t.id).toBe("local-fixture-store-championship-lantern-row-2026-08-22");
    expect(t.format).toBe("Standard (NT01–NT04)");
    // Recomputed placements: Tobiah, Wren and Ansel all have 3 points; Tobiah's opponents did best.
    expect(t.players.map((p) => p.id)).toEqual(["hollis-brandvold", "marisol-teague", "tobiah-renner", "wren-ishikawa-doyle", "ansel-kirkby"]);
    expect(t.matches).toHaveLength(8);
    expect(t.swissRounds).toBe(3);
    expect(t.topCutSize).toBe(0);
  });

  it("reports the expected issues", () => {
    expect(new Set(codes(result.issues, "error"))).toEqual(new Set(["duplicate-player", "unknown-player", "unknown-card"]));
    expect(new Set(codes(result.issues, "warning"))).toEqual(
      new Set(["player-fuzzy-match", "card-fuzzy-match", "placements-recomputed", "record-mismatch", "decklist-illegal"]),
    );
    expect(result.issues.slice(0, 3).every((issue) => issue.severity === "error")).toBe(true);
  });

  it("locates each issue", () => {
    expect(find("duplicate-player")).toEqual([expect.objectContaining({ source: "standings", row: 5 })]);
    expect(find("duplicate-player")[0]!.message).toContain("rows 1 and 5");
    expect(find("unknown-player")).toEqual([expect.objectContaining({ source: "pairings", row: 3, field: "player2" })]);
    expect(find("unknown-player")[0]!.message).toContain('"Ghost Player"');
    expect(find("player-fuzzy-match")[0]).toMatchObject({ source: "pairings", row: 8, message: 'Matched "Marisol Teage" to Marisol Teague.' });
    expect(find("unknown-card")).toEqual([expect.objectContaining({ source: "decklists", row: 17 })]);
    expect(find("card-fuzzy-match").map((i) => [i.row, i.message])).toEqual([
      [2, 'Hollis Brandvold: read "Konnan" as Konan (NT02-009).'],
      [8, 'Hollis Brandvold: read "Planetary Devastaton" as Planetary Devastation (NT02-015).'],
    ]);
    const ansel = find("record-mismatch").find((i) => i.row === 3)!;
    expect(ansel.message).toBe("Ansel Kirkby: the standings say 2-1 but the pairings give 1-2.");
  });

  it("keeps the readable part of the decklist and summarizes", () => {
    const hollis = result.tournament!.players.find((p) => p.id === "hollis-brandvold")!;
    expect(hollis.archetypeId).toBe("akatsuki-pain");
    expect(hollis.decklist!.leaderId).toBe("NT02-L02");
    expect(hollis.decklist!.cards.reduce((sum, e) => sum + e.quantity, 0)).toBe(48);
    expect(result.summary).toMatchObject({ players: 5, matches: 8, decklists: 1, unknownCards: 1 });
  });
});

describe("stage and round inference", () => {
  const meta = () => ({ ...templateMeta(), swissRounds: undefined, topCutSize: undefined });

  it("infers a trailing bracket when there is no stage information", () => {
    const result = ingestTemplates({ meta: meta(), pairings: { text: dropColumn(pairingsCsv(), 5) } });
    expect(codes(result.issues)).toEqual(["stage-inferred"]);
    expect(result.tournament!.matches).toEqual(expected().matches);
    expect(result.tournament).toMatchObject({ swissRounds: 3, topCutSize: 4 });
  });

  it("uses meta.swissRounds as the boundary", () => {
    const result = ingestTemplates({ meta: { ...meta(), swissRounds: 3 }, pairings: { text: dropColumn(pairingsCsv(), 5) } });
    expect(result.issues).toEqual([]);
    expect(result.tournament!.matches).toEqual(expected().matches);
  });

  it("reads top cut round labels", () => {
    const labels: Record<string, string> = { "4": "Semifinals", "5": "Finals" };
    const text = mapLines(dropColumn(pairingsCsv(), 5), ([round, ...rest]) => [labels[round!] ?? round!, ...rest]);
    const result = ingestTemplates({ meta: meta(), pairings: { text } });
    expect(result.issues).toEqual([]);
    expect(result.tournament!.matches).toEqual(expected().matches);
    expect(result.tournament!.topCutSize).toBe(4);
  });

  it("does not read a Swiss round thinned by drops as a bracket round", () => {
    // Fay and Jun drop after round 2, so round 3 seats 8 of the 10 players with no bye. Eli lost
    // round 3 but made the top 4, so round 3 cannot be a quarterfinal feeding the semifinals.
    const pairings = [
      "Round,Player 1,Player 2,Result",
      "1,Ana,Ben,2-0", "1,Cal,Dee,2-0", "1,Eli,Fay,2-0", "1,Gus,Hal,2-0", "1,Ivy,Jun,2-0",
      "2,Ana,Cal,2-0", "2,Eli,Gus,2-0", "2,Ivy,Ben,2-0", "2,Dee,Fay,2-0", "2,Hal,Jun,2-0",
      "3,Ana,Eli,2-0", "3,Ivy,Cal,2-0", "3,Gus,Ben,2-0", "3,Hal,Dee,2-0",
      "4,Ana,Gus,2-0", "4,Ivy,Eli,2-0",
      "5,Ana,Ivy,2-1",
    ].join("\n");
    const result = ingestCsv({ meta: meta(), pairings: { text: pairings }, now: NOW });
    const t = result.tournament!;
    expect(t).toMatchObject({ swissRounds: 3, topCutSize: 4 });
    expect(t.matches.filter((m) => m.stage === "top-cut").map((m) => m.round)).toEqual([4, 4, 5]);
    expect(result.issues.find((i) => i.code === "stage-inferred")!.message).toContain("Rounds 4–5");
    expect(t.players.slice(0, 4).map((p) => p.name)).toEqual(["Ana", "Ivy", "Eli", "Gus"]);
  });

  it("renumbers top cut rounds that restart at 1", () => {
    const text = mapLines(pairingsCsv(), (cells) => (cells[5] === "Top Cut" ? [String(Number(cells[0]) - 3), ...cells.slice(1)] : cells));
    const result = ingestTemplates({ meta: meta(), pairings: { text } });
    expect(codes(result.issues)).toEqual(["top-cut-renumbered"]);
    expect(result.tournament!.matches).toEqual(expected().matches);
  });
});

describe("archetypes", () => {
  it("classifies from decklists when there is no deck column", () => {
    const result = ingestTemplates({ standings: { text: dropColumn(standingsCsv(), 4) } });
    expect(codes(result.issues)).toEqual(["missing-archetype"]);
    expect(result.issues[0]!.message).toContain("4 players (Bram Ohlsson, Zoë Marchetti, Felix Arkwright, Dmitri Halvorsen)");
    expect(result.summary).toMatchObject({ archetypesFromLabel: 0, archetypesInferred: 4, rogue: 4 });
    expect(result.tournament!.players.slice(0, 4).map((p) => p.archetypeId)).toEqual(expected().players.slice(0, 4).map((p) => p.archetypeId));
  });

  it("keeps the label but flags a list that clearly says otherwise", () => {
    const text = standingsCsv().replace("Kenji Morrow,kmorrow,US,Sage Naruto", "Kenji Morrow,kmorrow,US,Gaara");
    const result = ingestTemplates({ standings: { text } });
    expect(codes(result.issues)).toEqual(["archetype-mismatch"]);
    expect(result.issues[0]).toMatchObject({ source: "standings", row: 1, message: "Kenji Morrow: reported as Sand Coffin Gaara but the decklist looks like Uzumaki Sage Mode." });
    expect(result.tournament!.players[0]!.archetypeId).toBe("sand-gaara");
  });

  it("falls back to the classifier for unknown labels", () => {
    const text = standingsCsv().replace("Sage Naruto", "Frog Pile").replace("Itachi", "Mystery Deck");
    const result = ingestTemplates({ standings: { text } });
    expect(codes(result.issues)).toEqual(["unknown-archetype-label", "unknown-archetype-label"]);
    expect(result.issues.map((i) => i.message)).toEqual([
      'Kenji Morrow: unknown deck "Frog Pile"; classified from the decklist as Uzumaki Sage Mode.',
      'Bram Ohlsson: unknown deck "Mystery Deck"; recorded as Rogue.',
    ]);
    expect(result.summary).toMatchObject({ archetypesFromLabel: 7, archetypesInferred: 1, rogue: 2 });
  });

  it("warns about fuzzy labels", () => {
    const result = ingestTemplates({ standings: { text: standingsCsv().replace("Uchiha Avenger", "Uchiha Avengr") } });
    expect(codes(result.issues)).toEqual(["archetype-fuzzy-match"]);
    expect(result.tournament!.players[1]!.archetypeId).toBe("uchiha-avenger");
  });
});

describe("decklists", () => {
  it("reads a decklist column in the standings", () => {
    const standings = "Player,Deck,Decklist\nHollis Brandvold,Pain,\"Leader: Pain — Deva Path; 4 Konan; 4 Asura Path\"\nMarisol Teague,Gaara,\n";
    const result = ingestCsv({ meta: templateMeta(), standings: { text: standings }, now: NOW });
    expect(result.tournament!.players[0]!.decklist).toEqual({
      leaderId: "NT02-L02",
      cards: [
        { cardId: "NT02-009", quantity: 4 },
        { cardId: "NT02-010", quantity: 4 },
      ],
    });
    expect(codes(result.issues)).toEqual(["decklist-illegal", "no-pairings"]);
  });

  it("prefers the decklists file over a decklist cell", () => {
    const standings = standingsCsv()
      .replace("Placement,", "Decklist,Placement,")
      .split("\n")
      .map((line, i) => (i === 0 || !line ? line : `${i === 1 ? '"1 Pain; 4 Konan"' : ""},${line}`))
      .join("\n");
    const result = ingestTemplates({ standings: { text: standings } });
    expect(codes(result.issues)).toEqual(["duplicate-decklist"]);
    expect(result.tournament!.players[0]!.decklist).toEqual(expected().players[0]!.decklist);
  });

  it("matches decklist rows by Player ID and skips unknown players once", () => {
    const text = decklistsCsv().replaceAll("Kenji Morrow,", "kmorrow,").replaceAll("Odette Nwosu,", "Odette Nowsu-Smith,");
    const result = ingestTemplates({ decklists: { text } });
    expect(codes(result.issues)).toEqual(["unknown-player"]);
    expect(result.issues[0]).toMatchObject({ source: "decklists", field: "player", suggestion: 'Did you mean "Odette Nwosu"?' });
    expect(result.tournament!.players[0]!.decklist).toEqual(expected().players[0]!.decklist);
    expect(result.tournament!.players[3]!.decklist).toBeUndefined();
  });

  it("skips decklist rows without a player name with a warning", () => {
    const text = decklistsCsv().replace("\nKenji Morrow,Character,2,Iruka Umino", "\n,Character,2,Iruka Umino");
    const result = ingestTemplates({ decklists: { text } });
    expect(codes(result.issues, "error")).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({ severity: "warning", code: "missing-player-name", source: "decklists", row: 2 }));
  });
});

describe("players and results", () => {
  const meta = () => ({ ...templateMeta(), swissRounds: 1, topCutSize: 0 });

  it("refers to players by Player ID in the pairings", () => {
    const text = mapLines(pairingsCsv(), (cells) => cells.map((c) => (c === "Kenji Morrow" ? "kmorrow" : c === "Felix Arkwright" ? "FArkwright" : c)));
    expect(ingestTemplates({ pairings: { text } }).issues).toEqual([]);
  });

  it("reports names shared by two players", () => {
    const standings = "Player,Player ID\nAlex Varga,alex-v1\nAlex Varga,alex-v2\nNoor Haddad,noor\n";
    const pairings = "Round,Player 1,Player 2,Result\n1,Alex Varga,Noor Haddad,2-0\n1,alex-v2,,bye\n";
    const result = ingestCsv({ meta: meta(), standings: { text: standings }, pairings: { text: pairings }, now: NOW });
    expect(codes(result.issues, "error")).toEqual(["ambiguous-player"]);
    expect(result.tournament!.players.map((p) => p.id).sort()).toEqual(["alex-v1", "alex-v2", "noor"]);
    expect(result.tournament!.matches).toEqual([{ round: 1, stage: "swiss", player1Id: "alex-v2", player2Id: null, outcome: "bye" }]);
  });

  it("does not guess between players a misspelling is equally close to", () => {
    const standings = "Player,Player ID\nRowan Quill,\nRowen Quill,\nAlex Varga,alex-v1\nAlex Varga,alex-v2\nNoor Haddad,\n";
    const pairings = "Round,Player 1,Player 2,Result\n1,Rowin Quill,Noor Haddad,2-0\n1,Alex Vargas,Rowen Quill,2-0\n1,Rowin Quill,,bye\n";
    const result = ingestCsv({ meta: meta(), standings: { text: standings }, pairings: { text: pairings }, now: NOW });
    expect(codes(result.issues, "error")).toEqual(["ambiguous-player", "ambiguous-player"]);
    expect(result.issues.filter((i) => i.code === "ambiguous-player").map((i) => [i.row, i.field])).toEqual([
      [1, "player1"],
      [2, "player1"],
    ]);
    expect(result.issues[0]!.message).toBe('"Rowin Quill" is close to more than one player (Rowan Quill and Rowen Quill); rows with this name were skipped.');
    expect(codes(result.issues)).not.toContain("player-fuzzy-match");
    expect(result.tournament!.matches).toEqual([]);
  });

  it("reads winners, byes listed first and skips unreadable rows", () => {
    const standings = "Player\nHollis Brandvold\nMarisol Teague\nAnsel Kirkby\n";
    const pairings = [
      "Round,Table,Player 1,Player 2,Result,Winner",
      "1,1,Hollis Brandvold,Marisol Teague,,Marisol Teague",
      "1,,BYE,Ansel Kirkby,,",
      "2,1,Hollis Brandvold,Ansel Kirkby,forfeit,",
      "two,1,Marisol Teague,Ansel Kirkby,2-0,",
      "2,1,Marisol Teague,Ansel Kirkby,bye,",
    ].join("\n");
    const result = ingestCsv({ meta: meta(), standings: { text: standings }, pairings: { text: pairings }, now: NOW });
    expect(codes(result.issues, "error")).toEqual(["invalid-result", "invalid-round", "invalid-bye"]);
    expect(result.issues.find((i) => i.code === "invalid-result")).toMatchObject({ row: 3, field: "result" });
    expect(result.tournament!.matches).toEqual([
      { round: 1, stage: "swiss", table: 1, player1Id: "hollis-brandvold", player2Id: "marisol-teague", outcome: "p2" },
      { round: 1, stage: "swiss", player1Id: "ansel-kirkby", player2Id: null, outcome: "bye" },
    ]);
  });

  it("recomputes placements that are not a clean 1..N", () => {
    const text = mapLines(standingsCsv(), (cells) => [cells[0] === "4" ? "3" : cells[0]!, ...cells.slice(1)]);
    const result = ingestTemplates({ standings: { text } });
    expect(codes(result.issues)).toEqual(["placements-recomputed"]);
    expect(result.tournament!.players).toEqual(expected().players);
  });

  it("cross-checks reported points", () => {
    const text = mapLines(standingsCsv(), (cells) => (cells[1] === "Bram Ohlsson" ? [...cells.slice(0, 6), "7", ...cells.slice(7)] : cells));
    const result = ingestTemplates({ standings: { text } });
    expect(result.issues).toEqual([expect.objectContaining({ code: "points-mismatch", row: 5, field: "points" })]);
  });
});

describe("column mapping", () => {
  it("uses an explicit mapping", () => {
    const standings = "Pos,Who,Build\n1,Hollis Brandvold,Pain\n2,Marisol Teague,Gaara\n";
    const result = ingestCsv({
      meta: templateMeta(),
      standings: { text: standings, mapping: { placement: "Pos", player: "Who", archetype: "Build" } },
      now: NOW,
    });
    expect(codes(result.issues)).toEqual(["no-pairings"]);
    expect(result.tournament!.players.map((p) => [p.name, p.placement, p.archetypeId])).toEqual([
      ["Hollis Brandvold", 1, "akatsuki-pain"],
      ["Marisol Teague", 2, "sand-gaara"],
    ]);
  });

  it("rejects a file whose required columns are missing", () => {
    const result = ingestTemplates({ pairings: { text: pairingsCsv(), mapping: { round: "Round", player1: "Player 1", player2: "Player 2", result: "Score" } } });
    expect(codes(result.issues)).toEqual(["missing-column", "unknown-column", "no-pairings"]);
    expect(result.issues[0]!.message).toBe("The pairings file has no Result or Winner column, so it was not imported.");
    expect(result.tournament!.matches).toEqual([]);
  });

  it("does not map a repeated Player header to Player 1", () => {
    const pairings = "Round,Player,Player,Result\n1,Kenji Morrow,Bram Ohlsson,2-1\n";
    const result = ingestTemplates({ pairings: { text: pairings } });
    expect(codes(result.issues, "error")).toEqual(["missing-column"]);
    expect(codes(result.issues)).toContain("duplicate-column");
    expect(result.tournament!.matches).toEqual([]);
  });

  it("returns no tournament without players", () => {
    const result = ingestCsv({ meta: templateMeta(), decklists: { text: decklistsCsv() }, now: NOW });
    expect(result.tournament).toBeNull();
    expect(codes(result.issues)).toEqual(["no-players"]);
    expect(result.summary.players).toBe(0);
  });
});

describe("event meta", () => {
  it("derives the id and format and defaults importedAt", () => {
    const result = ingestTemplates({ meta: { ...templateMeta(), format: undefined, date: "2026-05-16", name: "Ichiraku Cup!! — Fall" }, now: undefined });
    const t = result.tournament!;
    expect(t.id).toBe("local-ichiraku-cup-fall-2026-05-16");
    expect(t.format).toBe("Standard (NT01–NT03)");
    expect(Date.parse(t.importedAt!)).not.toBeNaN();
    expect(t.source).toBe("import");
    expect(codes(result.issues)).toContain("decklist-illegal");
  });

  it("reports an invalid date", () => {
    const result = ingestCsv({ meta: { ...templateMeta(), date: "next Saturday" }, standings: { text: standingsCsv() }, now: NOW });
    expect(codes(result.issues, "error")).toEqual(["invalid-date"]);
    expect(result.tournament!.id).toBe("local-example-store-championship-riverbend-next-saturday");
  });
});

describe("ingestJson", () => {
  it("rejects unreadable input", () => {
    expect(ingestJson("{ not json")).toMatchObject({ tournament: null, issues: [{ code: "invalid-json", severity: "error" }] });
    expect(ingestJson('{"hello":"world"}')).toMatchObject({ tournament: null, issues: [{ code: "unknown-json-format" }] });
    const broken = { ...templateTournament(), players: [{ name: "No Id" }] };
    const result = ingestJson(JSON.stringify(broken));
    expect(result.tournament).toBeNull();
    expect(result.issues.every((i) => i.code === "schema" && i.field?.startsWith("players[0]."))).toBe(true);
  });

  it("accepts a BOM", () => {
    expect(ingestJson(String.fromCharCode(0xfeff) + readTemplate("tournament-template.json"), { now: NOW }).issues).toEqual([]);
  });

  it("prefixes ids, applies overrides and resolves loose archetype ids", () => {
    const source = templateTournament();
    const players = source.players.map((p, i) => (i === 0 ? { ...p, archetypeId: "Sage Naruto" } : i === 1 ? { ...p, archetypeId: "Banana" } : p));
    const result = ingestJson(JSON.stringify({ ...source, id: "riverbend-sc", source: "seed", players }), {
      now: NOW,
      metaOverrides: { name: "Renamed Cup", tier: "regional-championship", location: undefined },
    });
    const t = result.tournament!;
    expect(t).toMatchObject({ id: "local-riverbend-sc", name: "Renamed Cup", tier: "regional-championship", source: "import", importedAt: NOW });
    expect(t.location).toEqual(source.location);
    expect(t.players.slice(0, 2).map((p) => p.archetypeId)).toEqual(["uzumaki-sage", "uchiha-avenger"]);
    expect(codes(result.issues)).toEqual(["unknown-archetype-label"]);
    expect(result.issues[0]).toMatchObject({ source: "json", row: 2, field: "players[1].archetypeId" });
    expect(result.summary).toMatchObject({ archetypesFromLabel: 7, archetypesInferred: 1 });
  });

  it("validates canonical records", () => {
    const source = templateTournament();
    const result = ingestJson(JSON.stringify({ ...source, matches: source.matches.slice(0, -1) }), { now: NOW });
    expect(codes(result.issues)).toEqual(["partial-top-cut"]);
  });

  it("does not cross-check Swiss records against a bracket-only export", () => {
    const scraped = JSON.parse(readTemplate("scraped-template.json")) as { pairings: Array<{ stage?: string }> };
    const bracket = { ...scraped, pairings: scraped.pairings.filter((p) => p.stage !== "Swiss") };
    const result = ingestJson(JSON.stringify(bracket), { now: NOW });
    expect(result.issues).toEqual([]);
    expect(result.tournament!.matches).toEqual(expected().matches.filter((m) => m.stage === "top-cut"));
  });

  it("applies overrides to scraped exports", () => {
    const result = ingestJson(readTemplate("scraped-template.json"), { now: NOW, metaOverrides: { date: "2026-09-13", swissRounds: 3 } });
    expect(result.tournament).toMatchObject({ date: "2026-09-13", id: "local-example-store-championship-riverbend-2026-09-13" });
  });
});
