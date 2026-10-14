import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players/profiles";
import { countryName, flagEmoji } from "./country";

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]![0], words[words.length - 1]![0]] : [words[0]?.[0]];
  return letters.filter(Boolean).join("").toUpperCase() || "?";
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M11.3 1.7a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L6 13l-3.6.9a.5.5 0 0 1-.6-.6L2.7 9.7l8.6-8Z" />
    </svg>
  );
}

/** Where a profile comes from: the seed database, or only events imported in this browser. */
export type ProfileOrigin = "seed" | "imported";

/** Profile header: initials avatar, name, country flag and code, author badge, join date and bio. */
export function ProfileHeader({
  profile,
  actions,
  origin = "seed",
}: {
  profile: PlayerProfile;
  actions?: ReactNode;
  origin?: ProfileOrigin;
}) {
  const flag = flagEmoji(profile.country);
  const country = profile.country ? countryName(profile.country) : null;
  return (
    <PageHeader
      eyebrow={profile.isAuthor ? "Deck author" : origin === "imported" ? "Imported player" : "Player profile"}
      title={
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-shadow-600 bg-shadow-800 text-lg font-bold text-chakra-300 sm:h-14 sm:w-14 sm:text-xl"
          >
            {initials(profile.name)}
          </span>
          <span className="min-w-0 break-words">{profile.name}</span>
        </span>
      }
      description={
        <>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {profile.country && (
              <span className="inline-flex items-center gap-1.5 text-ash-200">
                {flag && (
                  <span aria-hidden="true" className="text-base leading-none">
                    {flag}
                  </span>
                )}
                <abbr title={country ?? undefined} className="font-semibold text-ash-100 no-underline">
                  {profile.country.toUpperCase()}
                </abbr>
                {country && country !== profile.country.toUpperCase() && <span className="sr-only">({country})</span>}
              </span>
            )}
            {profile.isAuthor && (
              <span className="inline-flex items-center gap-1 rounded-full border border-chakra-600 bg-shadow-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-chakra-300">
                <PenIcon className="h-3 w-3" />
                Author
              </span>
            )}
            {profile.joined && <span className="text-ash-400">Joined {formatDate(profile.joined)}</span>}
            <span className="font-mono text-xs text-ash-500">@{profile.handle}</span>
          </span>
          {profile.bio && <span className="mt-3 block text-ash-300">{profile.bio}</span>}
          <span className="mt-2 block text-xs text-ash-500">
            {origin === "imported"
              ? "Built from events imported in this browser only; nobody else sees this profile."
              : "Fictional demo profile: every player, event and result on this site is made up."}
          </span>
        </>
      }
      actions={actions}
    />
  );
}
