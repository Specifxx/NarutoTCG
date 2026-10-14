import type { SocialLinks } from "@naruto-tcg/types";
import type { ReactNode } from "react";

/**
 * Simplified monochrome glyphs for social networks (lucide-react 1.x ships no
 * brand icons). Drawn on a 24×24 grid in `currentColor`; always decorative, so
 * the surrounding link must carry the accessible name.
 */
export type SocialNetwork = keyof SocialLinks;

export const SOCIAL_NETWORKS: readonly { network: SocialNetwork; label: string }[] = [
  { network: "instagram", label: "Instagram" },
  { network: "discord", label: "Discord" },
  { network: "x", label: "X" },
  { network: "facebook", label: "Facebook" },
  { network: "youtube", label: "YouTube" },
  { network: "tiktok", label: "TikTok" },
  { network: "twitch", label: "Twitch" },
];

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const GLYPHS: Record<SocialNetwork, ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...stroke} />
      <circle cx="12" cy="12" r="3.9" {...stroke} />
      <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" />
    </>
  ),
  x: (
    <>
      <path d="M3.6 3.5h4.9l11.9 17H15.5z" fill="currentColor" />
      <path d="M19.6 3.5 13.4 10.6M10.6 13.4 4.4 20.5" {...stroke} strokeWidth={1.6} />
    </>
  ),
  facebook: (
    <>
      <circle cx="12" cy="12" r="8.6" {...stroke} />
      <path d="M15.1 7.6h-1.6a2.3 2.3 0 0 0-2.3 2.3v10.6M8.9 12.9h5.7" {...stroke} strokeWidth={2} />
    </>
  ),
  discord: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M8.6 5.2c-1.6.3-3 .8-4.3 1.5C2 10.1 1.4 13.5 1.7 16.8c1.6 1.2 3.3 2 5 2.4l1.2-1.8c-.7-.3-1.3-.6-1.9-1l.5-.4c3.6 1.6 7.4 1.6 11 0l.5.4c-.6.4-1.2.7-1.9 1l1.2 1.8c1.7-.4 3.4-1.2 5-2.4.4-3.9-.6-7.2-2.6-10.1-1.3-.7-2.7-1.2-4.3-1.5l-.6 1.2a15 15 0 0 0-4.6 0zm.3 6.3c-.9 0-1.6.8-1.6 1.8s.7 1.8 1.6 1.8 1.6-.8 1.6-1.8-.7-1.8-1.6-1.8zm6.2 0c-.9 0-1.6.8-1.6 1.8s.7 1.8 1.6 1.8 1.6-.8 1.6-1.8-.7-1.8-1.6-1.8z"
    />
  ),
  youtube: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M2.5 8.4c0-1.9 1.3-3.4 3.2-3.5C7.6 4.8 9.8 4.7 12 4.7s4.4.1 6.3.2c1.9.1 3.2 1.6 3.2 3.5v7.2c0 1.9-1.3 3.4-3.2 3.5-1.9.1-4.1.2-6.3.2s-4.4-.1-6.3-.2c-1.9-.1-3.2-1.6-3.2-3.5zm7.6.4v6.4l5.6-3.2z"
    />
  ),
  tiktok: (
    <path d="M13.6 3.5v11.6a3.6 3.6 0 1 1-3.6-3.6M13.6 3.5c.4 2.6 2.2 4.4 5 4.6" {...stroke} strokeWidth={2.1} />
  ),
  twitch: (
    <>
      <path d="M5.2 3.5 3.6 7.2v12h4.2v2.3h2.4l2.3-2.3h3.5l4.4-4.4V3.5z" {...stroke} />
      <path d="M11.1 7.8v4.3M15.5 7.8v4.3" {...stroke} strokeWidth={2} />
    </>
  ),
};

export function SocialIcon({ network, className }: { network: SocialNetwork; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {GLYPHS[network]}
    </svg>
  );
}

/** Short visible handle for a profile URL: "@hiddenleafgames", "discord.gg/hiddenleaf". */
export function socialHandle(network: SocialNetwork, url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    const segment = pathname.split("/").filter(Boolean)[0] ?? "";
    if (!segment) return host;
    if (network === "discord") return `${host}/${segment}`;
    return `@${segment.replace(/^@/, "")}`;
  } catch {
    return url;
  }
}
