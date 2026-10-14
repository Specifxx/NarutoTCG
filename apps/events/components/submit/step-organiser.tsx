import { BadgeCheck, Building2, Store, Trophy, Users } from "lucide-react";
import { REGIONS, regionForCountry } from "@/lib/event-meta";
import {
  currencyForCountry,
  ORGANISER_ROLES,
  VENUE_COUNTRIES,
  venueCountry,
  type OrganiserRole,
  type SubmissionStoreOption,
  type VenueMode,
} from "@/lib/submission";
import { FieldSection, RadioCardGroup, SelectField, TextField, type RadioCardOption, type StepProps } from "./fields";
import { StorePicker } from "./store-picker";
import { VenueCoordinates } from "./venue-coordinates";

const ROLE_ICONS = { "store-owner": Store, "tournament-organizer": Trophy, "community-leader": Users } as const;

const ROLE_OPTIONS: RadioCardOption<OrganiserRole>[] = ORGANISER_ROLES.map((r) => ({
  value: r.role,
  label: r.label,
  description: r.description,
  icon: ROLE_ICONS[r.role],
}));

const VENUE_MODE_OPTIONS: RadioCardOption<VenueMode>[] = [
  {
    value: "store",
    label: "A verified store",
    description: "A game store from our directory. Address and map pin are filled in for you.",
    icon: BadgeCheck,
  },
  {
    value: "new",
    label: "A new venue",
    description: "A convention hall, library, café or a store that isn't verified yet.",
    icon: Building2,
  },
];

const COUNTRY_GROUPS = REGIONS.map(({ region, label }) => ({
  label,
  countries: VENUE_COUNTRIES.filter((c) => regionForCountry(c.code) === region).sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
})).filter((g) => g.countries.length > 0);

export function OrganiserStep({
  draft,
  errors,
  patch,
  stores,
}: StepProps & { stores: readonly SubmissionStoreOption[] }) {
  const { organiser, venue } = draft;

  // A venue fixes the local time zone and the usual currency. Later steps let the organiser override the
  // currency, and the zone for a new venue only (a directory store's events always use the store's zone).
  function selectStore(store: SubmissionStoreOption) {
    patch("venue", { storeSlug: store.slug });
    patch("schedule", { timeZone: store.timeZone });
    patch("fee", { currency: currencyForCountry(store.country) });
  }

  function selectCountry(code: string) {
    patch("venue", { country: code });
    const country = venueCountry(code);
    if (!country) return;
    patch("fee", { currency: country.currency });
    if (country.timeZone) patch("schedule", { timeZone: country.timeZone });
  }

  function selectMode(mode: VenueMode) {
    patch("venue", { mode });
    const store = mode === "store" ? stores.find((s) => s.slug === venue.storeSlug) : undefined;
    if (store) selectStore(store);
    else if (mode === "new" && venue.country) selectCountry(venue.country);
  }

  return (
    <>
      <FieldSection
        title="About you"
        description="We use these details to contact you about this listing. They may also be shown as the organiser contact (see below)."
      >
        <RadioCardGroup
          path="organiser.role"
          label="Which best describes you?"
          options={ROLE_OPTIONS}
          value={organiser.role}
          onChange={(role) => patch("organiser", { role })}
          error={errors["organiser.role"]}
          columns="lg:grid-cols-3"
          compact
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            path="organiser.name"
            label="Your name"
            autoComplete="name"
            value={organiser.name}
            onChange={(e) => patch("organiser", { name: e.target.value })}
            error={errors["organiser.name"]}
          />
          <TextField
            path="organiser.email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={organiser.email}
            onChange={(e) => patch("organiser", { email: e.target.value })}
            error={errors["organiser.email"]}
            hint="Review updates go here. Players also see it as the organiser contact, unless you're the store owner and pick your verified store as the venue."
          />
        </div>
        <TextField
          path="organiser.phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          optional
          className="sm:max-w-xs"
          value={organiser.phone}
          onChange={(e) => patch("organiser", { phone: e.target.value })}
          error={errors["organiser.phone"]}
          hint="Shown to players with your email under the same rule. Include the country code, e.g. +44."
        />
      </FieldSection>

      <FieldSection title="Venue" description="Players see the venue on the event page and on the map.">
        <RadioCardGroup
          path="venue.mode"
          label="Where is it happening?"
          options={VENUE_MODE_OPTIONS}
          value={venue.mode}
          onChange={selectMode}
          error={errors["venue.mode"]}
        />

        {venue.mode === "store" && (
          <StorePicker
            stores={stores}
            value={venue.storeSlug}
            error={errors["venue.storeSlug"]}
            onSelect={selectStore}
            onUseNewVenue={() => selectMode("new")}
          />
        )}

        {venue.mode === "new" && (
          <div className="space-y-5">
            <TextField
              path="venue.name"
              label="Venue name"
              autoComplete="organization"
              value={venue.name}
              onChange={(e) => patch("venue", { name: e.target.value })}
              error={errors["venue.name"]}
              hint="e.g. “Moscone Center West” or “Fitzroy Library, Meeting Room 2”."
            />
            <TextField
              path="venue.line1"
              label="Street address"
              autoComplete="address-line1"
              value={venue.line1}
              onChange={(e) => patch("venue", { line1: e.target.value })}
              error={errors["venue.line1"]}
            />
            <TextField
              path="venue.line2"
              label="Address line 2"
              autoComplete="address-line2"
              optional
              value={venue.line2}
              onChange={(e) => patch("venue", { line2: e.target.value })}
              error={errors["venue.line2"]}
              hint="Floor, hall, booth or unit."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                path="venue.city"
                label="Town or city"
                autoComplete="address-level2"
                value={venue.city}
                onChange={(e) => patch("venue", { city: e.target.value })}
                error={errors["venue.city"]}
              />
              <TextField
                path="venue.region"
                label="State, province or county"
                autoComplete="address-level1"
                optional
                value={venue.region}
                onChange={(e) => patch("venue", { region: e.target.value })}
                error={errors["venue.region"]}
              />
              <TextField
                path="venue.postalCode"
                label="ZIP or postcode"
                autoComplete="postal-code"
                optional
                value={venue.postalCode}
                onChange={(e) => patch("venue", { postalCode: e.target.value })}
                error={errors["venue.postalCode"]}
              />
              <SelectField
                path="venue.country"
                label="Country"
                autoComplete="country"
                value={venue.country}
                onChange={(e) => selectCountry(e.target.value)}
                error={errors["venue.country"]}
              >
                <option value="">Choose a country…</option>
                {COUNTRY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectField>
            </div>
            <VenueCoordinates venue={venue} errors={errors} onChange={(point) => patch("venue", point)} />
          </div>
        )}
      </FieldSection>
    </>
  );
}
