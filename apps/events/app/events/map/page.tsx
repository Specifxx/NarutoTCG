import { EventExplorer } from "../../../components/EventExplorer";
import { EVENTS } from "../../../lib/data/events";

export const metadata = { title: "Naruto TCG · Event Map" };

export default function EventMapPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Event Map</h1>
        <p className="text-ash-400">Worldwide demo booths, store events and tournaments.</p>
      </div>
      <EventExplorer events={EVENTS} view="map" />
    </main>
  );
}
