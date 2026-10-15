import Link from "next/link";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import type { LessonSummary } from "./types";

function PagerLink({
  href,
  dir,
  eyebrow,
  title,
  emblem,
  accent,
}: {
  href: string;
  dir: "prev" | "next";
  eyebrow: string;
  title: string;
  emblem: EmblemName;
  accent: Accent;
}) {
  const a = ACCENT_STYLES[accent];
  const next = dir === "next";
  return (
    <Link
      href={href}
      rel={next ? "next" : "prev"}
      className={cn(
        "group panel relative flex min-w-0 items-center gap-4 overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 focus:outline-none focus-visible:ring-2 sm:p-5",
        a.ring,
        next && "flex-row-reverse text-right",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 h-28 w-28 -translate-y-1/2 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-50",
          next ? "-right-8" : "-left-8",
        )}
        style={{ background: a.hex[1] }}
      />
      <span
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300",
          a.border,
          a.softBg,
          next ? "group-hover:translate-x-1" : "group-hover:-translate-x-1",
        )}
      >
        <Emblem name={emblem} size={22} className={a.text} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={cn("eyebrow flex items-center gap-1.5", a.text, next && "justify-end")}>
          {!next && <Icon name="arrow-left" size={12} />}
          {eyebrow}
          {next && <Icon name="arrow-right" size={12} />}
        </span>
        <span className="mt-1 line-clamp-2 text-balance text-[15px] font-bold text-white">{title}</span>
      </span>
    </Link>
  );
}

/** Previous / next lesson links at the foot of a lesson. */
export function LessonPager({ prev, next }: { prev?: LessonSummary; next?: LessonSummary }) {
  return (
    <nav aria-label="More lessons" className="mt-12 grid gap-3 sm:grid-cols-2">
      {prev ? (
        <PagerLink
          href={`/how-to-play/${prev.id}`}
          dir="prev"
          eyebrow={`Lesson ${prev.order}`}
          title={prev.title}
          emblem={prev.emblem}
          accent={prev.accent}
        />
      ) : (
        <PagerLink href="/how-to-play" dir="prev" eyebrow="All lessons" title="Path of the Ninja" emblem="scroll" accent="chakra" />
      )}
      {next ? (
        <PagerLink
          href={`/how-to-play/${next.id}`}
          dir="next"
          eyebrow={`Lesson ${next.order}`}
          title={next.title}
          emblem={next.emblem}
          accent={next.accent}
        />
      ) : (
        <PagerLink href="/puzzles" dir="next" eyebrow="Final trial" title="Lethal Puzzles" emblem="target" accent="gold" />
      )}
    </nav>
  );
}
