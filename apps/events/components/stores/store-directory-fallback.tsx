import { cx, pluralize } from "@/lib/format";
import type { StoreSummary } from "@/lib/store-summary";
import { surface } from "@/lib/styles";
import { StoreCard } from "./store-card";
import { DEFAULT_STORE_FILTERS, applyStoreFilters } from "./store-filters";

/**
 * Static stand-in for `<StoreDirectory>` while the client reads the URL: the
 * default view (verified stores, A–Z) so crawlers and no-JS visitors get the full list.
 */
export function StoreDirectoryFallback({ stores }: { stores: StoreSummary[] }) {
  const results = applyStoreFilters(stores, DEFAULT_STORE_FILTERS);

  return (
    <div className="space-y-6">
      <div className={cx(surface.panel, "space-y-4")} aria-hidden="true">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 rounded bg-shadow-800" />
              <div className="mt-2 h-[38px] rounded-md border border-shadow-700 bg-shadow-900" />
            </div>
          ))}
        </div>
        <div className="hidden flex-wrap gap-2 border-t border-shadow-700 pt-4 md:flex">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-7 w-24 rounded-full border border-shadow-700 bg-shadow-900" />
          ))}
        </div>
        <div className="h-[38px] rounded-md border border-shadow-700 bg-shadow-800 md:hidden" />
      </div>

      <p className="text-sm text-ash-400">
        Showing <span className="font-semibold text-white tabular-nums">{results.length}</span> of{" "}
        <span className="tabular-nums">{pluralize(results.length, "verified store")}</span>
      </p>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Stores">
        {results.map(({ store }) => (
          <li key={store.slug}>
            <StoreCard store={store} />
          </li>
        ))}
      </ul>
    </div>
  );
}
