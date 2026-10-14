import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Card } from "@naruto-tcg/ui";
import { EventCard } from "../../../components/EventCard";
import { eventsForStore } from "../../../lib/data/events";
import { getStore, STORES } from "../../../lib/data/stores";

export function generateStaticParams() {
  return STORES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = getStore((await params).slug);
  return { title: s ? `Naruto TCG · ${s.name}` : "Store not found" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = getStore((await params).slug);
  if (!s) notFound();
  const events = eventsForStore(s.slug);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <Link href="/stores" className="text-sm text-ash-400 hover:text-chakra-400">← All stores</Link>
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          {s.name}
          {s.verified && <BadgeCheck className="text-chakra-400" aria-label="Verified store" />}
        </h1>
        <p className="max-w-3xl text-ash-400">{s.description}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 text-sm">
          <h2 className="font-semibold text-white">Contact</h2>
          <p className="flex gap-2"><MapPin size={16} className="text-chakra-400" />{s.address}, {s.city}, {s.region}, {s.country}</p>
          <p className="flex gap-2"><Phone size={16} className="text-chakra-400" />{s.phone}</p>
          <p className="flex gap-2"><Mail size={16} className="text-chakra-400" /><a href={`mailto:${s.email}`} className="hover:text-chakra-400">{s.email}</a></p>
          <p className="flex gap-2"><Globe size={16} className="text-chakra-400" /><a href={s.website} className="hover:text-chakra-400">{s.website}</a></p>
          {s.socials.length > 0 && (
            <p className="flex flex-wrap gap-3 pt-1">
              {s.socials.map((l) => <a key={l.label} href={l.url} className="text-chakra-400 hover:underline">{l.label}</a>)}
            </p>
          )}
        </Card>
        <Card className="space-y-3 text-sm">
          <h2 className="font-semibold text-white">Opening hours</h2>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1">
            {s.hours.map((h) => (
              <div key={h.day} className="contents"><dt className="text-ash-400">{h.day}</dt><dd>{h.hours}</dd></div>
            ))}
          </dl>
        </Card>
      </div>

      <iframe
        title={`Map of ${s.name}`}
        src={`https://www.google.com/maps?q=${s.lat},${s.lng}&z=15&output=embed`}
        className="h-72 w-full rounded-lg border border-shadow-700"
        loading="lazy"
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Upcoming events</h2>
        {events.length === 0 ? (
          <p className="text-ash-400">No events scheduled yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
        )}
      </section>
    </main>
  );
}
