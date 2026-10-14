import { getFxRates } from "@/lib/market/fx";

/** `demoData`: the prices are simulated sample data (seed repository, or a database loaded by db:seed). */
export function SiteFooter({ demoData }: { demoData: boolean }) {
  const eurUsd = getFxRates().EUR;
  return (
    <footer className="mt-16 border-t border-shadow-700 bg-shadow-950">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm leading-relaxed text-ash-400 sm:px-6 md:grid-cols-3">
        <section aria-labelledby="footer-data">
          <h2 id="footer-data" className="mb-2 font-semibold text-ash-200">
            About the prices
          </h2>
          <p>
            Market prices are the median of TCGplayer, eBay and Cardmarket market values, in USD. Cardmarket prices are
            converted from EUR at 1 EUR = {eurUsd.toFixed(2)} USD. Prices refresh daily, so confirm on the seller&apos;s
            page before you buy.
          </p>
          {demoData && (
            <p className="mt-2 text-chakra-400">
              Demo mode: prices and listings are simulated sample data, not real marketplace quotes.
            </p>
          )}
        </section>
        <section aria-labelledby="footer-affiliate">
          <h2 id="footer-affiliate" className="mb-2 font-semibold text-ash-200">
            Affiliate disclosure
          </h2>
          <p>
            Some links to marketplaces are affiliate links. If you buy through them we may earn a commission, at no extra
            cost to you. It never changes which seller we rank cheapest.
          </p>
        </section>
        <section aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-2 font-semibold text-ash-200">
            Fan project
          </h2>
          <p>
            An unofficial community tool. Not affiliated with or endorsed by the rights holders of Naruto, TCGplayer, eBay
            or Cardmarket. All trademarks belong to their owners.
          </p>
        </section>
      </div>
    </footer>
  );
}
