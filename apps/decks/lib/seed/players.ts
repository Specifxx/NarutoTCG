import { ARCHETYPES } from "@/lib/data/archetypes";
import { createRng, shuffle, type Rng } from "@/lib/random";
import {
  ACTIVITY_RANGE,
  PREFERENCE_WEIGHT_RANGES,
  REGION_PLAYER_COUNTS,
  SKILL_SD,
  THIRD_PREFERENCE_RATE,
  type PlayerRegion,
} from "@/lib/seed/config";

/** A fictional player in the seed pool. Only id, name and country reach the JSON. */
export interface SeedPlayer {
  /** Global handle: a url-safe slug, unique across the pool. */
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  region: PlayerRegion;
  /** Logit units, ~Normal(0, SKILL_SD). */
  skill: number;
  /** Relative chance of registering for an eligible event, 0..1. */
  activity: number;
  /** Favourite archetypes, strongest first; weights in 0..1. Drawn uniformly, so period popularity alone sets the expected meta share. */
  preferences: Array<{ archetypeId: string; weight: number }>;
}

interface NameBank {
  first: readonly string[];
  last: readonly string[];
}

const US: NameBank = {
  first: [
    "Aiden", "Maya", "Diego", "Priya", "Kenji", "Leilani", "Marcus", "Sofia", "Malik", "Hana", "Rafael", "Imani",
    "Tyler", "Mei", "Devin", "Camila", "Aaliyah", "Hiro", "Nadia", "Owen", "Lucia", "Darius", "Yuna", "Caleb",
    "Ximena", "Andre", "Riya", "Keiko", "Elijah", "Paloma", "Trevor", "Amara", "Jasper", "Mateo", "Zara", "Brandon",
    "Esme", "Kai", "Wesley", "Thao", "Isaiah", "Renata", "Rohan", "Grace", "Felix", "Jada", "Arjun", "Ivy",
    "Tomas", "Nia", "Quinn", "Sana", "Dmitri", "Lena", "Kofi", "Talia", "Bao", "Marisol", "Ezra", "Noor",
  ],
  last: [
    "Okafor", "Takeda", "Delgado", "Venkataraman", "Brennan", "Hoang", "Whitfield", "Castellanos", "Abernathy",
    "Sorensen", "Ferreira", "Lindqvist", "Oyelaran", "Gutierrez", "Nguyen", "Callahan", "Vasquez", "Ishikawa",
    "Mercado", "Thornbury", "Adeyemi", "Kowalczyk", "Raghunathan", "Beaumont", "Esposito", "Halvorsen", "Pemberton",
    "Iwasaki", "Ashby", "Chandrasekar", "Liang", "Fairweather", "Okonkwo", "Strand", "Kessler", "Bautista", "Dunmore",
    "Whitlock", "Arceneaux", "Petrakis", "Halloran", "Quintero", "Lachance", "Mwangi", "Haddad", "Salazar",
    "Ellsworth", "Barrera", "Moreau", "Hirata", "Bae", "Calloway", "Obi", "Marchetti", "Sandoval", "Tsai",
    "Greenberg", "Rasmussen", "Achterberg", "Villanueva",
  ],
};

