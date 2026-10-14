/**
 * Validate seed / imported JSON without starting Next.js.
 *
 *   pnpm --filter @naruto-tcg/events validate:data
 *   pnpm --filter @naruto-tcg/events validate:data -- --events ./extracted-events.json --stores ./extracted-stores.json
 *
 * Paths default to `data/*.json`. Exits non-zero and lists every issue on failure.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeEvents, normalizeStore } from "../lib/data/normalize";
import { SeedValidationError, validateEvents, validateMilestones, validatePlaces, validateStores } from "../lib/data/validate";

const root = resolve(import.meta.dirname, "..");
// pnpm runs scripts from the package directory; INIT_CWD is where the user invoked it.
const invokedFrom = process.env.INIT_CWD ?? process.cwd();
const args = process.argv.slice(2);
const pathFor = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? resolve(invokedFrom, args[i + 1]) : resolve(root, "data", `${name}.json`);
};
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

try {
  const storeSeeds = validateStores(readJson(pathFor("stores")));
  const stores = storeSeeds.map(normalizeStore);
  const events = normalizeEvents(validateEvents(readJson(pathFor("events")), storeSeeds), new Map(stores.map((s) => [s.slug, s])));
  const places = validatePlaces(readJson(pathFor("places")));
  // The bundled milestones reference bundled event ids, so skip them when checking an imported events file alone.
  const checkMilestones = !args.includes("--events") || args.includes("--milestones");
  const milestones = checkMilestones
    ? validateMilestones(readJson(pathFor("milestones")), new Set(events.map((e) => e.id)))
    : [];

  const count = <T,>(items: T[], key: (item: T) => string) =>
    Object.entries(items.reduce<Record<string, number>>((acc, item) => ((acc[key(item)] = (acc[key(item)] ?? 0) + 1), acc), {}))
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

  console.log(`✓ ${stores.length} stores (${count(stores, (s) => s.region)}; ${stores.filter((s) => !s.verified).length} unverified)`);
  console.log(`✓ ${events.length} events after recurrence expansion (${count(events, (e) => e.type)})`);
  console.log(`  regions: ${count(events, (e) => e.region)}`);
  console.log(`  statuses: ${count(events, (e) => e.status)}`);
  console.log(`  range: ${events[0]?.startsAt} → ${events.at(-1)?.startsAt}`);
  console.log(`✓ ${places.length} gazetteer places`);
  console.log(checkMilestones ? `✓ ${milestones.length} milestones` : "- milestones skipped (pass --milestones to check them)");

  // Soft checks: things that are valid but probably mistakes.
  const warnings: string[] = [];
  for (const e of events) {
    const hours = (Date.parse(e.endsAt) - Date.parse(e.startsAt)) / 3_600_000;
    if (hours > 96) warnings.push(`${e.id} lasts ${hours.toFixed(0)}h`);
  }
  for (const s of stores) {
    const nearest = places.reduce(
      (best, p) => Math.min(best, Math.hypot(p.lat - s.location.lat, (p.lng - s.location.lng) * Math.cos((s.location.lat * Math.PI) / 180))),
      Infinity,
    );
    if (nearest > 0.5) warnings.push(`store ${s.slug} is ~${Math.round(nearest * 111)} km from any gazetteer place`);
  }
  if (warnings.length) console.warn(`! ${warnings.length} warning(s):\n  - ${warnings.join("\n  - ")}`);
} catch (error) {
  if (error instanceof SeedValidationError) {
    console.error(`✗ ${error.message}`);
  } else {
    console.error("✗", error);
  }
  process.exit(1);
}
