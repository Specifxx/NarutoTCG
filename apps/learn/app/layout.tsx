import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader, resolveSiteUrls } from "@naruto-tcg/ui";
import { AmbientBackdrop } from "@/components/fx/ambient-backdrop";
import { LearnSubnav } from "@/components/layout/learn-subnav";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Naruto TCG · Learn",
    template: "%s · Naruto TCG Learn",
  },
  description:
    "Learn to play the NARUTO Mythos TCG with animated lessons, interactive Chakra and Ambush simulators, Lethal Puzzles and a searchable keyword glossary.",
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh overflow-x-hidden">
        <Providers>
          <AmbientBackdrop />
          <SiteHeader current="learn" urls={resolveSiteUrls(process.env)}>
            <LearnSubnav />
          </SiteHeader>
          <main id="main" className="relative">
            {children}
          </main>
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
