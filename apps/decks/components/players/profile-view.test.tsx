import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeckDirectoryFallback } from "@/components/directory/deck-directory";
import { PAGE_SIZE, cardOptionsFor } from "@/components/directory/decks";
import { getAllPlayerHandles, getDeckSummaries, getPlayerProfile } from "@/lib/decks/repository";
import { ImportedPlayerLoader } from "./imported-player-loader";
import { ProfileView } from "./profile-view";

const profiles = getAllPlayerHandles().map((handle) => getPlayerProfile(handle)!);
const pilot = profiles.find((profile) => !profile.isAuthor && profile.decks.length > 0 && profile.results.length > 1)!;
const author = profiles.find((profile) => profile.isAuthor && profile.results.length === 0)!;
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("ProfileView server render", () => {
  it("renders a pilot's KPIs, archetypes, history and decks", () => {
    const html = renderToString(<ProfileView profile={pilot} tiers={{}} />);
    expect(count(html, /<h1/g)).toBe(1);
    expect(html).toContain(pilot.name);
    for (const id of ["archetypes", "history", "decks"]) expect(html).toContain(`id="${id}"`);
    for (const label of ["Events", "Record", "Match win rate", "Top cuts", "Event wins", "Best finish"]) expect(html).toContain(label);
    for (const result of pilot.results) expect(html).toContain(`/tournaments/${encodeURIComponent(result.tournamentId)}`);
    expect(count(html, /<article/g)).toBe(pilot.decks.length);
    expect(html).toContain("Fictional demo profile");
  });

  it("renders an author without results with author tiles and no history", () => {
    const html = renderToString(<ProfileView profile={author} tiers={{}} />);
    expect(html).toContain("Author");
    expect(html).toContain("Published decks");
    expect(html).not.toContain('id="history"');
    expect(html).not.toContain('href="#history"');
  });

  it("labels imported profiles as browser-only data", () => {
    const html = renderToString(<ProfileView profile={{ ...pilot, decks: [] }} tiers={{}} origin="imported" />);
    expect(html).toContain("Imported player");
    expect(html).toContain("imported in this browser");
    expect(html).not.toContain("Fictional demo profile");
  });
});

describe("ImportedPlayerLoader server render", () => {
  it("renders a loading status until storage is readable", () => {
    const html = renderToString(<ImportedPlayerLoader handle="someone" tiers={{}} />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Player not found");
  });
});

describe("DeckDirectoryFallback server render", () => {
  it("renders the featured strip and the first page of results with inert controls", () => {
    const decks = [...getDeckSummaries()];
    const html = renderToString(<DeckDirectoryFallback decks={decks} tiers={{}} cards={cardOptionsFor(decks)} />);
    expect(html).toContain("Featured");
    expect(count(html, /<article/g)).toBe(PAGE_SIZE + 6);
    expect(html).toContain(`${decks.length}</span> <!-- -->decks`);
    expect(html).toMatch(/<input[^>]*type="search"[^>]*disabled=""/);
  });
});
