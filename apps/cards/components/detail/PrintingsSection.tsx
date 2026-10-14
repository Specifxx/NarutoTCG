import Link from "next/link";
import { Fragment } from "react";
import { formatDate, setHref } from "@/lib/meta";
import { PrintingsChecklist, type PrintingRow } from "./PrintingsChecklist";
import { SectionHeading } from "./SectionHeading";

const LIST_FORMAT = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

interface AvailabilitySet {
  id: string;
  shortName: string;
  releaseDate: string | undefined;
  upcoming: boolean;
}

const LINK =
  "rounded-sm font-semibold text-white underline decoration-chakra-500/60 underline-offset-4 transition hover:decoration-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

/** "A, B, and C" with each set linked to its checklist. */
function SetList({ sets, withDates = false }: { sets: readonly AvailabilitySet[]; withDates?: boolean }) {
  const byId = new Map(sets.map((set) => [set.id, set]));
  return LIST_FORMAT.formatToParts(sets.map((set) => set.id)).map((part, i) => {
    const set = part.type === "element" ? byId.get(part.value) : undefined;
    if (!set) return <Fragment key={i}>{part.value}</Fragment>;
    return (
      <Fragment key={i}>
        <Link href={setHref(set.id)} className={LINK}>
          {set.shortName}
        </Link>
        {withDates && set.releaseDate && (
          <>
            {" "}
            (<time dateTime={set.releaseDate}>{formatDate(set.releaseDate)}</time>)
          </>
        )}
      </Fragment>
    );
  });
}

/** Availability sentence ("Available in Starter Deck 01 and Promo Pack 1") plus the printings checklist. */
export function PrintingsSection({ cardName, rows }: { cardName: string; rows: readonly PrintingRow[] }) {
  const sets: AvailabilitySet[] = [];
  for (const row of rows) {
    if (sets.some((set) => set.id === row.setId)) continue;
    sets.push({ id: row.setId, shortName: row.setShortName, releaseDate: row.releaseDate, upcoming: row.upcoming });
  }
  const released = sets.filter((set) => !set.upcoming);
  const upcoming = sets.filter((set) => set.upcoming);

  return (
    <section aria-labelledby="printings-heading" className="scroll-mt-32">
      <SectionHeading
        id="printings-heading"
        eyebrow="Set listing"
        title={
          <>
            Printings <span className="text-ash-400">({rows.length})</span>
          </>
        }
      />
      <p className="mt-3 text-[15px] leading-relaxed text-ash-200">
        {released.length > 0 && (
          <>
            Available in <SetList sets={released} />.
          </>
        )}
        {released.length > 0 && upcoming.length > 0 && " "}
        {upcoming.length > 0 && (
          <>
            {released.length > 0 ? "Also coming to " : "Releasing in "}
            <SetList sets={upcoming} withDates />.
          </>
        )}
      </p>
      <div className="mt-5">
        <PrintingsChecklist cardName={cardName} rows={rows} />
      </div>
    </section>
  );
}
