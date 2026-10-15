import { AFFILIATE_REL, shopLinks, type Retailer } from "@/lib/affiliate";
import { PaidLinkTag } from "./AffiliateDisclosure";

const STYLE: Record<Retailer, string> = {
  tcgplayer: "border-sky-400/40 bg-sky-400/10 text-sky-200 hover:border-sky-300 hover:bg-sky-400/20",
  ebay: "border-amber-300/40 bg-amber-300/10 text-amber-100 hover:border-amber-200 hover:bg-amber-300/20",
};

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 3H3v10h10v-3M9 2h5v5M14 2 7.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "Shop on TCGplayer / eBay" affiliate buttons for one search phrase. Callers
 * must render <AffiliateDisclosure> next to these.
 */
export function ShopButtons({
  query,
  placement,
  context,
  size = "md",
}: {
  query: string;
  /** Reporting sub-id segment, e.g. "card-detail". */
  placement: string;
  /** What is being searched for, used in accessible names, e.g. "Sasuke Uchiha ST01-002". */
  context: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {shopLinks(query, placement).map((link) => (
        <li key={link.retailer} className="flex items-center gap-1.5">
          <a
            href={link.href}
            target="_blank"
            rel={AFFILIATE_REL}
            aria-label={`Shop ${context} on ${link.label} (paid link, opens in a new tab)`}
            className={`inline-flex items-center gap-1.5 rounded-md border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 ${pad} ${STYLE[link.retailer]}`}
          >
            {link.label}
            <ExternalIcon />
          </a>
          <PaidLinkTag />
        </li>
      ))}
    </ul>
  );
}
