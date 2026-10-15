import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeckDirectoryFallback } from "@/components/directory/deck-directory";
import { PAGE_SIZE, cardOptionsFor } from "@/components/directory/decks";
import { getAllPlayerHandles, getDeckSummaries, getPlayerProfile } from "@/lib/decks/repository";
import { formatNumber } from "@/lib/format";
import { ImportedPlayerLoader } from "./imported-player-loader";
import { ProfileView } from "./profile-view";
import { totalUpvotes } from "./upvotes-tile";

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
    // The server renders the seed total; this browser's votes are added after hydration.
    const seedUpvotes = author.decks.filter((d) => d.source === "community").reduce((sum, d) => sum + d.votes, 0);
    expect(html).toMatch(new RegExp(`Upvotes</div><div[^>]*>${formatNumber(seedUpvotes)}</div>`));
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

describe("totalUpvotes", () => {
  it("adds this browser's votes to the seed votes, as the deck cards do", () => {
    const decks = [
      { id: "community--a", votes: 10 },
      { id: "community--b", votes: 5 },
    ];
    expect(totalUpvotes(decks, {})).toBe(15);
    expect(totalUpvotes(decks, { "community--a": 1, "community--b": -1, "community--other": 1 })).toBe(15);
    expect(totalUpvotes(decks, { "community--a": 1 })).toBe(16);
    expect(totalUpvotes([], { "community--a": 1 })).toBe(0);
    expect(totalUpvotes([{ id: "constructor", votes: 3 }], {})).toBe(3);
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
