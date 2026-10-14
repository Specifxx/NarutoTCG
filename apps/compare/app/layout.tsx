import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@naruto-tcg/ui";
import { SiteFooter } from "@/components/SiteFooter";
import { getMarketRepository } from "@/lib/market/repository";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_COMPARE_URL;

export const metadata: Metadata = {
  title: { default: "Naruto TCG Price Compare", template: "%s · Naruto TCG Price Compare" },
  description:
    "Compare Naruto TCG single-card prices across TCGplayer, eBay and Cardmarket, with daily price history and market movers.",
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader current="compare" />
        <div className="flex-1">{children}</div>
        <SiteFooter mode={getMarketRepository().mode} />
      </body>
    </html>
  );
}
