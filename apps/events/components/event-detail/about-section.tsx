import type { TcgEvent } from "@naruto-tcg/types";
import { Hash, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/page-header";
import { eventFormatMeta, eventTypeMeta } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { formatDate, localeForRegion } from "@/lib/time";
import { surface } from "@/lib/styles";

export function AboutSection({ event }: { event: TcgEvent }) {
  const format = eventFormatMeta(event.format);
  const type = eventTypeMeta(event.type);
  const paragraphs = event.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="about-heading">
      <SectionHeading id="about-heading" title="About this event" />
      <div className="mt-4 max-w-prose space-y-3 leading-relaxed text-ash-200">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Explainer icon={format.icon} eyebrow="Format" title={format.label} body={format.description} />
        <Explainer
          icon={type.icon}
          eyebrow="Event type"
          title={type.label}
          body={type.description}
          accent={cx(type.classes.text, type.classes.bg, type.classes.border)}
        />
      </div>

      {event.tags.length > 0 && (
        <ul aria-label="Tags" className="mt-5 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`/events?q=${encodeURIComponent(tag.replace(/-/g, " "))}`}
                className="inline-flex items-center gap-1 rounded-full border border-shadow-700 bg-shadow-900 px-2.5 py-1 text-xs font-medium text-ash-400 transition-colors hover:border-shadow-500 hover:text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                <Hash className="h-3 w-3" aria-hidden="true" />
                {tag.replace(/-/g, " ")}
                <span className="sr-only"> — find more events tagged {tag.replace(/-/g, " ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {event.source && <SourceNote source={event.source} event={event} />}
    </section>
  );
}

function Explainer({
  icon: Icon,
  eyebrow,
  title,
  body,
  accent = "text-ash-200 bg-shadow-800 border-shadow-700",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  accent?: string;
}) {
  return (
    <div className={cx(surface.card, "flex gap-3 p-4")}>
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", accent)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">{eyebrow}</p>
        <p className="mt-0.5 font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-ash-400">{body}</p>
      </div>
    </div>
  );
}

function SourceNote({ source, event }: { source: NonNullable<TcgEvent["source"]>; event: TcgEvent }) {
  let host = source.url;
  try {
    host = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    // Keep the raw value; validation already requires an http(s) URL.
  }
  const retrieved = Number.isNaN(Date.parse(source.retrievedAt))
    ? null
    : formatDate(source.retrievedAt, event.timeZone, localeForRegion(event.region), {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  return (
    <p className="mt-5 text-xs text-ash-400">
      Listing source:{" "}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ash-200 underline-offset-4 hover:text-chakra-400 hover:underline"
      >
        {host}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {retrieved && <> · retrieved {retrieved}</>}. Confirm details with the organiser before travelling.
    </p>
  );
}
