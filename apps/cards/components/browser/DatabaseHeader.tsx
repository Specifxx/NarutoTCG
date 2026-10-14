import styles from "./browser.module.css";

export interface DatabaseStats {
  cards: number;
  printings: number;
  sets: number;
  reveals: number;
}

/** Server-rendered page header for /cards: the page's h1, intro, and dataset totals. */
export function DatabaseHeader({ stats }: { stats: DatabaseStats }) {
  const items = [
    { label: stats.cards === 1 ? "Card" : "Cards", value: stats.cards },
    { label: stats.printings === 1 ? "Printing" : "Printings", value: stats.printings },
    { label: stats.sets === 1 ? "Set" : "Sets", value: stats.sets },
    ...(stats.reveals > 0 ? [{ label: stats.reveals === 1 ? "Reveal" : "Reveals", value: stats.reveals }] : []),
  ];
  return (
    <div className={`${styles.hero} relative isolate border-b border-shadow-800`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:gap-6 px-4 py-6 sm:px-6 sm:py-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-chakra-400">Naruto TCG · Cards</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Card Database</h1>
          <p className="mt-3 text-sm leading-relaxed text-ash-400 sm:text-base">
            Search {stats.cards > 1 ? `all ${stats.cards.toLocaleString("en-US")} cards` : "every card"} by name,
            character tag, or rules text, then narrow the results by type, chakra element, cost, rarity, and set.
          </p>
        </div>
        <dl
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          className="grid shrink-0 gap-px overflow-hidden rounded-xl sm:self-start md:self-auto border border-shadow-700 bg-shadow-700 text-center shadow-lg shadow-black/30 sm:flex">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col-reverse bg-shadow-900 px-2 py-2 sm:min-w-[5.5rem] sm:px-4 sm:py-2.5">
              <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-ash-400 sm:tracking-[0.14em]">
                {item.label}
              </dt>
              <dd className="text-xl font-bold tabular-nums text-white">{item.value.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
