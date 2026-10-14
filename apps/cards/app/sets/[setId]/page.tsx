// Placeholder; replaced by the set checklist feature.
import { notFound } from "next/navigation";
import { getSet, getSets } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSets().map((set) => ({ setId: set.id }));
}

export default async function Page({ params }: { params: Promise<{ setId: string }> }) {
  const set = getSet((await params).setId);
  if (!set) notFound();
  return <div className="mx-auto max-w-7xl px-6 py-16 text-ash-400">{set.name} checklist coming soon.</div>;
}
