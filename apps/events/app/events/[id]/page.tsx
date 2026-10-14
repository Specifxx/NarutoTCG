import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Layers, MapPin, Ticket, Users } from "lucide-react";
import { Badge, Card } from "@naruto-tcg/ui";
import { EVENTS, getEvent } from "../../../lib/data/events";
import { EVENT_TYPE_LABELS, formatDate, formatFee, formatTime } from "../../../lib/format";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const e = getEvent((await params).id);
  return { title: e ? `Naruto TCG · ${e.title}` : "Event not found" };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const e = getEvent((await params).id);
  if (!e) notFound();
  const spots = e.capacity - e.registered;
  const pct = Math.min(100, Math.round((e.registered / e.capacity) * 100));
  const hidden = e.registered - e.players.length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <Link href="/events" className="text-sm text-ash-400 hover:text-chakra-400">← All events</Link>
      <header className="space-y-3">
        <Badge>{EVENT_TYPE_LABELS[e.type]}</Badge>
        <h1 className="text-3xl font-bold text-white">{e.title}</h1>
        <p className="max-w-3xl text-ash-400">{e.description}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              <li className="flex gap-2"><CalendarDays size={16} className="mt-0.5 text-chakra-400" />
                <span>{formatDate(e.startsAt)}<br />{formatTime(e.startsAt)} – {formatTime(e.endsAt)} (local)</span></li>
              <li className="flex gap-2"><MapPin size={16} className="mt-0.5 text-chakra-400" />
                <span>{e.venueName}<br />{e.address}, {e.city}, {e.region}, {e.country}</span></li>
              <li className="flex gap-2"><Ticket size={16} className="mt-0.5 text-chakra-400" />
                <span>Entry: {formatFee(e.entryFee, e.currency)}</span></li>
              <li className="flex gap-2"><Layers size={16} className="mt-0.5 text-chakra-400" />
                <span>Format: {e.format}</span></li>
            </ul>
          </Card>

          <iframe
            title={`Map of ${e.venueName}`}
            src={`https://www.google.com/maps?q=${e.lat},${e.lng}&z=14&output=embed`}
            className="h-80 w-full rounded-lg border border-shadow-700"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <Card className="space-y-2">
            <h2 className="font-semibold text-white">Organizer</h2>
            <p className="text-sm">{e.organizer.name}</p>
            <p className="text-sm text-ash-400">
              <a className="hover:text-chakra-400" href={`mailto:${e.organizer.email}`}>{e.organizer.email}</a>
              {e.organizer.url && <> · <a className="hover:text-chakra-400" href={e.organizer.url}>Website</a></>}
            </p>
            {e.storeSlug && (
              <Link href={`/store/${e.storeSlug}`} className="text-sm text-chakra-400 hover:underline">View store page →</Link>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-sm"><Users size={16} className="text-chakra-400" />
              <span>{e.registered}/{e.capacity} registered</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-shadow-700">
              <div className="h-full bg-chakra-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-ash-400">{spots > 0 ? `${spots} spots left` : "Event is full: join the waitlist"}</p>
            <a
              href={e.registrationUrl}
              className="block rounded-md bg-chakra-500 px-4 py-2 text-center text-sm font-semibold text-shadow-950 hover:bg-chakra-400"
            >
              {spots > 0 ? "Register now" : "Join waitlist"}
            </a>
          </Card>
          <Card className="space-y-2">
            <h2 className="font-semibold text-white">Preregistered players</h2>
            <ul className="flex flex-wrap gap-2">
              {e.players.map((p) => <li key={p}><Badge>{p}</Badge></li>)}
            </ul>
            {hidden > 0 && <p className="text-xs text-ash-400">+ {hidden} more</p>}
          </Card>
        </aside>
      </div>
    </main>
  );
}
