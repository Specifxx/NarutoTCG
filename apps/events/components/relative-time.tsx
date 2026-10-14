"use client";

import type { ReactNode } from "react";
import { useNow } from "@/lib/use-now";
import { formatRelative } from "@/lib/time";

/**
 * "in 3 days" style label that only renders after mount (it depends on the
 * viewer's clock), avoiding hydration mismatches. Renders `fallback` until then.
 */
export function RelativeTime({
  iso,
  fallback = null,
  className,
}: {
  iso: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const now = useNow(30_000);
  if (!now) return <>{fallback}</>;
  return (
    <time dateTime={iso} className={className}>
      {formatRelative(iso, now)}
    </time>
  );
}
