/**
 * Community deck authors. Every author is fictional demo data; handles key /players/[handle]
 * and never contain `--`.
 */

export interface Author {
  /** url-safe slug. */
  handle: string;
  name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  bio: string;
  /** ISO date the author joined the platform. */
  joined: string;
  /** Archetype ids the author is known for. */
  specialties: string[];
}

export const AUTHORS: readonly Author[] = [
  {
    handle: "rinnegan-rhea",
    name: "Rhea Castellane",
    country: "US",
    bio: "Control player who has never met a board reset she didn't like. Writes the Six Paths primer and keeps it updated after every set.",
    joined: "2025-11-20",
    specialties: ["akatsuki-pain", "itachi-tsukuyomi"],
  },
  {
    handle: "scroll-keeper",
    name: "Nadia Kowalewska",
    country: "PL",
    bio: "Tracks every Akatsuki list she can find and turns the spreadsheet into deck techs. Will talk about hand disruption for hours.",
    joined: "2026-01-09",
    specialties: ["itachi-tsukuyomi", "akatsuki-pain"],
  },
  {
    handle: "sandstorm-sol",
    name: "Soren Haldane",
    country: "GB",
    bio: "Defensive specialist from the Manchester store scene. If a deck has Blockers and a slow finisher, he has probably tuned it.",
    joined: "2025-12-02",
    specialties: ["sand-gaara", "medical-ninja"],
  },
  {
    handle: "budget-brewer",
    name: "Priyanka Dossal",
    country: "AU",
    bio: "Builds competitive lists out of commons and uncommons so new players can join their local event without breaking the bank.",
    joined: "2026-02-14",
    specialties: ["sand-gaara", "taijutsu-lee", "hyuga-gentle-fist"],
  },
  {
    handle: "toadsage-tomo",
    name: "Tomoya Ishiguro",
    country: "JP",
    bio: "Summon enthusiast and Sage Mode main since the Kage Summit prerelease. Streams long-form playtesting on weeknights.",
    joined: "2026-04-25",
    specialties: ["uzumaki-sage", "sannin-summons"],
  },
  {
    handle: "lightning-lev",
    name: "Lev Marinescu",
    country: "RO",
    bio: "Tempo grinder who counts chakra the way other people count cards. Has piloted Taka at every event he has entered.",
    joined: "2026-02-20",
    specialties: ["uchiha-avenger"],
  },
  {
    handle: "byakugan-bea",
    name: "Beatriz Fontaine",
    country: "CA",
    bio: "Hyuga loyalist and judge-in-training. Loves decks that win through information rather than raw power.",
    joined: "2025-11-30",
    specialties: ["hyuga-gentle-fist"],
  },
  {
    handle: "copy-ninja-cal",
    name: "Calvin Ostergaard",
    country: "US",
    bio: "Teaches the beginner nights at his local store. Prefers straightforward midrange lists that reward tight sequencing.",
    joined: "2025-12-15",
    specialties: ["leaf-jonin", "medical-ninja"],
  },
  {
    handle: "puppetmaster-ines",
    name: "Inès Laurier",
    country: "FR",
    bio: "Combo brewer who reads every card's fine print twice. Her recursion lists show up whenever the meta leans on one-for-one removal.",
    joined: "2026-01-28",
    specialties: ["puppet-brigade", "orochimaru-curse"],
  },
  {
    handle: "rogue-ronin",
    name: "Joaquín Ferrand",
    country: "MX",
    bio: "Off-meta brewer chasing the next big surprise. If a Leader sees no play, expect a write-up from him within the week.",
    joined: "2026-03-07",
    specialties: ["rogue", "uzumaki-sage"],
  },
];

export const AUTHOR_INDEX: ReadonlyMap<string, Author> = new Map(AUTHORS.map((a) => [a.handle, a]));

export function getAuthor(handle: string): Author | undefined {
  return AUTHOR_INDEX.get(handle);
}
