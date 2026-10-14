import { cx } from "@naruto-tcg/ui";
import { FINISH_LABEL, RARITY_LABEL } from "@/lib/market/labels";
import type { CardFinish, Rarity } from "@/lib/market/types";

const RARITY_TONE: Record<Rarity, string> = {
  common: "border-shadow-500 text-ash-400",
  uncommon: "border-shadow-500 text-ash-200",
  rare: "border-sky-700 text-sky-300",
  "super-rare": "border-violet-700 text-violet-300",
  "secret-rare": "border-chakra-600 text-chakra-400",
  parallel: "border-amber-600 text-amber-300",
  promo: "border-emerald-700 text-emerald-300",
};

const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap";

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return <span className={cx(base, RARITY_TONE[rarity], className)}>{RARITY_LABEL[rarity]}</span>;
}

export function FinishBadge({ finish, className }: { finish: CardFinish; className?: string }) {
  return (
    <span
      className={cx(
        base,
        finish === "non-foil" ? "border-shadow-700 text-ash-400" : "border-shadow-500 text-ash-200",
        className,
      )}
    >
      {finish !== "non-foil" && (
        <span aria-hidden className="mr-1">
          ✦
        </span>
      )}
      {FINISH_LABEL[finish]}
    </span>
  );
}
