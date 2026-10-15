// Decorative inline icons for the card browser. Always pair with a visible
// or screen-reader-only label; every icon is aria-hidden.
import type { ReactNode } from "react";

function Icon({ className = "h-4 w-4", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function FilterIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  );
}

export function GridIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  );
}

export function ListIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </Icon>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

/** Chakra gem used next to cost values. */
export function CostIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path fill="currentColor" d="M12 2.5 19.5 12 12 21.5 4.5 12 12 2.5Z" opacity="0.9" />
      <path fill="#07070b" d="M12 7.5 15.5 12 12 16.5 8.5 12Z" opacity="0.35" />
    </svg>
  );
}

/** Kunai glyph used next to power values. */
export function PowerIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path fill="currentColor" d="M12 1.5 15.2 10 12 13 8.8 10 12 1.5Z" />
      <path fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" d="M12 13v5.5" />
      <circle cx="12" cy="21" r="1.8" fill="none" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

/** Shuriken used in the empty state. */
export function ShurikenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="currentColor"
        d="M32 2 38 26 62 32 38 38 32 62 26 38 2 32 26 26Z"
        opacity="0.9"
      />
      <circle cx="32" cy="32" r="5" fill="#07070b" />
    </svg>
  );
}
