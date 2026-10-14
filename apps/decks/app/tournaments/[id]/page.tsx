import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImportedTournamentLoader } from "@/components/tournaments/imported-tournament-loader";
import { TournamentView } from "@/components/tournaments/tournament-view";
import { PageContainer } from "@/components/ui/page-header";
import { SEED_TOURNAMENTS, getTournament } from "@/lib/data/tournaments";
import { EVENT_TIER_LABEL, formatDate, formatLocation } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

/** Imported events live only in the browser; their ids carry this prefix. */
const IMPORTED_PREFIX = "local-";

export const dynamicParams = true;

export function generateStaticParams() {
  return SEED_TOURNAMENTS.map((t) => ({ id: t.id }));
}

function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeId((await params).id);
  const tournament = getTournament(id);
  if (tournament) {
    return {
      title: tournament.name,
      description: `${EVENT_TIER_LABEL[tournament.tier]}, ${formatDate(tournament.date)}, ${formatLocation(tournament.location)}: standings, top cut bracket, pairings and decklists (fictional demo data).`,
    };
  }
  if (id.startsWith(IMPORTED_PREFIX)) return { title: "Imported event", robots: { index: false } };
  return { title: "Event not found" };
}

export default async function TournamentPage({ params }: Props) {
  const id = decodeId((await params).id);
  const tournament = getTournament(id);
  if (tournament) {
    return (
      <PageContainer>
        <TournamentView tournament={tournament} />
      </PageContainer>
    );
  }
  if (id.startsWith(IMPORTED_PREFIX)) {
    return (
      <PageContainer>
        <ImportedTournamentLoader id={id} />
      </PageContainer>
    );
  }
  notFound();
}
