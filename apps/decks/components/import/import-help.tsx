import { cx } from "@naruto-tcg/ui";
import { HINT, PANEL } from "./styles";

const POINTS = [
  { title: "Private by default", body: "Files are read in your browser. Nothing is uploaded." },
  {
    title: "Forgiving matching",
    body: "Names match across files ignoring case, accents and typos; deck names and card lists are mapped to known archetypes and cards.",
  },
  {
    title: "Saved on this device",
    body: "Saved events join the tournament directory and deck search here, and the meta when you opt in.",
  },
  { title: "Publishing", body: "To add an event for everyone, download the normalized JSON and run the CLI importer." },
] as const;

/** Static notes beside the wizard (server-rendered). */
export function ImportHelp() {
  return (
    <section aria-labelledby="import-help-title" className={cx(PANEL, "p-4")}>
      <h2 id="import-help-title" className="text-base font-bold text-white">
        How importing works
      </h2>
      <dl className="mt-3 flex flex-col gap-3">
        {POINTS.map((point) => (
          <div key={point.title}>
            <dt className="text-sm font-semibold text-ash-100">{point.title}</dt>
            <dd className={cx(HINT, "mt-0.5")}>{point.body}</dd>
          </div>
        ))}
      </dl>
      <p className={cx(HINT, "mt-4 border-t border-shadow-700 pt-3")}>
        The sample event and all seed data on this site are fictional demo data.
      </p>
    </section>
  );
}
