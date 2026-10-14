import "@fontsource-variable/inter";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { ToastViewport } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Shinobi Sim · Naruto TCG Simulator", template: "%s · Shinobi Sim" },
  description: "Rule-enforced Naruto TCG playmat, deck builder, deck comparison and rules guide.",
};

export const viewport: Viewport = {
  themeColor: "#07070b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ash-200">
        <TopNav />
        <div className="relative z-10">{children}</div>
        <ToastViewport />
      </body>
    </html>
  );
}
