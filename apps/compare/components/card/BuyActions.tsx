import { cx } from "@naruto-tcg/ui";
import { AFFILIATE_REL } from "@/lib/market/affiliate";
import { formatUsd } from "@/lib/market/format";
import type { VendorId, VendorQuote } from "@/lib/market/types";
import { VENDOR_ORDER, VENDORS } from "@/lib/market/vendors";
import { ExternalLinkIcon } from "./icons";
import { VENDOR_VERB, type VendorLinks } from "./links";

/** Primary, secondary and tertiary emphasis, in vendor order. */
const TONE: Record<VendorId, { button: string; price: string }> = {
  tcgplayer: {
    button: "bg-chakra-500 text-shadow-950 hover:bg-chakra-400",
    price: "text-shadow-950",
  },
  ebay: {
    button: "border border-shadow-500 bg-shadow-800 text-ash-200 hover:border-ash-400 hover:text-white",
    price: "text-ash-400",
  },
  cardmarket: {
    button: "border border-shadow-700 text-ash-200 hover:bg-shadow-800 hover:text-white",
    price: "text-ash-400",
  },
};

/** Affiliate CTAs, one per vendor in fixed order; vendors without a quote fall back to a search link. */
export function BuyActions({ quotes, links }: { quotes: VendorQuote[]; links: VendorLinks }) {
  const byVendor = new Map(quotes.map((q) => [q.vendor, q]));
  return (
    <section aria-labelledby="buy-heading" className="rounded-xl border border-shadow-700 bg-shadow-900 p-4 sm:p-5">
      <h2 id="buy-heading" className="text-base font-semibold text-white">
        Where to buy
      </h2>
      <p className="mt-0.5 text-sm text-ash-400">Lowest asking price at each marketplace</p>
      <ul className="mt-4 space-y-2.5">
        {VENDOR_ORDER.map((vendor) => {
          const quote = byVendor.get(vendor);
          const tone = TONE[vendor];
          const name = VENDORS[vendor].name;
          const from = quote?.usd.low ?? null;
          return (
            <li key={vendor}>
              <a
                href={links[vendor]}
                target="_blank"
                rel={AFFILIATE_REL}
                className={cx(
                  "flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900",
                  tone.button,
                )}
              >
                <span className="min-w-0 flex-1">
                  {quote ? `${VENDOR_VERB[vendor]} on ${name}` : `Search on ${name}`}
                </span>
                {from != null && (
                  <span className={cx("shrink-0 text-xs font-medium tabular-nums", tone.price)}>
                    from {formatUsd(from)}
                  </span>
                )}
                <ExternalLinkIcon className="size-4 shrink-0" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ash-400">
        Affiliate links: we may earn a commission at no cost to you. Prices refresh daily — confirm on the seller&apos;s
        page.
      </p>
    </section>
  );
}
