import { ButtonLink } from "@/components/ui/button";

export default function DojoPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-5xl font-black text-white">Learn</h1>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/how-to-play">How to play</ButtonLink>
        <ButtonLink href="/puzzles" variant="secondary">Puzzles</ButtonLink>
        <ButtonLink href="/keywords" variant="secondary">Keywords</ButtonLink>
      </div>
    </section>
  );
}
