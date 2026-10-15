import { ReleaseRoadmap, SiteHeader, resolveSiteUrls, visibleSiteApps } from "@naruto-tcg/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CardsNav } from "@/components/CardsNav";
import "./globals.css";

// Re-render hourly so date-driven UI (roadmap, release countdowns) follows the calendar.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { default: "Naruto TCG · Card Database", template: "%s · Naruto TCG Cards" },
  description: "Search every Naruto TCG card, follow new reveals, and track your set checklists.",
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
        <footer className="border-t border-shadow-800 py-8 text-center text-xs text-ash-400">
          Fan-made card database. Card data shown is sample data for development.
        </footer>
      </body>
    </html>
  );
}
