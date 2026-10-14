import { Section } from "@/components/ui/page-header";

/** The author's write-up: plain paragraphs, no markup. */
export function DeckWriteUp({ paragraphs, authorName }: { paragraphs: readonly string[]; authorName: string }) {
  return (
    <Section id="write-up" title="Deck write-up" description={`How ${authorName} pilots the list, in their own words.`}>
      <div className="max-w-3xl space-y-4 rounded-lg border border-shadow-700 bg-shadow-900 px-4 py-4 text-sm leading-relaxed text-ash-200 sm:px-6 sm:text-base">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </Section>
  );
}
