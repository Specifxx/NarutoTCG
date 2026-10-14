# Platform Release Schedule

The Naruto TCG platform ships in three phases ahead of Bandai's official global launch of the
Naruto Card Game in **June 2027**. Each app goes live as a public preview on its target date and
keeps improving through launch.

The dates below are planning targets. The roadmap widget reads them from
[`packages/ui/src/release-schedule.ts`](packages/ui/src/release-schedule.ts), so keep both files in
sync (see [Changing the schedule](#changing-the-schedule)).

## At a glance

| Phase | Window | App | Target release | Focus |
| --- | --- | --- | --- | --- |
| 1 · Pre-Release & SEO Foundation | Q4 2026 | `apps/learn` | **Nov 1, 2026** | Interactive Rulebook & Onboarding |
| | | `apps/events` | **Nov 15, 2026** | Bandai Card Games Fest & LGS Demo Tour |
| | | `apps/cards` | **Dec 15, 2026** | Spoiler Gallery & Card Database |
| 2 · Community & Theorycrafting | Q1–Q2 2027 | `apps/decks` | **Feb 1, 2027** | Deck Builder, timed to Bandai Premier Demo Events & Starter Decks ST-01, ST-02, ST-03 |
| | | `apps/simulator` | **Apr 15, 2027** | Playtest Mode for the "Enter: Naruto Uzumaki!" Booster Set |
| 3 · Global Marketplace Launch | June 2027 | `apps/compare` | **June 1, 2027** | Live Secondary Market & Vendor Price Tracker |

## Release statuses

Each app has one of three statuses. The widget works them out from the current date, so nobody
needs to update them by hand.

| Status | Meaning | Rule |
| --- | --- | --- |
| `LOCKED` | Planned, not started | More than 90 days before the target date |
| `IN DEVELOPMENT` | Actively being built | Within 90 days of the target date |
| `LIVE IN PREVIEW` | Shipped as a public preview | On or after the target date (00:00 UTC) |

The 90-day window is `DEVELOPMENT_WINDOW_DAYS` in `release-schedule.ts`.

## Phase 1: Pre-Release & SEO Foundation (Q4 2026)

Get rules, events and card content indexed and in front of players before product reaches
stores, so the platform is where people already go when cards arrive.

| App | Development window opens | Target release | Scope |
| --- | --- | --- | --- |
| `apps/learn` | Aug 3, 2026 | Nov 1, 2026 | Interactive Rulebook & Onboarding: learn-to-play flow for new players |
| `apps/events` | Aug 17, 2026 | Nov 15, 2026 | Bandai Card Games Fest & LGS Demo Tour: where and when to play the game in person |
| `apps/cards` | Sep 16, 2026 | Dec 15, 2026 | Spoiler Gallery & Card Database: searchable card reveals, building toward the full database |

## Phase 2: Community & Theorycrafting (Q1–Q2 2027)

Give players tools to build and test decks as sealed product starts to circulate.

| App | Development window opens | Target release | Scope |
| --- | --- | --- | --- |
| `apps/decks` | Nov 3, 2026 | Feb 1, 2027 | Deck Builder, timed to Bandai Premier Demo Events and Starter Decks ST-01, ST-02, ST-03 |
| `apps/simulator` | Jan 15, 2027 | Apr 15, 2027 | Playtest Mode for the "Enter: Naruto Uzumaki!" Booster Set |

## Phase 3: Global Marketplace Launch (June 2027)

Go live with market data in time for the global launch, when secondary-market demand peaks.

| App | Development window opens | Target release | Scope |
| --- | --- | --- | --- |
| `apps/compare` | Mar 3, 2027 | June 1, 2027 | Live Secondary Market & Vendor Price Tracker |

## Release tracker

Tick each item when the app is actually live in production.

- [ ] `apps/learn` live in preview (target Nov 1, 2026)
- [ ] `apps/events` live in preview (target Nov 15, 2026)
- [ ] `apps/cards` live in preview (target Dec 15, 2026)
- [ ] `apps/decks` live in preview (target Feb 1, 2027)
- [ ] `apps/simulator` live in preview (target Apr 15, 2027)
- [ ] `apps/compare` live in preview (target June 1, 2027)
- [ ] Bandai global launch of the Naruto Card Game (June 2027)

## Status widget

`@naruto-tcg/ui` exports a `ReleaseRoadmap` component that shows this schedule as a
"Platform Status & Upcoming Releases" timeline. Pass `current` to mark the app the visitor is on:

```tsx
import type { ReactNode } from "react";
import { ReleaseRoadmap } from "@naruto-tcg/ui";

// Re-render hourly so statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ReleaseRoadmap current="learn" />
      </body>
    </html>
  );
}
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `current` | `"learn" \| "events" \| "cards" \| "decks" \| "simulator" \| "compare"` | none | Marks the app the visitor is on with "You are here" |
| `now` | `Date` | render time | Date used to work out statuses (useful for previews and tests) |
| `className` | `string` | none | Extra classes for the outer `<section>` |

The package also exports `ReleaseStatusBadge`, `getReleaseStatus`, `RELEASE_PHASES`,
`DEVELOPMENT_WINDOW_DAYS` and `GLOBAL_LAUNCH_LABEL` for pages that need the data directly.

Pages that render the widget are statically generated, so each app layout sets
`export const revalidate = 3600`. Without it a status would stay frozen at build time.

| App | Renders the widget |
| --- | --- |
| `apps/learn` | Yes, as the layout footer |
| `apps/decks` | Yes, as the layout footer |
| `apps/simulator` | Yes, as the layout footer |
| `apps/compare` | Yes, as the layout footer |
| `apps/events` | Not yet: add it to the layout when the app is created |
| `apps/cards` | Not yet: add it to the layout when the app is created |

## Changing the schedule

1. Update the entry in [`packages/ui/src/release-schedule.ts`](packages/ui/src/release-schedule.ts).
2. Update the matching rows in this file. If a target date moves, recalculate its development
   window: target minus 90 days.
3. Run `pnpm typecheck && pnpm build`.
