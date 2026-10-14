import type { ReactNode } from "react";

/** Small inline icons for the deck page; decorative, so always aria-hidden. */

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={className ?? "h-4 w-4"}>
      {children}
    </svg>
  );
}

export function UpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4 16 12H4L10 4Z" fill="currentColor" />
    </Svg>
  );
}

export function DownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 16 4 8h12l-6 8Z" fill="currentColor" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M7 3h7a2 2 0 0 1 2 2v8M5 6h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 15h12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 4h5v5M16 4l-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5 9 4l2.5 10.5-5 2.5L4 6.5ZM11 4.5l5 1.2-2.4 10.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CrossCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7.5 7.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Verdict icons: shape carries the meaning so color is never the only signal. */
export function FavoredIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4.5 15.5 13h-11L10 4.5Z" fill="currentColor" />
    </Svg>
  );
}

export function UnfavoredIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 15.5 4.5 7h11L10 15.5Z" fill="currentColor" />
    </Svg>
  );
}

export function EvenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7.5h11M4.5 12.5h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function NoDataIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 10h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3.5 17.5 16.5h-15L10 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.2v.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m7 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SortIcon({ direction, className }: IconProps & { direction: "ascending" | "descending" | "none" }) {
  return (
    <Svg className={className ?? "h-3 w-3"}>
      <path d="M10 3 14 8H6l4-5Z" fill="currentColor" opacity={direction === "ascending" ? 1 : 0.3} />
      <path d="M10 17 6 12h8l-4 5Z" fill="currentColor" opacity={direction === "descending" ? 1 : 0.3} />
    </Svg>
  );
}
