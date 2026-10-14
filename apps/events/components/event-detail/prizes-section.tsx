import { Gift, Medal, Trophy } from "lucide-react";
import { SectionHeading } from "@/components/page-header";
import { cx } from "@/lib/format";
import { surface } from "@/lib/styles";

export function PrizesSection({ prizes }: { prizes: string[] }) {
  return (
    <section aria-labelledby="prizes-heading">
      <SectionHeading id="prizes-heading" title="Prizes" />
      {prizes.length === 0 ? (
        <p className="mt-3 text-sm text-ash-400">Prize support hasn&apos;t been announced yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {prizes.map((prize, i) => {
            // The first listed prize is treated as the headline award.
            const Icon = i === 0 ? Trophy : i === 1 ? Medal : Gift;
            return (
              <li key={`${i}-${prize}`} className={cx(surface.inset, "flex items-start gap-3 p-3")}>
                <span
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    i === 0 ? "bg-amber-400/15 text-amber-300" : "bg-shadow-800 text-ash-400",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="pt-1 text-sm text-ash-200">{prize}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
