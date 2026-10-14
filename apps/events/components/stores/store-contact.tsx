import type { Store } from "@naruto-tcg/types";
import { ExternalLink, Globe, Mail, Phone, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import { surface } from "@/lib/styles";
import { SOCIAL_NETWORKS, SocialIcon, socialHandle } from "./social-icons";

/** "tel:" href from a display number such as "+1 (213) 555-0142". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Hostname without "www." for display. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ContactRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-shadow-800 text-ash-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 pt-1 text-sm">{children}</dd>
    </div>
  );
}

const linkClass =
  "break-words font-medium text-ash-200 underline-offset-4 hover:text-chakra-400 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

/** Phone, email, website and social profiles. */
export function StoreContact({ store, className }: { store: Store; className?: string }) {
  const { phone, email, website } = store.contact;
  const socials = SOCIAL_NETWORKS.flatMap(({ network, label }) => {
    const url = store.social[network];
    return url ? [{ network, label, url, handle: socialHandle(network, url) }] : [];
  });
  const hasContact = Boolean(phone || email || website);

  return (
    <section aria-labelledby="store-contact-heading" className={cx(surface.panel, className)}>
      <h2 id="store-contact-heading" className="text-lg font-semibold text-white">
        Contact &amp; social
      </h2>

      {hasContact ? (
        <dl className="mt-4 space-y-3">
          {phone && (
            <ContactRow icon={Phone} label="Phone">
              <a href={telHref(phone)} className={cx(linkClass, "tabular-nums")}>
                {phone}
              </a>
            </ContactRow>
          )}
          {email && (
            <ContactRow icon={Mail} label="Email">
              <a href={`mailto:${email}`} className={linkClass}>
                {email}
              </a>
            </ContactRow>
          )}
          {website && (
            <ContactRow icon={Globe} label="Website">
              <a href={website} target="_blank" rel="noopener noreferrer" className={cx(linkClass, "inline-flex items-center gap-1")}>
                {displayHost(website)}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ash-400" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </ContactRow>
          )}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-ash-400">This store hasn&apos;t shared contact details yet.</p>
      )}

      {socials.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ash-400">Follow</h3>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {socials.map(({ network, label, url, handle }) => (
              <li key={network} className="min-w-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label}: ${handle} (opens in a new tab)`}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg border border-shadow-700 bg-shadow-950/60 px-3 py-2 text-sm text-ash-200 transition-colors hover:border-chakra-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  <SocialIcon network={network} className="h-4.5 w-4.5 shrink-0 text-ash-200" />
                  <span className="min-w-0">
                    <span className="block text-[11px] leading-tight text-ash-400">{label}</span>
                    <span className="block truncate font-medium">{handle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
