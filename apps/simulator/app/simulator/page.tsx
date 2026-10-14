import type { Metadata } from "next";
import { Suspense } from "react";
import { Playmat } from "@/components/playmat/Playmat";
import { PoolGate } from "@/components/ui/PoolGate";

export const metadata: Metadata = { title: "Simulator" };

export default function SimulatorPage() {
  return (
    <PoolGate>
      <Suspense>
        <Playmat />
      </Suspense>
    </PoolGate>
  );
}
