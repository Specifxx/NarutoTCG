/**
 * Regenerates the committed seed events: one JSON file per event in data/seed/tournaments/.
 * Run: `cd apps/decks && npx tsx scripts/generate-seed.ts` (or `pnpm seed`).
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSeedTournaments } from "@/lib/seed/generate";
import { serializeTournament } from "@/lib/seed/serialize";

const outDir = fileURLToPath(new URL("../data/seed/tournaments/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const tournaments = generateSeedTournaments();
const keep = new Set(tournaments.map((t) => `${t.id}.json`));
for (const file of readdirSync(outDir)) {
  if (file.endsWith(".json") && !keep.has(file)) rmSync(join(outDir, file));
}

let totalBytes = 0;
for (const tournament of tournaments) {
  const json = serializeTournament(tournament);
  writeFileSync(join(outDir, `${tournament.id}.json`), json);
  totalBytes += Buffer.byteLength(json);
  const lists = tournament.players.filter((p) => p.decklist).length;
  console.log(
    `${tournament.id.padEnd(38)} ${String(tournament.players.length).padStart(4)} players ${String(tournament.matches.length).padStart(5)} matches ${String(lists).padStart(3)} lists`,
  );
}
console.log(`Wrote ${tournaments.length} events to ${outDir} (${(totalBytes / 1024).toFixed(1)} KiB)`);
