import { describe, expect, it } from "vitest";
import { EventMetaSchema } from "@/lib/ingest/schema";
import {
  autoFormat,
  EMPTY_EVENT_FORM,
  formFromMeta,
  formToMeta,
  metaOverrides,
  updateEventForm,
  validateEventForm,
  type EventForm,
} from "./event-form";

const filled: EventForm = {
  ...EMPTY_EVENT_FORM,
  name: " Riverbend SC ",
  date: "2026-09-12",
  city: "Riverbend",
  country: "US",
  organizer: "Paper Lantern",
  swissRounds: "5",
  topCutSize: "8",
  bestOf: "1",
};

describe("validateEventForm", () => {
  it("requires a name, a real date and a location", () => {
    expect(validateEventForm(EMPTY_EVENT_FORM)).toEqual({
      name: "Enter the event name.",
      date: "Enter the date of the final day.",
      location: "Tick Online, or enter at least a city or country.",
    });
    expect(validateEventForm({ ...filled, date: "2026-02-30" }).date).toBe("Enter a real date as YYYY-MM-DD.");
    expect(validateEventForm({ ...filled, city: "", country: "", online: true })).toEqual({});
    expect(validateEventForm(filled)).toEqual({});
  });

  it("checks Swiss rounds only when given", () => {
    expect(validateEventForm({ ...filled, swissRounds: "" })).toEqual({});
    expect(validateEventForm({ ...filled, swissRounds: "2.5" }).swissRounds).toMatch(/whole number/);
    expect(validateEventForm({ ...filled, swissRounds: "31" }).swissRounds).toMatch(/0 to 30/);
  });
});

describe("formToMeta", () => {
  it("trims and leaves blank optional fields out", () => {
    const meta = formToMeta(filled);
    expect(meta).toEqual({
      name: "Riverbend SC",
      date: "2026-09-12",
      tier: "store-championship",
      location: { city: "Riverbend", country: "US" },
      organizer: "Paper Lantern",
      swissRounds: 5,
      topCutSize: 8,
      bestOf: 1,
    });
    expect(EventMetaSchema.safeParse(meta).success).toBe(true);
    expect(formToMeta({ ...filled, online: true }).location).toEqual({ online: true });
    expect(formToMeta({ ...filled, topCutSize: "0" }).topCutSize).toBe(0);
  });
});

describe("formFromMeta", () => {
  it("overlays defined fields and keeps a file's format", () => {
    const form = formFromMeta({ name: "X", date: "2026-09-12", location: { online: true }, bestOf: 1, topCutSize: 0, format: "Legacy" });
    expect(form).toMatchObject({ name: "X", online: true, city: "", bestOf: "1", topCutSize: "0", format: "Legacy", formatAuto: false });
  });

  it("derives the format from the date when the file has none", () => {
    expect(formFromMeta({ date: "2026-09-12" }).format).toBe(autoFormat("2026-09-12"));
    expect(autoFormat("not a date")).toBe("");
  });
});

describe("updateEventForm", () => {
  it("turns the automatic format off when typed and back on when asked", () => {
    const dated = updateEventForm(EMPTY_EVENT_FORM, { date: "2026-09-12" });
    expect(dated.format).toBe(autoFormat("2026-09-12"));
    const typed = updateEventForm(dated, { format: "" });
    expect(typed).toMatchObject({ format: "", formatAuto: false });
    expect(updateEventForm(typed, { formatAuto: true }).format).toBe(autoFormat("2026-09-12"));
  });
});

describe("metaOverrides", () => {
  it("sends only the fields that changed", () => {
    const base = formFromMeta({ name: "File name", date: "2026-09-12", location: { city: "A" }, organizer: "Org", notes: "Note" });
    expect(metaOverrides(base, base)).toEqual({});
    const edited = { ...base, name: "Fixed name", city: "B", swissRounds: "4" };
    expect(metaOverrides(base, edited)).toEqual({ name: "Fixed name", location: { city: "B" }, swissRounds: 4 });
  });

  it("clears notes but keeps the file's value for other blanked fields", () => {
    const base = formFromMeta({ name: "N", date: "2026-09-12", notes: "Note", swissRounds: 3 });
    expect(metaOverrides(base, { ...base, notes: "", swissRounds: "" })).toEqual({ notes: "" });
  });
});
