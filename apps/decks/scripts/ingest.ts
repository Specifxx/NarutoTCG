/**
 * Validates and normalizes Tournament Organizer exports into canonical tournament JSON.
 *
 *   npx tsx scripts/ingest.ts <file...> [--meta meta.json] [--out dir] [--dry-run]
 *
 * Each .json file is one event (a canonical record or a scraped export); `--meta` overrides its
 * event fields. All .csv files together are one event: each file's kind (standings, pairings,
 * decklists) comes from its name or is detected from its headers, and `--meta` must supply the
 * event details (see public/templates/event-meta-template.json). Prints an issue report and
 * writes <id>.json to `--out` (default data/imports) unless `--dry-run` or the event has errors.
 * Exits with 1 when any input has errors.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { CSV_KINDS, detectCsvKind } from "@/lib/ingest/columns";
import { parseCsv } from "@/lib/ingest/csv";
import { ingestCsv, ingestJson, type CsvFileInput } from "@/lib/ingest/pipeline";
import { EventMetaOverridesSchema, EventMetaSchema, zodIssues } from "@/lib/ingest/schema";
import { countIssues, issueLocation, type CsvKind, type IngestIssue, type IngestResult } from "@/lib/ingest/types";

const USAGE = "Usage: npx tsx scripts/ingest.ts <file.json|file.csv...> [--meta meta.json] [--out dir] [--dry-run]";
const DEFAULT_OUT = fileURLToPath(new URL("../data/imports/", import.meta.url));
/** Below this, a CSV's kind must come from its file name. */
const MIN_KIND_CONFIDENCE = 0.6;

interface Args {
  files: string[];
  meta?: string;
  out: string;
  dryRun: boolean;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { files: [], out: DEFAULT_OUT, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    // pnpm 10 forwards the "--" separator to the script; it carries no meaning here.
    if (arg === "--") continue;
    const [flag, inline] = arg.startsWith("--") ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const value = () => inline ?? argv[++i] ?? fail(`${flag} needs a value.\n${USAGE}`);
    if (flag === "--meta") args.meta = value();
    else if (flag === "--out") args.out = resolve(BASE_DIR, value());
    else if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--help" || flag === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (flag.startsWith("-")) fail(`Unknown option ${flag}.\n${USAGE}`);
    else args.files.push(arg);
  }
  if (args.files.length === 0) fail(USAGE);
  return args;
}

/** pnpm runs scripts inside apps/decks; resolve paths from where the command was typed. */
const BASE_DIR = process.env.INIT_CWD ?? process.cwd();

function read(path: string): string {
  try {
    return readFileSync(resolve(BASE_DIR, path), "utf8");
  } catch (error) {
    return fail(`Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readMeta<T>(path: string, schema: z.ZodType<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(read(path));
  } catch (error) {
    return fail(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return fail(`${path} is not a valid event meta file:\n${zodIssues(parsed.error, "meta").map((i) => `  ${i.message}`).join("\n")}`);
  }
  return parsed.data;
}

function formatIssue(issue: IngestIssue): string {
  const where = issueLocation(issue);
  const head = `  ${issue.severity.padEnd(8)}${issue.code.padEnd(24)}${where ? `[${where}] ` : ""}${issue.message}`;
  return issue.suggestion ? `${head}\n  ${" ".repeat(32)}${issue.suggestion}` : head;
}

/** Prints the report; writes the event unless it has errors or this is a dry run. Returns true when clean of errors. */
function report(label: string, result: IngestResult, args: Args): boolean {
  const counts = countIssues(result.issues);
  console.log(`\n== ${label}`);
  const t = result.tournament;
  if (t) {
    const s = result.summary;
    console.log(`  ${t.name} (${t.id})`);
    console.log(`  ${t.date} · ${t.tier} · ${t.format || "no format"} · ${s.players} players · ${s.matches} matches · ${s.decklists} decklists`);
    console.log(`  Archetypes: ${s.archetypesFromLabel} from deck names, ${s.archetypesInferred} classified from lists, ${s.rogue} rogue · unknown cards: ${s.unknownCards}`);
  }
  console.log(`  ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info`);
  for (const issue of result.issues) console.log(formatIssue(issue));

  if (!t || counts.error > 0) {
    console.log("  Not written: fix the errors above and run again.");
    return false;
  }
  if (args.dryRun) {
    console.log("  Dry run: nothing written.");
    return true;
  }
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, `${t.id}.json`);
  writeFileSync(path, `${JSON.stringify(t, null, 2)}\n`);
  const shown = relative(process.cwd(), path);
  console.log(`  Wrote ${shown.startsWith("..") ? path : shown}`);
  return true;
}

function csvKind(path: string, text: string): CsvKind {
  const name = basename(path).toLowerCase();
  const named = CSV_KINDS.find((kind) => name.includes(kind) || name.includes(kind.replace(/s$/, "")));
  if (named) return named;
  const detected = detectCsvKind(parseCsv(text).headers);
  if (detected.confidence < MIN_KIND_CONFIDENCE) {
    fail(`Cannot tell whether ${path} holds standings, pairings or decklists; put the kind in its file name (e.g. ${basename(path, ".csv")}-standings.csv).`);
  }
  return detected.kind;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date().toISOString();
  const jsonFiles = args.files.filter((f) => extname(f).toLowerCase() === ".json");
  const csvFiles = args.files.filter((f) => extname(f).toLowerCase() === ".csv");
  const other = args.files.filter((f) => !jsonFiles.includes(f) && !csvFiles.includes(f));
  if (other.length > 0) fail(`Unsupported file type: ${other.join(", ")} (expected .json or .csv).`);

  let ok = true;
  const overrides = args.meta && jsonFiles.length > 0 ? readMeta(args.meta, EventMetaOverridesSchema) : undefined;
  for (const file of jsonFiles) {
    ok = report(file, ingestJson(read(file), { metaOverrides: overrides, now }), args) && ok;
  }

  if (csvFiles.length > 0) {
    if (!args.meta) {
      fail("CSV imports need the event details: pass --meta meta.json (see public/templates/event-meta-template.json).");
    }
    const meta = readMeta(args.meta, EventMetaSchema);
    const inputs: Partial<Record<CsvKind, CsvFileInput & { path: string }>> = {};
    for (const file of csvFiles) {
      const text = read(file);
      const kind = csvKind(file, text);
      const existing = inputs[kind];
      if (existing) fail(`Both ${existing.path} and ${file} look like ${kind}; pass one file per kind.`);
      inputs[kind] = { path: file, text };
    }
    const label = CSV_KINDS.flatMap((kind) => (inputs[kind] ? [`${inputs[kind]!.path} (${kind})`] : [])).join(", ");
    ok = report(label, ingestCsv({ meta, ...inputs, now }), args) && ok;
  }
  process.exit(ok ? 0 : 1);
}

main();
