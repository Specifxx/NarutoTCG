import Link from "next/link";
import { Card } from "@naruto-tcg/ui";
import { Countdown } from "../../components/Countdown";
import { EVENTS } from "../../lib/data/events";
import { formatDate } from "../../lib/format";

export const metadata = { title: "Naruto TCG · Countdowns" };

export default function CountdownsPage() {
  const fest = EVENTS.find((e) => e.id === "bandai-fest-anaheim-2027")!;
  const regional = EVENTS.find((e) => e.type === "regional")!;
  // Sample release date; replace with the official announcement.
  const release = { title: "Official Global Set Release", at: "2027-01-29T00:00:00Z", note: "Sample date" };

  const items = [
    { title: "Bandai Card Games Fest", at: fest.startsAt, note: `${fest.city}, ${fest.country} · ${formatDate(fest.startsAt)}`, href: `/events/${fest.id}` },
    { title: release.title, at: release.at, note: `${release.note} · ${formatDate(release.at)}` },
    { title: "Next Regional Championship", at: regional.startsAt, note: `${regional.city}, ${regional.country} · ${formatDate(regional.startsAt)}`, href: `/events/${regional.id}` },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Countdowns</h1>
        <p className="text-ash-400">Live timers for the next big Naruto TCG milestones.</p>
      </div>
      <div className="grid gap-4">
        {items.map((i) => (
          <Card key={i.title} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{i.title}</h2>
              <p className="text-sm text-ash-400">{i.note}</p>
            </div>
            <Countdown target={i.at} />
            {i.href && <Link href={i.href} className="text-sm text-chakra-400 hover:underline">Event details →</Link>}
          </Card>
        ))}
      </div>
    </main>
  );
}
