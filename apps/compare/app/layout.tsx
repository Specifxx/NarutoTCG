import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReleaseRoadmap, SiteHeader } from "@naruto-tcg/ui";
import "./globals.css";

// Re-render hourly so roadmap statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Naruto TCG · Price Compare",
  description: "Compare card prices across sellers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="compare" />
        {children}
        <ReleaseRoadmap current="compare" />
      </body>
    </html>
  );
}
