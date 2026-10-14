import type { Organizer, OrganizerKind } from "@naruto-tcg/types";
import { ArrowRight, ExternalLink, Globe, Mail, Phone, Sparkles, Store, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { VerifiedBadge } from "@/components/event-badges";
import { SectionHeading } from "@/components/page-header";
import { cx } from "@/lib/format";
import { surface } from "@/lib/styles";

const KIND: Record<OrganizerKind, { label: string; icon: LucideIcon; tone: string }> = {
  official: { label: "Official organiser", icon: Sparkles, tone: "bg-chakra-500/15 text-chakra-400" },
  store: { label: "Local game store", icon: Store, tone: "bg-emerald-500/15 text-emerald-300" },
  community: { label: "Community organiser", icon: Users, tone: "bg-sky-500/15 text-sky-300" },
};

export function OrganizerCard({ organizer }: { organizer: Organizer }) {
  const kind = KIND[organizer.kind];
  const KindIcon = kind.icon;
  const hasContact = organizer.email || organizer.phone || organizer.website;

  return (
    <section aria-labelledby="organiser-heading" id="organiser" className="scroll-mt-6">
      <SectionHeading id="organiser-heading" title="Organiser" />
      <div className={cx(surface.panel, "mt-4")}>
        <div className="flex items-start gap-4">
          <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", kind.tone)}>
            <KindIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-semibold text-white">{organizer.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ash-400">{kind.label}</span>
              {organizer.verified && <VerifiedBadge />}
            </div>
          </div>
        </div>

        {hasContact ? (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {organizer.email && (
              <ContactItem icon={Mail} href={`mailto:${organizer.email}`} label="Email">
                {organizer.email}
              </ContactItem>
            )}
            {organizer.phone && (
              <ContactItem icon={Phone} href={`tel:${organizer.phone.replace(/[^\d+]/g, "")}`} label="Phone">
                {organizer.phone}
              </ContactItem>
            )}
            {organizer.website && (
              <ContactItem icon={Globe} href={organizer.website} label="Website" external>
                {displayHost(organizer.website)}
              </ContactItem>
            )}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ash-400">The organiser hasn&apos;t published contact details.</p>
        )}

        {organizer.storeSlug && (
          <Link
            href={`/store/${organizer.storeSlug}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-chakra-400 hover:text-chakra-500"
          >
            View store profile
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

function ContactItem({
  icon: Icon,
  href,
  label,
  external = false,
  children,
}: {
  icon: LucideIcon;
  href: string;
  label: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="min-w-0">
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group flex min-w-0 items-center gap-3 rounded-lg border border-shadow-700 bg-shadow-950/60 px-3 py-2.5 text-sm transition-colors hover:border-chakra-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
      >
        <Icon className="h-4 w-4 shrink-0 text-ash-400 group-hover:text-chakra-400" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-xs text-ash-400">{label}</span>
          <span className="block truncate font-medium text-ash-200 group-hover:text-white">{children}</span>
        </span>
        {external && (
          <>
            <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-ash-400" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </>
        )}
      </a>
    </li>
  );
}

function displayHost(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}
