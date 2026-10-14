import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReleaseRoadmap } from "@naruto-tcg/ui";
import "./globals.css";

// Re-render hourly so roadmap statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Naruto TCG · Learn",
  description: "Learn the rules of the Naruto TCG.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ReleaseRoadmap current="learn" />
      </body>
    </html>
  );
}
