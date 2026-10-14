import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { ArrowRightIcon, DownloadIcon, TerminalIcon } from "./icons";
import { IMPORT_FORMATS, INGEST_COMMAND, templateHref } from "./organizer";
import { BUTTON_PRIMARY, EYEBROW, FOCUS_RING, MINI_LABEL } from "./styles";

/** What the import wizard accepts, downloadable templates and the CLI for publishing to everyone. */
export function OrganizerPanel() {
  return (
    <section
      aria-labelledby="organizers-title"
      className="flex min-w-0 flex-col gap-5 rounded-lg border border-chakra-600/60 bg-shadow-900 p-4 sm:p-6"
    >
      <div>
        <p className={EYEBROW}>For Tournament Organizers</p>
        <h2 id="organizers-title" className="mt-1 text-xl font-bold text-white">
          Publish your event results
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ash-400">
          The import wizard reads your exports in the browser, matches names, decks and cards, and flags anything that does
          not add up. Saved events join the tournament directory and deck search on this device, and the meta when you opt
          in.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ash-100">The wizard accepts</h3>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {IMPORT_FORMATS.map((format) => (
            <li key={format.template} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-shadow-700 bg-shadow-800/70 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="rounded border border-shadow-500 px-1.5 py-px font-mono text-[10px] font-semibold text-ash-300">
                  {format.kind}
                </span>
                {format.label}
              </p>
              <p className="text-xs text-ash-400">{format.description}</p>
              <a
                href={templateHref(format.template)}
                download
                className={cx(
                  "mt-auto inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm text-xs text-ash-300 hover:text-chakra-300",
                  FOCUS_RING,
                )}
              >
                <DownloadIcon className="h-3.5 w-3.5 text-ash-500" />
                <span className="truncate font-mono">{format.template}</span>
                <span className="sr-only"> (download {format.label} template)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ash-100">
          <TerminalIcon className="h-4 w-4 text-ash-400" />
          Publishing for everyone? Use the CLI
        </h3>
        <pre className="mt-2 relative overflow-x-auto rounded-md border border-shadow-700 bg-shadow-950 px-3 py-2.5 font-mono text-xs text-ash-100">
          <code>{INGEST_COMMAND}</code>
        </pre>
        <p className="mt-2 text-xs text-ash-400">
          Run it from anywhere in the repo; file paths resolve from the directory you run it in. It validates and normalizes the export, prints an issue report and writes canonical tournament JSON. Pass{" "}
          <code className="font-mono text-ash-200">--meta event.json</code> with a set of CSVs, or{" "}
          <code className="font-mono text-ash-200">--dry-run</code> to only check.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/tournaments/import" className={BUTTON_PRIMARY}>
          Open the import wizard
          <ArrowRightIcon />
        </Link>
        <p className={MINI_LABEL}>Files never leave your browser</p>
      </div>
    </section>
  );
}
