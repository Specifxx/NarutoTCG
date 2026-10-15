import { ReleaseRoadmap, SiteHeader, resolveSiteUrls, visibleSiteApps } from "@naruto-tcg/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";
import { ShopButtons } from "@/components/affiliate/ShopButtons";
import { CardsNav } from "@/components/CardsNav";
import { IMPACT_SITE_VERIFICATION } from "@/lib/affiliate";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Re-render hourly so date-driven UI (roadmap, release countdowns) follows the calendar.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Absolute base so social previews (Reddit, Discord, X) can fetch the Open Graph image.
  metadataBase: new URL(SITE_URL),
  title: { default: "Naruto TCG · Card Database", template: "%s · Naruto TCG Cards" },
  description: "Search every Naruto TCG card, follow new reveals, and track your set checklists.",
  openGraph: {
    type: "website",
    siteName: "Naruto TCG Cards",
    title: "Naruto TCG Card Database: every card, spoilers and set checklists",
    description: "Free card database for the Naruto TCG. Filter every card, follow new spoilers and track your collection.",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  // TCGplayer's affiliate program (Impact) verifies site ownership with this tag.
  other: { "impact-site-verification": IMPACT_SITE_VERIFICATION },
};

export const viewport: Viewport = { themeColor: "#07070b" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The /cards page sets data-cards-pending on <html> before hydration (see PendingResults).
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader current="cards" urls={resolveSiteUrls(process.env)} apps={visibleSiteApps("cards", process.env)}>
          <CardsNav />
        </SiteHeader>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <ReleaseRoadmap current="cards" />
        <footer className="border-t border-shadow-800">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ash-200">Shop Naruto TCG singles and sealed product</p>
              <ShopButtons query="Naruto TCG" placement="footer" context="Naruto TCG cards" size="sm" />
            </div>
            <AffiliateDisclosure />
            <p className="text-xs text-ash-400">
              Fan-made card database, not affiliated with the publisher. Card data shown is sample data for development.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
