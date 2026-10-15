import { SubmitWizard } from "../../../components/SubmitWizard";

export const metadata = { title: "Naruto TCG · Submit an Event" };

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Organize an Event</h1>
        <p className="text-ash-400">Local game stores and tournament organizers: list your demo day or tournament.</p>
      </div>
      <SubmitWizard />
    </main>
  );
}
