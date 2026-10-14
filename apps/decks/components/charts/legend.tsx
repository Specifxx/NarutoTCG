import { cx } from "@naruto-tcg/ui";

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  /** Mirror the mark: rect for bars/areas/slices, line for lines. */
  shape?: "rect" | "line";
}

export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ash-300", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={item.shape === "line" ? "h-0.5 w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
