import { cx } from "@naruto-tcg/ui";
import { AFFILIATE_REL } from "@/lib/market/affiliate";
import { ExternalLinkIcon } from "./icons";

/** Compact marketplace link button for table rows. `context` names the destination for screen readers. */
export function OutboundLink({
  href,
  label,
  context,
  className,
}: {
  href: string;
  label: string;
  context: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={AFFILIATE_REL}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-shadow-500 px-3 text-sm font-medium whitespace-nowrap text-ash-200 transition-colors hover:border-chakra-400 hover:text-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10",
        className,
      )}
    >
      {label}
      <span className="sr-only"> {context} (opens in a new tab)</span>
      <ExternalLinkIcon className="size-3.5" />
    </a>
  );
}
