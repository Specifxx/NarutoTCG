import type { Metadata } from "next";
import { DeckCompare } from "@/components/compare/DeckCompare";
import { PoolGate } from "@/components/ui/PoolGate";

export const metadata: Metadata = { title: "Compare Decks" };

export default function ComparePage() {
  return (
    <PoolGate>
      <DeckCompare />
    </PoolGate>
  );
}
