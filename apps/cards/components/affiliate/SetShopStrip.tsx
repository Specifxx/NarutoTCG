import type { CardSet } from "@naruto-tcg/types";
import { setQuery } from "@/lib/affiliate";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { ShopButtons } from "./ShopButtons";

/** Sealed-product affiliate links for a set ("Pre-order" before release), with its disclosure. */
export function SetShopStrip({
  set,
  released,
  placement,
  className = "",
}: {
  set: CardSet;
  released: boolean;
  placement: string;
  className?: string;
}) {
  const label = released ? `Shop ${set.shortName} sealed product` : `Pre-order ${set.shortName}`;
  return (
    <div className={`rounded-xl border border-shadow-700 bg-shadow-900/60 p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ash-200">{label}</p>
        <ShopButtons query={setQuery(set)} placement={placement} context={set.name} size="sm" />
      </div>
      <AffiliateDisclosure className="mt-2" />
    </div>
  );
}
