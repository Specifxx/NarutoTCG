import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader, resolveSiteUrls } from "@naruto-tcg/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naruto TCG · Events",
  description: "Find Naruto TCG events, local game stores and tournaments near you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="events" urls={resolveSiteUrls(process.env)} />
        {children}
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-ash-400">
          Listings are sample data for development. Always confirm details with the organizer.
        </footer>
      </body>
    </html>
  );
}
