import type { ReactNode } from "react";

/** Section title row matching the directory's section headings. */
export function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-ash-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
