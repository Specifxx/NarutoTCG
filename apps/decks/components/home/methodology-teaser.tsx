import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import { methodologyPoints } from "./methodology";
import { BUTTON_GHOST, EYEBROW, PANEL } from "./styles";

/** A short "how the numbers work" card linking to the full methodology on /meta. */
export function MethodologyTeaser() {
  return (
    <section aria-labelledby="methodology-teaser-title" className={`${PANEL} flex min-w-0 flex-col gap-4 p-4 sm:p-6`}>
      <div>
        <p className={EYEBROW}>Methodology</p>
        <h2 id="methodology-teaser-title" className="mt-1 text-xl font-bold text-white">
          How the meta is calculated
        </h2>
      </div>
      <dl className="flex flex-col gap-3">
        {methodologyPoints().map((point) => (
          <div key={point.title} className="border-l-2 border-shadow-600 pl-3">
            <dt className="text-sm font-semibold text-ash-100">{point.title}</dt>
            <dd className="mt-0.5 text-sm text-ash-400">{point.body}</dd>
          </div>
        ))}
      </dl>
      <Link href="/meta#methodology" className={`${BUTTON_GHOST} mt-auto w-fit`}>
        Read the full methodology
        <ArrowRightIcon />
      </Link>
    </section>
  );
}
