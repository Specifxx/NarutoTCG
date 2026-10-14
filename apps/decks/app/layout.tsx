import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader, resolveSiteUrls } from "@naruto-tcg/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naruto TCG · Deck Builder",
  description: "Build, save and share decks.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="decks" urls={resolveSiteUrls(process.env)} />
        {children}
      </body>
    </html>
  );
}
