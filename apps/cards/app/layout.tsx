import { ReleaseRoadmap, SiteHeader } from "@naruto-tcg/ui";
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
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-chakra-500 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-shadow-950"
        >
          Skip to content
        </a>
        <SiteHeader current="cards">
          <CardsNav />
        </SiteHeader>
        <main id="main" className="flex-1">
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
