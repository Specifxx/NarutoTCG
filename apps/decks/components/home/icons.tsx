import { cx } from "@naruto-tcg/ui";
import type { TrendDirection } from "./tiers";

/** Icons take their default size unless `className` is given, which then must set the size too. */
type IconProps = { className?: string };

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx("shrink-0", className ?? "h-4 w-4")}>
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cx("shrink-0", className ?? "h-3.5 w-3.5")}>
      <path
        fill="currentColor"
        d="M5 2h10v2h3v2.5A3.5 3.5 0 0 1 14.6 10a5 5 0 0 1-3.6 3V15h3v3H6v-3h3v-2a5 5 0 0 1-3.6-3A3.5 3.5 0 0 1 2 6.5V4h3V2Zm0 4H4v.5c0 .8.4 1.4 1 1.7V6Zm10 0v2.2c.6-.3 1-.9 1-1.7V6h-1Z"
      />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx("shrink-0", className ?? "h-4 w-4")}>
      <path
        d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M3 13.25h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx("shrink-0", className ?? "h-4 w-4")}>
      <path d="m3 4.5 3 3.5-3 3.5M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendIcon({ direction, className }: IconProps & { direction: TrendDirection }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cx("shrink-0", className ?? "h-3 w-3")}>
      {direction === "flat" ? (
        <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d={direction === "up" ? "M6 2 11 9H1Z" : "M6 10 1 3h10Z"} fill="currentColor" />
      )}
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cx("shrink-0", className ?? "h-4 w-4")}>
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 10.75a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM10 5.25c-.62 0-1.1.52-1.06 1.14l.33 4.44a.73.73 0 0 0 1.46 0l.33-4.44A1.06 1.06 0 0 0 10 5.25Z"
      />
    </svg>
  );
}
