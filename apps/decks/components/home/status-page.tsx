import type { ReactNode, Ref } from "react";
import { EYEBROW } from "./styles";

/**
 * Centered status layout shared by the 404 page and the error boundary. Presentational only,
 * so the client error boundary can render it without pulling in any data modules.
 */
export function StatusPage({
  mark,
  eyebrow,
  title,
  titleRef,
  children,
  actions,
}: {
  mark: ReactNode;
  eyebrow: ReactNode;
  title: string;
  /** Lets the error boundary move focus to the heading. */
  titleRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section aria-labelledby="status-title" className="mx-auto flex w-full max-w-2xl flex-col items-center py-6 text-center sm:py-12">
      {mark}
      <div className={`mt-5 ${EYEBROW}`}>{eyebrow}</div>
      <h1
        id="status-title"
        ref={titleRef}
        tabIndex={-1}
        className="mt-2 text-3xl font-black tracking-tight text-balance text-white outline-none sm:text-4xl"
      >
        {title}
      </h1>
      <div className="mt-3 max-w-xl text-sm text-ash-400 sm:text-base">{children}</div>
      <div className="mt-8 w-full">{actions}</div>
    </section>
  );
}
