import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@naruto-tcg/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naruto TCG · Learn",
  description: "Learn the rules of the Naruto TCG.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader current="learn" />
        {children}
      </body>
    </html>
  );
}
