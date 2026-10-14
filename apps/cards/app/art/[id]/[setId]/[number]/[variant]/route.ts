// Generated card-face artwork, prerendered at build time for every printing.
// The URL carries the printing's full identity (set, collector number and
// variant), so reprints that share a variant still get their own face.
// `cardImageSrc()` points here whenever a printing has no artwork URL of its own.
import { renderCardArtSvg } from "@/lib/art";
import { getAllCards, getCard, getSet } from "@/lib/data";

export const dynamic = "force-static";
export const dynamicParams = false;

interface ArtParams {
  id: string;
  setId: string;
  number: string;
  variant: string;
}

export function generateStaticParams(): ArtParams[] {
  // One entry per printing; the validator keeps setId + number + variant unique.
  return getAllCards().flatMap((card) =>
    card.printings.map((printing) => ({
      id: card.id,
      setId: printing.setId,
      number: printing.number,
      variant: printing.variant,
    })),
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Whether a route param names `value`, whether or not it is still URL-encoded. */
function paramMatches(param: string, value: string): boolean {
  return param === value || safeDecode(param) === value;
}

export async function GET(_request: Request, { params }: { params: Promise<ArtParams> }): Promise<Response> {
  const { id, setId, number, variant } = await params;
  const card = getCard(id) ?? getCard(safeDecode(id));
  const printing = card?.printings.find(
    (p) => paramMatches(setId, p.setId) && paramMatches(number, p.number) && paramMatches(variant, p.variant),
  );
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
