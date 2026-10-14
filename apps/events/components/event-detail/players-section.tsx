import type { Participant } from "@naruto-tcg/types";
import { Lock, Users } from "lucide-react";
import { SectionHeading } from "@/components/page-header";
import { countryName, cx, flagEmoji, pluralize } from "@/lib/format";
import { surface } from "@/lib/styles";

/** Public roster when the organiser publishes one, otherwise just the count. */
export function PlayersSection({
  participants,
  registeredCount,
  capacity,
}: {
  participants?: Participant[];
  registeredCount: number;
  capacity: number | null;
}) {
  const roster = participants ?? [];
  const countries = new Set(roster.map((p) => p.country).filter(Boolean));
  const hasTeams = roster.some((p) => p.team);

  return (
    <section aria-labelledby="players-heading">
      <SectionHeading
        id="players-heading"
        title="Players"
        description={
          capacity === null
            ? `${pluralize(registeredCount, "player")} preregistered · open entry`
            : `${registeredCount.toLocaleString("en-US")} of ${capacity.toLocaleString("en-US")} spots filled`
        }
      />

      {roster.length === 0 ? (
        <div className={cx(surface.inset, "mt-4 flex items-start gap-3 p-4")}>
          {registeredCount === 0 ? (
            <>
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
              <p className="text-sm text-ash-200">No players have preregistered yet.</p>
            </>
          ) : (
            <>
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
              <p className="text-sm text-ash-200">
                <span className="font-semibold text-white tabular-nums">{pluralize(registeredCount, "player")}</span>{" "}
                preregistered — the organiser keeps the roster private.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-labelledby="players-heading"
            tabIndex={0}
            className={cx(
              surface.card,
              "relative mt-4 max-h-[28rem] overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
            )}
          >
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Registered players: {roster.length} of {registeredCount} shown
              </caption>
              <thead className="sticky top-0 bg-shadow-900 text-xs uppercase tracking-wider text-ash-400">
                <tr>
                  <th scope="col" className="w-10 px-4 py-2.5 font-semibold">
                    <span aria-hidden="true">#</span>
                    <span className="sr-only">Number</span>
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Player
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Country
                  </th>
                  {hasTeams && (
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Team
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-shadow-700">
                {roster.map((player, i) => (
                  <tr key={`${i}-${player.displayName}`} className="hover:bg-shadow-800/50">
                    <td className="px-4 py-2.5 text-ash-400 tabular-nums">{i + 1}</td>
                    <th scope="row" className="px-4 py-2.5 font-medium text-white">
                      {player.displayName}
                    </th>
                    <td className="px-4 py-2.5 text-ash-200">
                      {player.country ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span aria-hidden="true">{flagEmoji(player.country)}</span>
                          {countryName(player.country)}
                        </span>
                      ) : (
                        <NotShared />
                      )}
                    </td>
                    {hasTeams && <td className="px-4 py-2.5 text-ash-200">{player.team ?? <NotShared label="No team" />}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ash-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                {roster.length.toLocaleString("en-US")} of {pluralize(registeredCount, "registered player")} shown
              </span>
            </span>
            {countries.size > 1 && <span>· from {pluralize(countries.size, "country", "countries")}</span>}
          </p>
        </>
      )}
    </section>
  );
}

function NotShared({ label = "Not shared" }: { label?: string }) {
  return (
    <span className="text-ash-400">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
