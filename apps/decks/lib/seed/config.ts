import type { EventLocation, EventTier } from "@naruto-tcg/types";

/**
 * Tunable inputs for the deterministic seed generator: the event calendar, the player pool,
 * the meta story (archetype popularity by period) and the match model. Every event, player
 * and organization here is fictional.
 */

export type PlayerRegion = "NA-West" | "NA-Central" | "NA-East" | "Canada" | "UK/EU" | "Oceania";

/** Size of the player pool per home region (440 players in total). */
export const REGION_PLAYER_COUNTS: Readonly<Record<PlayerRegion, number>> = {
  "NA-West": 110,
  "NA-Central": 100,
  "NA-East": 80,
  Canada: 30,
  "UK/EU": 90,
  Oceania: 30,
};

export const NORTH_AMERICA: readonly PlayerRegion[] = ["NA-West", "NA-Central", "NA-East", "Canada"];

export interface SeedEventSpec {
  id: string;
  name: string;
  tier: EventTier;
  date: string;
  location: EventLocation;
  organizer: string;
  playerCount: number;
  topCutSize: number;
  /** Home regions the field is drawn from; `"global"` draws from the whole pool. */
  localRegions: readonly PlayerRegion[] | "global";
  /** Share of the field drawn from outside `localRegions`. */
  travelerShare: number;
  notes: string;
}

const SPN = "Shinobi Play Network";
const SOL = "Shinobi Online League";

/** The 2026 seed calendar, oldest first. */
export const SEED_EVENTS: readonly SeedEventSpec[] = [
  {
    id: "hidden-leaf-sc-portland-2026-05",
    name: "Hidden Leaf Games Store Championship — Portland",
    tier: "store-championship",
    date: "2026-05-16",
    location: { city: "Portland", region: "OR", country: "US", venue: "Hidden Leaf Games" },
    organizer: "Hidden Leaf Games",
    playerCount: 24,
    topCutSize: 4,
    localRegions: ["NA-West"],
    travelerShare: 0.15,
    notes: "Opening stop of the NA-West store circuit, three weeks after Kage Summit became legal. Top 8 lists published.",
  },
  {
    id: "konoha-rc-seattle-2026",
    name: "Konoha Regional Championship — Seattle 2026",
    tier: "regional-championship",
    date: "2026-05-30",
    location: { city: "Seattle", region: "WA", country: "US", venue: "Emerald City Expo Hall" },
    organizer: SPN,
    playerCount: 128,
    topCutSize: 8,
    localRegions: ["NA-West"],
    travelerShare: 0.15,
    notes: "First Regional of the season and the first large Kage Summit event; seven rounds of Swiss into a Top 8.",
  },
  {
    id: "ichiraku-sc-toronto-2026-06",
    name: "Ichiraku Card Café Store Championship — Toronto",
    tier: "store-championship",
    date: "2026-06-13",
    location: { city: "Toronto", region: "ON", country: "CA", venue: "Ichiraku Card Café" },
    organizer: "Ichiraku Card Café",
    playerCount: 18,
    topCutSize: 4,
    localRegions: ["Canada"],
    travelerShare: 0.15,
    notes: "Canada's first Store Championship of the season, held in the café's back room. Top 8 lists published.",
  },
  {
    id: "shinobi-online-open-3",
    name: "Shinobi Online Open #3",
    tier: "online-open",
    date: "2026-06-27",
    location: { online: true },
    organizer: SOL,
    playerCount: 96,
    topCutSize: 8,
    localRegions: "global",
    travelerShare: 0,
    notes: "One-day online open with registered decklists; the Top 8 was streamed with commentary.",
  },
  {
    id: "suna-rc-phoenix-2026",
    name: "Sunagakure Regional Championship — Phoenix 2026",
    tier: "regional-championship",
    date: "2026-07-11",
    location: { city: "Phoenix", region: "AZ", country: "US", venue: "Desert Sun Exhibition Center" },
    organizer: SPN,
    playerCount: 160,
    topCutSize: 16,
    localRegions: ["NA-West", "NA-Central"],
    travelerShare: 0.15,
    notes: "Last major event before Fourth Great Ninja War became legal on July 17; eight rounds of Swiss into a Top 16.",
  },
  {
    id: "mist-village-sc-manchester-2026-07",
    name: "Mist Village Games Store Championship — Manchester",
    tier: "store-championship",
    date: "2026-07-25",
    location: { city: "Manchester", region: "England", country: "GB", venue: "Mist Village Games" },
    organizer: "Mist Village Games",
    playerCount: 28,
    topCutSize: 8,
    localRegions: ["UK/EU"],
    travelerShare: 0.15,
    notes: "First Store Championship with Fourth Great Ninja War legal, eight days after release.",
  },
  {
    id: "rasengan-sc-sydney-2026-08",
    name: "Rasengan Hobbies Store Championship — Sydney",
    tier: "store-championship",
    date: "2026-08-08",
    location: { city: "Sydney", region: "NSW", country: "AU", venue: "Rasengan Hobbies" },
    organizer: "Rasengan Hobbies",
    playerCount: 20,
    topCutSize: 4,
    localRegions: ["Oceania"],
    travelerShare: 0.15,
    notes: "Oceania's first Store Championship of the Fourth Great Ninja War format. Top 8 lists published.",
  },
  {
    id: "kiri-rc-london-2026",
    name: "Kirigakure Regional Championship — London 2026",
    tier: "regional-championship",
    date: "2026-08-22",
    location: { city: "London", region: "England", country: "GB", venue: "Thames Event Hall" },
    organizer: SPN,
    playerCount: 144,
    topCutSize: 16,
    localRegions: ["UK/EU"],
    travelerShare: 0.15,
    notes: "Largest European event of the season, with a sizable North American contingent making the trip.",
  },
  {
    id: "akatsuki-hideout-sc-austin-2026-09",
    name: "Akatsuki Hideout Store Championship — Austin",
    tier: "store-championship",
    date: "2026-09-05",
    location: { city: "Austin", region: "TX", country: "US", venue: "Akatsuki Hideout" },
    organizer: "Akatsuki Hideout",
    playerCount: 32,
    topCutSize: 8,
    localRegions: ["NA-Central"],
    travelerShare: 0.15,
    notes: "Final NA-Central warm-up before the Hokage Cup; several national qualifiers tested lists here.",
  },
  {
    id: "hokage-cup-na-2026",
    name: "Hokage Cup — North America National Championship 2026",
    tier: "national-championship",
    date: "2026-09-19",
    location: { city: "Columbus", region: "OH", country: "US", venue: "Buckeye Convention Hall" },
    organizer: SPN,
    playerCount: 256,
    topCutSize: 16,
    localRegions: NORTH_AMERICA,
    travelerShare: 0,
    notes: "The North American National Championship, open to players from the US and Canada; nine rounds of Swiss into a Top 16.",
  },
  {
    id: "leaf-village-sc-chicago-2026-10",
    name: "Leaf Village Collectibles Store Championship — Chicago",
    tier: "store-championship",
    date: "2026-10-03",
    location: { city: "Chicago", region: "IL", country: "US", venue: "Leaf Village Collectibles" },
    organizer: "Leaf Village Collectibles",
    playerCount: 22,
    topCutSize: 4,
    localRegions: ["NA-Central"],
    travelerShare: 0.15,
    notes: "First Store Championship after the Hokage Cup. Top 8 lists published.",
  },
  {
    id: "shinobi-online-open-4",
    name: "Shinobi Online Open #4",
    tier: "online-open",
    date: "2026-10-10",
    location: { online: true },
    organizer: SOL,
    playerCount: 112,
    topCutSize: 8,
    localRegions: "global",
    travelerShare: 0,
    notes: "Largest online open to date; the post-Nationals meta on full display.",
  },
];

