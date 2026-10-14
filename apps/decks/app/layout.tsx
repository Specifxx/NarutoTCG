import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReleaseRoadmap, SiteHeader } from "@naruto-tcg/ui";
import "./globals.css";

// Re-render hourly so roadmap statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Naruto TCG · Deck Builder",
  description: "Build, save and share decks.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="decks" />
        {children}
        <ReleaseRoadmap current="decks" />
      </body>
    </html>
  );
}
