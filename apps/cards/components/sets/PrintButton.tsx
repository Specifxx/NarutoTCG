"use client";

import { PrinterIcon } from "@/components/home/icons";

export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 rounded-lg border border-shadow-500 px-4 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 ${className}`}
    >
      <PrinterIcon />
      Print checklist
    </button>
  );
}
