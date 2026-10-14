import type { EventFormat, EventType } from "@naruto-tcg/types";
import { EVENT_FORMATS, EVENT_TYPES, eventFormatMeta } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { charCount, cleanLine, cleanMultiline, LIMITS } from "@/lib/submission";
import {
  FieldSection,
  RadioCardGroup,
  SelectField,
  TextAreaField,
  TextField,
  type RadioCardOption,
  type StepProps,
} from "./fields";
import { TagsInput } from "./tags-input";

const TYPE_OPTIONS: RadioCardOption<EventType>[] = EVENT_TYPES.map((meta) => ({
  value: meta.type,
  label: meta.label,
  description: meta.description,
  icon: meta.icon,
  iconClassName: `${meta.classes.bg} ${meta.classes.text}`,
  selectedClassName: `${meta.classes.border} ${meta.classes.bg} ring-1 ${meta.classes.ring}`,
}));

/** Sensible starting format per type, applied only while no format is chosen. */
const DEFAULT_FORMAT: Record<EventType, EventFormat> = {
  "premier-demo": "learn-to-play",
  "convention-showcase": "learn-to-play",
  "lgs-weekly": "constructed",
  "store-championship": "constructed",
  regional: "constructed",
};

function Counter({ count, min, max }: { count: number; min: number; max: number }) {
  const outOfRange = count > 0 && (count < min || count > max);
  return (
    <span className={cx("tabular-nums", outOfRange ? "text-amber-300" : "text-ash-400")}>
      {count.toLocaleString("en-US")}/{max.toLocaleString("en-US")}
    </span>
  );
}

export function DetailsStep({ draft, errors, patch }: StepProps) {
  const { event } = draft;
  const format = event.format ? eventFormatMeta(event.format) : undefined;
  const FormatIcon = format?.icon;
  const titleCount = charCount(cleanLine(event.title));
  const descriptionCount = charCount(cleanMultiline(event.description));

  return (
    <>
      <FieldSection title="Type & format">
        <RadioCardGroup
          path="event.type"
          label="Event type"
          hint="Pick the closest match. Moderators may adjust it to keep listings consistent."
          options={TYPE_OPTIONS}
          value={event.type}
          onChange={(type) => patch("event", event.format ? { type } : { type, format: DEFAULT_FORMAT[type] })}
          error={errors["event.type"]}
        />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-start">
          <SelectField
            path="event.format"
            label="Format"
            value={event.format}
            onChange={(e) => {
              const value = EVENT_FORMATS.find((f) => f.format === e.target.value)?.format;
              patch("event", { format: value ?? "" });
            }}
            error={errors["event.format"]}
          >
            <option value="">Choose a format…</option>
            {EVENT_FORMATS.map((f) => (
              <option key={f.format} value={f.format}>
                {f.label}
              </option>
            ))}
          </SelectField>
          <div
            aria-live="polite"
            className="flex min-h-[4.25rem] items-start gap-3 rounded-lg border border-shadow-700 bg-shadow-950/50 p-3 sm:mt-7"
          >
            {format && FormatIcon ? (
              <>
                <FormatIcon className="mt-0.5 h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
                <p className="text-sm text-ash-200">
                  <span className="font-semibold text-white">{format.label}: </span>
                  {format.description}
                </p>
              </>
            ) : (
              <p className="text-sm text-ash-400">Choose a format to see what players need to bring.</p>
            )}
          </div>
        </div>
      </FieldSection>

      <FieldSection title="Listing">
        <TextField
          path="event.title"
          label="Title"
          value={event.title}
          onChange={(e) => patch("event", { title: e.target.value })}
          error={errors["event.title"]}
          hint={
            <span className="flex flex-wrap justify-between gap-x-3">
              <span>Say what and where, e.g. “Starter Deck Battle at Hidden Leaf Games”.</span>
              <Counter count={titleCount} min={LIMITS.title.min} max={LIMITS.title.max} />
            </span>
          }
        />
        <TextAreaField
          path="event.description"
          label="Description"
          rows={7}
          value={event.description}
          onChange={(e) => patch("event", { description: e.target.value })}
          error={errors["event.description"]}
          hint={
            <span className="flex flex-wrap justify-between gap-x-3">
              <span>
                Who it&apos;s for, what to bring, loaner decks, round structure and timings. At least{" "}
                {LIMITS.description.min} characters.
              </span>
              <Counter count={descriptionCount} min={LIMITS.description.min} max={LIMITS.description.max} />
            </span>
          }
        />
        <TagsInput tags={event.tags} onChange={(tags) => patch("event", { tags })} error={errors["event.tags"]} />
      </FieldSection>
    </>
  );
}
