"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/**
 * <img> that swaps to `fallbackSrc` when `src` fails to load (e.g. a scraped
 * artwork host that blocks hotlinking). Errors that fire before hydration are
 * caught by checking the element once mounted.
 */
export function FallbackImg({
  src,
  fallbackSrc,
  alt,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & { src: string; fallbackSrc: string; alt: string }) {
  const [current, setCurrent] = useState(src);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => setCurrent(src), [src]);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && current !== fallbackSrc) setCurrent(fallbackSrc);
  }, [current, fallbackSrc]);

  return (
    <img
      ref={ref}
      src={current}
      alt={alt}
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
      {...props}
    />
  );
}
