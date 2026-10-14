import { SiteHeader } from "@naruto-tcg/ui";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EventsSubnav } from "@/components/events-subnav";
import { SiteFooter } from "@/components/site-footer";
import { zoneUrls } from "@/lib/zones";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004"),
  title: {
    default: "Naruto TCG · Events",
    template: "%s · Naruto TCG Events",
  },
  description: "Find Naruto TCG demo days, store championships, regionals and local game stores near you.",
  openGraph: {
    siteName: "Naruto TCG Events",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[1200] focus:rounded-md focus:bg-chakra-500 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-shadow-950"
        >
          Skip to content
        </a>
        <SiteHeader active="events" zoneUrls={zoneUrls} LinkComponent={Link} />
        <EventsSubnav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
