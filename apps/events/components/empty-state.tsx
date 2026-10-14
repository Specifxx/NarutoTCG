import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel = 3,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Use 1 when the empty state is the page's main content (404, error pages). */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cx(
        "flex flex-col items-center rounded-xl border border-dashed border-shadow-500/70 bg-shadow-900/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-shadow-800 text-chakra-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <Heading className="mt-4 text-base font-semibold text-white">{title}</Heading>
      {description && <p className="mt-1 max-w-md text-sm text-ash-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
