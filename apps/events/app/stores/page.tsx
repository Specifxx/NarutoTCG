import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Card } from "@naruto-tcg/ui";
import { eventsForStore } from "../../lib/data/events";
import { STORES } from "../../lib/data/stores";

export const metadata = { title: "Naruto TCG · Stores" };

export default function StoresPage() {
  const byCountry = Object.entries(Object.groupBy(STORES, (s) => s.country));
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Local Game Stores</h1>
        <p className="text-ash-400">Stores hosting Naruto TCG demos and tournaments.</p>
      </div>
      {byCountry.map(([country, stores]) => (
        <section key={country} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ash-400">{country}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {stores?.map((s) => (
              <Card key={s.slug} className="space-y-2 transition hover:border-chakra-600">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <Link href={`/store/${s.slug}`} className="hover:text-chakra-400">{s.name}</Link>
                  {s.verified && <BadgeCheck size={16} className="text-chakra-400" aria-label="Verified" />}
                </h3>
                <p className="flex items-center gap-2 text-sm text-ash-400"><MapPin size={14} />{s.city}, {s.region}</p>
                <p className="text-xs text-ash-400">{eventsForStore(s.slug).length} upcoming events</p>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
