import { cx } from "@naruto-tcg/ui";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Data table primitives. The wrapper scrolls horizontally so the page itself never does. */
export function DataTable({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-shadow-700">
      <table className={cx("w-full min-w-max border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cx("bg-shadow-800 text-left text-xs uppercase tracking-wide text-ash-400", className)} {...props} />;
}

export function Th({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx("whitespace-nowrap px-3 py-2.5 font-semibold", numeric && "text-right", className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx("border-t border-shadow-700 bg-shadow-900 hover:bg-shadow-800/60", className)} {...props} />;
}

export function Td({ className, numeric, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <td className={cx("px-3 py-2.5 align-middle", numeric && "text-right tabular-nums", className)} {...props} />;
}
