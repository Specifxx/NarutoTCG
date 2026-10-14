import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@naruto-tcg/ui";
import { getMarketStats } from "@/components/market/stats";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_COMPARE_URL;

export const metadata: Metadata = {
  title: { default: "Naruto TCG Price Compare", template: "%s · Naruto TCG Price Compare" },
  description:
    "Compare Naruto TCG single-card prices across TCGplayer, eBay and Cardmarket, with daily price history and market movers.",
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};

/**
 * Every page is per-request already; making the layout dynamic too keeps the not-found page
 * from being prerendered, so builds never query the database and the demo label stays live.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

/**
 * Whether the footer should say the prices are simulated. The layout wraps every page,
 * including the error and not-found ones, so a repository failure must not escape here:
 * the page itself reports it, and the footer simply leaves the notice out.
 */
async function readDemoData(): Promise<boolean> {
  try {
    return (await getMarketStats()).demoData;
  } catch {
    return false;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const demoData = await readDemoData();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader current="compare" />
        <div className="flex-1">{children}</div>
        <SiteFooter demoData={demoData} />
      </body>
    </html>
  );
}