const COUNTRY_NAMES: Readonly<Record<string, NameBank>> = {
  US,
  CA: {
    first: [
      "Étienne", "Chloé", "Mathis", "Amélie", "Liam", "Avery", "Rajveer", "Simran", "Logan", "Mackenzie", "Gabriel",
      "Océane", "Harjit", "Brooke", "Nolan", "Émilie", "Wei", "Jun", "Tessa", "Raphaël", "Nathalie", "Desmond", "Anika", "Maxime",
    ],
    last: [
      "Tremblay", "Lévesque", "Bouchard", "Côté", "MacLeod", "Sandhu", "Grewal", "Fournier", "Pelletier", "Thibodeau",
      "Lavoie", "Chen", "McAllister", "Beaulieu", "Desrosiers", "Okeke", "Lam", "Paquette", "Morin", "Dhillon", "Caron",
      "Gauthier", "Robichaud", "Kwan",
    ],
  },
  GB: {
    first: [
      "Oliver", "Amelia", "Harriet", "Isla", "Callum", "Freya", "Rhys", "Imogen", "Kieran", "Poppy",
      "Aisha", "Declan", "Ewan", "Hollie", "Tariq", "Bethan", "Finlay", "Josh", "Priyanka", "Yusuf",
    ],
    last: [
      "Ashworth", "Pennington", "Okoro", "Bhatt", "MacIntyre", "Llewellyn", "Hargreaves", "Whitcombe", "Rahman", "Fairbairn",
      "Cartwright", "Thistlewood", "Mensah", "Hollingsworth", "Bramwell", "Sidhu", "Docherty", "Quayle", "Ainsworth", "Blackwood",
    ],
  },
  IE: {
    first: ["Cian", "Aoife", "Oisín", "Róisín", "Darragh", "Siobhán", "Ciara", "Eoin"],
    last: ["Kavanagh", "Moloney", "Fitzgerald", "Quinlan", "Dunleavy", "Breathnach", "Mulcahy", "Whelan"],
  },
  FR: {
    first: ["Manon", "Théo", "Camille", "Hugo", "Léa", "Baptiste", "Inès", "Maël", "Clémence", "Yanis"],
    last: ["Marchand", "Lefebvre", "Garnier", "Fontaine", "Benali", "Chevalier", "Mercier", "Roussel", "Delacroix", "Moulin"],
  },
  DE: {
    first: ["Jonas", "Lena", "Lukas", "Mia", "Finn", "Hannah", "Moritz", "Emilia", "Leon", "Clara"],
    last: ["Hartmann", "Vogel", "Schreiber", "Krüger", "Lindner", "Aydin", "Brandt", "Scholz", "Weber", "Kaiser"],
  },
  NL: {
    first: ["Daan", "Sanne", "Bram", "Fleur", "Jesse", "Lotte"],
    last: ["de Vries", "Bakker", "Visser", "Janssen", "Mulder", "Smit"],
  },
  ES: {
    first: ["Alejandro", "Lucía", "Pablo", "Nuria", "Sergio", "Irene", "Álvaro", "Marta"],
    last: ["Navarro", "Montesinos", "Castillo", "Gallego", "Vidal", "Romero", "Domínguez", "Serrano"],
  },
  IT: {
    first: ["Matteo", "Giulia", "Lorenzo", "Chiara", "Davide", "Francesca", "Riccardo"],
    last: ["Ferraro", "Conti", "Marchetti", "Galli", "Rinaldi", "Moretti", "Bellandi"],
  },
  SE: {
    first: ["Elsa", "Axel", "Saga", "Viktor", "Ebba"],
    last: ["Lindgren", "Holm", "Sjöberg", "Ekström", "Nyberg"],
  },
  PL: {
    first: ["Kacper", "Zuzanna", "Jakub", "Maja", "Szymon"],
    last: ["Nowak", "Wójcik", "Mazur", "Krawczyk", "Sikora"],
  },
  PT: {
    first: ["Tiago", "Beatriz", "Rui", "Inês", "Duarte"],
    last: ["Carvalho", "Sousa", "Almeida", "Valente", "Teixeira"],
  },
  AU: {
    first: [
      "Charlotte", "Lachlan", "Matilda", "Hamish", "Zoe", "Riley", "Tahlia", "Nikhil",
      "Connor", "Ruby", "Kiran", "Sienna", "Bailey", "Thanh", "Isabella", "Jarrah",
    ],
    last: [
      "Fitzpatrick", "Kowalski", "O'Brien", "Henderson", "Papadopoulos", "McKenzie", "Singh",
      "Delaney", "Costa", "Whitaker", "Barlow", "Chau", "Nguyen", "Tran",
    ],
  },
  NZ: {
    first: ["Mikaere", "Aroha", "Tane", "Hemi", "Anahera", "Manaia", "Olivia", "Liam"],
    last: ["Ngata", "Parata", "Walker", "Ruatapu", "Tawhiri", "Faleolo", "Tipene", "Moana"],
  },
};

