import type { ReactNode } from "react";
import type { EmblemName } from "@/lib/game/types";

/**
 * Hand-drawn 24×24 SVG emblems used for card art, lesson medallions and badges.
 * Everything is inline, so the app ships no image assets.
 */
const EMBLEMS: Record<EmblemName, ReactNode> = {
  spiral: (
    <path
      d="M12 12m-1 0a1 1 0 1 1 2 0a2 2 0 1 1-4 0a3 3 0 1 1 6 0a4 4 0 1 1-8 0a5 5 0 1 1 10 0a6 6 0 1 1-12 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  ),
  leaf: (
    <>
      <path d="M4.5 19.5C4.5 10.8 10.8 4.5 19.5 4.5c0 8.7-6.3 15-15 15z" fill="currentColor" opacity="0.9" />
      <path d="M4.5 19.5L14 10M9 15l-.5-3.5M11.5 12.5l3 .2" stroke="#07070b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </>
  ),
  shuriken: (
    <path
      fillRule="evenodd"
      fill="currentColor"
      d="M12 1.5L14.6 9.4L22.5 12L14.6 14.6L12 22.5L9.4 14.6L1.5 12L9.4 9.4ZM12 10.3a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 1 0 0-3.4z"
    />
  ),
  kunai: (
    <>
      <path d="M12 1.5L15.2 9.5L12 12.5L8.8 9.5Z" fill="currentColor" />
      <path d="M10.9 12.6h2.2v5.6h-2.2z" fill="currentColor" opacity="0.75" />
      <path d="M10.4 14h3.2M10.4 16h3.2" stroke="#07070b" strokeWidth="0.8" />
      <circle cx="12" cy="20.6" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  scroll: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3.5h12a2 2 0 0 1 0 4H6a2 2 0 0 1 0-4z" />
      <path d="M7 7.5v9.5M17 7.5v9.5" />
      <path d="M6 16.5h12a2 2 0 0 1 0 4H6a2 2 0 0 1 0-4z" />
      <path d="M9.5 10.5h5M9.5 13.5h3.5" strokeLinecap="round" />
    </g>
  ),
  flame: (
    <>
      <path
        d="M12 1.8c.9 3.9 5.6 5.7 5.6 11.1a5.6 5.6 0 0 1-11.2 0c0-2.4 1.2-4 2.4-5.1 0 2.1.9 3.3 2.2 3.5-.6-3.4.1-6.6 1-9.5z"
        fill="currentColor"
      />
      <path d="M12 12.5c.4 1.7 2.4 2.4 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1 .5-1.7 1-2.2.1.9.5 1.4 1 1.5-.2-1.4 0-2.6.4-3.7z" fill="#07070b" opacity="0.55" />
    </>
  ),
  wave: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 13.5c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />
      <path d="M2 18.5c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" opacity="0.6" />
      <path d="M6 8.5c0-2.8 2.3-5 5-5 2.2 0 3.5 1.4 3.5 3.1 0 1.2-.9 2-2 2-.9 0-1.5-.6-1.5-1.4" />
    </g>
  ),
  bolt: <path d="M13.5 1.5L4 14h7l-1.5 8.5L20 9.5h-7z" fill="currentColor" />,
  gourd: (
    <>
      <path d="M11 1.5h2v2.2h-2z" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="6.6" r="3.1" fill="currentColor" />
      <circle cx="12" cy="15.3" r="6.4" fill="currentColor" />
      <path d="M8.3 15.3a3.7 3.7 0 0 1 3.7-3.7" stroke="#07070b" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 12S5.3 5.5 12 5.5 22.5 12 22.5 12 18.7 18.5 12 18.5 1.5 12 1.5 12z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="#07070b" />
      <circle cx="12" cy="9.3" r="0.75" fill="#07070b" />
      <circle cx="14.35" cy="13.35" r="0.75" fill="#07070b" />
      <circle cx="9.65" cy="13.35" r="0.75" fill="#07070b" />
    </>
  ),
  seal: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" />
      <path d="M12 6.5v11M7.2 9.25l9.6 5.5M16.8 9.25l-9.6 5.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </g>
  ),
  edge: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7.3" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path d="M12 4.2L15.4 12L12 19.8L8.6 12Z" fill="currentColor" />
      <path d="M12 8.2L13.6 12L12 15.8L10.4 12Z" fill="#07070b" opacity="0.5" />
    </>
  ),
  mask: (
    <path
      fillRule="evenodd"
      fill="currentColor"
      d="M12 1.8c5.2 0 8.3 3.7 8.3 8.9 0 6.2-4.2 11.5-8.3 11.5S3.7 16.9 3.7 10.7C3.7 5.5 6.8 1.8 12 1.8zM7.3 10.2l3.4.9-.5 1.6-3.1-.8zM16.7 10.2l-3.4.9.5 1.6 3.1-.8zM11.3 3.8h1.4v4.4h-1.4zM9.6 16.2c1.5.9 3.3.9 4.8 0l.3.9c-1.8 1-3.6 1-5.4 0z"
    />
  ),
  cloud: (
    <path
      d="M6.6 18.5a4.6 4.6 0 0 1-.6-9.15A6.1 6.1 0 0 1 17.6 8a5.25 5.25 0 0 1 .1 10.5z"
      fill="currentColor"
    />
  ),
  kage: (
    <>
      <path fillRule="evenodd" fill="currentColor" d="M12 2.5c3.2 4.1 6.9 8.3 10.5 12.8h-21C5.1 10.8 8.8 6.6 12 2.5zM12 8.2l2 2.6-2 2.6-2-2.6z" />
      <path d="M1.5 15.3h21v1.6a1 1 0 0 1-1 1h-19a1 1 0 0 1-1-1z" fill="currentColor" opacity="0.8" />
      <path d="M7 18.3c1.6 2.6 8.4 2.6 10 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  fist: (
    <path
      d="M7 11V8.6a1.6 1.6 0 0 1 3.2 0V10.5M10.2 10V7.4a1.6 1.6 0 0 1 3.2 0V10M13.4 10V8a1.6 1.6 0 0 1 3.2 0v2.3M16.6 10.6a1.6 1.6 0 0 1 3.2 0V14a7 7 0 0 1-7 7h-.6A5.6 5.6 0 0 1 6.6 15.4v-2.2A2.2 2.2 0 0 1 8.8 11h3.4a1.8 1.8 0 0 1 0 3.6H10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  fang: (
    <>
      <path d="M2.5 4.5h19c-2.2.4-3.6 2-4.3 4.6L14.6 19l-1.3-7.2L12 21l-1.3-9.2L9.4 19 6.8 9.1C6.1 6.5 4.7 4.9 2.5 4.5z" fill="currentColor" />
      <path d="M8 8.5h8" stroke="#07070b" strokeWidth="1" opacity="0.4" />
    </>
  ),
  lotus: (
    <>
      <path d="M12 3.5c2.2 2.8 2.7 6.2 0 10-2.7-3.8-2.2-7.2 0-10z" fill="currentColor" />
      <path d="M3.5 9.5c3.4 0 6.6 1.7 8.5 5.5-3.9 1.1-7.1-.1-8.5-5.5z" fill="currentColor" opacity="0.8" />
      <path d="M20.5 9.5c-3.4 0-6.6 1.7-8.5 5.5 3.9 1.1 7.1-.1 8.5-5.5z" fill="currentColor" opacity="0.8" />
      <path d="M4.5 17.5c4.4 2.8 10.6 2.8 15 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  target: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <path d="M12 1v3.5M12 19.5V23M1 12h3.5M19.5 12H23" strokeLinecap="round" />
    </g>
  ),
  chakra: (
    <>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5a4.75 4.75 0 0 1 0 9.5 4.75 4.75 0 0 0 0 9.5A9.5 9.5 0 0 1 12 2.5z" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="7.25" r="1.3" fill="#07070b" />
      <circle cx="12" cy="16.75" r="1.3" fill="currentColor" />
    </>
  ),
};

export function Emblem({
  name,
  size = 24,
  className,
  title,
}: {
  name: EmblemName;
  size?: number | string;
  className?: string;
  /** Accessible label; omit for decorative use. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {EMBLEMS[name]}
    </svg>
  );
}