/** Swiss rounds by attendance: [maximum players, rounds]. */
export const SWISS_ROUNDS_BY_SIZE: ReadonlyArray<[maxPlayers: number, rounds: number]> = [
  [16, 4],
  [32, 5],
  [64, 6],
  [128, 7],
  [226, 8],
  [409, 9],
];

export function swissRoundsFor(playerCount: number): number {
  const row = SWISS_ROUNDS_BY_SIZE.find(([max]) => playerCount <= max);
  if (!row) throw new Error(`No Swiss round count configured for ${playerCount} players`);
  return row[1];
}

/** Cap on the share of a local pool that attends one event; the rest of the field travels. */
export const MAX_LOCAL_TURNOUT = 0.9;

/** Store Championships with a Top 4 still publish lists down to this placement. */
export const STORE_PUBLISHED_LIST_DEPTH = 8;

export interface MetaPeriod {
  id: string;
  label: string;
  /** Inclusive ISO start; undefined = open-ended. */
  from?: string;
  /** Inclusive ISO end; undefined = open-ended. */
  to?: string;
  /** Relative archetype popularity in the period. */
  popularity: Readonly<Record<string, number>>;
}

/** The meta story: Sage and Avenger early, Pain after NT04, Gaara and Hyuga in the fall. */
export const META_PERIODS: readonly MetaPeriod[] = [
  {
    id: "P1",
    label: "Kage Summit (before NT04)",
    to: "2026-07-16",
    popularity: {
      "uzumaki-sage": 19,
      "uchiha-avenger": 14,
      "leaf-jonin": 10,
      "akatsuki-pain": 11,
      "sand-gaara": 8,
      "hyuga-gentle-fist": 7,
      "itachi-tsukuyomi": 7,
      "medical-ninja": 6,
      "sannin-summons": 6,
      "orochimaru-curse": 5,
      "taijutsu-lee": 5,
      "puppet-brigade": 3,
      rogue: 4,
    },
  },
  {
    id: "P2",
    label: "Fourth Great Ninja War launch",
    from: "2026-07-17",
    to: "2026-08-31",
    popularity: {
      "akatsuki-pain": 17,
      "uzumaki-sage": 13,
      "sand-gaara": 12,
      "uchiha-avenger": 11,
      "hyuga-gentle-fist": 8,
      "leaf-jonin": 8,
      "itachi-tsukuyomi": 8,
      "medical-ninja": 6,
      "sannin-summons": 5,
      "orochimaru-curse": 4,
      "taijutsu-lee": 4,
      "puppet-brigade": 3,
      rogue: 4,
    },
  },
  {
    id: "P3",
    label: "Hokage Cup season",
    from: "2026-09-01",
    popularity: {
      "sand-gaara": 19,
      "akatsuki-pain": 14,
      "hyuga-gentle-fist": 12,
      "uchiha-avenger": 10,
      "uzumaki-sage": 9,
      "itachi-tsukuyomi": 8,
      "medical-ninja": 7,
      "leaf-jonin": 6,
      "sannin-summons": 5,
      "orochimaru-curse": 4,
      "taijutsu-lee": 4,
      "puppet-brigade": 3,
      rogue: 3,
    },
  },
];

