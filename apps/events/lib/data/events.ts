import type { EventType, NarutoEvent } from "@naruto-tcg/types";
import { STORES } from "./stores";

// SAMPLE DATA. Times are venue-local wall-clock times stored with a "Z" suffix
// and rendered in UTC, so what you see is the local start time.
const PLAYERS = [
  "Itachi_Fan88", "SageMode", "KageBunshin", "RasenLoop", "ShadowPuppet", "ByakuganBen",
  "SharinganSam", "TenTenToss", "NaraStrat", "AkatsukiAce", "HokageHopeful", "FrogSummoner",
  "ChidoriChad", "SandCoffin", "LeafGenin", "Kisame_Main",
];

interface Seed {
  id: string;
  title: string;
  type: EventType;
  date: string;
  start: string;
  hours: number;
  store?: string;
  venue?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
  fee: number;
  currency?: string;
  format: string;
  capacity: number;
  registered: number;
  organizer?: string;
  description: string;
}

function build(s: Seed): NarutoEvent {
  const store = s.store ? STORES.find((x) => x.slug === s.store) : undefined;
  const [h, m] = s.start.split(":").map(Number);
  const end = new Date(`${s.date}T${s.start}:00Z`);
  end.setUTCHours(h + s.hours, m);
  return {
    id: s.id,
    title: s.title,
    type: s.type,
    description: s.description,
    startsAt: `${s.date}T${s.start}:00Z`,
    endsAt: end.toISOString(),
    storeSlug: store?.slug,
    venueName: store?.name ?? s.venue ?? "TBA",
    address: store?.address ?? s.address ?? "",
    city: store?.city ?? s.city ?? "",
    region: store?.region ?? s.region ?? "",
    country: store?.country ?? s.country ?? "",
    lat: store?.lat ?? s.lat ?? 0,
    lng: store?.lng ?? s.lng ?? 0,
    entryFee: s.fee,
    currency: s.currency ?? (store?.country === "UK" ? "GBP" : store?.country === "AU" ? "AUD" : ["DE", "FR"].includes(store?.country ?? s.country ?? "") ? "EUR" : "USD"),
    format: s.format,
    capacity: s.capacity,
    registered: s.registered,
    organizer: {
      name: s.organizer ?? store?.name ?? "Naruto TCG Events Team",
      email: store?.email ?? "events@narutotcg.example",
      url: store?.website,
    },
    registrationUrl: `https://example.com/register/${s.id}`,
    players: PLAYERS.slice(0, Math.min(s.registered, 8)),
  };
}

