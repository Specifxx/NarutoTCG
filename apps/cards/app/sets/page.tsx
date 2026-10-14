import type { CardSet } from "@naruto-tcg/types";
import type { Metadata } from "next";
import { SetCard } from "@/components/sets/SetCard";
import { pluralize, showcaseEntries, summarizeSet } from "@/components/spoilers/reveals";
import { getSetEntries, getSets } from "@/lib/data";
import { RARITY_META, isReleased, todayIso } from "@/lib/meta";

export const metadata: Metadata = {
  title: "Set Checklists",
  description: "Every Naruto TCG starter deck, booster set and promo pack with release dates, reveal progress and a checklist to track your collection.",
};

function SetGroup({
  id,
  title,
  blurb,
  sets,
  today,
}: {
  id: string;
  title: string;
  blurb: string;
  sets: readonly CardSet[];
  today: string;
}) {
  if (sets.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10 sm:mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-shadow-800 pb-3">
        <h2 id={id} className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {title}
          <span className="ml-2 align-middle text-sm font-medium text-ash-400">{sets.length}</span>
        </h2>
        <p className="text-sm text-ash-400">{blurb}</p>
      </div>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {sets.map((set) => {
          const entries = getSetEntries(set.id);
          return (
            <li key={set.id}>
              <SetCard
                set={set}
                summary={summarizeSet(set, entries)}
                showcase={showcaseEntries(entries, (entry) => RARITY_META[entry.printing.rarity].rank)}
                today={today}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function SetsPage() {
  const today = todayIso();
  const sets = getSets();
  const upcoming = sets.filter((set) => !isReleased(set, today));
  const released = sets.filter((set) => isReleased(set, today));
  const printings = sets.reduce((sum, set) => sum + getSetEntries(set.id).length, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-chakra-400">Collection</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Set Checklists</h1>
        <p className="mt-3 text-pretty text-ash-400 sm:text-lg">
          {sets.length > 0
            ? `${pluralize(sets.length, "set")} and ${pluralize(printings, "printing")} to collect. Open a set to check off what you own — your checklist is saved in this browser.`
            : "No sets have been announced yet."}
        </p>
      </header>

      <SetGroup
        id="upcoming-sets"
        title="Upcoming"
        blurb="Spoiler season — checklists fill in as cards are revealed."
        sets={upcoming}
        today={today}
      />
      <SetGroup id="released-sets" title="Released" blurb="In release order." sets={released} today={today} />
    </div>
  );
}
