import type { Metadata } from "next";
import { DISCLOSURE_TEXT } from "@/components/affiliate/AffiliateDisclosure";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How Naruto TCG earns from TCGplayer and eBay affiliate links.",
};

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-chakra-400">Transparency</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Affiliate Disclosure</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ash-200 sm:text-base">
        <p className="rounded-lg border border-chakra-500/40 bg-chakra-500/10 p-4 font-medium text-white">{DISCLOSURE_TEXT}</p>
        <p>
          Some links on this site go to TCGplayer and eBay. They are affiliate links: if you buy something after
          following one, Naruto TCG may earn a commission. You pay the same price either way.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">TCGplayer:</strong> Naruto TCG is a member of the TCGplayer affiliate
            program, run through Impact.
          </li>
          <li>
            <strong className="text-white">eBay:</strong> Naruto TCG is a member of the eBay Partner Network, an
            affiliate program of eBay. As an eBay Partner Network affiliate, Naruto TCG earns from qualifying purchases.
          </li>
        </ul>
        <p>
          Every affiliate link is marked with a <span className="font-semibold text-white">Paid link</span> tag and
          carries this disclosure beside it. Affiliate links are also marked{" "}
          <code className="rounded bg-shadow-800 px-1 py-0.5 text-xs">rel=&quot;sponsored&quot;</code> for search
          engines.
        </p>
        <p>
          Commissions never decide which cards appear in the database, how they are ranked in search, or what the card
          data says. Prices and availability are set by the retailers and can change at any time.
        </p>
      </div>
    </div>
  );
}
