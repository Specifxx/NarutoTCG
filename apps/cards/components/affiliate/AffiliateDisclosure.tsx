import Link from "next/link";

// The visible affiliate disclosure, rendered IMMEDIATELY ADJACENT to every
// affiliate link on the site (eBay Partner Network Participation Requirements
// I.G. and the FTC Endorsement Guides require it to be clear, prominent and
// near the links it describes). Rules, carried over from TCGEmpire:
//  - Never hide it behind a hover, tooltip, sr-only text or a collapsed element.
//  - Never render it for only some visitors: if an affiliate link renders, its
//    disclosure renders.
//  - Keep "affiliate" and the earning relationship explicit.
// The machine-readable half is rel="sponsored nofollow" (AFFILIATE_REL).

export const DISCLOSURE_TEXT =
  "Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, Naruto TCG earns from qualifying purchases, at no extra cost to you.";

export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-snug text-ash-400 ${className}`}>
      {DISCLOSURE_TEXT}{" "}
      <Link href="/disclosure" className="underline decoration-shadow-500 underline-offset-2 hover:text-ash-200">
        Learn more
      </Link>
    </p>
  );
}

/**
 * Short per-link tag the FTC's 2023 guidance asks for beside each monetised link
 * ("affiliate link" alone is considered insufficient for a hurried reader).
 */
export function PaidLinkTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border border-shadow-500 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-ash-400 ${className}`}
    >
      Paid link
    </span>
  );
}