export function metaPeriodFor(date: string): MetaPeriod {
  const period = META_PERIODS.find((p) => (p.from === undefined || p.from <= date) && (p.to === undefined || date <= p.to));
  if (!period) throw new Error(`No meta period covers ${date}`);
  return period;
}

/** P(archetype) ∝ popularity × (1 + PREFERENCE_BOOST × preference weight). */
export const PREFERENCE_BOOST = 2;

/** Ranges for a player's 1st/2nd/3rd archetype preference weight. */
export const PREFERENCE_WEIGHT_RANGES: ReadonlyArray<[min: number, max: number]> = [
  [0.6, 1],
  [0.3, 0.6],
  [0.1, 0.3],
];

/** Chance a player has a third preferred archetype. */
export const THIRD_PREFERENCE_RATE = 0.5;

/** Player skill ~ Normal(0, SKILL_SD) in logit units. */
export const SKILL_SD = 0.35;
export const SKILL_SCALE = 1.0;

/** How often a player registers for an eligible event, sampled uniformly from this range. */
export const ACTIVITY_RANGE: readonly [min: number, max: number] = [0.2, 1];

/** Base archetype strength in logit units. */
export const ARCHETYPE_RATINGS: Readonly<Record<string, number>> = {
  "akatsuki-pain": 0.26,
  "sand-gaara": 0.23,
  "uzumaki-sage": 0.2,
  "uchiha-avenger": 0.16,
  "hyuga-gentle-fist": 0.13,
  "leaf-jonin": 0.02,
  "itachi-tsukuyomi": 0.08,
  "medical-ninja": 0.13,
  "sannin-summons": -0.05,
  "orochimaru-curse": -0.11,
  "taijutsu-lee": -0.18,
  "puppet-brigade": -0.17,
  rogue: -0.25,
};

/** Matchup adjustments from the first archetype's side; the reverse direction is negated. */
export const MATCHUP_ADJUSTMENTS: ReadonlyArray<[archetypeId: string, opponentId: string, logit: number]> = [
  ["sand-gaara", "akatsuki-pain", 0.3],
  ["akatsuki-pain", "uzumaki-sage", 0.25],
  ["akatsuki-pain", "sannin-summons", 0.4],
  ["hyuga-gentle-fist", "sand-gaara", 0.25],
  ["hyuga-gentle-fist", "akatsuki-pain", 0.15],
  ["uchiha-avenger", "sand-gaara", 0.2],
  ["uchiha-avenger", "medical-ninja", 0.2],
  ["taijutsu-lee", "itachi-tsukuyomi", 0.3],
  ["medical-ninja", "taijutsu-lee", 0.4],
  ["sand-gaara", "taijutsu-lee", 0.4],
  ["itachi-tsukuyomi", "uzumaki-sage", 0.25],
  ["uzumaki-sage", "uchiha-avenger", 0.15],
  ["puppet-brigade", "leaf-jonin", 0.2],
  ["orochimaru-curse", "medical-ninja", 0.2],
  ["sannin-summons", "leaf-jonin", 0.15],
];

/** Share of Swiss matches that end in an unintentional 1-1 draw on time. */
export const TIME_DRAW_RATE = 0.025;

/** Last-round intentional draws between two players at or above cut line + cushion. */
export const INTENTIONAL_DRAW_RATE = 0.7;
export const INTENTIONAL_DRAW_CUSHION = 3;

/** Drops are rolled after each Swiss round from this round on (never after the last). */
export const DROP_FROM_ROUND = 3;
export const DROP_RATE_WINLESS = 0.35;
/** Drop chance for exactly one win and at least {@link DROP_ONE_WIN_MIN_LOSSES} losses. */
export const DROP_RATE_ONE_WIN = 0.12;
export const DROP_ONE_WIN_MIN_LOSSES = 3;

/** Chance a list uses a legal alternate Leader instead of the archetype's default. */
export const ALTERNATE_LEADER_RATE = 0.3;

/** Relative weights for 1, 2, 3 or 4 copies of a flex card. */
export const FLEX_COPY_WEIGHTS: readonly number[] = [1, 3, 3, 2];
