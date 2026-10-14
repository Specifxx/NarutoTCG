"use client";

import type { ReactNode } from "react";
import { cx } from "./Button";

export function Chip({
  active,
  onClick,
  children,
  color,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      style={active && color ? { borderColor: color, boxShadow: `0 0 14px -6px ${color}` } : undefined}
      className={cx(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
        active ? "border-chakra-400/60 bg-white/[0.06] text-ash-50" : "border-white/8 bg-shadow-900/60 text-ash-400 hover:border-white/20 hover:text-ash-200",
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-white/8 bg-shadow-900/80 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex h-8 items-center gap-1.5 rounded-md px-3 font-display text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
            value === o.value ? "bg-chakra-500/15 text-chakra-300 shadow-[inset_0_0_0_1px_rgba(255,122,26,0.35)]" : "text-ash-400 hover:text-ash-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
