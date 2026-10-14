import type { ReactNode } from "react";

/** Section title with a chakra eyebrow; `id` labels the enclosing section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-chakra-400">{eyebrow}</p>}
        <h2 id={id} className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
