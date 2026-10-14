import type { Metadata } from "next";
import { KEYWORDS } from "@/content/keywords";
import { RichText } from "@/components/ui/rich-text";

export const metadata: Metadata = { title: "Keywords & Glossary" };

export default function KeywordsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-white">Keywords</h1>
      <ul className="mt-6 space-y-2">
        {KEYWORDS.map((k) => (
          <li key={k.id} id={k.id}>
            <RichText text={`[[${k.id}]] — ${k.short}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
