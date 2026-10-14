import { cx } from "@naruto-tcg/ui";
import { BestPriceIcon } from "./icons";

/** Text + icon tag for the cheapest offer, so the call-out never relies on color alone. */
export function BestPriceBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border border-leaf-400/40 bg-leaf-400/10 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-leaf-400",
        className,
      )}
    >
      <BestPriceIcon className="size-3.5" />
      {label}
    </span>
  );
}