/** Country mix of each home region, as relative shares. */
const REGION_COUNTRIES: Readonly<Record<PlayerRegion, ReadonlyArray<[country: string, share: number]>>> = {
  "NA-West": [["US", 1]],
  "NA-Central": [["US", 1]],
  "NA-East": [["US", 1]],
  Canada: [["CA", 1]],
  "UK/EU": [["GB", 32], ["IE", 6], ["FR", 10], ["DE", 10], ["NL", 6], ["ES", 8], ["IT", 6], ["SE", 4], ["PL", 4], ["PT", 4]],
  Oceania: [["AU", 22], ["NZ", 8]],
};

/** Lowercase ASCII slug with single hyphens: "Léa O'Brien" → "lea-obrien". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Largest-remainder split of `total` across weighted buckets. */
function apportion<T>(total: number, buckets: ReadonlyArray<[T, number]>): Array<[T, number]> {
  const weightSum = buckets.reduce((sum, [, w]) => sum + w, 0);
  const exact = buckets.map(([key, w]) => [key, (total * w) / weightSum] as const);
  const counts = exact.map(([key, x]) => [key, Math.floor(x)] as [T, number]);
  let left = total - counts.reduce((sum, [, n]) => sum + n, 0);
  const byRemainder = exact.map(([, x], i) => [i, x - Math.floor(x)] as const).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  for (const [i] of byRemainder) {
    if (left-- <= 0) break;
    counts[i]![1]++;
  }
  return counts;
}

/** Standard normal draw (Box–Muller). */
export function normal(rng: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
}

/** Draws from `items` without repeats until all are used, then reshuffles. */
function bag<T>(rng: Rng, items: readonly T[]): () => T {
  let remaining: T[] = [];
  return () => {
    if (remaining.length === 0) remaining = shuffle(rng, items);
    return remaining.pop()!;
  };
}

function rollPreferences(rng: Rng): SeedPlayer["preferences"] {
  const count = rng() < THIRD_PREFERENCE_RATE ? 3 : 2;
  return shuffle(
    rng,
    ARCHETYPES.map((a) => a.id),
  )
    .slice(0, count)
    .map((archetypeId, i) => {
      const [min, max] = PREFERENCE_WEIGHT_RANGES[i]!;
      return { archetypeId, weight: min + (max - min) * rng() };
    });
}

/**
 * The fictional player pool: {@link REGION_PLAYER_COUNTS} players per home region, with
 * unique names and slugs. Deterministic.
 */
export function generatePlayerPool(): SeedPlayer[] {
  const rng = createRng("seed:players");
  const usedNames = new Set<string>();
  const usedIds = new Set<string>();
  const players: SeedPlayer[] = [];
  const namers = new Map<string, () => string>();
  const nameFor = (country: string) => {
    let draw = namers.get(country);
    if (!draw) {
      const firsts = bag(rng, COUNTRY_NAMES[country]!.first);
      const lasts = bag(rng, COUNTRY_NAMES[country]!.last);
      draw = () => `${firsts()} ${lasts()}`;
      namers.set(country, draw);
    }
    return draw();
  };

  for (const [region, total] of Object.entries(REGION_PLAYER_COUNTS) as Array<[PlayerRegion, number]>) {
    for (const [country, count] of apportion(total, REGION_COUNTRIES[region])) {
      for (let n = 0; n < count; n++) {
        let name = "";
        let id = "";
        for (let attempt = 0; ; attempt++) {
          if (attempt > 1000) throw new Error(`Name bank for ${country} is too small`);
          name = nameFor(country);
          id = slugify(name);
          if (!usedNames.has(name) && !usedIds.has(id)) break;
        }
        usedNames.add(name);
        usedIds.add(id);
        const [minActivity, maxActivity] = ACTIVITY_RANGE;
        players.push({
          id,
          name,
          country,
          region,
          skill: normal(rng) * SKILL_SD,
          activity: minActivity + (maxActivity - minActivity) * rng(),
          preferences: rollPreferences(rng),
        });
      }
    }
  }
  return players;
}
