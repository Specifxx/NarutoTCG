import { BadgeCheck, Building2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { REGIONS } from "@/lib/event-meta";
import { cx, flagEmoji } from "@/lib/format";
import { normalizeQuery, searchTerms } from "@/lib/places";
import { button, field } from "@/lib/styles";
import { timeZoneLabel, type SubmissionStoreOption } from "@/lib/submission";
import { controlProps, FieldError, FieldHint } from "./fields";

const PATH = "venue.storeSlug";

function matches(store: SubmissionStoreOption, terms: string[]): boolean {
  const haystack = normalizeQuery(`${store.name} ${store.place} ${store.city}`);
  return terms.every((term) => haystack.includes(term));
}

/**
 * Searchable list of verified directory stores, rendered as a native radio group
 * inside a scroll box: typing filters, arrow keys move between stores.
 */
export function StorePicker({
  stores,
  value,
  error,
  onSelect,
  onUseNewVenue,
}: {
  stores: readonly SubmissionStoreOption[];
  value: string;
  error?: string;
  onSelect: (store: SubmissionStoreOption) => void;
  onUseNewVenue: () => void;
}) {
  const [query, setQuery] = useState("");
  const selected = stores.find((s) => s.slug === value);
  const terms = useMemo(() => searchTerms(query), [query]);

  const groups = useMemo(() => {
    const visible = terms.length ? stores.filter((s) => matches(s, terms)) : stores;
    return REGIONS.map(({ region, label }) => ({
      region,
      label,
      stores: visible.filter((s) => s.region === region),
    })).filter((g) => g.stores.length > 0);
  }, [stores, terms]);
  const resultCount = groups.reduce((n, g) => n + g.stores.length, 0);

  // Announce the match count once typing pauses rather than on every keystroke.
  const summary = terms.length ? `${resultCount} ${resultCount === 1 ? "store matches" : "stores match"}` : "";
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(summary), 600);
    return () => window.clearTimeout(timer);
  }, [summary]);

  const labelId = "submit-store-label";
  const searchId = "submit-store-search";
  const { id, name, ...aria } = controlProps(PATH, error, true, true);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={searchId} id={labelId} className={field.label}>
          Verified store
        </label>
        <FieldHint path={PATH}>
          Search by store name or city. Only stores verified as official demo hosts are listed.
        </FieldHint>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter would submit the wizard step; in a filter box it should do nothing.
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="e.g. Hidden Leaf or Melbourne"
            autoComplete="off"
            aria-controls={id}
            aria-describedby={`${id}-hint`}
            className={cx(field.input, "pl-9")}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
      </div>

      {selected && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Selected: <span className="font-semibold text-white">{selected.name}</span> · {selected.place}
          </span>
        </p>
      )}

      <div
        role="radiogroup"
        id={id}
        aria-labelledby={labelId}
        {...aria}
        className={cx(
          "max-h-80 overflow-y-auto overscroll-contain rounded-lg border bg-shadow-950/60",
          error ? "border-rose-400/60" : "border-shadow-700",
        )}
      >
        {resultCount === 0 ? (
          <div className="flex flex-col items-start gap-3 p-4 text-sm text-ash-400">
            <p>
              {stores.length === 0
                ? "There are no verified stores in the directory yet."
                : `No verified store matches “${query.trim()}”.`}
            </p>
            <button type="button" onClick={onUseNewVenue} className={button.secondary}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Add it as a new venue
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.region} role="presentation">
              <p
                aria-hidden="true"
                className="sticky top-0 z-10 border-b border-shadow-700 bg-shadow-900/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ash-400 backdrop-blur"
              >
                {group.label} · {group.stores.length}
              </p>
              <ul className="divide-y divide-shadow-700/60" role="presentation">
                {group.stores.map((store) => {
                  const checked = store.slug === value;
                  return (
                    <li key={store.slug} role="presentation">
                      <label
                        className={cx(
                          "relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors has-[:focus-visible]:bg-shadow-800 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-chakra-400",
                          checked ? "bg-chakra-500/10" : "hover:bg-shadow-800/70",
                        )}
                      >
                        <input
                          type="radio"
                          name={name}
                          value={store.slug}
                          checked={checked}
                          onChange={() => onSelect(store)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cx(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            checked ? "border-chakra-400" : "border-shadow-500",
                          )}
                        >
                          {checked && <span className="h-2 w-2 rounded-full bg-chakra-400" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cx("block truncate text-sm font-semibold", checked ? "text-white" : "text-ash-200")}>
                            {store.name}
                          </span>
                          <span className="block truncate text-xs text-ash-400">
                            <span aria-hidden="true">{flagEmoji(store.country)} </span>
                            {store.place}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-ash-400 sm:block">
                          {timeZoneLabel(store.timeZone)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
      <FieldError path={PATH} error={error} />
    </div>
  );
}
