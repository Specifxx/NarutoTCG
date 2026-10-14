import type { ReactNode } from "react";

export interface TooltipRow {
  key: string;
  label: ReactNode;
  value: ReactNode;
  color?: string;
}

/** Tooltip body: values lead (strong ink), labels follow; rows keyed by a short line in the series color. */
export function ChartTooltipCard({ title, rows, footer }: { title?: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-40 rounded-md border border-shadow-600 bg-shadow-900/95 px-3 py-2 text-xs shadow-xl shadow-black/60">
      {title && <div className="mb-1.5 font-semibold text-ash-200">{title}</div>}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            {row.color && <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: row.color }} />}
            <span className="font-semibold tabular-nums text-white">{row.value}</span>
            <span className="text-ash-400">{row.label}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t border-shadow-700 pt-1.5 text-ash-400">{footer}</div>}
    </div>
  );
}
