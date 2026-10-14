import Link from "next/link";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import type { NarutoEvent } from "@naruto-tcg/types";
import { Badge, Card } from "@naruto-tcg/ui";
import { EVENT_TYPE_LABELS, formatDate, formatFee, formatTime } from "../lib/format";

export function EventCard({ event, distance }: { event: NarutoEvent; distance?: number }) {
  const full = event.registered >= event.capacity;
  return (
    <Card className="flex flex-col gap-3 transition hover:border-chakra-600">
      <div className="flex items-start justify-between gap-3">
        <Badge>{EVENT_TYPE_LABELS[event.type]}</Badge>
        {distance !== undefined && <span className="text-xs text-ash-400">{Math.round(distance)} mi away</span>}
      </div>
      <h3 className="text-lg font-semibold text-white">
        <Link href={`/events/${event.id}`} className="hover:text-chakra-400">
          {event.title}
        </Link>
      </h3>
      <ul className="space-y-1 text-sm text-ash-400">
        <li className="flex items-center gap-2">
          <CalendarDays size={14} /> {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
        </li>
        <li className="flex items-center gap-2">
          <MapPin size={14} /> {event.venueName}, {event.city}
        </li>
        <li className="flex items-center gap-2">
          <Ticket size={14} /> {formatFee(event.entryFee, event.currency)}
        </li>
        <li className="flex items-center gap-2">
          <Users size={14} /> {event.registered}/{event.capacity} registered{full && " · Full"}
        </li>
      </ul>
    </Card>
  );
}
