// Source of truth for the platform rollout. Keep in sync with /SCHEDULE.md.

export type ReleaseAppId = "learn" | "events" | "cards" | "decks" | "simulator" | "compare";

export type ReleaseStatus = "LOCKED" | "IN DEVELOPMENT" | "LIVE IN PREVIEW";

export interface Release {
  app: ReleaseAppId;
  name: string;
  focus: string;
  note?: string;
  /** ISO date (YYYY-MM-DD); the release goes live at 00:00 UTC on this day. */
  targetDate: string;
}

export interface ReleasePhase {
  phase: 1 | 2 | 3;
  title: string;
  window: string;
  releases: Release[];
}

export const GLOBAL_LAUNCH_LABEL = "June 2027";

/** An app moves from LOCKED to IN DEVELOPMENT this many days before its target date. */
export const DEVELOPMENT_WINDOW_DAYS = 90;

export const RELEASE_PHASES: ReleasePhase[] = [
  {
    phase: 1,
    title: "Pre-Release & SEO Foundation",
    window: "Q4 2026",
    releases: [
      { app: "learn", name: "Learn", focus: "Interactive Rulebook & Onboarding", targetDate: "2026-11-01" },
      { app: "events", name: "Events", focus: "Bandai Card Games Fest & LGS Demo Tour", targetDate: "2026-11-15" },
      { app: "cards", name: "Cards", focus: "Spoiler Gallery & Card Database", targetDate: "2026-12-15" },
    ],
  },
  {
    phase: 2,
    title: "Community & Theorycrafting",
    window: "Q1–Q2 2027",
    releases: [
      {
        app: "decks",
        name: "Decks",
        focus: "Deck Builder",
        note: "Aligns with Bandai Premier Demo Events & Starter Decks ST-01, ST-02, ST-03",
        targetDate: "2027-02-01",
      },
      {
        app: "simulator",
        name: "Simulator",
        focus: "Playtest Mode",
        note: "For the “Enter: Naruto Uzumaki!” Booster Set",
        targetDate: "2027-04-15",
      },
    ],
  },
  {
    phase: 3,
    title: "Global Marketplace Launch",
    window: "June 2027",
    releases: [
      {
        app: "compare",
        name: "Compare",
        focus: "Live Secondary Market & Vendor Price Tracker",
        targetDate: "2027-06-01",
      },
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function getReleaseStatus(release: Release, now: Date = new Date()): ReleaseStatus {
  const target = Date.parse(release.targetDate);
  const t = now.getTime();
  if (t >= target) return "LIVE IN PREVIEW";
  if (t >= target - DEVELOPMENT_WINDOW_DAYS * DAY_MS) return "IN DEVELOPMENT";
  return "LOCKED";
}
