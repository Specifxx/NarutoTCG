import { SiteHeader } from "@naruto-tcg/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naruto TCG · Simulator",
  description: "Play-test Naruto TCG matches.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="simulator" />
        {children}
      </body>
    </html>
  );
}
