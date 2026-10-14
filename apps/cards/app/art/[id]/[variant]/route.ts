// Generated card-face artwork, prerendered at build time for every
// (card, variant) pair that has a printing. `cardImageSrc()` points here
// whenever a printing has no artwork URL of its own.
import { PRINTING_VARIANTS, type PrintingVariant } from "@naruto-tcg/types";
import { renderCardArtSvg } from "@/lib/art";
import { getAllCards, getCard, getSet } from "@/lib/data";

export const dynamic = "force-static";
export const dynamicParams = false;

interface ArtParams {
  id: string;
  variant: string;
}

export function generateStaticParams(): ArtParams[] {
  const params: ArtParams[] = [];
  const seen = new Set<string>();
  for (const card of getAllCards()) {
    for (const printing of card.printings) {
      const key = `${card.id}/${printing.variant}`;
      if (seen.has(key)) continue;
      seen.add(key);
      params.push({ id: card.id, variant: printing.variant });
    }
  }
  return params;
}

function isPrintingVariant(value: string): value is PrintingVariant {
  return (PRINTING_VARIANTS as readonly string[]).includes(value);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<ArtParams> }): Promise<Response> {
  const { id, variant } = await params;
  const card = getCard(id) ?? getCard(safeDecode(id));
  const printing = card && isPrintingVariant(variant) ? card.printings.find((p) => p.variant === variant) : undefined;
  if (!card || !printing) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response(renderCardArtSvg(card, printing, getSet(printing.setId)), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
