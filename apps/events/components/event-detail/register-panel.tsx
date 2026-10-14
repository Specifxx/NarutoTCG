"use client";

import type { RegistrationMethod } from "@naruto-tcg/types";
import {
  Ban,
  CalendarClock,
  CircleCheckBig,
  ExternalLink,
  Globe,
  Hourglass,
  Lock,
  MousePointerClick,
  Phone,
  Store,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { CapacityMeter } from "@/components/capacity-meter";
import { cx } from "@/lib/format";
import {
  isFull,
  registrationPhase,
  type RegistrationResponse,
  type RegistrationSchedule,
} from "@/lib/registrations";
import { button, surface } from "@/lib/styles";
import { useNow } from "@/lib/use-now";
import { RegistrationDialog, type CountryOption } from "./registration-dialog";
import { loadSavedRegistration, saveRegistration, type SavedRegistration } from "./saved-registrations";

export interface RegisterPanelProps {
  eventId: string;
  eventTitle: string;
  /** Pre-formatted "date · venue" line for the dialog header. */
  eventMeta: string;
  schedule: RegistrationSchedule;
  method: RegistrationMethod;
  externalUrl?: string;
  /** Pre-formatted entry fee, e.g. "Free" or "£12.50". */
  fee: string;
  capacity: number | null;
  registeredCount: number;
  /** Venue-local label for when registration opens, formatted on the server. */
  opensLabel?: string;
  /** Venue-local label for when registration closes, formatted on the server. */
  closesLabel: string;
  inStore: { venueName: string; storeHref?: string; phone?: string };
  countries: CountryOption[];
}

const METHOD_LABEL: Record<RegistrationMethod, { label: string; icon: LucideIcon }> = {
  online: { label: "Online sign-up", icon: MousePointerClick },
  "in-store": { label: "Sign up in store", icon: Store },
  external: { label: "Organiser website", icon: Globe },
};

/**
 * Entry fee, capacity and the registration call to action. Which action shows
 * depends on the current time, so it renders a neutral skeleton until mounted.
 */
export function RegisterPanel(props: RegisterPanelProps) {
  const { eventId, schedule, method, capacity, registeredCount, fee } = props;
  const now = useNow(15_000);
  const [saved, setSaved] = useState<SavedRegistration | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogWaitlist, setDialogWaitlist] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    setSaved(loadSavedRegistration(eventId));
  }, [eventId]);

  useEffect(() => {
    if (dialogOpen || !restoreFocus.current) return;
    restoreFocus.current = false;
    (saved ? statusRef.current : triggerRef.current)?.focus();
  }, [dialogOpen, saved]);

  // The page is static, so a registration made here may be newer than its count.
  const count = saved?.status === "registered" ? Math.max(registeredCount, saved.registeredCount) : registeredCount;
  const full = isFull(capacity, count);
  const methodMeta = METHOD_LABEL[method];
  const MethodIcon = methodMeta.icon;

  const handleRegistered = (response: RegistrationResponse, displayName: string) => {
    const record: SavedRegistration = {
      status: response.status,
      confirmationCode: response.confirmationCode,
      displayName,
      registeredCount: response.registeredCount,
      ...(response.waitlistPosition ? { waitlistPosition: response.waitlistPosition } : {}),
      savedAt: new Date().toISOString(),
    };
    saveRegistration(eventId, record);
    setSaved(record);
  };

  const openDialog = () => {
    setDialogWaitlist(full);
    setDialogOpen(true);
  };

  return (
    <section aria-labelledby="registration-heading" className={cx(surface.panel, "relative overflow-hidden")}>
      <h2 id="registration-heading" className="sr-only">
        Registration
      </h2>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">Entry fee</p>
          <p className="mt-0.5 text-2xl font-bold text-white tabular-nums">{fee}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-shadow-700 bg-shadow-950/60 px-2.5 py-1 text-xs font-medium text-ash-200">
          <MethodIcon className="h-3.5 w-3.5 text-ash-400" aria-hidden="true" />
          {methodMeta.label}
        </span>
      </div>

      <CapacityMeter registered={count} capacity={capacity} className="mt-4" />

      <div className="mt-5">
        <RegistrationAction
          {...props}
          now={now}
          saved={saved}
          full={full}
          triggerRef={triggerRef}
          statusRef={statusRef}
          onOpen={openDialog}
        />
      </div>

      {method === "online" && (
        <RegistrationDialog
          open={dialogOpen}
          onClose={() => {
            restoreFocus.current = true;
            setDialogOpen(false);
          }}
          eventId={eventId}
          eventTitle={props.eventTitle}
          eventMeta={props.eventMeta}
          waitlist={dialogWaitlist}
          countries={props.countries}
          onRegistered={handleRegistered}
        />
      )}
    </section>
  );
}

