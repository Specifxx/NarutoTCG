"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Card } from "@naruto-tcg/ui";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "../lib/format";

const STEPS = ["Organizer", "Event", "Venue", "Review"] as const;

const empty = {
  organizerName: "", organizerEmail: "", organizerRole: "lgs-owner",
  title: "", type: "lgs-weekly", date: "", time: "", format: "", fee: "0", capacity: "16", description: "",
  venueName: "", address: "", city: "", region: "", country: "",
};
type Form = typeof empty;

const input =
  "w-full rounded-md border border-shadow-700 bg-shadow-900 px-3 py-2 text-sm text-ash-200 focus:border-chakra-400 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-ash-400">{label}</span>
      {children}
    </label>
  );
}

export function SubmitWizard() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(empty);
  const [done, setDone] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const valid = [
    f.organizerName && /\S+@\S+\.\S+/.test(f.organizerEmail),
    f.title && f.date && f.time && f.format && Number(f.capacity) > 0 && Number(f.fee) >= 0,
    f.venueName && f.address && f.city && f.country,
    true,
  ][step];

  if (done) {
    return (
      <Card className="space-y-3 text-center">
        <Check className="mx-auto text-chakra-400" size={36} />
        <h2 className="text-xl font-semibold text-white">Submission received</h2>
        <p className="text-sm text-ash-400">
          Thanks, {f.organizerName}. Our team reviews new listings within a few days and will email {f.organizerEmail}.
          (Demo: nothing is stored yet.)
        </p>
        <Button onClick={() => { setF(empty); setStep(0); setDone(false); }}>Submit another</Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <ol className="flex gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 rounded-md border px-2 py-1.5 text-center ${i === step ? "border-chakra-500 text-chakra-400" : i < step ? "border-shadow-500 text-ash-200" : "border-shadow-700 text-ash-400"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Your name"><input className={input} value={f.organizerName} onChange={set("organizerName")} /></Field>
          <Field label="Contact email"><input type="email" className={input} value={f.organizerEmail} onChange={set("organizerEmail")} /></Field>
          <Field label="You are a…">
            <select className={input} value={f.organizerRole} onChange={set("organizerRole")}>
              <option value="lgs-owner">Local game store owner</option>
              <option value="tournament-organizer">Tournament organizer</option>
              <option value="community">Community group</option>
            </select>
          </Field>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <Field label="Event title"><input className={input} value={f.title} onChange={set("title")} /></Field>
          <Field label="Event type">
            <select className={input} value={f.type} onChange={set("type")}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className={input} value={f.date} onChange={set("date")} /></Field>
            <Field label="Start time"><input type="time" className={input} value={f.time} onChange={set("time")} /></Field>
          </div>
          <Field label="Format"><input className={input} placeholder="e.g. Constructed, Swiss" value={f.format} onChange={set("format")} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Entry fee"><input type="number" min={0} className={input} value={f.fee} onChange={set("fee")} /></Field>
            <Field label="Capacity"><input type="number" min={1} className={input} value={f.capacity} onChange={set("capacity")} /></Field>
          </div>
          <Field label="Description"><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></Field>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <Field label="Venue name"><input className={input} value={f.venueName} onChange={set("venueName")} /></Field>
          <Field label="Street address"><input className={input} value={f.address} onChange={set("address")} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City"><input className={input} value={f.city} onChange={set("city")} /></Field>
            <Field label="State / region"><input className={input} value={f.region} onChange={set("region")} /></Field>
            <Field label="Country"><input className={input} value={f.country} onChange={set("country")} /></Field>
          </div>
        </div>
      )}
      {step === 3 && (
        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
          {Object.entries(f).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ash-400">{k}</dt>
              <dd className="break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < 3 ? (
          <Button disabled={!valid} onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button onClick={() => setDone(true)}>Submit for review</Button>
        )}
      </div>
    </Card>
  );
}
