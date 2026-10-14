import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReleaseRoadmap } from "@naruto-tcg/ui";
import "./globals.css";

// Re-render hourly so roadmap statuses follow the calendar without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Naruto TCG · Simulator",
  description: "Play-test Naruto TCG matches.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ReleaseRoadmap current="simulator" />
      </body>
    </html>
  );
}
