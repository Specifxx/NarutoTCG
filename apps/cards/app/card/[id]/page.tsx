// Placeholder; replaced by the card detail feature.
import { notFound } from "next/navigation";
import { getAllCards, getCard } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCards().map((card) => ({ id: card.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const card = getCard((await params).id);
  if (!card) notFound();
  return <div className="mx-auto max-w-7xl px-6 py-16 text-ash-400">{card.name} details coming soon.</div>;
}
