import type { Metadata } from "next";
import { DeckBuilder } from "@/components/deckbuilder/DeckBuilder";
import { PoolGate } from "@/components/ui/PoolGate";

export const metadata: Metadata = { title: "Deck Builder" };

export default function DecksPage() {
  return (
    <PoolGate>
      <DeckBuilder />
    </PoolGate>
  );
}
