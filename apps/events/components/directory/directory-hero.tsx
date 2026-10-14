import { CalendarDays, Globe, Store } from "lucide-react";

/**
 * Page intro with headline stats. Server component. `listed` is the size of the
 * unfiltered list (upcoming events, cancelled ones included), so it matches the
 * directory's own result count; "listings" keeps that honest when some are cancelled.
 */
export function DirectoryHero({ listed, stores, countries }: { listed: number; stores: number; countries: number }) {
  const items = [
    { label: listed === 1 ? "upcoming listing" : "upcoming listings", value: listed, icon: CalendarDays },
    { label: stores === 1 ? "store" : "stores", value: stores, icon: Store },
    { label: countries === 1 ? "country" : "countries", value: countries, icon: Globe },
  ];

  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-chakra-400">Organised play</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Find Naruto TCG events</h1>
        <p className="mt-2 max-w-2xl text-ash-400">
          Demo days, weekly leagues, store championships and regionals at game stores and conventions near you.
        </p>
      </div>

      <dl className="flex flex-wrap gap-2">
        {items.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-shadow-700 bg-shadow-900/80 py-1.5 pl-2.5 pr-3.5 text-sm"
          >
            {/* dt must precede dd in the DOM; `order` shows the number first. */}
            <dt className="order-2 text-ash-400">{label}</dt>
            <dd className="order-1 inline-flex items-center gap-2 font-semibold text-white tabular-nums">
              <Icon className="h-4 w-4 text-chakra-400" aria-hidden="true" />
              {value.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