const SEEDS: Seed[] = [
  { id: "bandai-fest-anaheim-2027", title: "Bandai Card Games Fest: Naruto TCG Demo Booth", type: "convention-showcase", date: "2027-03-12", start: "10:00", hours: 8, venue: "Anaheim Convention Center", address: "800 W Katella Ave", city: "Anaheim", region: "CA", country: "US", lat: 33.8007, lng: -117.9189, fee: 0, format: "Free demo play + prize wall", capacity: 600, registered: 412, organizer: "Bandai Card Games", description: "Hands-on demo booths with pre-built decks, staff teaching games all day and exclusive promo cards for first-time players." },
  { id: "bandai-fest-cologne-2027", title: "Bandai Card Games Fest Europe: Demo Showcase", type: "convention-showcase", date: "2027-04-24", start: "10:00", hours: 8, venue: "Koelnmesse Hall 8", address: "Messeplatz 1", city: "Cologne", region: "NRW", country: "DE", lat: 50.9473, lng: 6.9826, fee: 0, currency: "EUR", format: "Free demo play + side events", capacity: 500, registered: 289, organizer: "Bandai Card Games EU", description: "European demo booths and stage matches. Meet judges, try every starter deck and pick up showcase-exclusive sleeves." },
  { id: "premier-demo-nyc-nov", title: "Premier Demo Day: Starter Deck Showdown", type: "premier-demo", date: "2026-11-14", start: "13:00", hours: 5, store: "shinobi-cards-nyc", fee: 0, format: "Demo + 3-round mini event", capacity: 48, registered: 31, description: "Learn the game with staff, then jump into a mini bracket. Every attendee gets a promo card." },
  { id: "premier-demo-la-nov", title: "West Coast Premier Demo Event", type: "premier-demo", date: "2026-11-21", start: "12:00", hours: 6, store: "mist-tcg-lounge", fee: 0, format: "Demo + Sealed preview", capacity: 64, registered: 58, description: "Official preview event with early access play and sealed-deck side tables." },
  { id: "premier-demo-london-dec", title: "UK Premier Demo Event", type: "premier-demo", date: "2026-12-05", start: "12:00", hours: 6, store: "dragon-gate-games", fee: 0, format: "Demo + mini bracket", capacity: 56, registered: 40, description: "Learn to play with trained demo staff, then enter the casual bracket for promo prizes." },
  { id: "premier-demo-sydney-dec", title: "Southern Hemisphere Demo Tour: Sydney", type: "premier-demo", date: "2026-12-12", start: "11:00", hours: 6, store: "southern-cross-cards", fee: 0, format: "Demo + Sealed preview", capacity: 48, registered: 22, description: "Kick off the Australian demo tour with free starter decks and a prize-supported bracket." },
  { id: "lgs-weekly-austin", title: "Friday Night Ninja League", type: "lgs-weekly", date: "2026-10-23", start: "18:30", hours: 4, store: "leaf-village-games", fee: 8, format: "Constructed, Swiss", capacity: 24, registered: 17, description: "Weekly constructed league. Prize support is store credit and participation promos." },
  { id: "lgs-weekly-seattle", title: "Cloud Country Weekly", type: "lgs-weekly", date: "2026-10-28", start: "18:00", hours: 3, store: "cloud-country-cards", fee: 6, format: "Constructed, Swiss", capacity: 20, registered: 12, description: "Midweek constructed. Newcomers welcome; loaner decks available." },
  { id: "lgs-weekly-chicago", title: "Konoha Corner Casual Night", type: "lgs-weekly", date: "2026-10-30", start: "18:00", hours: 3, store: "konoha-corner", fee: 5, format: "Casual constructed", capacity: 16, registered: 9, description: "Relaxed games, deck-building help and trades." },
  { id: "lgs-weekly-berlin", title: "Dienstag Duell: Weekly", type: "lgs-weekly", date: "2026-11-03", start: "18:30", hours: 3, store: "ninja-hq-berlin", fee: 5, currency: "EUR", format: "Constructed, Swiss", capacity: 24, registered: 14, description: "Weekly play in English and German." },
  { id: "lgs-weekly-paris", title: "Soirée Ninja Hebdo", type: "lgs-weekly", date: "2026-11-05", start: "19:00", hours: 3, store: "carte-ninja-paris", fee: 5, format: "Constructed, Swiss", capacity: 20, registered: 11, description: "Tournoi hebdomadaire pour débutants et joueurs confirmés." },
  { id: "lgs-weekly-melbourne", title: "Harbour Hobby Trial Weekly", type: "lgs-weekly", date: "2026-11-07", start: "17:00", hours: 3, store: "harbour-hobby-melbourne", fee: 8, format: "Trial Constructed", capacity: 16, registered: 6, description: "Trial event as the store ramps up its Naruto TCG programme." },
  { id: "lgs-weekly-phoenix", title: "Sunday Learn & Play", type: "lgs-weekly", date: "2026-11-08", start: "13:00", hours: 4, store: "hidden-sand-hobbies", fee: 0, format: "Learn-to-play + casual games", capacity: 24, registered: 10, description: "Free teaching session followed by casual play." },
  { id: "store-champ-nyc", title: "Shinobi Cards Store Championship", type: "store-championship", date: "2027-01-16", start: "10:00", hours: 9, store: "shinobi-cards-nyc", fee: 25, format: "Constructed, Swiss + Top 8", capacity: 64, registered: 47, description: "Qualifier for the Spring Regional. Top 8 earns invites and playmats." },
  { id: "store-champ-seattle", title: "Cloud Country Store Championship", type: "store-championship", date: "2027-01-30", start: "10:00", hours: 9, store: "cloud-country-cards", fee: 25, format: "Constructed, Swiss + Top 8", capacity: 48, registered: 44, description: "Regional qualifier with prize support." },
  { id: "store-champ-berlin", title: "Ninja HQ Store Championship", type: "store-championship", date: "2027-02-06", start: "10:00", hours: 9, store: "ninja-hq-berlin", fee: 20, currency: "EUR", format: "Constructed, Swiss + Top 8", capacity: 48, registered: 25, description: "Monthly championship qualifier for the EU Regional." },
  { id: "regional-na-spring", title: "North America Spring Regional Championship", type: "regional", date: "2027-05-08", start: "09:00", hours: 11, venue: "Chicago Regional Hall", address: "2301 S King Dr", city: "Chicago", region: "IL", country: "US", lat: 41.8506, lng: -87.6171, fee: 60, format: "Constructed, Swiss + Top 32", capacity: 256, registered: 118, organizer: "Naruto TCG Organized Play", description: "Flagship regional with a major prize pool and qualification for the Global Championship." },
  { id: "regional-eu-spring", title: "Europe Spring Regional Championship", type: "regional", date: "2027-05-22", start: "09:00", hours: 11, venue: "Paris Event Centre", address: "Place de la Porte de Versailles", city: "Paris", region: "Île-de-France", country: "FR", lat: 48.8322, lng: 2.2875, fee: 50, currency: "EUR", format: "Constructed, Swiss + Top 32", capacity: 256, registered: 96, organizer: "Naruto TCG Organized Play", description: "European regional championship. Preregistration recommended." },
  { id: "regional-oce-winter", title: "Oceania Regional Championship", type: "regional", date: "2027-06-19", start: "09:00", hours: 10, venue: "Sydney Showground", address: "1 Showground Rd", city: "Sydney", region: "NSW", country: "AU", lat: -33.8445, lng: 151.0714, fee: 80, currency: "AUD", format: "Constructed, Swiss + Top 16", capacity: 160, registered: 52, organizer: "Naruto TCG Organized Play", description: "Oceania's regional championship, with travel support for top finishers." },
];

export const EVENTS: NarutoEvent[] = SEEDS.map(build).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
export const getEvent = (id: string) => EVENTS.find((e) => e.id === id);
export const eventsForStore = (slug: string) => EVENTS.filter((e) => e.storeSlug === slug);
