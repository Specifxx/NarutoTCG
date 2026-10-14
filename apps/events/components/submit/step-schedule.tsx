import { CalendarDays, Repeat } from "lucide-react";
import { cx } from "@/lib/format";
import { chip } from "@/lib/styles";
import {
  addMonthsToKey,
  CURRENCIES,
  describeDateKey,
  isListedTimeZone,
  latestEventDate,
  LIMITS,
  TIME_ZONE_GROUPS,
  timeZoneLabel,
  weekdayOfKey,
  weeklyOccurrences,
  type Recurrence,
  type SubmissionStoreOption,
} from "@/lib/submission";
import { addDaysToKey, isLocalDate } from "@/lib/time";
import {
  CheckboxField,
  FieldSection,
  RadioCardGroup,
  SelectField,
  TextField,
  type RadioCardOption,
  type StepProps,
} from "./fields";

const RECURRENCE_OPTIONS: RadioCardOption<Recurrence>[] = [
  { value: "none", label: "One-off", description: "A single event, or one multi-day event.", icon: CalendarDays },
  { value: "weekly", label: "Weekly", description: "Same day and time every week, e.g. a league night.", icon: Repeat },
];

export function ScheduleStep({
  draft,
  errors,
  patch,
  today,
  stores,
}: StepProps & { today: string | null; stores: readonly SubmissionStoreOption[] }) {
  const { schedule, capacity, fee } = draft;
  const dateOk = isLocalDate(schedule.date);
  const store = draft.venue.mode === "store" ? stores.find((s) => s.slug === draft.venue.storeSlug) : undefined;
  // A directory store's events always use the store's zone (the importer ignores any other).
  const shownZone = store ? store.timeZone : schedule.timeZone;
  const unlistedZone = shownZone && !isListedTimeZone(shownZone) ? shownZone : null;
  const occurrences =
    schedule.recurrence === "weekly" && dateOk && isLocalDate(schedule.repeatUntil)
      ? weeklyOccurrences(schedule.date, schedule.repeatUntil)
      : 0;

  return (
    <>
      <FieldSection title="When" description="Use the venue's local date and time.">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            path="schedule.date"
            label={schedule.multiDay ? "First day" : "Date"}
            type="date"
            min={today ?? undefined}
            max={today ? latestEventDate({ today }) : undefined}
            value={schedule.date}
            onChange={(e) => patch("schedule", { date: e.target.value })}
            error={errors["schedule.date"]}
            inputClassName="tabular-nums"
          />
          <TextField
            path="schedule.startTime"
            label="Start time"
            type="time"
            value={schedule.startTime}
            onChange={(e) => patch("schedule", { startTime: e.target.value })}
            error={errors["schedule.startTime"]}
            inputClassName="tabular-nums"
          />
          <TextField
            path="schedule.endTime"
            label="Finish time"
            type="time"
            value={schedule.endTime}
            onChange={(e) => patch("schedule", { endTime: e.target.value })}
            error={errors["schedule.endTime"]}
            inputClassName="tabular-nums"
          />
        </div>

        <CheckboxField
          path="schedule.multiDay"
          label="Runs over multiple days"
          hint="For conventions and weekend events. The start time applies to the first day and the finish time to the last."
          checked={schedule.multiDay}
          onChange={(multiDay) => patch("schedule", { multiDay })}
        />
        {schedule.multiDay && (
          <TextField
            path="schedule.endDate"
            label="Last day"
            type="date"
            className="sm:max-w-[16rem]"
            min={dateOk ? addDaysToKey(schedule.date, 1) : (today ?? undefined)}
            max={dateOk ? addDaysToKey(schedule.date, LIMITS.multiDayMaxDays - 1) : undefined}
            value={schedule.endDate}
            onChange={(e) => patch("schedule", { endDate: e.target.value })}
            error={errors["schedule.endDate"]}
            inputClassName="tabular-nums"
          />
        )}

        <SelectField
          path="schedule.timeZone"
          label="Time zone"
          className="sm:max-w-md"
          value={shownZone}
          disabled={!!store}
          onChange={(e) => patch("schedule", { timeZone: e.target.value })}
          error={errors["schedule.timeZone"]}
          hint={
            store
              ? `Set from ${store.name}. Players elsewhere see times converted for them.`
              : "The zone the venue is in. Players elsewhere see times converted for them."
          }
        >
          <option value="">Choose a time zone…</option>
          {unlistedZone && <option value={unlistedZone}>{timeZoneLabel(unlistedZone)}</option>}
          {TIME_ZONE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
      </FieldSection>

      <FieldSection title="Repeats">
        <RadioCardGroup
          path="schedule.recurrence"
          label="How often does it run?"
          options={RECURRENCE_OPTIONS}
          value={schedule.recurrence}
          onChange={(recurrence) => patch("schedule", { recurrence })}
          error={errors["schedule.recurrence"]}
          compact
        />
        {schedule.recurrence === "weekly" && (
          <div className="grid gap-4 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-start">
            <TextField
              path="schedule.repeatUntil"
              label="Repeat until"
              type="date"
              min={dateOk ? addDaysToKey(schedule.date, 7) : (today ?? undefined)}
              max={dateOk ? addMonthsToKey(schedule.date, LIMITS.seriesMonths) : undefined}
              value={schedule.repeatUntil}
              onChange={(e) => patch("schedule", { repeatUntil: e.target.value })}
              error={errors["schedule.repeatUntil"]}
              hint={`Up to ${LIMITS.seriesMonths} months. You can extend the series later.`}
              inputClassName="tabular-nums"
            />
            <p className="rounded-lg border border-shadow-700 bg-shadow-950/50 p-3 text-sm text-ash-200 sm:mt-7" aria-live="polite">
              {occurrences > 0 ? (
                <>
                  Every <span className="font-semibold text-white">{weekdayOfKey(schedule.date)}</span> ·{" "}
                  <span className="tabular-nums">{occurrences}</span> sessions through{" "}
                  {describeDateKey(schedule.repeatUntil, { month: "short", day: "numeric", year: "numeric" })}
                </>
              ) : (
                <span className="text-ash-400">Pick the first date and the last date to see the series.</span>
              )}
            </p>
          </div>
        )}
      </FieldSection>

      <FieldSection title="Capacity & entry">
        <CheckboxField
          path="capacity.uncapped"
          label="No player cap"
          hint="For open demo areas where players drop in and out."
          checked={capacity.uncapped}
          onChange={(uncapped) => patch("capacity", { uncapped })}
        />
        {!capacity.uncapped && (
          <TextField
            path="capacity.max"
            label="Player cap"
            inputMode="numeric"
            autoComplete="off"
            className="sm:max-w-[12rem]"
            value={capacity.max}
            onChange={(e) => patch("capacity", { max: e.target.value })}
            error={errors["capacity.max"]}
            hint={`${LIMITS.capacity.min}–${LIMITS.capacity.max.toLocaleString("en-US")} players.`}
            inputClassName="tabular-nums"
          />
        )}

        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3 sm:max-w-md">
            <TextField
              path="fee.amount"
              label="Entry fee"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={fee.amount}
              onChange={(e) => patch("fee", { amount: e.target.value })}
              error={errors["fee.amount"]}
              hint="Enter 0 for free entry."
              inputClassName="tabular-nums"
            />
            <SelectField
              path="fee.currency"
              label="Currency"
              value={fee.currency}
              onChange={(e) => {
                const currency = CURRENCIES.find((c) => c === e.target.value);
                patch("fee", { currency: currency ?? "" });
              }}
              error={errors["fee.currency"]}
            >
              {!fee.currency && <option value="">Choose…</option>}
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </div>
          <button
            type="button"
            aria-pressed={fee.amount.trim() === "0"}
            onClick={() => patch("fee", { amount: "0" })}
            className={cx(chip(fee.amount.trim() === "0"), "mt-3")}
          >
            Free entry
          </button>
        </div>
      </FieldSection>
    </>
  );
}
