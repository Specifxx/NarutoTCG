import { EventExplorer } from "../../components/EventExplorer";
import { EVENTS } from "../../lib/data/events";

export const metadata = { title: "Naruto TCG · Events" };

export default function EventsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Events</h1>
        <p className="text-ash-400">Demo days, convention showcases, weeklies, store championships and regionals.</p>
      </div>
      <EventExplorer events={EVENTS} view="list" />
    </main>
  );
}