function RegistrationAction({
  now,
  saved,
  full,
  triggerRef,
  statusRef,
  onOpen,
  schedule,
  method,
  externalUrl,
  opensLabel,
  closesLabel,
  inStore,
}: RegisterPanelProps & {
  now: Date | null;
  saved: SavedRegistration | null;
  full: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  statusRef: RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  if (!now) {
    return (
      <div aria-busy="true">
        <div className="h-10 w-full animate-pulse rounded-md bg-shadow-700/70" aria-hidden="true" />
        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-shadow-700/50" aria-hidden="true" />
        <span className="sr-only">Checking registration status…</span>
      </div>
    );
  }

  const phase = registrationPhase(schedule, now);

  if (phase === "cancelled") return <Unavailable icon={Ban}>Event cancelled</Unavailable>;
  if (phase === "ended") {
    return <Unavailable icon={Lock} note="This event has ended.">Registration closed</Unavailable>;
  }
  if (saved) return <SavedState saved={saved} statusRef={statusRef} />;
  if (phase === "not-open") {
    return (
      <Unavailable icon={CalendarClock} note="Registration isn't open yet — check back then.">
        Opens {opensLabel}
      </Unavailable>
    );
  }
  if (phase === "closed") {
    return (
      <Unavailable
        icon={Lock}
        note={method === "in-store" ? "Ask the store whether walk-in spots are left." : `Registration closed ${closesLabel}.`}
      >
        Registration closed
      </Unavailable>
    );
  }

  const closesNote = <Note>Registration closes {closesLabel}.</Note>;

  if (method === "external") {
    if (!externalUrl) {
      return <Unavailable icon={Globe} note="Contact the organiser to sign up.">Registration by organiser</Unavailable>;
    }
    return (
      <>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(button.primary, "w-full py-2.5")}
        >
          Register on organiser site
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <Note>You&apos;ll finish signing up on {hostname(externalUrl)}.</Note>
        {closesNote}
      </>
    );
  }

  if (method === "in-store") {
    return (
      <>
        <div className={cx(surface.inset, "p-4")}>
          <p className="flex items-center gap-2 font-semibold text-white">
            <Store className="h-4 w-4 text-chakra-400" aria-hidden="true" />
            Register in store
          </p>
          <p className="mt-1 text-sm text-ash-400">
            Sign up at the counter at {inStore.venueName} — staff will add you to the player list.
          </p>
          {(inStore.storeHref || inStore.phone) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {inStore.storeHref && (
                <Link href={inStore.storeHref} className={cx(button.secondary, "px-3 py-1.5")}>
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Store details
                </Link>
              )}
              {inStore.phone && (
                <a href={telHref(inStore.phone)} className={cx(button.secondary, "px-3 py-1.5")}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Call </span>
                  {inStore.phone}
                </a>
              )}
            </div>
          )}
        </div>
        {closesNote}
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cx(button.primary, "w-full py-2.5")}
      >
        {full ? <Hourglass className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
        {full ? "Join waitlist" : "Register now"}
      </button>
      {full && <Note>All spots are taken — waitlisted players are contacted if one opens.</Note>}
      {closesNote}
    </>
  );
}

function Unavailable({ icon: Icon, note, children }: { icon: LucideIcon; note?: string; children: ReactNode }) {
  return (
    <>
      <button type="button" disabled className={cx(button.secondary, "w-full py-2.5")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {children}
      </button>
      {note && <Note>{note}</Note>}
    </>
  );
}

function SavedState({
  saved,
  statusRef,
}: {
  saved: SavedRegistration;
  statusRef: RefObject<HTMLDivElement | null>;
}) {
  const waitlisted = saved.status === "waitlisted";
  return (
    <div
      ref={statusRef}
      tabIndex={-1}
      className={cx(
        "rounded-lg border p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
        waitlisted ? "border-amber-400/40 bg-amber-500/10" : "border-emerald-400/40 bg-emerald-500/10",
      )}
    >
      <p className={cx("flex items-center gap-2 font-semibold", waitlisted ? "text-amber-200" : "text-emerald-200")}>
        {waitlisted ? (
          <Hourglass className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
        )}
        {waitlisted
          ? `You're on the waitlist${saved.waitlistPosition ? ` (#${saved.waitlistPosition})` : ""}`
          : "You're registered"}
      </p>
      <p className="mt-1 text-sm text-ash-200">
        as <span className="font-medium text-white">{saved.displayName}</span>
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ash-400">Confirmation code</p>
      <p className="font-mono text-lg font-semibold tracking-[0.18em] text-white">{saved.confirmationCode}</p>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-ash-400">{children}</p>;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the organiser's website";
  }
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
