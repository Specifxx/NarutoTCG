/** What the import wizard accepts, with the downloadable template for each input. */
export interface ImportFormat {
  label: string;
  kind: "JSON" | "CSV";
  description: string;
  /** File name under public/templates. */
  template: string;
}

export const IMPORT_FORMATS: readonly ImportFormat[] = [
  {
    label: "Tournament record",
    kind: "JSON",
    description: "The canonical format: event details, every player and every match.",
    template: "tournament-template.json",
  },
  {
    label: "Scraped export",
    kind: "JSON",
    description: "Loose standings and pairings from a results page or browser extension.",
    template: "scraped-template.json",
  },
  {
    label: "Standings",
    kind: "CSV",
    description: "Placement, player, deck and record per row.",
    template: "standings-template.csv",
  },
  {
    label: "Pairings",
    kind: "CSV",
    description: "Round, table, both players and the result.",
    template: "pairings-template.csv",
  },
  {
    label: "Decklists",
    kind: "CSV",
    description: "One row per card: player, section, quantity and card.",
    template: "decklists-template.csv",
  },
  {
    label: "Event details",
    kind: "JSON",
    description: "Name, date, tier and structure to go with a set of CSVs.",
    template: "event-meta-template.json",
  },
];

/** The CLI importer, run from the monorepo root. */
export const INGEST_COMMAND = "pnpm --filter @naruto-tcg/decks ingest -- results.json";

export const templateHref = (file: string) => `/templates/${encodeURIComponent(file)}`;
