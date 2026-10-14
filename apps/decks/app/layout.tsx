import { SiteHeader } from "@naruto-tcg/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DecksNav } from "@/components/layout/decks-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Naruto TCG · Decks & Meta", template: "%s · Naruto TCG Decks" },
  description: "Competitive meta tracker, tournament results and community decklists for the Naruto TCG.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader current="decks">
          <DecksNav />
        </SiteHeader>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
