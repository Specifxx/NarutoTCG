import type { Metadata } from "next";
import { Suspense } from "react";
import { MetaDashboard, MetaDashboardFallback } from "@/components/meta/meta-dashboard";
import { Methodology } from "@/components/meta/methodology";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { getSeedAggregates } from "@/lib/data/meta";

export const metadata: Metadata = {
  title: "Meta",
  description:
    "Tier list, archetype win rates, top-cut conversion, meta share and the matchup matrix for the Naruto TCG demo meta.",
};

const JUMP_LINKS = [
  { href: "#tier-list", label: "Tier list" },
  { href: "#stats", label: "Stats" },
  { href: "#share", label: "Meta share" },
  { href: "#matchups", label: "Matchups" },
  { href: "#methodology", label: "Methodology" },
] as const;

export default function MetaPage() {
  const aggregates = getSeedAggregates();
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Competitive meta"
        title="Meta"
        description={`Tier list, win rates and matchups from ${aggregates.length} fictional demo events. Filter by date, event tier and format, or fold in events you imported.`}
        actions={
          <nav aria-label="On this page" className="flex flex-wrap gap-1.5">
            {JUMP_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md border border-shadow-600 bg-shadow-800 px-2.5 py-1 text-xs font-medium text-ash-300 outline-none hover:border-shadow-500 hover:text-white focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                {link.label}
              </a>
            ))}
          </nav>
        }
      />
      <Suspense fallback={<MetaDashboardFallback aggregates={aggregates} />}>
        <MetaDashboard aggregates={aggregates} />
      </Suspense>
      <Methodology />
    </PageContainer>
  );
}
