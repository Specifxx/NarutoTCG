import type { NarutoCard } from "@naruto-tcg/types";
import { RarityBadge } from "@/components/badges";
import { SectionHeading } from "@/components/detail/SectionHeading";
import { cardQuery } from "@/lib/affiliate";
import { VARIANT_LABEL } from "@/lib/meta";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { ShopButtons } from "./ShopButtons";

/** "Where to buy": affiliate searches for every printing of a card, disclosure first. */
export function CardShopPanel({ card }: { card: NarutoCard }) {
  return (
    <section aria-labelledby="card-shop-heading" className="scroll-mt-4">
      <SectionHeading id="card-shop-heading" eyebrow="Marketplace" title="Where to buy" />
      <AffiliateDisclosure className="mt-2" />
      <ul className="mt-4 divide-y divide-shadow-800 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900/60">
        {card.printings.map((printing) => {
          const context = `${card.name} ${printing.number}${printing.variant === "standard" ? "" : ` ${VARIANT_LABEL[printing.variant]}`}`;
          return (
            <li
              key={`${printing.setId}:${printing.number}:${printing.variant}`}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-ash-200">{printing.number}</span>
                <RarityBadge rarity={printing.rarity} compact />
                <span className="text-ash-400">{VARIANT_LABEL[printing.variant]}</span>
              </p>
              <ShopButtons query={cardQuery(card, printing)} placement="card-detail" context={context} size="sm" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
