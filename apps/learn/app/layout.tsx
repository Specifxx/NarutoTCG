import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ReleaseRoadmap, SiteHeader, resolveSiteUrls } from "@naruto-tcg/ui";
import { AmbientBackdrop } from "@/components/fx/ambient-backdrop";
import { LearnSubnav } from "@/components/layout/learn-subnav";
import { Providers } from "@/components/providers";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const DESCRIPTION =
  "Learn to play the NARUTO Mythos TCG with animated lessons, interactive Chakra and Ambush simulators, Lethal Puzzles and a searchable keyword glossary. Free, fan-made, no sign-up.";

// Re-render hourly so roadmap statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Absolute base for the Open Graph image (social link previews need full URLs).
  metadataBase: new URL(new URL(SITE_URL).origin),
  openGraph: {
    type: "website",
    siteName: "Naruto TCG · Learn",
    title: "Learn to play Naruto Mythos TCG: free interactive rulebook",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Naruto TCG · Learn",
    template: "%s · Naruto TCG Learn",
  },
  description: DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <AmbientBackdrop />
          <SiteHeader current="learn" urls={resolveSiteUrls(process.env)}>
            <LearnSubnav />
          </SiteHeader>
          <main id="main-content" tabIndex={-1} className="relative flex-1 outline-none">
            {children}
          </main>
          <ReleaseRoadmap current="learn" />
          <footer className="relative border-t border-white/5">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ash-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Rules adapted from the NARUTO Mythos TCG Rulebook (EN). Practice cards are invented for teaching.
              </p>
              <p>Fan-made learning tool · not affiliated with the publisher.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
