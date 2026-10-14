import type { Store } from "@naruto-tcg/types";
import { Languages, LayoutGrid } from "lucide-react";
import { SectionHeading } from "@/components/page-header";
import { STORE_FEATURES } from "@/lib/event-meta";
import { cx, pluralize } from "@/lib/format";

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export function languageName(tag: string): string {
  try {
    return languageNames.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

const tile = "flex min-w-0 items-center gap-2.5 rounded-lg border border-shadow-700 bg-shadow-900/80 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3";
const iconBox = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9";

/** What the store offers, its table count and the languages staff speak. */
export function StoreFeatures({ store }: { store: Store }) {
  const offered = STORE_FEATURES.filter((meta) => store.features.includes(meta.feature));
  const languages = store.languages.map(languageName);

  return (
    <section aria-labelledby="store-features-heading">
      <SectionHeading id="store-features-heading" title="Store features" />
      <ul className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-3">
        {store.tableCount !== undefined && (
          <li className={tile}>
            <span className={cx(iconBox, "bg-chakra-500/10 text-chakra-400")}>
              <LayoutGrid className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white tabular-nums">
                {pluralize(store.tableCount, "table")}
              </span>
              <span className="block text-xs text-ash-400">Play space capacity</span>
            </span>
          </li>
        )}
        {offered.map(({ feature, label, icon: Icon }) => (
          <li key={feature} className={tile}>
            <span className={cx(iconBox, "bg-shadow-800 text-ash-200")}>
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-ash-200">{label}</span>
          </li>
        ))}
      </ul>

      {languages.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-shadow-700 bg-shadow-950/60 px-3.5 py-3">
          <Languages className="mt-0.5 h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
          <p className="text-sm text-ash-400">
            <span className="font-medium text-ash-200">Staff speak </span>
            {formatList(languages)}
          </p>
        </div>
      )}
    </section>
  );
}

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

function formatList(items: string[]): string {
  return listFormat.format(items);
}
