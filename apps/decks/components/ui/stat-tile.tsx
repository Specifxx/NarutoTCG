import { cx } from "@naruto-tcg/ui";
import type { ReactNode } from "react";

/** Label · value · optional detail. Values use proportional figures; sentence-case labels. */
export function StatTile({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-lg border border-shadow-700 bg-shadow-900 px-4 py-3", className)}>
      <div className="text-xs font-medium text-ash-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-ash-400">{detail}</div>}
    </div>
  );
}
